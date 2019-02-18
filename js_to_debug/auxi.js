/*
Auxs for addr converting.
*/

//Return the hexadecimal repr of the given bytearray(Here use Uint8Array as example).
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

//test hexdump functionality
hexdump("G000000d.")



/*
var test = "aaaaa"
console.log(unhexlify(test))
*/


/*
var temp = new Uint8Array(100); 
temp[10] = 5; 
console.log(temp.length) 
console.log(('0' + temp[10].toString(16)).substr(-2)) 
console.log(hexlify(temp)) 
*/














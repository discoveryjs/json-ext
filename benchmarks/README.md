# Benchmarks for JSON utils libraries

<!-- TOC depthfrom:2 -->

- [Stream stringifying](#stream-stringifying)
    - [Time](#time)
    - [CPU usage](#cpu-usage)
    - [Max memory usage](#max-memory-usage)
    - [Output for fixtures](#output-for-fixtures)

<!-- /TOC -->

## Stream stringifying

Benchmark: `stringify-stream.js`

### Time

<!--stringify-stream-table:time-->
| Fixture | S (~2Mb) | M (~13.7Mb) | L (~100Mb) |
| ------- | -------: | ----------: | ---------: |
| JSON.stringify() | 36ms | 76ms | 1012ms |
| json-ext | 71ms | 133ms | 2403ms |
| bfj | 1375ms | 3813ms | 77585ms |
| json-stream-stringify | 2062ms | 6768ms | 163314ms |
<!--/stringify-stream-table:time-->

### CPU usage

<!--stringify-stream-table:cpu-->
| Fixture | S (~2Mb) | M (~13.7Mb) | L (~100Mb) |
| ------- | -------: | ----------: | ---------: |
| JSON.stringify() | 26ms | 66ms | 1092ms |
| json-ext | 81ms | 148ms | 2272ms |
| bfj | 1109ms | 2227ms | 63500ms |
| json-stream-stringify | 1896ms | 5525ms | 159375ms |
<!--/stringify-stream-table:cpu-->

### Max memory usage

<!--stringify-stream-table:memory-->
| Fixture | S (~2Mb) | M (~13.7Mb) | L (~100Mb) |
| ------- | -------: | ----------: | ---------: |
| JSON.stringify() | 8.03MB | 42.12MB | 301.65MB |
| json-ext | 7.69MB | 14.38MB | 113.59MB |
| bfj | 18.18MB | 18.67MB | 402.45MB |
| json-stream-stringify | 14.36MB | 14.51MB | 85.70MB |
<!--/stringify-stream-table:memory-->

### Output for fixtures

<details>
<summary><pre>&gt; node --expose-gc stringify-stream.js    # use fixture/small.json as input</pre></summary>

<!--stringify-stream-output:0-->
```
Test: JSON.stringify() as a stream
Node version: 14.9.0
JSON size: 2.08MB

# JSON.stringify()
time: 36 ms
cpu: 26 ms
mem impact:  rss   +6.01MB | heapTotal   +8.91MB | heapUsed     +78kB | external   -2.08MB | arrayBuffers       +16
       max:  rss  +12.88MB | heapTotal  +15.95MB | heapUsed   +8.03MB | external       +56 | arrayBuffers       +16

# json-ext
time: 71 ms
cpu: 81 ms
mem impact:  rss   +8.77MB | heapTotal         0 | heapUsed    +194kB | external         0 | arrayBuffers         0
       max:  rss   +8.76MB | heapTotal         0 | heapUsed   +7.10MB | external    +590kB | arrayBuffers         0

# bfj
time: 1375 ms
cpu: 1109 ms
mem impact:  rss  +23.11MB | heapTotal  +17.56MB | heapUsed    +838kB | external     +13kB | arrayBuffers         0
       max:  rss  +23.11MB | heapTotal  +17.56MB | heapUsed  +17.96MB | external    +218kB | arrayBuffers    +180kB

# json-stream-stringify
time: 2062 ms
cpu: 1896 ms
mem impact:  rss   +1.40MB | heapTotal         0 | heapUsed    +127kB | external         0 | arrayBuffers         0
       max:  rss   +1.40MB | heapTotal         0 | heapUsed  +14.22MB | external    +139kB | arrayBuffers    +139kB
```
<!--/stringify-stream-output:0-->
</details>

<details>
<summary><pre>&gt; node --expose-gc stringify-stream.js 1  # use fixture/medium.json as input data</pre></summary>

<!--stringify-stream-output:1-->
```
Test: JSON.stringify() as a stream
Node version: 14.9.0
JSON size: 13.69MB

# JSON.stringify()
time: 76 ms
cpu: 66 ms
mem impact:  rss  +17.75MB | heapTotal    +262kB | heapUsed     +77kB | external  -13.69MB | arrayBuffers       +16
       max:  rss  +45.09MB | heapTotal  +27.39MB | heapUsed  +42.12MB | external       +56 | arrayBuffers       +16

# json-ext
time: 133 ms
cpu: 148 ms
mem impact:  rss   +5.36MB | heapTotal    +266kB | heapUsed    +336kB | external         0 | arrayBuffers         0
       max:  rss   +5.34MB | heapTotal    +266kB | heapUsed  +11.06MB | external   +3.32MB | arrayBuffers         0

# bfj
time: 3813 ms
cpu: 2227 ms
mem impact:  rss   +8.28MB | heapTotal   +1.31MB | heapUsed    +877kB | external     +13kB | arrayBuffers         0
       max:  rss   +8.26MB | heapTotal   +1.31MB | heapUsed  +18.12MB | external    +554kB | arrayBuffers    +541kB

# json-stream-stringify
time: 6768 ms
cpu: 5525 ms
mem impact:  rss    +328kB | heapTotal         0 | heapUsed    +147kB | external         0 | arrayBuffers         0
       max:  rss    +328kB | heapTotal         0 | heapUsed  +14.09MB | external    +418kB | arrayBuffers    +377kB
```
<!--/stringify-stream-output:1-->
</details>


<details>
<summary><pre>&gt; node --expose-gc stringify-stream.js 2  # use fixture/big.json as input data (~100Mb)</pre></summary>

<!--stringify-stream-output:2-->
```
Test: JSON.stringify() as a stream
Node version: 14.9.0
JSON size: 99.95MB

# JSON.stringify()
time: 1012 ms
cpu: 1092 ms
mem impact:  rss  +19.29MB | heapTotal         0 | heapUsed     +79kB | external  -99.95MB | arrayBuffers       +16
       max:  rss +313.76MB | heapTotal +300.04MB | heapUsed +301.65MB | external       +56 | arrayBuffers       +16

# json-ext
time: 2403 ms
cpu: 2272 ms
mem impact:  rss  +12.88MB | heapTotal    +266kB | heapUsed    +381kB | external         0 | arrayBuffers         0
       max:  rss +107.24MB | heapTotal +101.72MB | heapUsed +112.73MB | external    +852kB | arrayBuffers         0

# bfj
time: 77585 ms
cpu: 63500 ms
mem impact:  rss  +58.34MB | heapTotal    +786kB | heapUsed    +643kB | external     +13kB | arrayBuffers         0
       max:  rss +392.95MB | heapTotal +364.12MB | heapUsed +375.92MB | external  +26.53MB | arrayBuffers  +26.49MB

# json-stream-stringify
time: 163314 ms
cpu: 159375 ms
mem impact:  rss   -7.19MB | heapTotal         0 | heapUsed    +109kB | external         0 | arrayBuffers         0
       max:  rss  +66.73MB | heapTotal  +68.16MB | heapUsed  +80.76MB | external   +4.94MB | arrayBuffers   +4.94MB
```
<!--/stringify-stream-output:2-->
</details>

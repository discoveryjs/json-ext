# Benchmarks for JSON utils libraries

<!-- TOC depthfrom:2 -->

- [Parse chunked](#parse-chunked)
    - [Time](#time)
    - [CPU usage](#cpu-usage)
    - [Max memory usage](#max-memory-usage)
    - [Output for fixtures](#output-for-fixtures)
- [Stream stringifying](#stream-stringifying)
    - [Time](#time)
    - [CPU usage](#cpu-usage)
    - [Max memory usage](#max-memory-usage)
    - [Output for fixtures](#output-for-fixtures)

<!-- /TOC -->

## Parse chunked

Benchmark: `parse-chunked.js`

How to run:

```
node benchmarks/parse-chunked [fixture]
```

Where `[fixture]` is number of fixture:

* `0` – fixture/small.json (~2Mb)
* `1` – fixture/medium.json (~13.7Mb)
* `2` – fixture/big.json (~100Mb)
* `3` – fixture/500mb.json (500Mb, auto-generated from big.json x 5 + padding strings)
* `4` – fixture/1gb.json (1gb, auto-generated from big.json x 10 + padding strings)

### Time

<!--parse-chunked-table:time-->
| Solution | S (~2Mb) | M (~13.7Mb) | L (~100Mb) | 500Mb | 1Gb |
| -------- | -------: | ----------: | ---------: | ----: | --: |
| JSON.parse() | 29ms | 85ms | 928ms | 5769ms | ERR_STRING_TOO_LONG |
| parse fs#ReadableStream | 62ms | 165ms | 1366ms | 6511ms | 12946ms |
| parse generator | 58ms | 174ms | 1403ms | 7828ms | ERR_STRING_TOO_LONG |
<!--/parse-chunked-table:time-->

### CPU usage

<!--parse-chunked-table:cpu-->
| Solution | S (~2Mb) | M (~13.7Mb) | L (~100Mb) | 500Mb | 1Gb |
| -------- | -------: | ----------: | ---------: | ----: | --: |
| JSON.parse() | 26ms | 84ms | 1170ms | 7255ms | ERR_STRING_TOO_LONG |
| parse fs#ReadableStream | 57ms | 159ms | 1536ms | 7460ms | 14932ms |
| parse generator | 52ms | 162ms | 1429ms | 7945ms | ERR_STRING_TOO_LONG |
<!--/parse-chunked-table:cpu-->

### Max memory usage

<!--parse-chunked-table:memory-->
| Solution | S (~2Mb) | M (~13.7Mb) | L (~100Mb) | 500Mb | 1Gb |
| -------- | -------: | ----------: | ---------: | ----: | --: |
| JSON.parse() | 6.62MB | 46.41MB | 413.43MB | 2.07GB | ERR_STRING_TOO_LONG |
| parse fs#ReadableStream | 12.06MB | 40.71MB | 162.35MB | 640.27MB | 1.22GB |
| parse generator | 8.35MB | 57.43MB | 339.55MB | 1.63GB | ERR_STRING_TOO_LONG |
<!--/parse-chunked-table:memory-->

### Output for fixtures

<details>
<summary><pre>&gt; node benchmarks/parse-chunked    # use benchmarks/fixture/small.json (~2Mb)</pre></summary>
<!--parse-chunked-output:0-->

```
Benchmark: parseChunked() (parse chunked JSON)
Node version: 15.3.0
Fixture: fixture/small.json 2.08MB / chunk size 524kB

Debugger attached.
# JSON.parse()
time: 29 ms
cpu: 26 ms
mem impact:  rss   +5.99MB | heapTotal   +6.29MB | heapUsed   +2.37MB | external       +56
       max:  rss  +10.07MB | heapTotal  +10.45MB | heapUsed   +6.62MB | external       +56

Waiting for the debugger to disconnect...
Debugger attached.
# parse fs#ReadableStream
time: 62 ms
cpu: 57 ms
mem impact:  rss   +8.24MB | heapTotal   +6.37MB | heapUsed   +2.55MB | external    +524kB
       max:  rss  +13.07MB | heapTotal   +9.74MB | heapUsed   +8.45MB | external   +3.61MB

Waiting for the debugger to disconnect...
Debugger attached.
# parse generator
time: 58 ms
cpu: 52 ms
mem impact:  rss  +10.06MB | heapTotal  +14.76MB | heapUsed   +2.32MB | external       +56
       max:  rss  +14.67MB | heapTotal   +9.71MB | heapUsed   +8.35MB | external       +56

Waiting for the debugger to disconnect...
```
<!--/parse-chunked-output:0-->
</details>

<details>
<summary><pre>&gt; node benchmarks/parse-chunked 1  # use benchmarks/fixture/medium.json (~13.7Mb)</pre></summary>
<!--parse-chunked-output:1-->

```
Benchmark: parseChunked() (parse chunked JSON)
Node version: 15.3.0
Fixture: benchmarks/fixture/medium.json 13.69MB / chunk size 524kB

# JSON.parse()
time: 85 ms
cpu: 84 ms
mem impact:  rss  +48.46MB | heapTotal  +50.82MB | heapUsed  +19.04MB | external       +56
       max:  rss  +75.70MB | heapTotal  +76.12MB | heapUsed  +46.41MB | external       +56

# parse fs#ReadableStream
time: 165 ms
cpu: 159 ms
mem impact:  rss  +42.44MB | heapTotal  +51.97MB | heapUsed  +19.47MB | external    +524kB
       max:  rss  +53.84MB | heapTotal  +54.05MB | heapUsed  +29.18MB | external  +11.53MB

# parse generator
time: 174 ms
cpu: 162 ms
mem impact:  rss  +50.29MB | heapTotal  +51.97MB | heapUsed  +19.28MB | external       +56
       max:  rss  +86.17MB | heapTotal  +78.96MB | heapUsed  +57.43MB | external       +56
```
<!--/parse-chunked-output:1-->
</details>


<details>
<summary><pre>&gt; node benchmarks/parse-chunked 2  # use benchmarks/fixture/big.json (~100Mb)</pre></summary>
<!--parse-chunked-output:2-->

```
Benchmark: parseChunked() (parse chunked JSON)
Node version: 15.3.0
Fixture: benchmarks/fixture/big.json 99.95MB / chunk size 524kB

# JSON.parse()
time: 928 ms
cpu: 1170 ms
mem impact:  rss +235.09MB | heapTotal +147.40MB | heapUsed +113.85MB | external       +56
       max:  rss +433.53MB | heapTotal +331.83MB | heapUsed +313.48MB | external  +99.95MB

# parse fs#ReadableStream
time: 1366 ms
cpu: 1536 ms
mem impact:  rss +148.27MB | heapTotal +148.54MB | heapUsed +114.02MB | external    +524kB
       max:  rss +180.79MB | heapTotal +152.36MB | heapUsed +130.89MB | external  +31.46MB

# parse generator
time: 1403 ms
cpu: 1429 ms
mem impact:  rss +239.69MB | heapTotal +148.80MB | heapUsed +113.97MB | external       +56
       max:  rss +462.53MB | heapTotal +357.87MB | heapUsed +339.55MB | external       +56
```
<!--/parse-chunked-output:2-->
</details>

<details>
<summary><pre>&gt; node benchmarks/parse-chunked 3  # use benchmarks/fixture/500mb.json</pre></summary>
<!--parse-chunked-output:3-->

```
Benchmark: parseChunked() (parse chunked JSON)
Node version: 15.3.0
Fixture: benchmarks/fixture/500mb.json 500MB / chunk size 524kB

# JSON.parse()
time: 5769 ms
cpu: 7255 ms
mem impact:  rss +610.57MB | heapTotal +610.12MB | heapUsed +569.10MB | external       +56
       max:  rss   +2.11GB | heapTotal   +1.60GB | heapUsed   +1.57GB | external +500.00MB

# parse fs#ReadableStream
time: 6511 ms
cpu: 7460 ms
mem impact:  rss +618.43MB | heapTotal +612.14MB | heapUsed +569.28MB | external    +524kB
       max:  rss +669.30MB | heapTotal +628.25MB | heapUsed +599.90MB | external  +40.37MB

# parse generator
time: 7828 ms
cpu: 7945 ms
mem impact:  rss +611.27MB | heapTotal +611.88MB | heapUsed +569.52MB | external       +56
       max:  rss   +1.66GB | heapTotal   +1.65GB | heapUsed   +1.63GB | external       +56
```
<!--/parse-chunked-output:3-->
</details>

<details>
<summary><pre>&gt; node benchmarks/parse-chunked 4  # use benchmarks/fixture/1gb.json</pre></summary>
<!--parse-chunked-output:4-->

```
Benchmark: parseChunked() (parse chunked JSON)
Node version: 15.3.0
Fixture: fixture/1gb.json 1000MB / chunk size 524kB

# JSON.parse()
Error: Cannot create a string longer than 0x1fffffe8 characters
    at Object.slice (node:buffer:592:37)
    at Buffer.toString (node:buffer:789:14)
    at Object.readFileSync (node:fs:433:41)
    at JSON.parse() (~/json-ext/benchmarks/parse-chunked.js:32:23)
    at benchmark (~/json-ext/benchmarks/benchmark-utils.js:70:28)

# parse fs#ReadableStream
time: 12946 ms
cpu: 14932 ms
mem impact:  rss   +1.21GB | heapTotal   +1.19GB | heapUsed   +1.14GB | external    +524kB
       max:  rss   +1.25GB | heapTotal   +1.22GB | heapUsed   +1.18GB | external  +35.65MB

# parse generator
Error: Cannot create a string longer than 0x1fffffe8 characters
    at Object.slice (node:buffer:592:37)
    at Buffer.toString (node:buffer:789:14)
    at Object.readFileSync (node:fs:433:41)
    at ~/json-ext/benchmarks/parse-chunked.js:39:27
    at Generator.next (<anonymous>)
    at Async-from-Sync Iterator.next (<anonymous>)
    at ~/json-ext/src/parse-chunked.js:57:38
    at new Promise (<anonymous>)
    at module.exports (~/json-ext/src/parse-chunked.js:55:20)
    at parse generator (~/json-ext/benchmarks/parse-chunked.js:38:9)
```
<!--/parse-chunked-output:4-->
</details>

## Stream stringifying

Benchmark: `stringify-stream.js`

How to run:

```
node benchmarks/stringify-stream [fixture]
```

Where `[fixture]` is number of fixture:

* `0` – fixture/small.json (~2Mb)
* `1` – fixture/medium.json (~13.7Mb)
* `2` – fixture/big.json (~100Mb)
* `3` – fixture/500mb.json (500Mb, auto-generated from big.json x 5 + padding strings)
* `4` – fixture/1gb.json (1gb, auto-generated from big.json x 10 + padding strings)

### Time

<!--stringify-stream-table:time-->
| Solution | S (~2Mb) | M (~13.7Mb) | L (~100Mb) | 500Mb | 1Gb |
| -------- | -------: | ----------: | ---------: | ----: | --: |
| JSON.stringify() | 28ms | 77ms | 910ms | 5545ms | ERR_STRING_TOO_LONG |
| @discoveryjs/json-ext | 65ms | 140ms | 2341ms | 12266ms | 25951ms |
| bfj | 1309ms | 3613ms | 71793ms | 435437ms | ERR_RUN_TOO_LONG |
| json-stream-stringify | 2087ms | 6025ms | 154884ms | ERR_RUN_TOO_LONG | ERR_RUN_TOO_LONG |
<!--/stringify-stream-table:time-->

### CPU usage

<!--stringify-stream-table:cpu-->
| Solution | S (~2Mb) | M (~13.7Mb) | L (~100Mb) | 500Mb | 1Gb |
| -------- | -------: | ----------: | ---------: | ----: | --: |
| JSON.stringify() | 24ms | 66ms | 957ms | 5645ms | ERR_STRING_TOO_LONG |
| @discoveryjs/json-ext | 71ms | 148ms | 2296ms | 11748ms | 24671ms |
| bfj | 1048ms | 1933ms | 55743ms | 388914ms | ERR_RUN_TOO_LONG |
| json-stream-stringify | 1871ms | 5132ms | 135951ms | ERR_RUN_TOO_LONG | ERR_RUN_TOO_LONG |
<!--/stringify-stream-table:cpu-->

### Max memory usage

<!--stringify-stream-table:memory-->
| Solution | S (~2Mb) | M (~13.7Mb) | L (~100Mb) | 500Mb | 1Gb |
| -------- | -------: | ----------: | ---------: | ----: | --: |
| JSON.stringify() | 10.20MB | 55.77MB | 401.66MB | 2.40GB | ERR_STRING_TOO_LONG |
| @discoveryjs/json-ext | 4.10MB | 15.40MB | 112.06MB | 506.72MB | 993.97MB |
| bfj | 16.44MB | 18.84MB | 367.35MB | 725.17MB | ERR_RUN_TOO_LONG |
| json-stream-stringify | 5.14MB | 14.67MB | 140.43MB | ERR_RUN_TOO_LONG | ERR_RUN_TOO_LONG |
<!--/stringify-stream-table:memory-->

### Output for fixtures

<details>
<summary><pre>&gt; node benchmarks/stringify-stream    # use benchmarks/fixture/small.json (~2Mb)</pre></summary>
<!--stringify-stream-output:0-->

```
Benchmark: stringifyStream() (JSON.stringify() as a stream)
Node version: 15.3.0
Fixture: benchmarks/fixture/small.json 2.08MB

# JSON.stringify()
time: 28 ms
cpu: 24 ms
mem impact:  rss   +5.15MB | heapTotal   +8.65MB | heapUsed     -42kB | external       +56
       max:  rss  +12.41MB | heapTotal  +16.22MB | heapUsed   +8.12MB | external   +2.08MB

# @discoveryjs/json-ext
time: 65 ms
cpu: 71 ms
mem impact:  rss   +6.34MB | heapTotal    +532kB | heapUsed    +809kB | external       +56
       max:  rss   +6.26MB | heapTotal    +270kB | heapUsed   +3.79MB | external    +312kB

# bfj
time: 1309 ms
cpu: 1048 ms
mem impact:  rss  +38.32MB | heapTotal  +26.75MB | heapUsed   +1.39MB | external     +29kB
       max:  rss  +38.42MB | heapTotal  +28.06MB | heapUsed  +16.18MB | external    +258kB

# json-stream-stringify
time: 2087 ms
cpu: 1871 ms
mem impact:  rss   +8.92MB | heapTotal    +795kB | heapUsed    +526kB | external       +56
       max:  rss   +8.94MB | heapTotal   +1.58MB | heapUsed   +5.09MB | external     +41kB
```
<!--/stringify-stream-output:0-->
</details>

<details>
<summary><pre>&gt; node benchmarks/stringify-stream 1  # use benchmarks/fixture/medium.json (~13.7Mb)</pre></summary>
<!--stringify-stream-output:1-->

```
Benchmark: stringifyStream() (JSON.stringify() as a stream)
Node version: 15.3.0
Fixture: benchmarks/fixture/medium.json 13.69MB

# JSON.stringify()
time: 77 ms
cpu: 66 ms
mem impact:  rss  +16.62MB | heapTotal    +262kB | heapUsed    -139kB | external       +56
       max:  rss  +43.70MB | heapTotal  +27.39MB | heapUsed  +42.07MB | external  +13.69MB

# @discoveryjs/json-ext
time: 140 ms
cpu: 148 ms
mem impact:  rss  +20.29MB | heapTotal    +270kB | heapUsed    +422kB | external       +56
       max:  rss  +20.22MB | heapTotal    +270kB | heapUsed  +12.23MB | external   +3.17MB

# bfj
time: 3613 ms
cpu: 1933 ms
mem impact:  rss  +28.04MB | heapTotal    +795kB | heapUsed   +1.09MB | external     +29kB
       max:  rss  +28.30MB | heapTotal   +1.32MB | heapUsed  +18.27MB | external    +570kB

# json-stream-stringify
time: 6025 ms
cpu: 5132 ms
mem impact:  rss  +18.72MB | heapTotal    +532kB | heapUsed    +277kB | external       +56
       max:  rss  +18.56MB | heapTotal    +532kB | heapUsed  +14.25MB | external    +418kB
```
<!--/stringify-stream-output:1-->
</details>


<details>
<summary><pre>&gt; node benchmarks/stringify-stream 2  # use benchmarks/fixture/big.json (~100Mb)</pre></summary>
<!--stringify-stream-output:2-->

```
Benchmark: stringifyStream() (JSON.stringify() as a stream)
Node version: 15.3.0
Fixture: benchmarks/fixture/big.json 99.95MB

# JSON.stringify()
time: 910 ms
cpu: 957 ms
mem impact:  rss   +2.82MB | heapTotal    -262kB | heapUsed    -138kB | external       +56
       max:  rss +299.74MB | heapTotal +300.04MB | heapUsed +301.71MB | external  +99.95MB

# @discoveryjs/json-ext
time: 2341 ms
cpu: 2296 ms
mem impact:  rss  +15.82MB | heapTotal    +795kB | heapUsed    +320kB | external       +56
       max:  rss +106.01MB | heapTotal +100.67MB | heapUsed +111.24MB | external    +819kB

# bfj
time: 71793 ms
cpu: 55743 ms
mem impact:  rss   +9.88MB | heapTotal   +1.32MB | heapUsed    +950kB | external     +29kB
       max:  rss +364.77MB | heapTotal +357.31MB | heapUsed +367.07MB | external    +275kB

# json-stream-stringify
time: 154884 ms
cpu: 135951 ms
mem impact:  rss   +3.62MB | heapTotal    +532kB | heapUsed    +189kB | external       +56
       max:  rss +134.52MB | heapTotal +129.25MB | heapUsed +140.32MB | external    +115kB
```
<!--/stringify-stream-output:2-->
</details>

<details>
<summary><pre>&gt; node benchmarks/stringify-stream 3  # use benchmarks/fixture/500mb.json</pre></summary>
<!--stringify-stream-output:3-->

```
Benchmark: stringifyStream() (JSON.stringify() as a stream)
Node version: 15.3.0
Fixture: fixture/500mb.json 500MB

# JSON.stringify()
time: 5545 ms
cpu: 5645 ms
mem impact:  rss  +12.45MB | heapTotal         0 | heapUsed     +59kB | external     -65kB
       max:  rss   +2.44GB | heapTotal   +2.01GB | heapUsed   +1.90GB | external +499.93MB

# @discoveryjs/json-ext
time: 12266 ms
cpu: 11748 ms
mem impact:  rss  +24.12MB | heapTotal    +795kB | heapUsed    +399kB | external     -65kB
       max:  rss +508.44MB | heapTotal +500.97MB | heapUsed +505.97MB | external    +754kB

# bfj
time: 435437 ms
cpu: 388914 ms
mem impact:  rss  +34.20MB | heapTotal   +1.84MB | heapUsed   +1.12MB | external     -37kB
       max:  rss +734.84MB | heapTotal +720.64MB | heapUsed +724.48MB | external    +692kB

# json-stream-stringify
Error: Run takes too long time
    at sizeLessThan (~/json-ext/benchmarks/stringify-stream.js:45:19)
    at json-stream-stringify (~/json-ext/benchmarks/stringify-stream.js:60:38)
    at ~/json-ext/benchmarks/stringify-stream.js:70:9
    at new Promise (<anonymous>)
    at tests.<computed> (~/json-ext/benchmarks/stringify-stream.js:69:29)
    at benchmark (~/json-ext/benchmarks/benchmark-utils.js:70:28)
```
<!--/stringify-stream-output:3-->
</details>

<details>
<summary><pre>&gt; node benchmarks/stringify-stream 4  # use benchmarks/fixture/1gb.json</pre></summary>
<!--stringify-stream-output:4-->

```
Benchmark: stringifyStream() (JSON.stringify() as a stream)
Node version: 15.3.0
Fixture: fixture/1gb.json 1000MB

# JSON.stringify()
RangeError: Invalid string length
    at JSON.stringify (<anonymous>)
    at JSON.stringify() (~/json-ext/benchmarks/stringify-stream.js:52:31)
    at ~/json-ext/benchmarks/stringify-stream.js:70:9
    at new Promise (<anonymous>)
    at tests.<computed> (~/json-ext/benchmarks/stringify-stream.js:69:29)
    at benchmark (~/json-ext/benchmarks/benchmark-utils.js:70:28)

# @discoveryjs/json-ext
time: 25951 ms
cpu: 24671 ms
mem impact:  rss  +23.08MB | heapTotal    +795kB | heapUsed    +295kB | external     -65kB
       max:  rss   +1.01GB | heapTotal   +1.00GB | heapUsed +993.17MB | external    +801kB

# bfj
Error: Run takes too long time
    at sizeLessThan (~/json-ext/benchmarks/stringify-stream.js:45:19)
    at bfj (~/json-ext/benchmarks/stringify-stream.js:57:20)
    at ~/json-ext/benchmarks/stringify-stream.js:70:9
    at new Promise (<anonymous>)
    at tests.<computed> (~/json-ext/benchmarks/stringify-stream.js:69:29)
    at benchmark (~/json-ext/benchmarks/benchmark-utils.js:70:28)

# json-stream-stringify
Error: Run takes too long time
    at sizeLessThan (~/json-ext/benchmarks/stringify-stream.js:45:19)
    at json-stream-stringify (~/json-ext/benchmarks/stringify-stream.js:60:38)
    at ~/json-ext/benchmarks/stringify-stream.js:70:9
    at new Promise (<anonymous>)
    at tests.<computed> (~/json-ext/benchmarks/stringify-stream.js:69:29)
    at benchmark (~/json-ext/benchmarks/benchmark-utils.js:70:28)
```
<!--/stringify-stream-output:4-->
</details>

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

* `0` – fixture/small.json (~2MB)
* `1` – fixture/medium.json (~13.7MB)
* `2` – fixture/big.json (~100MB)
* `3` – fixture/500mb.json (500MB, auto-generated from big.json x 5 + padding strings)
* `4` – fixture/1gb.json (1gb, auto-generated from big.json x 10 + padding strings)

### Time

<!--parse-chunked-table:time-->
| Solution | S (~2MB) | M (~13.7MB) | L (~100MB) | 500MB | 1GB |
| -------- | -------: | ----------: | ---------: | ----: | --: |
| JSON.parse() | 29ms | 92ms | 905ms | 5226ms | ERR_STRING_TOO_LONG |
| @discoveryjs/json-ext fs.createReadStream() | 60ms | 162ms | 1331ms | 6562ms | 13406ms |
| @discoveryjs/json-ext fs.readFileSync() | 58ms | 176ms | 1401ms | 7364ms | ERR_STRING_TOO_LONG |
<!--/parse-chunked-table:time-->

### CPU usage

<!--parse-chunked-table:cpu-->
| Solution | S (~2MB) | M (~13.7MB) | L (~100MB) | 500MB | 1GB |
| -------- | -------: | ----------: | ---------: | ----: | --: |
| JSON.parse() | 26ms | 84ms | 1154ms | 6682ms | ERR_STRING_TOO_LONG |
| @discoveryjs/json-ext fs.createReadStream() | 55ms | 160ms | 1466ms | 7388ms | 15199ms |
| @discoveryjs/json-ext fs.readFileSync() | 51ms | 168ms | 1418ms | 7476ms | ERR_STRING_TOO_LONG |
<!--/parse-chunked-table:cpu-->

### Max memory usage

<!--parse-chunked-table:memory-->
| Solution | S (~2MB) | M (~13.7MB) | L (~100MB) | 500MB | 1GB |
| -------- | -------: | ----------: | ---------: | ----: | --: |
| JSON.parse() | 6.85MB | 46.41MB | 413.70MB | 2.07GB | ERR_STRING_TOO_LONG |
| @discoveryjs/json-ext fs.createReadStream() | 9.63MB | 36.22MB | 144.21MB | 635.61MB | 1.21GB |
| @discoveryjs/json-ext fs.readFileSync() | 9.09MB | 57.27MB | 339.28MB | 1.63GB | ERR_STRING_TOO_LONG |
<!--/parse-chunked-table:memory-->

### Output for fixtures

<details>
<summary><pre>&gt; node benchmarks/parse-chunked    # use benchmarks/fixture/small.json (~2MB)</pre></summary>
<!--parse-chunked-output:0-->

```
Benchmark: parseChunked() (parse chunked JSON)
Node version: 15.9.0
Fixture: fixture/small.json 2.08MB / chunk size 524kB

# JSON.parse()
time: 29 ms
cpu: 26 ms
mem impact:  rss   +4.92MB | heapTotal   +4.72MB | heapUsed   +2.29MB | external       +56
       max:  rss   +8.67MB | heapTotal   +7.57MB | heapUsed   +6.85MB | external       +56

# @discoveryjs/json-ext fs.createReadStream()
time: 60 ms
cpu: 55 ms
mem impact:  rss   +9.32MB | heapTotal   +8.73MB | heapUsed   +2.22MB | external    +524kB
       max:  rss  +13.79MB | heapTotal  +12.88MB | heapUsed   +7.55MB | external   +2.08MB

# @discoveryjs/json-ext fs.readFileSync()
time: 58 ms
cpu: 51 ms
mem impact:  rss  +10.53MB | heapTotal   +8.73MB | heapUsed   +2.24MB | external       +56
       max:  rss  +16.35MB | heapTotal   +9.71MB | heapUsed   +9.09MB | external       +56
```
<!--/parse-chunked-output:0-->
</details>

<details>
<summary><pre>&gt; node benchmarks/parse-chunked 1  # use benchmarks/fixture/medium.json (~13.7MB)</pre></summary>
<!--parse-chunked-output:1-->

```
Benchmark: parseChunked() (parse chunked JSON)
Node version: 15.9.0
Fixture: fixture/medium.json 13.69MB / chunk size 524kB

# JSON.parse()
time: 92 ms
cpu: 84 ms
mem impact:  rss  +49.03MB | heapTotal  +50.56MB | heapUsed  +19.11MB | external       +56
       max:  rss  +76.28MB | heapTotal  +75.85MB | heapUsed  +46.41MB | external       +56

# @discoveryjs/json-ext fs.createReadStream()
time: 162 ms
cpu: 160 ms
mem impact:  rss  +42.80MB | heapTotal  +51.69MB | heapUsed  +19.44MB | external    +524kB
       max:  rss  +51.60MB | heapTotal  +53.01MB | heapUsed  +28.17MB | external   +8.05MB

# @discoveryjs/json-ext fs.readFileSync()
time: 176 ms
cpu: 168 ms
mem impact:  rss  +49.29MB | heapTotal  +51.95MB | heapUsed  +19.37MB | external       +56
       max:  rss  +84.93MB | heapTotal  +79.21MB | heapUsed  +57.27MB | external       +56
```
<!--/parse-chunked-output:1-->
</details>


<details>
<summary><pre>&gt; node benchmarks/parse-chunked 2  # use benchmarks/fixture/big.json (~100MB)</pre></summary>
<!--parse-chunked-output:2-->

```
Benchmark: parseChunked() (parse chunked JSON)
Node version: 15.9.0
Fixture: fixture/big.json 99.95MB / chunk size 524kB

# JSON.parse()
time: 905 ms
cpu: 1154 ms
mem impact:  rss +234.71MB | heapTotal +147.40MB | heapUsed +114.07MB | external       +56
       max:  rss +433.29MB | heapTotal +332.10MB | heapUsed +313.75MB | external  +99.95MB

# @discoveryjs/json-ext fs.createReadStream()
time: 1331 ms
cpu: 1466 ms
mem impact:  rss +155.67MB | heapTotal +148.28MB | heapUsed +114.40MB | external    +524kB
       max:  rss +176.55MB | heapTotal +155.16MB | heapUsed +128.53MB | external  +15.68MB

# @discoveryjs/json-ext fs.readFileSync()
time: 1401 ms
cpu: 1418 ms
mem impact:  rss +239.94MB | heapTotal +148.28MB | heapUsed +114.10MB | external       +56
       max:  rss +462.02MB | heapTotal +357.37MB | heapUsed +339.28MB | external       +56
```
<!--/parse-chunked-output:2-->
</details>

<details>
<summary><pre>&gt; node benchmarks/parse-chunked 3  # use benchmarks/fixture/500mb.json</pre></summary>
<!--parse-chunked-output:3-->

```
Benchmark: parseChunked() (parse chunked JSON)
Node version: 15.9.0
Fixture: fixture/500mb.json 500MB / chunk size 524kB

# JSON.parse()
time: 5226 ms
cpu: 6682 ms
mem impact:  rss +610.94MB | heapTotal +610.12MB | heapUsed +569.09MB | external       +56
       max:  rss   +2.11GB | heapTotal   +1.60GB | heapUsed   +1.57GB | external +500.00MB

# @discoveryjs/json-ext fs.createReadStream()
time: 6562 ms
cpu: 7388 ms
mem impact:  rss +620.56MB | heapTotal +612.22MB | heapUsed +570.11MB | external    +524kB
       max:  rss +673.43MB | heapTotal +630.97MB | heapUsed +602.56MB | external  +33.04MB

# @discoveryjs/json-ext fs.readFileSync()
time: 7364 ms
cpu: 7476 ms
mem impact:  rss +613.16MB | heapTotal +612.22MB | heapUsed +570.09MB | external       +56
       max:  rss   +1.67GB | heapTotal   +1.66GB | heapUsed   +1.63GB | external       +56
```
<!--/parse-chunked-output:3-->
</details>

<details>
<summary><pre>&gt; node benchmarks/parse-chunked 4  # use benchmarks/fixture/1gb.json</pre></summary>
<!--parse-chunked-output:4-->

```
Benchmark: parseChunked() (parse chunked JSON)
Node version: 15.9.0
Fixture: fixture/1gb.json 1000MB / chunk size 524kB

# JSON.parse()
Error: Cannot create a string longer than 0x1fffffe8 characters
    at Object.slice (node:buffer:594:37)
    at Buffer.toString (node:buffer:812:14)
    at Object.readFileSync (node:fs:437:41)
    at JSON.parse() (~/json-ext/benchmarks/parse-chunked.js:32:23)
    at benchmark (~/json-ext/benchmarks/benchmark-utils.js:53:28)

# @discoveryjs/json-ext fs.createReadStream()
time: 13406 ms
cpu: 15199 ms
mem impact:  rss   +1.21GB | heapTotal   +1.19GB | heapUsed   +1.14GB | external    +524kB
       max:  rss   +1.26GB | heapTotal   +1.22GB | heapUsed   +1.18GB | external  +29.38MB

# @discoveryjs/json-ext fs.readFileSync()
Error: Cannot create a string longer than 0x1fffffe8 characters
    at Object.slice (node:buffer:594:37)
    at Buffer.toString (node:buffer:812:14)
    at Object.readFileSync (node:fs:437:41)
    at ~/json-ext/benchmarks/parse-chunked.js:39:27
    at Generator.next (<anonymous>)
    at Async-from-Sync Iterator.next (<anonymous>)
    at ~/json-ext/src/parse-chunked.js:69:38
    at new Promise (<anonymous>)
    at module.exports (~/json-ext/src/parse-chunked.js:67:20)
    at @discoveryjs/json-ext fs.readFileSync() (~/json-ext/benchmarks/parse-chunked.js:38:9)
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

* `0` – fixture/small.json (~2MB)
* `1` – fixture/medium.json (~13.7MB)
* `2` – fixture/big.json (~100MB)
* `3` – fixture/500mb.json (500MB, auto-generated from big.json x 5 + padding strings)
* `4` – fixture/1gb.json (1gb, auto-generated from big.json x 10 + padding strings)

### Time

<!--stringify-stream-table:time-->
| Solution | S (~2MB) | M (~13.7MB) | L (~100MB) | 500MB | 1GB |
| -------- | -------: | ----------: | ---------: | ----: | --: |
| JSON.stringify() | 28ms | 77ms | 910ms | 5545ms | ERR_STRING_TOO_LONG |
| @discoveryjs/json-ext | 65ms | 140ms | 2341ms | 12266ms | 25951ms |
| bfj | 1309ms | 3613ms | 71793ms | 435437ms | ERR_RUN_TOO_LONG |
| json-stream-stringify | 2087ms | 6025ms | 154884ms | ERR_RUN_TOO_LONG | ERR_RUN_TOO_LONG |
<!--/stringify-stream-table:time-->

### CPU usage

<!--stringify-stream-table:cpu-->
| Solution | S (~2MB) | M (~13.7MB) | L (~100MB) | 500MB | 1GB |
| -------- | -------: | ----------: | ---------: | ----: | --: |
| JSON.stringify() | 24ms | 66ms | 957ms | 5645ms | ERR_STRING_TOO_LONG |
| @discoveryjs/json-ext | 71ms | 148ms | 2296ms | 11748ms | 24671ms |
| bfj | 1048ms | 1933ms | 55743ms | 388914ms | ERR_RUN_TOO_LONG |
| json-stream-stringify | 1871ms | 5132ms | 135951ms | ERR_RUN_TOO_LONG | ERR_RUN_TOO_LONG |
<!--/stringify-stream-table:cpu-->

### Max memory usage

<!--stringify-stream-table:memory-->
| Solution | S (~2MB) | M (~13.7MB) | L (~100MB) | 500MB | 1GB |
| -------- | -------: | ----------: | ---------: | ----: | --: |
| JSON.stringify() | 10.20MB | 55.77MB | 401.66MB | 2.40GB | ERR_STRING_TOO_LONG |
| @discoveryjs/json-ext | 4.10MB | 15.40MB | 112.06MB | 506.72MB | 993.97MB |
| bfj | 16.44MB | 18.84MB | 367.35MB | 725.17MB | ERR_RUN_TOO_LONG |
| json-stream-stringify | 5.14MB | 14.67MB | 140.43MB | ERR_RUN_TOO_LONG | ERR_RUN_TOO_LONG |
<!--/stringify-stream-table:memory-->

### Output for fixtures

<details>
<summary><pre>&gt; node benchmarks/stringify-stream    # use benchmarks/fixture/small.json (~2MB)</pre></summary>
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
<summary><pre>&gt; node benchmarks/stringify-stream 1  # use benchmarks/fixture/medium.json (~13.7MB)</pre></summary>
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
<summary><pre>&gt; node benchmarks/stringify-stream 2  # use benchmarks/fixture/big.json (~100MB)</pre></summary>
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

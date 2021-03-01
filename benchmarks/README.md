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
| JSON.stringify() | 29ms | 87ms | 1030ms | 8438ms | ERR_STRING_TOO_LONG |
| @discoveryjs/json-ext | 71ms | 134ms | 2604ms | 13433ms | 28642ms |
| bfj | 1308ms | 3762ms | 78952ms | 416611ms | ERR_RUN_TOO_LONG |
| json-stream-stringify | 2307ms | 6203ms | 165680ms | ERR_RUN_TOO_LONG | ERR_RUN_TOO_LONG |
<!--/stringify-stream-table:time-->

### CPU usage

<!--stringify-stream-table:cpu-->
| Solution | S (~2MB) | M (~13.7MB) | L (~100MB) | 500MB | 1GB |
| -------- | -------: | ----------: | ---------: | ----: | --: |
| JSON.stringify() | 26ms | 76ms | 1183ms | 11027ms | ERR_STRING_TOO_LONG |
| @discoveryjs/json-ext | 80ms | 141ms | 2390ms | 12237ms | 26033ms |
| bfj | 1081ms | 2227ms | 66466ms | 375770ms | ERR_RUN_TOO_LONG |
| json-stream-stringify | 2054ms | 5477ms | 148102ms | ERR_RUN_TOO_LONG | ERR_RUN_TOO_LONG |
<!--/stringify-stream-table:cpu-->

### Max memory usage

<!--stringify-stream-table:memory-->
| Solution | S (~2MB) | M (~13.7MB) | L (~100MB) | 500MB | 1GB |
| -------- | -------: | ----------: | ---------: | ----: | --: |
| JSON.stringify() | 10.20MB | 41.48MB | 380.52MB | 2.07GB | ERR_STRING_TOO_LONG |
| @discoveryjs/json-ext | 4.75MB | 16.80MB | 110.15MB | 504.18MB | 995.45MB |
| bfj | 19MB | 19.28MB | 406.06MB | 1.15GB | ERR_RUN_TOO_LONG |
| json-stream-stringify | 5.09MB | 14.91MB | 126.92MB | ERR_RUN_TOO_LONG | ERR_RUN_TOO_LONG |
<!--/stringify-stream-table:memory-->

### Output for fixtures

<details>
<summary><pre>&gt; node benchmarks/stringify-stream    # use benchmarks/fixture/small.json (~2MB)</pre></summary>
<!--stringify-stream-output:0-->

```
Benchmark: stringifyStream() (JSON.stringify() as a stream)
Node version: 15.9.0
Fixture: fixture/small.json 2.08MB

# JSON.stringify()
time: 29 ms
cpu: 26 ms
mem impact:  rss   +5.82MB | heapTotal   +8.39MB | heapUsed      -3kB | external     -65kB
       max:  rss  +13.79MB | heapTotal  +16.48MB | heapUsed   +8.19MB | external   +2.01MB

# @discoveryjs/json-ext
time: 71 ms
cpu: 80 ms
mem impact:  rss   +5.30MB | heapTotal    +532kB | heapUsed    +381kB | external     -65kB
       max:  rss   +5.32MB | heapTotal   +1.32MB | heapUsed   +4.49MB | external    +262kB

# bfj
time: 1308 ms
cpu: 1081 ms
mem impact:  rss  +36.83MB | heapTotal  +27.01MB | heapUsed   +1.18MB | external     -44kB
       max:  rss  +38.65MB | heapTotal  +31.20MB | heapUsed  +18.81MB | external    +185kB

# json-stream-stringify
time: 2307 ms
cpu: 2054 ms
mem impact:  rss   +6.14MB | heapTotal    +532kB | heapUsed    +400kB | external     -65kB
       max:  rss   +6.14MB | heapTotal   +1.06MB | heapUsed   +5.09MB | external         0
```
<!--/stringify-stream-output:0-->
</details>

<details>
<summary><pre>&gt; node benchmarks/stringify-stream 1  # use benchmarks/fixture/medium.json (~13.7MB)</pre></summary>
<!--stringify-stream-output:1-->

```
Benchmark: stringifyStream() (JSON.stringify() as a stream)
Node version: 15.9.0
Fixture: fixture/medium.json 13.69MB

# JSON.stringify()
time: 87 ms
cpu: 76 ms
mem impact:  rss   +9.56MB | heapTotal    +262kB | heapUsed     +90kB | external     -65kB
       max:  rss  +44.51MB | heapTotal  +27.39MB | heapUsed  +27.86MB | external  +13.63MB

# @discoveryjs/json-ext
time: 134 ms
cpu: 141 ms
mem impact:  rss   +7.91MB | heapTotal    +532kB | heapUsed    +452kB | external     -65kB
       max:  rss   +7.77MB | heapTotal    +270kB | heapUsed  +13.53MB | external   +3.27MB

# bfj
time: 3762 ms
cpu: 2227 ms
mem impact:  rss  +14.88MB | heapTotal   +1.06MB | heapUsed   +1.27MB | external     -44kB
       max:  rss  +15.02MB | heapTotal   +2.37MB | heapUsed  +18.76MB | external    +513kB

# json-stream-stringify
time: 6203 ms
cpu: 5477 ms
mem impact:  rss   +6.38MB | heapTotal    +532kB | heapUsed    +587kB | external     -65kB
       max:  rss   +6.38MB | heapTotal   +1.06MB | heapUsed  +14.55MB | external    +361kB
```
<!--/stringify-stream-output:1-->
</details>


<details>
<summary><pre>&gt; node benchmarks/stringify-stream 2  # use benchmarks/fixture/big.json (~100MB)</pre></summary>
<!--stringify-stream-output:2-->

```
Benchmark: stringifyStream() (JSON.stringify() as a stream)
Node version: 15.9.0
Fixture: fixture/big.json 99.95MB

# JSON.stringify()
time: 1030 ms
cpu: 1183 ms
mem impact:  rss  +19.20MB | heapTotal    +262kB | heapUsed     -85kB | external     -65kB
       max:  rss +393.03MB | heapTotal +292.18MB | heapUsed +287.26MB | external  +93.26MB

# @discoveryjs/json-ext
time: 2604 ms
cpu: 2390 ms
mem impact:  rss  +21.71MB | heapTotal    +795kB | heapUsed    +266kB | external     -65kB
       max:  rss +108.82MB | heapTotal  +99.89MB | heapUsed +109.39MB | external    +754kB

# bfj
time: 78952 ms
cpu: 66466 ms
mem impact:  rss  +55.42MB | heapTotal   +1.32MB | heapUsed    +779kB | external     -44kB
       max:  rss +421.08MB | heapTotal +377.76MB | heapUsed +383.70MB | external  +22.36MB

# json-stream-stringify
time: 165680 ms
cpu: 148102 ms
mem impact:  rss  +10.45MB | heapTotal    +532kB | heapUsed    +135kB | external     -65kB
       max:  rss +123.33MB | heapTotal +115.09MB | heapUsed +126.87MB | external     +49kB
```
<!--/stringify-stream-output:2-->
</details>

<details>
<summary><pre>&gt; node benchmarks/stringify-stream 3  # use benchmarks/fixture/500mb.json</pre></summary>
<!--stringify-stream-output:3-->

```
Benchmark: stringifyStream() (JSON.stringify() as a stream)
Node version: 15.9.0
Fixture: fixture/500mb.json 500MB

# JSON.stringify()
time: 8438 ms
cpu: 11027 ms
mem impact:  rss  +16.98MB | heapTotal         0 | heapUsed    -235kB | external     -65kB
       max:  rss   +2.05GB | heapTotal   +2.01GB | heapUsed   +1.90GB | external +162.99MB

# @discoveryjs/json-ext
time: 13433 ms
cpu: 12237 ms
mem impact:  rss  +19.39MB | heapTotal    +532kB | heapUsed    +318kB | external     -65kB
       max:  rss +506.40MB | heapTotal +500.18MB | heapUsed +503.36MB | external    +817kB

# bfj
time: 416611 ms
cpu: 375770 ms
mem impact:  rss +113.63MB | heapTotal   +1.84MB | heapUsed   +1.13MB | external     -44kB
       max:  rss   +1.17GB | heapTotal   +1.09GB | heapUsed   +1.09GB | external  +67.12MB

# json-stream-stringify
Error: Run takes too long time
    at sizeLessThan (~/json-ext/benchmarks/stringify-stream.js:45:19)
    at json-stream-stringify (~/json-ext/benchmarks/stringify-stream.js:79:38)
    at ~/json-ext/benchmarks/stringify-stream.js:89:9
    at new Promise (<anonymous>)
    at tests.<computed> (~/json-ext/benchmarks/stringify-stream.js:88:29)
    at benchmark (~/json-ext/benchmarks/benchmark-utils.js:53:28)
```
<!--/stringify-stream-output:3-->
</details>

<details>
<summary><pre>&gt; node benchmarks/stringify-stream 4  # use benchmarks/fixture/1gb.json</pre></summary>
<!--stringify-stream-output:4-->

```
Benchmark: stringifyStream() (JSON.stringify() as a stream)
Node version: 15.9.0
Fixture: fixture/1gb.json 1000MB

# JSON.stringify()
RangeError: Invalid string length
    at JSON.stringify (<anonymous>)
    at JSON.stringify() (~/json-ext/benchmarks/stringify-stream.js:71:38)
    at ~/json-ext/benchmarks/stringify-stream.js:89:9
    at new Promise (<anonymous>)
    at tests.<computed> (~/json-ext/benchmarks/stringify-stream.js:88:29)
    at benchmark (~/json-ext/benchmarks/benchmark-utils.js:53:28)

# @discoveryjs/json-ext
time: 28642 ms
cpu: 26033 ms
mem impact:  rss  +19.87MB | heapTotal    +795kB | heapUsed    +262kB | external     -65kB
       max:  rss   +1.01GB | heapTotal   +1.00GB | heapUsed +994.63MB | external    +817kB

# bfj
Error: Run takes too long time
    at sizeLessThan (~/json-ext/benchmarks/stringify-stream.js:45:19)
    at bfj (~/json-ext/benchmarks/stringify-stream.js:76:20)
    at ~/json-ext/benchmarks/stringify-stream.js:89:9
    at new Promise (<anonymous>)
    at tests.<computed> (~/json-ext/benchmarks/stringify-stream.js:88:29)
    at benchmark (~/json-ext/benchmarks/benchmark-utils.js:53:28)

# json-stream-stringify
Error: Run takes too long time
    at sizeLessThan (~/json-ext/benchmarks/stringify-stream.js:45:19)
    at json-stream-stringify (~/json-ext/benchmarks/stringify-stream.js:79:38)
    at ~/json-ext/benchmarks/stringify-stream.js:89:9
    at new Promise (<anonymous>)
    at tests.<computed> (~/json-ext/benchmarks/stringify-stream.js:88:29)
    at benchmark (~/json-ext/benchmarks/benchmark-utils.js:53:28)
```
<!--/stringify-stream-output:4-->
</details>

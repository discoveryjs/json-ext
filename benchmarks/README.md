# Benchmarks for JSON utils libraries

<!-- TOC depthfrom:1 -->

- [Parse chunked](#parse-chunked)
- [Stringify chunked](#stringify-chunked)
- [Stringify info](#stringify-info)

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
| JSON.parse() | 10ms | 27ms | 257ms | 1265ms | ERR_STRING_TOO_LONG |
| @discoveryjs/json-ext parseChunked(fs.createReadStream()) | 24ms | 54ms | 413ms | 1929ms | 3871ms |
| @discoveryjs/json-ext parseChunked(fs.readFileSync()) | 21ms | 55ms | 397ms | 1978ms | 4138ms |
| @discoveryjs/json-ext parseFromWebStream() | 28ms | 56ms | 392ms | 1959ms | 4048ms |
| bfj | 263ms | 1152ms | 12908ms | 64403ms | ERR_RUN_TOO_LONG |
| @discoveryjs/json-ext parseChunked(fs.createReadStream()) 0.5.7 | 24ms | 46ms | 424ms | 2069ms | 4132ms |
| @discoveryjs/json-ext parseChunked(fs.createReadStream()) 0.6.0 | 23ms | 57ms | 425ms | 2094ms | 4348ms |
<!--/parse-chunked-table:time-->

### CPU usage

<!--parse-chunked-table:cpu-->
| Solution | S (~2MB) | M (~13.7MB) | L (~100MB) | 500MB | 1GB |
| -------- | -------: | ----------: | ---------: | ----: | --: |
| JSON.parse() | 8ms | 29ms | 306ms | 1529ms | ERR_STRING_TOO_LONG |
| @discoveryjs/json-ext parseChunked(fs.createReadStream()) | 33ms | 76ms | 498ms | 2206ms | 4803ms |
| @discoveryjs/json-ext parseChunked(fs.readFileSync()) | 29ms | 72ms | 421ms | 2105ms | 4440ms |
| @discoveryjs/json-ext parseFromWebStream() | 40ms | 72ms | 461ms | 2222ms | 4590ms |
| bfj | 320ms | 1216ms | 13464ms | 70270ms | ERR_RUN_TOO_LONG |
| @discoveryjs/json-ext parseChunked(fs.createReadStream()) 0.5.7 | 31ms | 65ms | 492ms | 2346ms | 4404ms |
| @discoveryjs/json-ext parseChunked(fs.createReadStream()) 0.6.0 | 31ms | 81ms | 496ms | 2364ms | 4963ms |
<!--/parse-chunked-table:cpu-->

### Max memory usage

<!--parse-chunked-table:memory-->
| Solution | S (~2MB) | M (~13.7MB) | L (~100MB) | 500MB | 1GB |
| -------- | -------: | ----------: | ---------: | ----: | --: |
| JSON.parse() | 9.09MB | 60.30MB | 457.16MB | 2.29GB | ERR_STRING_TOO_LONG |
| @discoveryjs/json-ext parseChunked(fs.createReadStream()) | 9.70MB | 52.75MB | 195.82MB | 695.91MB | 1.33GB |
| @discoveryjs/json-ext parseChunked(fs.readFileSync()) | 9.09MB | 49.17MB | 278.10MB | 1.16GB | 2.20GB |
| @discoveryjs/json-ext parseFromWebStream() | 10.75MB | 46.73MB | 192.93MB | 689.46MB | 1.29GB |
| bfj | 38.13MB | 111.32MB | 352.53MB | 1.42GB | ERR_RUN_TOO_LONG |
| @discoveryjs/json-ext parseChunked(fs.createReadStream()) 0.5.7 | 9.13MB | 35.10MB | 199.70MB | 704.50MB | 1.29GB |
| @discoveryjs/json-ext parseChunked(fs.createReadStream()) 0.6.0 | 9.70MB | 34.13MB | 196.80MB | 688.68MB | 1.29GB |
<!--/parse-chunked-table:memory-->

### Output for fixtures

<details>
<summary><pre>&gt; node benchmarks/parse-chunked    # use benchmarks/fixture/small.json (~2MB)</pre></summary>
<!--parse-chunked-output:0-->

```
Benchmark: parseChunked() (parse chunked JSON)
Node version: 24.14.0
Fixture: fixture/small.json 2.08MB / chunk size 524kB

# JSON.parse()
time: 10 ms
cpu: 8 ms
mem impact:  rss   +9.32MB | heapTotal   +7.08MB | heapUsed   +2.65MB | external      +1kB
       max:  rss   +8.81MB | heapTotal   +4.19MB | heapUsed   +2.86MB | external   +6.23MB

# @discoveryjs/json-ext parseChunked(fs.createReadStream())
time: 24 ms
cpu: 33 ms
mem impact:  rss  +14.14MB | heapTotal   +6.55MB | heapUsed   +2.69MB | external      +1kB
       max:  rss  +17.68MB | heapTotal   +9.63MB | heapUsed   +7.10MB | external   +2.60MB

# @discoveryjs/json-ext parseChunked(fs.createReadStream()) 0.5.7
time: 24 ms
cpu: 31 ms
mem impact:  rss  +16.02MB | heapTotal   +6.82MB | heapUsed   +2.68MB | external    +526kB
       max:  rss  +19.63MB | heapTotal  +10.42MB | heapUsed   +7.05MB | external   +2.08MB

# @discoveryjs/json-ext parseChunked(fs.createReadStream()) 0.6.0
time: 23 ms
cpu: 31 ms
mem impact:  rss  +16.30MB | heapTotal   +7.08MB | heapUsed   +2.69MB | external      +1kB
       max:  rss  +19.82MB | heapTotal  +10.42MB | heapUsed   +7.10MB | external   +2.60MB

# @discoveryjs/json-ext parseChunked(fs.readFileSync())
time: 21 ms
cpu: 29 ms
mem impact:  rss  +14.42MB | heapTotal   +7.08MB | heapUsed   +2.61MB | external      +1kB
       max:  rss  +18.28MB | heapTotal   +9.37MB | heapUsed   +7.01MB | external   +2.08MB

# @discoveryjs/json-ext parseFromWebStream()
time: 28 ms
cpu: 40 ms
mem impact:  rss  +16.30MB | heapTotal   +7.34MB | heapUsed   +3.11MB | external    +172kB
       max:  rss  +20.12MB | heapTotal  +10.24MB | heapUsed   +7.98MB | external   +2.77MB

# bfj
time: 263 ms
cpu: 320 ms
mem impact:  rss  +73.68MB | heapTotal  +33.82MB | heapUsed   +4.17MB | external      +1kB
       max:  rss  +73.73MB | heapTotal  +49.95MB | heapUsed  +36.81MB | external   +1.31MB
```
<!--/parse-chunked-output:0-->
</details>

<details>
<summary><pre>&gt; node benchmarks/parse-chunked 1  # use benchmarks/fixture/medium.json (~13.7MB)</pre></summary>
<!--parse-chunked-output:1-->

```
Benchmark: parseChunked() (parse chunked JSON)
Node version: 24.14.0
Fixture: fixture/medium.json 13.69MB / chunk size 524kB

# JSON.parse()
time: 27 ms
cpu: 29 ms
mem impact:  rss  +64.39MB | heapTotal  +48.45MB | heapUsed  +19.22MB | external      +1kB
       max:  rss  +63.68MB | heapTotal  +42.42MB | heapUsed  +19.21MB | external  +41.08MB

# @discoveryjs/json-ext parseChunked(fs.createReadStream())
time: 54 ms
cpu: 76 ms
mem impact:  rss  +43.16MB | heapTotal  +82.00MB | heapUsed  +19.29MB | external      +1kB
       max:  rss  +62.62MB | heapTotal  +65.11MB | heapUsed  +43.77MB | external   +8.98MB

# @discoveryjs/json-ext parseChunked(fs.createReadStream()) 0.5.7
time: 46 ms
cpu: 65 ms
mem impact:  rss  +44.12MB | heapTotal  +82.02MB | heapUsed  +19.51MB | external    +526kB
       max:  rss  +48.04MB | heapTotal  +54.82MB | heapUsed  +27.23MB | external   +7.87MB

# @discoveryjs/json-ext parseChunked(fs.createReadStream()) 0.6.0
time: 57 ms
cpu: 81 ms
mem impact:  rss  +52.89MB | heapTotal  +82.02MB | heapUsed  +19.54MB | external      +1kB
       max:  rss  +57.57MB | heapTotal  +85.75MB | heapUsed  +28.89MB | external   +5.24MB

# @discoveryjs/json-ext parseChunked(fs.readFileSync())
time: 55 ms
cpu: 72 ms
mem impact:  rss  +44.61MB | heapTotal  +48.71MB | heapUsed  +19.15MB | external      +1kB
       max:  rss  +58.44MB | heapTotal  +58.00MB | heapUsed  +35.48MB | external  +13.70MB

# @discoveryjs/json-ext parseFromWebStream()
time: 56 ms
cpu: 72 ms
mem impact:  rss  +54.62MB | heapTotal  +83.57MB | heapUsed  +19.99MB | external    +172kB
       max:  rss  +67.86MB | heapTotal  +57.33MB | heapUsed  +39.16MB | external   +7.57MB

# bfj
time: 1152 ms
cpu: 1216 ms
mem impact:  rss +205.21MB | heapTotal +154.93MB | heapUsed  +20.24MB | external      +1kB
       max:  rss +204.62MB | heapTotal +180.04MB | heapUsed +107.52MB | external   +3.80MB
```
<!--/parse-chunked-output:1-->
</details>


<details>
<summary><pre>&gt; node benchmarks/parse-chunked 2  # use benchmarks/fixture/big.json (~100MB)</pre></summary>
<!--parse-chunked-output:2-->

```
Benchmark: parseChunked() (parse chunked JSON)
Node version: 24.14.0
Fixture: fixture/big.json 99.95MB / chunk size 524kB

# JSON.parse()
time: 257 ms
cpu: 306 ms
mem impact:  rss +587.66MB | heapTotal +287.13MB | heapUsed +157.33MB | external      +1kB
       max:  rss +585.42MB | heapTotal +275.60MB | heapUsed +157.32MB | external +299.84MB

# @discoveryjs/json-ext parseChunked(fs.createReadStream())
time: 413 ms
cpu: 498 ms
mem impact:  rss +258.49MB | heapTotal +246.50MB | heapUsed +116.57MB | external      +1kB
       max:  rss +302.84MB | heapTotal +254.67MB | heapUsed +169.08MB | external  +26.74MB

# @discoveryjs/json-ext parseChunked(fs.createReadStream()) 0.5.7
time: 424 ms
cpu: 492 ms
mem impact:  rss +224.46MB | heapTotal +246.76MB | heapUsed +116.52MB | external    +526kB
       max:  rss +255.34MB | heapTotal +254.72MB | heapUsed +175.06MB | external  +24.64MB

# @discoveryjs/json-ext parseChunked(fs.createReadStream()) 0.6.0
time: 425 ms
cpu: 496 ms
mem impact:  rss +263.39MB | heapTotal +247.02MB | heapUsed +116.56MB | external      +1kB
       max:  rss +308.59MB | heapTotal +255.34MB | heapUsed +171.63MB | external  +25.17MB

# @discoveryjs/json-ext parseChunked(fs.readFileSync())
time: 397 ms
cpu: 421 ms
mem impact:  rss +285.10MB | heapTotal +246.76MB | heapUsed +116.41MB | external      +1kB
       max:  rss +342.00MB | heapTotal +261.72MB | heapUsed +178.15MB | external  +99.95MB

# @discoveryjs/json-ext parseFromWebStream()
time: 392 ms
cpu: 461 ms
mem impact:  rss +264.29MB | heapTotal +247.55MB | heapUsed +117.00MB | external    +172kB
       max:  rss +310.15MB | heapTotal +254.57MB | heapUsed +167.60MB | external  +25.32MB

# bfj
time: 12908 ms
cpu: 13464 ms
mem impact:  rss +468.43MB | heapTotal +331.19MB | heapUsed +180.97MB | external      -969
       max:  rss +467.62MB | heapTotal +414.96MB | heapUsed +350.76MB | external   +1.77MB
```
<!--/parse-chunked-output:2-->
</details>

<details>
<summary><pre>&gt; node benchmarks/parse-chunked 3  # use benchmarks/fixture/500mb.json</pre></summary>
<!--parse-chunked-output:3-->

```
Benchmark: parseChunked() (parse chunked JSON)
Node version: 24.14.0
Fixture: fixture/500mb.json 500MB / chunk size 524kB

# JSON.parse()
time: 1265 ms
cpu: 1529 ms
mem impact:  rss   +1.42GB | heapTotal +917.13MB | heapUsed +786.64MB | external      +1kB
       max:  rss   +2.41GB | heapTotal +882.52MB | heapUsed +786.63MB | external   +1.50GB

# @discoveryjs/json-ext parseChunked(fs.createReadStream())
time: 1929 ms
cpu: 2206 ms
mem impact:  rss +829.83MB | heapTotal +711.97MB | heapUsed +581.28MB | external      +1kB
       max:  rss +889.85MB | heapTotal +745.28MB | heapUsed +663.93MB | external  +31.98MB

# @discoveryjs/json-ext parseChunked(fs.createReadStream()) 0.5.7
time: 2069 ms
cpu: 2346 ms
mem impact:  rss +745.49MB | heapTotal +712.26MB | heapUsed +581.53MB | external    +526kB
       max:  rss +810.24MB | heapTotal +752.68MB | heapUsed +672.52MB | external  +31.98MB

# @discoveryjs/json-ext parseChunked(fs.createReadStream()) 0.6.0
time: 2094 ms
cpu: 2364 ms
mem impact:  rss +877.12MB | heapTotal +712.00MB | heapUsed +581.57MB | external      +1kB
       max:  rss +924.57MB | heapTotal +739.62MB | heapUsed +657.74MB | external  +30.93MB

# @discoveryjs/json-ext parseChunked(fs.readFileSync())
time: 1978 ms
cpu: 2105 ms
mem impact:  rss   +1.17GB | heapTotal +711.18MB | heapUsed +581.05MB | external      +1kB
       max:  rss   +1.24GB | heapTotal +738.21MB | heapUsed +657.16MB | external +500.00MB

# @discoveryjs/json-ext parseFromWebStream()
time: 1959 ms
cpu: 2222 ms
mem impact:  rss +823.74MB | heapTotal +713.02MB | heapUsed +581.72MB | external    +172kB
       max:  rss +880.12MB | heapTotal +739.05MB | heapUsed +658.37MB | external  +31.09MB

# bfj
time: 64403 ms
cpu: 70270 ms
mem impact:  rss   +1.54GB | heapTotal   +1.18GB | heapUsed +907.05MB | external      -969
       max:  rss   +1.54GB | heapTotal   +1.48GB | heapUsed   +1.42GB | external   +2.23MB
```
<!--/parse-chunked-output:3-->
</details>

<details>
<summary><pre>&gt; node benchmarks/parse-chunked 4  # use benchmarks/fixture/1gb.json</pre></summary>
<!--parse-chunked-output:4-->

```
Benchmark: parseChunked() (parse chunked JSON)
Node version: 24.14.0
Fixture: fixture/1gb.json 1000MB / chunk size 524kB

# JSON.parse()
Error: Cannot create a string longer than 0x1fffffe8 characters
    at Buffer.toString (node:buffer:864:12)
    at JSON.parse (<anonymous>)
    at JSON.parse() (../json-ext/benchmarks/parse-chunked.js:40:14)
    at benchmark (../json-ext/benchmarks/benchmark-utils.js:65:28)
    at async ../json-ext/benchmarks/run-test.js:7:17

# @discoveryjs/json-ext parseChunked(fs.createReadStream())
time: 3871 ms
cpu: 4803 ms
mem impact:  rss   +1.43GB | heapTotal   +1.29GB | heapUsed   +1.16GB | external      +1kB
       max:  rss   +1.53GB | heapTotal   +1.36GB | heapUsed   +1.27GB | external  +56.10MB

# @discoveryjs/json-ext parseChunked(fs.createReadStream()) 0.5.7
time: 4132 ms
cpu: 4404 ms
mem impact:  rss   +1.39GB | heapTotal   +1.29GB | heapUsed   +1.16GB | external    +526kB
       max:  rss   +1.48GB | heapTotal   +1.34GB | heapUsed   +1.26GB | external  +31.46MB

# @discoveryjs/json-ext parseChunked(fs.createReadStream()) 0.6.0
time: 4348 ms
cpu: 4963 ms
mem impact:  rss   +1.49GB | heapTotal   +1.29GB | heapUsed   +1.16GB | external      +1kB
       max:  rss   +1.58GB | heapTotal   +1.34GB | heapUsed   +1.26GB | external  +31.98MB

# @discoveryjs/json-ext parseChunked(fs.readFileSync())
time: 4138 ms
cpu: 4440 ms
mem impact:  rss   +1.29GB | heapTotal   +1.29GB | heapUsed   +1.16GB | external      +1kB
       max:  rss   +2.32GB | heapTotal   +1.30GB | heapUsed   +1.20GB | external   +1.00GB

# @discoveryjs/json-ext parseFromWebStream()
time: 4048 ms
cpu: 4590 ms
mem impact:  rss   +1.43GB | heapTotal   +1.29GB | heapUsed   +1.16GB | external    +172kB
       max:  rss   +1.52GB | heapTotal   +1.34GB | heapUsed   +1.26GB | external  +33.19MB

# bfj
Error: Run takes too long time
    at sizeLessThan (../json-ext/benchmarks/parse-chunked.js:75:19)
    at bfj (../json-ext/benchmarks/parse-chunked.js:62:18)
    at benchmark (../json-ext/benchmarks/benchmark-utils.js:65:28)
    at async ../json-ext/benchmarks/run-test.js:7:17
```
<!--/parse-chunked-output:4-->
</details>

## Stringify chunked

Benchmark: `stringify-chunked.js`

How to run:

```
node benchmarks/stringify-chunked [fixture]
```

Where `[fixture]` is number of fixture:

* `0` – fixture/small.json (~2MB)
* `1` – fixture/medium.json (~13.7MB)
* `2` – fixture/big.json (~100MB)
* `3` – fixture/500mb.json (500MB, auto-generated from big.json x 5 + padding strings)
* `4` – fixture/1gb.json (1gb, auto-generated from big.json x 10 + padding strings)

### Time

<!--stringify-chunked-table:time-->
| Solution | S (~2MB) | M (~13.7MB) | L (~100MB) | 500MB | 1GB |
| -------- | -------: | ----------: | ---------: | ----: | --: |
| JSON.stringify() | 8ms | 34ms | 289ms | 1393ms | ERR_STRING_TOO_LONG |
| @discoveryjs/json-ext stringifyChunked() | 14ms | 30ms | 414ms | 2116ms | 4145ms |
| @discoveryjs/json-ext createStringifyWebStream() | 14ms | 35ms | 419ms | 2142ms | 4322ms |
| @discoveryjs/json-ext v0.6.0 stringifyChunked() | 15ms | 32ms | 582ms | 3004ms | 6056ms |
| @discoveryjs/json-ext v0.5.7 stringifyStream() | 25ms | 57ms | 672ms | 3406ms | 6736ms |
| json-stream-stringify | 22ms | 38ms | 706ms | 3524ms | 7322ms |
| bfj | 134ms | 1338ms | 9012ms | ERR_RUN_TOO_LONG | ERR_RUN_TOO_LONG |
<!--/stringify-chunked-table:time-->

### CPU usage

<!--stringify-chunked-table:cpu-->
| Solution | S (~2MB) | M (~13.7MB) | L (~100MB) | 500MB | 1GB |
| -------- | -------: | ----------: | ---------: | ----: | --: |
| JSON.stringify() | 7ms | 32ms | 283ms | 1268ms | ERR_STRING_TOO_LONG |
| @discoveryjs/json-ext stringifyChunked() | 26ms | 41ms | 442ms | 2162ms | 4214ms |
| @discoveryjs/json-ext createStringifyWebStream() | 23ms | 47ms | 450ms | 2210ms | 4382ms |
| @discoveryjs/json-ext v0.6.0 stringifyChunked() | 24ms | 43ms | 609ms | 3053ms | 6120ms |
| @discoveryjs/json-ext v0.5.7 stringifyStream() | 36ms | 67ms | 700ms | 3466ms | 6829ms |
| json-stream-stringify | 37ms | 58ms | 748ms | 3633ms | 7483ms |
| bfj | 168ms | 465ms | 8971ms | ERR_RUN_TOO_LONG | ERR_RUN_TOO_LONG |
<!--/stringify-chunked-table:cpu-->

### Max memory usage

<!--stringify-chunked-table:memory-->
| Solution | S (~2MB) | M (~13.7MB) | L (~100MB) | 500MB | 1GB |
| -------- | -------: | ----------: | ---------: | ----: | --: |
| JSON.stringify() | 4.27MB | 27.49MB | 199.99MB | 1GB | ERR_STRING_TOO_LONG |
| @discoveryjs/json-ext stringifyChunked() | 2.53MB | 23.24MB | 110.40MB | 283.82MB | 500.52MB |
| @discoveryjs/json-ext createStringifyWebStream() | 3.65MB | 25.43MB | 111.23MB | 219.51MB | 437.67MB |
| @discoveryjs/json-ext v0.6.0 stringifyChunked() | 4.43MB | 25.63MB | 44.48MB | 220.98MB | 440.78MB |
| @discoveryjs/json-ext v0.5.7 stringifyStream() | 3.86MB | 39.12MB | 107.98MB | 289.30MB | 494.37MB |
| json-stream-stringify | 5.54MB | 30.09MB | 32.58MB | 20.77MB | 41.81MB |
| bfj | 8.25MB | 32MB | 119.36MB | ERR_RUN_TOO_LONG | ERR_RUN_TOO_LONG |
<!--/stringify-chunked-table:memory-->

### Output for fixtures

<details>
<summary><pre>&gt; node benchmarks/stringify-chunked    # use benchmarks/fixture/small.json (~2MB)</pre></summary>
<!--stringify-chunked-output:0-->

```
Benchmark: stringifyChunked() (JSON.stringify() as a stream of chunks)
Node version: 24.14.0
Fixture: fixture/small.json 2.08MB

# JSON.stringify()
Result: 2077471
time: 8 ms
cpu: 7 ms
mem impact:  rss   +8.37MB | heapTotal         0 | heapUsed     +57kB | external      +1kB
       max:  rss  +12.32MB | heapTotal   +4.16MB | heapUsed   +4.27MB | external      +1kB

# @discoveryjs/json-ext stringifyChunked()
Result: 2077471
time: 14 ms
cpu: 26 ms
mem impact:  rss   +3.26MB | heapTotal    +262kB | heapUsed    +232kB | external      +1kB
       max:  rss   +3.00MB | heapTotal   +1.05MB | heapUsed   +2.52MB | external      +1kB

# @discoveryjs/json-ext createStringifyWebStream()
Result: 2077471
time: 14 ms
cpu: 23 ms
mem impact:  rss   +5.06MB | heapTotal   +1.05MB | heapUsed    +673kB | external    +172kB
       max:  rss   +4.75MB | heapTotal   +1.31MB | heapUsed   +3.48MB | external    +172kB

# @discoveryjs/json-ext v0.6.0 stringifyChunked()
Result: 2077471
time: 15 ms
cpu: 24 ms
mem impact:  rss   +3.11MB | heapTotal    +262kB | heapUsed    +236kB | external      +1kB
       max:  rss   +3.05MB | heapTotal    +524kB | heapUsed   +4.43MB | external      +1kB

# @discoveryjs/json-ext v0.5.7 stringifyStream()
Result: 2077471
time: 25 ms
cpu: 36 ms
mem impact:  rss   +8.49MB | heapTotal   +8.65MB | heapUsed    +269kB | external      +1kB
       max:  rss   +8.45MB | heapTotal   +9.06MB | heapUsed   +3.55MB | external    +309kB

# json-stream-stringify
Result: 2077471
time: 22 ms
cpu: 37 ms
mem impact:  rss   +7.36MB | heapTotal   +8.91MB | heapUsed    +327kB | external      +1kB
       max:  rss   +7.49MB | heapTotal   +8.95MB | heapUsed   +5.54MB | external      +1kB

# bfj
Result: 2077471
time: 134 ms
cpu: 168 ms
mem impact:  rss  +12.86MB | heapTotal   +8.65MB | heapUsed    +347kB | external      +1kB
       max:  rss  +12.83MB | heapTotal   +8.91MB | heapUsed   +8.25MB | external      +1kB
```
<!--/stringify-chunked-output:0-->
</details>

<details>
<summary><pre>&gt; node benchmarks/stringify-chunked 1  # use benchmarks/fixture/medium.json (~13.7MB)</pre></summary>
<!--stringify-chunked-output:1-->

```
Benchmark: stringifyChunked() (JSON.stringify() as a stream of chunks)
Node version: 24.14.0
Fixture: fixture/medium.json 13.69MB

# JSON.stringify()
Result: 13693865
time: 34 ms
cpu: 32 ms
mem impact:  rss  +57.49MB | heapTotal    +262kB | heapUsed     +55kB | external      +1kB
       max:  rss  +84.82MB | heapTotal  +27.39MB | heapUsed  +27.49MB | external      +1kB

# @discoveryjs/json-ext stringifyChunked()
Result: 13693865
time: 30 ms
cpu: 41 ms
mem impact:  rss  +31.11MB | heapTotal    +262kB | heapUsed    +107kB | external      +1kB
       max:  rss  +30.97MB | heapTotal    +786kB | heapUsed  +23.24MB | external      +1kB

# @discoveryjs/json-ext createStringifyWebStream()
Result: 13693865
time: 35 ms
cpu: 47 ms
mem impact:  rss  +42.93MB | heapTotal    +262kB | heapUsed    +551kB | external    +172kB
       max:  rss  +42.83MB | heapTotal    +524kB | heapUsed  +25.26MB | external    +172kB

# @discoveryjs/json-ext v0.6.0 stringifyChunked()
Result: 13693865
time: 32 ms
cpu: 43 ms
mem impact:  rss  +34.54MB | heapTotal    +786kB | heapUsed    +109kB | external      +1kB
       max:  rss  +34.29MB | heapTotal    +786kB | heapUsed  +25.62MB | external      +1kB

# @discoveryjs/json-ext v0.5.7 stringifyStream()
Result: 13693865
time: 57 ms
cpu: 67 ms
mem impact:  rss  +50.40MB | heapTotal    +524kB | heapUsed    +174kB | external      +1kB
       max:  rss  +50.25MB | heapTotal   +1.05MB | heapUsed  +31.92MB | external   +7.20MB

# json-stream-stringify
Result: 13693865
time: 38 ms
cpu: 58 ms
mem impact:  rss  +39.70MB | heapTotal    +262kB | heapUsed    +162kB | external      +1kB
       max:  rss  +39.86MB | heapTotal    +934kB | heapUsed  +30.09MB | external      +1kB

# bfj
Result: 13693865
time: 1338 ms
cpu: 465 ms
mem impact:  rss  +44.97MB | heapTotal    +262kB | heapUsed    +294kB | external      +1kB
       max:  rss  +44.81MB | heapTotal   +1.84MB | heapUsed  +32.00MB | external      +1kB
```
<!--/stringify-chunked-output:1-->
</details>


<details>
<summary><pre>&gt; node benchmarks/stringify-chunked 2  # use benchmarks/fixture/big.json (~100MB)</pre></summary>
<!--stringify-chunked-output:2-->

```
Benchmark: stringifyChunked() (JSON.stringify() as a stream of chunks)
Node version: 24.14.0
Fixture: fixture/big.json 99.95MB

# JSON.stringify()
Result: 99947225
time: 289 ms
cpu: 283 ms
mem impact:  rss +426.46MB | heapTotal    +262kB | heapUsed     +28kB | external      +1kB
       max:  rss +625.92MB | heapTotal +199.90MB | heapUsed +199.99MB | external      +1kB

# @discoveryjs/json-ext stringifyChunked()
Result: 99947225
time: 414 ms
cpu: 442 ms
mem impact:  rss  +74.32MB | heapTotal    +262kB | heapUsed     +81kB | external      +1kB
       max:  rss  +73.33MB | heapTotal  +38.80MB | heapUsed +110.40MB | external      +1kB

# @discoveryjs/json-ext createStringifyWebStream()
Result: 99947225
time: 419 ms
cpu: 450 ms
mem impact:  rss  +79.99MB | heapTotal    +786kB | heapUsed    +525kB | external    +172kB
       max:  rss  +78.50MB | heapTotal  +44.56MB | heapUsed +111.06MB | external    +172kB

# @discoveryjs/json-ext v0.6.0 stringifyChunked()
Result: 99947225
time: 582 ms
cpu: 609 ms
mem impact:  rss  +75.51MB | heapTotal    +262kB | heapUsed     +82kB | external      +1kB
       max:  rss  +74.15MB | heapTotal  +40.11MB | heapUsed  +44.48MB | external      +1kB

# @discoveryjs/json-ext v0.5.7 stringifyStream()
Result: 99947225
time: 672 ms
cpu: 700 ms
mem impact:  rss  +82.72MB | heapTotal    +524kB | heapUsed    +146kB | external      +1kB
       max:  rss  +81.77MB | heapTotal  +45.24MB | heapUsed +104.57MB | external   +3.41MB

# json-stream-stringify
Result: 99947225
time: 706 ms
cpu: 748 ms
mem impact:  rss  +34.70MB | heapTotal    +524kB | heapUsed    +128kB | external      +1kB
       max:  rss  +33.80MB | heapTotal   +1.20MB | heapUsed  +32.58MB | external      +1kB

# bfj
Result: 99947225
time: 9012 ms
cpu: 8971 ms
mem impact:  rss  +87.00MB | heapTotal    +524kB | heapUsed    +201kB | external      +1kB
       max:  rss  +86.44MB | heapTotal  +61.08MB | heapUsed +119.36MB | external      +1kB
```
<!--/stringify-chunked-output:2-->
</details>

<details>
<summary><pre>&gt; node benchmarks/stringify-chunked 3  # use benchmarks/fixture/500mb.json</pre></summary>
<!--stringify-chunked-output:3-->

```
Benchmark: stringifyChunked() (JSON.stringify() as a stream of chunks)
Node version: 24.14.0
Fixture: fixture/500mb.json 500MB

# JSON.stringify()
Result: 500000000
time: 1393 ms
cpu: 1268 ms
mem impact:  rss   +1.04GB | heapTotal -131.86MB | heapUsed     +28kB | external      +1kB
       max:  rss   +2.03GB | heapTotal   +1.00GB | heapUsed   +1.00GB | external      +1kB

# @discoveryjs/json-ext stringifyChunked()
Result: 500000000
time: 2116 ms
cpu: 2162 ms
mem impact:  rss +236.34MB | heapTotal    +524kB | heapUsed     +80kB | external      +1kB
       max:  rss +234.96MB | heapTotal +202.11MB | heapUsed +283.82MB | external      +1kB

# @discoveryjs/json-ext createStringifyWebStream()
Result: 500000000
time: 2142 ms
cpu: 2210 ms
mem impact:  rss +232.06MB | heapTotal    +524kB | heapUsed    +525kB | external    +172kB
       max:  rss +230.98MB | heapTotal +207.09MB | heapUsed +219.34MB | external    +172kB

# @discoveryjs/json-ext v0.6.0 stringifyChunked()
Result: 500000000
time: 3004 ms
cpu: 3053 ms
mem impact:  rss +249.84MB | heapTotal         0 | heapUsed     +81kB | external      +1kB
       max:  rss +249.14MB | heapTotal +215.22MB | heapUsed +220.98MB | external      +1kB

# @discoveryjs/json-ext v0.5.7 stringifyStream()
Result: 500000000
time: 3406 ms
cpu: 3466 ms
mem impact:  rss +240.21MB | heapTotal    +262kB | heapUsed    +217kB | external      +1kB
       max:  rss +239.45MB | heapTotal +206.72MB | heapUsed +285.58MB | external   +3.72MB

# json-stream-stringify
Result: 500000000
time: 3524 ms
cpu: 3633 ms
mem impact:  rss  +40.73MB | heapTotal    -262kB | heapUsed    +191kB | external      +1kB
       max:  rss  +38.54MB | heapTotal   +1.20MB | heapUsed  +20.77MB | external      +1kB

# bfj
Error: Run takes too long time
    at sizeLessThan (../json-ext/benchmarks/stringify-chunked.js:51:19)
    at bfj (../json-ext/benchmarks/stringify-chunked.js:75:20)
    at tests.<computed> (../json-ext/benchmarks/stringify-chunked.js:86:35)
    at benchmark (../json-ext/benchmarks/benchmark-utils.js:65:28)
    at async ../json-ext/benchmarks/run-test.js:7:17
```
<!--/stringify-chunked-output:3-->
</details>

<details>
<summary><pre>&gt; node benchmarks/stringify-chunked 4  # use benchmarks/fixture/1gb.json</pre></summary>
<!--stringify-chunked-output:4-->

```
Benchmark: stringifyChunked() (JSON.stringify() as a stream of chunks)
Node version: 24.14.0
Fixture: fixture/1gb.json 1000MB

# JSON.stringify()
RangeError: Invalid string length
    at JSON.stringify (<anonymous>)
    at JSON.stringify() (../json-ext/benchmarks/stringify-chunked.js:58:15)
    at tests.<computed> (../json-ext/benchmarks/stringify-chunked.js:86:35)
    at benchmark (../json-ext/benchmarks/benchmark-utils.js:65:28)
    at async ../json-ext/benchmarks/run-test.js:7:17

# @discoveryjs/json-ext stringifyChunked()
Result: 1000000000
time: 4145 ms
cpu: 4214 ms
mem impact:  rss +448.40MB | heapTotal    +524kB | heapUsed     +80kB | external      +1kB
       max:  rss +445.01MB | heapTotal +420.48MB | heapUsed +500.52MB | external      +1kB

# @discoveryjs/json-ext createStringifyWebStream()
Result: 1000000000
time: 4322 ms
cpu: 4382 ms
mem impact:  rss +433.54MB | heapTotal    +524kB | heapUsed    +526kB | external    +172kB
       max:  rss +428.92MB | heapTotal +406.59MB | heapUsed +437.50MB | external    +172kB

# @discoveryjs/json-ext v0.6.0 stringifyChunked()
Result: 1000000000
time: 6056 ms
cpu: 6120 ms
mem impact:  rss +456.59MB | heapTotal    +262kB | heapUsed     +82kB | external      +1kB
       max:  rss +453.10MB | heapTotal +419.43MB | heapUsed +440.78MB | external      +1kB

# @discoveryjs/json-ext v0.5.7 stringifyStream()
Result: 1000000000
time: 6736 ms
cpu: 6829 ms
mem impact:  rss +458.05MB | heapTotal         0 | heapUsed    +285kB | external      +1kB
       max:  rss +457.11MB | heapTotal +423.77MB | heapUsed +491.43MB | external   +2.94MB

# json-stream-stringify
Result: 1000000000
time: 7322 ms
cpu: 7483 ms
mem impact:  rss  +38.94MB | heapTotal    +524kB | heapUsed    +237kB | external      +1kB
       max:  rss  +37.99MB | heapTotal    +672kB | heapUsed  +41.81MB | external      +1kB

# bfj
Error: Run takes too long time
    at sizeLessThan (../json-ext/benchmarks/stringify-chunked.js:51:19)
    at bfj (../json-ext/benchmarks/stringify-chunked.js:75:20)
    at tests.<computed> (../json-ext/benchmarks/stringify-chunked.js:86:35)
    at benchmark (../json-ext/benchmarks/benchmark-utils.js:65:28)
    at async ../json-ext/benchmarks/run-test.js:7:17
```
<!--/stringify-chunked-output:4-->
</details>

## Stringify Info

Benchmark: `strigify-info.js`

How to run:

```
node benchmarks/stringify-info [fixture]
```

Where `[fixture]` is number of fixture:

* `0` – fixture/small.json (~2MB)
* `1` – fixture/medium.json (~13.7MB)
* `2` – fixture/big.json (~100MB)
* `3` – fixture/500mb.json (500MB, auto-generated from big.json x 5 + padding strings)
* `4` – fixture/1gb.json (1gb, auto-generated from big.json x 10 + padding strings)

### Time

<!--stringify-info-table:time-->
| Solution | S (~2MB) | M (~13.7MB) | L (~100MB) | 500MB | 1GB |
| -------- | -------: | ----------: | ---------: | ----: | --: |
| JSON.stringify() | 13ms | 54ms | 518ms | 2726ms | ERR_STRING_TOO_LONG |
| @discoveryjs/json-ext stringifyInfo() | 18ms | 34ms | 280ms | 1429ms | 3052ms |
| @discoveryjs/json-ext v0.6.0 stringifyInfo() | 22ms | 49ms | 562ms | 31342ms | 177746ms |
| @discoveryjs/json-ext v0.5.7 stringifyInfo() | 22ms | 48ms | 613ms | 3605ms | 8637ms |
<!--/stringify-info-table:time-->

### CPU usage

<!--stringify-info-table:cpu-->
| Solution | S (~2MB) | M (~13.7MB) | L (~100MB) | 500MB | 1GB |
| -------- | -------: | ----------: | ---------: | ----: | --: |
| JSON.stringify() | 11ms | 47ms | 450ms | 1980ms | ERR_STRING_TOO_LONG |
| @discoveryjs/json-ext stringifyInfo() | 28ms | 49ms | 329ms | 1602ms | 3339ms |
| @discoveryjs/json-ext v0.6.0 stringifyInfo() | 38ms | 61ms | 595ms | 31128ms | 175554ms |
| @discoveryjs/json-ext v0.5.7 stringifyInfo() | 39ms | 60ms | 643ms | 3681ms | 8431ms |
<!--/stringify-info-table:cpu-->

### Max memory usage

<!--stringify-info-table:memory-->
| Solution | S (~2MB) | M (~13.7MB) | L (~100MB) | 500MB | 1GB |
| -------- | -------: | ----------: | ---------: | ----: | --: |
| JSON.stringify() | 4.30MB | 27.51MB | 210.20MB | 1GB | ERR_STRING_TOO_LONG |
| @discoveryjs/json-ext stringifyInfo() | 1.66MB | 13.06MB | 26.41MB | 64.84MB | 121.28MB |
| @discoveryjs/json-ext v0.6.0 stringifyInfo() | 1.53MB | 1.13MB | 115.32MB | 480.38MB | 968.82MB |
| @discoveryjs/json-ext v0.5.7 stringifyInfo() | 1.42MB | 1MB | 103.87MB | 682.86MB | 1.37GB |
<!--/stringify-info-table:memory-->

### Output for fixtures

<details>
<summary><pre>&gt; node benchmarks/stringify-info    # use benchmarks/fixture/small.json (~2MB)</pre></summary>
<!--stringify-info-output:0-->

```
Benchmark: stringifyInfo() (size of JSON.stringify())
Node version: 22.5.1
Fixture: fixture/small.json 2.08MB

# JSON.stringify()
Result: 2077471
time: 13 ms
cpu: 11 ms
mem impact:  rss   +8.03MB | heapTotal    +262kB | heapUsed     +77kB | external      +1kB
       max:  rss  +12.11MB | heapTotal   +4.16MB | heapUsed   +4.30MB | external      +1kB

# @discoveryjs/json-ext stringifyInfo()
Result: 2077471
time: 18 ms
cpu: 28 ms
mem impact:  rss   +3.78MB | heapTotal    +524kB | heapUsed    +237kB | external      +1kB
       max:  rss   +3.62MB | heapTotal    +262kB | heapUsed   +1.66MB | external      +1kB

# @discoveryjs/json-ext v0.6.0 stringifyInfo()
Result: 2077471
time: 22 ms
cpu: 38 ms
mem impact:  rss   +2.57MB | heapTotal    +262kB | heapUsed    +227kB | external      +1kB
       max:  rss   +2.87MB | heapTotal    +688kB | heapUsed   +1.52MB | external      +1kB

# @discoveryjs/json-ext v0.5.7 stringifyInfo()
Result: 2077471
time: 22 ms
cpu: 39 ms
mem impact:  rss   +2.08MB | heapTotal    +524kB | heapUsed    +232kB | external      +1kB
       max:  rss   +2.08MB | heapTotal    +508kB | heapUsed   +1.42MB | external      +1kB
```
<!--/stringify-info-output:0-->
</details>

<details>
<summary><pre>&gt; node benchmarks/stringify-info 1  # use benchmarks/fixture/medium.json (~13.7MB)</pre></summary>
<!--stringify-info-output:1-->

```
Benchmark: stringifyInfo() (size of JSON.stringify())
Node version: 22.5.1
Fixture: fixture/medium.json 13.69MB

# JSON.stringify()
Result: 13693865
time: 54 ms
cpu: 47 ms
mem impact:  rss  +57.46MB | heapTotal         0 | heapUsed     +79kB | external      +1kB
       max:  rss  +84.79MB | heapTotal  +27.39MB | heapUsed  +27.51MB | external      +1kB

# @discoveryjs/json-ext stringifyInfo()
Result: 13693865
time: 34 ms
cpu: 49 ms
mem impact:  rss   +2.59MB | heapTotal    +262kB | heapUsed    +107kB | external      +1kB
       max:  rss   +1.87MB | heapTotal    +262kB | heapUsed  +13.06MB | external      +1kB

# @discoveryjs/json-ext v0.6.0 stringifyInfo()
Result: 13693865
time: 49 ms
cpu: 61 ms
mem impact:  rss   +1.11MB | heapTotal    +262kB | heapUsed    +103kB | external      +1kB
       max:  rss   +1.47MB | heapTotal    +688kB | heapUsed   +1.13MB | external      +1kB

# @discoveryjs/json-ext v0.5.7 stringifyInfo()
Result: 13693865
time: 48 ms
cpu: 60 ms
mem impact:  rss    +786kB | heapTotal    +262kB | heapUsed    +108kB | external      +1kB
       max:  rss    +983kB | heapTotal    +508kB | heapUsed   +1.00MB | external      +1kB
```
<!--/stringify-info-output:1-->
</details>

<details>
<summary><pre>&gt; node benchmarks/stringify-info 2  # use benchmarks/fixture/big.json (~100MB)</pre></summary>
<!--stringify-info-output:2-->

```
Benchmark: stringifyInfo() (size of JSON.stringify())
Node version: 22.5.1
Fixture: fixture/big.json 99.95MB

# JSON.stringify()
Result: 99947225
time: 518 ms
cpu: 450 ms
mem impact:  rss +170.98MB | heapTotal         0 | heapUsed     +75kB | external      +1kB
       max:  rss +369.48MB | heapTotal +199.90MB | heapUsed +210.20MB | external      +1kB

# @discoveryjs/json-ext stringifyInfo()
Result: 99947225
time: 280 ms
cpu: 329 ms
mem impact:  rss   +7.91MB | heapTotal    +262kB | heapUsed    +108kB | external      +1kB
       max:  rss  +22.09MB | heapTotal  +14.81MB | heapUsed  +26.41MB | external      +1kB

# @discoveryjs/json-ext v0.6.0 stringifyInfo()
Result: 99947225
time: 562 ms
cpu: 595 ms
mem impact:  rss  +50.66MB | heapTotal         0 | heapUsed    +100kB | external      +1kB
       max:  rss +113.18MB | heapTotal +106.76MB | heapUsed +115.32MB | external      +1kB

# @discoveryjs/json-ext v0.5.7 stringifyInfo()
Result: 99947225
time: 613 ms
cpu: 643 ms
mem impact:  rss  +48.63MB | heapTotal    +262kB | heapUsed    +106kB | external      +1kB
       max:  rss  +99.70MB | heapTotal  +94.16MB | heapUsed +103.87MB | external      +1kB
```
<!--/stringify-info-output:2-->
</details>

<details>
<summary><pre>&gt; node benchmarks/stringify-info 3  # use benchmarks/fixture/500mb.json</pre></summary>
<!--stringify-info-output:3-->

```
Benchmark: stringifyInfo() (size of JSON.stringify())
Node version: 22.5.1
Fixture: fixture/500mb.json 500MB

# JSON.stringify()
Result: 500000000
time: 2726 ms
cpu: 1980 ms
mem impact:  rss   -6.47MB | heapTotal    +262kB | heapUsed     +75kB | external      +1kB
       max:  rss +925.91MB | heapTotal   +1.00GB | heapUsed   +1.00GB | external      +1kB

# @discoveryjs/json-ext stringifyInfo()
Result: 500000000
time: 1429 ms
cpu: 1602 ms
mem impact:  rss   +8.01MB | heapTotal         0 | heapUsed    +107kB | external      +1kB
       max:  rss  +66.16MB | heapTotal  +58.88MB | heapUsed  +64.84MB | external      +1kB

# @discoveryjs/json-ext v0.6.0 stringifyInfo()
Result: 500000000
time: 31342 ms
cpu: 31128 ms
mem impact:  rss +221.92MB | heapTotal         0 | heapUsed    +100kB | external      +1kB
       max:  rss +481.59MB | heapTotal +475.35MB | heapUsed +480.37MB | external      +1kB

# @discoveryjs/json-ext v0.5.7 stringifyInfo()
Result: 500000000
time: 3605 ms
cpu: 3681 ms
mem impact:  rss +225.82MB | heapTotal    +262kB | heapUsed    +105kB | external      +1kB
       max:  rss +687.59MB | heapTotal +681.67MB | heapUsed +682.86MB | external      +1kB
```
<!--/stringify-info-output:3-->
</details>

<details>
<summary><pre>&gt; node benchmarks/stringify-info 4  # use benchmarks/fixture/1gb.json</pre></summary>
<!--stringify-info-output:4-->

```
Benchmark: stringifyInfo() (size of JSON.stringify())
Node version: 22.5.1
Fixture: fixture/1gb.json 0

# JSON.stringify()
RangeError: Invalid string length
    at JSON.stringify (<anonymous>)
    at JSON.stringify() (../json-ext/benchmarks/stringify-info.js:45:32)
    at tests.<computed> (../json-ext/benchmarks/stringify-info.js:65:21)
    at benchmark (../json-ext/benchmarks/benchmark-utils.js:65:28)
    at async ../json-ext/benchmarks/run-test.js:7:17

# @discoveryjs/json-ext stringifyInfo()
Result: 1000000000
time: 3052 ms
cpu: 3339 ms
mem impact:  rss   +6.90MB | heapTotal         0 | heapUsed    +106kB | external      +1kB
       max:  rss +124.19MB | heapTotal +117.62MB | heapUsed +121.28MB | external      +1kB

# @discoveryjs/json-ext v0.6.0 stringifyInfo()
Result: 1000000000
time: 177746 ms
cpu: 175554 ms
mem impact:  rss  +15.73MB | heapTotal         0 | heapUsed    +100kB | external      +1kB
       max:  rss         0 | heapTotal +966.36MB | heapUsed +968.82MB | external      +1kB

# @discoveryjs/json-ext v0.5.7 stringifyInfo()
Result: 1000000000
time: 8637 ms
cpu: 8431 ms
mem impact:  rss  +29.08MB | heapTotal    +262kB | heapUsed    +105kB | external      +1kB
       max:  rss +968.85MB | heapTotal   +1.37GB | heapUsed   +1.37GB | external      +1kB
```
<!--/stringify-info-output:4-->
</details>

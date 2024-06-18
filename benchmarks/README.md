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
| JSON.parse() | 18ms | 53ms | 592ms | 3325ms | CRASH |
| @discoveryjs/json-ext parseChunked(fs.createReadStream()) | 41ms | 89ms | 753ms | 3709ms | 7342ms |
| @discoveryjs/json-ext parseChunked(fs.readFileSync()) | 37ms | 83ms | 761ms | 3776ms | 8128ms |
| @discoveryjs/json-ext parseFromWebStream() | 44ms | 92ms | 756ms | 3738ms | 7439ms |
| bfj | 756ms | 3042ms | 55518ms | CRASH | ERR_RUN_TOO_LONG |
<!--/parse-chunked-table:time-->

### CPU usage

<!--parse-chunked-table:cpu-->
| Solution | S (~2MB) | M (~13.7MB) | L (~100MB) | 500MB | 1GB |
| -------- | -------: | ----------: | ---------: | ----: | --: |
| JSON.parse() | 17ms | 59ms | 863ms | 3813ms | CRASH |
| @discoveryjs/json-ext parseChunked(fs.createReadStream()) | 52ms | 112ms | 1033ms | 4892ms | 9052ms |
| @discoveryjs/json-ext parseChunked(fs.readFileSync()) | 47ms | 110ms | 996ms | 4560ms | 10294ms |
| @discoveryjs/json-ext parseFromWebStream() | 59ms | 114ms | 1067ms | 4949ms | 9015ms |
| bfj | 924ms | 3241ms | 57905ms | CRASH | ERR_RUN_TOO_LONG |
<!--/parse-chunked-table:cpu-->

### Max memory usage

<!--parse-chunked-table:memory-->
| Solution | S (~2MB) | M (~13.7MB) | L (~100MB) | 500MB | 1GB |
| -------- | -------: | ----------: | ---------: | ----: | --: |
| JSON.parse() | 6.50MB | 19.17MB | 113.74MB | 1.57GB | CRASH |
| @discoveryjs/json-ext parseChunked(fs.createReadStream()) | 11.41MB | 47.26MB | 146.38MB | 618.23MB | 1.23GB |
| @discoveryjs/json-ext parseChunked(fs.readFileSync()) | 10.83MB | 48.93MB | 222.70MB | 1.12GB | 2.15GB |
| @discoveryjs/json-ext parseFromWebStream() | 12.04MB | 47.58MB | 146.34MB | 617.86MB | 1.24GB |
| bfj | 63.93MB | 123.42MB | 2.32GB | CRASH | ERR_RUN_TOO_LONG |
<!--/parse-chunked-table:memory-->

### Output for fixtures

<details>
<summary><pre>&gt; node benchmarks/parse-chunked    # use benchmarks/fixture/small.json (~2MB)</pre></summary>
<!--parse-chunked-output:0-->

```
Benchmark: parseChunked() (parse chunked JSON)
Node version: 20.14.0
Fixture: fixture/small.json 2.08MB / chunk size 524kB

# JSON.parse()
time: 18 ms
cpu: 17 ms
mem impact:  rss   +7.59MB | heapTotal   +5.77MB | heapUsed   +2.00MB | external       +56
       max:  rss  +11.39MB | heapTotal  +10.19MB | heapUsed   +6.50MB | external       +56

# @discoveryjs/json-ext parseChunked(fs.createReadStream())
time: 41 ms
cpu: 52 ms
mem impact:  rss   +5.46MB | heapTotal   +6.82MB | heapUsed   +2.36MB | external       +56
       max:  rss  +10.58MB | heapTotal  +11.01MB | heapUsed   +8.80MB | external   +2.60MB

# @discoveryjs/json-ext parseChunked(fs.readFileSync())
time: 37 ms
cpu: 47 ms
mem impact:  rss   +5.85MB | heapTotal   +6.29MB | heapUsed   +2.29MB | external       +56
       max:  rss  +10.86MB | heapTotal  +10.75MB | heapUsed   +8.75MB | external   +2.08MB

# @discoveryjs/json-ext parseFromWebStream()
time: 44 ms
cpu: 59 ms
mem impact:  rss   +7.27MB | heapTotal   +7.34MB | heapUsed   +2.70MB | external    +160kB
       max:  rss  +12.44MB | heapTotal  +11.53MB | heapUsed   +9.28MB | external   +2.76MB

# bfj
time: 756 ms
cpu: 924 ms
mem impact:  rss  +76.89MB | heapTotal  +35.13MB | heapUsed   +5.04MB | external       +63
       max:  rss  +87.65MB | heapTotal  +81.15MB | heapUsed  +62.38MB | external   +1.55MB
```
<!--/parse-chunked-output:0-->
</details>

<details>
<summary><pre>&gt; node benchmarks/parse-chunked 1  # use benchmarks/fixture/medium.json (~13.7MB)</pre></summary>
<!--parse-chunked-output:1-->

```
Benchmark: parseChunked() (parse chunked JSON)
Node version: 20.14.0
Fixture: fixture/medium.json 13.69MB / chunk size 524kB

# JSON.parse()
time: 53 ms
cpu: 59 ms
mem impact:  rss  +61.62MB | heapTotal  +49.00MB | heapUsed  +18.96MB | external       +56
       max:  rss  +88.82MB | heapTotal  +48.74MB | heapUsed  +19.17MB | external       +56

# @discoveryjs/json-ext parseChunked(fs.createReadStream())
time: 89 ms
cpu: 112 ms
mem impact:  rss  +40.68MB | heapTotal  +49.53MB | heapUsed  +19.49MB | external       +56
       max:  rss  +56.57MB | heapTotal  +58.82MB | heapUsed  +39.33MB | external   +7.93MB

# @discoveryjs/json-ext parseChunked(fs.readFileSync())
time: 83 ms
cpu: 110 ms
mem impact:  rss  +39.27MB | heapTotal  +48.48MB | heapUsed  +19.19MB | external       +56
       max:  rss  +53.59MB | heapTotal  +58.20MB | heapUsed  +35.24MB | external  +13.69MB

# @discoveryjs/json-ext parseFromWebStream()
time: 92 ms
cpu: 114 ms
mem impact:  rss  +42.29MB | heapTotal  +50.05MB | heapUsed  +19.61MB | external    +160kB
       max:  rss  +58.57MB | heapTotal  +58.56MB | heapUsed  +39.49MB | external   +8.09MB

# bfj
time: 3042 ms
cpu: 3241 ms
mem impact:  rss +142.38MB | heapTotal  +97.80MB | heapUsed  +20.87MB | external       +63
       max:  rss +146.15MB | heapTotal +135.76MB | heapUsed +118.84MB | external   +4.59MB
```
<!--/parse-chunked-output:1-->
</details>


<details>
<summary><pre>&gt; node benchmarks/parse-chunked 2  # use benchmarks/fixture/big.json (~100MB)</pre></summary>
<!--parse-chunked-output:2-->

```
Benchmark: parseChunked() (parse chunked JSON)
Node version: 20.14.0
Fixture: fixture/big.json 99.95MB / chunk size 524kB

# JSON.parse()
time: 592 ms
cpu: 863 ms
mem impact:  rss +267.88MB | heapTotal +144.79MB | heapUsed +113.57MB | external       +56
       max:  rss +466.63MB | heapTotal +145.05MB | heapUsed +113.74MB | external       +56

# @discoveryjs/json-ext parseChunked(fs.createReadStream())
time: 753 ms
cpu: 1033 ms
mem impact:  rss +165.46MB | heapTotal +146.11MB | heapUsed +114.15MB | external       +56
       max:  rss +181.78MB | heapTotal +155.53MB | heapUsed +136.42MB | external   +9.96MB

# @discoveryjs/json-ext parseChunked(fs.readFileSync())
time: 761 ms
cpu: 996 ms
mem impact:  rss +238.55MB | heapTotal +146.37MB | heapUsed +113.98MB | external       +56
       max:  rss +244.20MB | heapTotal +146.06MB | heapUsed +122.75MB | external  +99.95MB

# @discoveryjs/json-ext parseFromWebStream()
time: 756 ms
cpu: 1067 ms
mem impact:  rss +158.25MB | heapTotal +147.16MB | heapUsed +114.43MB | external    +160kB
       max:  rss +175.23MB | heapTotal +163.68MB | heapUsed +136.24MB | external  +10.11MB

# bfj
time: 55518 ms
cpu: 57905 ms
mem impact:  rss   +2.37GB | heapTotal   +2.28GB | heapUsed   +1.76GB | external       +63
       max:  rss   +2.22GB | heapTotal   +2.36GB | heapUsed   +2.30GB | external  +17.76MB
```
<!--/parse-chunked-output:2-->
</details>

<details>
<summary><pre>&gt; node benchmarks/parse-chunked 3  # use benchmarks/fixture/500mb.json</pre></summary>
<!--parse-chunked-output:3-->

```
Benchmark: parseChunked() (parse chunked JSON)
Node version: 20.14.0
Fixture: fixture/500mb.json 500MB / chunk size 524kB

# JSON.parse()
time: 3325 ms
cpu: 3813 ms
mem impact:  rss +612.47MB | heapTotal +608.58MB | heapUsed +568.88MB | external       +56
       max:  rss   +1.42GB | heapTotal   +1.60GB | heapUsed   +1.57GB | external       +56

# @discoveryjs/json-ext parseChunked(fs.createReadStream())
time: 3709 ms
cpu: 4892 ms
mem impact:  rss +639.35MB | heapTotal +610.34MB | heapUsed +570.17MB | external       +56
       max:  rss +671.11MB | heapTotal +635.09MB | heapUsed +607.74MB | external  +10.49MB

# @discoveryjs/json-ext parseChunked(fs.readFileSync())
time: 3776 ms
cpu: 4560 ms
mem impact:  rss +604.73MB | heapTotal +609.81MB | heapUsed +569.98MB | external       +56
       max:  rss   +1.15GB | heapTotal +646.38MB | heapUsed +617.93MB | external +500.00MB

# @discoveryjs/json-ext parseFromWebStream()
time: 3738 ms
cpu: 4949 ms
mem impact:  rss +637.76MB | heapTotal +610.34MB | heapUsed +570.55MB | external    +160kB
       max:  rss +669.96MB | heapTotal +634.04MB | heapUsed +606.18MB | external  +11.68MB

# bfj

<--- Last few GCs --->

[65418:0x130008000]   161105 ms: Mark-Compact 4042.4 (4128.6) -> 4026.9 (4129.1) MB, 4035.96 / 0.00 ms  (average mu = 0.130, current mu = 0.015) allocation failure; scavenge might not succeed
[65418:0x130008000]   164489 ms: Mark-Compact 4042.8 (4129.1) -> 4027.2 (4129.4) MB, 3372.04 / 0.00 ms  (average mu = 0.074, current mu = 0.004) allocation failure; scavenge might not succeed


<--- JS stacktrace --->

FATAL ERROR: Ineffective mark-compacts near heap limit Allocation failed - JavaScript heap out of memory
----- Native stack trace -----

 1: 0x1008fcb44 node::OOMErrorHandler(char const*, v8::OOMDetails const&) [/usr/local/bin/node]
 2: 0x100a843ec v8::internal::V8::FatalProcessOutOfMemory(v8::internal::Isolate*, char const*, v8::OOMDetails const&) [/usr/local/bin/node]
 3: 0x100c58ac0 v8::internal::Heap::GarbageCollectionReasonToString(v8::internal::GarbageCollectionReason) [/usr/local/bin/node]
 4: 0x100c5c974 v8::internal::Heap::CollectGarbageShared(v8::internal::LocalHeap*, v8::internal::GarbageCollectionReason) [/usr/local/bin/node]
 5: 0x100c593d8 v8::internal::Heap::PerformGarbageCollection(v8::internal::GarbageCollector, v8::internal::GarbageCollectionReason, char const*) [/usr/local/bin/node]
 6: 0x100c57160 v8::internal::Heap::CollectGarbage(v8::internal::AllocationSpace, v8::internal::GarbageCollectionReason, v8::GCCallbackFlags) [/usr/local/bin/node]
 7: 0x100c4ddb4 v8::internal::HeapAllocator::AllocateRawWithLightRetrySlowPath(int, v8::internal::AllocationType, v8::internal::AllocationOrigin, v8::internal::AllocationAlignment) [/usr/local/bin/node]
 8: 0x100c4e614 v8::internal::HeapAllocator::AllocateRawWithRetryOrFailSlowPath(int, v8::internal::AllocationType, v8::internal::AllocationOrigin, v8::internal::AllocationAlignment) [/usr/local/bin/node]
 9: 0x100c33684 v8::internal::Factory::NewFillerObject(int, v8::internal::AllocationAlignment, v8::internal::AllocationType, v8::internal::AllocationOrigin) [/usr/local/bin/node]
10: 0x10101b394 v8::internal::Runtime_AllocateInYoungGeneration(int, unsigned long*, v8::internal::Isolate*) [/usr/local/bin/node]
11: 0x101378c44 Builtins_CEntry_Return1_ArgvOnStack_NoBuiltinExit [/usr/local/bin/node]
12: 0x10671cfe0 
13: 0x106738eb4 
14: 0x10675d248 
15: 0x106721e1c 
16: 0x106721088 
17: 0x106722e6c 
18: 0x10671de50 
19: 0x10672f3dc 
20: 0x10674d9d8 
21: 0x1067561c8 
22: 0x1012ee50c Builtins_JSEntryTrampoline [/usr/local/bin/node]
23: 0x1012ee1f4 Builtins_JSEntry [/usr/local/bin/node]
24: 0x100bc5f68 v8::internal::(anonymous namespace)::Invoke(v8::internal::Isolate*, v8::internal::(anonymous namespace)::InvokeParams const&) [/usr/local/bin/node]
25: 0x100bc53b4 v8::internal::Execution::Call(v8::internal::Isolate*, v8::internal::Handle<v8::internal::Object>, v8::internal::Handle<v8::internal::Object>, int, v8::internal::Handle<v8::internal::Object>*) [/usr/local/bin/node]
26: 0x100a9fca4 v8::Function::Call(v8::Local<v8::Context>, v8::Local<v8::Value>, int, v8::Local<v8::Value>*) [/usr/local/bin/node]
27: 0x100828fa0 node::InternalMakeCallback(node::Environment*, v8::Local<v8::Object>, v8::Local<v8::Object>, v8::Local<v8::Function>, int, v8::Local<v8::Value>*, node::async_context) [/usr/local/bin/node]
28: 0x1008292b8 node::MakeCallback(v8::Isolate*, v8::Local<v8::Object>, v8::Local<v8::Function>, int, v8::Local<v8::Value>*, node::async_context) [/usr/local/bin/node]
29: 0x10089e464 node::Environment::CheckImmediate(uv_check_s*) [/usr/local/bin/node]
30: 0x1012d64e4 uv__run_check [/usr/local/bin/node]
31: 0x1012d0204 uv_run [/usr/local/bin/node]
32: 0x1008296f0 node::SpinEventLoopInternal(node::Environment*) [/usr/local/bin/node]
33: 0x10093c7c0 node::NodeMainInstance::Run(node::ExitCode*, node::Environment*) [/usr/local/bin/node]
34: 0x10093c4d4 node::NodeMainInstance::Run() [/usr/local/bin/node]
35: 0x1008c47ac node::Start(int, char**) [/usr/local/bin/node]
36: 0x18dede0e0 start [/usr/lib/dyld]
```
<!--/parse-chunked-output:3-->
</details>

<details>
<summary><pre>&gt; node benchmarks/parse-chunked 4  # use benchmarks/fixture/1gb.json</pre></summary>
<!--parse-chunked-output:4-->

```
Benchmark: parseChunked() (parse chunked JSON)
Node version: 20.14.0
Fixture: fixture/1gb.json 1000MB / chunk size 524kB

# JSON.parse()
FATAL ERROR: v8::ToLocalChecked Empty MaybeLocal
----- Native stack trace -----

 1: 0x100824a20 node::OnFatalError(char const*, char const*) [/usr/local/bin/node]
 2: 0x1009ae24c v8::api_internal::ToLocalEmpty() [/usr/local/bin/node]
 3: 0x100831cf4 node::fs::ReadFileUtf8(v8::FunctionCallbackInfo<v8::Value> const&) [/usr/local/bin/node]
 4: 0x100a19f68 v8::internal::MaybeHandle<v8::internal::Object> v8::internal::(anonymous namespace)::HandleApiCallHelper<false>(v8::internal::Isolate*, v8::internal::Handle<v8::internal::HeapObject>, v8::internal::Handle<v8::internal::FunctionTemplateInfo>, v8::internal::Handle<v8::internal::Object>, unsigned long*, int) [/usr/local/bin/node]
 5: 0x100a19660 v8::internal::Builtin_HandleApiCall(int, unsigned long*, v8::internal::Isolate*) [/usr/local/bin/node]
 6: 0x1012a0b24 Builtins_CEntry_Return1_ArgvOnStack_BuiltinExit [/usr/local/bin/node]
 7: 0x106636a98 
 8: 0x1012183e4 Builtins_InterpreterEntryTrampoline [/usr/local/bin/node]
 9: 0x1012183e4 Builtins_InterpreterEntryTrampoline [/usr/local/bin/node]
10: 0x10124f210 Builtins_AsyncFunctionAwaitResolveClosure [/usr/local/bin/node]
11: 0x1012fcfb8 Builtins_PromiseFulfillReactionJob [/usr/local/bin/node]
12: 0x10123eb94 Builtins_RunMicrotasks [/usr/local/bin/node]
13: 0x1012163f4 Builtins_JSRunMicrotasksEntry [/usr/local/bin/node]
14: 0x100aedf40 v8::internal::(anonymous namespace)::Invoke(v8::internal::Isolate*, v8::internal::(anonymous namespace)::InvokeParams const&) [/usr/local/bin/node]
15: 0x100aee42c v8::internal::(anonymous namespace)::InvokeWithTryCatch(v8::internal::Isolate*, v8::internal::(anonymous namespace)::InvokeParams const&) [/usr/local/bin/node]
16: 0x100aee608 v8::internal::Execution::TryRunMicrotasks(v8::internal::Isolate*, v8::internal::MicrotaskQueue*) [/usr/local/bin/node]
17: 0x100b157d4 v8::internal::MicrotaskQueue::RunMicrotasks(v8::internal::Isolate*) [/usr/local/bin/node]
18: 0x100b15f70 v8::internal::MicrotaskQueue::PerformCheckpoint(v8::Isolate*) [/usr/local/bin/node]
19: 0x100750c4c node::InternalCallbackScope::Close() [/usr/local/bin/node]
20: 0x1007507bc node::InternalCallbackScope::~InternalCallbackScope() [/usr/local/bin/node]
21: 0x1007c7838 node::Environment::RunTimers(uv_timer_s*) [/usr/local/bin/node]
22: 0x1011f49d4 uv__run_timers [/usr/local/bin/node]
23: 0x1011f8234 uv_run [/usr/local/bin/node]
24: 0x1007516f0 node::SpinEventLoopInternal(node::Environment*) [/usr/local/bin/node]
25: 0x1008647c0 node::NodeMainInstance::Run(node::ExitCode*, node::Environment*) [/usr/local/bin/node]
26: 0x1008644d4 node::NodeMainInstance::Run() [/usr/local/bin/node]
27: 0x1007ec7ac node::Start(int, char**) [/usr/local/bin/node]
28: 0x18dede0e0 start [/usr/lib/dyld]

----- JavaScript stack trace -----

1: readFileSync (node:fs:448:20)
2: JSON.parse() (file:///Users/romandvornov/Developer/json-ext/benchmarks/parse-chunked.js:38:23)
3: benchmark (file:///Users/romandvornov/Developer/json-ext/benchmarks/benchmark-utils.js:65:28)


# @discoveryjs/json-ext parseChunked(fs.createReadStream())
time: 7342 ms
cpu: 9052 ms
mem impact:  rss   +1.21GB | heapTotal   +1.19GB | heapUsed   +1.14GB | external       +56
       max:  rss +918.83MB | heapTotal   +1.26GB | heapUsed   +1.22GB | external  +11.53MB

# @discoveryjs/json-ext parseChunked(fs.readFileSync())
time: 8128 ms
cpu: 10294 ms
mem impact:  rss   +1.18GB | heapTotal   +1.19GB | heapUsed   +1.14GB | external       +56
       max:  rss   +1.59GB | heapTotal   +1.20GB | heapUsed   +1.15GB | external   +1.00GB

# @discoveryjs/json-ext parseFromWebStream()
time: 7439 ms
cpu: 9015 ms
mem impact:  rss   +1.23GB | heapTotal   +1.19GB | heapUsed   +1.14GB | external    +160kB
       max:  rss   +1.32GB | heapTotal   +1.27GB | heapUsed   +1.23GB | external  +11.68MB

# bfj
Error: Run takes too long time
    at sizeLessThan (file://~/json-ext/benchmarks/parse-chunked.js:67:19)
    at bfj (file://~/json-ext/benchmarks/parse-chunked.js:54:18)
    at benchmark (file://~/json-ext/benchmarks/benchmark-utils.js:65:28)
    at async file://~/json-ext/benchmarks/run-test.js:7:17
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
| JSON.stringify() | 9ms | 24ms | 327ms | 2008ms | ERR_STRING_TOO_LONG |
| @discoveryjs/json-ext stringifyChunked() | 27ms | 43ms | 848ms | 4918ms | 10489ms |
| @discoveryjs/json-ext createStringifyWebStream() | 24ms | 49ms | 868ms | 4790ms | 10444ms |
| json-stream-stringify | 35ms | 77ms | 998ms | 5317ms | 11162ms |
| bfj | 1208ms | 3961ms | 75006ms | ERR_RUN_TOO_LONG | ERR_RUN_TOO_LONG |
<!--/stringify-stream-table:time-->

### CPU usage

<!--stringify-stream-table:cpu-->
| Solution | S (~2MB) | M (~13.7MB) | L (~100MB) | 500MB | 1GB |
| -------- | -------: | ----------: | ---------: | ----: | --: |
| JSON.stringify() | 10ms | 16ms | 350ms | 1953ms | ERR_STRING_TOO_LONG |
| @discoveryjs/json-ext stringifyChunked() | 47ms | 73ms | 919ms | 5094ms | 10772ms |
| @discoveryjs/json-ext createStringifyWebStream() | 42ms | 77ms | 937ms | 4948ms | 10597ms |
| json-stream-stringify | 71ms | 113ms | 1082ms | 5560ms | 11547ms |
| bfj | 515ms | 1233ms | 32648ms | ERR_RUN_TOO_LONG | ERR_RUN_TOO_LONG |
<!--/stringify-stream-table:cpu-->

### Max memory usage

<!--stringify-stream-table:memory-->
| Solution | S (~2MB) | M (~13.7MB) | L (~100MB) | 500MB | 1GB |
| -------- | -------: | ----------: | ---------: | ----: | --: |
| JSON.stringify() | 3.76MB | 14.43MB | 103.26MB | 903.52MB | ERR_STRING_TOO_LONG |
| @discoveryjs/json-ext stringifyChunked() | 2.61MB | 11.95MB | 66.13MB | 297.97MB | 578.14MB |
| @discoveryjs/json-ext createStringifyWebStream() | 3.83MB | 14.10MB | 69.89MB | 294.43MB | 584.65MB |
| json-stream-stringify | 1.12MB | 16.47MB | 10.41MB | 10.50MB | 15.25MB |
| bfj | 9.34MB | 17.62MB | 38.92MB | ERR_RUN_TOO_LONG | ERR_RUN_TOO_LONG |
<!--/stringify-stream-table:memory-->

### Output for fixtures

<details>
<summary><pre>&gt; node benchmarks/stringify-stream    # use benchmarks/fixture/small.json (~2MB)</pre></summary>
<!--stringify-stream-output:0-->

```
Benchmark: stringifyStream() (JSON.stringify() as a stream)
Node version: 20.14.0
Fixture: fixture/small.json 2.08MB

# JSON.stringify()
Result: 2077407
time: 9 ms
cpu: 10 ms
mem impact:  rss   +1.95MB | heapTotal   +8.65MB | heapUsed    -218kB | external       +56
       max:  rss   +5.21MB | heapTotal  +12.58MB | heapUsed   +3.76MB | external       +56

# @discoveryjs/json-ext stringifyChunked()
Result: 2077407
time: 27 ms
cpu: 47 ms
mem impact:  rss   +2.93MB | heapTotal   +8.65MB | heapUsed     -37kB | external       +56
       max:  rss   +2.39MB | heapTotal         0 | heapUsed   +2.61MB | external       +56

# @discoveryjs/json-ext createStringifyWebStream()
Result: 2077407
time: 24 ms
cpu: 42 ms
mem impact:  rss   +4.34MB | heapTotal   +8.91MB | heapUsed    +340kB | external    +160kB
       max:  rss   +4.21MB | heapTotal   +8.65MB | heapUsed   +3.67MB | external    +160kB

# bfj
Result: 2077407
time: 1208 ms
cpu: 515 ms
mem impact:  rss  +13.01MB | heapTotal  +10.22MB | heapUsed    +900kB | external       +56
       max:  rss  +12.76MB | heapTotal  +10.22MB | heapUsed   +9.34MB | external       +56

# json-stream-stringify
Result: 2077407
time: 35 ms
cpu: 71 ms
mem impact:  rss   +4.54MB | heapTotal   +8.91MB | heapUsed     +89kB | external       +56
       max:  rss   +3.98MB | heapTotal    +262kB | heapUsed   +1.12MB | external       +56
```
<!--/stringify-stream-output:0-->
</details>

<details>
<summary><pre>&gt; node benchmarks/stringify-stream 1  # use benchmarks/fixture/medium.json (~13.7MB)</pre></summary>
<!--stringify-stream-output:1-->

```
Benchmark: stringifyStream() (JSON.stringify() as a stream)
Node version: 20.14.0
Fixture: fixture/medium.json 13.69MB

# JSON.stringify()
Result: 13693862
time: 24 ms
cpu: 16 ms
mem impact:  rss   +3.47MB | heapTotal    +262kB | heapUsed    -166kB | external       +56
       max:  rss   +3.05MB | heapTotal         0 | heapUsed  +14.43MB | external       +56

# @discoveryjs/json-ext stringifyChunked()
Result: 13693862
time: 43 ms
cpu: 73 ms
mem impact:  rss   +8.55MB | heapTotal    +262kB | heapUsed    -167kB | external       +56
       max:  rss   +8.52MB | heapTotal         0 | heapUsed  +11.95MB | external       +56

# @discoveryjs/json-ext createStringifyWebStream()
Result: 13693862
time: 49 ms
cpu: 77 ms
mem impact:  rss   +8.75MB | heapTotal    +262kB | heapUsed    +215kB | external    +160kB
       max:  rss   +8.70MB | heapTotal         0 | heapUsed  +13.94MB | external    +160kB

# json-stream-stringify
Result: 13693862
time: 77 ms
cpu: 113 ms
mem impact:  rss   +7.95MB | heapTotal    +262kB | heapUsed    +135kB | external       +56
       max:  rss   +7.86MB | heapTotal         0 | heapUsed  +16.47MB | external       +56

# bfj
Result: 13693862
time: 3961 ms
cpu: 1233 ms
mem impact:  rss  +10.80MB | heapTotal    +786kB | heapUsed    +942kB | external       +56
       max:  rss  +10.68MB | heapTotal   +1.84MB | heapUsed  +17.62MB | external       +56
```
<!--/stringify-stream-output:1-->
</details>


<details>
<summary><pre>&gt; node benchmarks/stringify-stream 2  # use benchmarks/fixture/big.json (~100MB)</pre></summary>
<!--stringify-stream-output:2-->

```
Benchmark: stringifyStream() (JSON.stringify() as a stream)
Node version: 20.14.0
Fixture: fixture/big.json 99.95MB

# JSON.stringify()
Result: 99947224
time: 327 ms
cpu: 350 ms
mem impact:  rss   +7.45MB | heapTotal    +262kB | heapUsed    -219kB | external       +56
       max:  rss  +97.52MB | heapTotal  +90.96MB | heapUsed +103.26MB | external       +56

# @discoveryjs/json-ext stringifyChunked()
Result: 99947224
time: 848 ms
cpu: 919 ms
mem impact:  rss   +9.60MB | heapTotal    +524kB | heapUsed    -163kB | external       +56
       max:  rss  +63.13MB | heapTotal  +56.10MB | heapUsed  +66.13MB | external       +56

# @discoveryjs/json-ext createStringifyWebStream()
Result: 99947224
time: 868 ms
cpu: 937 ms
mem impact:  rss  +15.34MB | heapTotal   +1.05MB | heapUsed    +250kB | external    +160kB
       max:  rss  +64.57MB | heapTotal  +57.67MB | heapUsed  +69.73MB | external    +160kB

# bfj
Result: 99947224
time: 75006 ms
cpu: 32648 ms
mem impact:  rss  +11.55MB | heapTotal   +1.05MB | heapUsed    +562kB | external       +56
       max:  rss  +30.16MB | heapTotal  +21.50MB | heapUsed  +38.92MB | external       +56

# json-stream-stringify
Result: 99947224
time: 998 ms
cpu: 1082 ms
mem impact:  rss   +8.22MB | heapTotal    +524kB | heapUsed     -82kB | external       +56
       max:  rss   +7.85MB | heapTotal    +262kB | heapUsed  +10.41MB | external       +56
```
<!--/stringify-stream-output:2-->
</details>

<details>
<summary><pre>&gt; node benchmarks/stringify-stream 3  # use benchmarks/fixture/500mb.json</pre></summary>
<!--stringify-stream-output:3-->

```
Benchmark: stringifyStream() (JSON.stringify() as a stream)
Node version: 20.14.0
Fixture: fixture/500mb.json 500MB

# JSON.stringify()
Result: 499999995
time: 2008 ms
cpu: 1953 ms
mem impact:  rss   +2.06MB | heapTotal    +262kB | heapUsed     +29kB | external       +56
       max:  rss +573.90MB | heapTotal   +1.01GB | heapUsed +903.52MB | external       +56

# @discoveryjs/json-ext stringifyChunked()
Result: 499999995
time: 4918 ms
cpu: 5094 ms
mem impact:  rss  +12.12MB | heapTotal    +524kB | heapUsed    -163kB | external       +56
       max:  rss +296.78MB | heapTotal +289.41MB | heapUsed +297.97MB | external       +56

# @discoveryjs/json-ext createStringifyWebStream()
Result: 499999995
time: 4790 ms
cpu: 4948 ms
mem impact:  rss  +20.40MB | heapTotal   +1.05MB | heapUsed    +250kB | external    +160kB
       max:  rss +298.89MB | heapTotal +290.72MB | heapUsed +294.27MB | external    +160kB

# json-stream-stringify
Result: 499999995
time: 5317 ms
cpu: 5560 ms
mem impact:  rss   +9.55MB | heapTotal    +524kB | heapUsed     -94kB | external       +56
       max:  rss  +10.67MB | heapTotal   +3.15MB | heapUsed  +10.50MB | external       +56

# bfj
Error: Run takes too long time
    at sizeLessThan (file://~/json-ext/benchmarks/stringify-stream.js:50:19)
    at bfj (file://~/json-ext/benchmarks/stringify-stream.js:87:20)
    at tests.<computed> (file://~/json-ext/benchmarks/stringify-stream.js:98:35)
    at benchmark (file://~/json-ext/benchmarks/benchmark-utils.js:65:28)
    at async file://~/json-ext/benchmarks/run-test.js:7:17
```
<!--/stringify-stream-output:3-->
</details>

<details>
<summary><pre>&gt; node benchmarks/stringify-stream 4  # use benchmarks/fixture/1gb.json</pre></summary>
<!--stringify-stream-output:4-->

```
Benchmark: stringifyStream() (JSON.stringify() as a stream)
Node version: 20.14.0
Fixture: fixture/1gb.json 1000MB

# JSON.stringify()
RangeError: Invalid string length
    at JSON.stringify (<anonymous>)
    at JSON.stringify() (file://~/json-ext/benchmarks/stringify-stream.js:76:15)
    at tests.<computed> (file://~/json-ext/benchmarks/stringify-stream.js:98:35)
    at benchmark (file://~/json-ext/benchmarks/benchmark-utils.js:65:28)
    at async file://~/json-ext/benchmarks/run-test.js:7:17

# @discoveryjs/json-ext stringifyChunked()
Result: 999999990
time: 10489 ms
cpu: 10772 ms
mem impact:  rss   +8.03MB | heapTotal    +524kB | heapUsed    -163kB | external       +56
       max:  rss +317.01MB | heapTotal +576.72MB | heapUsed +578.14MB | external       +56

# @discoveryjs/json-ext createStringifyWebStream()
Result: 999999990
time: 10444 ms
cpu: 10597 ms
mem impact:  rss   -1.20MB | heapTotal   +1.05MB | heapUsed    +393kB | external    +160kB
       max:  rss +438.04MB | heapTotal +581.17MB | heapUsed +584.49MB | external    +160kB

# json-stream-stringify
Result: 999999990
time: 11162 ms
cpu: 11547 ms
mem impact:  rss   +8.57MB | heapTotal    +524kB | heapUsed     -97kB | external       +56
       max:  rss  +16.11MB | heapTotal   +8.65MB | heapUsed  +15.25MB | external       +56

# bfj
Error: Run takes too long time
    at sizeLessThan (file://~/json-ext/benchmarks/stringify-stream.js:50:19)
    at bfj (file://~/json-ext/benchmarks/stringify-stream.js:87:20)
    at tests.<computed> (file://~/json-ext/benchmarks/stringify-stream.js:98:35)
    at benchmark (file://~/json-ext/benchmarks/benchmark-utils.js:65:28)
    at async file://~/json-ext/benchmarks/run-test.js:7:17
```
<!--/stringify-stream-output:4-->
</details>

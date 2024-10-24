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
| JSON.stringify() | 10ms | 42ms | 447ms | 2957ms | ERR_STRING_TOO_LONG |
| @discoveryjs/json-ext stringifyChunked() | 20ms | 40ms | 645ms | 3476ms | 7536ms |
| @discoveryjs/json-ext createStringifyWebStream() | 31ms | 46ms | 648ms | 3577ms | 7689ms |
| @discoveryjs/json-ext v0.6.0 stringifyChunked() | 27ms | 40ms | 933ms | 5530ms | 11433ms |
| @discoveryjs/json-ext v0.5.7 stringifyStream() | 37ms | 70ms | 1050ms | 5842ms | 12793ms |
| json-stream-stringify | 33ms | 50ms | 1092ms | 5596ms | 11983ms |
| bfj | 554ms | 2172ms | 75006ms | ERR_RUN_TOO_LONG | ERR_RUN_TOO_LONG |
<!--/stringify-chunked-table:time-->

### CPU usage

<!--stringify-chunked-table:cpu-->
| Solution | S (~2MB) | M (~13.7MB) | L (~100MB) | 500MB | 1GB |
| -------- | -------: | ----------: | ---------: | ----: | --: |
| JSON.stringify() | 7ms | 32ms | 427ms | 1995ms | ERR_STRING_TOO_LONG |
| @discoveryjs/json-ext stringifyChunked() | 37ms | 65ms | 698ms | 3595ms | 7690ms |
| @discoveryjs/json-ext createStringifyWebStream() | 46ms | 73ms | 723ms | 3678ms | 7829ms |
| @discoveryjs/json-ext v0.6.0 stringifyChunked() | 45ms | 63ms | 972ms | 5405ms | 11280ms |
| @discoveryjs/json-ext v0.5.7 stringifyStream() | 52ms | 89ms | 1084ms | 5820ms | 12551ms |
| json-stream-stringify | 58ms | 84ms | 1122ms | 5683ms | 12034ms |
| bfj | 399ms | 850ms | 32648ms | ERR_RUN_TOO_LONG | ERR_RUN_TOO_LONG |
<!--/stringify-chunked-table:cpu-->

### Max memory usage

<!--stringify-chunked-table:memory-->
| Solution | S (~2MB) | M (~13.7MB) | L (~100MB) | 500MB | 1GB |
| -------- | -------: | ----------: | ---------: | ----: | --: |
| JSON.stringify() | 4.26MB | 27.46MB | 210.13MB | 1GB | ERR_STRING_TOO_LONG |
| @discoveryjs/json-ext stringifyChunked() | 671kB | 9.74MB | 56.73MB | 249.85MB | 500.65MB |
| @discoveryjs/json-ext createStringifyWebStream() | 1.78MB | 12.09MB | 52.64MB | 262.89MB | 504.76MB |
| @discoveryjs/json-ext v0.6.0 stringifyChunked() | 6.88MB | 12.04MB | 73.69MB | 300.91MB | 596.83MB |
| @discoveryjs/json-ext v0.5.7 stringifyStream() | 7.75MB | 18.37MB | 64.11MB | 301.09MB | 592.95MB |
| json-stream-stringify | 7.93MB | 14.18MB | 8.17MB | 8.60MB | 14.89MB |
| bfj | 17.55MB | 17.91MB | 38.92MB | ERR_RUN_TOO_LONG | ERR_RUN_TOO_LONG |
<!--/stringify-chunked-table:memory-->

### Output for fixtures

<details>
<summary><pre>&gt; node benchmarks/stringify-chunked    # use benchmarks/fixture/small.json (~2MB)</pre></summary>
<!--stringify-chunked-output:0-->

```
Benchmark: stringifyChunked() (JSON.stringify() as a stream of chunks)
Node version: 22.5.1
Fixture: fixture/small.json 2.08MB

# JSON.stringify()
Result: 2077407
time: 10 ms
cpu: 7 ms
mem impact:  rss   +7.67MB | heapTotal         0 | heapUsed     +48kB | external       +56
       max:  rss  +11.58MB | heapTotal   +4.16MB | heapUsed   +4.26MB | external       +56

# @discoveryjs/json-ext stringifyChunked()
Result: 2077407
time: 20 ms
cpu: 37 ms
mem impact:  rss   +3.24MB | heapTotal         0 | heapUsed    +220kB | external       +56
       max:  rss   +3.18MB | heapTotal    +262kB | heapUsed    +671kB | external       +56

# @discoveryjs/json-ext createStringifyWebStream()
Result: 2077407
time: 31 ms
cpu: 46 ms
mem impact:  rss   +5.78MB | heapTotal   +8.91MB | heapUsed    +641kB | external    +160kB
       max:  rss   +5.69MB | heapTotal   +9.18MB | heapUsed   +1.62MB | external    +160kB

# @discoveryjs/json-ext v0.6.0 stringifyChunked()
Result: 2077407
time: 27 ms
cpu: 45 ms
mem impact:  rss   +5.31MB | heapTotal   +8.65MB | heapUsed    +223kB | external       +56
       max:  rss   +5.19MB | heapTotal   +8.65MB | heapUsed   +6.88MB | external       +56

# @discoveryjs/json-ext v0.5.7 stringifyStream()
Result: 2077471
time: 37 ms
cpu: 52 ms
mem impact:  rss  +10.91MB | heapTotal   +8.65MB | heapUsed    +275kB | external       +56
       max:  rss  +11.03MB | heapTotal   +8.95MB | heapUsed   +7.12MB | external    +635kB

# json-stream-stringify
Result: 2077407
time: 33 ms
cpu: 58 ms
mem impact:  rss   +6.96MB | heapTotal   +8.65MB | heapUsed    +352kB | external       +56
       max:  rss   +6.78MB | heapTotal   +8.91MB | heapUsed   +7.93MB | external       +56

# bfj
Result: 2077407
time: 554 ms
cpu: 399 ms
mem impact:  rss  +36.32MB | heapTotal  +26.74MB | heapUsed   +1.15MB | external      +3kB
       max:  rss  +36.32MB | heapTotal  +29.36MB | heapUsed  +17.54MB | external      +3kB
```
<!--/stringify-chunked-output:0-->
</details>

<details>
<summary><pre>&gt; node benchmarks/stringify-chunked 1  # use benchmarks/fixture/medium.json (~13.7MB)</pre></summary>
<!--stringify-chunked-output:1-->

```
Benchmark: stringifyChunked() (JSON.stringify() as a stream of chunks)
Node version: 22.5.1
Fixture: fixture/medium.json 13.69MB

# JSON.stringify()
Result: 13693862
time: 42 ms
cpu: 32 ms
mem impact:  rss  +57.31MB | heapTotal         0 | heapUsed     +50kB | external       +56
       max:  rss  +84.41MB | heapTotal  +27.39MB | heapUsed  +27.46MB | external       +56

# @discoveryjs/json-ext stringifyChunked()
Result: 13693862
time: 40 ms
cpu: 65 ms
mem impact:  rss  +10.67MB | heapTotal         0 | heapUsed     +97kB | external       +56
       max:  rss  +10.65MB | heapTotal         0 | heapUsed   +9.74MB | external       +56

# @discoveryjs/json-ext createStringifyWebStream()
Result: 13693862
time: 46 ms
cpu: 73 ms
mem impact:  rss  +12.34MB | heapTotal    +524kB | heapUsed    +553kB | external    +160kB
       max:  rss  +12.16MB | heapTotal    +786kB | heapUsed  +11.93MB | external    +160kB

# @discoveryjs/json-ext v0.6.0 stringifyChunked()
Result: 13693862
time: 40 ms
cpu: 63 ms
mem impact:  rss   +9.47MB | heapTotal         0 | heapUsed     +99kB | external       +56
       max:  rss   +9.37MB | heapTotal    +262kB | heapUsed  +12.04MB | external       +56

# @discoveryjs/json-ext v0.5.7 stringifyStream()
Result: 13693865
time: 70 ms
cpu: 89 ms
mem impact:  rss  +13.32MB | heapTotal    +262kB | heapUsed    +183kB | external       +56
       max:  rss  +13.14MB | heapTotal    +262kB | heapUsed  +15.16MB | external   +3.20MB

# json-stream-stringify
Result: 13693862
time: 50 ms
cpu: 84 ms
mem impact:  rss   +9.72MB | heapTotal    +524kB | heapUsed    +192kB | external       +56
       max:  rss   +9.63MB | heapTotal    +786kB | heapUsed  +14.18MB | external       +56

# bfj
Result: 13693862
time: 2172 ms
cpu: 850 ms
mem impact:  rss  +18.22MB | heapTotal   +1.84MB | heapUsed   +1.07MB | external      +3kB
       max:  rss  +18.12MB | heapTotal   +2.36MB | heapUsed  +17.90MB | external      +3kB
```
<!--/stringify-chunked-output:1-->
</details>


<details>
<summary><pre>&gt; node benchmarks/stringify-chunked 2  # use benchmarks/fixture/big.json (~100MB)</pre></summary>
<!--stringify-chunked-output:2-->

```
Benchmark: stringifyChunked() (JSON.stringify() as a stream of chunks)
Node version: 22.5.1
Fixture: fixture/big.json 99.95MB

# JSON.stringify()
Result: 99947225
time: 447 ms
cpu: 427 ms
mem impact:  rss +236.54MB | heapTotal         0 | heapUsed     +48kB | external       +56
       max:  rss +435.98MB | heapTotal +199.90MB | heapUsed +210.13MB | external       +56

# @discoveryjs/json-ext stringifyChunked()
Result: 99947225
time: 645 ms
cpu: 698 ms
mem impact:  rss  +57.05MB | heapTotal    +262kB | heapUsed    +106kB | external       +56
       max:  rss  +56.74MB | heapTotal  +47.45MB | heapUsed  +56.73MB | external       +56

# @discoveryjs/json-ext createStringifyWebStream()
Result: 99947225
time: 648 ms
cpu: 723 ms
mem impact:  rss  +57.52MB | heapTotal    +524kB | heapUsed    +581kB | external    +160kB
       max:  rss  +57.18MB | heapTotal  +48.76MB | heapUsed  +52.48MB | external    +160kB

# @discoveryjs/json-ext v0.6.0 stringifyChunked()
Result: 99947225
time: 933 ms
cpu: 972 ms
mem impact:  rss  +66.98MB | heapTotal    +262kB | heapUsed    +108kB | external       +56
       max:  rss  +66.73MB | heapTotal  +58.46MB | heapUsed  +73.69MB | external       +56

# @discoveryjs/json-ext v0.5.7 stringifyStream()
Result: 99947225
time: 1050 ms
cpu: 1084 ms
mem impact:  rss  +65.36MB | heapTotal         0 | heapUsed    +159kB | external       +56
       max:  rss  +64.82MB | heapTotal  +57.93MB | heapUsed  +63.79MB | external    +326kB

# json-stream-stringify
Result: 99947225
time: 1092 ms
cpu: 1122 ms
mem impact:  rss   +8.80MB | heapTotal    +262kB | heapUsed    +152kB | external       +56
       max:  rss   +8.49MB | heapTotal    +262kB | heapUsed   +8.17MB | external       +56
```
<!--/stringify-chunked-output:2-->
</details>

<details>
<summary><pre>&gt; node benchmarks/stringify-chunked 3  # use benchmarks/fixture/500mb.json</pre></summary>
<!--stringify-chunked-output:3-->

```
Benchmark: stringifyChunked() (JSON.stringify() as a stream of chunks)
Node version: 22.5.1
Fixture: fixture/500mb.json 500MB

# JSON.stringify()
Result: 500000000
time: 2957 ms
cpu: 1995 ms
mem impact:  rss  -34.59MB | heapTotal         0 | heapUsed     +47kB | external       +56
       max:  rss +957.30MB | heapTotal   +1.00GB | heapUsed   +1.00GB | external       +56

# @discoveryjs/json-ext stringifyChunked()
Result: 500000000
time: 3476 ms
cpu: 3595 ms
mem impact:  rss +251.46MB | heapTotal         0 | heapUsed    +104kB | external       +56
       max:  rss +250.58MB | heapTotal +245.10MB | heapUsed +249.85MB | external       +56

# @discoveryjs/json-ext createStringifyWebStream()
Result: 500000000
time: 3577 ms
cpu: 3678 ms
mem impact:  rss +255.30MB | heapTotal    +262kB | heapUsed    +577kB | external    +160kB
       max:  rss +254.64MB | heapTotal +246.68MB | heapUsed +262.73MB | external    +160kB

# @discoveryjs/json-ext v0.6.0 stringifyChunked()
Result: 500000000
time: 5530 ms
cpu: 5405 ms
mem impact:  rss +186.20MB | heapTotal         0 | heapUsed    +106kB | external       +56
       max:  rss +225.20MB | heapTotal +295.96MB | heapUsed +300.90MB | external       +56

# @discoveryjs/json-ext v0.5.7 stringifyStream()
Result: 500000000
time: 5842 ms
cpu: 5820 ms
mem impact:  rss +186.86MB | heapTotal    +262kB | heapUsed    +190kB | external       +56
       max:  rss  +44.40MB | heapTotal +293.86MB | heapUsed +300.65MB | external    +444kB

# json-stream-stringify
Result: 500000000
time: 5596 ms
cpu: 5683 ms
mem impact:  rss   +9.29MB | heapTotal    +262kB | heapUsed    +168kB | external       +56
       max:  rss   +9.11MB | heapTotal    +262kB | heapUsed   +8.60MB | external       +56
```
<!--/stringify-chunked-output:3-->
</details>

<details>
<summary><pre>&gt; node benchmarks/stringify-chunked 4  # use benchmarks/fixture/1gb.json</pre></summary>
<!--stringify-chunked-output:4-->

```
Benchmark: stringifyChunked() (JSON.stringify() as a stream of chunks)
Node version: 22.5.1
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
time: 7536 ms
cpu: 7690 ms
mem impact:  rss +502.27MB | heapTotal         0 | heapUsed    +104kB | external       +56
       max:  rss +501.27MB | heapTotal +495.45MB | heapUsed +500.65MB | external       +56

# @discoveryjs/json-ext createStringifyWebStream()
Result: 1000000000
time: 7689 ms
cpu: 7829 ms
mem impact:  rss +119.05MB | heapTotal    +524kB | heapUsed    +585kB | external    +160kB
       max:  rss  +81.26MB | heapTotal +497.03MB | heapUsed +504.60MB | external    +160kB

# @discoveryjs/json-ext v0.6.0 stringifyChunked()
Result: 1000000000
time: 11433 ms
cpu: 11280 ms
mem impact:  rss +301.89MB | heapTotal         0 | heapUsed    +106kB | external       +56
       max:  rss   +9.72MB | heapTotal +588.25MB | heapUsed +596.83MB | external       +56

# @discoveryjs/json-ext v0.5.7 stringifyStream()
Result: 1000000000
time: 12793 ms
cpu: 12551 ms
mem impact:  rss +374.57MB | heapTotal    -262kB | heapUsed    +193kB | external       +56
       max:  rss  +62.93MB | heapTotal +595.59MB | heapUsed +592.64MB | external    +313kB

# json-stream-stringify
Result: 1000000000
time: 11983 ms
cpu: 12034 ms
mem impact:  rss  -12.12MB | heapTotal    +262kB | heapUsed    +175kB | external       +56
       max:  rss         0 | heapTotal    +934kB | heapUsed  +14.89MB | external       +56
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

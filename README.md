# json-ext

[![NPM version](https://img.shields.io/npm/v/@discoveryjs/json-ext.svg)](https://www.npmjs.com/package/@discoveryjs/json-ext)
[![Build Status](https://github.com/discoveryjs/json-ext/actions/workflows/ci.yml/badge.svg)](https://github.com/discoveryjs/json-ext/actions/workflows/ci.yml)
[![Coverage Status](https://coveralls.io/repos/github/discoveryjs/json-ext/badge.svg?branch=master)](https://coveralls.io/github/discoveryjs/json-ext)
[![NPM Downloads](https://img.shields.io/npm/dm/@discoveryjs/json-ext.svg)](https://www.npmjs.com/package/@discoveryjs/json-ext)

A set of utilities that extend the use of JSON:

- [parseChunked()](#parsechunked) – functions like [`JSON.parse()`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/JSON/parse) but iterates over chunks, reconstructing the result object.
- [stringifyChunked()](#stringifychunked) – functions like [`JSON.stringify()`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/JSON/stringify), but returns a generator yielding strings instead of a single string.
- [stringifyInfo()](#stringifyinfo) – returns an object with the expected overall size of the stringify operation and any circular references.
- [parseFromWebStream()](#parsefromwebstream) – a helper function to consume chunks from a Web Stream.
- [createStringifyWebStream()](#createstringifywebstream) – a helper to create a Web Stream.

Features:

- Fast and memory-efficient
- Compatible with browsers, Node.js, Deno, Bun
- Supports Node.js and Web streams
- Dual package: ESM and CommonJS
- No dependencies
- Size: 9.4Kb (minified), 3.6Kb (min+gzip)

## Why?

- Prevents main thread freezing during large JSON parsing by distributing the process over time.
- Handles large JSON processing (e.g., V8 has a limitation for strings ~500MB, making JSON larger than 500MB unmanageable).
- Reduces memory pressure. `JSON.parse()` and `JSON.stringify()` require the entire JSON content before processing. `parseChunked()` and `stringifyChunked()` allow processing and sending data incrementally, avoiding large memory consumption at a single time point and reducing GC pressure.

## Install

```bash
npm install @discoveryjs/json-ext
```

## API

### parseChunked()

Functions like [`JSON.parse()`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/JSON/parse), iterating over chunks to reconstruct the result object, and returns a [Promise](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise).

> Note: `reviver` parameter is not supported yet.

```ts
function parseChunked(input: Iterable<Chunk> | AsyncIterable<Chunk>): Promise<any>;
function parseChunked(input: () => (Iterable<Chunk> | AsyncIterable<Chunk>)): Promise<any>;

type Chunk = string | Buffer | Uint8Array;
```

[Benchmark](https://github.com/discoveryjs/json-ext/tree/master/benchmarks#parse-chunked)

Usage:

```js
import { parseChunked } from '@discoveryjs/json-ext';

const data = await parseChunked(chunkEmitter);
```

Parameter `chunkEmitter` can be an iterable or async iterable that iterates over chunks, or a function returning such a value. A chunk can be a `string`, `Uint8Array`, or Node.js `Buffer`.

Examples:

- Generator:
    ```js
    parseChunked(function*() {
        yield '{ "hello":';
        yield Buffer.from(' "wor'); // Node.js only
        yield new TextEncoder().encode('ld" }'); // returns Uint8Array
    });
    ```
- Async generator:
    ```js
    parseChunked(async function*() {
        for await (const chunk of someAsyncSource) {
            yield chunk;
        }
    });
    ```
- Array:
    ```js
    parseChunked(['{ "hello":', ' "world"}'])
    ```
- Function returning iterable:
    ```js
    parseChunked(() => ['{ "hello":', ' "world"}'])
    ```
- Node.js [`Readable`](https://nodejs.org/dist/latest-v14.x/docs/api/stream.html#stream_readable_streams) stream:
    ```js
    import fs from 'node:fs';

    parseChunked(fs.createReadStream('path/to/file.json'))
    ```
- Web stream (e.g., using [fetch()](https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API)):
    > Note: Iterability for Web streams was added later in the Web platform, not all environments support it. Consider using `parseFromWebStream()` for broader compatibility.
    ```js
    const response = await fetch('https://example.com/data.json');
    const data = await parseChunked(response.body); // body is ReadableStream
    ```

### stringifyChunked()

Functions like [`JSON.stringify()`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/JSON/stringify), but returns a generator yielding strings instead of a single string.

> Note: Returns `"null"` when `JSON.stringify()` returns `undefined` (since a chunk cannot be `undefined`).

```ts
function stringifyChunked(value: any, replacer?: Replacer, space?: Space): Generator<string, void, unknown>;
function stringifyChunked(value: any, options: StringifyOptions): Generator<string, void, unknown>;

type Replacer =
    | ((this: any, key: string, value: any) => any)
    | (string | number)[]
    | null;
type Space = string | number | null;
type StringifyOptions = {
    replacer?: Replacer;
    space?: Space;
    highWaterMark?: number;
};
```

[Benchmark](https://github.com/discoveryjs/json-ext/tree/master/benchmarks#stream-stringifying)

Usage:

```js
import { stringifyChunked } from '@discoveryjs/json-ext';

const chunks = [...stringifyChunked(data)];
// or
for (const chunk of stringifyChunked(data)) {
    console.log(chunk);
}
```

Examples:

- Streaming into a file (Node.js):
    ```js
    import fs from 'node:fs';
    import { Readable } from 'node:stream';

    Readable.from(stringifyChunked(data))
        .pipe(fs.createWriteStream('path/to/file.json'));
    ```
- Wrapping into a `Promise` for piping into a writable Node.js stream:
    ```js
    import { Readable } from 'node:stream';

    new Promise((resolve, reject) => {
        Readable.from(stringifyChunked(data))
            .on('error', reject)
            .pipe(stream)
            .on('error', reject)
            .on('finish', resolve);
    });
    ```
- Write into a file synchronously:
    > Note: Slower than `JSON.stringify()` but uses much less heap space and has no limitation on string length
    ```js
    import fs from 'node:fs';

    const fd = fs.openSync('output.json', 'w');

    for (const chunk of stringifyChunked(data)) {
        fs.writeFileSync(fd, chunk);
    }

    fs.closeSync(fd);
    ```
- Using with fetch (JSON streaming):
    > Note: This feature has limited support in browsers, see [Streaming requests with the fetch API](https://developer.chrome.com/docs/capabilities/web-apis/fetch-streaming-requests)

    > Note: `ReadableStream.from()` has limited [support in browsers](https://developer.mozilla.org/en-US/docs/Web/API/ReadableStream/from_static), use [`createStringifyWebStream()`](#createstringifywebstream) instead.
    ```js
    fetch('http://example.com', {
        method: 'POST',
        duplex: 'half',
        body: ReadableStream.from(stringifyChunked(data))
    });
    ```
- Wrapping into `ReadableStream`:
    > Note: Use `ReadableStream.from()` or [`createStringifyWebStream()`](#createstringifywebstream) when no extra logic is needed
    ```js
    new ReadableStream({
        start() {
            this.generator = stringifyChunked(data);
        },
        pull(controller) {
            const { value, done } = this.generator.next();

            if (done) {
                controller.close();
            } else {
                controller.enqueue(value);
            }
        },
        cancel() {
            this.generator = null;
        }
    });
    ```

### stringifyInfo()

```ts
export function stringifyInfo(value: any, replacer?: Replacer, space?: Space): StringifyInfoResult;
export function stringifyInfo(value: any, options?: StringifyInfoOptions): StringifyInfoResult;

type StringifyInfoOptions = {
    replacer?: Replacer;
    space?: Space;
    continueOnCircular?: boolean;
}
type StringifyInfoResult = {
    minLength: number;
    circular: Object[]; // list of circular references
};
```

Functions like [`JSON.stringify()`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/JSON/stringify), but returns an object with the expected overall size of the stringify operation and a list of circular references.

Example:

```js
import { stringifyInfo } from '@discoveryjs/json-ext';

console.log(stringifyInfo({ test: true }));
// {
//   bytes: 13, // Buffer.byteLength('{"test":true}')
//   circular: []    
// }
```

#### Options

##### continueOnCircular

Type: `Boolean`  
Default: `false`

Determines whether to continue collecting info for a value when a circular reference is found. Setting this option to `true` allows finding all circular references.

### parseFromWebStream()

A helper function to consume JSON from a Web Stream. You can use `parseChunked(stream)` instead, but `@@asyncIterator` on `ReadableStream` has limited support in browsers (see [ReadableStream](https://developer.mozilla.org/en-US/docs/Web/API/ReadableStream) compatibility table).

```js
import { parseFromWebStream } from '@discoveryjs/json-ext';

const data = await parseFromWebStream(readableStream);
// equivalent to (when ReadableStream[@@asyncIterator] is supported):
// await parseChunked(readableStream);
```

### createStringifyWebStream()

A helper function to convert `stringifyChunked()` into a `ReadableStream` (Web Stream). You can use `ReadableStream.from()` instead, but this method has limited support in browsers (see [ReadableStream.from()](https://developer.mozilla.org/en-US/docs/Web/API/ReadableStream/from_static) compatibility table).

```js
import { createStringifyWebStream } from '@discoveryjs/json-ext';

createStringifyWebStream({ test: true });
// equivalent to (when ReadableStream.from() is supported):
// ReadableStream.from(stringifyChunked({ test: true }))
```

## License

MIT

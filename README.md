# json-ext

[![NPM version](https://img.shields.io/npm/v/@discoveryjs/json-ext.svg)](https://www.npmjs.com/package/@discoveryjs/json-ext)
[![Build Status](https://travis-ci.org/discoveryjs/json-ext.svg?branch=master)](https://travis-ci.org/discoveryjs/json-ext)
[![Coverage Status](https://coveralls.io/repos/github/discoveryjs/json-ext/badge.svg?branch=master)](https://coveralls.io/github/discoveryjs/json-ext?)

A set of utilities that extend the use of JSON. Designed to be fast and memory efficient

Features:

- [x] `stringifyInfo()` – Get estimated size and other facts of JSON.stringify() without converting a value to string
- [x] `stringifyStream()` – Stringify stream (Node.js)
- [ ] **TBD** Parse stream
- [ ] **TBD** Support for circular references
- [ ] **TBD** Binary representation

## Install

```bash
npm install @discoveryjs/json-ext
```

## API

- [stringifyStream(value[, replacer[, space]])](#stringifystreamvalue-replacer-space)
- [stringifyInfo(value[, replacer[, space[, options]]])](#stringifyinfovalue-replacer-space-options)
    - [Options](#options)
        - [async](#async)
        - [continueOnCircular](#continueoncircular)

### stringifyStream(value[, replacer[, space]])

Works the same as [`JSON.stringify()`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/JSON/stringify), but returns an instance of `ReadableStream` instead of string.

[Compare with other solutions](https://github.com/discoveryjs/json-ext/tree/master/benchmarks#stream-stringifying) (benchmark)

Departs from JSON.stringify():
- Outputs `null` when `JSON.stringify()` returns `undefined` (since streams may not emit `undefined`)
- A promise is resolving and the resulting value is stringifying as a regular one
- A stream in non-object mode is piping to output as is
- A stream in object mode is piping to output as an array of objects

### stringifyInfo(value[, replacer[, space[, options]]])

`value`, `replacer` and `space` arguments are the same as for `JSON.stringify()`.

Result is an object:

```js
{
    minLength: Number,  // mininmal bytes when values is stringified
    circular: [...],    // list of circular references
    duplicate: [...],   // list of objects that occur more than once
    async: [...]        // list of async values, i.e. promises and streams
}
```

#### Options

##### async

Type: `Boolean`  
Default: `false`

Collect async values (promises and streams) or not.

##### continueOnCircular

Type: `Boolean`  
Default: `false`

Stop collecting info for a value or not whenever circular reference is found. Setting option to `true` allows to find all circular references.

### version

The version of library, e.g. `"0.3.1"`.

## License

MIT

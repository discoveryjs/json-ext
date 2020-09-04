# json-ext

[![NPM version](https://img.shields.io/npm/v/json-ext.svg)](https://www.npmjs.com/package/json-ext)
[![Build Status](https://travis-ci.org/discoveryjs/json-ext.svg?branch=master)](https://travis-ci.org/discoveryjs/json-ext)
[![Coverage Status](https://coveralls.io/repos/github/discoveryjs/json-ext/badge.svg?branch=master)](https://coveralls.io/github/discoveryjs/json-ext?)

A set of utilities that extend the use of JSON.

Features:

- [x] Stringify stream: `stringifyStream()`
- [ ] **TBD** Parse stream
- [x] Value info: `info()`
- [ ] **TBD**Support for circular references
- [ ] **TBD** Binary representation

## Install

```bash
npm install json-ext
```

## API

### stringifyStream(value[, replacer[, space]])

Mostly works the same as `JSON.stringify()`, but returns instance of `ReadableStream` instead of string.

Extensions:
- Promises are rescursively resolve and the result value is stringify as any onther
- Streams in object mode are output as arrays
- Streams in non-object mode are output as is

### info(value[, replacer[, space[, options]]])

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

Options:

#### async

Type: `Boolean`  
Default: `false`

Collect async values (promises and streams) or not.

#### continueOnCircular

Type: `Boolean`  
Default: `false`

Stop walking through a value or not whenever circular reference is found. Setting option to `true` allows to find all circular references.

## License

MIT

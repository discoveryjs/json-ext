# json-ext

[![NPM version](https://img.shields.io/npm/v/json-ext.svg)](https://www.npmjs.com/package/json-ext)
[![Build Status](https://travis-ci.org/discoveryjs/json-ext.svg?branch=master)](https://travis-ci.org/discoveryjs/json-ext)
[![Coverage Status](https://coveralls.io/repos/github/discoveryjs/json-ext/badge.svg?branch=master)](https://coveralls.io/github/discoveryjs/json-ext?)

A set of utilities that extend the use of JSON.

Features:

- [x] Value info: `info()`
- [x] Stringify stream: `stringifyStream()`
- [ ] **TBD** Parse stream
- [ ] **TBD** Support for circular references
- [ ] **TBD** Binary representation

## Install

```bash
npm install json-ext
```

## API

### stringifyStream(value[, replacer[, space]])

Works the same as [`JSON.stringify()`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/JSON/stringify), but returns an instance of `ReadableStream` instead of string.

Extensions:
- Output `null` to the output when `JSON.stringify()` returns `undefined` (since streams may not to emit undefined)
- A promise is resolving and the result value is stringifying as a regular value
- A Stream in non-object mode is piping to output as is
- A Stream in object mode is piping to output as an array of objects

[Comparison with other solutions](https://github.com/discoveryjs/json-ext/tree/master/benchmarks#stream-stringifying) (benchmark)

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

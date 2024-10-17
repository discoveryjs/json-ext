## next

- Fixed `stringifyInfo()` to correctly accept the `space` parameter from options, i.e. `stringifyInfo(data, { space: 2 })`

## 0.6.1 (2024-08-06)

- Enhanced the performance of `stringifyChunked()` by 1.5-3x
- Enhanced the performance of `stringifyInfo()` by 1.5-5x
- Fixed `parseFromWebStream()` to ensure that the lock on the reader is properly released

## 0.6.0 (2024-07-02)

- Added `stringifyChunked()` as a generator function (as a replacer for `stringifyStream()`)
- Added `createStringifyWebStream()` function
- Added `parseFromWebStream()` function
- Changed `parseChunked()` to accept an iterable or async iterable that iterates over string, Buffer, or TypedArray elements
- Removed `stringifyStream()`, use `Readable.from(stringifyChunked())` instead
- Fixed conformance `stringifyChunked()` with `JSON.stringify()` when replacer a list of keys and a key refer to an entry in a prototype chain
- `stringifyInfo()`:
    - Aligned API with `stringifyChunked` by accepting `options` as the second parameter. Now supports:
        - `stringifyInfo(value, replacer?, space?)`
        - `stringifyInfo(value, options?)`
    - Renamed `minLength` field into `bytes` in functions result
    - Removed the `async` option
    - The function result no longer contains the `async` and `duplicate` fields
    - Fixed conformance with `JSON.stringify()` when replacer a list of keys and a key refer to an entry in a prototype chain
- Discontinued exposing the `version` attribute
- Converted to Dual Package, i.e. ESM and CommonJS support

## 0.5.7 (2022-03-09)

- Fixed adding entire `package.json` content to a bundle when target is a browser

## 0.5.6 (2021-11-30)

- Fixed `stringifyStream()` hang when last element in a stream takes a long time to process (#9, @kbrownlees)

## 0.5.5 (2021-09-14)

- Added missed TypeScript typings file into the npm package

## 0.5.4 (2021-09-14)

- Added TypeScript typings (#7, @lexich)

## 0.5.3 (2021-05-13)

- Fixed `stringifyStream()` and `stringifyInfo()` to work properly when replacer is an allowlist
- `parseChunked()`
    - Fixed wrong parse error when chunks are splitted on a whitespace inside an object or array (#6, @alexei-vedder)
    - Fixed corner cases when wrong placed or missed comma doesn't cause to parsing failure

## 0.5.2 (2020-12-26)

- Fixed `RangeError: Maximum call stack size exceeded` in `parseChunked()` on very long arrays (corner case)

## 0.5.1 (2020-12-18)

- Fixed `parseChunked()` crash when input has trailing whitespaces (#4, @smelukov)

## 0.5.0 (2020-12-05)

- Added support for Node.js 10

## 0.4.0 (2020-12-04)

- Added `parseChunked()` method
- Fixed `stringifyInfo()` to not throw when meet unknown value type

## 0.3.2 (2020-10-26)

- Added missed file for build purposes

## 0.3.1 (2020-10-26)

- Changed build setup to allow building by any bundler that supports `browser` property in `package.json`
- Exposed version

## 0.3.0 (2020-09-28)

- Renamed `info()` method into `stringifyInfo()`
- Fixed lib's distribution setup

## 0.2.0 (2020-09-28)

- Added `dist` version to package (`dist/json-ext.js` and `dist/json-ext.min.js`)

## 0.1.1 (2020-09-08)

- Fixed main entry point

## 0.1.0 (2020-09-08)

- Initial release

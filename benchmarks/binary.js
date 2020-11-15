const { encode, decode } = require('../src/binary');
const { gzipSync, brotliCompressSync } = require('zlib');
const filename = process.argv[2];
const mockData = {
    foo: 1,
    bar: [1,2,3],
    a: ['aaa', 'bbb', 'aaa', 'foo'],
    b: [{ foo: 'foo', bar: 'bar' }],
    baz: {foo: 2, a: 'asd', baz: true},
    qux: {foo: 3, a: 'asd', baz: false}
};
const stringToBuffer = s => new TextEncoder().encode(s);
const gzip = true;
const brotli = false;

// console.log(TYPE);
const times = {};
const time = (name, fn) => {
    console.log(name);
    const t = Date.now();
    const res = fn();
    times[name] = Date.now() - t;
    console.log(name, times[name]);
    return res;
};
const raw = filename
    ? require('fs').readFileSync(filename)
    : null;

const data = raw !== null
    ? time('jsonParse', () => JSON.parse(raw))
    : mockData;
const jsonStringified = time('jsonStringify', () => JSON.stringify(data));
const jsonStringifiedBuffer = stringToBuffer(jsonStringified);
if (!raw || jsonStringifiedBuffer.length !== raw.length) {
    time('jsonParse', () => JSON.parse(jsonStringified));
}
const stringifiedGzipSize = gzip ? time('jsonGzip', () => gzipSync(jsonStringified).length) : null;
const stringifiedBrotliSize = brotli ? time('jsonBrotli', () => brotliCompressSync(jsonStringified).length) : null;
const encodedData = time('binaryEncode', () => encode(data));
const encodedGzipSize = gzip ? time('binaryGzip', () => gzipSync(encodedData).length) : null;
const encodedBrotliSize = brotli ? time('binaryBrotli', () => brotliCompressSync(encodedData).length) : null;
const decodedData = time('binaryDecode', () => decode(encodedData));
const size = {
    raw: raw !== null ? raw.length : jsonStringifiedBuffer.length,
    stringified: jsonStringifiedBuffer.length,
    stringifiedGzip: stringifiedGzipSize,
    stringifiedBrotli: stringifiedBrotliSize,
    binaryEncoded: encodedData.length,
    binaryEncodedGzip: encodedGzipSize,
    binaryEncodedBrotli: encodedBrotliSize,
    binaryDecoded: stringToBuffer(JSON.stringify(decodedData)).length
};

console.log(`===[${filename || 'raw'}]===`);
console.log({ times, size });
// console.log(encodedData);
// console.log(decodedData);
// console.log(decode(encodedData));
// require('fs').writeFileSync('./t.bjson', encodedData);
// require('fs').writeFileSync('./t.json', jsonStringify);

// data.repos = data.repos.slice(0, 2);
// require('fs').writeFileSync('./registy-test.json', JSON.stringify(data, null, 1).slice(0, 1000000));
// decodedData.repos = decodedData.repos.slice(0, 2);
// require('fs').writeFileSync('./registy-test-encode-decode.json', JSON.stringify(decodedData, null, 1).slice(0, 1000000));

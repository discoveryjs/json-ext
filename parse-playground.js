const parseStream = require('./src/parse-stream');
const filename = [
    './benchmarks/fixture/small.json',
    './benchmarks/fixture/medium.json',
    './benchmarks/fixture/big.json'
][1];
const chunkSize = .5 * 1024 * 1024; // chunk size for generator

(async () => {
    // stream
    const stream = require('fs').createReadStream(filename);
    console.time('parse stream');
    const resultStream = await parseStream(stream);
    console.timeEnd('parse stream');

    // generator
    console.time('parse gen');
    const data = require('fs').readFileSync(filename, 'utf8');
    console.time('parse gen (no fs)');
    const resultGen = await parseStream(function*() {
        for (let i = 0; i < data.length; i += chunkSize) {
            yield data.slice(i, i + chunkSize);
        }
    });
    console.timeEnd('parse gen');
    console.timeEnd('parse gen (no fs)');

    // native
    console.time('parse native');
    const result = JSON.parse(data);
    console.timeEnd('parse native');

    // check
    require('assert').deepStrictEqual(result, resultStream);
    require('assert').deepStrictEqual(result, resultGen);
})();

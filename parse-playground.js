const fs = require('fs');
const parseChunked = require('./src/parse-chunked');
const { benchmark, prettySize } = require('./benchmarks/benchmark-utils');
const filename = [
    './benchmarks/fixture/small.json',
    './benchmarks/fixture/medium.json',
    './benchmarks/fixture/big.json'
][process.argv[2] || 1];
const chunkSize = .5 * 1024 * 1024; // chunk size for generator
(async () => {
    console.log(filename, prettySize(fs.statSync(filename).size));
    console.log();

    // stream
    const { result: resultStream } = await benchmark('parse stream', () =>
        parseChunked(fs.createReadStream(filename, { highWaterMark: chunkSize }))
    );

    // generator
    const { result: resultGen } = await benchmark('parse generator', () => {
        return parseChunked(function*() {
            let json = fs.readFileSync(filename, 'utf8');
            for (let i = 0; i < json.length; i += chunkSize) {
                yield json.slice(i, i + chunkSize);
            }
        });
    });

    // native
    const { result } = await benchmark('JSON.parse()', () => {
        const json = fs.readFileSync(filename, 'utf8');
        return JSON.parse(json);
    });

    // check
    require('assert').deepStrictEqual(result, resultStream);
    require('assert').deepStrictEqual(result, resultGen);
})();

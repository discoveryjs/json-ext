const fs = require('fs');
const parseChunked = require('../src/parse-chunked');
const { runBenchmark, prettySize } = require('./benchmark-utils');
const filename = require('path').join(__dirname, [
    './fixture/small.json',
    './fixture/medium.json',
    './fixture/big.json'
][process.argv[2] || 1]);
const chunkSize = 512 * 1024; // chunk size for generator

const tests = module.exports = {
    'parse stream': () =>
        parseChunked(fs.createReadStream(filename, { highWaterMark: chunkSize })),

    'parse generator': () =>
        parseChunked(function*() {
            let json = fs.readFileSync(filename, 'utf8');
            for (let i = 0; i < json.length; i += chunkSize) {
                yield json.slice(i, i + chunkSize);
            }
        }),

    'JSON.parse()': () =>
        JSON.parse(fs.readFileSync(filename, 'utf8'))
};

if (require.main === module) {
    (async () => {
        console.log();
        console.log(
            require('path').relative(__dirname, filename),
            prettySize(fs.statSync(filename).size),
            'chunk size',
            prettySize(chunkSize)
        );
        console.log();

        for (const name of Object.keys(tests)) {
            await runBenchmark(name, process.argv.slice(2));
            await new Promise(resolve => setTimeout(resolve, 100));
        }
    })();
}

const fs = require('fs');
const path = require('path');
const chalk = require('chalk');
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
        console.log('Benchmark:', chalk.green('parseChunked()'), '(parse chunked JSON)');
        console.log('Node version:', chalk.green(process.versions.node));
        console.log('Fixture:',
            chalk.green(path.relative(process.cwd(), filename)),
            chalk.yellow(prettySize(fs.statSync(filename).size)),
            '/ chunk size',
            chalk.yellow(prettySize(chunkSize))
        );
        console.log();

        const results = [];
        for (const name of Object.keys(tests)) {
            results.push(await runBenchmark(name));
        }
    })();
}

const fs = require('fs');
const path = require('path');
const chalk = require('chalk');
const parseChunked = require('../src/parse-chunked');
const { runBenchmark, prettySize } = require('./benchmark-utils');
const fixtures = [
    './fixture/small.json',
    './fixture/medium.json',
    './fixture/big.json',
    './fixture/500mb.json', // 3 | auto-generate from big.json
    './fixture/1gb.json'    // 4 | auto-generate from big.json
];
const fixtureIndex = process.argv[2] || 1;
const filename = fixtureIndex in fixtures ? path.join(__dirname, fixtures[fixtureIndex]) : false;

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

if (!filename) {
    console.error('Fixture is not selected!');
    console.error();
    console.error('Run script:', chalk.green(`node --expose-gc ${path.relative(process.cwd(), process.argv[1])} [fixture]`));
    console.error('where [fixture] is a number:');
    fixtures.forEach((fixture, idx) =>
        console.log(idx, fixture)
    );
    process.exit();
}

if (require.main === module) {
    (async () => {
        if (!fs.existsSync(filename)) {
            // auto-generate fixture
            let [, num, unit] = filename.match(/(\d+)([a-z]+).json/);
            const times = unit === 'mb' ? num / 100 : num * 10;

            await require('./gen-fixture')(times, filename);
        }

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

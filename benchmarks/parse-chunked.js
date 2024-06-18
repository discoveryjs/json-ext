import fs from 'node:fs';
import path from 'node:path';
import url from 'node:url';
import chalk from 'chalk';
import bfj from 'bfj';
import { parseChunked, parseFromWebStream } from '../src/index.js';
import { runBenchmark, prettySize, outputToReadme, updateReadmeTable, getSelfPackageJson, isMain } from './benchmark-utils.js';

const benchmarkName = 'parse-chunked';
const fixtures = [
    './fixture/small.json',
    './fixture/medium.json',
    './fixture/big.json',
    './fixture/500mb.json', // 3 | auto-generate from big.json
    './fixture/1gb.json'    // 4 | auto-generate from big.json
];
const selfPackageJson = getSelfPackageJson();
const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
const fixtureIndex = process.argv[2] || 0;
const filename = fixtureIndex in fixtures ? path.join(__dirname, fixtures[fixtureIndex]) : false;
const filesize = fs.statSync(filename).size;

if (!filename) {
    console.error('Fixture is not selected!');
    console.error();
    console.error('Run script:', chalk.green(`node ${path.relative(process.cwd(), process.argv[1])} [fixture]`));
    console.error();
    console.error(`where ${chalk.yellow('[fixture]')} is a number:`);
    fixtures.forEach((fixture, idx) =>
        console.log(idx, fixture)
    );
    process.exit();
}

const chunkSize = 512 * 1024; // chunk size for generator
export const tests = {
    'JSON.parse()': () =>
        JSON.parse(fs.readFileSync(filename, 'utf8')),

    [selfPackageJson.name + ' parseChunked(fs.createReadStream())']: () =>
        parseChunked(fs.createReadStream(filename, { highWaterMark: chunkSize })),

    [selfPackageJson.name + ' parseChunked(fs.readFileSync())']: () =>
        parseChunked(function*() {
            let json = fs.readFileSync(filename);
            for (let i = 0; i < json.length; i += chunkSize) {
                yield json.subarray(i, i + chunkSize);
            }
        }),

    [selfPackageJson.name + ' parseFromWebStream()']: () =>
        parseFromWebStream(ReadableStream.from(fs.createReadStream(filename, { highWaterMark: chunkSize }))),

    'bfj': () => sizeLessThan(500 * 1024 * 1024) &&
        bfj.parse(fs.createReadStream(filename))
};

if (isMain(import.meta)) {
    run();
}

function sizeLessThan(limit) {
    if (filesize < limit) {
        return true;
    }

    const error = new Error('Run takes too long time');
    error.code = 'ERR_RUN_TOO_LONG';
    throw error;
}

//
// Run benchmarks
//
async function run() {
    if (!fs.existsSync(filename)) {
        // auto-generate fixture
        let [, num, unit] = filename.match(/(\d+)([a-z]+).json/);
        const times = unit === 'mb' ? Math.round(num / 100) : num * 10;

        const { genFixture } = await import('./gen-fixture.js');
        await genFixture(times, filename);
    }

    if (process.env.README) {
        outputToReadme(benchmarkName, fixtureIndex);
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
        results.push(await runBenchmark(name) || { name, error: true, code: 'CRASH' });
    }

    if (process.env.README) {
        updateReadmeTable(benchmarkName, fixtureIndex, fixtures, results);
    }
}

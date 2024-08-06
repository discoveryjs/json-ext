import fs from 'node:fs';
import path from 'node:path';
import url from 'node:url';
import chalk from 'chalk';
import bfj from 'bfj';
import { JsonStreamStringify } from 'json-stream-stringify';
import * as jsonExt057 from 'json-ext-0.5.7';
import * as jsonExt060 from 'json-ext-0.6.0';
import * as jsonExt from '../src/index.js';
import {
    runBenchmark,
    prettySize,
    outputToReadme,
    updateReadmeTable,
    getSelfPackageJson,
    isMain
} from './benchmark-utils.js';

const selfPackageJson = getSelfPackageJson();
const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
const benchmarkName = 'stringify-chunked';
// const outputPath = name => __dirname + '/tmp/stringify-chunked-' + name.replace(/[@\/]/g, '-').replace(/\s*\(.+$/, '') + '.json';
const fixtures = [
    'fixture/small.json',   // ~2,1MB
    'fixture/medium.json',  // ~13,7MB
    'fixture/big.json',     // ~100Mb
    './fixture/500mb.json', // 3 | auto-generate from big.json
    './fixture/1gb.json'    // 4 | auto-generate from big.json
];
const fixtureIndex = process.argv[2] || 0;
const filename = fixtureIndex in fixtures ? path.join(__dirname, fixtures[fixtureIndex]) : false;
let filesize = fs.existsSync(filename) ? fs.statSync(filename).size : 0;

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

function sizeLessThan(limit) {
    if (filesize < limit) {
        return true;
    }

    const error = new Error('Run takes too long time');
    error.code = 'ERR_RUN_TOO_LONG';
    throw error;
}

export const tests = {
    'JSON.stringify()': data =>
        [JSON.stringify(data)],

    [selfPackageJson.name + ' stringifyChunked()']: data =>
        jsonExt.stringifyChunked(data),

    [selfPackageJson.name + ' createStringifyWebStream()']: data =>
        jsonExt.createStringifyWebStream(data),

    [selfPackageJson.name + ' v0.6.0 stringifyChunked()']: data =>
        jsonExt060.stringifyChunked(data),

    [selfPackageJson.name + ' v0.5.7 stringifyStream()']: data =>
        jsonExt057.default.stringifyStream(data),

    'json-stream-stringify': data =>
        new JsonStreamStringify(data),

    // 'bfj': data => sizeLessThan(100 * 1024 * 1024) &&
    //     bfj.streamify(data)
};

Object.defineProperty(tests, '__getData', {
    value: () => jsonExt.parseChunked(fs.createReadStream(filename))
});

for (const [name, init] of Object.entries(tests)) {
    tests[name] = async (data) => {
        let len = 0;
        for await (const chunk of init(data)) {
            len += Buffer.byteLength(chunk);
        }
        console.log('Result:', len);
    };
}

if (isMain(import.meta)) {
    run();
}

//
// Run benchmarks
//
async function run() {
    if (!fs.existsSync(filename)) {
        // auto-generate fixture
        let [, num, unit] = filename.match(/(\d+)([a-z]+).json/);
        const times = unit === 'mb' ? num / 100 : num * 10;
        const { genFixture } = await import('./gen-fixture.js');

        filesize = await genFixture(times, filename);
    }

    if (process.env.README) {
        outputToReadme(benchmarkName, fixtureIndex);
    }

    console.log('Benchmark:', chalk.green('stringifyChunked()'), '(JSON.stringify() as a stream of chunks)');
    console.log('Node version:', chalk.green(process.versions.node));
    console.log(
        'Fixture:',
        chalk.green(path.relative(process.cwd(), filename)),
        chalk.yellow(prettySize(filesize))
    );
    console.log('');

    const results = [];
    for (const name of Object.keys(tests)) {
        results.push(await runBenchmark(name) || { name, error: true, code: 'CRASH' });
    }

    if (process.env.README) {
        updateReadmeTable(benchmarkName, fixtureIndex, fixtures, results);
    }
}

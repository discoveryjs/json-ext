import fs from 'node:fs';
import path from 'node:path';
import url from 'node:url';
import { Readable } from 'node:stream';
import chalk from 'chalk';
import bfj from 'bfj';
import JsonStreamStringify from 'json-stream-stringify';
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
const benchmarkName = 'stringify-stream';
const outputPath = name => __dirname + '/tmp/stringify-stream-' + name.replace(/[@\/]/g, '-').replace(/\s*\(.+$/, '') + '.json';
const fixtures = [
    'fixture/small.json',   // ~2,1MB
    'fixture/medium.json',  // ~13,7MB
    'fixture/big.json',     // ~100Mb
    './fixture/500mb.json', // 3 | auto-generate from big.json
    './fixture/1gb.json'    // 4 | auto-generate from big.json
];
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

function sizeLessThan(limit) {
    if (filesize < limit) {
        return true;
    }

    const error = new Error('Run takes too long time');
    error.code = 'ERR_RUN_TOO_LONG';
    throw error;
}

class ChunkedStringStream extends Readable {
    constructor(str) {
        let offset = 0;

        super({
            read(size) {
                size = 512 * 1024;
                if (offset < str.length) {
                    this.push(str.substr(offset, size));
                    offset += size;
                    return;
                }

                this.push(null);
            }
        });
    }
}

export const tests = {
    'JSON.stringify()': data =>
        new ChunkedStringStream(JSON.stringify(data)),

    [selfPackageJson.name + '/stringifyChunked']: data =>
        Readable.from(jsonExt.stringifyChunked(data)),

    [selfPackageJson.name + '/createStringifyWebStream']: data =>
        Readable.from(jsonExt.createStringifyWebStream(data)),

    'bfj': data => sizeLessThan(500 * 1024 * 1024) &&
        bfj.streamify(data),

    'json-stream-stringify': data => sizeLessThan(100 * 1024 * 1024) &&
        new JsonStreamStringify(data)
};

Object.defineProperty(tests, '__getData', {
    value: () => jsonExt.parseChunked(fs.createReadStream(filename))
});

for (const [name, init] of Object.entries(tests)) {
    tests[name] = (data) => new Promise((resolve, reject) => {
        init(data)
            .on('error', reject)
            .pipe(fs.createWriteStream(outputPath(name)))
            .on('close', resolve)
            .on('error', reject);
    });
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

        await require('./gen-fixture.js')(times, filename);
    }

    if (process.env.README) {
        outputToReadme(benchmarkName, fixtureIndex);
    }

    console.log('Benchmark:', chalk.green('stringifyStream()'), '(JSON.stringify() as a stream)');
    console.log('Node version:', chalk.green(process.versions.node));
    console.log(
        'Fixture:',
        chalk.green(path.relative(process.cwd(), filename)),
        chalk.yellow(prettySize(filesize))
    );
    console.log('');

    const results = [];
    for (const name of Object.keys(tests)) {
        results.push(await runBenchmark(name));
    }

    if (process.env.README) {
        updateReadmeTable(benchmarkName, fixtureIndex, fixtures, results);
    }
}

const fs = require('fs');
const { Readable } = require('stream');
const chalk = require('chalk');
const bfj = require('bfj');
const JsonStreamStringify = require('json-stream-stringify');
const jsonExt = require('../src');
const outputPath = name => __dirname + '/tmp/stringify-stream-' + name.replace(/\s*\(.+$/, '') + '.json';
// const inputString = fs.readFileSync('../../fe-reports/.discoveryjs.repos.cache'); // 2,1MB
// const inputString = fs.readFileSync('../../fe-reports/.discoveryjs.ownership.cache'); // 13,7MB
const inputString = fs.readFileSync('../../fe-reports/.discoveryjs.gitlab-pipeline.cache'); // 105MB
const inputData = JSON.parse(inputString);

function prettySize(size, signed, pad) {
    const unit = ['', 'kB', 'MB', 'GB'];

    while (Math.abs(size) > 1000) {
        size /= 1000;
        unit.shift();
    }

    return (
        (signed && size > 0 ? '+' : '') +
        size.toFixed(unit.length > 2 ? 0 : 2) +
        unit[0]
    ).padStart(pad || 0);
}

function memDelta(oldValues) {
    const newValues = process.memoryUsage();
    const delta = {};

    for (const [k, v] of Object.entries(newValues)) {
        delta[k] = v - (oldValues ? oldValues[k] : 0);
    }

    return {
        old: oldValues || null,
        new: newValues,
        delta,
        toString() {
            const res = [];

            for (const [k, v] of Object.entries(delta)) {
                // if (v === 0) {
                //     continue;
                // }

                res.push(`${k} ${(v < 0 ? chalk.red : chalk.green)(prettySize(v, true, 9))}`);
            }

            return res.join(' | ') || 'No changes';
        }
    };
}

class StringStream extends Readable {
    constructor(str) {
        super();
        this.str = str;
    }
    _read(numRead) {
        this.push(this.str.slice(0, numRead) || null);
        this.str = this.str.slice(numRead);
    }
}

const tests = {
    'native (JSON.stringify() -> readable stream)': data => new StringStream(JSON.stringify(data)),
    'json-ext': data => jsonExt.stringifyStream(data),
    'bfj': data => bfj.streamify(data),
    'json-stream-stringify': data => new JsonStreamStringify(data)
};

async function timeout(ms) {
    await new Promise(resolve => setTimeout(resolve, ms));
}

async function run(data, size) {
    console.log('Test:', chalk.cyan('JSON stringify as a stream'));
    console.log('JSON size:', chalk.yellow(prettySize(size || JSON.stringify(data).length)));
    console.log('');

    await timeout(100);

    for (const [name, init] of Object.entries(tests)) {
        global.gc();

        const startMem = process.memoryUsage();
        const startTime = Date.now();
        let stream = init(data);

        try {
            console.log(name);
            await new Promise((resolve, reject) => {
                stream.pipe(fs.createWriteStream(outputPath(name)))
                    .on('close', resolve)
                    .on('error', reject);
            });
        } catch (e) {
            console.error(e);
        } finally {
            console.log('time:', Date.now() - startTime);
            console.log('memory before GC:', String(memDelta(startMem)));

            stream._buffer = null;
            stream = null;
            global.gc();

            console.log('memory after GC: ', String(memDelta(startMem)));
            console.log();

            await timeout(100);
        }
    }
}

if (typeof global.gc !== 'function') {
    console.error('Run node with --expose-gc flag');
    process.exit();
}

run(inputData, inputString.length);

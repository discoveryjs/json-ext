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

function memDelta(_base) {
    const current = process.memoryUsage();
    const delta = {};
    const base = { ..._base };

    for (const [k, v] of Object.entries(current)) {
        base[k] = base[k] || 0;
        delta[k] = v - base[k];
    }

    return {
        base,
        current,
        delta,
        toString() {
            const res = [];

            for (const [k, v] of Object.entries(delta)) {
                const rel = _base && k in _base;
                res.push(`${k} ${(rel && v > 0 ? chalk.yellow : chalk.green)(prettySize(v, rel, 9))}`);
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

function traceMem(resolutionMs) {
    const base = process.memoryUsage();
    const startTime = Date.now();
    const samples = [];
    const timer = setInterval(
        () => samples.push({
            time: Date.now() - startTime,
            mem: process.memoryUsage()
        }),
        isFinite(resolutionMs) && parseInt(resolutionMs) > 0 ? parseInt(resolutionMs) : 16
    );

    return {
        get current() {
            return memDelta(base);
        },
        series(abs) {
            const keys = Object.keys(base);
            const series = {};

            for (const key of keys) {
                series[key] = {
                    name: key,
                    data: new Array(samples.length)
                };
            }

            for (let i = 0; i < samples.length; i++) {
                const sample = samples[i];

                for (const key of keys) {
                    series[key].data[i] = abs
                        ? sample.mem[key] || 0
                        : sample.mem[key] ? sample.mem[key] - base[key] : 0;
                }
            }

            return {
                time: samples.map(s => s.time),
                series: Object.values(series)
            };
        },
        stop() {
            clearInterval(timer);
            return memDelta(base);
        }
    };
}

async function collectGarbage() {
    global.gc();

    // double sure
    await timeout(100);
    global.gc();
}

async function run(data, size) {
    console.log('Test:', chalk.cyan('JSON.stringify() as a stream'));
    console.log('JSON size:', chalk.yellow(prettySize(size || JSON.stringify(data).length)));
    console.log('');

    await timeout(100);

    for (const [name, init] of Object.entries(tests)) {
        await collectGarbage();

        const mem = traceMem(100);
        const startTime = Date.now();

        try {
            console.log(name);
            // console.log('memory state:    ', String(memDelta()));
            await new Promise((resolve, reject) => {
                init(data)
                    .on('error', reject)
                    .pipe(fs.createWriteStream(outputPath(name)))
                    .on('close', resolve)
                    .on('error', reject);
            });
        } catch (e) {
            console.error(e);
        } finally {
            const currentMem = mem.stop();

            console.log('time:', Date.now() - startTime, 'ms');
            console.log('memory before GC:', String(currentMem));

            await collectGarbage();

            console.log('memory after GC: ', String(memDelta(currentMem.base)));
            console.log();

            // fs.writeFileSync(outputPath('mem-' + name), JSON.stringify(mem.series()));
            await timeout(100);
        }
    }
}

if (typeof global.gc !== 'function') {
    console.error('Run node with --expose-gc flag');
    process.exit();
}

run(inputData, inputString.length);

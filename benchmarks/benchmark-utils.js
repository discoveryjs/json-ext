const fs = require('fs');
const { fork } = require('child_process');
const chalk = require('chalk');
const { Readable } = require('stream');
const ANSI_REGEXP = /([\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><])/g;

class StringStream extends Readable {
    constructor(str) {
        let pushed = null;
        super({
            read() {
                if (!pushed) {
                    pushed = setTimeout(() => {
                        this.push(str);
                        this.push(null);
                    }, 1);
                }
            }
        });
    }
}

function runBenchmark(name, argv = process.argv.slice(2)) {
    return new Promise((resolve, reject) => {
        fork(__dirname + '/run-test.js', [
            require.main.filename,
            name,
            ...argv
        ], {
            env: {
                ...process.env,
                FORCE_COLOR: chalk.supportsColor ? chalk.supportsColor.level : 0
            }
        })
            .on('message', resolve)
            .on('error', reject)
            .on('close', code => code ? reject(new Error('Exit code ' + code)) : resolve());
    });
}

async function benchmark(name, fn, output = true) {
    await collectGarbage();

    const mem = traceMem(10);
    const startCpu = process.cpuUsage();
    const startTime = Date.now();
    let result;

    try {
        if (output) {
            console.log('#', chalk.cyan(name));
        }
        // console.log('memory state:    ', String(memDelta()));
        result = await fn();
    } catch (e) {
        if (output) {
            console.error(e);
        }
    } finally {
        const time = Date.now() - startTime;
        const cpu = parseInt(process.cpuUsage(startCpu).user / 1000);
        const currentMem = mem.stop();
        const maxMem = memDelta(mem.base, mem.max);

        if (output) {
            console.log('time:', time, 'ms');
            console.log('cpu:', cpu, 'ms');
        }

        await collectGarbage();

        if (output) {
            console.log('mem impact: ', String(memDelta(currentMem.base)));
            console.log('       max: ', String(maxMem));
            console.log();
        }

        // release mem
        // eslint-disable-next-line no-unused-vars
        result = null;
        await collectGarbage();

        // fs.writeFileSync(outputPath('mem-' + name), JSON.stringify(mem.series()));

        return {
            name,
            time,
            cpu,
            rss: maxMem.delta.rss,
            heapTotal: maxMem.delta.heapTotal,
            heapUsed: maxMem.delta.heapUsed
        };
    }
}

function stripAnsi(str) {
    return str.replace(ANSI_REGEXP, '');
}

function prettySize(size, options) {
    const unit = ['', 'kB', 'MB', 'GB'];
    const { signed, pad, preserveZero } = options || {};

    while (Math.abs(size) > 1000) {
        size /= 1000;
        unit.shift();
    }

    return (
        (signed && size > 0 ? '+' : '') +
        size.toFixed(unit.length > 2 ? 0 : 2).replace(/\.0+/, preserveZero ? '$' : '') +
        unit[0]
    ).padStart(pad || 0);
}

function memDelta(_base, cur, skip = ['external', 'arrayBuffers']) {
    const current = cur || process.memoryUsage();
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
                if (skip.includes(k)) {
                    continue;
                }

                const rel = _base && k in _base;
                res.push(`${k} ${(rel && v > 0 ? chalk.yellow : chalk.green)(prettySize(v, { signed: rel, pad: 9, preserveZero: true }))}`);
            }

            return res.join(' | ') || 'No changes';
        }
    };
}

async function timeout(ms) {
    await new Promise(resolve => setTimeout(resolve, ms));
}

function traceMem(resolutionMs, sample = false) {
    const base = process.memoryUsage();
    const max = { ...base };
    const startTime = Date.now();
    const samples = [];
    const takeSample = () => {
        const mem = process.memoryUsage();

        if (sample) {
            samples.push({
                time: Date.now() - startTime,
                mem
            });
        }

        for (let key in base) {
            if (max[key] < mem[key]) {
                max[key] = mem[key];
            }
        }
    };
    const timer = setInterval(
        takeSample,
        isFinite(resolutionMs) && parseInt(resolutionMs) > 0 ? parseInt(resolutionMs) : 16
    );

    return {
        base,
        max,
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
            takeSample();
            return memDelta(base);
        }
    };
}

let exposeGcShowed = false;
async function collectGarbage() {
    if (typeof global.gc === 'function') {
        global.gc();

        // double sure
        await timeout(100);
        global.gc();
    } else if (!exposeGcShowed) {
        exposeGcShowed = true;
        console.warn(chalk.magenta('Looks like script is forcing GC to collect garbarge, but coresponding API is not enabled'));
        console.warn(chalk.magenta('Run node with --expose-gc flag to enable API and get precise measurements'));
    }
}


function captureStdout(callback) {
    const oldWrite = process.stdout.write;
    const cancelCapture = () => process.stdout.write = oldWrite;
    let buffer = [];

    process.stdout.write = (chunk, encondig, fd) => {
        oldWrite.call(process.stdout, chunk, encondig, fd);
        buffer.push(chunk);
    };

    process.on('exit', () => {
        cancelCapture();
        callback(buffer.join(''));
        buffer = null;
    });

    return cancelCapture;
}

function replaceInReadme(start, end, replace) {
    const content = fs.readFileSync('README.md', 'utf8');
    const mstart = content.match(start);

    if (!mstart) {
        throw new Error('No start offset found');
    }

    const startOffset = mstart.index + mstart[0].length;
    const endRegExp = new RegExp(end, (end.flags || '').replace('g', '') + 'g');
    endRegExp.lastIndex = startOffset;
    const mend = endRegExp.exec(content);

    if (!mend) {
        throw new Error('No end offset found');
    }

    const endOffset = mend.index;

    fs.writeFileSync('README.md',
        content.slice(0, startOffset) +
        (typeof replace === 'function' ? replace(content.slice(startOffset, endOffset)) : replace) +
        content.slice(endOffset), 'utf8');
}

function outputToReadme(start, end, fmt = output => output) {
    captureStdout(content => replaceInReadme(start, end, fmt(stripAnsi(content))));
}

module.exports = {
    StringStream,
    runBenchmark,
    benchmark,
    prettySize,
    memDelta,
    traceMem,
    collectGarbage,
    timeout,
    captureStdout,
    replaceInReadme,
    outputToReadme
};

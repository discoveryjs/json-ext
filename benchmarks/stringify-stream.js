const fs = require('fs');
const path = require('path');
const chalk = require('chalk');
const bfj = require('bfj');
const JsonStreamStringify = require('json-stream-stringify');
const jsonExt = require('../src');
const {
    StringStream,
    runBenchmark,
    prettySize,
    outputToReadme,
    replaceInReadme
} = require('./benchmark-utils');
const outputPath = name => __dirname + '/tmp/stringify-stream-' + name.replace(/[@\/]/g, '-').replace(/\s*\(.+$/, '') + '.json';
const fixtures = [
    'fixture/small.json',  // ~2,1MB
    'fixture/medium.json', // ~13,7MB
    'fixture/big.json'     // ~100Mb
];
const fixtureIndex = Number(process.argv[2]) in fixtures ? Number(process.argv[2]) : 0;
const inputPath = path.join(__dirname, fixtures[fixtureIndex]);
const inputString = fs.readFileSync(inputPath);
const inputData = JSON.parse(inputString);

const tests = module.exports = {
    'JSON.stringify()': data => new StringStream(JSON.stringify(data)),
    [require('../package.json').name]: data => jsonExt.stringifyStream(data),
    'bfj': data => bfj.streamify(data),
    'json-stream-stringify': data => new JsonStreamStringify(data)
};

for (const [name, init] of Object.entries(tests)) {
    tests[name] = () => new Promise((resolve, reject) => {
        init(inputData)
            .on('error', reject)
            .pipe(fs.createWriteStream(outputPath(name)))
            .on('close', resolve)
            .on('error', reject);
    });
}

async function run(data, size) {
    const results = [];

    console.log('Benchmark:', chalk.green('stringifyStream()'), '(JSON.stringify() as a stream)');
    console.log('Node version:', chalk.green(process.versions.node));
    console.log('Fixture:', chalk.green(path.relative(process.cwd(), inputPath)), chalk.yellow(prettySize(size || JSON.stringify(data).length)));
    console.log('');

    for (const name of Object.keys(tests)) {
        results.push(await runBenchmark(name));
    }

    return results;
}

if (typeof global.gc !== 'function') {
    console.error('Run node with --expose-gc flag');
    process.exit();
}

if (process.env.README) {
    outputToReadme(
        new RegExp(`<!--stringify-stream-output:${fixtureIndex}-->`),
        new RegExp(`<!--/stringify-stream-output:${fixtureIndex}-->`),
        output => '\n```\n' + output.trim() + '\n```\n'
    );
}

if (require.main !== module) {
    return;
}

run(inputData, inputString.length)
    .then(result => {
        if (!process.env.README) {
            return;
        }

        for (const type of ['time', 'cpu', 'memory']) {
            replaceInReadme(
                new RegExp(`<!--stringify-stream-table:${type}-->`),
                new RegExp(`<!--/stringify-stream-table:${type}-->`),
                content => {
                    const lines = content.trim().split(/\n/);
                    const current = Object.create(null);
                    const newValues = Object.fromEntries(result.map(item =>
                        [item.name, type === 'memory' ? prettySize(item.heapUsed + item.external) : item[type] + 'ms']
                    ));

                    for (const line of lines.slice(2)) {
                        const cells = line.trim().replace(/^\|\s*|\s*\|$/g, '').split(/\s*\|\s*/);
                        current[cells[0]] = cells.slice(1);
                    }

                    for (const [k, v] of Object.entries(newValues)) {
                        if (k in current === false) {
                            current[k] = [];
                        }
                        current[k][fixtureIndex] = v;
                    }

                    // normalize
                    for (const array of Object.values(current)) {
                        for (let i = 0; i < fixtures.length; i++) {
                            if (!array[i]) {
                                array[i] = '–';
                            }
                        }
                    }

                    return '\n' + [
                        ...lines.slice(0, 2),
                        ...Object.entries(current).map(([k, v]) => '| ' + [k, ...v].join(' | ') + ' |')
                    ].join('\n') + '\n';
                }
            );
        }
    });

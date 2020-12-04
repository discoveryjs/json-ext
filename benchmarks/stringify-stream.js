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
    updateReadmeTable
} = require('./benchmark-utils');

const benchmarkName = 'stringify-stream';
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
    if (process.env.README) {
        outputToReadme(benchmarkName, fixtureIndex);
    }

    const results = [];

    console.log('Benchmark:', chalk.green('stringifyStream()'), '(JSON.stringify() as a stream)');
    console.log('Node version:', chalk.green(process.versions.node));
    console.log(
        'Fixture:',
        chalk.green(path.relative(process.cwd(), inputPath)),
        chalk.yellow(prettySize(size || JSON.stringify(data).length))
    );
    console.log('');

    for (const name of Object.keys(tests)) {
        results.push(await runBenchmark(name));
    }

    if (process.env.README) {
        updateReadmeTable(benchmarkName, fixtureIndex, fixtures, results);
    }
}

if (require.main === module) {
    run(inputData, inputString.length);
}

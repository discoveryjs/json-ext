const bfj = require('bfj');
const JsonStreamStringify = require('json-stream-stringify');
const jsonExt = require('../src');

function stringify(init, data) {
    const chunks = [];
    let uncaughtExceptionFn;

    return new Promise((resolve, reject) => {
        process.on('uncaughtException', uncaughtExceptionFn = (e) => reject(e));
        init(data)
            .on('error', reject)
            .on('data', chunk => chunks.push(chunk))
            .on('end', () => resolve(chunks.join('')));
    })
        .finally(() => process.off('uncaughtException', uncaughtExceptionFn));
}

const { tests } = require('../test/fixture/stringify-cases');
const streamFactories = {
    [require('../package.json').name]: data => jsonExt.stringifyStream(data),
    'bfj': data => bfj.streamify(data),
    'json-stream-stringify': data => new JsonStreamStringify(data)
};

async function run() {
    for (const [name, createStream] of Object.entries(streamFactories)) {
        let success = 0;

        for (const value of tests) {
            try {
                const expected = JSON.stringify(value);
                const actual = await stringify(createStream, value);

                if (actual === expected) {
                    success++;
                } else {
                    // console.error(name, 'ERROR', value, actual, expected);
                }
            } catch (e) {
                // console.error(name, 'FAILED', value);
            }
        }

        console.log(name, `${success}/${tests.length}`);
    }
}

run();

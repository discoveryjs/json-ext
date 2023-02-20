const jsonExtStage0 = require('./binary/snapshot0');
const jsonExtStage1 = require('./binary/snapshot1');
const jsonExtStage2 = require('./binary/snapshot2'); // object key columns, opt arrays
const jsonExtStage3 = require('./binary/snapshot3'); // change type set, use uint24 for vlq, opt object entries encoding
const jsonExtStage4 = require('./binary/snapshot4'); // prev string
const jsonExtStage5 = require('./binary/snapshot5'); //
const jsonExtStage6 = require('./binary/snapshot6'); //
let jsonExtStage7; // new string encondig approach (in the beginning), initial work improved on num encoding
let jsonExtCurrent;
const v8 = require('v8');
const cbor = require('cbor');
const cborX = require('cbor-x');
const bson = require('bson');
const msgpackr = require('msgpackr');
const msgpackLite = require('msgpack-lite');
const msgpack5 = require('msgpack5')();
const { gzipSync, gunzipSync, brotliCompressSync } = require('zlib');

// FIXTURE
const filename = process.argv[2];
const validateDecodedResult = process.argv.includes('--validate');
const raw = filename
    ? require('fs').readFileSync(filename)
    : null;
const fixture = raw !== null ? JSON.parse(raw) : {
    // mock data
    foo: 1,
    bar: [1, 2, 3, 2342],
    a: ['aaa', 'bbb', 'aaa', 'foo'],
    b: [{ foo: 'foo', bar: 'bar' }],
    baz: {foo: 2, a: 'asd', baz: true},
    qux: {foo: 3, a: 'asd', baz: false}
};

// BENCHMARK solutions & features
const features = new Set([
    // 'brotli',
    'gzip'
]);
const solutions = {
    'Standard JSON': {
        encode: {
            name: 'strigify()',
            fn: data => JSON.stringify(data)
        },
        decode: {
            name: 'parse()',
            fn: encoded => JSON.parse(encoded)
        }
    },
    'Node.js v8': {
        encode: {
            name: 'serialize()',
            fn: data => v8.serialize(data)
        },
        decode: {
            name: 'deserialize()',
            fn: encoded => v8.deserialize(encoded)
        }
    },
    'cbor': {
        encode: {
            name: 'encode()',
            fn(data) {
                // return cbor.encode(data);
                return new Promise((resolve) => {
                    const buf = [];
                    const enc = new cbor.Encoder();
                    enc.on('data', chunk => buf.push(chunk));
                    enc.on('error', console.error);
                    enc.on('finish', () => resolve(Buffer.concat(buf)));

                    enc.end(data);
                });
            }
        },
        decode: {
            name: 'decode()',
            fn: encoded => cbor.decode(encoded)
        }
    },
    'cbor-x': {
        encode: {
            name: 'encode()',
            fn: data => cborX.encode(data)
        },
        decode: {
            name: 'decode()',
            fn: encoded => cborX.decode(encoded)
        }
    },
    'msgpack-lite': {
        encode: {
            name: 'encode()',
            fn: data => msgpackLite.encode(data)
        },
        decode: {
            name: 'decode()',
            fn: encoded => msgpackLite.decode(encoded)
        }
    },
    'msgpackr': {
        encode: {
            name: 'pack()',
            fn: data => msgpackr.pack(data)
        },
        decode: {
            name: 'unpack()',
            fn: encoded => msgpackr.unpack(encoded)
        }
    },
    'msgpack5': {
        encode: {
            name: 'encode()',
            fn: data => msgpack5.encode(data)
        },
        decode: {
            name: 'decode()',
            fn: encoded => msgpack5.decode(encoded)
        }
    },
    'bson': {
        encode: {
            name: 'serialize()',
            fn: data => bson.serialize(data)
        },
        decode: {
            name: 'deserialize()',
            fn: encoded => bson.deserialize(encoded)
        }
    },
    'json-ext (initial)': {
        encode: {
            name: 'encode()',
            fn: data => jsonExtStage0.encode(data)
        },
        decode: {
            name: 'decode()',
            fn: encoded => jsonExtStage0.decode(encoded)
        }
    },
    'json-ext (snapshot 2023-01-13)': {
        encode: {
            name: 'encode()',
            fn: data => jsonExtStage1.encode(data)
        },
        decode: {
            name: 'decode()',
            fn: encoded => jsonExtStage1.decode(encoded)
        }
    },
    'json-ext (snapshot 2023-01-18)': {
        encode: {
            name: 'encode()',
            fn: data => jsonExtStage2.encode(data)
        },
        decode: {
            name: 'decode()',
            fn: encoded => jsonExtStage2.decode(encoded)
        }
    },
    'json-ext (snapshot 2023-01-21)': {
        encode: {
            name: 'encode()',
            fn: data => jsonExtStage3.encode(data)
        },
        decode: {
            name: 'decode()',
            fn: encoded => jsonExtStage3.decode(encoded)
        }
    },
    'json-ext (snapshot 2023-01-22)': {
        encode: {
            name: 'encode()',
            fn: data => jsonExtStage4.encode(data)
        },
        decode: {
            name: 'decode()',
            fn: encoded => jsonExtStage4.decode(encoded)
        }
    },
    'json-ext (snapshot 2023-01-27)': {
        encode: {
            name: 'encode()',
            fn: data => jsonExtStage5.encode(data)
        },
        decode: {
            name: 'decode()',
            fn: encoded => jsonExtStage5.decode(encoded)
        }
    },
    'json-ext (snapshot 2023-02-08)': {
        encode: {
            name: 'encode()',
            fn: data => jsonExtStage6.encode(data)
        },
        decode: {
            name: 'decode()',
            fn: encoded => jsonExtStage6.decode(encoded)
        }
    },
    'json-ext (snapshot 2023-02-20)': {
        encode: {
            name: 'encode()',
            fn: data => jsonExtStage7.encode(data)
        },
        decode: {
            name: 'decode()',
            fn: encoded => jsonExtStage7.decode(encoded)
        }
    },
    'json-ext (current)': {
        encode: {
            name: 'encode()',
            fn: data => jsonExtCurrent.encode(data)
        },
        decode: {
            name: 'decode()',
            fn: encoded => jsonExtCurrent.decode(encoded)
        }
    }
};

async function runSolution(name, data) {
    const solution = solutions[name];
    const { encode, decode } = solution;
    const times = {};
    const time = async (tname, fn) => {
        const startTime = Date.now();
        const res = await fn();
        const elapsedTime = Date.now() - startTime;
        const size = typeof res === 'string' ? Buffer.byteLength(res) : res.estSize || res.byteLength;

        times[tname] = elapsedTime;
        console.log(' ', solution[tname]?.name || tname, elapsedTime,
            ...typeof size === 'number' ? [`(size: ${String(size).replace(/\.\d+(eE[-+]?\d+)?|\B(?=(\d{3})+(\D|$))/g, m => m || '_')})`] : []);

        return res;
    };

    let encoded;

    try {
        encoded = await time('encode', () => {
            return encode.fn(data);
        });
    } catch (e) {
        console.error('ERROR', e);
    }

    let decodedValidationResult = null;
    let gzip = null;
    let brotli = null;

    try {
        const decoded = await time('decode', () => decode.fn(encoded));
        if (validateDecodedResult) {
            try {
                require('assert').deepStrictEqual(decoded, data);
                console.error('  ✅ Decoded is deep equal to original data');
                decodedValidationResult = true;
            } catch (e) {
                decodedValidationResult = false;
                console.error('  [ERROR] Decoded is not deep equal to original data');
            }
        }
    } catch (e) {
        // times[decode.name] = 'ERROR';
        console.error(e);
        // console.error('ERROR', e.message);
    }

    if (features.has('gzip') && encoded) {
        gzip = await time('gzip', () => gzipSync(encoded));
        await time('gunzip', () => gunzipSync(gzip));
    }

    if (features.has('brotli')) {
        brotli = await time('brotli compress', () => brotliCompressSync(encoded));
        // await time('gunzip', () => gunzipSync(gzip));
    }

    return {
        name,
        valid: decodedValidationResult,
        size: {
            encoded: typeof encoded === 'string' ? Buffer.byteLength(encoded) : encoded ? encoded.estSize || encoded.byteLength : null,
            ...gzip ? { gzip: gzip.length } : null,
            ...brotli ? { brotli: brotli.length } : null
        },
        time: times
    };
}

async function runBenchmarks() {
    const results = [];
    const fixtureSize = filename ? raw.length : JSON.stringify(fixture).length;

    console.log(`===[${filename || 'raw'}]===`);
    console.log(`===[size: ${fixtureSize}]`);
    console.log();

    jsonExtStage7 = await import('./binary/snapshot7.mjs');
    jsonExtCurrent = await import('../src/binary.mjs');

    for (const solutionName of [
        'Standard JSON',
        // 'Node.js v8',
        // 'cbor',
        // 'cbor-x',
        // 'msgpack-lite',
        // 'msgpackr',
        // 'msgpack5',
        // 'bson',
        // 'json-ext (initial)',
        'json-ext (snapshot 2023-01-13)',
        // 'json-ext (snapshot 2023-01-18)',
        // 'json-ext (snapshot 2023-01-21)',
        // 'json-ext (snapshot 2023-01-22)',
        // 'json-ext (snapshot 2023-01-27)',
        'json-ext (snapshot 2023-02-08)',
        'json-ext (snapshot 2023-02-20)',
        'json-ext (current)'
    ]) {
        if (solutionName !== 'cbor' || fixtureSize < 200000000) {
            console.log(solutionName);
            results.push(await runSolution(solutionName, fixture));
            console.log();
        }
    }

    if (typeof process.send === 'function') {
        process.send(results);
    }

    // for (const { name, size, time } of results) {
    //     console.log([...Object.values(size), ...Object.values(time)].join('\t'));
    // }
}

setTimeout(runBenchmarks, 250);

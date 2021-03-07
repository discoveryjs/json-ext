const jsonExt = require('../src/binary');
const v8 = require('v8');
const cbor = require('cbor');
const { gzipSync, gunzipSync, brotliCompressSync } = require('zlib');
const stringToBuffer = s => new TextEncoder().encode(s);
const ensureBuffer = v => typeof v === 'string' ? stringToBuffer(v) : v;

// FIXTURE
const filename = process.argv[2];
const raw = filename
    ? require('fs').readFileSync(filename)
    : null;
const fixture = raw !== null ? JSON.parse(raw) : {
    // mock data
    foo: 1,
    bar: [1,2,3],
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
    'native': {
        encode: {
            name: 'JSON.strigify()',
            fn: data => JSON.stringify(data)
        },
        decode: {
            name: 'JSON.parse()',
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
    'json-ext': {
        encode: {
            name: 'encode()',
            fn: data => jsonExt.encode(data)
        },
        decode: {
            name: 'decode()',
            fn: encoded => jsonExt.decode(encoded)
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
    }
};

function addTotal(times, encodeName, decodeName) {
    let total = 0;

    for (const t of Object.values(times)) {
        total += t || 0;
    }

    return {
        ...times,
        encodeDecode: times[encodeName] + times[decodeName],
        total
    };
}

async function runSolution(name, data) {
    const solution = solutions[name];
    const { encode, decode } = solution;
    const times = {};
    const time = async (tname, fn) => {
        console.log(name, tname);
        const t = Date.now();
        const res = await fn();
        times[tname] = Date.now() - t;
        console.log(name, tname, times[tname]);
        return res;
    };

    const encoded = await time(encode.name, () => encode.fn(data));
    const encodedBuffer = ensureBuffer(encoded);
    let gzip = null;
    let brotli = null;

    if (features.has('gzip')) {
        gzip = await time('gzip', () => gzipSync(encoded));
        await time('gunzip', () => gunzipSync(gzip));
    }

    if (features.has('brotli')) {
        brotli = await time('brotli compress', () => brotliCompressSync(encoded));
        // await time('gunzip', () => gunzipSync(gzip));
    }

    const decoded = await time(decode.name, () => decode.fn(encoded));
    require('assert').deepStrictEqual(decoded, data);

    return {
        name,
        size: {
            encoded: encoded.length,
            encodedBuffer: encodedBuffer.length,
            ...gzip ? { gzip: gzip.length } : null,
            ...brotli ? { brotli: brotli.length } : null
        },
        time: addTotal(times, encode.name, decode.name)
    };
}

async function runBenchmarks() {
    const results = [];

    for (const solutionName of Object.keys(solutions)) {
        results.push(await runSolution(solutionName, fixture));
    }

    console.log(`===[${filename || 'raw'}]===`);
    console.log(`===[size: ${filename ? raw.length : JSON.stringify(fixture).length}]`);
    console.log(results);

    for (const { name, size, time } of results) {
        console.log([name, ...Object.values(size), ...Object.values(time)].join(';'));
    }
}

setTimeout(runBenchmarks, 250);

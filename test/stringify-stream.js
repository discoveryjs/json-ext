// Fork of https://github.com/Faleij/json-stream-stringify
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { Readable, Transform } = require('stream');
const { inspect } = require('util');
const { stringifyStream } = require('./helpers/lib');
const wellformedStringify = require('./helpers/well-formed-stringify');
const FIXTURE1 = 'fixture/stringify-stream-small.json';
const FIXTURE2 = 'fixture/stringify-stream-medium.json';
const {
    date,
    allUtf8LengthDiffChars,
    tests,
    spaceTests,
    spaces
} = require('./fixture/stringify-cases');

// Not supported in dist mode
try {
    stringifyStream();
} catch (e) {
    return;
}

inspect.defaultOptions.breakLength = Infinity;

function testTitleWithValue(title) {
    title = title === allUtf8LengthDiffChars
        ? `All UTF8 length diff chars ${title[0]}..${title[title.length - 1]}`
        : inspect(title, { depth: null });

    return title.replace(/[\u0000-\u001f\u0100-\uffff]/g, m => '\\u' + m.charCodeAt().toString(16).padStart(4, '0'));
}

function createStringifyCompareFn(input, expected, ...args) {
    return () => new Promise((resolve, reject) => {
        const chunks = [];

        stringifyStream(input, ...args)
            .on('data', (data) => {
                chunks.push(data);
            })
            .once('end', () => {
                try {
                    assert.strictEqual(chunks.join(''), expected);
                    setImmediate(resolve);
                } catch (e) {
                    reject(e);
                }
            })
            .once('error', reject);
    });
}

const streamRead = (chunks, timeout) => async function() {
    if (!chunks.length) {
        this.push(null); // end of stream
        return;
    }

    const value = chunks.shift();

    if (value instanceof Error) {
        this.emit('error', value);
        return;
    }

    if (timeout) {
        // await for timeout milliseconds
        await new Promise(resolve => setTimeout(resolve, timeout));
    }

    this.push(value);
};

class TestStream extends Readable {
    constructor(...chunks) {
        super({
            objectMode: chunks.some(v => typeof v !== 'string'),
            read: streamRead(chunks)
        });
        this[inspect.custom] = () => {
            return `ReadableStream(${chunks.map(inspect).join(', ')})`;
        };
    }
}

class TestStreamTimeout extends Readable {
    constructor(...chunks) {
        super({
            objectMode: chunks.some(v => typeof v !== 'string'),
            read: streamRead(chunks, 1)
        });
        this[inspect.custom] = () => {
            return `ReadableStreamTimeout(${chunks.map(inspect).join(', ')})`;
        };
    }
}

describe('stringifyStream()', () => {
    describe('base', () => {
        for (const value of tests) {
            const expected = wellformedStringify(value);
            it(`${testTitleWithValue(value)} should be ${testTitleWithValue(expected)}`,
                createStringifyCompareFn(value, expected));
        }

        // special cases
        it('Symbol("test") should be null', createStringifyCompareFn(Symbol('test'), 'null'));
        it('undefined should be null', createStringifyCompareFn(undefined, 'null'));
    });

    describe('toJSON()', () => {
        const values = [
            date,
            { toJSON: () => 123 },
            { a: date, b: { a: 1, toJSON: () => 'ok' } }
        ];

        for (const value of values) {
            const expected = wellformedStringify(value);
            it(`${testTitleWithValue(value)} should be ${testTitleWithValue(expected)}`,
                createStringifyCompareFn(value, expected));
        }
    });

    describe('Promise', () => {
        const entries = [
            [Promise.resolve(1), '1'],
            [Promise.resolve(Promise.resolve(1)), '1'],

            // inside objects
            [{ a: Promise.resolve(1) }, '{"a":1}'],
            [{ a: 1, b: Promise.resolve(undefined) }, '{"a":1}'],
            [{ a: Promise.resolve(undefined), b: 2 }, '{"b":2}'],
            [{ a: Promise.resolve(undefined), b: Promise.resolve(undefined) }, '{}'],

            // inside arrays
            [[Promise.resolve(1)], '[1]'],
            [[1, Promise.resolve(2), Promise.resolve(), 3], '[1,2,null,3]'],

            // fake promise
            [{ then: fn => Promise.resolve(1).then(fn) }, '1'],
            [{ then: fn => fn(2) }, '2']
        ];

        for (const [value, expected] of entries) {
            it(`${testTitleWithValue(value)} should be ${testTitleWithValue(expected)}`,
                createStringifyCompareFn(value, expected));
        }

        it('Promise.reject(Error) should emit Error', () => {
            const err = new Error('should emit error');
            return assert.rejects(
                createStringifyCompareFn(Promise.reject(err), '')(),
                err1 => {
                    assert.strictEqual(err1, err);
                    return true;
                }
            );
        });
    });

    describe('Stream', () => {
        const createTestFixture = StreamClass => [
            [new StreamClass(1), '[1]'],
            [new StreamClass({ foo: 1, bar: 2 }, { baz: 3 }), '[{"foo":1,"bar":2},{"baz":3}]'],
            [new StreamClass('{', '"b":1', '}'), '{"b":1}'],
            [new StreamClass({}, 'a', undefined, 'c'), '[{},"a",null,"c"]'],
            [new StreamClass({ foo: 1 }, { bar: 2 }, { baz: 3 }), '[{"foo":1},{"bar":2},{"baz":3}]'],
            [{ a: new StreamClass(1, 2, 3) }, '{"a":[1,2,3]}'],
            [{ a: new StreamClass({ name: 'name', date }) }, `{"a":[{"name":"name","date":"${date.toJSON()}"}]}`],
            [{ a: new StreamClass({ name: 'name', arr: [], obj: {}, date }) }, `{"a":[{"name":"name","arr":[],"obj":{},"date":"${date.toJSON()}"}]}`],
            [Promise.resolve(new StreamClass(1)), '[1]']
        ];

        describe('test cases w/o timeout', () => {
            for (const [value, expected] of createTestFixture(TestStream)) {
                it(`${testTitleWithValue(value)} should be ${testTitleWithValue(expected)}`,
                    createStringifyCompareFn(value, expected));
            }
        });
        describe('test cases with timeout', () => {
            for (const [value, expected] of createTestFixture(TestStreamTimeout)) {
                it(`${testTitleWithValue(value)} should be ${testTitleWithValue(expected)}`,
                    createStringifyCompareFn(value, expected));
            }
        });

        it('fs.createReadStream(path) should be content of file (' + FIXTURE1 + ')',
            createStringifyCompareFn(
                fs.createReadStream(path.join(__dirname, FIXTURE1)),
                fs.readFileSync(path.join(__dirname, FIXTURE1), 'utf8')
            )
        );
        it('fs.createReadStream(path) should be content of file (' + FIXTURE2 + ')',
            createStringifyCompareFn(
                fs.createReadStream(path.join(__dirname, FIXTURE2)),
                fs.readFileSync(path.join(__dirname, FIXTURE2), 'utf8')
            )
        );

        it('Non push(null) stream',
            createStringifyCompareFn(
                new Transform({
                    read() {
                        this.push('[123]');
                        this.end();
                    }
                }),
                '[123]'
            )
        );

        it('{a:[ReadableStream(1, Error, 2)]} should emit Error', () => {
            const err = new Error('should emit error');
            return assert.rejects(
                createStringifyCompareFn({
                    a: [new TestStream(1, err, 2)]
                }, '')(),
                (err1) => {
                    assert.deepEqual(err1, err);
                    return true;
                }
            );
        });

        it('ReadableStream(1, 2, 3, 4, 5, 6, 7).resume() should emit Error', () =>
            assert.rejects(
                createStringifyCompareFn(new TestStream(1, 2, 3, 4, 5, 6, 7).resume(), '[1,2,3,4,5,6,7]')(),
                (err) => {
                    assert.strictEqual(err.message, 'Readable Stream is in flowing mode, data may have been lost. Trying to pause stream.');
                    return true;
                }
            )
        );

        it('EndedReadableStream(1, 2, 3, 4, 5, 6, 7) should emit Error', () => {
            const stream = new TestStream(1, 2, 3, 4, 5, 6, 7);
            return assert.rejects(
                createStringifyCompareFn(new Promise(resolve => stream.once('end', () => resolve(stream)).resume()), '[1,2,3,4,5,6,7]')(),
                (err) => {
                    assert.strictEqual(err.message, 'Readable Stream has ended before it was serialized. All stream data have been lost');
                    return true;
                }
            );
        });
    });

    describe('replacer', () => {
        const entries = [
            [1, () => 2],
            [{ a: undefined }, (k, v) => {
                if (k) {
                    assert.strictEqual(k, 'a');
                    assert.strictEqual(v, undefined);
                    return 1;
                }
                return v;
            }],
            [{ a: 1, b: 2 }, (k, v) => {
                if (k === 'a' && v === 1) {
                    return v;
                }
                if (k === 'b' && v === 2) {
                    return undefined;
                }
                return v;
            }],

            // replacer as a whitelist of keys
            [{ a: 1, b: 2 }, ['b']],
            [{ 1: 1, b: 2 }, [1]],

            // toJSON/replacer order
            [{
                source: 'replacer',
                toJSON: () => ({ source: 'toJSON' })
            }, (_, value) => value.source],

            // `this` should refer to holder
            [
                (() => {
                    const ar = [4, 5, { a: 7 }, { m: 2, a: 8 }];
                    ar.m = 6;
                    return {
                        a: 2,
                        b: 3,
                        m: 4,
                        c: ar
                    };
                })(),
                function(key, value) {
                    return typeof value === 'number' && key !== 'm' && typeof this.m === 'number'
                        ? value * this.m
                        : value;
                }
            ]
        ];

        for (const [value, replacer] of entries) {
            const expected = wellformedStringify(value, replacer);
            it(`${testTitleWithValue(value)} should be ${testTitleWithValue(expected)}`,
                createStringifyCompareFn(value, expected, replacer));
        }

        it('walk sequence should be the same', () => {
            const data = { a: 1, b: 'asd', c: [1, 2, 3, { d: true, e: null }] };
            const actual = [];
            const expected = [];
            const replacer = function(key, value) {
                currentLog.push(this, key, value);
                return value;
            };
            let res;
            let currentLog;

            currentLog = expected;
            res = wellformedStringify(data, replacer);

            currentLog = actual;
            return createStringifyCompareFn(data, res, replacer)()
                .then(() => {
                    assert.strictEqual(actual.length, expected.length);
                    assert.deepEqual(actual[0], expected[0]); // { '': data }

                    for (let i = 1; i < actual.length; i++) {
                        assert.strictEqual(actual[i], expected[i]);
                    }
                });
        });
    });

    describe('space option', () => {
        for (const space of spaces) {
            describe('space ' + wellformedStringify(space), () => {
                for (const value of spaceTests) {
                    it(inspect(value), createStringifyCompareFn(value, wellformedStringify(value, null, space), null, space));
                }

                it('[Number, Array, Promise, ReadableStream, ReadableStream]',
                    createStringifyCompareFn(
                        [
                            1,
                            [2, 3],
                            Promise.resolve(4),
                            new TestStream(5),
                            new TestStream('6')
                        ],
                        wellformedStringify([1, [2, 3], 4, [5], 6], null, space),
                        null,
                        space
                    )
                );
            });
        }
    });

    describe('circular structure', () => {
        it('{ a: $ } should emit error when object refers to ancestor object', () => {
            const circularRef = {};
            circularRef.a = circularRef;

            assert.rejects(
                createStringifyCompareFn(circularRef, '')(),
                (err) => {
                    assert.strictEqual(err.message, 'Converting circular structure to JSON');
                    return true;
                }
            );
        });

        it('[{ a: $ }] should emit error when object refers to ancestor array', () => {
            const circularRef = [];
            circularRef.push({ a: circularRef });

            assert.rejects(
                createStringifyCompareFn(circularRef, '')(),
                (err) => {
                    assert.strictEqual(err.message, 'Converting circular structure to JSON');
                    return true;
                }
            );
        });

        it('{ a: [$] } should emit error when array\'s element refers to ancestor object', () => {
            const circularRef = {};
            circularRef.a = [circularRef];

            assert.rejects(
                createStringifyCompareFn(circularRef, '')(),
                (err) => {
                    assert.strictEqual(err.message, 'Converting circular structure to JSON');
                    return true;
                }
            );
        });

        it('[[$]] should emit error when array\'s element refers to ancestor object', () => {
            const circularRef = [];
            circularRef.push(circularRef);

            assert.rejects(
                createStringifyCompareFn(circularRef, '')(),
                (err) => {
                    assert.strictEqual(err.message, 'Converting circular structure to JSON');
                    return true;
                }
            );
        });

        it('{ a: Promise($) } should be emit error', () => {
            const cyclicData1 = {};
            cyclicData1.a = Promise.resolve(cyclicData1);

            assert.rejects(
                createStringifyCompareFn(Promise.resolve(cyclicData1), '')(),
                (err) => {
                    assert.strictEqual(err.message, 'Converting circular structure to JSON');
                    return true;
                }
            );
        });

        it('{ a: ReadableStream($) } should be emit error', () => {
            const cyclicData2 = {};
            cyclicData2.a = new TestStream(cyclicData2);

            assert.rejects(
                createStringifyCompareFn(new TestStream(cyclicData2), '')(),
                (err) => {
                    assert.strictEqual(err.message, 'Converting circular structure to JSON');
                    return true;
                }
            );
        });

        it('should not fail on reuse empty object/array', () => {
            const obj = {};
            const obj2 = { a: 1 };
            const arr = [];
            const arr2 = [1];
            const noCycle = {
                o1: obj, o2: obj, o3: obj2, o4: obj2,
                a1: arr, a2: arr, a3: arr2, a4: arr2
            };

            return createStringifyCompareFn(noCycle, wellformedStringify(noCycle));
        });
    });

    describe('errors', () => {
        it('"Do not know how to serialize" error', () => assert.rejects(
            createStringifyCompareFn({ test: 1n }, '')(),
            /TypeError: Do not know how to serialize a BigInt/
        ));

        it('should catch errors on value resolving', () => assert.rejects(
            createStringifyCompareFn({ toJSON() {
                throw new Error('test');
            } }, '')(),
            /Error: test/
        ));
    });
});

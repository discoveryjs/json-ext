// Fork of https://github.com/Faleij/json-stream-stringify
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { Readable, Transform } = require('stream');
const { inspect } = require('util');
const { stringifyStream } = require('../src');
const FIXTURE1 = 'fixture/stringify-stream-small.json';
const FIXTURE2 = 'fixture/stringify-stream-medium.json';

inspect.defaultOptions.breakLength = Infinity;

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
    const date = new Date();

    describe('simple', () => {
        const values = [
            // scalar
            null, // null
            true,
            false,
            1,
            123,
            12.34,
            '\n', // "\n"
            '漢字',
            '\u009f', // "\u009f"

            // object
            {},
            { a: undefined }, // {}
            { a: null }, // {"a":null}
            { a: undefined, b: undefined }, // {}
            { a: undefined, b: 1 }, // {"b":1}
            { a: 1, b: undefined },
            { a: 1, b: undefined, c: 2 },
            { a: 1 },
            { a: 1, b: { c: 2 } },
            { a: [1], b: 2 },
            { a() {}, b: 'b' },

            // array
            [],
            [[[]],[[]]],
            [function a() {}],
            [function a() {}, undefined],
            [1, undefined, 2],
            [1, , 2],
            [1, 'a'],
            [{}, [], { a: [], o: {} }],

            // special cases
            /regex/gi, // {}
            date, // date.toJSON()
            NaN, // null
            Infinity // null
            // undefined, // JSON.stringify() returns undefined instead of 'undefined'
            // Symbol('test') // JSON.stringify() returns undefined instead of 'null'
        ];

        for (const value of values) {
            const expected = JSON.stringify(value);
            it(`${inspect(value)} should be ${expected}`, createStringifyCompareFn(value, expected));
        }

        // exceptions
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
            const expected = JSON.stringify(value);
            it(`${inspect(value)} should be ${expected}`, createStringifyCompareFn(value, expected));
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
            it(`${inspect(value)} should be ${expected}`, createStringifyCompareFn(value, expected));
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
                it(`${inspect(value)} should be ${expected}`, createStringifyCompareFn(value, expected));
            }
        });
        describe('test cases with timeout', () => {
            for (const [value, expected] of createTestFixture(TestStreamTimeout)) {
                it(`${inspect(value)} should be ${expected}`, createStringifyCompareFn(value, expected));
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
                    // console.log(err);
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
            }, (_, value) => value.source]
        ];

        for (const [value, replacer] of entries) {
            const expected = JSON.stringify(value, replacer);
            it(`${inspect(value)} should be ${expected}`, createStringifyCompareFn(value, expected, replacer));
        }
    });

    describe('space option', () => {
        const values = [
            {},
            { a: 1 },
            { a: 1, b: 2 },
            { a: 1, b: undefined, c: 2 },
            { a: undefined },
            [],
            [1],
            [1, 2],
            [undefined],
            [1, undefined, 3],
            [{ a: 1 }, 'test', { b: [{ c: 3, d: 4 }]}]
        ];

        for (const spacer of [2, '  ', '\t', '_']) {
            describe('spacer ' + JSON.stringify(spacer), () => {
                for (const value of values) {
                    it(inspect(value), createStringifyCompareFn(value, JSON.stringify(value, null, spacer), null, spacer));
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
                        JSON.stringify([1, [2, 3], 4, [5], 6], null, spacer),
                        null,
                        spacer
                    )
                );
            });
        }
    });

    describe('circular structure', () => {
        it('{ a: $ } should emit error', () => {
            const cyclicData0 = {};
            cyclicData0.a = cyclicData0;

            assert.rejects(
                createStringifyCompareFn(cyclicData0, '')(),
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

        const obj = {};
        const obj2 = { a: 1 };
        const arr = [];
        const arr2 = [1];
        const noCycle = {
            o1: obj, o2: obj, o3: obj2, o4: obj2,
            a1: arr, a2: arr, a3: arr2, a4: arr2
        };
        it('should not fail on reuse empty object/array', createStringifyCompareFn(noCycle, JSON.stringify(noCycle)));
    });
});
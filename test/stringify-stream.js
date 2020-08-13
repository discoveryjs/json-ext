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

function createTest(input, expected, ...args) {
    return () => new Promise((resolve, reject) => {
        let str = '';
        const jsonStream = stringifyStream(input, ...args)
            .on('data', (data) => {
                str += data.toString();
            })
            .once('end', () => {
                try {
                    assert.strictEqual(str, expected);
                } catch (err) {
                    reject(err);
                    return;
                }
                setImmediate(() => resolve({ jsonStream }));
            })
            .once('error', err => reject(Object.assign(err, {
                jsonStream
            })));
    });
}

const streamRead = (args, timeout) => async function() {
    if (!args.length) {
        return this.push(null);
    }

    const v = args.shift();
    if (v instanceof Error) {
        return this.emit('error', v);
    }

    return timeout
        ? this.push(await new Promise((resolve) => setTimeout(() => resolve(v), timeout)))
        : this.push(v);
};

class TestStream extends Readable {
    constructor(...args) {
        super({
            objectMode: args.some(v => typeof v !== 'string'),
            read: streamRead(args)
        });
        this[inspect.custom] = () => {
            return `ReadableStream(${args.map(inspect).join(', ')})`;
        };
    }
}

class TestStreamTimeout extends Readable {
    constructor(...args) {
        super({
            objectMode: args.some(v => typeof v !== 'string'),
            read: streamRead(args, 1)
        });
        this[inspect.custom] = () => {
            return `ReadableStreamTimeout(${args.map(inspect).join(', ')})`;
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
            it(`${inspect(value)} should be ${expected}`, createTest(value, expected));
        }

        // exceptions
        it('Symbol("test") should be null', createTest(Symbol('test'), 'null'));
        it('undefined should be null', createTest(undefined, 'null'));
    });

    describe('toJSON()', () => {
        const values = [
            date,
            { toJSON: () => 123 },
            { a: date, b: { a: 1, toJSON: () => 'ok' } }
        ];

        for (const value of values) {
            const expected = JSON.stringify(value);
            it(`${inspect(value)} should be ${expected}`, createTest(value, expected));
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
            it(`${inspect(value)} should be ${expected}`, createTest(value, expected));
        }

        it('Promise.reject(Error) should emit Error', () => {
            const err = new Error('should emit error');
            return assert.rejects(
                createTest(Promise.reject(err), '')(),
                err1 => {
                    assert.strictEqual(err1, err);
                    return true;
                }
            );
        });
    });

    describe('Stream', () => {
        const entries = [
            [new TestStream(1), '[1]'],
            [new TestStream({ foo: 1, bar: 2 }, { baz: 3 }), '[{"foo":1,"bar":2},{"baz":3}]'],
            [new TestStream('{', '"b":1', '}'), '{"b":1}'],
            [new TestStreamTimeout('{', '"b":1', '}'), '{"b":1}'],
            [new TestStream({}, 'a', undefined, 'c'), '[{},"a",null,"c"]'],
            [new TestStreamTimeout({ foo: 1 }, { bar: 2 }, { baz: 3 }), '[{"foo":1},{"bar":2},{"baz":3}]'],
            [{ a: new TestStream(1, 2, 3) }, '{"a":[1,2,3]}'],
            [{ a: new TestStream({ name: 'name', date }) }, `{"a":[{"name":"name","date":"${date.toJSON()}"}]}`],
            [{ a: new TestStream({ name: 'name', arr: [], obj: {}, date }) }, `{"a":[{"name":"name","arr":[],"obj":{},"date":"${date.toJSON()}"}]}`],
            [Promise.resolve(new TestStream(1)), '[1]']
        ];

        for (const [value, expected] of entries) {
            it(`${inspect(value)} should be ${expected}`, createTest(value, expected));
        }

        it('fs.createReadStream(path) should be content of file (' + FIXTURE1 + ')',
            createTest(
                fs.createReadStream(path.join(__dirname, FIXTURE1)),
                fs.readFileSync(path.join(__dirname, FIXTURE1), 'utf8')
            )
        );
        it('fs.createReadStream(path) should be content of file (' + FIXTURE2 + ')',
            createTest(
                fs.createReadStream(path.join(__dirname, FIXTURE2)),
                fs.readFileSync(path.join(__dirname, FIXTURE2), 'utf8')
            )
        );

        it('Non push(null) stream',
            createTest(
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
                createTest({
                    a: [new TestStream(1, err, 2)]
                }, '')(),
                (err1) => {
                    // expect(err.jsonStream.stack).to.eql(['a', 0]);
                    assert.deepEqual(err1, err);
                    return true;
                }
            );
        });

        it('ReadableStream(1, 2, 3, 4, 5, 6, 7).resume() should emit Error', () =>
            assert.rejects(
                createTest(new TestStream(1, 2, 3, 4, 5, 6, 7).resume(), '[1,2,3,4,5,6,7]')(),
                (err) => {
                    assert.strictEqual(err.message, 'Readable Stream is in flowing mode, data may have been lost. Trying to pause stream.');
                    return true;
                }
            )
        );

        it('EndedReadableStream(1, 2, 3, 4, 5, 6, 7) should emit Error', () => {
            const stream = new TestStream(1, 2, 3, 4, 5, 6, 7);
            return assert.rejects(
                createTest(new Promise(resolve => stream.once('end', () => resolve(stream)).resume()), '[1,2,3,4,5,6,7]')(),
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
            it(`${inspect(value)} should be ${expected}`, createTest(value, expected, replacer));
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
                    it(inspect(value), createTest(value, JSON.stringify(value, null, spacer), null, spacer));
                }

                it('[Number, Array, Promise, ReadableStream, ReadableStream]',
                    createTest(
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
        const cyclicData0 = {};
        cyclicData0.a = cyclicData0;
        it('{ a: $ } should emit error', () =>
            assert.rejects(
                createTest(cyclicData0, '')(),
                (err) => {
                    assert.strictEqual(err.message, 'Converting circular structure to JSON');
                    return true;
                }
            )
        );

        const cyclicData1 = {};
        cyclicData1.a = Promise.resolve(cyclicData1);
        it('{ a: Promise($) } should be emit error', () =>
            assert.rejects(
                createTest(Promise.resolve(cyclicData1), '')(),
                (err) => {
                    assert.strictEqual(err.message, 'Converting circular structure to JSON');
                    return true;
                }
            )
        );

        const cyclicData2 = {};
        cyclicData2.a = new TestStream(cyclicData2);
        it('{ a: ReadableStream($) } should be emit error', () =>
            assert.rejects(
                createTest(new TestStream(cyclicData2), '')(),
                (err) => {
                    assert.strictEqual(err.message, 'Converting circular structure to JSON');
                    return true;
                }
            ));

        const obj = {};
        const obj2 = { a: 1 };
        const arr = [];
        const arr2 = [1];
        const noCycle = {
            o1: obj, o2: obj, o3: obj2, o4: obj2,
            a1: arr, a2: arr, a3: arr2, a4: arr2
        };
        it('should not fail on reuse empty object/array', createTest(noCycle, JSON.stringify(noCycle)));
    });
});

import assert from 'assert';
import { inspect } from 'util';
import { stringifyChunked } from './stringify-chunked.js';
import { date, allUtf8LengthDiffChars, tests, spaceTests, spaces, replacerTests } from './stringify-cases.js';

const wellformedStringify = JSON.stringify;

inspect.defaultOptions.breakLength = Infinity;

function testTitleWithValue(title) {
    title = title === allUtf8LengthDiffChars
        ? `All UTF8 length diff chars ${title[0]}..${title[title.length - 1]}`
        : inspect(title, { depth: null });

    return title.replace(/[\u0000-\u001f\u0100-\uffff]/g, m => '\\u' + m.charCodeAt().toString(16).padStart(4, '0'));
}

function createStringifyTestFn(input, expected, ...args) {
    return () => {
        const chunks = [...stringifyChunked(input, ...args)];
        const actual = chunks.join('');

        if (actual !== expected) {
            const escapedActual = JSON.stringify(actual);
            const escapedExpected = JSON.stringify(actual);

            if (actual !== escapedActual || expected !== escapedExpected) {
                assert.strictEqual(escapedActual.slice(1, -1), escapedExpected.slice(1, -1));
            } else {
                assert.strictEqual(actual, expected);
            }
        }
    };
}

describe('stringifyChunked()', () => {
    describe('base', () => {
        for (const value of tests) {
            const expected = wellformedStringify(value);
            it(`${testTitleWithValue(value)} should be ${testTitleWithValue(expected)}`,
                createStringifyTestFn(value, expected));
        }

        // special cases
        it('Symbol("test") should be null', createStringifyTestFn(Symbol('test'), 'null'));
        it('undefined should be null', createStringifyTestFn(undefined, 'null'));
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
                createStringifyTestFn(value, expected));
        }
    });

    describe('highWaterMark', () => {
        it('16kb by default', () => {
            const chunks = [...stringifyChunked([...new Uint8Array(20000)])].map(chunk => chunk.length);

            assert.deepStrictEqual(chunks, [16384, 16384, 7233]);
        });

        it('custom highWaterMark', () => {
            const chunks = [...stringifyChunked([...new Uint8Array(100)], {
                highWaterMark: 20
            })].map(chunk => chunk.length);

            assert.deepStrictEqual(chunks, Array.from({ length: 10 }, () => 20).concat(1));
        });
    });

    describe('replacer', () => {
        for (const [value, replacer] of replacerTests) {
            const expected = wellformedStringify(value, replacer);
            it(`${testTitleWithValue(value)} should be ${testTitleWithValue(expected)}`,
                createStringifyTestFn(value, expected, replacer));
        }

        describe('should take replacer from options', () => {
            for (const [value, replacer] of replacerTests) {
                const expected = wellformedStringify(value, replacer);
                it(`${testTitleWithValue(value)} should be ${testTitleWithValue(expected)}`,
                    createStringifyTestFn(value, expected, { replacer }));
            }
        });

        it('walk sequence should be the same', () => {
            const data = { a: 1, b: 'asd', c: [1, 2, 3, { d: true, e: null }] };
            const actual = [];
            const expected = [];
            const replacer = function(key, value) {
                currentLog.push(this, key, value);
                return value;
            };
            let currentLog;

            currentLog = expected;
            const expectedJson = wellformedStringify(data, replacer);

            currentLog = actual;
            const actualJson = [...stringifyChunked(data, replacer)].join('');

            assert.strictEqual(actualJson, expectedJson);
            assert.strictEqual(actual.length, expected.length);
            assert.deepStrictEqual(actual[0], expected[0]); // { '': data }

            for (let i = 1; i < actual.length; i++) {
                assert.strictEqual(actual[i], expected[i]);
            }
        });

        it('various values for a replace as an allowlist', () => {
            // NOTE: There is no way to iterate keys in order of addition
            // in case of numeric keys, such keys are always going first sorted
            // in asceding numeric order disregarding of actual position.
            // Therefore, the result is not the same as for JSON.stringify()
            // where keys goes in order of definition, e.g. "1" key goes last.
            const value = { '3': 'ok', b: [2, 3, { c: 5, a: 4 }, 7, { d: 1 }], 2: 'fail', 1: 'ok', a: 1, c: 6, '': 'fail' };
            const replacer = ['a', 'a', new String('b'), { toString: () => 'c' }, 1, '2', new Number(3), null, () => {}, Symbol(), false];

            return createStringifyTestFn(
                value,
                JSON.stringify(value, replacer),
                replacer
            )();
        });
    });

    describe('space option', () => {
        for (const space of spaces) {
            describe('space ' + wellformedStringify(space), () => {
                for (const value of spaceTests) {
                    it(inspect(value), createStringifyTestFn(value, wellformedStringify(value, null, space), null, space));
                }

                it('[Number, Array]',
                    createStringifyTestFn(
                        [
                            1,
                            [2, 3],
                            4,
                            [5],
                            6
                        ],
                        wellformedStringify([1, [2, 3], 4, [5], 6], null, space),
                        null,
                        space
                    )
                );
            });
        }

        describe('should take spaces from options', () => {
            for (const value of spaceTests) {
                const space = 5;
                const expected = wellformedStringify(value, null, space);
                it(inspect(value), createStringifyTestFn(value, expected, { space }, 3));
            }
        });
    });

    describe('circular structure', () => {
        it('{ a: $ } should emit error when object refers to ancestor object', () => {
            const circularRef = {};
            circularRef.a = circularRef;

            assert.rejects(
                createStringifyTestFn(circularRef, ''),
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
                createStringifyTestFn(circularRef, ''),
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
                createStringifyTestFn(circularRef, ''),
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
                createStringifyTestFn(circularRef, ''),
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

            return createStringifyTestFn(noCycle, wellformedStringify(noCycle));
        });
    });

    describe('errors', () => {
        it('"Do not know how to serialize" error', () => assert.throws(
            createStringifyTestFn({ test: 1n }, ''),
            /TypeError: Do not know how to serialize a BigInt/
        ));

        it('should catch errors on value resolving', () => assert.throws(
            createStringifyTestFn({ toJSON() {
                throw new Error('test');
            } }, ''),
            /Error: test/
        ));
    });
});

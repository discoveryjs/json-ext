const assert = require('assert');
const { inspect } = require('util');
const { info: jsonStringifyInfo } = require('../src');
const strBytesLength = str => Buffer.byteLength(str, 'utf8');

describe('info()', () => {
    describe('basic', () => {
        const tests = [
            null,
            true,
            false,
            123,
            -123,
            // 5
            NaN,
            Infinity,
            -Infinity,
            'test',
            '\b\t\n\f\r"\\', // escapes
            // 10
            '漢字',
            '\u0000\u0010\u001f\u009f', // "\u009f"
            '\uD800\uDC00',  // surrogate pair
            '\uDC00\uD800',  // broken surrogate pair
            '\uD800',  // leading surrogate (broken surrogate pair)
            // 15
            '\uDC00',  // trailing surrogate (broken surrogate pair)
            Array.from({ length: 0x900 }).map((_, i) => String.fromCharCode(i)).join(''), // all chars 0x00..0x8FF
            {},
            { foo: 1 },
            { foo: 1, bar: 2 },
            // 20
            { foo: 1, bar: undefined, baz: { a: undefined, b: 123, c: [1, 2] } },
            { foo: 1, bar: NaN, baz: Infinity, qux: -Infinity },
            [],
            [1, 2, 3],
            [{ foo: 1 }, undefined, 123, NaN, Infinity, -Infinity, 'test'],
            // 25
            undefined,
            Symbol('test'),
            { foo: 1, bar: Symbol('test') },
            () => 123,
            { foo: 1, bar: () => 123 }
        ];

        describe('no spaces', () => {
            for (const value of tests) {
                it(inspect(value, { depth: null }), () => {
                    const native = String(JSON.stringify(value));
                    const info = jsonStringifyInfo(value);

                    assert.deepEqual(info, {
                        minLength: strBytesLength(native),
                        circular: [],
                        duplicate: [],
                        async: []
                    });
                });
            }
        });

        describe('with spaces', () => {
            for (const value of tests) {
                it(inspect(value, { depth: null }), () => {
                    const native = String(JSON.stringify(value, null, 4));
                    const info = jsonStringifyInfo(value, null, 4);

                    assert.deepEqual(info, {
                        minLength: strBytesLength(native),
                        circular: [],
                        duplicate: [],
                        async: []
                    });
                });
            }
        });
    });
});

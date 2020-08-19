const assert = require('assert');
const { inspect } = require('util');
const { info: jsonStringifyInfo } = require('../src');

describe('info()', () => {
    describe('basic', () => {
        const tests = [
            null,
            true,
            false,
            123,
            -123,
            NaN,
            Infinity,
            -Infinity,
            'test',
            {},
            { foo: 1 },
            { foo: 1, bar: 2 },
            { foo: 1, bar: undefined, baz: { a: undefined, b: 123, c: [1, 2] } },
            { foo: 1, bar: NaN, baz: Infinity, qux: -Infinity },
            [],
            [1, 2, 3],
            [{ foo: 1 }, undefined, 123, NaN, Infinity, -Infinity, 'test'],
            undefined,
            Symbol('test'),
            { foo: 1, bar: Symbol('test') },
            () => 123,
            { foo: 1, bar: () => 123 }
        ];

        describe('no spaces', () => {
            for (const value of tests) {
                jsonStringifyInfo(value);
                it(inspect(value, { depth: null }), () => {
                    const native = String(JSON.stringify(value));
                    const info = jsonStringifyInfo(value);

                    assert.deepEqual(info, {
                        minLength: native.length,
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
                        minLength: native.length,
                        circular: [],
                        duplicate: [],
                        async: []
                    });
                });
            }
        });
    });
});

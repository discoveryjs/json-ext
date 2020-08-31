const assert = require('assert');
const { inspect } = require('util');
const { info: jsonStringifyInfo } = require('../src');
const strBytesLength = str => Buffer.byteLength(str, 'utf8');
const fixture = {
    a: 1,
    b: [2, null, true, false, 'string', { o: 3 }],
    c: 'asd',
    d: {
        e: 4,
        d: true,
        f: false,
        g: 'string',
        h: null,
        i: [5, 6]
    }
};

function createInfoTest(value, ...args) {
    it(inspect(value, { depth: null }), () => {
        const native = String(JSON.stringify(value, ...args));
        const info = jsonStringifyInfo(value, ...args);

        assert.deepEqual(info, {
            minLength: strBytesLength(native),
            circular: [],
            duplicate: [],
            async: []
        });
    });
}

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
            { foo: 1, bar: () => 123 },
            fixture
        ];

        describe('no spaces', () => {
            for (const value of tests) {
                createInfoTest(value);
            }
        });

        describe('space option', () => {
            const spaceTests = tests
                .filter(t => typeof t === 'object')
                .concat(['foo', 123, null, false]);

            for (const space of [undefined, 0, '', 2, '  ', '\t', '___']) {
                describe('space ' + JSON.stringify(space), () => {
                    for (const value of spaceTests) {
                        createInfoTest(value, null, space);
                    }
                });
            }
        });
    });
});

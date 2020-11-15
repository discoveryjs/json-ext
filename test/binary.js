const assert = require('assert');
const { encode, decode } = require('../src/binary');

describe.only('binary', () => {
    describe('atoms', () => {
        const values = [
            null,
            true,
            false,
            '',
            'foo',
            'very long string'.repeat(10),
            'very long string'.repeat(100),
            'asd\u00a0😱ad\r\r\n\n\t\f\vasd'
        ];

        for (const value of values) {
            it(String(value), () =>
                assert.strictEqual(decode(encode(value)), value)
            );
        }

        describe('integer', () => {
            const values = [
                0x00,
                0x01,
                0x10,
                0x0100,
                0x1000,
                0x010000,
                0x100000,
                0x01000000,
                0x10000000,
                0x0100000000,
                0x1000000000,
                0x175c9065669 // Date.now()
            ];

            for (const num of values) {
                it('0x' + num.toString(16), () => assert.strictEqual(decode(encode(num)), num));
                it('-0x' + num.toString(16), () => assert.strictEqual(decode(encode(-num)), num === 0 ? 0 : -num));
            }
        });

        describe('float', () => {
            const values = [
                0.0,
                0.1,
                0.25,
                0.6,
                2.5,
                10 / 3,
                999.5,
                1e-10
            ];

            for (const num of values) {
                it(String(num), () => assert.strictEqual(decode(encode(num)), num));
                it(String(-num), () => assert.strictEqual(decode(encode(-num)), num === 0 ? 0 : -num));
            }
        });
    });

    describe('array', () => {
        const values = [
            [],
            [1, 2, 3, false, 'str'],
            [1, 1000, 1000000, false, 'str', '0123456789'.repeat(1000)],
            ['foo', 'bar', 'baz'],
            ['foo', 'foo', 'foo'],

            // typed
            [1, 2, 3],
            [0x0100, 0x0200, 0x0300],
            [0x010000, 0x020000, 0x030000],
            [0x01, 0x0200, 0x030000],
            [1, -2, 3],
            [0x0100, -0x0200, 0x0300],
            [0x010000, -0x020000, 0x030000],
            [0x01, -0x0200, 0x030000]
        ];

        for (const value of values) {
            it(JSON.stringify(value), () => assert.deepStrictEqual(decode(encode(value)), value));
        }
    });

    describe('object', () => {
        const values = [
            {},
            { foo: 'bar' },
            { num8: 123, num16: 12345, num32: 123456, float: 1 / 3, str: 'str', bool: false, bool: true, null: null },
            { array: [1, 1000, 1000000], obj: { foo: 123 } }
        ];

        for (const value of values) {
            it(JSON.stringify(value), () => assert.deepStrictEqual(decode(encode(value)), value));
        }
    });

    describe('mixed', () => {
        const values = [
            [{ foo: 123, bar: 'baz' }, { foo: 456, bar: 'baz' }]
        ];

        for (const value of values) {
            it(JSON.stringify(value), () => assert.deepStrictEqual(decode(encode(value)), value));
        }
    });
});

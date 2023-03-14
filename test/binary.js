const assert = require('assert');
// const {encode, decode, Writer} = require('../src/binary.mjs');

function roundTripJson(value) {
    return JSON.parse(JSON.stringify(value));
}

describe('binary', () => {
    let encode, decode, Writer, WriterBackend;
    before(async () => ({encode, decode, Writer, WriterBackend} = await import('../src/binary.mjs')));
    function roundTrip(value) {
        return decode(encode(value));
    }

    describe('atoms', () => {
        const values = [
            null,
            true,
            false,
            '',
            'foo',
            'long string'.repeat(10),
            'very long string'.repeat(1000),
            'very very long string'.repeat(5000),
            'asd\u00a0😱ad\r\r\n\n\t\f\vasd',
            '\ufeff preserve BOM' // should preserve BOM when used, otherwise a result might not be equal to original data
        ];

        for (const value of values) {
            it(String(value), () =>
                assert.strictEqual(roundTrip(value), value)
            );
        }

        it('very very long string', () => {
            const str = 'hello world'.repeat(2000000);
            const actual = roundTrip(str);
            assert.strictEqual(actual.length, str.length);
            assert.strictEqual(actual, str);
        });

        describe('integer', () => {
            const values = [
                // 8
                0x00,
                0x01,
                0x10,
                0x7f,
                0xff,
                // 16
                0x0f00,
                0xf000,
                0xffff,
                // 24
                0x0f0000,
                0xf00000,
                0xffffff,
                // 32
                0x0f000000,
                0xf0000000,
                0xffffffff,
                0x6b96d13e, // 1805046078
                // 64
                0x0f00000000,
                0xf000000000,
                0x175c9065669 // Date.now()
            ];

            for (const num of values) {
                it('0x' + num.toString(16), () =>
                    assert.strictEqual(roundTrip(num), num)
                );
                it('-0x' + num.toString(16), () =>
                    assert.strictEqual(roundTrip(-num), num === 0 ? 0 : -num)
                );
            }

            it('18446744073709552000', () =>
                assert.strictEqual(roundTrip(18446744073709552000), 18446744073709552000)
            );
        });

        describe('float', () => {
            const values = [
                // float32
                0.0,
                0.1,
                0.25,
                0.6,
                2.5,
                999.5,
                // float64
                10 / 3,
                1e-10
            ];

            for (const num of values) {
                it(String(num), () =>
                    assert.strictEqual(roundTrip(num), num)
                );
                it(String(-num), () =>
                    assert.strictEqual(roundTrip(-num), num === 0 ? 0 : -num)
                );
            }
        });
    });

    describe('array', () => {
        const values = [
            [],

            // numeric
            [1],
            [1, 2],
            [1, 2, 3],
            [1, 2, 3, 4],
            [1, 2, 3, 4, 5],
            [-3, -2, -1, 0, 1, 2, 3],
            [-300000, -200000, -100000, 0, 100000, 200000, 300000],
            [-3, 2, -1, 0, 1, -2, 3],
            [-300000, 200000, -100000, 0, 100000, -200000, 300000],
            [1, 2, 1000000, -1500.123, 1.5],
            [0x0100, 0x0200, 0x0300],
            [0x010000, 0x020000, 0x030000],
            [0x01, 0x0200, 0x030000],
            [1, -2, 3],
            [0x0100, -0x0200, 0x0300],
            [0x010000, -0x020000, 0x030000],
            [0x01, -0x0200, 0x030000],
            [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16],
            [1000, 1001, 1002, 1003, 1004, 1005, 1006, 1007, 1008, 1009, 1010, 1011, 1012, 1013, 1014, 1015, 1016],
            [100000, 100001, 100002, 100003, 100004, 100005, 100006, 100007, 100008, 100009, 100010, 100011, 100012, 100013, 100014, 100015, 100016],
            [1, 12, 23, 24, 35, 36, 47, 58, 69, 110, 211, 312, 413, 514, 515, 616],
            [1, 12, 3, 24, 135, 136, 47, 58, 269, 110, 211, 112, 213, 514, 115, 6],
            [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 15, 14, 13, 12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1, 0],
            [1, 12, 3, 212345324, 135, 444136, 47, 58, 269, 110, 1223211, 2000333112, 213, 514, 115, 6],
            [0, 1, 2, 3, 0, 1, 2, 3, 0, 0, 1, 1, 0, 2, 3, 3, 2, 1, 0],
            [0, -1, -2, -3, -1, -2, -3, -4, 1, 0, 0, 0, 0, 0, 0],
            [200000, 200001, 200002, 200003, 200000, 200001, 200002, 200003, 200000, 200000, 200001, 200001, 200000, 200002, 200003, 200003, 200002, 200001, 200000],
            [0, 200001, 0, 200003, 0, 200001, 0],
            [111, 111, 11, 11, 11111, 111, 1111111, 11111111, 11, 111111111, 88_000_000_000],
            [1590080817000, 1588834647000, 1588833937000, 1588833069000, 1588832161000, 123],
            [29534455421, 29534455482, 29534455501, 29534455520, 29534455539, 29534455577, 1812495676, 29534455726, 1812495688, 58664864, 7449643, 1812495721, 29534455798, 1812495730],

            // len=2 types=2
            [1, true],
            [true, 1],
            // len=3 types=2
            [1, true, true],
            [true, 1, true],
            [true, true, 1],
            // len=3 types=3
            [1, true, 'test'],
            [1, 'test', true],
            ['test', 1, true],
            [true, 1, 'test'],
            [true, 'test', 1],
            ['test', true, 1],
            // len=4 types=2
            [1, 2, 'foo', 'bar'],
            [1, 'foo', 2, 'bar'],
            ['foo', 1, 2, 'bar'],
            ['foo', 1, 'bar', 2],
            ['foo', 'bar', 1, 2],
            // len=4 types=3
            [1, true, 'foo', 'bar'],
            [true, 1, 'foo', 'bar'],
            [true, 'foo', 1, 'bar'],
            [true, 'foo', 'bar', 1],
            ['foo', true, 'bar', 1],
            ['foo', 'bar', true, 1],
            // len=4 types=4
            [1, true, 'foo', false],
            [true, 1, 'foo', false],
            [true, 'foo', 1, false],
            [true, 'foo', false, 1],
            ['foo', true, false, 1],
            ['foo', false, true, 1],
            [1, true, 'foo', null],
            [true, 1, 'foo', null],
            [true, 'foo', 1, null],
            [true, 'foo', null, 1],
            ['foo', true, null, 1],
            ['foo', null, true, 1],

            // other
            [1, 2, 3, false, 'str'],
            [1, 1000, 1000000, false, 'str', '0123456789'.repeat(10)],
            ['foo', 'bar', 'baz'],
            ['foo', 'foo', 'foo'],

            // strings with common prefix/postfix
            [
                'foo/bar', 'foo/bar/baz', 'foo/bar/baz/qux', 'foo/bar/a/b/c/d',
                'hello', 'hello world', 'world',
                'foo/bar/123'
            ],
            ['foo/barbar', 'foo/baz/barbar', 'fooooo/bar/baz/arbar', 'foo/bar/a/b/c/d', 'a/b/c/d'],
            ['hello', 'hello world', 'hello - abc - world', 'hello - world', 'world']
        ];

        for (const value of values) {
            it(JSON.stringify(value), () =>
                assert.deepStrictEqual(roundTrip(value), value)
            );
        }

        it('converting to null values [undefined, () => {}, Symbol()]', () => {
            const value = [undefined, () => {}, Symbol()];
            assert.deepStrictEqual(roundTrip(value), value.map(() => null));
        });
    });

    describe('array with undefined', () => {
        const values = [
            [undefined],

            // len=2
            [undefined, undefined],
            [undefined, 1],
            [1, undefined],

            // len=3
            [undefined, undefined, undefined],
            [1, undefined, undefined],
            [undefined, 1, undefined],
            [undefined, undefined, 1],

            // len=4
            [undefined, undefined, undefined, undefined],
            [1, undefined, undefined, undefined],
            [undefined, 1, undefined, undefined],
            [undefined, undefined, 1, undefined],
            [undefined, undefined, undefined, 1]
        ];

        for (const value of values) {
            const asObjectProperty = value.map(val => ({ prop: val }));

            it(JSON.stringify(value).replace(/null/g, 'undefined'), () =>
                assert.deepStrictEqual(roundTrip(value), roundTripJson(value))
            );

            it(JSON.stringify(asObjectProperty), () =>
                assert.deepStrictEqual(roundTrip(asObjectProperty), roundTripJson(asObjectProperty))
            );
        }
    });

    describe('object', () => {
        const values = [
            {},
            { foo: 'bar' },
            {
                zero: 0,
                uint8: 123,
                uint16: 12345,
                uint24: 123456,
                uint32: 0x3fff_ffff,
                uint32var: 0x3fff_ffff_ffff,
                int8: -123,
                int16: -12345,
                int24: -123456,
                int32: -0x3fff_ffff,
                int32var: -0x3fff_ffff_ffff,
                float32: 1 / 2,
                float64: 1 / 3,
                str: 'str',
                bool: false,
                bool2: true,
                null: null
            },
            { array: [1, 1000, 1000000], obj: { foo: 123 } },
            {
                foo: {
                    foo: {
                        foo: { foo: 1 },
                        bar: { bar: 'test', foo: 'a', baz: true },
                        baz: { baz: { bar: true, foo: false} },
                        qux: { bar: 2, foo: 'b' }
                    }
                }
            }
        ];

        for (const value of values) {
            it(JSON.stringify(value), () =>
                assert.deepStrictEqual(roundTrip(value), value)
            );
        }

        it('a lot of defs & refs [{ field0 }, { field0 } ..., { fieldN }, { fieldN }]', () => {
            const dict = Array.from({ length: 300 }, (_, idx) => ({ ['field' + idx]: idx }));
            const value = [...dict, ...dict];

            assert.deepStrictEqual(
                roundTrip(value),
                value
            );
        });

        it('{ foo: undefined, bar: 1, baz: undefined, fn() {}, sym: Symbol() }', () =>
            assert.deepStrictEqual(
                roundTrip({ foo: undefined, bar: 1, baz: undefined, fn() {}, sym: Symbol() }),
                { bar: 1 }
            )
        );
    });

    describe('array with objects', () => {
        const testcaseGroups = {
            'a single shape': [
                [
                    { foo: 1, bar: 'baz' }
                ],
                [
                    { foo: 1, bar: 'baz' },
                    { foo: 2, bar: 'qux' }
                ],
                [
                    { foo: 1, bar: 'baz' },
                    { foo: 2, bar: 'qux' },
                    { foo: 3, bar: 'baz' }
                ],
                [
                    { foo: 1, bar: 'baz' },
                    { foo: 2, bar: 'qux' },
                    { foo: 3, bar: 'baz' },
                    { foo: 4, bar: 'qux' }
                ]
            ],

            'different types': [
                [
                    { foo: 1, bar: 'baz', flag: true },
                    { foo: 2000, bar: 'qux', flag: false }
                ],
                [
                    { foo: 1, bar: 'baz', flag: true },
                    { foo: 2000, bar: 'qux', flag: false },
                    { foo: 3, bar: 'baz', flag: true }
                ],
                [
                    { foo: 1, bar: 'baz', flag: true },
                    { foo: 2000, bar: 'qux', flag: false },
                    { foo: 3, bar: 'baz', flag: true },
                    { foo: 4, bar: 'qux', flag: false }
                ],
                [
                    { foo: 1, bar: 'baz', flag: true },
                    { foo: 2000, bar: 'qux', flag: false },
                    { foo: 30000, bar: 'baz', flag: null },
                    { foo: 4, bar: 'qux', flag: 1 }
                ]
            ],

            'different shapes & types': [
                [
                    { foo: 1, bar: 'baz' },
                    { foo: 2000, flag: false }
                ],
                [
                    { foo: 1, flag: true },
                    { foo: 2000, bar: 'qux', flag: false },
                    { bar: 'baz', flag: true }
                ],
                [
                    { foo: 1, bar: 'baz', flag: true },
                    { foo: 2000, flag: false },
                    { foo: 3, bar: 'baz', flag: true, more: [1, 2] },
                    { foo: 4, bar: 'qux', undef: undefined, more: true }
                ],
                [
                    { foo: 1, bar: 'baz', flag: true },
                    { foo: 2000, flag: false },
                    { foo: 3, bar: 'baz', flag: true, more: [1, 2] },
                    { foo: 4, bar: 'qux', undef: undefined, more: true },
                    { foo: 5, bar: 'qux', undef: undefined, more: [1, 2, 3] }
                ],
                [
                    { foo: 1, bar: 'baz', flag: true },
                    { foo: 2000, flag: false },
                    { foo: 3, bar: 'baz', flag: true, more: [1, 2] },
                    { foo: 4, bar: 'qux', undef: undefined, more: 123 },
                    { foo: 5, bar: 'qux', undef: undefined, more: [1, 2, 3] }
                ],
                [
                    { foo: 1, more: [] },
                    { foo: 2, more: [1] },
                    { foo: 3, more: [1, 2] },
                    { foo: 4, more: [1, 2, 3] },
                    { foo: 5, more: [1, 2, 3, 4] }
                ],
                [ // object + null + hole
                    { foo: { id: 1 } },
                    { foo: { id: 2 } },
                    { foo: null },
                    { },
                    { foo: { id: 3 } },
                    { foo: { id: 4 } },
                    { foo: { id: 5 } }
                ]
            ],

            'nested objects': [
                [ // 0
                    { foo: 1, obj: { foo: 2, test: true } }
                ],
                [ // 1
                    { foo: 1, obj: { foo: 2, test: true } },
                    { foo: 3, obj: { foo: 4, test: false, qux: 123 } }
                ],
                [ // 2
                    { foo: 1, obj: { foo: 2, test: true } },
                    { foo: 3, obj: { foo: 4, test: true, qux: 123 } },
                    { foo: 5, obj: { foo: 6, test: true }, more: true }
                ],
                [ // 3
                    { foo: 1, obj: { foo: 2, test: true } },
                    { foo: 3, obj: { foo: 4, test: true, qux: 123 } },
                    { foo: 5, obj: { foo: 6, test: true }, more: true },
                    { foo: 7, obj: { foo: 8, test: true }, obj2: { test: true } }
                ],
                [ // 4
                    { foo: 1, obj: { foo: 2, test: true }, obj2: { test: false } },
                    { foo: 3, obj: { foo: 4, test: true, qux: 123 } },
                    { foo: 5, obj: { foo: 6, test: true }, more: true },
                    { foo: 7, obj: { foo: 8, test: true }, obj2: { test: true } }
                ],
                [ // 5
                    {
                        wrapper: [
                            { foo: 1, obj: { foo: 2, test: true, obj2: { test: false } } },
                            { foo: 3, obj: { foo: 4, test: true, obj2: { test: true }, qux: 123 } },
                            { foo: 5, obj: { foo: 6, test: false }, more: true },
                            { foo: 7, obj: { foo: 8, test: true, obj2: { test: true } } }
                        ],
                        test1: 'hello world',
                        foo: [
                            { foo: 1, obj: { a: false } },
                            { foo: 3 },
                            null,
                            { foo: 5, obj: { a: false } },
                            undefined,
                            { foo: 7, obj: { b: true } }
                        ],
                        test2: 'hello world',
                        array: [1, 2, 3]
                    }
                ],
                [ // 6
                    { foo: 1, obj: { foo: 2, test: true }, obj2: { test: false } },
                    { foo: 3, obj: { foo: 4, test: true, qux: 123 } },
                    null,
                    { foo: 5, more: true },
                    null,
                    { foo: 7, obj: { foo: 8, test: null }, obj2: { test: true } }
                ],
                [ // 7
                    { foo: 1, obj: { foo: 2, test: true }, obj2: { test: false } },
                    { foo: 3, obj: { foo: 4, test: true, qux: 123 } },
                    null,
                    { foo: 5, more: true },
                    null,
                    { foo: 7, obj: { foo: 8, test: null }, obj2: { test: true } },
                    { foo: 7, obj: { foo: 8, test: true }, obj2: { test: true } }
                ],
                [ // 8
                    { callFrame: {} },
                    { callFrame: {} },
                    { callFrame: {
                        lineTicks: [
                            { line: 96 },
                            { line: 97 },
                            { line: 76 },
                            { line: 78 },
                            { line: 538 }
                        ]
                    } },
                    { callFrame: {} }
                ]
            ]
        };

        for (const [title, testcases] of Object.entries(testcaseGroups)) {
            describe(title, () => {
                for (const [idx, value] of Object.entries(testcases)) {
                    it(`(${idx}) ${JSON.stringify(value)}`, () =>
                        assert.deepStrictEqual(roundTrip(value), roundTripJson(value))
                    );
                }
            });
        }
    });

    describe('array with arrays', () => {
        const testcaseGroups = {
            'array of numbers': [
                [[1, 2, 3], [4, 5, 6]],
                [[1, 2, 3], null, [4, 5, 6]]
            ]
        };

        for (const [title, testcases] of Object.entries(testcaseGroups)) {
            describe(title, () => {
                for (const [idx, value] of Object.entries(testcases)) {
                    it(`(${idx}) ${JSON.stringify(value)}`, () =>
                        assert.deepStrictEqual(roundTrip(value), roundTripJson(value))
                    );
                }
            });
        }
    });

    describe('writer', () => {
        describe('dynamic size', () => {
            describe('raw', () => {
                it('on size', () => {
                    const writer = new WriterBackend(7);
                    writer.writeUint32(0x01020304);
                    assert.deepStrictEqual(writer.emit(), Buffer.from([4, 3, 2, 1]));
                });

                it('over size', () => {
                    const writer = new WriterBackend(7);
                    writer.writeUint32(0x01020304);
                    writer.writeUint32(0x01020304);
                    assert.deepStrictEqual(writer.emit(), Buffer.from([4, 3, 2, 1, 4, 3, 2, 1]));
                });

                it('default size', () => {
                    const writer = new WriterBackend(5);
                    writer.writeUint64(0x0102030405060708);
                    assert.deepStrictEqual(writer.emit(), Buffer.from([0, 7, 6, 5, 4, 3, 2, 1]));
                });

                it('fail after second getting value', () => {
                    const writer = new WriterBackend(7);
                    writer.writeUint32(0x01020304);
                    assert.deepStrictEqual(writer.emit(), Buffer.from([4, 3, 2, 1]));
                    assert.throws(() => writer.emit());
                });
            });

            describe('string', () => {
                it('fit to chunk size', () => {
                    const writer = new WriterBackend(7);
                    writer.writeString('1234');

                    assert.deepStrictEqual(writer.emit(), Buffer.from([49, 50, 51, 52]));
                });

                it('over size', () => {
                    const writer = new WriterBackend(4);
                    writer.writeString('123');
                    writer.writeString('123');
                    writer.writeString('1234567');
                    writer.writeString('12345678');
                    writer.writeString('123456789999999999999999');

                    assert.deepStrictEqual(writer.emit(), Buffer.from([
                        49, 50, 51, // 123
                        49, 50, 51, // 123
                        49, 50, 51, 52, 53, 54, 55, // 1234567 (without tail)
                        49, 50, 51, 52, 53, 54, 55, 56, // 12345678 (write tail (8) into another chunk)
                        49, 50, 51, 52, 53, 54, 55, 56, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57 // 123456789999999999999999 (write tail into another chunks)
                    ]));
                });
            });
        });
    });
});

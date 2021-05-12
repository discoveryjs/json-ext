const assert = require('assert');
const { inspect } = require('util');
const { Readable } = require('stream');
const { parseChunked } = require('./helpers/lib');
const { TextEncoder } = require('util');

function createReadableStream(chunks) {
    return new Readable({
        read() {
            const value = chunks.shift() || null;

            if (value instanceof Error) {
                return this.destroy(value);
            }

            this.push(value);
        }
    });
}

function parse(chunks) {
    return parseChunked(() => chunks);
}

function split(str, chunkLen = 1) {
    const chunks = [];

    for (let i = 0; i < str.length; i += chunkLen) {
        chunks.push(str.slice(i, i + chunkLen));
    }

    return chunks;
}

describe('parseChunked()', () => {
    const values = [
        1,
        123,
        -123,
        0.5,
        -0.5,
        1 / 33,
        -1 / 33,
        true,
        false,
        null,
        '',
        'test',
        'hello world',
        '🤓漢字',
        '\b\t\n\f\r"\\\\"\\u0020', // escapes
        '\u0000\u0010\u001F\u009F',
        '\uD800\uDC00',  // surrogate pair
        '\uDC00\uD800',  // broken surrogate pair
        '\uD800',  // leading surrogate (broken surrogate pair)
        '\uDC00',  // trailing surrogate (broken surrogate pair)
        '\\\\\\"\\\\"\\"\\\\\\',
        {},
        { a: 1 },
        { a: 1, b: 2 },
        { a: { b: 2 } },
        { 'te\\u0020st\\"': 'te\\u0020st\\"' },
        [],
        [1],
        [1, 2],
        [1, [2, [3]]],
        [{ a: 2, b: true }, false, '', 12, [1, null]],
        [1, { a: [true, { b: 1, c: [{ d: 2 }] }, 'hello  world\n!', null, 123, [{ e: '4', f: [] }, [], 123, [1, false]]] }, 2, { g: 5 }, [42]]
    ];

    describe('basic parsing (single chunk)', () => {
        for (const expected of values) {
            const json = JSON.stringify(expected);
            it(json, async () => {
                const actual = await parse([json]);
                assert.deepStrictEqual(actual, expected);
            });
        }
    });

    for (const len of [1, 2, 3, 4, 5, 10]) {
        describe(len + ' char(s) length chunks', () => {
            for (const expected of values) {
                const json = JSON.stringify(expected);

                if (json.length > len) {
                    it(json, async () => assert.deepStrictEqual(await parse(split(json, len)), expected));
                }
            }
        });
    }

    for (const len of [1, 2, 3, 4, 5, 10]) {
        describe(len + ' char(s) length chunks with formatting', () => {
            for (const expected of values) {
                const json = JSON.stringify(expected, null, '\r\n\t ');
                const nofmt = JSON.stringify(expected);

                if (json.length > len && json !== nofmt) {
                    it(json, async () => assert.deepStrictEqual(await parse(split(json, len)), expected));
                }
            }
        });
    }

    describe('splitting on whitespaces', () => {
        describe('inside an object and strings', () => {
            const expected = { ' \r\n\t': ' \r\n\t', a: [1, 2] };
            const json = ' \r\n\t{ \r\n\t" \\r\\n\\t" \r\n\t: \r\n\t" \\r\\n\\t" \r\n\t, \r\n\t"a": \r\n\t[ \r\n\t1 \r\n\t, \r\n\t2 \r\n\t] \r\n\t} \r\n\t';

            for (let len = 0; len <= json.length; len++) {
                it(len ? len + ' char(s) length chunks' : 'parse full', async () =>
                    assert.deepStrictEqual(await parse(len ? split(json, len) : [json]), expected)
                );
            }
        });

        describe('between objects and arrays', () => {
            const expected = [{}, {}, {}, [], [], [], {}];
            const json = '[{} \r\n\t, {}, \r\n\t {} \r\n\t, [], \r\n\t [] \r\n\t, [] \r\n\t, {} \r\n\t]';

            for (let len = 0; len <= json.length; len++) {
                it(len ? len + ' char(s) length chunks' : 'parse full', async () =>
                    assert.deepStrictEqual(await parse(len ? split(json, len) : [json]), expected)
                );
            }
        });
    });

    describe('errors', () => {
        it('abs pos across chunks', () =>
            assert.rejects(
                async () => await parse(['{"test":"he', 'llo",}']),
                /Unexpected token \} in JSON at position 16/
            )
        );
        it('abs pos across chunks #2', () =>
            assert.rejects(
                async () => await parse(['[{"test":"hello"},', ',}']),
                /Unexpected token , in JSON at position 18/
            )
        );
        it('abs pos across chunks #3 (whitespaces)', () =>
            assert.rejects(
                async () => await parse(['[{"test" ', ' ', ' :"hello"} ', ' ', ',', ' ', ',}']),
                /Unexpected token , in JSON at position 24/
            )
        );
        it('should fail when starts with a comma', () =>
            assert.rejects(
                async () => await parse([',{}']),
                /Unexpected token , in JSON at position 0/
            )
        );
        it('should fail when starts with a comma #2', () =>
            assert.rejects(
                async () => await parse([',', '{}']),
                /Unexpected token , in JSON at position 0/
            )
        );
        it('should fail when no comma', () =>
            assert.rejects(
                async () => await parse(['[1 ', ' 2]']),
                /Unexpected number in JSON at position 4/
            )
        );
        it('should fail when no comma #2', () =>
            assert.rejects(
                async () => await parse(['[{}', '{}]']),
                /Unexpected token { in JSON at position 3/
            )
        );
    });

    describe('use with buffers', () => {
        const input = '[1234,{"🤓\\uD800\\uDC00":"🤓\\uD800\\uDC00\u1fff"}]';
        const expected = [1234, { '🤓\uD800\uDC00': '🤓\uD800\uDC00\u1fff' }];
        const slices = [
            [0, 3],   // [12
            [3, 9],   // 34,{"\ud8
            [9, 13],  // 3e\udd13
            [13, 16], // \uD800\uDC00
            [16, 17],
            [17, 18],
            [18]
        ];

        it('Buffer', async () => {
            const buffer = Buffer.from(input);
            const actual = await parseChunked(() => slices.map(([...args]) => buffer.slice(...args)));

            assert.deepStrictEqual(actual, expected);
        });

        it('Uint8Array', async () => {
            const encoded = new TextEncoder().encode(input);
            const actual = await parseChunked(() => slices.map(([...args]) => encoded.slice(...args)));

            assert.deepStrictEqual(actual, expected);
        });
    });

    describe('use with stream', () => {
        it('basic usage', async () => {
            const actual = await parseChunked(createReadableStream(['[1,', '2]']));
            assert.deepStrictEqual(actual, [1, 2]);
        });

        it('with failure in JSON', () =>
            assert.rejects(
                () => parseChunked(createReadableStream(['[1 ', '2]'])),
                /Unexpected number in JSON at position 3/
            )
        );

        it('with failure in stream', () =>
            assert.rejects(
                () => parseChunked(createReadableStream([new Error('test error in stream')])),
                /test error in stream/
            )
        );
    });

    describe('use with generator', () => {
        it('basic usage', async () => {
            const actual = await parseChunked(function*() {
                yield '[1,';
                yield '2]';
            });
            assert.deepStrictEqual(actual, [1, 2]);
        });

        it('promise should be resolved', async () => {
            const actual = await parseChunked(function*() {
                yield '[1,';
                yield Promise.resolve('2]');
            });
            assert.deepStrictEqual(actual, [1, 2]);
        });

        it('with failure in JSON', () =>
            assert.rejects(
                () => parseChunked(function*() {
                    yield '[1 ';
                    yield '2]';
                }),
                /Unexpected number in JSON at position 3/
            )
        );

        it('with failure in generator', () =>
            assert.rejects(
                () => parseChunked(function*() {
                    yield '[1 ';
                    throw new Error('test error in generator');
                }),
                /test error in generator/
            )
        );
    });

    describe('use with async generator', () => {
        it('basic usage', async () => {
            const actual = await parseChunked(async function*() {
                yield await Promise.resolve('[1,');
                yield Promise.resolve('2,');
                yield await '3,';
                yield '4]';
            });
            assert.deepStrictEqual(actual, [1, 2, 3, 4]);
        });

        it('with failure in JSON', () =>
            assert.rejects(
                () => parseChunked(async function*() {
                    yield await Promise.resolve('[1 ');
                    yield '2]';
                }),
                /Unexpected number in JSON at position 3/
            )
        );

        it('with failure in generator', () =>
            assert.rejects(
                () => parseChunked(async function*() {
                    yield '[1 ';
                    throw new Error('test error in generator');
                }),
                /test error in generator/
            )
        );

        it('with reject in generator', () =>
            assert.rejects(
                () => parseChunked(async function*() {
                    yield Promise.reject('test error in generator');
                }),
                /test error in generator/
            )
        );
    });

    describe('use with a function returns iterable object', () => {
        it('array', async () => {
            const actual = await parseChunked(() => ['[1,', '2]']);
            assert.deepStrictEqual(actual, [1, 2]);
        });

        it('iterator method', async () => {
            const actual = await parseChunked(() => ({
                *[Symbol.iterator]() {
                    yield '[1,';
                    yield '2]';
                }
            }));
            assert.deepStrictEqual(actual, [1, 2]);
        });
    });

    describe('should fail when passed value is not supported', () => {
        const badValues = [
            undefined,
            null,
            123,
            '[1, 2]',
            ['[1, 2]'],
            () => {},
            () => ({}),
            () => '[1, 2]',
            () => 123,
            { on() {} }
        ];

        for (const value of badValues) {
            it(inspect(value), () =>
                assert.throws(
                    () => parseChunked(value),
                    /Chunk emitter should be readable stream, generator, async generator or function returning an iterable object/
                )
            );
        }
    });

    describe('should not fail on very long arrays (stack overflow)', () => {
        it('the same depth', async () => {
            const size = 150000;
            const actual = await parseChunked(() => ['[1', ',2'.repeat(size - 1), ']']);
            assert.deepStrictEqual(actual.length, size);
        });
        it('increment depth', async () => {
            const size = 150000;
            const actual = await parseChunked(() => ['[', '2,'.repeat(size - 1) + '{"a":1', '}]']);
            assert.deepStrictEqual(actual.length, size);
        });
        it('decrement depth', async () => {
            const size = 150000;
            const actual = await parseChunked(() => ['[1', ',2'.repeat(size - 1) + ']']);
            assert.deepStrictEqual(actual.length, size);
        });
    });
});

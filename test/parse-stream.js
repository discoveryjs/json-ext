const assert = require('assert');
const { inspect } = require('util');
const { Readable } = require('stream');
const { parseStream } = require('./helpers/lib');

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
    return parseStream(() => chunks);
}

function split(str, chunkLen = 1) {
    const chunks = [];

    for (let i = 0; i < str.length; i += chunkLen) {
        chunks.push(str.slice(i, i + chunkLen));
    }

    return chunks;
}

describe.only('parseStream()', () => {
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
        '🤓漢字',
        '\b\t\n\f\r"\\\\"\\u0020', // escapes
        '\u0000\u0010\u001F\u009F',
        '\uD800\uDC00',  // surrogate pair
        '\uDC00\uD800',  // broken surrogate pair
        '\uD800',  // leading surrogate (broken surrogate pair)
        '\uDC00',  // trailing surrogate (broken surrogate pair)
        {},
        { a: 1 },
        { a: 1, b: 2 },
        { a: { b: 2 } },
        { 'te\\u0020st\\"': 'te\\u0020st\\"' },
        [],
        [1],
        [1, 2],
        [1, [2, [3]]],
        [{ a: 2, b: true }, false, '', 12, [1, null]]
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

                if (json.length > len) {
                    it(json, async () => assert.deepStrictEqual(await parse(split(json, len)), expected));
                }
            }
        });
    }

    describe('errors', () => {
        it('abs pos across chunks', () => {
            assert.rejects(
                async () => await parse(['{"test":"he', 'llo",}']),
                /Unexpected \} in JSON at position 16/
            );
        });
    });

    describe('use with buffers', () => {
        const input = '[1234,{"🤓\\uD800\\uDC00":"🤓\\uD800\\uDC00"}]';
        const expected = [1234, { '🤓\uD800\uDC00': '🤓\uD800\uDC00' }];
        const slices = [
            [0, 3],   // [12
            [3, 9],   // 34,{"\ud8
            [9, 13],  // 3e\udd13
            [13, 16], // \uD800\uDC00
            [16]
        ];

        it('Buffer', async () => {
            const buffer = Buffer.from(input);
            const actual = await parseStream(() => slices.map(([...args]) => buffer.slice(...args)));

            assert.deepStrictEqual(actual, expected);
        });

        it('Uint8Array', async () => {
            const encoded = new TextEncoder().encode(input);
            const actual = await parseStream(() => slices.map(([...args]) => encoded.slice(...args)));

            assert.deepStrictEqual(actual, expected);
        });
    });

    describe('use with stream', () => {
        it('basic usage', async () => {
            const actual = await parseStream(createReadableStream(['[1,', '2]']));
            assert.deepStrictEqual(actual, [1, 2]);
        });

        it('with failure in JSON', () =>
            assert.rejects(
                () => parseStream(createReadableStream(['[1 ', '2]'])),
                /Unexpected 2 in JSON at position 3/
            )
        );

        it('with failure in stream', () =>
            assert.rejects(
                () => parseStream(createReadableStream([new Error('test error in stream')])),
                /test error in stream/
            )
        );
    });

    describe('use with generator', () => {
        it('basic usage', async () => {
            const actual = await parseStream(function*() {
                yield '[1,';
                yield '2]';
            });
            assert.deepStrictEqual(actual, [1, 2]);
        });

        it('promise should be resolved', async () => {
            const actual = await parseStream(function*() {
                yield '[1,';
                yield Promise.resolve('2]');
            });
            assert.deepStrictEqual(actual, [1, 2]);
        });

        it('with failure in JSON', () =>
            assert.rejects(
                () => parseStream(function*() {
                    yield '[1 ';
                    yield '2]';
                }),
                /Unexpected 2 in JSON at position 3/
            )
        );

        it('with failure in generator', () =>
            assert.rejects(
                () => parseStream(function*() {
                    yield '[1 ';
                    throw new Error('test error in generator');
                }),
                /test error in generator/
            )
        );
    });

    describe('use with async generator', () => {
        it('basic usage', async () => {
            const actual = await parseStream(async function*() {
                yield await Promise.resolve('[1,');
                yield Promise.resolve('2,');
                yield await '3,';
                yield '4]';
            });
            assert.deepStrictEqual(actual, [1, 2, 3, 4]);
        });

        it('with failure in JSON', () =>
            assert.rejects(
                () => parseStream(async function*() {
                    yield await Promise.resolve('[1 ');
                    yield '2]';
                }),
                /Unexpected 2 in JSON at position 3/
            )
        );

        it('with failure in generator', () =>
            assert.rejects(
                () => parseStream(async function*() {
                    yield '[1 ';
                    throw new Error('test error in generator');
                }),
                /test error in generator/
            )
        );

        it('with reject in generator', () =>
            assert.rejects(
                () => parseStream(async function*() {
                    yield Promise.reject('test error in generator');
                }),
                /test error in generator/
            )
        );
    });

    describe('use with a function returns iterable object', () => {
        it('array', async () => {
            const actual = await parseStream(() => ['[1,', '2]']);
            assert.deepStrictEqual(actual, [1, 2]);
        });

        it('iterator method', async () => {
            const actual = await parseStream(() => ({
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
                    () => parseStream(value),
                    /Chunk emitter should be readable stream, generator, async generator or function returning an iterable object/
                )
            );
        }
    });
});

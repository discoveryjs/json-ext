const assert = require('assert');
const { createChunkParser } = require('./helpers/lib');

function parse(chunks) {
    const { push, finish } = createChunkParser();

    if (!Array.isArray(chunks)) {
        chunks = [chunks];
    }

    chunks.forEach(c => push(c));

    return finish();
}

function split(str, chunkLen = 1) {
    const chunks = [];

    for (let i = 0; i < str.length; i += chunkLen) {
        chunks.push(str.slice(i, i + chunkLen));
    }

    return chunks;
}

describe.only('ParseStream', () => {
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
            it(json, () => {
                const actual = parse([json]);
                assert.deepStrictEqual(actual, expected);
            });
        }
    });

    for (const len of [1, 2, 3, 4, 5, 10]) {
        describe(len + ' char(s) length chunks', () => {
            for (const expected of values) {
                const json = JSON.stringify(expected);

                if (json.length > len) {
                    it(json, () => assert.deepStrictEqual(parse(split(json, len)), expected));
                }
            }
        });
    }

    for (const len of [1, 2, 3, 4, 5, 10]) {
        describe(len + ' char(s) length chunks with formatting', () => {
            for (const expected of values) {
                const json = JSON.stringify(expected, null, '\r\n\t ');

                if (json.length > len) {
                    it(json, () => assert.deepStrictEqual(parse(split(json, len)), expected));
                }
            }
        });
    }

    describe('errors', () => {
        it('abs pos across chunks', () => {
            assert.throws(() => parse(['{"test":"he', 'llo",}']), /Unexpected \} in JSON at position 16/);
        });
    });

    describe('promise', () => {
        it('resolve', () => {
            const { push, promise } = createChunkParser();

            push('{"ok":true}', true);

            return promise.then(value => {
                assert.deepStrictEqual(value, { ok: true });
            });
        });
    });
});

const assert = require('assert');
const { ParseStream } = require('./helpers/lib');

function parse(chunks) {
    const parser = new ParseStream();

    if (!Array.isArray(chunks)) {
        chunks = [chunks];
    }

    chunks.forEach(c => parser.push(c));
    parser.finish();

    return parser.value;
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
        {},
        { a: 1 },
        { a: 1, b: 2 },
        { a: { b: 2 } },
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
                const json = JSON.stringify(expected, null, '\n\t \r\u2028\u2029');

                if (json.length > len) {
                    it(json, () => assert.deepStrictEqual(parse(split(json, len)), expected));
                }
            }
        });
    }
});

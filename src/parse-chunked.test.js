import assert from 'assert';
import { Buffer } from 'buffer'; // needed for Deno
import { Readable } from 'stream';
import { inspect } from 'util';
import { parseChunked } from './parse-chunked.js';

function parse(chunks, options) {
    return parseChunked(() => chunks, options);
}

function split(str, chunkLen = 1) {
    const chunks = [];

    for (let i = 0; i < str.length; i += chunkLen) {
        chunks.push(str.slice(i, i + chunkLen));
    }

    return chunks;
}

function createReadableNodejsStream(chunks) {
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
        it('unmatched closing bracket at start', () =>
            assert.rejects(
                () => parseChunked([']']),
                /Unexpected token ] in JSON at position 0|Unexpected token ']'(, "]" is not valid JSON)?/
            )
        );

        it('unmatched closing brace at start', () =>
            assert.rejects(
                () => parseChunked(['}']),
                /Unexpected token } in JSON at position 0|Unexpected token '}'(, "}" is not valid JSON)?/
            )
        );

        it('extra token after complete value', () =>
            assert.rejects(
                () => parseChunked(['[] true']),
                /Unexpected token t in JSON at position 3|Unexpected token t in JSON at position 6|Unexpected non-whitespace character after JSON at position 3|Unable to parse JSON string/
            )
        );

        describe('unexpected end of input', () => {
            const cases = {
                '': /Unexpected end of JSON input|Unexpected EOF/,
                ' ': /Unexpected end of JSON input|Unexpected EOF/,
                '{"a":1': /Expected ',' or '}' after property value in JSON|Unexpected end of JSON input|Expected '}'/,
                '{"a":1,': /Expected property name or '}'|Unexpected end of JSON input|Expected '}'/,
                '{"a":': /Unexpected end of JSON input|Unexpected end of JSON input|Unexpected EOF/,
                '{"a"': /Expected ':' after property name in JSON|Expected ':' before value in object property definition|Unexpected end of JSON input/,
                '{"a",': /Expected ':' after property name in JSON|Expected ':' before value in object property definition|Unexpected token }/, // FIXME: "Unexpected token }" is confusing error in old V8, because of `{"a"}`
                '[1': /Expected ',' or ']' after array element|Unexpected end of JSON input|Expected ']'/,
                '[1,': /Unexpected end of JSON input|Unexpected EOF/,
                '"a': /Unterminated string|Unexpected end of JSON input/,
                'nul': /Unexpected end of JSON input|Unexpected identifier/,
                'tru': /Unexpected end of JSON input|Unexpected identifier/,
                'fals': /Unexpected end of JSON input|Unexpected identifier/,
                '1.': /Unterminated fractional number|Invalid digits after decimal point|Unexpected end of JSON input/,
                '1e': /Exponent part is missing a number|Unable to parse JSON string|Unexpected end of JSON input/
            };

            for (const [json, regex] of Object.entries(cases)) {
                it('unexpected end of JSON input `' + json + '`', () =>
                    assert.rejects(
                        () => parseChunked([json]),
                        regex
                    )
                );
            }
        });

        it('extra opening after root', () =>
            assert.rejects(
                () => parseChunked(['{}[']),
                /Unexpected token \[ in JSON at position 2|Unexpected non-whitespace character after JSON at position 2|Unable to parse JSON string/
            )
        );

        it('abs pos across chunks', () =>
            assert.rejects(
                async () => await parse(['{"test":"he', 'llo",}']),
                /(Unexpected token \}|Expected double-quoted property name) in JSON at position 16|Property name must be a string literal/
            )
        );

        it('abs pos across chunks #2', () =>
            assert.rejects(
                async () => await parse(['[{"test":"hello"},', ',}']),
                /Unexpected token , in JSON at position 18|Unexpected token ','(, "\[,}" is not valid JSON)?$|/
            )
        );

        it('abs pos across chunks #3 (whitespaces)', () =>
            assert.rejects(
                async () => await parse(['[{"test" ', ' ', ' :"hello"} ', ' ', ',', ' ', ',}']),
                /Unexpected token , in JSON at position 24|Unexpected token ','(, "\[,}" is not valid JSON)?$/
            )
        );

        it('should fail when starts with a comma', () =>
            assert.rejects(
                async () => await parse([',{}']),
                /Unexpected token , in JSON at position 0|Unexpected token ','(, ",{}" is not valid JSON)?$/
            )
        );

        it('should fail when starts with a comma #2', () =>
            assert.rejects(
                async () => await parse([',', '{}']),
                /Unexpected token , in JSON at position 0|Unexpected token ','(, ",{}" is not valid JSON)?$/
            )
        );

        it('should fail when comma in object', () =>
            assert.rejects(
                async () => await parse(['{,}']),
                /Expected property name or '}' in JSON at position 1|Unexpected token , in JSON at position 1|Expected '}'/
            )
        );

        it('should fail when no comma in an object', () =>
            assert.rejects(
                async () => await parse(['{"a":1 "b":2}']),
                /(Unexpected string|Expected ',' or '}' after property value) in JSON at position 7|Expected '}'/
            )
        );

        it('should fail when no comma in an array', () =>
            assert.rejects(
                async () => await parse(['[1 ', ' 2]']),
                /(Unexpected number|Expected ',' or ']' after array element) in JSON at position 4|Expected ']'/
            )
        );

        it('should fail when no comma in an array #2', () =>
            assert.rejects(
                async () => await parse(['[{}', '{}]']),
                /(Unexpected token {|Expected ',' or ']' after array element) in JSON at position 3|Expected ']'/
            )
        );
    });

    describe('trailing whitespace after full value', () => {
        it('spaces and newlines after array', async () => {
            const actual = await parse(['[1,2]\n\n  \t  ']);
            assert.deepStrictEqual(actual, [1, 2]);
        });

        it('split chunks with trailing whitespace', async () => {
            const actual = await parse(['[1,2]', '   ', '\n\t']);
            assert.deepStrictEqual(actual, [1, 2]);
        });
    });

    describe('chunk boundary for escapes and multi-byte utf-8', () => {
        it('escaped quote split', async () => {
            const actual = await parse(['"hello \\"', 'world"']);
            assert.deepStrictEqual(actual, 'hello "world');
        });

        it('backslash escape split across chunks', async () => {
            // create a string with a literal backslash then a quote and more text: "foo \"bar"
            const chunks = ['"foo \\"', 'bar"'];
            const actual = await parse(chunks);
            assert.deepStrictEqual(actual, 'foo "bar');
        });

        it('multi-byte emoji split across chunks', async () => {
            const json = JSON.stringify('a😅b');
            // split inside surrogate pair intentionally
            const first = json.slice(0, 4); // "a
            const middle = json.slice(4, 6); // first part of surrogate maybe
            const rest = json.slice(6);
            const actual = await parse([first, middle, rest]);
            assert.deepStrictEqual(actual, 'a😅b');
        });

        it('multi-byte via Uint8Array boundary', async () => {
            const str = '"start 🤓 end"';
            const enc = new TextEncoder().encode(str);
            // slice across multi-byte boundary of 🤓 (U+1F913)
            const idx = enc.indexOf(0xF0); // start of 4-byte sequence
            const part1 = enc.slice(0, idx + 2); // cut in middle of sequence
            const part2 = enc.slice(idx + 2);
            const actual = await parseChunked([part1, part2]);
            assert.deepStrictEqual(actual, 'start 🤓 end');
        });
    });

    describe('mode option', () => {
        describe('mode: "json"', () => {
            it('explicit JSON mode', async () => {
                const actual = await parse(['{"a":2}'], { mode: 'json' });
                assert.deepStrictEqual(actual, { a: 2 });
            });
        });

        describe('mode: "jsonl"', () => {
            it('returns empty array for empty input', async () => {
                const actual = await parse([], { mode: 'jsonl' });
                assert.deepStrictEqual(actual, []);
            });

            it('parses jsonl and always returns an array', async () => {
                const actual = await parse(['1\n{"a":2}\n[3]'], { mode: 'jsonl' });
                assert.deepStrictEqual(actual, [1, { a: 2 }, [3]]);
            });

            it('supports CR and CRLF as line separators', async () => {
                const actual = await parse(['1\r{"a":2}\r\n[3]'], { mode: 'jsonl' });
                assert.deepStrictEqual(actual, [1, { a: 2 }, [3]]);
            });

            it('returns array for a single value', async () => {
                const actual = await parse(['{"a":1}'], { mode: 'jsonl' });
                assert.deepStrictEqual(actual, [{ a: 1 }]);
            });

            it('supports chunk splits and empty lines', async () => {
                const actual = await parse(['{"a":1}\n', '\n', '2\n', '   \n', '3'], { mode: 'jsonl' });
                assert.deepStrictEqual(actual, [{ a: 1 }, 2, 3]);
            });

            it('parses multiple JSONL values with breaks in chunks', async () => {
                const actual = await parse(['{"a":{', '"b":', '1}}\n{"a":{', '"b":', '2}}'], { mode: 'jsonl' });
                assert.deepStrictEqual(actual, [{ a: { b: 1 } }, { a: { b: 2 } }]);
            });

            it('parses formatted JSONL values split into small chunks', async () => {
                const json = Array.from({ length: 3}, () => '[{} \r\n\t, {}, \r\n\t [] \r\n\t, {} \r\n\t]').join('\n');
                const actual = await parse(split(json, 5), { mode: 'jsonl' });
                assert.deepStrictEqual(actual, [
                    [{}, {}, [], {}],
                    [{}, {}, [], {}],
                    [{}, {}, [], {}]
                ]);
            });

            it('fails when JSONL values are not newline-separated', async () =>
                assert.rejects(
                    () => parse(['{"a":{', '"b":', '1}}{"a":{', '"b":', '2}}'], { mode: 'jsonl' }),
                    /Unexpected non-whitespace|Unable to parse JSON string|Unexpected token { in JSON at position 13/
                )
            );
        });

        describe('mode: "ndjson"', () => {
            it('alias for "jsonl"', async () => {
                const actual = await parse(['1\n{"a":2}\n[3]'], { mode: 'ndjson' });
                assert.deepStrictEqual(actual, [1, { a: 2 }, [3]]);
            });
        });

        describe('mode: "auto"', () => {
            it('parses normal JSON when there is no additional newline value', async () => {
                const expected = { a: [1, 2], b: true };
                const json = JSON.stringify(expected, null, 2);
                const actual = await parse(split(json, 3), { mode: 'auto' });
                assert.deepStrictEqual(actual, expected);
            });

            it('switches to jsonl on additional value after newline', async () => {
                const actual = await parse(['{"a":1}\n2\n[3]'], { mode: 'auto' });
                assert.deepStrictEqual(actual, [{ a: 1 }, 2, [3]]);
            });

            it('switches to jsonl on additional value after CR/CRLF newline', async () => {
                const actual = await parse(['{"a":1}\r2\r\n[3]'], { mode: 'auto' });
                assert.deepStrictEqual(actual, [{ a: 1 }, 2, [3]]);
            });

            it('switches to jsonl when newline and next value are in different chunks', async () => {
                const actual = await parse(['1', '\n', '2\n3'], { mode: 'auto' });
                assert.deepStrictEqual(actual, [1, 2, 3]);
            });

            it('keeps trailing newline/whitespace after single JSON value', async () => {
                const actual = await parse(['{"a":1}', '\n', '  \t  '], { mode: 'auto' });
                assert.deepStrictEqual(actual, { a: 1 });
            });

            it('fails for extra value without newline separator', () =>
                assert.rejects(
                    () => parse(['1 2'], { mode: 'auto' }),
                    /Unexpected non-whitespace|Unable to parse JSON string|Unexpected number in JSON at position 2/
                )
            );

            it('fails for extra value without newline separator #2', () =>
                assert.rejects(
                    () => parse(['{}{}'], { mode: 'auto' }),
                    /Unexpected non-whitespace|Unable to parse JSON string|Unexpected token { in JSON at position 2/
                )
            );

            it('fails when values are not newline-separated', async () =>
                assert.rejects(
                    () => parse(['{"a":{', '"b":', '1}}{"a":{', '"b":', '2}}'], { mode: 'auto' }),
                    /Unexpected non-whitespace|Unable to parse JSON string|Unexpected token { in JSON at position 13/
                )
            );
        });

        it('throws on invalid jsonl option value', () =>
            assert.rejects(
                () => parse(['1'], { mode: 'yes' }),
                /Invalid options: `mode` should be "json", "jsonl", "ndjson", or "auto"/
            )
        );
    });

    describe('reviver support', () => {
        it('supports parseChunked(input, reviver)', async () => {
            const actual = await parseChunked(['{"a":1,"b":2}'], (key, value) =>
                typeof value === 'number' ? value * 2 : value
            );

            assert.deepStrictEqual(actual, { a: 2, b: 4 });
        });

        it('supports parseChunked(input, { mode, reviver })', async () => {
            const actual = await parse(['{"a":1,"b":2}'], {
                mode: 'json',
                reviver: (key, value) => (key === 'b' ? undefined : value)
            });

            assert.deepStrictEqual(actual, { a: 1 });
        });

        it('applies reviver per value in jsonl mode', async () => {
            const actual = await parse(['{"a":1}\n{"a":2}'], {
                mode: 'jsonl',
                reviver: (key, value) => (key === 'a' ? value + 10 : value)
            });

            assert.deepStrictEqual(actual, [{ a: 11 }, { a: 12 }]);
        });

        it('applies reviver after auto mode switches to jsonl', async () => {
            const actual = await parse(['{"a":1}\n{"a":2}'], {
                mode: 'auto',
                reviver: (key, value) => (key === 'a' ? value * 3 : value)
            });

            assert.deepStrictEqual(actual, [{ a: 3 }, { a: 6 }]);
        });

        it('should ignore invalid reviver in options', async () => {
            const actual = await parse(['{"a":1}'], { reviver: 'not a function' });
            assert.deepStrictEqual(actual, { a: 1 });
        });

        it('should ignore invalid second argument type', async () => {
            const actual = await parse(['1'], 123);
            assert.deepStrictEqual(actual, 1);
        });
    });

    describe('onRootValue support', () => {
        it('should return number of entries when onRootValue is used', async () => {
            const entries = [];
            const states = [];
            const actual = await parse(['{"a":', '1}\n'], {
                onRootValue(value, { mode, rootValuesCount }) {
                    entries.push(value);
                    states.push({ mode, rootValuesCount });
                }
            });
            assert.strictEqual(actual, 1);
            assert.deepStrictEqual(entries, [{ a: 1 }]);
            assert.deepStrictEqual(states, [
                { mode: 'json', rootValuesCount: 1 }
            ]);
        });

        it('jsonl', async () => {
            const entries = [];
            const states = [];
            const actual = await parse(['{"a":1', '}\n', '2\n[', '3]'], {
                mode: 'jsonl',
                onRootValue(value, { mode, rootValuesCount }) {
                    entries.push(value);
                    states.push({ mode, rootValuesCount });
                }
            });
            assert.strictEqual(actual, 3);
            assert.deepStrictEqual(entries, [{ a: 1 }, 2, [3]]);
            assert.deepStrictEqual(states, [
                { mode: 'jsonl', rootValuesCount: 1 },
                { mode: 'jsonl', rootValuesCount: 2 },
                { mode: 'jsonl', rootValuesCount: 3 }
            ]);
        });

        it('auto', async () => {
            const entries = [];
            const states = [];
            const actual = await parse(['{"a":1', '}\n', '2\n[', '3]'], {
                mode: 'auto',
                onRootValue(value, { mode, rootValuesCount }) {
                    entries.push(value);
                    states.push({ mode, rootValuesCount });
                }
            });
            assert.strictEqual(actual, 3);
            assert.deepStrictEqual(entries, [{ a: 1 }, 2, [3]]);
            assert.deepStrictEqual(states, [
                { mode: 'json', rootValuesCount: 1 },
                { mode: 'jsonl', rootValuesCount: 2 },
                { mode: 'jsonl', rootValuesCount: 3 }
            ]);
        });
    });

    describe('onRootValue & reviver', () => {
        const reviver = (key, value) => typeof value === 'number' ? value + 10 : value;

        it('json', async () => {
            const entries = [];
            const states = [];
            const actual = await parse(['{"a":', '1}\n'], {
                reviver,
                onRootValue(value, { mode, rootValuesCount }) {
                    entries.push(value);
                    states.push({ mode, rootValuesCount });
                }
            });
            assert.strictEqual(actual, 1);
            assert.deepStrictEqual(entries, [{ a: 11 }]);
            assert.deepStrictEqual(states, [
                { mode: 'json', rootValuesCount: 1 }
            ]);
        });

        it('jsonl', async () => {
            const entries = [];
            const states = [];
            const actual = await parse(['{"a":1', '}\n', '2\n[', '3]'], {
                mode: 'jsonl',
                reviver,
                onRootValue(value, { mode, rootValuesCount }) {
                    entries.push(value);
                    states.push({ mode, rootValuesCount });
                }
            });
            assert.strictEqual(actual, 3);
            assert.deepStrictEqual(entries, [{ a: 11 }, 12, [13]]);
            assert.deepStrictEqual(states, [
                { mode: 'jsonl', rootValuesCount: 1 },
                { mode: 'jsonl', rootValuesCount: 2 },
                { mode: 'jsonl', rootValuesCount: 3 }
            ]);
        });

        it('auto', async () => {
            const entries = [];
            const states = [];
            const actual = await parse(['{"a":1', '}\n', '2\n[', '3]'], {
                mode: 'auto',
                reviver,
                onRootValue(value, { mode, rootValuesCount }) {
                    entries.push(value);
                    states.push({ mode, rootValuesCount });
                }
            });
            assert.strictEqual(actual, 3);
            assert.deepStrictEqual(entries, [{ a: 11 }, 12, [13]]);
            assert.deepStrictEqual(states, [
                { mode: 'json', rootValuesCount: 1 },
                { mode: 'jsonl', rootValuesCount: 2 },
                { mode: 'jsonl', rootValuesCount: 3 }
            ]);
        });
    });

    describe('onChunk support', () => {
        it('should report chunk progress when onChunk is used', async () => {
            const chunks = [];
            const actual = await parse(['{"a":', '1,', ' "b"', ':2,', '"c":3 }\n'], {
                onChunk(chunkParsed, chunk, pending, { consumed, parsed }) {
                    chunks.push({
                        chunkParsed,
                        chunk,
                        pending,
                        consumed,
                        parsed
                    });
                }
            });
            assert.deepStrictEqual(actual, { a: 1, b: 2, c: 3 });
            assert.deepStrictEqual(chunks, [
                { chunkParsed: 1, chunk: '{"a":', pending: '"a":', consumed: 5, parsed: 1 },
                { chunkParsed: 5, chunk: '1,', pending: ',', consumed: 7, parsed: 6 },
                { chunkParsed: 0, chunk: ' "b"', pending: ', "b"', consumed: 11, parsed: 6 },
                { chunkParsed: 7, chunk: ':2,', pending: ',', consumed: 14, parsed: 13 },
                { chunkParsed: 9, chunk: '"c":3 }\n', pending: null, consumed: 22, parsed: 22 },
                { chunkParsed: 0, chunk: null, pending: null, consumed: 22, parsed: 22 }
            ]);
        });

        it('jsonl', async () => {
            const chunks = [];
            const actual = await parse(['{"a":1', '}\n', '2\n[', '3]'], {
                mode: 'jsonl',
                onChunk(chunkParsed, chunk, pending, { consumed, parsed }) {
                    chunks.push({
                        chunkParsed,
                        chunk,
                        pending,
                        consumed,
                        parsed
                    });
                }
            });
            assert.deepStrictEqual(actual, [{ a: 1 }, 2, [3]]);
            assert.deepStrictEqual(chunks, [
                { chunkParsed: 1, chunk: '{"a":1', pending: '"a":1', consumed: 6, parsed: 1 },
                { chunkParsed: 7, chunk: '}\n', pending: null, consumed: 8, parsed: 8 },
                { chunkParsed: 3, chunk: '2\n[', pending: null, consumed: 11, parsed: 11 },
                { chunkParsed: 2, chunk: '3]', pending: null, consumed: 13, parsed: 13 },
                { chunkParsed: 0, chunk: null, pending: null, consumed: 13, parsed: 13 }
            ]);
        });

        it('auto', async () => {
            const chunks = [];
            const actual = await parse(['{"a":1', '}\n', '2\n[', '3]'], {
                mode: 'auto',
                onChunk(chunkParsed, chunk, pending, { consumed, parsed }) {
                    chunks.push({
                        chunkParsed,
                        chunk,
                        pending,
                        consumed,
                        parsed
                    });
                }
            });
            assert.deepStrictEqual(actual, [{ a: 1 }, 2, [3]]);
            assert.deepStrictEqual(chunks, [
                { chunkParsed: 1, chunk: '{"a":1', pending: '"a":1', consumed: 6, parsed: 1 },
                { chunkParsed: 7, chunk: '}\n', pending: null, consumed: 8, parsed: 8 },
                { chunkParsed: 3, chunk: '2\n[', pending: null, consumed: 11, parsed: 11 },
                { chunkParsed: 2, chunk: '3]', pending: null, consumed: 13, parsed: 13 },
                { chunkParsed: 0, chunk: null, pending: null, consumed: 13, parsed: 13 }
            ]);
        });
    });

    describe('use with buffers', () => {
        const input = '[1234,{"🤓\\uD800\\uDC00":"🤓\\uD800\\uDC00\\u006f\\ufffd\\uffff\\ufffd"}]';
        const expected = [1234, { '🤓\uD800\uDC00': '🤓\uD800\uDC00\u006f\ufffd\uffff\ufffd' }];
        const slices = [
            [0, 3],   // [12
            [3, 9],   // 34,{"\ud8
            [9, 13],  // 3e\udd13
            [13, 14], // \uD8
            [14, 16], // 00\uDC00
            [16, 17], // "
            [17, 18], // :
            [18, 21], // "\ud83e
            [21, 22], // \udd
            [22, 23], // 13
            [23, 26], // \uD800\uDC
            [26, 28], // 00\u00
            [28, 29], // 6f
            [29, 30], // \uff
            [30, 31], // fd
            [31, 32], // \uff
            [32, 33], // ff
            [33, 34], // ff
            [34, 35], // fd
            [35]      // ...
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
                /(Unexpected number|Expected ',' or ']' after array element) in JSON at position 3|Expected ']'/
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
                /(Unexpected number|Expected ',' or ']' after array element) in JSON at position 3|Expected ']'/
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
            ['[1, 2,', 3, ']'],
            new Uint8Array([1, 2, 3]),
            () => {},
            () => ({}),
            () => '[1, 2]',
            () => ['[1, 2,', 3, ']'],
            () => 123,
            () => new Uint8Array([1, 2, 3]),
            { on() {} },
            { [Symbol.iterator]: null },
            { [Symbol.asyncIterator]: null }
        ];

        for (const value of badValues) {
            it(inspect(value), () =>
                assert.rejects(
                    () => parseChunked(value),
                    /Invalid chunk emitter: Expected an Iterable, AsyncIterable, generator, async generator, or a function returning an Iterable or AsyncIterable|Invalid chunk: Expected string, TypedArray or Buffer/
                )
            );
        }
    });

    describe('use with nodejs stream', () => {
        it('basic usage', async () => {
            const actual = await parseChunked(createReadableNodejsStream(['[1,', '2]']));
            assert.deepStrictEqual(actual, [1, 2]);
        });

        it('with failure in JSON', () =>
            assert.rejects(
                () => parseChunked(createReadableNodejsStream(['[1 ', '2]'])),
                /(Unexpected number|Expected ',' or ']' after array element) in JSON at position 3|Expected ']'/
            )
        );

        it('with failure in stream', () =>
            assert.rejects(
                () => parseChunked(createReadableNodejsStream([new Error('test error in stream')])),
                /test error in stream/
            )
        );
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

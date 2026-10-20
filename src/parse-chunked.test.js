/* global globalThis */
import assert from 'assert';
import { Buffer } from 'buffer'; // needed for Deno
import { Readable } from 'stream';
import { inspect } from 'util';
import { parseChunked } from './parse-chunked.js';

function parse(chunks, options) {
    return parseChunked(() => chunks, options);
}

function clone(value) {
    return value === undefined ? undefined : JSON.parse(JSON.stringify(value));
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

        for (const binary of [false, true]) {
            it('handles escapes at every boundary with empty ' + (binary ? 'byte' : 'string') + ' chunks', async () => {
                const expected = [
                    'plain',
                    ...Array.from({ length: 6 }, (_, length) => '\\'.repeat(length) + '"[,]{}'),
                    '🤓漢字',
                    'tail'
                ];
                const json = JSON.stringify(expected);
                const input = binary ? new TextEncoder().encode(json) : json;

                for (let i = 0; i <= input.length; i++) {
                    const actual = await parse([
                        input.slice(0, i),
                        input.slice(i, i),
                        input.slice(i, i),
                        input.slice(i)
                    ]);

                    assert.deepStrictEqual(actual, expected);
                }
            });
        }

        it('handles many escape-free strings before a later escape', async () => {
            const expected = {
                items: Array.from({ length: 256 }, (_, i) => 'plain-' + i),
                tail: { text: '\\"},[', end: 'tail' }
            };
            const json = JSON.stringify(expected);

            assert.deepStrictEqual(await parse([json]), expected);
            assert.deepStrictEqual(await parse(split(json, 128)), expected);
        });

        it('carries escape parity through consecutive backslash-only chunks', async () => {
            for (const first of [0, 1, 2, 3]) {
                for (const second of [0, 1, 2, 3]) {
                    for (const third of [0, 1, 2, 3]) {
                        const escaped = (first + second + third) % 2 !== 0;
                        const chunks = [
                            '["' + '\\'.repeat(first),
                            '',
                            '\\'.repeat(second),
                            '',
                            '\\'.repeat(third),
                            '',
                            escaped ? '"tail"]' : '"]'
                        ];

                        assert.deepStrictEqual(await parse(chunks), JSON.parse(chunks.join('')));
                    }
                }
            }
        });

        it('resets carried escape parity after a non-backslash character', async () => {
            assert.deepStrictEqual(await parse(['"\\', 'n\\', '"', 'tail"']), '\n"tail');
        });

        it('resumes through escaped quotes and empty chunks before a delimiter', async () => {
            const actual = await parse(['{"key":"\\', '', '"a\\"', '', 'b",', '"next":1}']);

            assert.deepStrictEqual(actual, { key: '"a"b', next: 1 });
        });

        it('resumes an object key and scans an empty string opened at chunk end', async () => {
            const actual = await parse(['{"ke', 'y":{"text":"', '"},"n":1}']);

            assert.deepStrictEqual(actual, { key: { text: '' }, n: 1 });
        });

        it('rejects malformed strings across chunk boundaries', async () => {
            for (const json of ['["plain","\\q"]', '["plain","text\\', '["plain","line\nbreak"]']) {
                for (let i = 0; i <= json.length; i++) {
                    await assert.rejects(
                        () => parse([json.slice(0, i), '', json.slice(i)]),
                        SyntaxError
                    );
                }
            }
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
                /Invalid options: `mode` should be "json", "jsonl", or "auto"/
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

        it('reviver should follow JSON.parse behaviour', async () => {
            const json = '{"a":1,"b":2,"c":[1,2,3],"d":[1,2],"e":[2,2]}';
            const reviver = (key, value) =>
                value === 2 ? undefined : value;
            const actual = await parseChunked([json], reviver);
            const expected = { a: 1, c: [1, , 3], d: [1,,], e: [,,] };

            assert.deepStrictEqual(JSON.parse(json, reviver), expected);
            assert.deepStrictEqual(actual, expected);
        });

        it('reviver should follow JSON.parse order', async () => {
            const json = '{"a":0,"b":0,"c":[0,{"a":0,"b":0}],"d":{"a":{"x":0},"b":0}}';
            const reviver = () => {
                let step = 0;
                return (key, value) => typeof value === 'number' ? step++ : value;
            };
            const actual = await parseChunked([json], reviver());
            const expected = { a: 0, b: 1, c: [2, { a: 3, b: 4 }], d: { a: { x: 5 }, b: 6 } };

            assert.deepStrictEqual(JSON.parse(json, reviver()), expected);
            assert.deepStrictEqual(actual, expected);
        });

        it('reviver should follow JSON.parse behaviour for root value', async () => {
            const json = '{"a":1,"b":2,"c":[1,2]}';
            const reviver = () => undefined;
            const actual = await parseChunked([json], reviver);
            const expected = undefined;

            assert.deepStrictEqual(JSON.parse(json, reviver), expected);
            assert.deepStrictEqual(actual, expected);
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

        for (const mode of ['jsonl', 'auto']) {
            it(mode + ' should finalize empty and escaped string roots', async () => {
                const expected = ['', '"', '\\', '', 'tail'];
                const json = expected.map(value => JSON.stringify(value)).join('\n');

                for (const length of [1, 2, json.length]) {
                    const entries = [];
                    const actual = await parse(split(json, length), {
                        mode,
                        onRootValue(value) {
                            entries.push(value);
                        }
                    });

                    assert.strictEqual(actual, expected.length);
                    assert.deepStrictEqual(entries, expected);
                }
            });

            it(mode + ' should release delivered values before the stream ends', async function() {
                if (typeof globalThis.gc !== 'function') {
                    this.skip();
                }

                let firstValue;
                let state;
                const actual = await parseChunked(async function*() {
                    yield '{"a":';
                    yield '1}\n';
                    yield '2\n';

                    // WeakRef targets stay alive until the end of their current job.
                    for (let i = 0; i < 3; i++) {
                        await new Promise(resolve => setTimeout(resolve, 0));
                        globalThis.gc();
                    }

                    assert.strictEqual(firstValue.deref(), undefined);
                    assert.strictEqual(state.mode, 'jsonl');
                    assert.strictEqual(state.currentRootValue, 2);
                    assert.strictEqual(state.returnValue, 2);

                    yield '3\n';
                }, {
                    mode,
                    onRootValue(value, currentState) {
                        state = currentState;

                        if (state.rootValuesCount === 1) {
                            firstValue = new globalThis.WeakRef(value);
                        }
                    }
                });

                assert.strictEqual(actual, 3);
            });
        }
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
                onChunk(chunkParsed, chunk, pending, { mode, consumed, parsed, returnValue, currentRootValue }) {
                    chunks.push({
                        mode,
                        chunkParsed,
                        chunk,
                        pending,
                        consumed,
                        parsed,
                        returnValue: clone(returnValue), // clone to avoid mutation in later chunks
                        currentRootValue: clone(currentRootValue) // clone to avoid mutation in later chunks
                    });
                }
            });
            assert.deepStrictEqual(actual, { a: 1, b: 2, c: 3 });
            assert.deepStrictEqual(chunks, [
                { mode: 'json', chunkParsed: 1, chunk: '{"a":', pending: '"a":', consumed: 5, parsed: 1, returnValue: {}, currentRootValue: {} },
                { mode: 'json', chunkParsed: 5, chunk: '1,', pending: ',', consumed: 7, parsed: 6, returnValue: { a: 1 }, currentRootValue: { a: 1 } },
                { mode: 'json', chunkParsed: 0, chunk: ' "b"', pending: ', "b"', consumed: 11, parsed: 6, returnValue: { a: 1 }, currentRootValue: { a: 1 } },
                { mode: 'json', chunkParsed: 7, chunk: ':2,', pending: ',', consumed: 14, parsed: 13, returnValue: { a: 1, b: 2 }, currentRootValue: { a: 1, b: 2 } },
                { mode: 'json', chunkParsed: 9, chunk: '"c":3 }\n', pending: null, consumed: 22, parsed: 22, returnValue: { a: 1, b: 2, c: 3 }, currentRootValue: { a: 1, b: 2, c: 3 } },
                { mode: 'json', chunkParsed: 0, chunk: null, pending: null, consumed: 22, parsed: 22, returnValue: { a: 1, b: 2, c: 3 }, currentRootValue: { a: 1, b: 2, c: 3 } }
            ]);
        });

        it('jsonl', async () => {
            const chunks = [];
            const actual = await parse(['{"a":1', '}\n', '2\n[', '3]'], {
                mode: 'jsonl',
                onChunk(chunkParsed, chunk, pending, { mode, consumed, parsed, returnValue, currentRootValue }) {
                    chunks.push({
                        mode,
                        chunkParsed,
                        chunk,
                        pending,
                        consumed,
                        parsed,
                        returnValue: clone(returnValue), // clone to avoid mutation in later chunks
                        currentRootValue: clone(currentRootValue) // clone to avoid mutation in later chunks
                    });
                }
            });
            assert.deepStrictEqual(actual, [{ a: 1 }, 2, [3]]);
            assert.deepStrictEqual(chunks, [
                { mode: 'jsonl', chunkParsed: 1, chunk: '{"a":1', pending: '"a":1', consumed: 6, parsed: 1, returnValue: [], currentRootValue: {} },
                { mode: 'jsonl', chunkParsed: 7, chunk: '}\n', pending: null, consumed: 8, parsed: 8, returnValue: [{ a: 1 }], currentRootValue: { a: 1 } },
                { mode: 'jsonl', chunkParsed: 3, chunk: '2\n[', pending: null, consumed: 11, parsed: 11, returnValue: [{ a: 1 }, 2], currentRootValue: [] },
                { mode: 'jsonl', chunkParsed: 2, chunk: '3]', pending: null, consumed: 13, parsed: 13, returnValue: [{ a: 1 }, 2, [3]], currentRootValue: [3] },
                { mode: 'jsonl', chunkParsed: 0, chunk: null, pending: null, consumed: 13, parsed: 13, returnValue: [{ a: 1 }, 2, [3]], currentRootValue: [3] }
            ]);
        });

        it('auto', async () => {
            const chunks = [];
            const actual = await parse(['{"a":1', '}\n', '2\n[', '3]'], {
                mode: 'auto',
                onChunk(chunkParsed, chunk, pending, { mode, consumed, parsed, returnValue, currentRootValue }) {
                    chunks.push({
                        mode,
                        chunkParsed,
                        chunk,
                        pending,
                        consumed,
                        parsed,
                        returnValue: clone(returnValue), // clone to avoid mutation in later chunks
                        currentRootValue: clone(currentRootValue) // clone to avoid mutation in later chunks
                    });
                }
            });
            assert.deepStrictEqual(actual, [{ a: 1 }, 2, [3]]);
            assert.deepStrictEqual(chunks, [
                { mode: 'json', chunkParsed: 1, chunk: '{"a":1', pending: '"a":1', consumed: 6, parsed: 1, returnValue: {}, currentRootValue: {} },
                { mode: 'json', chunkParsed: 7, chunk: '}\n', pending: null, consumed: 8, parsed: 8, returnValue: { a: 1 }, currentRootValue: { a: 1 } },
                { mode: 'jsonl', chunkParsed: 3, chunk: '2\n[', pending: null, consumed: 11, parsed: 11, returnValue: [{ a: 1 }, 2], currentRootValue: [] },
                { mode: 'jsonl', chunkParsed: 2, chunk: '3]', pending: null, consumed: 13, parsed: 13, returnValue: [{ a: 1 }, 2, [3]], currentRootValue: [3] },
                { mode: 'jsonl', chunkParsed: 0, chunk: null, pending: null, consumed: 13, parsed: 13, returnValue: [{ a: 1 }, 2, [3]], currentRootValue: [3] }
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

    describe('continuation into a container opened by a previous chunk', () => {
        const openAtEnd = json => {
            const at = json.lastIndexOf('{', json.lastIndexOf('"x":1'));
            return [json.slice(0, at + 1), json.slice(at + 1)];
        };

        describe('source identity of the continued child', () => {
            const cases = [
                '{"1":{},"0":{"x":1}}',                // out of order integer-like keys
                '{"10":{},"2":{},"1":{"x":1}}',        // multiple integer-like keys
                '{"a":{},"b":{},"a":{"x":1}}',         // duplicate key, last occurrence isn't last in property order
                '{"":{"x":1},"a":{}}',                 // empty key
                '{"a":{},"b":{"x":1}}',                // ordinary keys, control
                '{"0":{},"a":{},"1":{"x":1}}'          // integer-like and ordinary keys mixed
            ];

            for (const json of cases) {
                it(json, async () =>
                    assert.deepStrictEqual(await parse(openAtEnd(json)), JSON.parse(json))
                );
            }

            // The continuation descends into the right child, but Object.assign() doesn't
            // transfer a `__proto__` own property (PARSE-02), so a sibling added by a later
            // chunk is lost. That's out of scope for the continuation key carrier.
            it('__proto__ as the continued key', async () => {
                const actual = await parse(['{"__proto__":{', '"x":1}}']);

                assert.deepStrictEqual(Object.keys(actual), ['__proto__']);
                assert.deepStrictEqual(Object.getOwnPropertyDescriptor(actual, '__proto__').value, { x: 1 });
            });

            it('__proto__ as a sibling key is dropped by Object.assign() (PARSE-02, pre-existing)', async () => {
                assert.deepStrictEqual(await parse(['{', '"__proto__":{"x":1},"a":{}}']), { a: {} });
            });
        });

        describe('key decoding', () => {
            const cases = [
                '{"é":{"x":1},"a":{}}',                // raw non-ASCII
                '{"ключ":{"x":1},"1":{}}',             // raw multi code unit word
                '{"東京":{"x":1}}',                     // raw CJK
                '{"😀":{"x":1},"0":{}}',                // raw astral character
                '{"\\u0030":{"x":1}}',                 // escaped numeric key
                '{"a\\"b":{"x":1},"0":{}}',            // escaped quote
                '{"a\\\\b":{"x":1}}',                  // escaped backslash
                '{"":{"x":1}}',                        // empty string
                '{"ab":{},"a\\u0062":{"x":1}}',        // raw and escaped spelling of the same key
                '{"a\\u0062":{},"ab":{"x":1}}'         // same, other way around
            ];

            for (const json of cases) {
                it(json, async () =>
                    assert.deepStrictEqual(await parse(openAtEnd(json)), JSON.parse(json))
                );
            }
        });

        describe('path topology', () => {
            const cases = [
                ['object → object', ['{"1":{},"0":{', '"x":1}}']],
                ['object → array', ['{"1":{},"0":[', '1,2]}']],
                ['array → object', ['[{"a":1},{', '"x":1}]']],
                ['array → array', ['[[1],[', '2]]']],
                ['deep mixed path with several object edges', ['{"1":{},"0":{"9":[],"8":[{"b":{', '"x":1}}]}}']],
                ['closed sibling before the surviving open sibling', ['{"a":{"z":1},"0":{},"b":{', '"x":1}}']],
                ['array parent with a preceding string element', ['[["a",[', '1]]]']],
                ['array-only descent', ['[[[', '1]]]']]
            ];

            for (const [title, chunks] of cases) {
                it(title, async () =>
                    assert.deepStrictEqual(await parse(chunks), JSON.parse(chunks.join('')))
                );
            }

            it('deferred array continuation stays positional', async () => {
                const chunks = ['{"1":[],"0":[1,2', ',3,{"b":[', '4]}]}'];
                assert.deepStrictEqual(await parse(chunks), JSON.parse(chunks.join('')));
            });
        });

        describe('chunk and coordinate histories', () => {
            const cases = [
                ['key and opener in the same chunk', ['{"1":{},"0":{', '"x":1}}']],
                ['key in pending text, opener at offset zero', ['{"1":{},"0":', '{', '"x":1}}']],
                ['split inside the key', ['{"1":{},"0', '":{', '"x":1}}']],
                ['split right after the closing quote', ['{"1":{},"0"', ':{', '"x":1}}']],
                ['split around the colon and whitespace', ['{"1":{},"0" ', ' : ', ' {', '"x":1}}']],
                ['whitespace-only chunks between key and opener', ['{"1":{},"0"', '   ', '   ', ':{', '"x":1}}']],
                ['whitespace-only chunk before the key', ['{"1":{},', '   ', '"0":{', '"x":1}}']],
                ['comma at offset zero of a chunk', ['{"1":{}', ',"0":{', '"x":1}}']],
                ['escaped key split across chunks', ['{"ab":{},"a\\', 'u0062":{', '"x":1}}']]
            ];

            for (const [title, chunks] of cases) {
                it(title, async () =>
                    assert.deepStrictEqual(await parse(chunks), JSON.parse(chunks.join('')))
                );
            }

            for (const json of ['{"1":{},"0":{"x":1}}', '{"a":[{"b":{"c":1}}],"0":{}}']) {
                it('every two-way split of ' + json, async () => {
                    const expected = JSON.parse(json);

                    for (let i = 0; i <= json.length; i++) {
                        assert.deepStrictEqual(
                            await parse([json.slice(0, i), json.slice(i)]),
                            expected,
                            `split at ${i}`
                        );
                    }
                });
            }

            it('Buffer chunks', async () => {
                const json = '{"1":{},"0":{"x":1}}';
                const buffer = Buffer.from(json);

                for (let i = 0; i <= buffer.length; i++) {
                    assert.deepStrictEqual(
                        await parse([buffer.slice(0, i), buffer.slice(i)]),
                        JSON.parse(json),
                        `split at ${i}`
                    );
                }
            });

            it('Uint8Array chunks split inside a multi-byte key', async () => {
                for (const json of ['{"ключ":{"x":1},"1":{}}', '{"😀":{"x":1},"0":{}}']) {
                    const bytes = new TextEncoder().encode(json);

                    for (let i = 0; i <= bytes.length; i++) {
                        assert.deepStrictEqual(
                            await parse([bytes.slice(0, i), bytes.slice(i)]),
                            JSON.parse(json),
                            `${json} split at byte ${i}`
                        );
                    }
                }
            });
        });

        describe('preserved exterior behavior', () => {
            it('malformed fragment fails through JSON.parse()', () =>
                assert.rejects(
                    () => parse(['{"1":{}', ',"0" {', '"x":1}}']),
                    /Unexpected token \{ in JSON at position \d+|Expected ':' after property name in JSON|Unexpected token '\{'|Expected ':'/
                )
            );

            it('no mutation of an exposed partial object on a malformed fragment', async () => {
                let exposed = null;

                await assert.rejects(() => parse(['{"1":{}', ',"0" {', '"x":1}}'], {
                    onChunk(chunkParsed, chunk, pending, { currentRootValue }) {
                        exposed ??= currentRootValue;
                    }
                }));

                assert.deepStrictEqual(exposed, { 1: {} });
            });

            it('a property added to an exposed partial object doesn\'t replace the source key', async () => {
                const actual = await parse(['{"1":{},"0":', '{', '"x":1}}'], {
                    onChunk(chunkParsed, chunk, pending, { currentRootValue }) {
                        if (currentRootValue !== undefined) {
                            currentRootValue.zzz = 'added by callback';
                        }
                    }
                });

                assert.deepStrictEqual(actual, { 0: { x: 1 }, 1: {}, zzz: 'added by callback' });
            });

            it('an inherited enumerable property doesn\'t replace the source key', async () => {
                const actual = await parse(['{"1":{},"0":', '{', '"x":1}}'], {
                    onChunk(chunkParsed, chunk, pending, { currentRootValue }) {
                        if (currentRootValue !== undefined) {
                            Object.setPrototypeOf(currentRootValue, { zzz: 'inherited' });
                        }
                    }
                });

                assert.deepStrictEqual({ ...actual }, { 0: { x: 1 }, 1: {} });
            });

            it('callback timing and progress accounting on a nested input', async () => {
                const chunks = [];
                const actual = await parse(['{"a":{"b":', '[1,2', ']},', '"c":3}'], {
                    onChunk(chunkParsed, chunk, pending, { consumed, parsed }) {
                        chunks.push({ chunkParsed, pending, consumed, parsed });
                    }
                });

                assert.deepStrictEqual(actual, { a: { b: [1, 2] }, c: 3 });
                assert.deepStrictEqual(chunks, [
                    { chunkParsed: 6, pending: '"b":', consumed: 10, parsed: 6 },
                    { chunkParsed: 6, pending: ',2', consumed: 14, parsed: 12 },
                    { chunkParsed: 4, pending: ',', consumed: 17, parsed: 16 },
                    { chunkParsed: 7, pending: null, consumed: 23, parsed: 23 },
                    { chunkParsed: 0, pending: null, consumed: 23, parsed: 23 }
                ]);
            });
        });
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

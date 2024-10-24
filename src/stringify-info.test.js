import assert from 'assert';
import { Buffer } from 'buffer'; // needed for Deno
import { inspect } from 'util';
import { stringifyInfo } from './stringify-info.js';
import {
    allUtf8LengthDiffChars,
    tests,
    spaceTests,
    spaces
} from './stringify-cases.js';

const wellformedStringify = JSON.stringify;
const strBytesLength = str => Buffer.byteLength(str, 'utf8');

function createInfoTest(value, ...args) {
    const title = value === allUtf8LengthDiffChars
        ? `All UTF8 length diff chars ${value[0]}..${value[value.length - 1]}`
        : inspect(value, { depth: null });

    it(title.replace(/[\u0000-\u001f\u0100-\uffff]/g, m => '\\u' + m.charCodeAt().toString(16).padStart(4, '0')), () => {
        const native = String(wellformedStringify(value, ...args));
        const nonFormatted = args[1] ? String(wellformedStringify(value, args[0])) : native;
        const info = stringifyInfo(value, ...args);
        const bytes = strBytesLength(native);
        const spaceBytes = nonFormatted !== native
            ? bytes - strBytesLength(nonFormatted)
            : 0;

        assert.deepStrictEqual(info, {
            bytes,
            spaceBytes,
            circular: []
        });
    });
}

describe('stringifyInfo()', () => {
    describe('default', () => {
        for (const value of tests) {
            createInfoTest(value);
        }
    });

    describe('replacer option', () => {
        // various values for a replace as an allowlist
        createInfoTest(
            { '3': 'ok', b: [2, 3, { c: 5, a: 4 }, 7, { d: 1 }], 2: 'fail', 1: 'ok', a: 1, c: 6, '': 'fail' },
            ['a', 'a', new String('b'), { toString: () => 'c' }, 1, '2', new Number(3), null, () => {}, Symbol(), false]
        );
    });

    describe('space option', () => {
        for (const space of spaces) {
            describe('space ' + wellformedStringify(space), () => {
                for (const value of spaceTests) {
                    createInfoTest(value, null, space);
                }
            });
        }
    });

    it('options', () => {
        const actual = stringifyInfo({ foo: 123, bar: 456 }, {
            replacer: ['foo'],
            space: 4
        }, 2); // should ignore third argument when options passed

        assert.deepStrictEqual(actual, {
            bytes: 18,
            spaceBytes: 7,
            circular: []
        });
    });

    describe('circular', () => {
        it('should stop on first circular reference by default', () => {
            const circularRef = {};
            const circularRef2 = [];
            circularRef.a = circularRef;
            circularRef.b = 1234567890;
            circularRef.c = circularRef2;
            circularRef2.push(circularRef, circularRef2);
            const info = stringifyInfo(circularRef);

            assert.deepStrictEqual(info.circular, [circularRef]);
        });

        it('should visit all circular reference when options.continueOnCircular', () => {
            const circularRef = {};
            const circularRef2 = [];
            circularRef.a = circularRef;
            circularRef.b = 1234567890;
            circularRef.c = circularRef2;
            circularRef2.push(circularRef, circularRef2);
            const info = stringifyInfo(circularRef, { continueOnCircular: true });

            assert.deepStrictEqual(info.circular, [circularRef, circularRef2]);
        });
    });

    it('should no throw on unsupported types', () =>
        assert.strictEqual(stringifyInfo([1n, 123]).bytes, '[,123]'.length)
    );

    describe('undefined return', () => {
        const values = [
            undefined,
            function() {},
            Symbol()
        ];

        for (const value of values) {
            it(String(value), () =>
                assert.strictEqual(stringifyInfo(value).bytes, 9)
            );
        }
    });

    describe('infinite size', () => {
        const value = [];
        const str = 'str'.repeat(100);

        for (var i = 0; i < 1100; i++) {
            value.push({
                foo: str,
                bar: 12312313,
                baz: [str, 123, str, new Date(2021, 5, 15), str],
                [str]: str,
                prev: value[i - 1] || null,
                a: value[i - 1] || null
            });
        }

        it('without formatting', () => {
            assert.deepStrictEqual(stringifyInfo(value), {
                bytes: Infinity,
                spaceBytes: 0,
                circular: []
            });
        });

        it('with formatting (space option)', () => {
            assert.deepStrictEqual(stringifyInfo(value, { space: 4 }), {
                bytes: Infinity,
                spaceBytes: Infinity,
                circular: []
            });
        });
    });
});

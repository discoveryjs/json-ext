const assert = require('assert');
const { inspect } = require('util');
const { info: jsonStringifyInfo } = require('../src');
const strBytesLength = str => Buffer.byteLength(str, 'utf8');
const {
    allUtf8LengthDiffChars,
    tests,
    spaceTests,
    spaces
} = require('./fixture/stringify-cases');

function createInfoTest(value, ...args) {
    const title = value === allUtf8LengthDiffChars
        ? `All UTF8 length diff chars ${value[0]}..${value[value.length - 1]}`
        : inspect(value, { depth: null });
    it(title.replace(/[\u0000-\u001f\u0100-\uffff]/g, m => '\\u' + m.charCodeAt().toString(16).padStart(4, '0')), () => {
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
    describe('default', () => {
        for (const value of tests) {
            createInfoTest(value);
        }
    });

    describe('space option', () => {
        for (const space of spaces) {
            describe('space ' + JSON.stringify(space), () => {
                for (const value of spaceTests) {
                    createInfoTest(value, null, space);
                }
            });
        }
    });
});

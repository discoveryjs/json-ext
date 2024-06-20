/* global jsonExt */
import fs from 'node:fs';
import assert from 'node:assert';

describe('dist/json-ext.js', () => {
    before(() => new Function(fs.readFileSync('dist/json-ext.js'))());

    it('stringifyChunked', () => {
        const expected = '{"test":"ok"}';
        const actual = [...jsonExt.stringifyChunked({ test: 'ok' })].join('');

        assert.strictEqual(actual, expected);
    });

    it('stringifyInfo', () => {
        const expected = '{"test":"ok"}'.length;
        const { bytes: actual } = jsonExt.stringifyInfo({ test: 'ok' });

        assert.strictEqual(actual, expected);
    });

    it('parseChunked', async () => {
        const expected = { test: 'ok' };
        const actual = await jsonExt.parseChunked(() => ['{"test"', ':"ok"}']);

        assert.deepStrictEqual(actual, expected);
    });
});

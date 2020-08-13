const assert = require('assert');
const { json: jsonStrinifyInfo } = require('../src');

describe.skip('info()', () => {
    describe('basic', () => {
        const tests = [
            null,
            true,
            false,
            123,
            'test',
            {},
            { foo: 1 },
            { foo: 1, bar: 2 },
            { foo: 1, bar: undefined, baz: { a: undefined, b: 123, c: [1, 2] } },
            [],
            [1, 2, 3],
            [{ foo: 1 }, undefined, 123, 'test']
        ];

        describe('no spaces', () => {
            for (const value of tests) {
                const s = JSON.stringify(value);
                it(s, () => {
                    const info = jsonStrinifyInfo(value);

                    assert.deepEqual(info, {
                        minLength: s.length,
                        circular: [],
                        async: []
                    });
                });
            }
        });

        describe('with spaces', () => {
            for (const value of tests) {
                const s = JSON.stringify(value, null, 4);
                it(JSON.stringify(s), () => {
                    const info = jsonStrinifyInfo(value, null, 4);

                    assert.deepEqual(info, {
                        minLength: s.length,
                        circular: [],
                        async: []
                    });
                });
            }
        });
    });
});

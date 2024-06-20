const assert = require('assert');
const fs = require('fs');

it('basic require', async () => {
    const { stringifyInfo } = require('@discoveryjs/json-ext');
    const { bytes } = stringifyInfo({ foo: 123 });

    assert.strictEqual(bytes, 11);
});

it('should export package.json', async () => {
    const packageJson = require('@discoveryjs/json-ext/package.json');

    assert.strictEqual(packageJson.name, '@discoveryjs/json-ext');
});

describe('export files', () => {
    const files = [
        'dist/json-ext.js',
        'dist/json-ext.min.js'
    ];

    for (const filename of files) {
        it(filename, () => {
            const { stringifyInfo } = require(`@discoveryjs/json-ext/${filename}`);
            const { bytes } = stringifyInfo({ foo: 123 });

            assert.strictEqual(bytes, 11);
        });
    }
});

it('should not be able to access to files not defined by exports', () => {
    const filename = 'cjs/index.cjs';

    assert(fs.existsSync(filename), `${filename} should exist`);
    assert.throws(
        () => require(`@discoveryjs/json-ext/${filename}`),
        new RegExp(`Package subpath '\\./${filename}' is not defined by "exports"`)
    );
});

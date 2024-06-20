import assert from 'assert';
import fs from 'fs';

it('basic import', async () => {
    const { stringifyInfo } = await import('@discoveryjs/json-ext');
    const { bytes } = stringifyInfo({ foo: 123 });

    assert.strictEqual(bytes, 11);
});

// import attributes (i.e. "import(..., { with ... })") cause syntax error currently, disable the test for now;
// it('package.json', async () => {
//     const packageJson = await import('@discoveryjs/json-ext/package.json', { with { type: "json" } }); // should expose package.json
//     assert.strictEqual(packageJson.name, '@discoveryjs/json-ext');
// });

describe('export files', () => {
    const files = [
        'dist/json-ext.js',
        'dist/json-ext.min.js'
    ];

    for (const filename of files) {
        it(filename, async () => {
            const { default: { stringifyInfo } } = await import(`@discoveryjs/json-ext/${filename}`);
            const { bytes } = stringifyInfo({ foo: 123 });

            assert.strictEqual(bytes, 11);
        });
    }
});

it('should not be able to access to files not defined by exports', async () => {
    const filename = 'src/index.js';

    assert(fs.existsSync(filename), `${filename} should exist`);
    await assert.rejects(
        () => import(`@discoveryjs/json-ext/${filename}`),
        new RegExp(`Package subpath '\\./${filename}' is not defined by "exports"`)
    );
});

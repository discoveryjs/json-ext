import {build} from 'esbuild';
import {createRequire} from 'module';

const require = createRequire(import.meta.url);
const packageJson = require('./package.json');
const baseConfig = {
    define: {
        'process.env.npm_package_version': `"${packageJson.version}"`
    },
    entryPoints: ['src/index.js'],
    bundle: true,
    packages: 'external'
};
await Promise.all([
    /* CommonJS */
    build({
        ...baseConfig,
        format: 'cjs',
        outfile: 'dist/index.cjs',
        target: ['es2015', 'node16']
    }),
    /* ESM */
    build({
        ...baseConfig,
        format: 'esm',
        outfile: 'dist/index.mjs',
        target: ['es2020', 'node16']
    }),
    /* Browser */
    build({
        ...baseConfig,
        format: 'iife',
        globalName: 'jsonExt',
        conditions: ['browser'],
        outfile: 'dist/browser.global.js',
        target: ['es6']
    }),
    build({
        ...baseConfig,
        format: 'iife',
        globalName: 'jsonExt',
        conditions: ['browser'],
        minify: true,
        outfile: 'dist/browser.global.min.js',
        target: ['es6']
    }),
    build({
        ...baseConfig,
        format: 'cjs',
        conditions: ['browser'],
        outfile: 'dist/browser.cjs',
        target: ['es6']
    }),
    build({
        ...baseConfig,
        format: 'esm',
        conditions: ['browser'],
        outfile: 'dist/browser.mjs',
        target: ['es6']
    })
]);

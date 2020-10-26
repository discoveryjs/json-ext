const { nodeResolve } = require('@rollup/plugin-node-resolve');
const commonjs = require('@rollup/plugin-commonjs');
const json = require('@rollup/plugin-json');
const { terser } = require('rollup-plugin-terser');

module.exports = {
    input: 'src/index.js',
    output: [
        { name: 'jsonExt', format: 'umd', file: 'dist/json-ext.js' },
        { name: 'jsonExt', format: 'umd', file: 'dist/json-ext.min.js', plugins: [terser({ compress: { passes: 2 } })] }
    ],
    plugins: [
        nodeResolve({ browser: true }),
        commonjs(),
        json()
    ]
};

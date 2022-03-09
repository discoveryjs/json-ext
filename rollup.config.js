const fs = require('fs');
const path = require('path');
const { nodeResolve } = require('@rollup/plugin-node-resolve');
const commonjs = require('@rollup/plugin-commonjs');
const json = require('@rollup/plugin-json');
const { terser } = require('rollup-plugin-terser');
const versionFile = path.join(__dirname, 'src/version.js');

module.exports = {
    input: 'src/index.js',
    output: [
        { name: 'jsonExt', format: 'umd', file: 'dist/json-ext.js' },
        { name: 'jsonExt', format: 'umd', file: 'dist/json-ext.min.js', plugins: [terser({ compress: { passes: 2 } })] }
    ],
    plugins: [
        { name: 'version', resolveId(id) {
            if (id === versionFile) {
                fs.writeFileSync('./dist/version.js', `module.exports = "${require('./package.json').version}";`);
            }
        } },
        nodeResolve({ browser: true }),
        commonjs(),
        json()
    ]
};

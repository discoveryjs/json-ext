import fs from 'node:fs';
import { nodeResolve } from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import json from '@rollup/plugin-json';
import { terser } from 'rollup-plugin-terser';
let versionWritten = false;

module.exports = {
    input: 'src/index.js',
    output: [
        { name: 'jsonExt', format: 'umd', file: 'dist/json-ext.js' },
        { name: 'jsonExt', format: 'umd', file: 'dist/json-ext.min.js', plugins: [terser({ compress: { passes: 2 } })] }
    ],
    plugins: [
        { name: 'version', resolveId() {
            if (!versionWritten) {
                versionWritten = true;
                console.log('Write ./dist/version.js');
                fs.writeFileSync('./dist/version.js', `module.exports = "${require('./package.json').version}";`);
            }
        } },
        nodeResolve({ browser: true }),
        commonjs(),
        json()
    ]
};

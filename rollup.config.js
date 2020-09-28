const path = require('path');
const { nodeResolve } = require('@rollup/plugin-node-resolve');
const commonjs = require('@rollup/plugin-commonjs');
const { terser } = require('rollup-plugin-terser');

function replaceContent(map) {
    return {
        name: 'file-content-replacement',
        load(id) {
            const key = path.relative('', id);
            if (map.hasOwnProperty(key)) {
                return map[key](id);
            }
        }
    };
};

module.exports = {
    input: 'src/index.js',
    output: [
        { name: 'jsonExt', format: 'umd', file: 'dist/json-ext.js' },
        { name: 'jsonExt', format: 'umd', file: 'dist/json-ext.min.js', plugins: [terser()] }
    ],
    plugins: [
        nodeResolve({ browser: true }),
        replaceContent({
            'src/stringify-stream.js': () => 'module.exports = function() { console.warn("Function is unsupported"); };'
        }),
        commonjs()
    ]
};

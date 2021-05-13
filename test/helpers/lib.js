const chalk = require('chalk');
const libPaths = {
    'src': 'src/index.js',
    'dist': 'dist/json-ext.js',
    'dist-min': 'dist/json-ext.min.js'
};
const mode = process.env.MODE || 'src';
const libPath = libPaths[mode];

if (!libPaths.hasOwnProperty(mode)) {
    console.error(`Mode ${chalk.white.bgRed(mode)} is not supported!\n`);
    process.exit(1);
}

if (mode !== 'src' && typeof TextDecoder === 'undefined') {
    global.TextDecoder = require('util').TextDecoder;
}

console.info('Test lib entry:', chalk.yellow(libPath));

module.exports = require('../../' + libPath);

import chalk from 'chalk';
import {TextDecoder} from 'node:util';
import {createRequire} from 'node:module';

const libPaths = {
    'src': 'src/index.js',
    'node': 'dist/index.cjs',
    'browser': 'dist/browser.cjs'
};
const mode = process.env.MODE || 'src';
const libPath = libPaths[mode];

if (!libPaths.hasOwnProperty(mode)) {
    console.error(`Mode ${chalk.white.bgRed(mode)} is not supported!\n`);
    process.exit(1);
}

if (mode !== 'node' && typeof global.TextDecoder === 'undefined') {
    global.TextDecoder = TextDecoder;
}

console.info('Test lib entry:', chalk.yellow(libPath));

let libModule;
if (mode === 'src') {
    libModule = await import(`../../${libPath}`);
} else {
    libModule = createRequire(import.meta.url)(`../../${libPath}`);
}

export default libModule;

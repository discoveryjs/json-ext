import fs from 'fs';
import esbuild from 'esbuild';

const log = async (outfile, fn) => {
    const start = Date.now();
    try {
        await fn(outfile);
    } finally {
        const stat = fs.statSync(outfile);
        if (stat.isDirectory()) {
            console.log(outfile, 'in', Date.now() - start, 'ms');
        } else {
            console.log(outfile, stat.size, 'bytes in', Date.now() - start, 'ms');
        }
    }
};

const banner = { js: `(function (global, factory) {
  typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory() :
  typeof define === 'function' && define.amd ? define(factory) :
  (global.jsonExt = factory());
}(typeof globalThis != 'undefined' ? globalThis : typeof window != 'undefined' ? window : typeof global != 'undefined' ? global : typeof self != 'undefined' ? self : this, (function () {` };
const footer = { js: `
  return exports;
})));` };

async function build() {
    const commonOptions = {
        entryPoints: ['src/index.js'],
        target: ['es2020'],
        format: 'iife',
        globalName: 'exports',
        // write: false,
        banner,
        footer,
        bundle: true
    };

    // bundle
    await log('dist/json-ext.js', (outfile) => esbuild.build({
        ...commonOptions,
        // write: false,
        outfile
    }));

    // minified bundle
    await log('dist/json-ext.min.js', (outfile) => esbuild.build({
        ...commonOptions,
        // write: false,
        outfile,
        sourcemap: 'linked',
        minify: true
    }));
}

build();

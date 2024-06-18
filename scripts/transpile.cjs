const fs = require('node:fs');
const path = require('node:path');
const { rollup, watch } = require('rollup');
const chalk = require('chalk');

const external = [
    'node:fs',
    'node:url',
    'node:path',
    'node:assert',
    'node:stream',
    'node:util',
    '@discoveryjs/json-ext'
];

function resolvePath(ts = false, ext) {
    return {
        name: 'transpile-ts',
        resolveId(source, parent) {
            if (parent && !/\/(src|lib)\//.test(parent) && /\/(src|lib)\//.test(source)) {
                return {
                    id: source
                        // .replace(/\/lib\//, '/cjs/')
                        .replace(/\/src\//, '/cjs/')
                        .replace(/\.js$/, ext),
                    external: true
                };
            }
            if (ts && parent && source.startsWith('.')) {
                const resolved = path.resolve(path.dirname(parent), source);
                const resolvedTs = resolved.replace(/.js$/, '.ts');

                return fs.existsSync(resolvedTs) ? resolvedTs : resolved;
            }
            return null;
        }
    };
}

function readDir(dir) {
    return fs
        .readdirSync(dir)
        .filter((fn) => fn.endsWith('.js') || fn.endsWith('.ts'))
        .map((fn) => `${dir}/${fn}`);
}

async function transpile({
    entryPoints,
    outputDir,
    format,
    watch: watchMode = false,
    ts = false,
    onSuccess
}) {
    const outputExt = format === 'esm' ? '.js' : '.cjs';
    const doneMessage = (duration) =>
        `${
            ts ? 'Compile TypeScript to JavaScript (ESM)' : 'Convert ESM to CommonJS'
        } into "${outputDir}" done in ${duration}ms`;

    const inputOptions = {
        external,
        input: entryPoints,
        plugins: [
            resolvePath(ts, outputExt)
        ]
    };
    const outputOptions = {
        dir: outputDir,
        entryFileNames: `[name]${outputExt}`,
        sourcemap: ts,
        format,
        exports: 'auto',
        preserveModules: true,
        interop: false,
        esModule: format === 'esm',
        generatedCode: {
            constBindings: true
        }
    };

    if (!watchMode) {
        const startTime = Date.now();
        const bundle = await rollup(inputOptions);
        await bundle.write(outputOptions);
        await bundle.close();

        console.log(doneMessage(Date.now() - startTime));

        if (typeof onSuccess === 'function') {
            await onSuccess();
        }
    } else {
        const watcher = watch({
            ...inputOptions,
            output: outputOptions
        });

        watcher.on('event', ({ code, duration, error }) => {
            if (code === 'BUNDLE_END') {
                console.log(doneMessage(duration));

                if (typeof onSuccess === 'function') {
                    onSuccess();
                }
            } else if (code === 'ERROR') {
                console.error(chalk.bgRed.white('ERROR!'), chalk.red(error.message));
            }
        });
    }
}

async function transpileAll(options) {
    const { watch = false } = options || {};

    await transpile({
        entryPoints: ['src/index.js'],
        outputDir: './cjs',
        format: 'cjs',
        watch
    });
    await transpile({
        entryPoints: readDir('test'),
        outputDir: './cjs-test',
        format: 'cjs',
        watch
    });
}

module.exports = transpileAll;

if (require.main === module) {
    transpileAll({
        watch: process.argv.includes('--watch')
    });
}

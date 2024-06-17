import { inspect } from 'node:util';
import chalk from 'chalk';
import bfj from 'bfj';
import { JsonStreamStringify } from 'json-stream-stringify';
import * as jsonExt from '../src/index.js';
import { tests, fixture, spaces, allUtf8LengthDiffChars } from '../test/fixture/stringify-cases.js';
import { getSelfPackageJson } from './benchmark-utils.js';

const selfPackageJson = getSelfPackageJson();

function escape(s) {
    s = s === allUtf8LengthDiffChars
        ? `All UTF8 length diff chars ${s[0]}..${s[s.length - 1]}`
        : inspect(s, { depth: null });

    return s.replace(/[\u0000-\u001f\u0100-\uffff]/g, m => '\\u' + m.charCodeAt().toString(16).padStart(4, '0'));
}

function stringify(createStream, value, replacer, space) {
    const chunks = [];
    let uncaughtExceptionFn;

    return new Promise((resolve, reject) => {
        process.on('uncaughtException', uncaughtExceptionFn = (e) => reject(e));
        createStream(value, replacer, space)
            .on('error', reject)
            .on('data', chunk => chunks.push(chunk))
            .on('end', () => resolve(chunks.join('')));
    })
        .finally(() => process.off('uncaughtException', uncaughtExceptionFn));
}

async function test(createStream, value, replacer, space) {
    try {
        const expected = JSON.stringify(value, replacer, space);
        const actual = await stringify(createStream, value, replacer, space);

        return { value, actual, expected, success: actual === expected };
    } catch (error) {
        return { value, error, success: false };
    }
}

const streamFactories = {
    [selfPackageJson.name]: (value, replacer, space) => jsonExt.stringifyStream(value, replacer, space),
    'bfj': (value, replacer, space) => bfj.streamify(value, { space }),
    'json-stream-stringify': (value, replacer, space) => new JsonStreamStringify(value, replacer, space)
};

async function run() {
    const testCount = tests.length + spaces.length;

    for (const [name, createStream] of Object.entries(streamFactories)) {
        let failures = 0;

        for (const value of tests) {
            const { success, error, actual } = await test(createStream, value);

            if (!success) {
                failures++;
                if (process.env.VERBOSE) {
                    if (error) {
                        console.error(name, 'EXCEPTION', value);
                        console.error('  error:', error);
                        console.error();
                    } else {
                        console.error(name, 'FAILED', value);
                        console.error('  result:', actual === '' ? '<empty string>' : actual[0] === '"' ? escape(actual) : actual);
                        console.error();
                    }
                }
            }
        }

        for (const space of spaces) {
            const { success } = await test(createStream, fixture, undefined, space);

            if (!success) {
                failures++;
                if (process.env.VERBOSE) {
                    console.error(name, 'SPACE FAILED', JSON.stringify(space));
                    console.error();
                }
            }
        }

        console.log(chalk.cyan(name),
            failures === 0
                ? chalk.green('PASSED')
                : chalk.white.bgRed('FAILED') + ` ${failures}/${testCount}`
        );
    }
}

run();

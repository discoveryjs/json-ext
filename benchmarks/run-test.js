import { benchmark } from './benchmark-utils.js';
const [,, testModule, test, ...rest] = process.argv;

process.argv = [process.argv[0], testModule, ...rest];

import(testModule).then(async ({ tests }) => {
    const res = await benchmark(test, tests[test], tests.__getData);

    if (typeof process.send === 'function') {
        process.send(res);
    }
});

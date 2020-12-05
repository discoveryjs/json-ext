const { benchmark } = require('./benchmark-utils');
const [,, testModule, test, ...rest] = process.argv;

process.argv = [process.argv[0], testModule, ...rest];
const tests = require(testModule);

benchmark(test, tests[test], tests.__getData)
    .then(res => {
        if (typeof process.send === 'function') {
            process.send(res);
        }
    });

const assert = require('assert');
const lib = require('../src');

it('Initial test', () =>
    assert.strictEqual(lib(2, 3), 5)
);

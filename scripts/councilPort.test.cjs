const assert = require('assert');
const { COUNCIL_PORT, formatPortStatus } = require('../electron/councilPort.cjs');

assert.strictEqual(COUNCIL_PORT, 5173);
assert.match(formatPortStatus(5173), /Port 5173:/);

console.log('councilPort.test.cjs: ok');

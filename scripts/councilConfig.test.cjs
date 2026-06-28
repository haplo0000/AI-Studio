const assert = require('assert');
const {
  DEFAULT_COUNCIL_URL,
  getCouncilServiceUrl,
  getCouncilProbeUrl,
  isCouncilServiceUrl,
  normalizeServiceUrl,
} = require('../electron/councilConfig.cjs');

assert.strictEqual(DEFAULT_COUNCIL_URL, 'http://127.0.0.1:5173');

const settings = { services: { council_os: 'http://localhost:5173/' } };
assert.strictEqual(getCouncilServiceUrl(settings), 'http://localhost:5173');
assert.strictEqual(
  normalizeServiceUrl('http://localhost:5173/'),
  normalizeServiceUrl('http://127.0.0.1:5173'),
);
assert.strictEqual(isCouncilServiceUrl(settings, 'http://127.0.0.1:5173'), true);
assert.strictEqual(isCouncilServiceUrl(settings, 'http://127.0.0.1:8188'), false);

assert.strictEqual(getCouncilProbeUrl(settings), 'http://127.0.0.1:5173');
assert.strictEqual(getCouncilProbeUrl({}), DEFAULT_COUNCIL_URL);

console.log('councilConfig.test.cjs: ok');

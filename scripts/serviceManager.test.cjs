const assert = require('assert');
const {
  createServiceManager,
  AUTO_START_SERVICES,
  MONITORED_SERVICES,
} = require('../electron/serviceManager.cjs');
const { isDeveloperLaunchMode, resolveWscriptExe } = require('../electron/processSpawn.cjs');

assert.deepStrictEqual(AUTO_START_SERVICES, ['ollama', 'comfyui']);
assert.deepStrictEqual(MONITORED_SERVICES, ['ollama', 'comfyui', 'council_os']);
assert.strictEqual(typeof isDeveloperLaunchMode(), 'boolean');
assert.match(resolveWscriptExe(), /wscript\.exe$/i);

const logs = [];
const manager = createServiceManager({
  loadSettings: () => ({
    services: {
      ollama: 'http://127.0.0.1:11434',
      comfyui: 'http://127.0.0.1:8188',
      council_os: 'http://127.0.0.1:5173',
    },
    paths: { council_os: 'C:\\Dev\\Council-OS' },
  }),
  resolvePathKey: (_s, key) => (key === 'paths.council_os' ? 'C:\\Dev\\Council-OS' : null),
  appendLog: (_level, _source, message) => logs.push(message),
  repoRoot: require('path').join(__dirname, '..'),
  broadcastStatus: () => {},
});

assert.strictEqual(typeof manager.start, 'function');
assert.strictEqual(typeof manager.stop, 'function');
assert.strictEqual(typeof manager.restart, 'function');
assert.strictEqual(typeof manager.status, 'function');
assert.strictEqual(typeof manager.healthCheck, 'function');
assert.strictEqual(typeof manager.getDiagnostics, 'function');
assert.strictEqual(typeof manager.prepareWorkstation, 'function');
assert.strictEqual(typeof manager.openCouncil, 'function');

console.log('serviceManager.test.cjs: ok');

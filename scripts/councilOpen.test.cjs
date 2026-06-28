const assert = require('assert');
const { formatCouncilFailureDetail } = require('../electron/councilOpen.cjs');
const { getCouncilProbeUrl } = require('../electron/councilConfig.cjs');

const detail = formatCouncilFailureDetail({
  message: 'Council OS did not respond with HTTP 200 in time',
  councilDir: 'C:\\Dev\\Council-OS',
  launchRecord: {
    command: 'npm.cmd run dev',
    workingDirectory: 'C:\\Dev\\Council-OS',
    wrapperCommand: 'cmd.exe /c start /MIN',
    viteLog: 'C:\\Users\\test\\AppData\\Local\\CouncilOS\\vite.log',
    wrapperPid: 1234,
  },
  probeResult: { ok: false, status: 0, error: 'connect ECONNREFUSED' },
});

assert.match(detail, /npm\.cmd run dev/);
assert.match(detail, /C:\\Dev\\Council-OS/);
assert.match(detail, /Probe URL: http:\/\/127\.0\.0\.1:5173/);
assert.match(detail, /Port 5173:/);
assert.match(detail, /ECONNREFUSED/);

assert.strictEqual(getCouncilProbeUrl({ services: { council_os: 'http://localhost:5173' } }), 'http://127.0.0.1:5173');

console.log('councilOpen.test.cjs: ok');

/**
 * Integration smoke test for Council open flow (requires Council OS at C:\Dev\Council-OS).
 * Usage: node scripts/verify-council-open.cjs [open|restart]
 */
const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');
const { probeCouncilReady } = require('../electron/councilProbe.cjs');
const { launchCouncilDevServer } = require('../electron/councilLaunch.cjs');
const { openCouncilFlow } = require('../electron/councilOpen.cjs');
const { getCouncilProbeUrl, getCouncilViteLogPath } = require('../electron/councilConfig.cjs');
const { getListenersOnPort, COUNCIL_PORT } = require('../electron/councilPort.cjs');

const SETTINGS_PATH = 'C:\\AI\\AIStudio\\config\\settings.yaml';
const mode = process.argv[2] || 'open';
const logs = [];

function appendLog(level, source, message, meta = {}) {
  const line = { level, source, message, meta };
  logs.push(line);
  console.log(JSON.stringify(line));
}

function loadSettings() {
  return yaml.load(fs.readFileSync(SETTINGS_PATH, 'utf8'));
}

function resolvePathKey(settings, pathKey) {
  const parts = pathKey.split('.');
  let value = settings;
  for (const part of parts) {
    value = value?.[part];
  }
  return typeof value === 'string' && value.length > 0 ? value : null;
}

async function openCouncilInBrowser() {
  const url = getCouncilProbeUrl(loadSettings());
  const ready = await probeCouncilReady(url);
  if (!ready.ok) throw new Error(`Not ready: ${ready.error}`);
  appendLog('info', 'verify', 'Would open browser (probe OK)', { url });
}

function launchCouncilDevServerHidden(opts) {
  return launchCouncilDevServer({ ...opts, hideConsole: true });
}

(async () => {
  console.log('Before:', getListenersOnPort(COUNCIL_PORT));
  const result = await openCouncilFlow({
    restart: mode === 'restart',
    settings: loadSettings(),
    resolvePathKey,
    probeCouncilReady,
    launchCouncilDevServer: launchCouncilDevServerHidden,
    openCouncilInBrowser,
    appendLog,
  });
  console.log('After:', getListenersOnPort(COUNCIL_PORT));
  console.log('Result:', result);
  if (!result.ok) {
    console.error(result.detail);
    process.exit(1);
  }
  process.exit(0);
})().catch((err) => {
  console.error(err);
  process.exit(1);
});

const fs = require('fs');
const path = require('path');
const { shell } = require('electron');
const { getCouncilProbeUrl, getCouncilViteLogPath } = require('../councilConfig.cjs');
const { probeCouncilReady } = require('../councilProbe.cjs');
const { launchCouncilDevServer } = require('../councilLaunch.cjs');
const { openCouncilFlow, waitForCouncilHttp200 } = require('../councilOpen.cjs');
const { getListenersOnPort, killProcessOnPort, COUNCIL_PORT } = require('../councilPort.cjs');
const { isDeveloperLaunchMode } = require('../processSpawn.cjs');

const ID = 'council_os';
const LABEL = 'Council OS';

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function createCouncilService({ loadSettings, resolvePathKey, appendLog, repoRoot }) {
  let lastError = null;
  let lastLaunchRecord = null;

  function getCouncilDir() {
    const settings = loadSettings();
    const councilDir = resolvePathKey(settings, 'paths.council_os') || 'C:\\Dev\\Council-OS';
    if (!fs.existsSync(path.join(councilDir, 'package.json'))) {
      throw new Error(`Council OS not found at ${councilDir}`);
    }
    return councilDir;
  }

  function launchDevServer() {
    const councilDir = getCouncilDir();
    const viteLog = getCouncilViteLogPath();
    fs.mkdirSync(path.dirname(viteLog), { recursive: true });
    lastLaunchRecord = launchCouncilDevServer({
      councilDir,
      viteLog,
      appendLog,
      repoRoot,
      hideConsole: !isDeveloperLaunchMode(),
    });
    return lastLaunchRecord;
  }

  async function healthCheck() {
    const settings = loadSettings();
    const url = getCouncilProbeUrl(settings);
    const result = await probeCouncilReady(url);
    const ok = result.ok;
    if (!ok) lastError = result.error || 'Not reachable';
    return {
      ok,
      status: ok ? 'green' : 'red',
      message: ok ? 'Running' : result.error || 'Not reachable',
      url,
    };
  }

  async function status() {
    const health = await healthCheck();
    const listeners = getListenersOnPort(COUNCIL_PORT);
    return {
      id: ID,
      label: LABEL,
      port: COUNCIL_PORT,
      pid: listeners[0]?.pid ?? null,
      status: health.status,
      health: health.ok ? 'healthy' : 'unhealthy',
      message: health.message,
      url: health.url,
      lastError: health.ok ? null : lastError,
      autoStart: false,
      launchRecord: lastLaunchRecord,
    };
  }

  async function start() {
    try {
      const health = await healthCheck();
      if (health.ok) return health;
      launchDevServer();
      lastError = null;
      const ready = await waitForCouncilHttp200(probeCouncilReady, health.url);
      if (!ready.ok) {
        lastError = ready.error || 'Council OS did not respond with HTTP 200';
        throw new Error(lastError);
      }
      return healthCheck();
    } catch (err) {
      lastError = err instanceof Error ? err.message : String(err);
      appendLog('error', 'service', 'Council start failed', { error: lastError });
      throw err;
    }
  }

  async function stop() {
    const result = killProcessOnPort(COUNCIL_PORT);
    appendLog('info', 'service', 'Stopped Council OS', result);
    lastLaunchRecord = null;
    return { ok: true, ...result };
  }

  async function restart() {
    await stop();
    await sleep(2500);
    await start();
    return healthCheck();
  }

  async function openCouncilInBrowser() {
    const settings = loadSettings();
    const url = getCouncilProbeUrl(settings);
    const ready = await probeCouncilReady(url);
    if (!ready.ok) {
      throw new Error(`Council OS is not responding at ${url} (${ready.error || 'not ready'})`);
    }
    await shell.openExternal(url);
    appendLog('info', 'service', 'Opened Council OS', { url });
  }

  async function open() {
    const settings = loadSettings();
    const result = await openCouncilFlow({
      restart: false,
      settings,
      resolvePathKey,
      probeCouncilReady,
      launchCouncilDevServer: (opts) =>
        launchCouncilDevServer({ ...opts, hideConsole: !isDeveloperLaunchMode() }),
      openCouncilInBrowser,
      appendLog,
    });
    if (!result.ok) {
      lastError = result.message;
    } else {
      lastError = null;
    }
    return result;
  }

  async function restartAndOpen() {
    const settings = loadSettings();
    const result = await openCouncilFlow({
      restart: true,
      settings,
      resolvePathKey,
      probeCouncilReady,
      launchCouncilDevServer: (opts) =>
        launchCouncilDevServer({ ...opts, hideConsole: !isDeveloperLaunchMode() }),
      openCouncilInBrowser,
      appendLog,
    });
    if (!result.ok) {
      lastError = result.message;
    } else {
      lastError = null;
    }
    return result;
  }

  return {
    id: ID,
    label: LABEL,
    port: COUNCIL_PORT,
    autoStart: false,
    healthCheck,
    status,
    start,
    stop,
    restart,
    open,
    restartAndOpen,
  };
}

module.exports = { createCouncilService };

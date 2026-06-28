const { probeUrl } = require('./httpProbe.cjs');
const { getListenersOnPort, killProcessOnPort } = require('../councilPort.cjs');
const { isDeveloperLaunchMode, spawnDetached } = require('../processSpawn.cjs');

const ID = 'ollama';
const LABEL = 'Ollama';
const PORT = 11434;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function createOllamaService({ loadSettings, appendLog }) {
  let lastError = null;

  function getBaseUrl(settings) {
    return settings?.services?.ollama || 'http://127.0.0.1:11434';
  }

  async function healthCheck() {
    const settings = loadSettings();
    const base = getBaseUrl(settings);
    const url = `${base.replace(/\/$/, '')}/api/tags`;
    const result = await probeUrl(url);
    const ok = result.ok;
    if (!ok) lastError = result.error || 'Not reachable';
    return {
      ok,
      status: ok ? 'green' : 'red',
      message: ok ? 'Running' : result.error || 'Not reachable',
      url: base,
    };
  }

  async function status() {
    const health = await healthCheck();
    const listeners = getListenersOnPort(PORT);
    return {
      id: ID,
      label: LABEL,
      port: PORT,
      pid: listeners[0]?.pid ?? null,
      status: health.status,
      health: health.ok ? 'healthy' : 'unhealthy',
      message: health.message,
      url: health.url,
      lastError: health.ok ? null : lastError,
      autoStart: true,
    };
  }

  async function start() {
    try {
      if (isDeveloperLaunchMode()) {
        spawnDetached('cmd.exe', ['/c', 'start', 'Ollama Server', 'ollama', 'serve']).unref();
      } else {
        spawnDetached('ollama', ['serve'], { shell: true }).unref();
      }
      appendLog('info', 'service', 'Started Ollama', { hidden: !isDeveloperLaunchMode() });
      lastError = null;
      return { ok: true };
    } catch (err) {
      lastError = err instanceof Error ? err.message : String(err);
      appendLog('error', 'service', 'Ollama start failed', { error: lastError });
      throw err;
    }
  }

  async function stop() {
    const result = killProcessOnPort(PORT);
    appendLog('info', 'service', 'Stopped Ollama', result);
    return { ok: true, ...result };
  }

  async function waitForHealthy(timeoutMs = 180000, intervalMs = 2000) {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
      const health = await healthCheck();
      if (health.ok) return health;
      await sleep(intervalMs);
    }
    return healthCheck();
  }

  async function restart() {
    await stop();
    await sleep(2500);
    await start();
    return waitForHealthy();
  }

  return {
    id: ID,
    label: LABEL,
    port: PORT,
    autoStart: true,
    healthCheck,
    status,
    start,
    stop,
    restart,
    waitForHealthy,
  };
}

module.exports = { createOllamaService, OLLAMA_PORT: PORT };

const { execSync } = require('child_process');
const fs = require('fs');

const POLL_INTERVAL_MS = 2000;
const POLL_TIMEOUT_MS = 180000;
const LAUNCH_COOLDOWN_MS = 20000;
const SERVICE_ORDER = ['ollama', 'comfyui', 'council_os'];

const STARTING_LABELS = {
  ollama: 'Starting Ollama…',
  comfyui: 'Starting ComfyUI…',
  council_os: 'Starting Council OS…',
};

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function killProcessOnPort(port) {
  if (process.platform !== 'win32') return;
  try {
    const out = execSync(`netstat -ano | findstr ":${port}.*LISTENING"`, { encoding: 'utf8' });
    const pids = new Set();
    for (const line of out.split('\n')) {
      const parts = line.trim().split(/\s+/);
      const pid = parts[parts.length - 1];
      if (pid && pid !== '0') pids.add(pid);
    }
    for (const pid of pids) {
      try {
        execSync(`taskkill /PID ${pid} /F`, { stdio: 'ignore' });
      } catch {
        // ignore kill failures
      }
    }
  } catch {
    // no listener on port
  }
}

function createServiceStartup(deps) {
  const {
    checkOllama,
    checkComfyui,
    checkCouncilOs,
    launchOllamaServe,
    launchScript,
    resolvePathKey,
    loadSettings,
    appendLog,
    broadcastStatus,
  } = deps;

  const checks = {
    ollama: checkOllama,
    comfyui: checkComfyui,
    council_os: checkCouncilOs,
  };

  const starting = new Set();
  const lastLaunchAt = { ollama: 0, comfyui: 0, council_os: 0 };
  let preparePromise = null;

  async function probeService(id) {
    const settings = loadSettings();
    return checks[id](settings);
  }

  function serviceSnapshot(healthMap) {
    const snap = {};
    for (const id of SERVICE_ORDER) {
      const h = healthMap[id];
      snap[id] = h
        ? { id, label: h.label, status: h.status, message: h.message }
        : { id, label: id, status: 'red', message: 'Unknown' };
    }
    return snap;
  }

  function emitStatus(payload) {
    broadcastStatus(payload);
  }

  function canLaunch(id) {
    if (starting.has(id)) return false;
    return Date.now() - lastLaunchAt[id] >= LAUNCH_COOLDOWN_MS;
  }

  function markLaunch(id) {
    lastLaunchAt[id] = Date.now();
    starting.add(id);
  }

  function clearLaunch(id) {
    starting.delete(id);
  }

  async function launchService(id) {
    const settings = loadSettings();
    switch (id) {
      case 'ollama':
        launchOllamaServe();
        appendLog('info', 'workstation', 'Launching Ollama');
        return;
      case 'comfyui': {
        const bat =
          resolvePathKey(settings, 'launchers.comfyui_optimized_bat') ||
          resolvePathKey(settings, 'launchers.image_studio_bat');
        if (!bat || !fs.existsSync(bat)) {
          throw new Error('ComfyUI launcher not found in settings.yaml');
        }
        launchScript(bat, 'ComfyUI');
        appendLog('info', 'workstation', 'Launching ComfyUI', { path: bat });
        return;
      }
      case 'council_os': {
        let scriptPath = resolvePathKey(settings, 'launchers.council_os_vbs');
        if (!scriptPath || !fs.existsSync(scriptPath)) {
          scriptPath = resolvePathKey(settings, 'launchers.council_os_bat');
        }
        if (!scriptPath || !fs.existsSync(scriptPath)) {
          throw new Error('Council OS launcher not found in settings.yaml');
        }
        launchScript(scriptPath, 'Council OS');
        appendLog('info', 'workstation', 'Launching Council OS', { path: scriptPath });
        return;
      }
      default:
        throw new Error(`Unknown service: ${id}`);
    }
  }

  async function waitForReady(id, timeoutMs = POLL_TIMEOUT_MS) {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
      const health = await probeService(id);
      if (health.status === 'green') return health;
      await sleep(POLL_INTERVAL_MS);
    }
    return probeService(id);
  }

  async function ensureService(id, { forceLaunch = false } = {}) {
    const current = await probeService(id);
    if (current.status === 'green') return current;

    if (!forceLaunch && !canLaunch(id)) {
      if (starting.has(id)) {
        return waitForReady(id);
      }
      return current;
    }

    markLaunch(id);
    try {
      await launchService(id);
      const ready = await waitForReady(id);
      return ready;
    } finally {
      clearLaunch(id);
    }
  }

  async function runPrepare() {
    emitStatus({
      phase: 'starting',
      message: 'Starting services…',
      workbenchReady: false,
      services: serviceSnapshot({}),
    });

    const healthMap = {};
    for (const id of SERVICE_ORDER) {
      let health = await probeService(id);
      if (health.status !== 'green') {
        emitStatus({
          phase: 'starting',
          message: STARTING_LABELS[id],
          activeService: id,
          workbenchReady: false,
          services: serviceSnapshot(healthMap),
        });
        health = await ensureService(id);
      }
      healthMap[id] = health;
      emitStatus({
        phase: 'starting',
        message:
          health.status === 'green' ? `${health.label} ready` : `${health.label}: ${health.message}`,
        activeService: id,
        workbenchReady: false,
        services: serviceSnapshot(healthMap),
      });
    }

    const finalServices = await Promise.all(SERVICE_ORDER.map((id) => probeService(id)));
    const finalMap = {};
    for (const h of finalServices) finalMap[h.id] = h;

    const allGreen = SERVICE_ORDER.every((id) => finalMap[id]?.status === 'green');
    const payload = {
      phase: allGreen ? 'ready' : 'starting',
      message: allGreen ? 'Workbench ready' : 'Some services are offline',
      workbenchReady: allGreen,
      services: serviceSnapshot(finalMap),
    };
    emitStatus(payload);
    if (allGreen) {
      appendLog('info', 'workstation', 'Workbench ready');
    } else {
      appendLog('warn', 'workstation', 'Workbench not fully ready', {
        services: SERVICE_ORDER.map((id) => ({ id, status: finalMap[id]?.status })),
      });
    }
    return payload;
  }

  async function prepareWorkstation() {
    if (preparePromise) return preparePromise;
    preparePromise = runPrepare().finally(() => {
      preparePromise = null;
    });
    return preparePromise;
  }

  async function startServiceManual(id) {
    if (!SERVICE_ORDER.includes(id)) {
      throw new Error(`Unknown service: ${id}`);
    }
    emitStatus({
      phase: 'starting',
      message: STARTING_LABELS[id],
      activeService: id,
      workbenchReady: false,
      services: serviceSnapshot({}),
    });
    const health = await ensureService(id, { forceLaunch: true });
    const all = await Promise.all(SERVICE_ORDER.map((sid) => probeService(sid)));
    const map = {};
    for (const h of all) map[h.id] = h;
    const ready = SERVICE_ORDER.every((sid) => map[sid]?.status === 'green');
    const payload = {
      phase: ready ? 'ready' : 'starting',
      message: ready ? 'Workbench ready' : `${health.label} updated`,
      workbenchReady: ready,
      services: serviceSnapshot(map),
    };
    emitStatus(payload);
    return { ok: true, message: `${health.label}: ${health.message}`, services: Object.values(map) };
  }

  async function restartComfyui() {
    appendLog('info', 'workstation', 'Restarting ComfyUI');
    killProcessOnPort(8188);
    lastLaunchAt.comfyui = 0;
    starting.delete('comfyui');
    await sleep(2500);
    return startServiceManual('comfyui');
  }

  return {
    prepareWorkstation,
    startServiceManual,
    restartComfyui,
    probeService,
  };
}

module.exports = { createServiceStartup, SERVICE_ORDER, STARTING_LABELS };

const { execSync } = require('child_process');
const { openCouncilFlow } = require('./councilOpen.cjs');

const POLL_INTERVAL_MS = 2000;
const POLL_TIMEOUT_MS = 180000;
/** Council OS startup wait — matches start-council-os.bat (~45 tries × 2s) */
const COUNCIL_POLL_TIMEOUT_MS = 90000;
const LAUNCH_COOLDOWN_MS = 20000;
/** Background services started automatically on AI Studio launch */
const AUTO_START_SERVICES = ['ollama', 'comfyui'];
/** All services shown in workstation status (Council is on-demand) */
const MONITORED_SERVICES = ['ollama', 'comfyui', 'council_os'];

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
    launchCouncilOsSilent,
    launchComfyui,
    launchScript,
    resolvePathKey,
    loadSettings,
    appendLog,
    broadcastStatus,
    getCouncilServiceUrl,
    openCouncilInBrowser,
    probeCouncilReady,
    launchCouncilDevServer,
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
    for (const id of MONITORED_SERVICES) {
      const h = healthMap[id];
      snap[id] = h
        ? { id, label: h.label, status: h.status, message: h.message }
        : { id, label: id, status: 'red', message: 'Unknown' };
    }
    return snap;
  }

  function isWorkbenchReady(healthMap) {
    return AUTO_START_SERVICES.every((id) => healthMap[id]?.status === 'green');
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
    switch (id) {
      case 'ollama':
        launchOllamaServe();
        appendLog('info', 'workstation', 'Launching Ollama');
        return;
      case 'comfyui':
        launchComfyui();
        appendLog('info', 'workstation', 'Launching ComfyUI (background)');
        return;
      case 'council_os': {
        launchCouncilOsSilent();
        appendLog('info', 'workstation', 'Starting Council OS dev server (silent)');
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

  async function ensureService(id, { forceLaunch = false, timeoutMs } = {}) {
    const waitMs = timeoutMs ?? (id === 'council_os' ? COUNCIL_POLL_TIMEOUT_MS : POLL_TIMEOUT_MS);
    const current = await probeService(id);
    if (current.status === 'green') return current;

    if (!forceLaunch && !canLaunch(id)) {
      if (starting.has(id)) {
        return waitForReady(id, waitMs);
      }
      return current;
    }

    markLaunch(id);
    try {
      await launchService(id);
      const ready = await waitForReady(id, waitMs);
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
    for (const id of AUTO_START_SERVICES) {
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

    healthMap.council_os = await probeService('council_os');

    const finalMap = {};
    for (const id of MONITORED_SERVICES) {
      finalMap[id] = healthMap[id] ?? (await probeService(id));
    }

    const ready = isWorkbenchReady(finalMap);
    const payload = {
      phase: ready ? 'ready' : 'starting',
      message: ready ? 'Workbench ready' : 'Some background services are offline',
      workbenchReady: ready,
      services: serviceSnapshot(finalMap),
    };
    emitStatus(payload);
    if (ready) {
      appendLog('info', 'workstation', 'Workbench ready');
    } else {
      appendLog('warn', 'workstation', 'Workbench not fully ready', {
        services: AUTO_START_SERVICES.map((id) => ({ id, status: finalMap[id]?.status })),
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
    if (!MONITORED_SERVICES.includes(id)) {
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
    const all = await Promise.all(MONITORED_SERVICES.map((sid) => probeService(sid)));
    const map = {};
    for (const h of all) map[h.id] = h;
    const ready = isWorkbenchReady(map);
    const payload = {
      phase: ready ? 'ready' : 'starting',
      message: ready ? 'Workbench ready' : `${health.label} updated`,
      workbenchReady: ready,
      services: serviceSnapshot(map),
    };
    emitStatus(payload);
    return { ok: true, message: `${health.label}: ${health.message}`, services: Object.values(map) };
  }

  async function runCouncilFlow(restart = false) {
    const settings = loadSettings();

    const currentMap = {};
    for (const id of MONITORED_SERVICES) {
      currentMap[id] = await probeService(id);
    }

    emitStatus({
      phase: 'starting',
      message: restart ? 'Restarting Council OS…' : STARTING_LABELS.council_os,
      activeService: 'council_os',
      workbenchReady: isWorkbenchReady(currentMap),
      services: serviceSnapshot(currentMap),
    });

    if (restart) {
      lastLaunchAt.council_os = 0;
      starting.delete('council_os');
    }

    const result = await openCouncilFlow({
      restart,
      settings,
      resolvePathKey,
      probeCouncilReady,
      launchCouncilDevServer,
      openCouncilInBrowser,
      appendLog,
    });

    const all = await Promise.all(MONITORED_SERVICES.map((sid) => probeService(sid)));
    const map = {};
    for (const h of all) map[h.id] = h;
    const ready = isWorkbenchReady(map);
    emitStatus({
      phase: ready ? 'ready' : 'starting',
      message: result.ok ? (restart ? 'Council OS restarted' : 'Council OS opened') : result.message,
      workbenchReady: ready,
      services: serviceSnapshot(map),
    });

    return result;
  }

  async function openCouncilOs() {
    return runCouncilFlow(false);
  }

  async function restartCouncilOs() {
    return runCouncilFlow(true);
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
    openCouncilOs,
    restartCouncilOs,
    probeService,
  };
}

module.exports = {
  createServiceStartup,
  AUTO_START_SERVICES,
  MONITORED_SERVICES,
  STARTING_LABELS,
  COUNCIL_POLL_TIMEOUT_MS,
};

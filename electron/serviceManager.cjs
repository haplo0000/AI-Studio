const { createOllamaService } = require('./services/ollamaService.cjs');
const { createComfyuiService } = require('./services/comfyuiService.cjs');
const { createCouncilService } = require('./services/councilService.cjs');

const AUTO_START_SERVICES = ['ollama', 'comfyui'];
const MONITORED_SERVICES = ['ollama', 'comfyui', 'council_os'];
const LAUNCH_COOLDOWN_MS = 20000;

const STARTING_LABELS = {
  ollama: 'Starting Ollama…',
  comfyui: 'Starting ComfyUI…',
  council_os: 'Starting Council OS…',
};

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function createServiceManager(deps) {
  const { loadSettings, appendLog, broadcastStatus, repoRoot, resolvePathKey } = deps;

  const ollama = createOllamaService({ loadSettings, appendLog });
  const comfyui = createComfyuiService({ loadSettings, resolvePathKey, appendLog, repoRoot });
  const council = createCouncilService({ loadSettings, resolvePathKey, appendLog, repoRoot });

  const services = { ollama, comfyui, council_os: council };
  const starting = new Set();
  const lastLaunchAt = { ollama: 0, comfyui: 0, council_os: 0 };
  let preparePromise = null;

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

  async function healthCheck(id) {
    const svc = services[id];
    if (!svc) throw new Error(`Unknown service: ${id}`);
    return svc.healthCheck();
  }

  async function status(id) {
    const svc = services[id];
    if (!svc) throw new Error(`Unknown service: ${id}`);
    return svc.status();
  }

  async function getDiagnostics() {
    return Promise.all(MONITORED_SERVICES.map((id) => services[id].status()));
  }

  async function getHealthSnapshot() {
    const diagnostics = await getDiagnostics();
    return diagnostics.map((d) => ({
      id: d.id,
      label: d.label,
      status: d.status,
      message: d.message,
      url: d.url,
    }));
  }

  function serviceSnapshot(diagnostics) {
    const snap = {};
    for (const d of diagnostics) {
      snap[d.id] = { id: d.id, label: d.label, status: d.status, message: d.message };
    }
    for (const id of MONITORED_SERVICES) {
      if (!snap[id]) {
        snap[id] = { id, label: id, status: 'red', message: 'Unknown' };
      }
    }
    return snap;
  }

  function isWorkbenchReady(diagnostics) {
    return AUTO_START_SERVICES.every((id) => {
      const d = diagnostics.find((s) => s.id === id);
      return d?.status === 'green';
    });
  }

  function emitStatus(payload) {
    broadcastStatus(payload);
  }

  async function ensureService(id, { forceLaunch = false } = {}) {
    const svc = services[id];
    const current = await svc.status();
    if (current.status === 'green') return current;

    if (!forceLaunch && !canLaunch(id)) {
      if (starting.has(id) && svc.waitForHealthy) {
        await svc.waitForHealthy();
        return svc.status();
      }
      return current;
    }

    markLaunch(id);
    try {
      await svc.start();
      if (svc.waitForHealthy) {
        await svc.waitForHealthy();
      }
      return svc.status();
    } finally {
      clearLaunch(id);
    }
  }

  async function start(id) {
    if (!MONITORED_SERVICES.includes(id)) {
      throw new Error(`Unknown service: ${id}`);
    }
    const diagnostics = await getDiagnostics();
    emitStatus({
      phase: 'starting',
      message: STARTING_LABELS[id],
      activeService: id,
      workbenchReady: isWorkbenchReady(diagnostics),
      services: serviceSnapshot(diagnostics),
    });

    lastLaunchAt[id] = 0;
    starting.delete(id);
    const result = await ensureService(id, { forceLaunch: true });
    const all = await getDiagnostics();
    const ready = isWorkbenchReady(all);
    emitStatus({
      phase: ready ? 'ready' : 'starting',
      message: ready ? 'Workbench ready' : `${result.label}: ${result.message}`,
      workbenchReady: ready,
      services: serviceSnapshot(all),
    });
    return { ok: true, message: `${result.label}: ${result.message}`, services: await getHealthSnapshot() };
  }

  async function stop(id) {
    const svc = services[id];
    if (!svc) throw new Error(`Unknown service: ${id}`);
    await svc.stop();
    const all = await getDiagnostics();
    emitStatus({
      phase: isWorkbenchReady(all) ? 'ready' : 'starting',
      message: `${svc.label} stopped`,
      workbenchReady: isWorkbenchReady(all),
      services: serviceSnapshot(all),
    });
    return { ok: true, message: `${svc.label} stopped` };
  }

  async function restart(id) {
    const svc = services[id];
    if (!svc) throw new Error(`Unknown service: ${id}`);
    appendLog('info', 'service', `Restarting ${svc.label}`, { id });
    lastLaunchAt[id] = 0;
    starting.delete(id);
    await svc.restart();
    const all = await getDiagnostics();
    const ready = isWorkbenchReady(all);
    emitStatus({
      phase: ready ? 'ready' : 'starting',
      message: `${svc.label} restarted`,
      workbenchReady: ready,
      services: serviceSnapshot(all),
    });
    return { ok: true, message: `${svc.label} restarted`, services: await getHealthSnapshot() };
  }

  async function runPrepare() {
    emitStatus({
      phase: 'starting',
      message: 'Starting services…',
      workbenchReady: false,
      services: serviceSnapshot([]),
    });

    const diagnostics = [];
    for (const id of AUTO_START_SERVICES) {
      let diag = await services[id].status();
      if (diag.status !== 'green') {
        emitStatus({
          phase: 'starting',
          message: STARTING_LABELS[id],
          activeService: id,
          workbenchReady: false,
          services: serviceSnapshot(diagnostics),
        });
        diag = await ensureService(id);
      }
      diagnostics.push(diag);
      emitStatus({
        phase: 'starting',
        message: diag.status === 'green' ? `${diag.label} ready` : `${diag.label}: ${diag.message}`,
        activeService: id,
        workbenchReady: false,
        services: serviceSnapshot(diagnostics),
      });
    }

    diagnostics.push(await council.status());
    const all = await getDiagnostics();
    const ready = isWorkbenchReady(all);
    const payload = {
      phase: ready ? 'ready' : 'starting',
      message: ready ? 'Workbench ready' : 'Some background services are offline',
      workbenchReady: ready,
      services: serviceSnapshot(all),
    };
    emitStatus(payload);
    if (ready) {
      appendLog('info', 'workstation', 'Workbench ready');
    } else {
      appendLog('warn', 'workstation', 'Workbench not fully ready', {
        services: AUTO_START_SERVICES.map((id) => ({ id, status: all.find((d) => d.id === id)?.status })),
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

  async function openCouncil() {
    const all = await getDiagnostics();
    emitStatus({
      phase: 'starting',
      message: STARTING_LABELS.council_os,
      activeService: 'council_os',
      workbenchReady: isWorkbenchReady(all),
      services: serviceSnapshot(all),
    });

    lastLaunchAt.council_os = 0;
    starting.delete('council_os');
    const result = await council.open();

    const updated = await getDiagnostics();
    emitStatus({
      phase: isWorkbenchReady(updated) ? 'ready' : 'starting',
      message: result.ok ? 'Council OS opened' : result.message,
      workbenchReady: isWorkbenchReady(updated),
      services: serviceSnapshot(updated),
    });
    return result;
  }

  async function restartCouncil() {
    const all = await getDiagnostics();
    emitStatus({
      phase: 'starting',
      message: 'Restarting Council OS…',
      activeService: 'council_os',
      workbenchReady: isWorkbenchReady(all),
      services: serviceSnapshot(all),
    });

    lastLaunchAt.council_os = 0;
    starting.delete('council_os');
    const result = await council.restartAndOpen();

    const updated = await getDiagnostics();
    emitStatus({
      phase: isWorkbenchReady(updated) ? 'ready' : 'starting',
      message: result.ok ? 'Council OS restarted' : result.message,
      workbenchReady: isWorkbenchReady(updated),
      services: serviceSnapshot(updated),
    });
    return result;
  }

  async function shutdown() {
    appendLog('info', 'workstation', 'Service manager shutdown (processes left running)');
  }

  return {
    AUTO_START_SERVICES,
    MONITORED_SERVICES,
    healthCheck,
    status,
    getDiagnostics,
    getHealthSnapshot,
    start,
    stop,
    restart,
    prepareWorkstation,
    openCouncil,
    restartCouncil,
    shutdown,
  };
}

module.exports = {
  createServiceManager,
  AUTO_START_SERVICES,
  MONITORED_SERVICES,
  STARTING_LABELS,
};

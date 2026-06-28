const path = require('path');
const fs = require('fs');
const { probeUrl } = require('./httpProbe.cjs');
const { getListenersOnPort, killProcessOnPort } = require('../councilPort.cjs');
const { isDeveloperLaunchMode, spawnDetached, resolveWscriptExe } = require('../processSpawn.cjs');

const ID = 'comfyui';
const LABEL = 'ComfyUI';
const PORT = 8188;

const COMFYUI_OPTIMIZED_ARGS = [
  '-u',
  'main.py',
  '--preview-method',
  'auto',
  '--use-pytorch-cross-attention',
  '--enable-manager',
  '--cuda-malloc',
  '--bf16-unet',
  '--bf16-text-enc',
  '--fast',
  'fp16_accumulation',
  'autotune',
];

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function createComfyuiService({ loadSettings, resolvePathKey, appendLog, repoRoot }) {
  let lastError = null;

  function getBaseUrl(settings) {
    return settings?.services?.comfyui || 'http://127.0.0.1:8188';
  }

  function resolveComfyuiInstall(settings) {
    const comfyDir =
      resolvePathKey(settings, 'paths.comfyui') ||
      path.join(
        resolvePathKey(settings, 'paths.stability_matrix') || 'C:\\AI\\StabilityMatrix',
        'Data',
        'Packages',
        'ComfyUI',
      );
    const python = path.join(comfyDir, 'venv', 'Scripts', 'python.exe');
    return { comfyDir, python };
  }

  function launchScriptVisible(scriptPath, label) {
    if (!scriptPath || !fs.existsSync(scriptPath)) {
      throw new Error(`Launcher not found: ${scriptPath || '(empty)'}`);
    }
    spawnDetached('cmd.exe', ['/c', 'start', '""', scriptPath]).unref();
    appendLog('info', 'service', `Started ${label}`, { path: scriptPath, hidden: false });
  }

  function launchComfyuiHiddenWrapper(settings) {
    const bat =
      resolvePathKey(settings, 'launchers.comfyui_optimized_bat') ||
      path.join(
        resolvePathKey(settings, 'paths.stability_matrix') || 'C:\\AI\\StabilityMatrix',
        'Scripts',
        'Launch-ComfyUI-Optimized.bat',
      );
    const vbs = path.join(repoRoot, 'scripts', 'Launch-ComfyUI-Hidden.vbs');
    if (!fs.existsSync(vbs)) {
      throw new Error(`ComfyUI hidden launcher not found: ${vbs}`);
    }
    const wscript = resolveWscriptExe();
    spawnDetached(wscript, ['//Nologo', vbs], {
      env: { ...process.env, COMFYUI_OPTIMIZED_BAT: bat },
    }).unref();
    appendLog('info', 'service', 'Started ComfyUI via hidden wrapper', { bat, hidden: true });
  }

  async function healthCheck() {
    const settings = loadSettings();
    const base = getBaseUrl(settings);
    const url = `${base.replace(/\/$/, '')}/system_stats`;
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
      const settings = loadSettings();
      const optimizedBat = resolvePathKey(settings, 'launchers.comfyui_optimized_bat');

      if (isDeveloperLaunchMode()) {
        if (optimizedBat && fs.existsSync(optimizedBat)) {
          launchScriptVisible(optimizedBat, 'ComfyUI');
          lastError = null;
          return { ok: true };
        }
        throw new Error('ComfyUI optimized launcher not found in settings.yaml');
      }

      const { comfyDir, python } = resolveComfyuiInstall(settings);
      if (fs.existsSync(python) && fs.existsSync(path.join(comfyDir, 'main.py'))) {
        spawnDetached(python, COMFYUI_OPTIMIZED_ARGS, {
          cwd: comfyDir,
          env: {
            ...process.env,
            PYTHONUNBUFFERED: '1',
            PYTORCH_CUDA_ALLOC_CONF: 'expandable_segments:True',
          },
        }).unref();
        appendLog('info', 'service', 'Started ComfyUI directly (hidden)', { python, cwd: comfyDir });
        lastError = null;
        return { ok: true };
      }

      launchComfyuiHiddenWrapper(settings);
      lastError = null;
      return { ok: true };
    } catch (err) {
      lastError = err instanceof Error ? err.message : String(err);
      appendLog('error', 'service', 'ComfyUI start failed', { error: lastError });
      throw err;
    }
  }

  async function stop() {
    const result = killProcessOnPort(PORT);
    appendLog('info', 'service', 'Stopped ComfyUI', result);
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

module.exports = { createComfyuiService, COMFYUI_PORT: PORT };

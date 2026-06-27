const { app, BrowserWindow, ipcMain, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const http = require('http');
const https = require('https');
const { spawn } = require('child_process');
const yaml = require('js-yaml');

const HUB_ROOT = 'C:\\AI\\AIStudio';
const SETTINGS_PATH = path.join(HUB_ROOT, 'config', 'settings.yaml');
const LOG_PATH = path.join(HUB_ROOT, 'logs', 'studio.log');
const REPO_ROOT = path.join(__dirname, '..');
const MODULES_DIR = path.join(REPO_ROOT, 'modules');

/** @type {BrowserWindow | null} */
let mainWindow = null;

function appendLog(level, source, message, meta = {}) {
  const line = JSON.stringify({
    ts: new Date().toISOString(),
    level,
    source,
    message,
    meta,
  });
  try {
    fs.mkdirSync(path.dirname(LOG_PATH), { recursive: true });
    fs.appendFileSync(LOG_PATH, line + '\n', 'utf8');
  } catch {
    // ignore log write failures
  }
}

function loadSettings() {
  if (!fs.existsSync(SETTINGS_PATH)) {
    throw new Error(`Settings not found: ${SETTINGS_PATH}`);
  }
  const raw = fs.readFileSync(SETTINGS_PATH, 'utf8');
  return yaml.load(raw);
}

function getByPath(obj, keyPath) {
  return keyPath.split('.').reduce((acc, key) => (acc == null ? undefined : acc[key]), obj);
}

function resolvePathKey(settings, pathKey) {
  if (!pathKey) return null;
  const value = getByPath(settings, pathKey);
  return typeof value === 'string' && value.length > 0 ? value : null;
}

function probeUrl(urlString, timeoutMs = 4000) {
  return new Promise((resolve) => {
    try {
      const url = new URL(urlString);
      const lib = url.protocol === 'https:' ? https : http;
      const req = lib.request(
        url,
        { method: 'GET', timeout: timeoutMs },
        (res) => {
          res.resume();
          resolve({ ok: res.statusCode >= 200 && res.statusCode < 500, status: res.statusCode });
        },
      );
      req.on('timeout', () => {
        req.destroy();
        resolve({ ok: false, status: 0, error: 'timeout' });
      });
      req.on('error', (err) => resolve({ ok: false, status: 0, error: err.message }));
      req.end();
    } catch (err) {
      resolve({ ok: false, status: 0, error: err.message });
    }
  });
}

async function checkOllama(settings) {
  const base = settings.services?.ollama || 'http://127.0.0.1:11434';
  const url = `${base.replace(/\/$/, '')}/api/tags`;
  const result = await probeUrl(url);
  return {
    id: 'ollama',
    label: 'Ollama',
    status: result.ok ? 'green' : 'red',
    message: result.ok ? 'Running' : result.error || 'Not reachable',
    url: base,
  };
}

async function checkComfyui(settings) {
  const base = settings.services?.comfyui || 'http://127.0.0.1:8188';
  const url = `${base.replace(/\/$/, '')}/system_stats`;
  const result = await probeUrl(url);
  return {
    id: 'comfyui',
    label: 'ComfyUI',
    status: result.ok ? 'green' : 'red',
    message: result.ok ? 'Running' : result.error || 'Not reachable',
    url: base,
  };
}

async function checkCouncilOs(settings) {
  const base = settings.services?.council_os || 'http://localhost:5173';
  const result = await probeUrl(base);
  return {
    id: 'council_os',
    label: 'Council OS',
    status: result.ok ? 'green' : 'red',
    message: result.ok ? 'Running' : result.error || 'Not reachable',
    url: base,
  };
}

function loadManifests() {
  if (!fs.existsSync(MODULES_DIR)) return [];
  const enabledPath = path.join(HUB_ROOT, 'config', 'modules.enabled.json');
  let order = [];
  if (fs.existsSync(enabledPath)) {
    try {
      order = JSON.parse(fs.readFileSync(enabledPath, 'utf8')).order || [];
    } catch {
      order = [];
    }
  }

  const manifests = fs
    .readdirSync(MODULES_DIR, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => {
      const manifestPath = path.join(MODULES_DIR, d.name, 'module.manifest.json');
      if (!fs.existsSync(manifestPath)) return null;
      try {
        return JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
      } catch {
        return null;
      }
    })
    .filter(Boolean);

  manifests.sort((a, b) => {
    const ai = order.indexOf(a.id);
    const bi = order.indexOf(b.id);
    return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi);
  });

  return manifests;
}

function readRecentLogs(limit = 80) {
  if (!fs.existsSync(LOG_PATH)) return [];
  const lines = fs.readFileSync(LOG_PATH, 'utf8').trim().split('\n').filter(Boolean);
  return lines
    .slice(-limit)
    .map((line) => {
      try {
        return JSON.parse(line);
      } catch {
        return { ts: '', level: 'info', source: 'studio', message: line };
      }
    })
    .reverse();
}

function launchScript(scriptPath, label) {
  if (!scriptPath || !fs.existsSync(scriptPath)) {
    throw new Error(`Launcher not found: ${scriptPath || '(empty)'}`);
  }
  const ext = path.extname(scriptPath).toLowerCase();
  if (ext === '.vbs') {
    spawn('wscript.exe', [scriptPath], { detached: true, stdio: 'ignore', windowsHide: true }).unref();
  } else if (ext === '.bat' || ext === '.cmd') {
    spawn('cmd.exe', ['/c', 'start', '""', scriptPath], { detached: true, stdio: 'ignore', windowsHide: true }).unref();
  } else if (ext === '.exe') {
    spawn(scriptPath, [], { detached: true, stdio: 'ignore', windowsHide: true }).unref();
  } else {
    shell.openPath(scriptPath);
  }
  appendLog('info', 'launch', `Started ${label}`, { path: scriptPath });
}

function launchCursor() {
  const candidates = [
    path.join(process.env.LOCALAPPDATA || '', 'Programs', 'cursor', 'Cursor.exe'),
    path.join(process.env.LOCALAPPDATA || '', 'Programs', 'Cursor', 'Cursor.exe'),
  ];
  const exe = candidates.find((p) => fs.existsSync(p));
  if (exe) {
    spawn(exe, [], { detached: true, stdio: 'ignore', windowsHide: true }).unref();
    appendLog('info', 'launch', 'Started Cursor', { path: exe });
    return;
  }
  spawn('cmd.exe', ['/c', 'start', 'cursor'], { detached: true, stdio: 'ignore', shell: true }).unref();
  appendLog('info', 'launch', 'Started Cursor via PATH');
}

function launchOllamaServe() {
  spawn('cmd.exe', ['/c', 'start', 'Ollama Server', 'ollama', 'serve'], {
    detached: true,
    stdio: 'ignore',
    windowsHide: false,
  }).unref();
  appendLog('info', 'launch', 'Started ollama serve');
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 860,
    minWidth: 960,
    minHeight: 640,
    backgroundColor: '#0b0f17',
    title: 'AI Studio',
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  if (process.env.NODE_ENV === 'development') {
    mainWindow.loadURL('http://127.0.0.1:5174');
  } else {
    mainWindow.loadFile(path.join(REPO_ROOT, 'dist', 'index.html'));
  }
}

app.whenReady().then(() => {
  appendLog('info', 'studio', 'AI Studio started (Phase 2A)');
  createWindow();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

ipcMain.handle('studio:get-bootstrap', async () => {
  const settings = loadSettings();
  const services = await Promise.all([
    checkOllama(settings),
    checkComfyui(settings),
    checkCouncilOs(settings),
  ]);
  return {
    settings,
    services,
    modules: loadManifests(),
    logs: readRecentLogs(),
    tauriBlocked: true,
    runtimeNote:
      'Tauri 2 was not available (Rust toolchain missing). Phase 2A uses Electron as the desktop shell.',
  };
});

ipcMain.handle('studio:refresh-health', async () => {
  const settings = loadSettings();
  return Promise.all([checkOllama(settings), checkComfyui(settings), checkCouncilOs(settings)]);
});

ipcMain.handle('studio:get-logs', async () => readRecentLogs());

ipcMain.handle('studio:launch-module', async (_event, moduleId) => {
  const settings = loadSettings();
  const manifests = loadManifests();
  const manifest = manifests.find((m) => m.id === moduleId);
  if (!manifest) throw new Error(`Unknown module: ${moduleId}`);

  if (manifest.status === 'placeholder') {
    throw new Error(`${manifest.name} is not implemented yet.`);
  }

  const launch = manifest.launch || {};

  if (launch.type === 'command' && moduleId === 'ollama') {
    launchOllamaServe();
    return { ok: true, message: 'Ollama server launch requested' };
  }

  if (launch.type === 'project') {
    const folder = resolvePathKey(settings, launch.pathKey);
    if (!folder) {
      throw new Error(
        `Project folder not configured. Set ${launch.pathKey} in ${SETTINGS_PATH}`,
      );
    }
    if (!fs.existsSync(folder)) {
      throw new Error(`Project folder does not exist: ${folder}`);
    }
    await shell.openPath(folder);
    appendLog('info', 'launch', `Opened project folder: ${manifest.name}`, { path: folder });
    return { ok: true, message: `Opened ${folder}` };
  }

  if (launch.type === 'multi') {
    return { ok: true, message: 'Use individual launch actions for this module.' };
  }

  let scriptPath = resolvePathKey(settings, launch.pathKey);
  if (scriptPath && !fs.existsSync(scriptPath) && launch.fallbackPathKey) {
    scriptPath = resolvePathKey(settings, launch.fallbackPathKey);
  }

  if (scriptPath) {
    launchScript(scriptPath, manifest.name);
    return { ok: true, message: `Launched ${manifest.name}` };
  }

  throw new Error(`No launcher configured for ${manifest.name}`);
});

ipcMain.handle('studio:launch-action', async (_event, action) => {
  const settings = loadSettings();

  switch (action) {
    case 'stability-matrix': {
      const exe = resolvePathKey(settings, 'launchers.stability_matrix_exe');
      launchScript(exe, 'Stability Matrix');
      return { ok: true, message: 'Launched Stability Matrix' };
    }
    case 'cursor': {
      launchCursor();
      return { ok: true, message: 'Launched Cursor' };
    }
    case 'open-comfyui': {
      const url = settings.services?.comfyui || 'http://127.0.0.1:8188';
      await shell.openExternal(url);
      appendLog('info', 'launch', 'Opened ComfyUI in browser', { url });
      return { ok: true, message: 'Opened ComfyUI URL' };
    }
    case 'open-council': {
      const url = settings.services?.council_os || 'http://localhost:5173';
      await shell.openExternal(url);
      appendLog('info', 'launch', 'Opened Council OS in browser', { url });
      return { ok: true, message: 'Opened Council OS URL' };
    }
    case 'open-hub-logs': {
      await shell.openPath(path.join(HUB_ROOT, 'logs'));
      return { ok: true, message: 'Opened logs folder' };
    }
    case 'open-hub-config': {
      await shell.openPath(path.join(HUB_ROOT, 'config'));
      return { ok: true, message: 'Opened config folder' };
    }
    default:
      throw new Error(`Unknown action: ${action}`);
  }
});

ipcMain.handle('studio:open-url', async (_event, url) => {
  await shell.openExternal(url);
  return { ok: true };
});

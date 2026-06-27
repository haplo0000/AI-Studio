const { app, BrowserWindow, ipcMain, shell, protocol, net } = require('electron');
const path = require('path');

protocol.registerSchemesAsPrivileged([
  {
    scheme: 'media',
    privileges: {
      standard: true,
      secure: true,
      supportFetchAPI: true,
      stream: true,
      bypassCSP: true,
    },
  },
]);

const fs = require('fs');
const http = require('http');
const https = require('https');
const { pathToFileURL } = require('url');
const { spawn } = require('child_process');
const yaml = require('js-yaml');
const blacksmith = require('./blacksmith.cjs');
const { createServiceStartup } = require('./serviceStartup.cjs');

const ALLOWED_MEDIA_ROOTS = [
  'C:\\AI\\StabilityMatrix\\Data\\Images',
  'C:\\AI\\AIStudio',
];

const HUB_ROOT = 'C:\\AI\\AIStudio';
const SETTINGS_PATH = path.join(HUB_ROOT, 'config', 'settings.yaml');
const LOG_PATH = path.join(HUB_ROOT, 'logs', 'studio.log');
const REPO_ROOT = path.join(__dirname, '..');
const MODULES_DIR = path.join(REPO_ROOT, 'modules');
const PRELOAD_PATH = path.resolve(__dirname, 'preload.cjs');
const DEV_SERVER_URL = process.env.VITE_DEV_SERVER_URL || 'http://127.0.0.1:5174';

/** @type {import('electron').BrowserWindow | null} */
let mainWindow = null;
/** @type {ReturnType<typeof createServiceStartup> | null} */
let serviceStartup = null;
let workstationPrepareTriggered = false;

function isDevRuntime() {
  return !app.isPackaged && process.env.NODE_ENV !== 'production';
}

function isAllowedMediaPath(filePath) {
  const normalized = path.resolve(String(filePath || '').replace(/\//g, path.sep));
  return ALLOWED_MEDIA_ROOTS.some((root) => normalized.toLowerCase().startsWith(root.toLowerCase()));
}

const MEDIA_MIME_BY_EXT = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.bmp': 'image/bmp',
};

function resolveMediaFilePath(requestUrl) {
  const url = new URL(requestUrl);
  if (url.hostname !== 'local') return null;
  const fromQuery = url.searchParams.get('path');
  if (fromQuery) {
    return path.resolve(decodeURIComponent(fromQuery).replace(/\//g, path.sep));
  }
  let encoded = url.pathname.startsWith('/') ? url.pathname.slice(1) : url.pathname;
  if (!encoded) return null;
  return path.resolve(decodeURIComponent(encoded).replace(/\//g, path.sep));
}

function getMediaMimeType(filePath) {
  return MEDIA_MIME_BY_EXT[path.extname(filePath).toLowerCase()] || 'application/octet-stream';
}

function getImageStudio() {
  return require('./imageStudio.cjs');
}

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

function saveSettings(settings) {
  fs.mkdirSync(path.dirname(SETTINGS_PATH), { recursive: true });
  fs.writeFileSync(SETTINGS_PATH, yaml.dump(settings, { lineWidth: 120, noRefs: true }), 'utf8');
}

function resolveProjectPath(settings, entry) {
  if (entry.repository_path && typeof entry.repository_path === 'string') {
    return entry.repository_path;
  }
  if (entry.path_key) {
    return resolvePathKey(settings, entry.path_key);
  }
  return null;
}

function resolveProjectStatus(entry, repositoryPath) {
  if (entry.status === 'placeholder') return 'placeholder';
  if (!repositoryPath) return 'unconfigured';
  if (!fs.existsSync(repositoryPath)) return 'unconfigured';
  return entry.status === 'active' ? 'active' : entry.status || 'active';
}

function hydrateWorkshops(settings) {
  const workshopConfig =
    settings.workshops || settings.projects || { current: null, entries: [] };
  const entries = (workshopConfig.entries || []).map((entry) => {
    const repository_path = resolveProjectPath(settings, entry);
    return {
      id: entry.id,
      name: entry.name,
      description: entry.description || '',
      status: resolveProjectStatus(entry, repository_path),
      repository_path,
      path_key: entry.path_key || null,
      council_project_id: entry.council_project_id || null,
    };
  });

  let current = workshopConfig.current || null;
  if (current && !entries.some((e) => e.id === current)) {
    current = entries[0]?.id || null;
  }
  if (!current && entries.length > 0) {
    current = entries[0].id;
  }

  return { entries, current };
}

function findWorkshop(settings, workshopId) {
  const { entries } = hydrateWorkshops(settings);
  const entry = entries.find((e) => e.id === workshopId);
  if (!entry) throw new Error(`Unknown workshop: ${workshopId}`);
  return entry;
}

/** @deprecated use hydrateWorkshops */
function hydrateProjects(settings) {
  return hydrateWorkshops(settings);
}

/** @deprecated use findWorkshop */
function findProject(settings, projectId) {
  return findWorkshop(settings, projectId);
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

function findCursorExe() {
  const candidates = [
    path.join(process.env.LOCALAPPDATA || '', 'Programs', 'cursor', 'Cursor.exe'),
    path.join(process.env.LOCALAPPDATA || '', 'Programs', 'Cursor', 'Cursor.exe'),
  ];
  return candidates.find((p) => fs.existsSync(p)) || null;
}

function launchCursor(folderPath) {
  const exe = findCursorExe();
  if (exe) {
    const args = folderPath ? [folderPath] : [];
    spawn(exe, args, { detached: true, stdio: 'ignore', windowsHide: true }).unref();
    appendLog('info', 'launch', 'Started Cursor', { path: exe, folder: folderPath || null });
    return;
  }
  const cmd = folderPath ? `cursor "${folderPath}"` : 'cursor';
  spawn('cmd.exe', ['/c', 'start', cmd], { detached: true, stdio: 'ignore', shell: true }).unref();
  appendLog('info', 'launch', 'Started Cursor via PATH', { folder: folderPath || null });
}

function launchOllamaServe() {
  spawn('cmd.exe', ['/c', 'start', 'Ollama Server', 'ollama', 'serve'], {
    detached: true,
    stdio: 'ignore',
    windowsHide: false,
  }).unref();
  appendLog('info', 'launch', 'Started ollama serve');
}

function initServiceStartup() {
  serviceStartup = createServiceStartup({
    checkOllama,
    checkComfyui,
    checkCouncilOs,
    launchOllamaServe,
    launchScript,
    resolvePathKey,
    loadSettings,
    appendLog,
    broadcastStatus: (status) => {
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('studio:workstation-status', status);
      }
    },
  });
}

function triggerWorkstationPrepare() {
  if (workstationPrepareTriggered || !serviceStartup) return;
  workstationPrepareTriggered = true;
  void serviceStartup.prepareWorkstation().catch((err) => {
    appendLog('error', 'workstation', 'Prepare failed', { error: err.message });
  });
}

function createWindow() {
  if (!fs.existsSync(PRELOAD_PATH)) {
    const message = `Preload script not found: ${PRELOAD_PATH}`;
    appendLog('error', 'preload', message);
    throw new Error(message);
  }

  mainWindow = new BrowserWindow({
    width: 1280,
    height: 860,
    minWidth: 960,
    minHeight: 640,
    backgroundColor: '#0b0f17',
    title: 'AI Studio',
    webPreferences: {
      preload: PRELOAD_PATH,
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  mainWindow.webContents.on('preload-error', (_event, preloadPath, error) => {
    const message = `Preload failed: ${error.message}`;
    appendLog('error', 'preload', message, { path: preloadPath });
    console.error('[preload-error]', preloadPath, error);
  });

  mainWindow.webContents.on('did-fail-load', (_event, errorCode, errorDescription, validatedURL) => {
    appendLog('error', 'studio', `Window load failed: ${errorDescription}`, {
      code: errorCode,
      url: validatedURL,
    });
    console.error('[did-fail-load]', errorCode, errorDescription, validatedURL);
  });

  mainWindow.webContents.on('did-finish-load', () => {
    mainWindow.webContents
      .executeJavaScript('typeof window.aiStudio')
      .then((apiType) => {
        if (apiType !== 'object') {
          const message = 'Preload bridge missing after page load (window.aiStudio undefined)';
          appendLog('error', 'preload', message, { url: mainWindow.webContents.getURL() });
          console.error('[preload]', message);
        }
      })
      .catch(() => {
        // ignore probe failures
      });
    triggerWorkstationPrepare();
  });

  if (isDevRuntime()) {
    mainWindow.loadURL(DEV_SERVER_URL);
  } else {
    mainWindow.loadFile(path.join(REPO_ROOT, 'dist', 'index.html'));
  }
}

app.whenReady().then(() => {
  protocol.handle('media', async (request) => {
    try {
      const filePath = resolveMediaFilePath(request.url);
      if (!filePath || !isAllowedMediaPath(filePath) || !fs.existsSync(filePath)) {
        return new Response('Forbidden', { status: 403 });
      }
      try {
        return await net.fetch(pathToFileURL(filePath).href);
      } catch {
        const data = fs.readFileSync(filePath);
        return new Response(data, {
          headers: { 'Content-Type': getMediaMimeType(filePath) },
        });
      }
    } catch (err) {
      return new Response(String(err), { status: 500 });
    }
  });

  getImageStudio().registerImageStudioIpc(ipcMain, loadSettings, appendLog);
  initServiceStartup();
  appendLog('info', 'studio', 'AI Studio started (Phase 3.5 Image Studio)');
  createWindow();
});

app.on('will-quit', () => {
  try {
    getImageStudio().stopWatcher();
  } catch {
    // image studio module not loaded
  }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

ipcMain.handle('studio:get-bootstrap', async () => {
  const settings = loadSettings();
  const { entries: workshops, current: currentWorkshopId } = hydrateWorkshops(settings);
  const services = await Promise.all([
    checkOllama(settings),
    checkComfyui(settings),
    checkCouncilOs(settings),
  ]);
  return {
    settings: {
      ...settings,
      workshops: { current: currentWorkshopId, entries: workshops },
    },
    services,
    modules: loadManifests(),
    workshops,
    currentWorkshopId,
    logs: readRecentLogs(),
    tauriBlocked: true,
    runtimeNote:
      'Tauri 2 was not available (Rust toolchain missing). AI Workbench uses Electron as the desktop shell.',
  };
});

ipcMain.handle('studio:refresh-health', async () => {
  const settings = loadSettings();
  return Promise.all([checkOllama(settings), checkComfyui(settings), checkCouncilOs(settings)]);
});

ipcMain.handle('studio:prepare-workstation', async () => {
  if (!serviceStartup) throw new Error('Workstation services not initialized');
  return serviceStartup.prepareWorkstation();
});

ipcMain.handle('studio:start-service', async (_event, serviceId) => {
  if (!serviceStartup) throw new Error('Workstation services not initialized');
  return serviceStartup.startServiceManual(serviceId);
});

ipcMain.handle('studio:restart-comfyui', async () => {
  if (!serviceStartup) throw new Error('Workstation services not initialized');
  return serviceStartup.restartComfyui();
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

ipcMain.handle('studio:set-current-workshop', async (_event, workshopId) => {
  const settings = loadSettings();
  const { entries } = hydrateWorkshops(settings);
  if (!entries.some((e) => e.id === workshopId)) {
    throw new Error(`Unknown workshop: ${workshopId}`);
  }
  settings.workshops = settings.workshops || settings.projects || { entries: [] };
  settings.workshops.current = workshopId;
  delete settings.projects;
  saveSettings(settings);
  appendLog('info', 'workbench', `Current workshop context: ${workshopId}`, { workshopId });
  return { ok: true, currentWorkshopId: workshopId };
});

ipcMain.handle('studio:open-workshop-folder', async (_event, workshopId) => {
  const settings = loadSettings();
  const workshop = findWorkshop(settings, workshopId);
  if (!workshop.repository_path) {
    throw new Error(`Repository path not configured for ${workshop.name}`);
  }
  if (!fs.existsSync(workshop.repository_path)) {
    throw new Error(`Workshop folder does not exist: ${workshop.repository_path}`);
  }
  await shell.openPath(workshop.repository_path);
  appendLog('info', 'launch', `Opened workshop folder: ${workshop.name}`, {
    path: workshop.repository_path,
  });
  return { ok: true, message: `Opened ${workshop.repository_path}` };
});

ipcMain.handle('studio:open-workshop-cursor', async (_event, workshopId) => {
  const settings = loadSettings();
  const workshop = findWorkshop(settings, workshopId);
  if (!workshop.repository_path) {
    throw new Error(`Repository path not configured for ${workshop.name}`);
  }
  if (!fs.existsSync(workshop.repository_path)) {
    throw new Error(`Workshop folder does not exist: ${workshop.repository_path}`);
  }
  launchCursor(workshop.repository_path);
  return { ok: true, message: `Opened ${workshop.name} in Cursor` };
});

ipcMain.handle('blacksmith:create-session', async (_event, workshopId, mode, goal) => {
  const session = blacksmith.createSession({ workshopId, mode, goal });
  appendLog('info', 'blacksmith', 'Session created', { sessionId: session.id, mode });
  return session;
});

ipcMain.handle('blacksmith:get-session', async (_event, sessionId) => {
  return blacksmith.syncCouncilStatus(blacksmith.loadSession(sessionId));
});

ipcMain.handle('blacksmith:list-sessions', async () => {
  return blacksmith.listSessions().map((s) => blacksmith.syncCouncilStatus(s));
});

ipcMain.handle('blacksmith:send-message', async (_event, sessionId, content) => {
  const settings = loadSettings();
  const session = await blacksmith.sendMessage(settings, sessionId, content);
  appendLog('info', 'blacksmith', 'Message exchanged', { sessionId });
  return session;
});

ipcMain.handle('blacksmith:send-to-council', async (_event, sessionId) => {
  const settings = loadSettings();
  const session = blacksmith.syncCouncilStatus(blacksmith.loadSession(sessionId));
  const { brief } = blacksmith.packageCouncilBrief(session);

  const vbs = resolvePathKey(settings, 'launchers.council_os_vbs');
  if (vbs && fs.existsSync(vbs)) {
    launchScript(vbs, 'Council OS');
  }

  await shell.openPath(blacksmith.BRIEFS_DIR);
  appendLog('info', 'blacksmith', 'Council brief packaged', {
    sessionId,
    briefId: brief.id,
    path: path.join(blacksmith.BRIEFS_DIR, `${brief.id}.json`),
  });

  return {
    ok: true,
    message: `Council Brief packaged. Council OS launched — brief at council-briefs/${brief.id}.json`,
    briefId: brief.id,
    briefPath: path.join(blacksmith.BRIEFS_DIR, `${brief.id}.json`),
  };
});

const { app, BrowserWindow, ipcMain, shell, protocol, net, Menu } = require('electron');
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
const { pathToFileURL } = require('url');
const yaml = require('js-yaml');
const blacksmith = require('./blacksmith.cjs');
const { createServiceManager } = require('./serviceManager.cjs');
const { isCouncilServiceUrl } = require('./councilConfig.cjs');
const { spawnDetached } = require('./processSpawn.cjs');
const { installApplicationMenu, attachEditableContextMenu } = require('./applicationMenu.cjs');

const ALLOWED_MEDIA_ROOTS = [
  'C:\\AI\\StabilityMatrix\\Data\\Images',
  'C:\\AI\\StabilityMatrix\\Data\\Videos',
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
/** @type {ReturnType<typeof createServiceManager> | null} */
let serviceManager = null;
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
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.mov': 'video/quicktime',
  '.mkv': 'video/x-matroska',
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

function getVideoStudio() {
  return require('./videoStudio.cjs');
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

function launchScript(scriptPath, label) {
  if (!scriptPath || !fs.existsSync(scriptPath)) {
    throw new Error(`Launcher not found: ${scriptPath || '(empty)'}`);
  }
  const ext = path.extname(scriptPath).toLowerCase();
  const { isDeveloperLaunchMode } = require('./processSpawn.cjs');
  const hidden = !isDeveloperLaunchMode();

  if (ext === '.vbs') {
    const { resolveWscriptExe } = require('./processSpawn.cjs');
    spawnDetached(resolveWscriptExe(), ['//Nologo', scriptPath]).unref();
  } else if (ext === '.bat' || ext === '.cmd') {
    if (hidden) {
      spawnDetached(process.env.ComSpec || 'C:\\Windows\\System32\\cmd.exe', ['/c', scriptPath]).unref();
    } else {
      spawnDetached(process.env.ComSpec || 'C:\\Windows\\System32\\cmd.exe', ['/c', 'start', '""', scriptPath]).unref();
    }
  } else if (ext === '.exe') {
    spawnDetached(scriptPath, []).unref();
  } else {
    shell.openPath(scriptPath);
  }
  appendLog('info', 'launch', `Started ${label}`, { path: scriptPath, hidden });
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

function findCursorExe() {
  const candidates = [
    path.join(process.env.LOCALAPPDATA || '', 'Programs', 'cursor', 'Cursor.exe'),
    path.join(process.env.LOCALAPPDATA || '', 'Programs', 'Cursor', 'Cursor.exe'),
  ];
  return candidates.find((p) => fs.existsSync(p)) || null;
}

function launchCursor(folderPath) {
  const { spawn } = require('child_process');
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

function initServiceManager() {
  serviceManager = createServiceManager({
    loadSettings,
    resolvePathKey,
    appendLog,
    repoRoot: REPO_ROOT,
    broadcastStatus: (status) => {
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('studio:workstation-status', status);
      }
    },
  });
}

function triggerWorkstationPrepare() {
  if (workstationPrepareTriggered || !serviceManager) return;
  workstationPrepareTriggered = true;
  void serviceManager.prepareWorkstation().catch((err) => {
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

  attachEditableContextMenu(mainWindow.webContents, Menu);
  mainWindow.setMenuBarVisibility(false);

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
  installApplicationMenu(Menu);
  appendLog('info', 'studio', 'Application menu installed (edit shortcuts enabled)');

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
  getVideoStudio().registerVideoStudioIpc(ipcMain, loadSettings, appendLog);
  initServiceManager();
  appendLog('info', 'studio', 'AI Studio started (Phase 4 Video MVP)');
  createWindow();
});

app.on('will-quit', () => {
  try {
    getImageStudio().stopWatcher();
  } catch {
    // image studio module not loaded
  }
  try {
    getVideoStudio().stopVideoWatcher();
  } catch {
    // video studio module not loaded
  }
  if (serviceManager) {
    void serviceManager.shutdown();
  }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

ipcMain.handle('studio:get-bootstrap', async () => {
  const settings = loadSettings();
  const { entries: workshops, current: currentWorkshopId } = hydrateWorkshops(settings);
  if (!serviceManager) throw new Error('Workstation services not initialized');
  const services = await serviceManager.getHealthSnapshot();
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
  if (!serviceManager) throw new Error('Workstation services not initialized');
  return serviceManager.getHealthSnapshot();
});

ipcMain.handle('studio:get-service-diagnostics', async () => {
  if (!serviceManager) throw new Error('Workstation services not initialized');
  return serviceManager.getDiagnostics();
});

ipcMain.handle('studio:prepare-workstation', async () => {
  if (!serviceManager) throw new Error('Workstation services not initialized');
  return serviceManager.prepareWorkstation();
});

ipcMain.handle('studio:start-service', async (_event, serviceId) => {
  if (!serviceManager) throw new Error('Workstation services not initialized');
  return serviceManager.start(serviceId);
});

ipcMain.handle('studio:stop-service', async (_event, serviceId) => {
  if (!serviceManager) throw new Error('Workstation services not initialized');
  return serviceManager.stop(serviceId);
});

ipcMain.handle('studio:restart-service', async (_event, serviceId) => {
  if (!serviceManager) throw new Error('Workstation services not initialized');
  if (serviceId === 'council_os') {
    return serviceManager.restartCouncil();
  }
  return serviceManager.restart(serviceId);
});

ipcMain.handle('studio:restart-comfyui', async () => {
  if (!serviceManager) throw new Error('Workstation services not initialized');
  return serviceManager.restart('comfyui');
});

ipcMain.handle('studio:restart-council', async () => {
  if (!serviceManager) throw new Error('Workstation services not initialized');
  return serviceManager.restartCouncil();
});

ipcMain.handle('studio:open-council', async () => {
  if (!serviceManager) throw new Error('Workstation services not initialized');
  return serviceManager.openCouncil();
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

  if (moduleId === 'council-os') {
    if (!serviceManager) throw new Error('Workstation services not initialized');
    return serviceManager.openCouncil();
  }

  const launch = manifest.launch || {};

  if (launch.type === 'command' && moduleId === 'ollama') {
    if (!serviceManager) throw new Error('Workstation services not initialized');
    return serviceManager.start('ollama');
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
      if (!serviceManager) throw new Error('Workstation services not initialized');
      return serviceManager.openCouncil();
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
  const settings = loadSettings();
  if (isCouncilServiceUrl(settings, url)) {
    if (!serviceManager) throw new Error('Workstation services not initialized');
    const result = await serviceManager.openCouncil();
    if (!result.ok) {
      const err = new Error(result.message);
      err.detail = result.detail;
      throw err;
    }
    return result;
  }
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
  const session = blacksmith.syncCouncilStatus(blacksmith.loadSession(sessionId));
  const { brief } = blacksmith.packageCouncilBrief(session);

  if (serviceManager) {
    try {
      const result = await serviceManager.openCouncil();
      if (!result.ok) {
        appendLog('warn', 'blacksmith', 'Council OS open failed after brief', {
          error: result.message,
          detail: result.detail,
        });
      }
    } catch (err) {
      appendLog('warn', 'blacksmith', 'Council OS open failed after brief', { error: err.message });
    }
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

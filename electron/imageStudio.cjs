const fs = require('fs');
const path = require('path');
const http = require('http');
const crypto = require('crypto');
const { execSync } = require('child_process');
const chokidar = require('chokidar');

/** @type {typeof import('better-sqlite3') | null} */
let Database = null;
/** @type {import('better-sqlite3').Database | null} */
let db = null;

const HUB_ROOT = 'C:\\AI\\AIStudio';
const DEFAULT_OUTPUT_ROOT = 'C:\\AI\\StabilityMatrix\\Data\\Images';
const DB_PATH = path.join(HUB_ROOT, 'registry', 'images.sqlite');
const THUMB_CACHE_DIR = path.join(HUB_ROOT, 'cache', 'thumbnails');
const WORKFLOW_TEMPLATE = path.join(
  'C:\\AI\\StabilityMatrix',
  'Data',
  'Workflows',
  'api_test_prompt.json',
);
const UPSCALE_WORKFLOW = path.join(
  'C:\\AI\\StabilityMatrix',
  'Data',
  'Workflows',
  'upscale',
  'upscale_4x_ultrasharp.json',
);

const IMAGE_EXTENSIONS = new Set(['.png', '.jpg', '.jpeg', '.webp', '.gif', '.bmp']);
const STYLE_SUFFIX = {
  default: '',
  portrait: 'photorealistic portrait, detailed face, studio lighting',
  landscape: 'cinematic landscape, golden hour, highly detailed environment',
  cinematic: 'cinematic still, dramatic lighting, film grain',
  anime: 'anime style, vibrant colors, detailed illustration',
};

const ASPECT_DIMENSIONS = {
  portrait: { width: 832, height: 1216 },
  landscape: { width: 1216, height: 832 },
  square: { width: 1024, height: 1024 },
  wallpaper: { width: 2560, height: 1600 },
  'phone-wallpaper': { width: 1080, height: 1920 },
  'legion-wallpaper': { width: 2560, height: 1600 },
};

/** @type {import('chokidar').FSWatcher | null} */
let watcher = null;
/** @type {import('electron').WebContents | null} */
let notifyWindow = null;
/** @type {Map<string, string>} */
const thumbCache = new Map();
/** @type {Map<string, object>} */
const pendingGenerations = new Map();

function getDatabaseModule() {
  if (!Database) {
    Database = require('better-sqlite3');
  }
  return Database;
}

function getElectronModule() {
  return require('electron');
}

function ensureDirs() {
  fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
  fs.mkdirSync(THUMB_CACHE_DIR, { recursive: true });
}

function getOutputRoot(settings) {
  return (
    settings.image_studio?.output_folder ||
    settings.paths?.image_output ||
    DEFAULT_OUTPUT_ROOT
  );
}

function initDb() {
  ensureDirs();
  if (db) return db;
  const Sqlite = getDatabaseModule();
  db = new Sqlite(DB_PATH);
  db.pragma('journal_mode = WAL');
  db.exec(`
    CREATE TABLE IF NOT EXISTS images (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      path TEXT UNIQUE NOT NULL,
      filename TEXT NOT NULL,
      folder TEXT,
      mtime INTEGER NOT NULL,
      size INTEGER,
      width INTEGER,
      height INTEGER,
      timestamp TEXT,
      workflow TEXT,
      checkpoint TEXT,
      seed INTEGER,
      cfg REAL,
      steps INTEGER,
      resolution TEXT,
      prompt TEXT,
      negative_prompt TEXT,
      generation_time_ms INTEGER,
      tags TEXT,
      indexed_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_images_mtime ON images(mtime DESC);
  `);
  db.exec(`
    CREATE VIRTUAL TABLE IF NOT EXISTS images_fts USING fts5(
      path UNINDEXED,
      filename,
      prompt,
      negative_prompt,
      tags,
      folder
    );
  `);
  return db;
}

function upsertFts(row) {
  const database = initDb();
  database.prepare('DELETE FROM images_fts WHERE path = ?').run(row.path);
  database
    .prepare(
      `INSERT INTO images_fts (path, filename, prompt, negative_prompt, tags, folder)
       VALUES (?, ?, ?, ?, ?, ?)`,
    )
    .run(
      row.path,
      row.filename || '',
      row.prompt || '',
      row.negative_prompt || '',
      row.tags || '',
      row.folder || '',
    );
}

function rebuildFts() {
  const database = initDb();
  database.exec('DELETE FROM images_fts');
  const rows = database.prepare('SELECT * FROM images').all();
  for (const row of rows) {
    upsertFts(row);
  }
}

function extractPngMetadata(filePath) {
  try {
    const buf = fs.readFileSync(filePath);
    const text = buf.toString('latin1');
    const meta = {};
    const promptMatch = text.match(/"prompt"\s*:\s*"(\{[\s\S]*?\})"\s*,/);
    if (promptMatch) {
      try {
        const promptJson = JSON.parse(promptMatch[1].replace(/\\"/g, '"'));
        for (const node of Object.values(promptJson)) {
          if (node.class_type === 'CLIPTextEncode' && node.inputs?.text) {
            if (!meta.prompt) meta.prompt = node.inputs.text;
            else meta.negative_prompt = node.inputs.text;
          }
          if (node.class_type === 'KSampler') {
            meta.seed = node.inputs?.seed;
            meta.steps = node.inputs?.steps;
            meta.cfg = node.inputs?.cfg;
          }
          if (node.class_type === 'EmptyLatentImage') {
            meta.width = node.inputs?.width;
            meta.height = node.inputs?.height;
          }
          if (node.class_type === 'CheckpointLoaderSimple') {
            meta.checkpoint = node.inputs?.ckpt_name;
          }
        }
      } catch {
        // ignore parse errors
      }
    }
    if (meta.width && meta.height) {
      meta.resolution = `${meta.width}x${meta.height}`;
    }
    return meta;
  } catch {
    return {};
  }
}

function upsertImage(filePath, extra = {}) {
  if (!fs.existsSync(filePath)) return null;
  const stat = fs.statSync(filePath);
  const ext = path.extname(filePath).toLowerCase();
  if (!IMAGE_EXTENSIONS.has(ext)) return null;

  const database = initDb();
  const pngMeta = ext === '.png' ? extractPngMetadata(filePath) : {};
  const merged = { ...pngMeta, ...extra };
  const folder = path.dirname(filePath);
  const filename = path.basename(filePath);

  const existing = database.prepare('SELECT id FROM images WHERE path = ?').get(filePath);

  if (existing) {
    database
      .prepare(
        `UPDATE images SET mtime=?, size=?, filename=?, folder=?,
         width=COALESCE(?, width), height=COALESCE(?, height),
         timestamp=COALESCE(?, timestamp), workflow=COALESCE(?, workflow),
         checkpoint=COALESCE(?, checkpoint), seed=COALESCE(?, seed),
         cfg=COALESCE(?, cfg), steps=COALESCE(?, steps),
         resolution=COALESCE(?, resolution), prompt=COALESCE(?, prompt),
         negative_prompt=COALESCE(?, negative_prompt),
         generation_time_ms=COALESCE(?, generation_time_ms),
         tags=COALESCE(?, tags), indexed_at=?
         WHERE path=?`,
      )
      .run(
        stat.mtimeMs,
        stat.size,
        filename,
        folder,
        merged.width ?? null,
        merged.height ?? null,
        merged.timestamp ?? new Date(stat.mtimeMs).toISOString(),
        merged.workflow ?? null,
        merged.checkpoint ?? null,
        merged.seed ?? null,
        merged.cfg ?? null,
        merged.steps ?? null,
        merged.resolution ?? null,
        merged.prompt ?? null,
        merged.negative_prompt ?? null,
        merged.generation_time_ms ?? null,
        merged.tags ?? null,
        new Date().toISOString(),
        filePath,
      );
    const updated = database.prepare('SELECT * FROM images WHERE path = ?').get(filePath);
    if (updated) upsertFts(updated);
    return updated;
  }

  const info = database
    .prepare(
      `INSERT INTO images (
        path, filename, folder, mtime, size, width, height, timestamp,
        workflow, checkpoint, seed, cfg, steps, resolution,
        prompt, negative_prompt, generation_time_ms, tags, indexed_at
      ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    )
    .run(
      filePath,
      filename,
      folder,
      stat.mtimeMs,
      stat.size,
      merged.width ?? null,
      merged.height ?? null,
      merged.timestamp ?? new Date(stat.mtimeMs).toISOString(),
      merged.workflow ?? 'comfyui',
      merged.checkpoint ?? null,
      merged.seed ?? null,
      merged.cfg ?? null,
      merged.steps ?? null,
      merged.resolution ?? null,
      merged.prompt ?? null,
      merged.negative_prompt ?? null,
      merged.generation_time_ms ?? null,
      merged.tags ?? null,
      new Date().toISOString(),
    );
  const inserted = database.prepare('SELECT * FROM images WHERE id = ?').get(info.lastInsertRowid);
  if (inserted) upsertFts(inserted);
  return inserted;
}

function removeImage(filePath) {
  const database = initDb();
  const row = database.prepare('SELECT id FROM images WHERE path = ?').get(filePath);
  if (row) {
    database.prepare('DELETE FROM images WHERE path = ?').run(filePath);
    database.prepare('DELETE FROM images_fts WHERE path = ?').run(filePath);
  }
  thumbCache.delete(filePath);
}

function walkImages(root, limit = 5000, files = []) {
  if (!fs.existsSync(root) || files.length >= limit) return files;
  let entries;
  try {
    entries = fs.readdirSync(root, { withFileTypes: true });
  } catch {
    return files;
  }
  for (const entry of entries) {
    if (files.length >= limit) break;
    const full = path.join(root, entry.name);
    if (entry.isDirectory()) {
      walkImages(full, limit, files);
    } else if (IMAGE_EXTENSIONS.has(path.extname(entry.name).toLowerCase())) {
      files.push(full);
    }
  }
  return files;
}

function initialScan(outputRoot) {
  const files = walkImages(outputRoot, 10000);
  files.sort((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs);
  for (const file of files) {
    upsertImage(file);
  }
  rebuildFts();
}

function getDiskSpace(folderPath) {
  try {
    const driveLetter = path.parse(folderPath).root.replace(':\\', '').replace('\\', '');
    const out = execSync(
      `powershell -NoProfile -Command "(Get-PSDrive -Name '${driveLetter}').Free; (Get-PSDrive -Name '${driveLetter}').Used"`,
      { encoding: 'utf8', timeout: 5000 },
    ).trim();
    const parts = out.split(/\s+/).map(Number).filter(Boolean);
    if (parts.length >= 2) {
      return { freeDiskBytes: parts[0], totalDiskBytes: parts[0] + parts[1] };
    }
  } catch {
    // ignore
  }
  return { freeDiskBytes: null, totalDiskBytes: null };
}

function listImages({ offset = 0, limit = 60, search = '' } = {}) {
  const database = initDb();
  if (search.trim()) {
    const term = search.trim().replace(/"/g, '');
    return database
      .prepare(
        `SELECT i.* FROM images_fts fts
         JOIN images i ON i.path = fts.path
         WHERE images_fts MATCH ?
         ORDER BY i.mtime DESC
         LIMIT ? OFFSET ?`,
      )
      .all(`${term}*`, limit, offset);
  }
  return database
    .prepare('SELECT * FROM images ORDER BY mtime DESC LIMIT ? OFFSET ?')
    .all(limit, offset);
}

function getStats(outputRoot) {
  const database = initDb();
  const totalImages = database.prepare('SELECT COUNT(*) AS c FROM images').get().c;
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const imagesToday = database
    .prepare('SELECT COUNT(*) AS c FROM images WHERE mtime >= ?')
    .get(todayStart.getTime()).c;
  const last = database.prepare('SELECT timestamp, mtime FROM images ORDER BY mtime DESC LIMIT 1').get();
  const disk = getDiskSpace(outputRoot);
  return {
    outputFolder: outputRoot,
    freeDiskBytes: disk.freeDiskBytes,
    totalDiskBytes: disk.totalDiskBytes,
    imagesToday,
    lastImageTime: last ? last.timestamp || new Date(last.mtime).toISOString() : null,
    totalImages,
  };
}

function getThumbnailDataUrl(filePath, size = 256) {
  if (thumbCache.has(filePath)) return thumbCache.get(filePath);
  try {
    const { nativeImage } = getElectronModule();
    const thumb = nativeImage.createThumbnailFromPath(filePath, { width: size, height: size });
    const dataUrl = thumb.toDataURL();
    if (thumbCache.size > 500) {
      const first = thumbCache.keys().next().value;
      thumbCache.delete(first);
    }
    thumbCache.set(filePath, dataUrl);
    return dataUrl;
  } catch {
    return null;
  }
}

function postJson(urlString, body, timeoutMs = 120000) {
  return new Promise((resolve, reject) => {
    try {
      const url = new URL(urlString);
      const payload = JSON.stringify(body);
      const req = http.request(
        url,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(payload),
          },
          timeout: timeoutMs,
        },
        (res) => {
          let data = '';
          res.on('data', (c) => {
            data += c;
          });
          res.on('end', () => {
            if (res.statusCode < 200 || res.statusCode >= 300) {
              reject(new Error(`HTTP ${res.statusCode}: ${data.slice(0, 300)}`));
              return;
            }
            try {
              resolve(JSON.parse(data));
            } catch {
              resolve({ raw: data });
            }
          });
        },
      );
      req.on('timeout', () => {
        req.destroy();
        reject(new Error('Request timed out'));
      });
      req.on('error', reject);
      req.write(payload);
      req.end();
    } catch (err) {
      reject(err);
    }
  });
}

function loadWorkflowTemplate(templatePath) {
  const p = fs.existsSync(templatePath) ? templatePath : WORKFLOW_TEMPLATE;
  if (!fs.existsSync(p)) {
    throw new Error(`Workflow template not found: ${p}`);
  }
  return JSON.parse(fs.readFileSync(p, 'utf8'));
}

function scaleDimensions(base, targetResolution) {
  const maxDim = Math.max(base.width, base.height);
  const scale = targetResolution / maxDim;
  return {
    width: Math.round(base.width * scale / 8) * 8,
    height: Math.round(base.height * scale / 8) * 8,
  };
}

function buildPrompt(params) {
  const styleExtra = STYLE_SUFFIX[params.style] || '';
  const parts = [params.prompt.trim(), styleExtra].filter(Boolean);
  return parts.join(', ');
}

function queueGeneration(settings, params) {
  const base = (settings.services?.comfyui || 'http://127.0.0.1:8188').replace(/\/$/, '');
  const workflow = loadWorkflowTemplate(WORKFLOW_TEMPLATE);
  const aspect = ASPECT_DIMENSIONS[params.aspect] || ASPECT_DIMENSIONS.square;
  const dims = scaleDimensions(aspect, params.resolution || 1024);
  const seed = params.seed ?? Math.floor(Math.random() * 1_000_000_000);
  const prefix = `aistudio_${Date.now()}`;

  workflow['3'].inputs.seed = seed;
  workflow['3'].inputs.steps = params.steps ?? 20;
  workflow['3'].inputs.cfg = params.cfg ?? 6.5;
  workflow['5'].inputs.width = dims.width;
  workflow['5'].inputs.height = dims.height;
  workflow['5'].inputs.batch_size = params.count ?? 1;
  workflow['6'].inputs.text = buildPrompt(params);
  workflow['7'].inputs.text = params.negativePrompt || 'blurry, low quality, watermark, text, deformed';
  workflow['10'].inputs.filename_prefix = prefix;

  const clientId = crypto.randomUUID();
  return postJson(`${base}/prompt`, { prompt: workflow, client_id: clientId }).then((result) => {
    pendingGenerations.set(prefix, {
      prompt: buildPrompt(params),
      negative_prompt: params.negativePrompt,
      seed,
      cfg: params.cfg ?? 6.5,
      steps: params.steps ?? 20,
      resolution: `${dims.width}x${dims.height}`,
      workflow: 'api_test_prompt',
      checkpoint: workflow['4']?.inputs?.ckpt_name,
      startedAt: Date.now(),
    });
    return { promptId: result.prompt_id, prefix, seed, dims };
  });
}

function queueUpscale(settings, imagePath) {
  if (!fs.existsSync(UPSCALE_WORKFLOW)) {
    throw new Error('Upscale workflow not found');
  }
  const base = (settings.services?.comfyui || 'http://127.0.0.1:8188').replace(/\/$/, '');
  const workflow = loadWorkflowTemplate(UPSCALE_WORKFLOW);
  const prefix = `aistudio_upscale_${Date.now()}`;
  const loadNode = Object.values(workflow).find((n) => n.class_type === 'LoadImage');
  if (loadNode) {
    loadNode.inputs.image = imagePath;
  }
  const saveNode = Object.values(workflow).find((n) => n.class_type === 'SaveImage');
  if (saveNode) {
    saveNode.inputs.filename_prefix = prefix;
  }
  const clientId = crypto.randomUUID();
  return postJson(`${base}/prompt`, { prompt: workflow, client_id: clientId });
}

function attachPendingMetadata(filePath) {
  const filename = path.basename(filePath);
  for (const [prefix, meta] of pendingGenerations.entries()) {
    if (filename.includes(prefix)) {
      upsertImage(filePath, {
        ...meta,
        generation_time_ms: Date.now() - meta.startedAt,
        timestamp: new Date().toISOString(),
      });
      pendingGenerations.delete(prefix);
      return;
    }
  }
  return upsertImage(filePath);
}

function startWatcher(outputRoot, webContents) {
  notifyWindow = webContents;
  if (watcher) watcher.close();
  initialScan(outputRoot);
  watcher = chokidar.watch(outputRoot, {
    persistent: true,
    ignoreInitial: true,
    awaitWriteFinish: { stabilityThreshold: 800, pollInterval: 100 },
    ignored: (p) => {
      try {
        if (!fs.existsSync(p)) return false;
        const st = fs.statSync(p);
        if (st.isDirectory()) return false;
        return !IMAGE_EXTENSIONS.has(path.extname(p).toLowerCase());
      } catch {
        return true;
      }
    },
  });

  const notify = (type, filePath) => {
    if (webContents && !webContents.isDestroyed()) {
      webContents.send('image-studio:changed', { type, path: filePath });
    }
  };

  watcher.on('add', (filePath) => {
    if (!IMAGE_EXTENSIONS.has(path.extname(filePath).toLowerCase())) return;
    attachPendingMetadata(filePath);
    notify('add', filePath);
  });
  watcher.on('change', (filePath) => {
    if (!IMAGE_EXTENSIONS.has(path.extname(filePath).toLowerCase())) return;
    upsertImage(filePath);
    notify('change', filePath);
  });
  watcher.on('unlink', (filePath) => {
    removeImage(filePath);
    notify('unlink', filePath);
  });
}

function stopWatcher() {
  if (watcher) {
    watcher.close();
    watcher = null;
  }
}

function registerImageStudioIpc(ipcMain, loadSettings, appendLog) {
  ipcMain.handle('image-studio:start', async (event) => {
    const settings = loadSettings();
    const outputRoot = getOutputRoot(settings);
    initDb();
    startWatcher(outputRoot, event.sender);
    appendLog('info', 'image-studio', 'Gallery watcher started', { outputRoot });
    return { ok: true, outputRoot };
  });

  ipcMain.handle('image-studio:stop', async () => {
    stopWatcher();
    return { ok: true };
  });

  ipcMain.handle('image-studio:stats', async () => {
    const settings = loadSettings();
    const outputRoot = getOutputRoot(settings);
    return getStats(outputRoot);
  });

  ipcMain.handle('image-studio:list', async (_event, opts) => listImages(opts || {}));

  ipcMain.handle('image-studio:search', async (_event, query, opts) =>
    listImages({ ...opts, search: query }),
  );

  ipcMain.handle('image-studio:thumbnail', async (_event, filePath) => ({
    dataUrl: getThumbnailDataUrl(filePath),
  }));

  ipcMain.handle('image-studio:delete', async (_event, filePath) => {
    const { shell } = getElectronModule();
    if (!fs.existsSync(filePath)) throw new Error('File not found');
    await shell.trashItem(filePath);
    removeImage(filePath);
    appendLog('info', 'image-studio', 'Image moved to trash', { path: filePath });
    return { ok: true };
  });

  ipcMain.handle('image-studio:reveal', async (_event, filePath) => {
    getElectronModule().shell.showItemInFolder(filePath);
    return { ok: true };
  });

  ipcMain.handle('image-studio:open-folder', async (_event, folderPath) => {
    await getElectronModule().shell.openPath(folderPath || getOutputRoot(loadSettings()));
    return { ok: true };
  });

  ipcMain.handle('image-studio:open-viewer', async (_event, filePath) => {
    await getElectronModule().shell.openPath(filePath);
    return { ok: true };
  });

  ipcMain.handle('image-studio:copy-image', async (_event, filePath) => {
    const { nativeImage, clipboard } = getElectronModule();
    const img = nativeImage.createFromPath(filePath);
    clipboard.writeImage(img);
    return { ok: true };
  });

  ipcMain.handle('image-studio:copy-prompt', async (_event, filePath) => {
    const { clipboard } = getElectronModule();
    const database = initDb();
    const row = database.prepare('SELECT prompt FROM images WHERE path = ?').get(filePath);
    const prompt = row?.prompt || '';
    clipboard.writeText(prompt);
    return { ok: true, prompt };
  });

  ipcMain.handle('image-studio:generate', async (_event, params) => {
    const settings = loadSettings();
    const started = Date.now();
    try {
      const results = [];
      const count = params.count ?? 1;
      for (let i = 0; i < count; i++) {
        const result = await queueGeneration(settings, {
          ...params,
          count: 1,
          seed: params.seed != null ? params.seed + i : undefined,
        });
        results.push(result);
      }
      appendLog('info', 'image-studio', 'Generation queued via ComfyUI', {
        count,
        ms: Date.now() - started,
      });
      return {
        ok: true,
        message: `Queued ${count} generation(s) — ComfyUI is executing. Images appear automatically.`,
        promptIds: results.map((r) => r.promptId),
      };
    } catch (err) {
      throw new Error(err.message || 'Generation failed — is ComfyUI running?');
    }
  });

  ipcMain.handle('image-studio:variations', async (_event, filePath) => {
    const settings = loadSettings();
    const database = initDb();
    const row = database.prepare('SELECT * FROM images WHERE path = ?').get(filePath);
    if (!row?.prompt) throw new Error('No prompt metadata for this image');
    return queueGeneration(settings, {
      prompt: row.prompt,
      negativePrompt: row.negative_prompt || '',
      style: 'default',
      aspect: 'square',
      resolution: 1024,
      count: 1,
    }).then((r) => ({
      ok: true,
      message: 'Variation queued',
      promptId: r.promptId,
    }));
  });

  ipcMain.handle('image-studio:upscale', async (_event, filePath) => {
    const settings = loadSettings();
    await queueUpscale(settings, filePath);
    appendLog('info', 'image-studio', 'Upscale queued', { path: filePath });
    return { ok: true, message: 'Upscale queued via ComfyUI' };
  });

  ipcMain.handle('image-studio:get-image', async (_event, filePath) => {
    const database = initDb();
    return (
      database.prepare('SELECT * FROM images WHERE path = ?').get(filePath) ||
      upsertImage(filePath)
    );
  });
}

module.exports = {
  registerImageStudioIpc,
  stopWatcher,
  getOutputRoot,
  initDb,
};

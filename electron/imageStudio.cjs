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
const IMG2IMG_WORKFLOW_CANDIDATES = [
  path.join('C:\\AI\\StabilityMatrix', 'Data', 'Workflows', 'img2img', 'img2img_sdxl_edit.json'),
  path.join('C:\\AI\\StabilityMatrix', 'Data', 'Workflows', 'img2img_sdxl_edit.json'),
];
const IMG2IMG_WORKFLOW_API_FALLBACK = path.join(__dirname, 'workflows', 'img2img_sdxl_edit_api.json');
const DEFAULT_EDIT_NEGATIVE =
  'blurry, low quality, watermark, text, deformed, bad anatomy, artifacts';
const COMFY_INPUT_STAGING = path.join(HUB_ROOT, 'cache', 'comfy-input');

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

const COMFY_CLIENT_ID = crypto.randomUUID();
/** @type {Map<string, object>} */
const generationJobs = new Map();
/** @type {Map<string, string>} */
const promptIdToJobId = new Map();
/** @type {Map<string, string>} */
const prefixToJobId = new Map();

/** @type {WebSocket | null} */
let comfyWs = null;
let comfyWsBase = null;
/** @type {ReturnType<typeof setInterval> | null} */
let comfyPollTimer = null;
/** @type {ReturnType<typeof setTimeout> | null} */
let comfyWsRetryTimer = null;

function truncateLabel(text, max = 48) {
  const trimmed = String(text || '').trim();
  if (trimmed.length <= max) return trimmed;
  return `${trimmed.slice(0, max - 1)}…`;
}

function serializeGenerationJobs() {
  const now = Date.now();
  return Array.from(generationJobs.values()).map((job) => ({
    id: job.id,
    promptId: job.promptId,
    prefix: job.prefix,
    label: job.label,
    status: job.status,
    phase: job.phase,
    progress: job.progress,
    startedAt: job.startedAt,
    completedAt: job.completedAt ?? null,
    elapsedMs: (job.completedAt ?? now) - job.startedAt,
    error: job.error ?? null,
    batchIndex: job.batchIndex ?? null,
    batchTotal: job.batchTotal ?? null,
  }));
}

function broadcastGenerationProgress() {
  if (notifyWindow && !notifyWindow.isDestroyed()) {
    notifyWindow.send('image-studio:generation-progress', { jobs: serializeGenerationJobs() });
  }
}

function registerGenerationJob({ promptId, prefix, label, batchIndex, batchTotal }) {
  const id = crypto.randomUUID();
  const job = {
    id,
    promptId,
    prefix,
    label,
    status: 'queued',
    phase: 'Waiting for ComfyUI…',
    progress: null,
    startedAt: Date.now(),
    completedAt: null,
    error: null,
    batchIndex: batchIndex ?? null,
    batchTotal: batchTotal ?? null,
  };
  generationJobs.set(id, job);
  promptIdToJobId.set(promptId, id);
  prefixToJobId.set(prefix, id);
  broadcastGenerationProgress();
  return job;
}

function markGenerationJobError(jobId, message) {
  const job = generationJobs.get(jobId);
  if (!job || job.status === 'complete') return;
  job.status = 'error';
  job.phase = 'Error';
  job.error = message;
  job.completedAt = Date.now();
  broadcastGenerationProgress();
  scheduleGenerationJobCleanup(jobId, job.promptId, job.prefix);
}

function markGenerationJobSaving(promptId) {
  const jobId = promptIdToJobId.get(promptId);
  if (!jobId) return;
  const job = generationJobs.get(jobId);
  if (!job || job.status === 'complete' || job.status === 'error') return;
  job.status = 'saving';
  job.phase = 'Saving image…';
  job.progress = null;
  broadcastGenerationProgress();
}

function markGenerationJobCompleteForPrefix(prefix) {
  const jobId = prefixToJobId.get(prefix);
  if (!jobId) return;
  const job = generationJobs.get(jobId);
  if (!job || job.status === 'complete') return;
  job.status = 'complete';
  job.phase = 'Complete';
  job.progress = 100;
  job.completedAt = Date.now();
  broadcastGenerationProgress();
  scheduleGenerationJobCleanup(jobId, job.promptId, prefix);
}

function scheduleGenerationJobCleanup(jobId, promptId, prefix) {
  setTimeout(() => {
    generationJobs.delete(jobId);
    if (promptId) promptIdToJobId.delete(promptId);
    if (prefix) prefixToJobId.delete(prefix);
    broadcastGenerationProgress();
    if (generationJobs.size === 0) {
      stopComfyProgressMonitor();
    }
  }, 6000);
}

function handleComfyWsMessage(raw) {
  let msg;
  try {
    msg = JSON.parse(raw);
  } catch {
    return;
  }
  const { type, data } = msg;
  if (!data?.prompt_id) return;

  const jobId = promptIdToJobId.get(data.prompt_id);
  if (!jobId) return;
  const job = generationJobs.get(jobId);
  if (!job || job.status === 'complete' || job.status === 'error') return;

  if (type === 'progress' && data.max > 0) {
    job.status = 'running';
    job.phase = 'Generating…';
    job.progress = Math.min(100, Math.round((data.value / data.max) * 100));
    broadcastGenerationProgress();
    return;
  }

  if (type === 'executing') {
    if (data.node) {
      job.status = 'running';
      job.phase = 'Generating…';
      broadcastGenerationProgress();
    } else {
      markGenerationJobSaving(data.prompt_id);
    }
  }
}

function getJson(urlString, timeoutMs = 10000) {
  return new Promise((resolve, reject) => {
    try {
      const url = new URL(urlString);
      const req = http.get(
        url,
        { timeout: timeoutMs },
        (res) => {
          let data = '';
          res.on('data', (chunk) => {
            data += chunk;
          });
          res.on('end', () => {
            if (res.statusCode < 200 || res.statusCode >= 300) {
              reject(new Error(`HTTP ${res.statusCode}`));
              return;
            }
            try {
              resolve(JSON.parse(data));
            } catch {
              reject(new Error('Invalid JSON response'));
            }
          });
        },
      );
      req.on('timeout', () => {
        req.destroy();
        reject(new Error('Request timed out'));
      });
      req.on('error', reject);
    } catch (err) {
      reject(err);
    }
  });
}

async function pollComfyProgress(base) {
  if (generationJobs.size === 0) return;
  try {
    const data = await getJson(`${base}/queue`);
    const runningIds = new Set((data.queue_running || []).map((item) => item[1]));
    const pendingIds = new Set((data.queue_pending || []).map((item) => item[1]));

    for (const job of generationJobs.values()) {
      if (job.status === 'complete' || job.status === 'error') continue;
      if (pendingIds.has(job.promptId)) {
        job.status = 'queued';
        job.phase = 'Waiting for ComfyUI…';
        job.progress = null;
      } else if (runningIds.has(job.promptId)) {
        if (job.status !== 'saving') {
          job.status = 'running';
          job.phase = 'Generating…';
        }
      } else if (job.status === 'queued' || job.status === 'running') {
        job.status = 'saving';
        job.phase = 'Saving image…';
        job.progress = null;
      }
    }
    broadcastGenerationProgress();
  } catch {
    // ComfyUI unreachable — keep current phase until timeout or recovery
  }
}

function connectComfyWebSocket(base) {
  const WebSocketImpl = globalThis.WebSocket;
  if (!WebSocketImpl) return;

  if (comfyWs) {
    try {
      comfyWs.close();
    } catch {
      // ignore
    }
    comfyWs = null;
  }

  const wsUrl = `${base.replace(/^http/, 'ws')}/ws?clientId=${COMFY_CLIENT_ID}`;
  try {
    comfyWs = new WebSocketImpl(wsUrl);
  } catch {
    comfyWs = null;
    return;
  }

  comfyWs.addEventListener('message', (event) => {
    handleComfyWsMessage(event.data);
  });

  comfyWs.addEventListener('close', () => {
    comfyWs = null;
    if (generationJobs.size > 0 && comfyWsBase) {
      comfyWsRetryTimer = setTimeout(() => connectComfyWebSocket(comfyWsBase), 3000);
    }
  });

  comfyWs.addEventListener('error', () => {
    try {
      comfyWs?.close();
    } catch {
      // ignore
    }
  });
}

function ensureComfyProgressMonitor(settings) {
  const base = (settings.services?.comfyui || 'http://127.0.0.1:8188').replace(/\/$/, '');
  if (comfyWsBase !== base) {
    stopComfyProgressMonitor();
    comfyWsBase = base;
  }
  if (!comfyPollTimer) {
    void pollComfyProgress(base);
    comfyPollTimer = setInterval(() => {
      void pollComfyProgress(base);
    }, 1500);
  }
  connectComfyWebSocket(base);
}

function stopComfyProgressMonitor() {
  if (comfyPollTimer) {
    clearInterval(comfyPollTimer);
    comfyPollTimer = null;
  }
  if (comfyWsRetryTimer) {
    clearTimeout(comfyWsRetryTimer);
    comfyWsRetryTimer = null;
  }
  if (comfyWs) {
    try {
      comfyWs.close();
    } catch {
      // ignore
    }
    comfyWs = null;
  }
  comfyWsBase = null;
}

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
  fs.mkdirSync(COMFY_INPUT_STAGING, { recursive: true });
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
  migrateDb(db);
  return db;
}

function migrateDb(database) {
  const cols = database.prepare('PRAGMA table_info(images)').all().map((c) => c.name);
  if (!cols.includes('parent_image_path')) {
    database.exec('ALTER TABLE images ADD COLUMN parent_image_path TEXT');
  }
  if (!cols.includes('edit_prompt')) {
    database.exec('ALTER TABLE images ADD COLUMN edit_prompt TEXT');
  }
  if (!cols.includes('denoise')) {
    database.exec('ALTER TABLE images ADD COLUMN denoise REAL');
  }
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
         tags=COALESCE(?, tags),
         parent_image_path=COALESCE(?, parent_image_path),
         edit_prompt=COALESCE(?, edit_prompt),
         denoise=COALESCE(?, denoise),
         indexed_at=?
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
        merged.parent_image_path ?? null,
        merged.edit_prompt ?? null,
        merged.denoise ?? null,
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
        prompt, negative_prompt, generation_time_ms, tags,
        parent_image_path, edit_prompt, denoise, indexed_at
      ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
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
      merged.parent_image_path ?? null,
      merged.edit_prompt ?? null,
      merged.denoise ?? null,
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
  thumbCache.delete(normalizeMediaPath(filePath) || filePath);
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

function sortImagesNearParent(rows) {
  const result = [...rows];
  for (let pass = 0; pass < result.length; pass++) {
    let moved = false;
    for (let i = 0; i < result.length; i++) {
      const img = result[i];
      if (!img.parent_image_path) continue;
      const parentIdx = result.findIndex((row) => row.path === img.parent_image_path);
      if (parentIdx >= 0 && i !== parentIdx + 1) {
        const [edit] = result.splice(i, 1);
        const insertAt = i < parentIdx ? parentIdx : parentIdx + 1;
        result.splice(insertAt, 0, edit);
        moved = true;
        break;
      }
    }
    if (!moved) break;
  }
  return result;
}

function listImages({ offset = 0, limit = 60, search = '' } = {}) {
  const database = initDb();
  let rows;
  if (search.trim()) {
    const term = search.trim().replace(/"/g, '');
    rows = database
      .prepare(
        `SELECT i.* FROM images_fts fts
         JOIN images i ON i.path = fts.path
         WHERE images_fts MATCH ?
         ORDER BY i.mtime DESC
         LIMIT ? OFFSET ?`,
      )
      .all(`${term}*`, limit, offset);
  } else {
    rows = database
      .prepare('SELECT * FROM images ORDER BY mtime DESC LIMIT ? OFFSET ?')
      .all(limit, offset);
  }
  return sortImagesNearParent(rows);
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

function normalizeMediaPath(filePath) {
  if (!filePath || typeof filePath !== 'string') return null;
  return path.resolve(filePath.replace(/\//g, path.sep));
}

async function getThumbnailDataUrl(filePath, size = 256) {
  const normalized = normalizeMediaPath(filePath);
  if (!normalized || !fs.existsSync(normalized)) return null;
  if (thumbCache.has(normalized)) return thumbCache.get(normalized);

  const cacheDataUrl = (dataUrl) => {
    if (!dataUrl || dataUrl.length < 32) return null;
    if (thumbCache.size > 500) {
      const first = thumbCache.keys().next().value;
      thumbCache.delete(first);
    }
    thumbCache.set(normalized, dataUrl);
    return dataUrl;
  };

  try {
    const { nativeImage } = getElectronModule();
    let thumb = await Promise.resolve(
      nativeImage.createThumbnailFromPath(normalized, { width: size, height: size }),
    );
    if (!thumb || (typeof thumb.isEmpty === 'function' && thumb.isEmpty())) {
      const full = nativeImage.createFromPath(normalized);
      if (full.isEmpty()) return null;
      thumb = full.resize({ width: size, height: size, quality: 'good' });
    }
    return cacheDataUrl(thumb.toDataURL());
  } catch {
    try {
      const { nativeImage } = getElectronModule();
      const full = nativeImage.createFromPath(normalized);
      if (full.isEmpty()) return null;
      return cacheDataUrl(full.resize({ width: size, height: size, quality: 'good' }).toDataURL());
    } catch {
      return null;
    }
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

function cloneWorkflow(workflow) {
  return JSON.parse(JSON.stringify(workflow));
}

function convertVisualWorkflowToApi(visual) {
  const api = {};
  for (const node of visual.nodes) {
    const inputs = {};
    for (const link of visual.links || []) {
      const [, fromNode, fromSlot, toNode, toSlot] = link;
      if (toNode !== node.id) continue;
      const inputDef = (node.inputs || [])[toSlot];
      if (inputDef?.name) {
        inputs[inputDef.name] = [String(fromNode), fromSlot];
      }
    }
    const w = node.widgets_values || [];
    switch (node.type) {
      case 'CheckpointLoaderSimple':
        inputs.ckpt_name = w[0];
        break;
      case 'VAELoader':
        inputs.vae_name = w[0];
        break;
      case 'LoadImage':
        inputs.image = w[0] || 'example.png';
        break;
      case 'CLIPTextEncode':
        if (w[0] !== undefined) inputs.text = w[0];
        break;
      case 'KSampler':
        inputs.seed = w[0];
        inputs.steps = w[2];
        inputs.cfg = w[3];
        inputs.sampler_name = w[4];
        inputs.scheduler = w[5];
        inputs.denoise = w[6];
        break;
      case 'SaveImage':
        inputs.filename_prefix = w[0];
        break;
      default:
        break;
    }
    api[String(node.id)] = { class_type: node.type, inputs };
  }
  return api;
}

function resolveImg2ImgWorkflow() {
  for (const candidate of IMG2IMG_WORKFLOW_CANDIDATES) {
    if (!fs.existsSync(candidate)) continue;
    const raw = JSON.parse(fs.readFileSync(candidate, 'utf8'));
    if (raw.nodes) return convertVisualWorkflowToApi(raw);
    return raw;
  }
  if (fs.existsSync(IMG2IMG_WORKFLOW_API_FALLBACK)) {
    return JSON.parse(fs.readFileSync(IMG2IMG_WORKFLOW_API_FALLBACK, 'utf8'));
  }
  throw new Error('img2img edit workflow not found');
}

function findWorkflowNode(workflow, classType) {
  return Object.values(workflow).find((node) => node.class_type === classType);
}

function findWorkflowNodes(workflow, classType) {
  return Object.values(workflow).filter((node) => node.class_type === classType);
}

function buildEditPrompt(editPrompt, preserveComposition, sourcePrompt) {
  const edit = String(editPrompt || '').trim();
  if (!edit) return edit;

  const parts = [];
  const basePrompt = String(sourcePrompt || '').trim();
  if (basePrompt) {
    parts.push(basePrompt);
  }

  if (preserveComposition) {
    parts.push(
      `Keep the same subject and overall composition, but clearly and visibly apply this edit: ${edit}`,
    );
  } else {
    parts.push(`Transform this image: ${edit}`);
  }

  if (edit.length < 28) {
    parts.push('make the change obvious and clearly visible');
  }

  parts.push('photorealistic, high detail, sharp focus');
  return parts.join(', ');
}

function resolveEditDenoise(requested, preserveComposition) {
  let denoise = Number(requested ?? 0.55);
  if (!Number.isFinite(denoise)) denoise = 0.55;
  denoise = Math.min(0.95, Math.max(0.2, denoise));
  const floor = preserveComposition ? 0.4 : 0.45;
  denoise = Math.max(floor, denoise);
  if (preserveComposition) {
    denoise = Math.min(denoise, 0.65);
  }
  return denoise;
}

function resolveComfyInputDir(settings) {
  const candidates = [
    settings.paths?.comfyui ? path.join(settings.paths.comfyui, 'input') : null,
    path.join('C:\\AI\\StabilityMatrix', 'Data', 'Packages', 'ComfyUI', 'input'),
  ].filter(Boolean);
  for (const dir of candidates) {
    if (fs.existsSync(dir)) return dir;
  }
  return null;
}

function parseComfyUploadResponse(data, fallbackName) {
  try {
    const parsed = JSON.parse(data);
    const name = parsed.name || fallbackName;
    const subfolder = parsed.subfolder ? String(parsed.subfolder).replace(/\\/g, '/') : '';
    if (subfolder) return `${subfolder}/${name}`.replace(/\/+/g, '/');
    return name;
  } catch {
    return fallbackName;
  }
}

function stageSourceImage(sourcePath) {
  const ext = path.extname(sourcePath) || '.png';
  const stagedName = `aistudio_src_${Date.now()}_${crypto.randomBytes(4).toString('hex')}${ext}`;
  const stagedPath = path.join(COMFY_INPUT_STAGING, stagedName);
  fs.copyFileSync(sourcePath, stagedPath);
  return { stagedPath, stagedName };
}

function uploadImageToComfyFromStaged(base, stagedPath, stagedName) {
  return new Promise((resolve, reject) => {
    const url = new URL(`${base}/upload/image`);
    const boundary = `----WebKitFormBoundary${crypto.randomBytes(16).toString('hex')}`;
    const fileData = fs.readFileSync(stagedPath);
    const prelude = [
      `--${boundary}`,
      'Content-Disposition: form-data; name="type"',
      '',
      'input',
      `--${boundary}`,
      'Content-Disposition: form-data; name="overwrite"',
      '',
      'true',
      `--${boundary}`,
      `Content-Disposition: form-data; name="image"; filename="${stagedName}"`,
      'Content-Type: application/octet-stream',
      '',
    ].join('\r\n');
    const epilogue = `\r\n--${boundary}--\r\n`;
    const body = Buffer.concat([
      Buffer.from(`${prelude}\r\n`),
      fileData,
      Buffer.from(epilogue),
    ]);

    const req = http.request(
      url,
      {
        method: 'POST',
        headers: {
          'Content-Type': `multipart/form-data; boundary=${boundary}`,
          'Content-Length': body.length,
        },
        timeout: 120000,
      },
      (res) => {
        let data = '';
        res.on('data', (chunk) => {
          data += chunk;
        });
        res.on('end', () => {
          if (res.statusCode < 200 || res.statusCode >= 300) {
            reject(new Error(`ComfyUI upload failed: HTTP ${res.statusCode}`));
            return;
          }
          resolve(parseComfyUploadResponse(data, stagedName));
        });
      },
    );
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('ComfyUI upload timed out'));
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

function prepareComfyInputImage(settings, base, sourcePath) {
  const { stagedPath, stagedName } = stageSourceImage(sourcePath);
  const inputDir = resolveComfyInputDir(settings);
  if (inputDir) {
    fs.copyFileSync(stagedPath, path.join(inputDir, stagedName));
    return Promise.resolve(stagedName);
  }
  return uploadImageToComfyFromStaged(base, stagedPath, stagedName);
}

function uploadImageToComfy(base, sourcePath) {
  const { stagedPath, stagedName } = stageSourceImage(sourcePath);
  return uploadImageToComfyFromStaged(base, stagedPath, stagedName);
}

function queueImageEdit(settings, params) {
  const base = (settings.services?.comfyui || 'http://127.0.0.1:8188').replace(/\/$/, '');
  const sourcePath = path.resolve(String(params.sourcePath || '').replace(/\//g, path.sep));
  if (!fs.existsSync(sourcePath)) {
    return Promise.reject(new Error('Source image not found'));
  }

  const negativePrompt = params.negativePrompt || DEFAULT_EDIT_NEGATIVE;
  const denoise = resolveEditDenoise(params.denoise, params.preserveComposition);

  const editPrompt = String(params.editPrompt || '').trim();
  if (!editPrompt) {
    return Promise.reject(new Error('Edit prompt is required'));
  }

  const positivePrompt = buildEditPrompt(
    editPrompt,
    params.preserveComposition,
    params.sourcePrompt,
  );
  const prefix = `aistudio_edit_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;

  return prepareComfyInputImage(settings, base, sourcePath).then((inputImageName) => {
    if (!inputImageName) {
      throw new Error('Failed to stage source image for ComfyUI');
    }

    const workflow = cloneWorkflow(resolveImg2ImgWorkflow());
    const loadNode = findWorkflowNode(workflow, 'LoadImage');
    const ksampler = findWorkflowNode(workflow, 'KSampler');
    const saveNode = findWorkflowNode(workflow, 'SaveImage');
    if (!loadNode || !ksampler || !saveNode) {
      throw new Error('img2img workflow is missing required nodes');
    }

    loadNode.inputs.image = inputImageName;
    ksampler.inputs.seed = Math.floor(Math.random() * 1_000_000_000);
    ksampler.inputs.denoise = denoise;
    ksampler.inputs.steps = Math.max(Number(ksampler.inputs.steps) || 28, 24);
    ksampler.inputs.cfg = Math.max(Number(params.cfg ?? ksampler.inputs.cfg) || 6.5, 7);

    const positiveId = ksampler.inputs.positive?.[0];
    const negativeId = ksampler.inputs.negative?.[0];
    if (positiveId && workflow[positiveId]) {
      workflow[positiveId].inputs.text = positivePrompt;
    } else {
      const clipNodes = findWorkflowNodes(workflow, 'CLIPTextEncode');
      if (clipNodes[0]) clipNodes[0].inputs.text = positivePrompt;
    }
    if (negativeId && workflow[negativeId]) {
      workflow[negativeId].inputs.text = negativePrompt;
    } else {
      const clipNodes = findWorkflowNodes(workflow, 'CLIPTextEncode');
      if (clipNodes[1]) clipNodes[1].inputs.text = negativePrompt;
    }

    saveNode.inputs.filename_prefix = prefix;

    return postJson(`${base}/prompt`, {
      prompt: workflow,
      client_id: COMFY_CLIENT_ID,
    }).then((result) => {
      pendingGenerations.set(prefix, {
        prompt: positivePrompt,
        edit_prompt: editPrompt,
        parent_image_path: sourcePath,
        denoise,
        negative_prompt: negativePrompt,
        workflow: 'img2img_sdxl_edit',
        checkpoint: findWorkflowNode(workflow, 'CheckpointLoaderSimple')?.inputs?.ckpt_name,
        steps: ksampler.inputs.steps,
        cfg: ksampler.inputs.cfg,
        startedAt: Date.now(),
      });
      return { promptId: result.prompt_id, prefix, denoise, inputImageName };
    });
  });
}

function queueGeneration(settings, params) {
  const base = (settings.services?.comfyui || 'http://127.0.0.1:8188').replace(/\/$/, '');
  const workflow = loadWorkflowTemplate(WORKFLOW_TEMPLATE);
  const aspect = ASPECT_DIMENSIONS[params.aspect] || ASPECT_DIMENSIONS.square;
  const dims = scaleDimensions(aspect, params.resolution || 1024);
  const seed = params.seed ?? Math.floor(Math.random() * 1_000_000_000);
  const prefix = `aistudio_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;

  workflow['3'].inputs.seed = seed;
  workflow['3'].inputs.steps = params.steps ?? 20;
  workflow['3'].inputs.cfg = params.cfg ?? 6.5;
  workflow['5'].inputs.width = dims.width;
  workflow['5'].inputs.height = dims.height;
  workflow['5'].inputs.batch_size = params.count ?? 1;
  workflow['6'].inputs.text = buildPrompt(params);
  workflow['7'].inputs.text = params.negativePrompt || 'blurry, low quality, watermark, text, deformed';
  workflow['10'].inputs.filename_prefix = prefix;

  const clientId = COMFY_CLIENT_ID;
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
  const clientId = COMFY_CLIENT_ID;
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
      markGenerationJobCompleteForPrefix(prefix);
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
  notifyWindow = null;
  stopComfyProgressMonitor();
}

function registerImageStudioIpc(ipcMain, loadSettings, appendLog) {
  ipcMain.handle('image-studio:start', async (event) => {
    const settings = loadSettings();
    const outputRoot = getOutputRoot(settings);
    initDb();
    startWatcher(outputRoot, event.sender);
    broadcastGenerationProgress();
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
    dataUrl: await getThumbnailDataUrl(filePath),
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

  ipcMain.handle('image-studio:generation-jobs', async () => ({
    jobs: serializeGenerationJobs(),
  }));

  ipcMain.handle('image-studio:generate', async (_event, params) => {
    const settings = loadSettings();
    const started = Date.now();
    const count = params.count ?? 1;
    const registeredJobs = [];
    try {
      ensureComfyProgressMonitor(settings);
      for (let i = 0; i < count; i++) {
        const result = await queueGeneration(settings, {
          ...params,
          count: 1,
          seed: params.seed != null ? params.seed + i : undefined,
        });
        const label =
          count > 1
            ? `${truncateLabel(params.prompt)} (${i + 1}/${count})`
            : truncateLabel(params.prompt);
        const job = registerGenerationJob({
          promptId: result.promptId,
          prefix: result.prefix,
          label,
          batchIndex: count > 1 ? i + 1 : null,
          batchTotal: count > 1 ? count : null,
        });
        registeredJobs.push(job);
      }
      appendLog('info', 'image-studio', 'Generation queued via ComfyUI', {
        count,
        ms: Date.now() - started,
      });
      return {
        ok: true,
        message: `Queued ${count} generation(s) — ComfyUI is executing. Images appear automatically.`,
        promptIds: registeredJobs.map((j) => j.promptId),
        jobs: serializeGenerationJobs(),
      };
    } catch (err) {
      for (const job of registeredJobs) {
        markGenerationJobError(job.id, err.message || 'Generation failed');
      }
      throw new Error(err.message || 'Generation failed — is ComfyUI running?');
    }
  });

  ipcMain.handle('image-studio:edit-image', async (_event, params) => {
    const settings = loadSettings();
    try {
      ensureComfyProgressMonitor(settings);
      const database = initDb();
      const sourceRow = database.prepare('SELECT prompt FROM images WHERE path = ?').get(params.sourcePath);
      const result = await queueImageEdit(settings, {
        ...params,
        sourcePrompt: sourceRow?.prompt || null,
      });
      const label = `Edit: ${truncateLabel(params.editPrompt)}`;
      registerGenerationJob({
        promptId: result.promptId,
        prefix: result.prefix,
        label,
        batchIndex: null,
        batchTotal: null,
      });
      appendLog('info', 'image-studio', 'Image edit queued via ComfyUI', {
        source: params.sourcePath,
        denoise: result.denoise,
        inputImage: result.inputImageName,
      });
      return {
        ok: true,
        message: 'Edit queued — ComfyUI is executing. The result appears automatically.',
        promptId: result.promptId,
        jobs: serializeGenerationJobs(),
      };
    } catch (err) {
      throw new Error(err.message || 'Edit failed — is ComfyUI running?');
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

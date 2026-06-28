const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const chokidar = require('chokidar');

/** @type {typeof import('better-sqlite3') | null} */
let Database = null;
/** @type {import('better-sqlite3').Database | null} */
let db = null;

const HUB_ROOT = 'C:\\AI\\AIStudio';
const DEFAULT_VIDEO_ROOT = 'C:\\AI\\StabilityMatrix\\Data\\Videos';
const DB_PATH = path.join(HUB_ROOT, 'registry', 'videos.sqlite');
const COMFY_INPUT_STAGING = path.join(HUB_ROOT, 'cache', 'comfy-input');

const VIDEO_WORKFLOW_CANDIDATES = [
  path.join('C:\\AI\\StabilityMatrix', 'Data', 'Workflows', 'video', 'i2v_wan22_api.json'),
  path.join(__dirname, 'workflows', 'i2v_wan22_api.json'),
];

const WAN_BLUEPRINT_PATH = path.join(
  'C:\\AI\\StabilityMatrix',
  'Data',
  'Packages',
  'ComfyUI',
  'blueprints',
  'Image to Video (Wan 2.2).json',
);

const REQUIRED_VIDEO_NODES = [
  'WanImageToVideo',
  'CreateVideo',
  'SaveVideo',
  'UNETLoader',
  'CLIPLoader',
  'VAELoader',
];

const REQUIRED_VIDEO_MODELS = [
  { dir: 'diffusion_models', file: 'wan2.2_i2v_high_noise_14B_fp8_scaled.safetensors' },
  { dir: 'diffusion_models', file: 'wan2.2_i2v_low_noise_14B_fp8_scaled.safetensors' },
  { dir: 'loras', file: 'wan2.2_i2v_lightx2v_4steps_lora_v1_high_noise.safetensors' },
  { dir: 'loras', file: 'wan2.2_i2v_lightx2v_4steps_lora_v1_low_noise.safetensors' },
  { dir: 'text_encoders', file: 'umt5_xxl_fp8_e4m3fn_scaled.safetensors' },
  { dir: 'vae', file: 'wan_2.1_vae.safetensors' },
];

const VIDEO_EXTENSIONS = new Set(['.mp4', '.webm', '.mov', '.mkv', '.gif']);
const VIDEO_FPS = 16;

/** @type {import('chokidar').FSWatcher | null} */
let watcher = null;
/** @type {import('electron').WebContents | null} */
let notifyWindow = null;
/** @type {Map<string, object>} */
const pendingVideos = new Map();

function getImageStudioBridge() {
  return require('./imageStudio.cjs');
}

function getVideoOutputRoot(settings) {
  const configured = settings.image_studio?.video_output_folder || settings.video_studio?.output_folder;
  const root = configured || DEFAULT_VIDEO_ROOT;
  fs.mkdirSync(root, { recursive: true });
  return root;
}

function getComfyOutputDir(settings) {
  const comfyRoot =
    settings.paths?.comfyui ||
    path.join('C:\\AI\\StabilityMatrix', 'Data', 'Packages', 'ComfyUI');
  return path.join(comfyRoot, 'output');
}

function getComfyModelsDir(settings) {
  const comfyRoot =
    settings.paths?.comfyui ||
    path.join('C:\\AI\\StabilityMatrix', 'Data', 'Packages', 'ComfyUI');
  return path.join(comfyRoot, 'models');
}

function initDb() {
  if (db) return db;
  if (!Database) Database = require('better-sqlite3');
  fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
  db = new Database(DB_PATH);
  db.pragma('journal_mode = WAL');
  db.exec(`
    CREATE TABLE IF NOT EXISTS videos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      path TEXT UNIQUE NOT NULL,
      filename TEXT NOT NULL,
      folder TEXT NOT NULL,
      mtime REAL NOT NULL,
      size INTEGER NOT NULL,
      source_image_path TEXT,
      prompt TEXT,
      duration REAL,
      motion_strength REAL,
      timestamp TEXT,
      workflow TEXT,
      model TEXT,
      status TEXT NOT NULL DEFAULT 'complete',
      indexed_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_videos_mtime ON videos(mtime DESC);
  `);
  return db;
}

function upsertVideo(filePath, extra = {}) {
  if (!fs.existsSync(filePath)) return null;
  const ext = path.extname(filePath).toLowerCase();
  if (!VIDEO_EXTENSIONS.has(ext)) return null;

  const database = initDb();
  const stat = fs.statSync(filePath);
  const folder = path.dirname(filePath);
  const filename = path.basename(filePath);

  database
    .prepare(
      `INSERT INTO videos (
        path, filename, folder, mtime, size, source_image_path, prompt, duration,
        motion_strength, timestamp, workflow, model, status, indexed_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(path) DO UPDATE SET
        mtime=excluded.mtime, size=excluded.size, filename=excluded.filename,
        folder=excluded.folder, source_image_path=COALESCE(excluded.source_image_path, source_image_path),
        prompt=COALESCE(excluded.prompt, prompt), duration=COALESCE(excluded.duration, duration),
        motion_strength=COALESCE(excluded.motion_strength, motion_strength),
        timestamp=COALESCE(excluded.timestamp, timestamp), workflow=COALESCE(excluded.workflow, workflow),
        model=COALESCE(excluded.model, model), status=COALESCE(excluded.status, status),
        indexed_at=excluded.indexed_at`,
    )
    .run(
      filePath,
      filename,
      folder,
      stat.mtimeMs,
      stat.size,
      extra.source_image_path ?? null,
      extra.prompt ?? null,
      extra.duration ?? null,
      extra.motion_strength ?? null,
      extra.timestamp ?? new Date(stat.mtimeMs).toISOString(),
      extra.workflow ?? null,
      extra.model ?? null,
      extra.status ?? 'complete',
      new Date().toISOString(),
    );

  return database.prepare('SELECT * FROM videos WHERE path = ?').get(filePath);
}

function removeVideo(filePath) {
  const database = initDb();
  database.prepare('DELETE FROM videos WHERE path = ?').run(filePath);
}

function listVideos({ offset = 0, limit = 60 } = {}) {
  const database = initDb();
  return database
    .prepare('SELECT * FROM videos ORDER BY mtime DESC LIMIT ? OFFSET ?')
    .all(limit, offset);
}

function getVideoStats(outputRoot) {
  const database = initDb();
  const row = database.prepare('SELECT COUNT(*) as count, COALESCE(SUM(size), 0) as bytes FROM videos').get();
  return {
    count: row.count,
    bytes: row.bytes,
    outputRoot,
  };
}

function durationToFrameLength(durationSec) {
  const raw = Math.round(Number(durationSec) * VIDEO_FPS);
  return Math.max(17, Math.round((raw - 1) / 4) * 4 + 1);
}

function applyWidgetValues(node, inputs) {
  const w = node.widgets_values || [];
  switch (node.type) {
    case 'UNETLoader':
      inputs.unet_name = w[0];
      inputs.weight_dtype = w[1] || 'default';
      break;
    case 'LoraLoaderModelOnly':
      inputs.lora_name = w[0];
      inputs.strength_model = w[1] ?? 1;
      break;
    case 'ModelSamplingSD3':
      inputs.shift = w[0];
      break;
    case 'CLIPLoader':
      inputs.clip_name = w[0];
      inputs.type = w[1] || 'wan';
      break;
    case 'VAELoader':
      inputs.vae_name = w[0];
      break;
    case 'CLIPTextEncode':
      if (w[0] !== undefined) inputs.text = w[0];
      break;
    case 'WanImageToVideo':
      inputs.width = w[0];
      inputs.height = w[1];
      inputs.length = w[2];
      inputs.batch_size = w[3] ?? 1;
      break;
    case 'KSamplerAdvanced':
      inputs.add_noise = w[0];
      inputs.noise_seed = w[1];
      inputs.steps = w[3];
      inputs.cfg = w[4];
      inputs.sampler_name = w[5];
      inputs.scheduler = w[6];
      inputs.start_at_step = w[7];
      inputs.end_at_step = w[8];
      inputs.return_with_leftover_noise = w[9];
      break;
    case 'CreateVideo':
      inputs.fps = w[0] ?? VIDEO_FPS;
      break;
    case 'SaveVideo':
      inputs.filename_prefix = w[0];
      inputs.format = w[1] || 'auto';
      inputs.codec = w[2] || 'auto';
      break;
    default:
      break;
  }
}

function convertSubgraphToApi(subgraph) {
  const api = {};
  const nodes = subgraph.nodes || [];
  const links = subgraph.links || [];
  const skipTypes = new Set(['MarkdownNote', 'Note', 'Reroute']);

  for (const node of nodes) {
    if (skipTypes.has(node.type)) continue;
    const inputs = {};
    for (const link of links) {
      if (link.target_id !== node.id) continue;
      const inp = (node.inputs || [])[link.target_slot];
      if (!inp?.name) continue;
      if (link.origin_id === -10) {
        inputs[inp.name] = ['load_image', 0];
      } else {
        inputs[inp.name] = [String(link.origin_id), link.origin_slot];
      }
    }
    applyWidgetValues(node, inputs);
    api[String(node.id)] = { class_type: node.type, inputs };
  }

  api.load_image = { class_type: 'LoadImage', inputs: { image: 'placeholder.png' } };
  api.save_video = {
    class_type: 'SaveVideo',
    inputs: {
      video: ['117', 0],
      filename_prefix: 'aistudio_video',
      format: 'auto',
      codec: 'auto',
    },
  };

  return api;
}

function loadVideoWorkflowApi() {
  for (const candidate of VIDEO_WORKFLOW_CANDIDATES) {
    if (!fs.existsSync(candidate)) continue;
    const raw = JSON.parse(fs.readFileSync(candidate, 'utf8'));
    if (raw.nodes) return convertSubgraphToApi(raw);
    return JSON.parse(JSON.stringify(raw));
  }

  if (fs.existsSync(WAN_BLUEPRINT_PATH)) {
    const blueprint = JSON.parse(fs.readFileSync(WAN_BLUEPRINT_PATH, 'utf8'));
    const subgraph = blueprint.definitions?.subgraphs?.[0];
    if (subgraph) return convertSubgraphToApi(subgraph);
  }

  return null;
}

function resolveComfyInputDir(settings) {
  return getImageStudioBridge().resolveComfyInputDir(settings);
}

async function checkVideoSetup(settings) {
  const workflow = loadVideoWorkflowApi();
  if (!workflow) {
    return {
      ready: false,
      message: 'Video model/workflow not installed yet',
      detail: 'Install Wan 2.2 image-to-video workflow and models. See README → Video Generation MVP.',
    };
  }

  const base = (settings.services?.comfyui || 'http://127.0.0.1:8188').replace(/\/$/, '');
  try {
    const objectInfo = await getImageStudioBridge().getJson(`${base}/object_info`, 8000);
    for (const nodeType of REQUIRED_VIDEO_NODES) {
      if (!objectInfo[nodeType]) {
        return {
          ready: false,
          message: 'Video model/workflow not installed yet',
          detail: `ComfyUI node "${nodeType}" is not available. Update ComfyUI or install video nodes.`,
        };
      }
    }
  } catch {
    return {
      ready: false,
      message: 'ComfyUI is offline',
      detail: 'Start ComfyUI before generating video.',
    };
  }

  const modelsDir = getComfyModelsDir(settings);
  const missing = [];
  for (const { dir, file } of REQUIRED_VIDEO_MODELS) {
    const full = path.join(modelsDir, dir, file);
    if (!fs.existsSync(full)) missing.push(`${dir}/${file}`);
  }
  if (missing.length > 0) {
    return {
      ready: false,
      message: 'Video model/workflow not installed yet',
      detail: `Missing models: ${missing.slice(0, 3).join(', ')}${missing.length > 3 ? '…' : ''}`,
      missingModels: missing,
    };
  }

  return { ready: true, message: 'Video generation ready', workflow: 'wan2.2_i2v' };
}

function readImageDimensions(imagePath) {
  try {
    const { nativeImage } = require('electron');
    const img = nativeImage.createFromPath(imagePath);
    const size = img.getSize();
    if (size.width > 0 && size.height > 0) {
      const maxDim = 640;
      const scale = Math.min(1, maxDim / Math.max(size.width, size.height));
      return {
        width: Math.max(64, Math.round((size.width * scale) / 16) * 16),
        height: Math.max(64, Math.round((size.height * scale) / 16) * 16),
      };
    }
  } catch {
    // ignore
  }
  return { width: 640, height: 640 };
}

async function stageImageForComfy(settings, sourcePath) {
  const bridge = getImageStudioBridge();
  const base = (settings.services?.comfyui || 'http://127.0.0.1:8188').replace(/\/$/, '');
  const inputDir = resolveComfyInputDir(settings);
  const ext = path.extname(sourcePath) || '.png';
  const inputName = `aistudio_video_src_${Date.now()}_${crypto.randomBytes(3).toString('hex')}${ext}`;

  if (inputDir) {
    fs.mkdirSync(inputDir, { recursive: true });
    const dest = path.join(inputDir, inputName);
    fs.copyFileSync(sourcePath, dest);
    return inputName;
  }

  fs.mkdirSync(COMFY_INPUT_STAGING, { recursive: true });
  const { stagedPath, stagedName } = bridge.stageSourceImage(sourcePath);
  return bridge.uploadImageToComfyFromStaged(base, stagedPath, stagedName);
}

function mutateVideoWorkflow(workflow, params) {
  const wf = JSON.parse(JSON.stringify(workflow));
  const dims = readImageDimensions(params.sourcePath);
  const frameLength = durationToFrameLength(params.duration);
  const motionStrength = Math.min(1, Math.max(0.1, Number(params.motionStrength ?? 0.6)));
  const cfg = 2 + motionStrength * 6;

  if (wf.load_image) wf.load_image.inputs.image = params.inputImageName;

  const wanNode = Object.values(wf).find((n) => n.class_type === 'WanImageToVideo');
  const samplers = Object.values(wf).filter((n) => n.class_type === 'KSamplerAdvanced');

  if (wanNode?.inputs?.positive) {
    const posId = wanNode.inputs.positive[0];
    if (wf[posId]) wf[posId].inputs.text = params.prompt;
  }
  if (wanNode?.inputs?.negative) {
    const negId = wanNode.inputs.negative[0];
    if (wf[negId]) wf[negId].inputs.text = 'low quality, blurry, static, watermark, text';
  }

  if (wanNode) {
    wanNode.inputs.width = dims.width;
    wanNode.inputs.height = dims.height;
    wanNode.inputs.length = frameLength;
  }
  for (const sampler of samplers) {
    sampler.inputs.cfg = cfg;
    sampler.inputs.noise_seed = params.seed ?? Math.floor(Math.random() * 1_000_000_000);
  }
  if (wf.save_video) {
    wf.save_video.inputs.filename_prefix = params.prefix;
  }

  return wf;
}

async function queueImageToVideo(settings, params) {
  const setup = await checkVideoSetup(settings);
  if (!setup.ready) {
    const err = new Error(setup.message);
    err.code = 'VIDEO_SETUP';
    err.detail = setup.detail;
    throw err;
  }

  const workflow = loadVideoWorkflowApi();
  const base = (settings.services?.comfyui || 'http://127.0.0.1:8188').replace(/\/$/, '');
  const prefix = `aistudio_video_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
  const inputImageName = await stageImageForComfy(settings, params.sourcePath);
  const promptWorkflow = mutateVideoWorkflow(workflow, {
    ...params,
    inputImageName,
    prefix,
  });

  const bridge = getImageStudioBridge();
  const result = await bridge.postJson(`${base}/prompt`, {
    prompt: promptWorkflow,
    client_id: bridge.COMFY_CLIENT_ID,
  });

  pendingVideos.set(prefix, {
    prompt: params.prompt,
    source_image_path: params.sourcePath,
    duration: params.duration,
    motion_strength: params.motionStrength,
    workflow: setup.workflow || 'wan2.2_i2v',
    model: 'wan2.2_i2v',
    startedAt: Date.now(),
  });

  return { promptId: result.prompt_id, prefix };
}

function copyToVideoOutput(srcPath, outputRoot) {
  const dest = path.join(outputRoot, path.basename(srcPath));
  if (path.resolve(srcPath) === path.resolve(dest)) return dest;
  fs.mkdirSync(outputRoot, { recursive: true });
  fs.copyFileSync(srcPath, dest);
  return dest;
}

function attachPendingVideoMetadata(filePath, outputRoot) {
  const filename = path.basename(filePath);
  for (const [prefix, meta] of pendingVideos.entries()) {
    if (!filename.includes(prefix)) continue;
    const bridge = getImageStudioBridge();
    let finalPath = filePath;
    try {
      finalPath = copyToVideoOutput(filePath, outputRoot);
    } catch {
      // keep original path
    }
    upsertVideo(finalPath, {
      ...meta,
      status: 'complete',
      timestamp: new Date().toISOString(),
    });
    pendingVideos.delete(prefix);
    bridge.markGenerationJobCompleteForPrefix(prefix);
    return finalPath;
  }
  return upsertVideo(filePath);
}

function initialScan(outputRoot) {
  if (!fs.existsSync(outputRoot)) return;
  const walk = (dir) => {
    let entries;
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (VIDEO_EXTENSIONS.has(path.extname(entry.name).toLowerCase())) upsertVideo(full);
    }
  };
  walk(outputRoot);
}

function startVideoWatcher(outputRoot, comfyOutputDir, webContents) {
  notifyWindow = webContents;
  if (watcher) watcher.close();

  initialScan(outputRoot);
  if (fs.existsSync(comfyOutputDir)) initialScan(comfyOutputDir);

  const roots = [...new Set([outputRoot, comfyOutputDir].filter((p) => p && fs.existsSync(p)))];
  watcher = chokidar.watch(roots, {
    persistent: true,
    ignoreInitial: true,
    awaitWriteFinish: { stabilityThreshold: 1200, pollInterval: 200 },
    ignored: (p) => {
      try {
        if (!fs.existsSync(p)) return false;
        const st = fs.statSync(p);
        if (st.isDirectory()) return false;
        return !VIDEO_EXTENSIONS.has(path.extname(p).toLowerCase());
      } catch {
        return true;
      }
    },
  });

  const notify = (type, filePath) => {
    if (webContents && !webContents.isDestroyed()) {
      webContents.send('video-studio:changed', { type, path: filePath });
    }
  };

  watcher.on('add', (filePath) => {
    if (!VIDEO_EXTENSIONS.has(path.extname(filePath).toLowerCase())) return;
    attachPendingVideoMetadata(filePath, outputRoot);
    notify('add', filePath);
  });
  watcher.on('change', (filePath) => {
    if (!VIDEO_EXTENSIONS.has(path.extname(filePath).toLowerCase())) return;
    upsertVideo(filePath);
    notify('change', filePath);
  });
  watcher.on('unlink', (filePath) => {
    removeVideo(filePath);
    notify('unlink', filePath);
  });
}

function stopVideoWatcher() {
  if (watcher) {
    watcher.close();
    watcher = null;
  }
  notifyWindow = null;
}

function registerVideoStudioIpc(ipcMain, loadSettings, appendLog) {
  ipcMain.handle('video-studio:setup', async () => {
    const settings = loadSettings();
    return checkVideoSetup(settings);
  });

  ipcMain.handle('video-studio:start', async (event) => {
    const settings = loadSettings();
    const outputRoot = getVideoOutputRoot(settings);
    const comfyOutput = getComfyOutputDir(settings);
    initDb();
    startVideoWatcher(outputRoot, comfyOutput, event.sender);
    appendLog('info', 'video-studio', 'Video watcher started', { outputRoot });
    return { ok: true, outputRoot };
  });

  ipcMain.handle('video-studio:stop', async () => {
    stopVideoWatcher();
    return { ok: true };
  });

  ipcMain.handle('video-studio:stats', async () => {
    const settings = loadSettings();
    return getVideoStats(getVideoOutputRoot(settings));
  });

  ipcMain.handle('video-studio:list', async (_event, opts) => listVideos(opts || {}));

  ipcMain.handle('video-studio:generate', async (_event, params) => {
    const settings = loadSettings();
    const bridge = getImageStudioBridge();
    try {
      bridge.ensureComfyProgressMonitor(settings);
      const result = await queueImageToVideo(settings, params);
      const label = `Video: ${String(params.prompt || '').slice(0, 40)}`;
      bridge.registerGenerationJob({
        promptId: result.promptId,
        prefix: result.prefix,
        label,
        kind: 'video',
      });
      appendLog('info', 'video-studio', 'Video generation queued', {
        source: params.sourcePath,
        duration: params.duration,
      });
      return {
        ok: true,
        message: 'Video queued — ComfyUI is generating. It appears automatically when ready.',
        jobs: bridge.serializeGenerationJobs(),
      };
    } catch (err) {
      if (err.code === 'VIDEO_SETUP') {
        return {
          ok: false,
          setupRequired: true,
          message: err.message,
          detail: err.detail,
        };
      }
      throw err;
    }
  });

  ipcMain.handle('video-studio:reveal', async (_event, filePath) => {
    const { shell } = require('electron');
    shell.showItemInFolder(filePath);
    return { ok: true };
  });

  ipcMain.handle('video-studio:open-folder', async (_event, folderPath) => {
    const { shell } = require('electron');
    await shell.openPath(folderPath || getVideoOutputRoot(loadSettings()));
    return { ok: true };
  });

  ipcMain.handle('video-studio:open-viewer', async (_event, filePath) => {
    const { shell } = require('electron');
    await shell.openPath(filePath);
    return { ok: true };
  });

  ipcMain.handle('video-studio:delete', async (_event, filePath) => {
    const { shell } = require('electron');
    if (!fs.existsSync(filePath)) throw new Error('File not found');
    await shell.trashItem(filePath);
    removeVideo(filePath);
    return { ok: true };
  });

  ipcMain.handle('video-studio:open-setup', async () => {
    const settings = loadSettings();
    const setupDir = path.join(
      settings.paths?.stability_matrix || 'C:\\AI\\StabilityMatrix',
      'Data',
      'Workflows',
      'video',
    );
    fs.mkdirSync(setupDir, { recursive: true });
    const { shell } = require('electron');
    await shell.openPath(setupDir);
    return { ok: true, path: setupDir };
  });
}

module.exports = {
  registerVideoStudioIpc,
  stopVideoWatcher,
  getVideoOutputRoot,
  checkVideoSetup,
};

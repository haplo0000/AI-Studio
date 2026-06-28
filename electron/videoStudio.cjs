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
  path.join('C:\\AI\\StabilityMatrix', 'Data', 'Workflows', 'video', 'i2v_wan22_5b_api.json'),
  path.join(__dirname, 'workflows', 'i2v_wan22_5b_api.json'),
  path.join('C:\\AI\\StabilityMatrix', 'Data', 'Workflows', 'video', 'i2v_wan22_api.json'),
  path.join(__dirname, 'workflows', 'i2v_wan22_api.json'),
];

const WAN_5B_TEMPLATE_PATH = path.join(
  'C:\\AI\\StabilityMatrix',
  'Data',
  'Packages',
  'ComfyUI',
  'venv',
  'Lib',
  'site-packages',
  'comfyui_workflow_templates_media_video',
  'templates',
  'video_wan2_2_5B_ti2v.json',
);

const WAN_BLUEPRINT_PATH = path.join(
  'C:\\AI\\StabilityMatrix',
  'Data',
  'Packages',
  'ComfyUI',
  'blueprints',
  'Image to Video (Wan 2.2).json',
);

const REQUIRED_VIDEO_NODES_5B = [
  'Wan22ImageToVideoLatent',
  'CreateVideo',
  'SaveVideo',
  'UNETLoader',
  'CLIPLoader',
  'VAELoader',
  'KSampler',
];

const REQUIRED_VIDEO_MODELS_5B = [
  { dir: 'diffusion_models', file: 'wan2.2_ti2v_5B_fp16.safetensors' },
  { dir: 'text_encoders', file: 'umt5_xxl_fp8_e4m3fn_scaled.safetensors' },
  { dir: 'vae', file: 'wan2.2_vae.safetensors' },
];

/** Conservative limits for ~8GB VRAM (RTX 5060 Laptop). */
const VRAM_PROFILE = {
  id: 'wan2.2_ti2v_5b_8gb',
  maxDim: 512,
  warnPixels: 512 * 384,
  blockPixels: 640 * 480,
  maxFrames: 65,
  label: '8GB VRAM (Wan2.2 5B)',
};

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
    case 'Wan22ImageToVideoLatent':
      inputs.width = w[0];
      inputs.height = w[1];
      inputs.length = w[2];
      inputs.batch_size = w[3] ?? 1;
      break;
    case 'WanImageToVideo':
      inputs.width = w[0];
      inputs.height = w[1];
      inputs.length = w[2];
      inputs.batch_size = w[3] ?? 1;
      break;
    case 'KSampler':
      inputs.seed = w[0];
      inputs.steps = w[2];
      inputs.cfg = w[3];
      inputs.sampler_name = w[4];
      inputs.scheduler = w[5];
      inputs.denoise = w[6];
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

  if (fs.existsSync(WAN_5B_TEMPLATE_PATH)) {
    const template = JSON.parse(fs.readFileSync(WAN_5B_TEMPLATE_PATH, 'utf8'));
    if (template.nodes) return convertComfyTemplateToApi(template);
  }

  if (fs.existsSync(WAN_BLUEPRINT_PATH)) {
    const blueprint = JSON.parse(fs.readFileSync(WAN_BLUEPRINT_PATH, 'utf8'));
    const subgraph = blueprint.definitions?.subgraphs?.[0];
    if (subgraph) return convertSubgraphToApi(subgraph);
  }

  return null;
}

function convertComfyTemplateToApi(template) {
  const api = {};
  const nodes = template.nodes || [];
  const links = template.links || [];
  const skipTypes = new Set(['MarkdownNote', 'Note', 'Reroute']);
  const linkByTarget = new Map();

  for (const link of links) {
    const [id, originId, originSlot, targetId, targetSlot] = link;
    if (!linkByTarget.has(targetId)) linkByTarget.set(targetId, []);
    linkByTarget.get(targetId).push({ originId, originSlot, targetSlot });
  }

  for (const node of nodes) {
    if (skipTypes.has(node.type)) continue;
    const inputs = {};
    for (const link of linkByTarget.get(node.id) || []) {
      const inp = (node.inputs || [])[link.targetSlot];
      if (!inp?.name) continue;
      inputs[inp.name] = [String(link.originId), link.originSlot];
    }
    applyWidgetValues(node, inputs);
    api[String(node.id)] = { class_type: node.type, inputs };
  }

  return api;
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
    for (const nodeType of REQUIRED_VIDEO_NODES_5B) {
      if (!objectInfo[nodeType]) {
        return {
          ready: false,
          message: 'Video model/workflow not installed yet',
          detail: `ComfyUI node "${nodeType}" is not available. Update ComfyUI to a build with Wan 2.2 5B support.`,
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
  for (const { dir, file } of REQUIRED_VIDEO_MODELS_5B) {
    const full = path.join(modelsDir, dir, file);
    if (!fs.existsSync(full)) missing.push(`${dir}/${file}`);
  }
  if (missing.length > 0) {
    return {
      ready: false,
      message: 'Video model/workflow not installed yet',
      detail: `Missing Wan2.2 5B models: ${missing.join(', ')}`,
      missingModels: missing,
    };
  }

  return {
    ready: true,
    message: 'Video generation ready (Wan2.2 TI2V 5B)',
    workflow: 'wan2.2_ti2v_5b',
    model: 'wan2.2_ti2v_5B_fp16',
    vramProfile: VRAM_PROFILE.label,
  };
}

function readImageDimensions(imagePath) {
  try {
    const { nativeImage } = require('electron');
    const img = nativeImage.createFromPath(imagePath);
    const size = img.getSize();
    if (size.width > 0 && size.height > 0) {
      const maxDim = VRAM_PROFILE.maxDim;
      const scale = Math.min(1, maxDim / Math.max(size.width, size.height));
      let width = Math.max(64, Math.round((size.width * scale) / 16) * 16);
      let height = Math.max(64, Math.round((size.height * scale) / 16) * 16);
      if (width * height > VRAM_PROFILE.warnPixels) {
        const pixelScale = Math.sqrt(VRAM_PROFILE.warnPixels / (width * height));
        width = Math.max(64, Math.round((width * pixelScale) / 16) * 16);
        height = Math.max(64, Math.round((height * pixelScale) / 16) * 16);
      }
      return { width, height };
    }
  } catch {
    // ignore
  }
  return { width: 512, height: 320 };
}

function estimateVramRisk(params) {
  const dims = readImageDimensions(params.sourcePath);
  const frameLength = durationToFrameLength(params.duration);
  const pixels = dims.width * dims.height;
  const workload = pixels * frameLength;

  const safeWorkload = 512 * 320 * 33;
  const warnWorkload = 512 * 512 * 49;
  const blockWorkload = 640 * 480 * 65;

  if (frameLength > VRAM_PROFILE.maxFrames || pixels > VRAM_PROFILE.blockPixels) {
    return {
      level: 'block',
      message: `This settings combo (${dims.width}×${dims.height}, ${params.duration}s) is likely to exceed 8GB VRAM. Use 2s duration and keep the source image under ${VRAM_PROFILE.maxDim}px on the long edge.`,
      dims,
      frameLength,
    };
  }

  if (workload > blockWorkload || params.duration >= 6) {
    return {
      level: 'block',
      message: `6-second or high-resolution video may exceed 8GB VRAM on Wan2.2 5B. Try 2s at ≤${VRAM_PROFILE.maxDim}px instead.`,
      dims,
      frameLength,
    };
  }

  if (workload > warnWorkload || params.duration >= 4 || params.motionStrength > 0.75) {
    return {
      level: 'warn',
      message: `${params.duration}s at ${dims.width}×${dims.height} may be tight on 8GB VRAM. If generation fails, reduce duration to 2s or use a smaller source image.`,
      dims,
      frameLength,
    };
  }

  if (workload > safeWorkload) {
    return {
      level: 'warn',
      message: `Generation uses ${dims.width}×${dims.height} for ~${params.duration}s — within 8GB limits but close. Prefer 2s for fastest results.`,
      dims,
      frameLength,
    };
  }

  return { level: 'ok', message: null, dims, frameLength };
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
  const motionStrength = Math.min(1, Math.max(0.1, Number(params.motionStrength ?? 0.4)));
  const cfg = 3 + motionStrength * 3;

  const loadImage = Object.entries(wf).find(([, n]) => n.class_type === 'LoadImage');
  if (loadImage) loadImage[1].inputs.image = params.inputImageName;

  const latentNode = Object.values(wf).find(
    (n) => n.class_type === 'Wan22ImageToVideoLatent' || n.class_type === 'WanImageToVideo',
  );
  const sampler = Object.values(wf).find(
    (n) => n.class_type === 'KSampler' || n.class_type === 'KSamplerAdvanced',
  );
  const samplers = sampler ? [sampler] : Object.values(wf).filter(
    (n) => n.class_type === 'KSampler' || n.class_type === 'KSamplerAdvanced',
  );

  if (sampler?.inputs?.positive) {
    const posId = sampler.inputs.positive[0];
    if (wf[posId]) wf[posId].inputs.text = params.prompt;
  }
  if (sampler?.inputs?.negative) {
    const negId = sampler.inputs.negative[0];
    if (wf[negId]) {
      wf[negId].inputs.text = 'low quality, blurry, static, watermark, text, oversaturated';
    }
  } else if (latentNode?.inputs?.positive) {
    const posId = latentNode.inputs.positive[0];
    if (wf[posId]) wf[posId].inputs.text = params.prompt;
  }
  if (latentNode?.inputs?.negative) {
    const negId = latentNode.inputs.negative[0];
    if (wf[negId]) {
      wf[negId].inputs.text = 'low quality, blurry, static, watermark, text, oversaturated';
    }
  }

  if (latentNode) {
    latentNode.inputs.width = dims.width;
    latentNode.inputs.height = dims.height;
    latentNode.inputs.length = frameLength;
  }
  for (const sampler of samplers) {
    sampler.inputs.cfg = cfg;
    sampler.inputs.seed = params.seed ?? Math.floor(Math.random() * 1_000_000_000);
  }
  const saveVideo = Object.values(wf).find((n) => n.class_type === 'SaveVideo');
  if (saveVideo) saveVideo.inputs.filename_prefix = params.prefix;

  return wf;
}

async function queueImageToVideo(settings, params, appendLog = null) {
  const log = (step, meta = {}) => {
    if (appendLog) appendLog('info', 'video-pipeline', step, meta);
  };

  log('queueImageToVideo start', {
    sourcePath: params.sourcePath,
    duration: params.duration,
  });

  const setup = await checkVideoSetup(settings);
  if (!setup.ready) {
    const err = new Error(setup.message);
    err.code = 'VIDEO_SETUP';
    err.detail = setup.detail;
    throw err;
  }
  log('setup check passed', { workflow: setup.workflow });

  const vram = estimateVramRisk(params);
  if (vram.level === 'block') {
    const err = new Error('Settings may exceed 8GB VRAM');
    err.code = 'VIDEO_VRAM';
    err.detail = vram.message;
    throw err;
  }
  log('VRAM check passed', { level: vram.level, dims: vram.dims });

  const workflow = loadVideoWorkflowApi();
  if (!workflow) {
    const err = new Error('Video workflow not loaded');
    err.code = 'VIDEO_SETUP';
    err.detail = 'Could not load Wan2.2 5B API workflow JSON.';
    throw err;
  }
  log('workflow loaded', { nodeCount: Object.keys(workflow).length });

  const base = (settings.services?.comfyui || 'http://127.0.0.1:8188').replace(/\/$/, '');
  const prefix = `aistudio_video_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
  const inputImageName = await stageImageForComfy(settings, params.sourcePath);
  log('source image staged', { inputImageName });

  const promptWorkflow = mutateVideoWorkflow(workflow, {
    ...params,
    inputImageName,
    prefix,
  });

  const bridge = getImageStudioBridge();
  log('posting to ComfyUI /prompt', { base, prefix });
  const result = await bridge.postJson(`${base}/prompt`, {
    prompt: promptWorkflow,
    client_id: bridge.COMFY_CLIENT_ID,
  });

  if (!result?.prompt_id) {
    const detail =
      typeof result === 'object' && result !== null
        ? JSON.stringify(result).slice(0, 400)
        : String(result);
    const err = new Error('ComfyUI did not accept the video workflow');
    err.code = 'VIDEO_COMFY';
    err.detail = `No prompt_id returned. ComfyUI response: ${detail}`;
    throw err;
  }

  pendingVideos.set(prefix, {
    prompt: params.prompt,
    source_image_path: params.sourcePath,
    duration: params.duration,
    motion_strength: params.motionStrength,
    workflow: setup.workflow || 'wan2.2_ti2v_5b',
    model: setup.model || 'wan2.2_ti2v_5B_fp16',
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
  ipcMain.handle('video-studio:vram-risk', async (_event, params) => estimateVramRisk(params || {}));

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
    const log = (step, meta = {}) => appendLog('info', 'video-pipeline', step, meta);

    log('IPC video-studio:generate received', {
      sourcePath: params?.sourcePath,
      duration: params?.duration,
      motionStrength: params?.motionStrength,
      promptLength: String(params?.prompt || '').length,
    });

    if (!params?.sourcePath) {
      return {
        ok: false,
        message: 'Missing source image',
        detail: 'No source image path was provided to the video generator.',
      };
    }
    if (!fs.existsSync(params.sourcePath)) {
      return {
        ok: false,
        message: 'Source image not found',
        detail: `File does not exist: ${params.sourcePath}`,
      };
    }
    if (!String(params.prompt || '').trim()) {
      return {
        ok: false,
        message: 'Missing motion prompt',
        detail: 'Enter a prompt describing the motion you want.',
      };
    }

    try {
      bridge.ensureComfyProgressMonitor(settings);
      log('ComfyUI progress monitor active');

      const result = await queueImageToVideo(settings, params, appendLog);
      log('ComfyUI request sent', { promptId: result.promptId, prefix: result.prefix });

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
        promptId: result.promptId,
      });

      const jobs = bridge.serializeGenerationJobs();
      log('Generation job registered', { jobCount: jobs.length, promptId: result.promptId });

      return {
        ok: true,
        message: 'Video queued — ComfyUI is generating. It appears automatically when ready.',
        jobs,
      };
    } catch (err) {
      appendLog('error', 'video-pipeline', 'Video generation failed', {
        code: err.code,
        message: err.message,
        detail: err.detail,
        stack: err.stack,
      });

      if (err.code === 'VIDEO_SETUP') {
        return {
          ok: false,
          setupRequired: true,
          message: err.message,
          detail: err.detail,
        };
      }
      if (err.code === 'VIDEO_VRAM') {
        return {
          ok: false,
          vramBlocked: true,
          message: err.message,
          detail: err.detail,
        };
      }
      if (err.code === 'VIDEO_COMFY') {
        return {
          ok: false,
          message: err.message,
          detail: err.detail,
        };
      }

      return {
        ok: false,
        message: 'Video generation failed',
        detail: err.message || 'Unknown error in main process',
      };
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
  estimateVramRisk,
};

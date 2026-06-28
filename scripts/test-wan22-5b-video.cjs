/**
 * One-shot Wan2.2 5B image-to-video test via ComfyUI HTTP API.
 * Usage: node scripts/test-wan22-5b-video.cjs [sourceImagePath]
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const http = require('http');

const COMFY = 'http://127.0.0.1:8188';
const WORKFLOW_PATH = path.join(__dirname, '..', 'electron', 'workflows', 'i2v_wan22_5b_api.json');
const DEFAULT_IMAGE =
  'C:\\AI\\StabilityMatrix\\Data\\Images\\Text2Img\\aistudio_1782588058741_00001_.png';
const PROMPT = 'slow cinematic camera push-in, subtle atmospheric motion';
const DURATION_SEC = 2;
const MOTION = 0.4;
const FPS = 16;

function durationToFrameLength(durationSec) {
  const raw = Math.round(Number(durationSec) * FPS);
  return Math.max(17, Math.round((raw - 1) / 4) * 4 + 1);
}

function getJson(url) {
  return new Promise((resolve, reject) => {
    http
      .get(url, (res) => {
        let data = '';
        res.on('data', (c) => (data += c));
        res.on('end', () => {
          try {
            resolve(JSON.parse(data));
          } catch (e) {
            reject(e);
          }
        });
      })
      .on('error', reject);
  });
}

function postJson(url, body) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify(body);
    const req = http.request(
      url,
      { method: 'POST', headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload) } },
      (res) => {
        let data = '';
        res.on('data', (c) => (data += c));
        res.on('end', () => {
          try {
            resolve(JSON.parse(data || '{}'));
          } catch (e) {
            reject(e);
          }
        });
      },
    );
    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}

function uploadImage(filePath) {
  const boundary = `----FormBoundary${crypto.randomBytes(8).toString('hex')}`;
  const filename = path.basename(filePath);
  const fileData = fs.readFileSync(filePath);
  const head = Buffer.from(
    `--${boundary}\r\nContent-Disposition: form-data; name="image"; filename="${filename}"\r\nContent-Type: image/png\r\n\r\n`,
  );
  const tail = Buffer.from(`\r\n--${boundary}--\r\n`);
  const body = Buffer.concat([head, fileData, tail]);

  return new Promise((resolve, reject) => {
    const req = http.request(
      `${COMFY}/upload/image`,
      {
        method: 'POST',
        headers: { 'Content-Type': `multipart/form-data; boundary=${boundary}`, 'Content-Length': body.length },
      },
      (res) => {
        let data = '';
        res.on('data', (c) => (data += c));
        res.on('end', () => {
          try {
            resolve(JSON.parse(data));
          } catch (e) {
            reject(new Error(`Upload failed: ${data}`));
          }
        });
      },
    );
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

async function waitForComfy(maxSec = 180) {
  const start = Date.now();
  while ((Date.now() - start) / 1000 < maxSec) {
    try {
      await getJson(`${COMFY}/system_stats`);
      return true;
    } catch {
      await new Promise((r) => setTimeout(r, 3000));
    }
  }
  throw new Error('ComfyUI did not become ready');
}

async function main() {
  const sourcePath = process.argv[2] || DEFAULT_IMAGE;
  if (!fs.existsSync(sourcePath)) throw new Error(`Source image not found: ${sourcePath}`);
  if (!fs.existsSync(WORKFLOW_PATH)) throw new Error(`Workflow not found: ${WORKFLOW_PATH}`);

  console.log('Waiting for ComfyUI...');
  await waitForComfy();

  const objectInfo = await getJson(`${COMFY}/object_info`);
  for (const node of ['Wan22ImageToVideoLatent', 'KSampler', 'SaveVideo']) {
    if (!objectInfo[node]) throw new Error(`Missing ComfyUI node: ${node}`);
  }

  const workflow = JSON.parse(fs.readFileSync(WORKFLOW_PATH, 'utf8'));
  const uploaded = await uploadImage(sourcePath);
  const inputName = uploaded.name || path.basename(sourcePath);
  const prefix = `aistudio_video_test_${Date.now()}`;
  const frameLength = durationToFrameLength(DURATION_SEC);
  const cfg = 3 + MOTION * 3;

  workflow['56'].inputs.image = inputName;
  workflow['55'].inputs.width = 512;
  workflow['55'].inputs.height = 320;
  workflow['55'].inputs.length = frameLength;
  workflow['6'].inputs.text = PROMPT;
  workflow['3'].inputs.cfg = cfg;
  workflow['3'].inputs.seed = Math.floor(Math.random() * 1_000_000_000);
  workflow['58'].inputs.filename_prefix = prefix;

  console.log('Queuing generation...', { inputName, frameLength, prefix });
  const started = Date.now();
  const queued = await postJson(`${COMFY}/prompt`, { prompt: workflow, client_id: 'aistudio-test' });
  const promptId = queued.prompt_id;
  if (!promptId) throw new Error(`Queue failed: ${JSON.stringify(queued)}`);

  while (true) {
    await new Promise((r) => setTimeout(r, 5000));
    const hist = await getJson(`${COMFY}/history/${promptId}`);
    const entry = hist[promptId];
    if (!entry) {
      const elapsed = ((Date.now() - started) / 1000).toFixed(0);
      process.stdout.write(`\rGenerating... ${elapsed}s`);
      continue;
    }
    const elapsedSec = ((Date.now() - started) / 1000).toFixed(1);
    const outputs = entry.outputs || {};
    let videoPath = null;
    for (const out of Object.values(outputs)) {
      for (const v of out.videos || out.gifs || []) {
        videoPath = path.join('C:\\AI\\StabilityMatrix\\Data\\Packages\\ComfyUI', 'output', v.subfolder || '', v.filename);
      }
    }
    console.log(`\nComplete in ${elapsedSec}s`);
    if (videoPath) console.log('Output:', videoPath);
    else console.log('History:', JSON.stringify(entry, null, 2));
    break;
  }
}

main().catch((err) => {
  console.error('TEST FAILED:', err.message);
  process.exit(1);
});

/**
 * Smoke-test video generate IPC path without Electron UI.
 */
const path = require('path');

// Minimal stubs so videoStudio can load outside Electron
const Module = require('module');
const origLoad = Module._load;
Module._load = function (request, parent, isMain) {
  if (request === 'electron') {
    return {
      nativeImage: {
        createFromPath: () => ({ getSize: () => ({ width: 1024, height: 1024 }), isEmpty: () => false }),
      },
      shell: { showItemInFolder: () => {}, openPath: async () => {} },
    };
  }
  if (request === 'better-sqlite3') {
    return class {
      constructor() {}
      pragma() {}
      exec() {}
      prepare() {
        return { run: () => {}, get: () => null, all: () => [] };
      }
    };
  }
  if (request === 'chokidar') {
    return { watch: () => ({ on: () => {}, close: () => {} }) };
  }
  return origLoad.apply(this, arguments);
};

const yaml = require('js-yaml');
const fs = require('fs');
const settingsPath = 'C:\\AI\\AIStudio\\config\\settings.yaml';
const settings = fs.existsSync(settingsPath)
  ? yaml.load(fs.readFileSync(settingsPath, 'utf8'))
  : {};

const videoStudio = require('../electron/videoStudio.cjs');
const imageStudio = require('../electron/imageStudio.cjs');

const logs = [];
const appendLog = (level, source, message, meta) => {
  logs.push({ level, source, message, meta });
  console.log(`[${source}] ${message}`, meta || '');
};

async function main() {
  const setup = await videoStudio.checkVideoSetup(settings);
  console.log('setup:', setup);

  const params = {
    sourcePath: 'C:\\AI\\StabilityMatrix\\Data\\Images\\Text2Img\\aistudio_1782588058741_00001_.png',
    prompt: 'slow cinematic camera push-in, subtle atmospheric motion',
    duration: 2,
    motionStrength: 0.4,
  };

  const { registerVideoStudioIpc } = videoStudio;
  const handlers = new Map();
  const ipcMain = {
    handle: (channel, fn) => handlers.set(channel, fn),
  };
  registerVideoStudioIpc(ipcMain, () => settings, appendLog);

  const handler = handlers.get('video-studio:generate');
  if (!handler) throw new Error('Handler not registered');

  const result = await handler({}, params);
  console.log('generate result:', JSON.stringify(result, null, 2));
  console.log('jobs:', imageStudio.serializeGenerationJobs?.() || 'n/a');

  if (!result.ok) process.exit(1);
}

main().catch((err) => {
  console.error('FAILED:', err);
  process.exit(1);
});

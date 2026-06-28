const { contextBridge, ipcRenderer } = require('electron');
const fs = require('fs');
const path = require('path');

const PRELOAD_LOG = path.join('C:\\AI\\AIStudio', 'logs', 'preload.log');

function logPreload(message, meta = {}) {
  try {
    fs.mkdirSync(path.dirname(PRELOAD_LOG), { recursive: true });
    const line = JSON.stringify({ ts: new Date().toISOString(), layer: 'preload', message, meta });
    fs.appendFileSync(PRELOAD_LOG, `${line}\n`, 'utf8');
    console.info(`[preload] ${message}`, meta);
  } catch {
    // ignore log write failures
  }
}

function invokeVideoGenerate(params) {
  logPreload('videoStudioGenerate → IPC', {
    sourcePath: params?.sourcePath,
    duration: params?.duration,
    motionStrength: params?.motionStrength,
    promptLength: params?.prompt?.length ?? 0,
  });
  return ipcRenderer
    .invoke('video-studio:generate', params)
    .then((result) => {
      logPreload('videoStudioGenerate ← IPC', {
        ok: result?.ok,
        message: result?.message,
        jobCount: result?.jobs?.length ?? 0,
      });
      return result;
    })
    .catch((err) => {
      logPreload('videoStudioGenerate IPC error', { error: err?.message || String(err) });
      throw err;
    });
}

function getMediaUrl(filePath) {
  const normalized = path.resolve(String(filePath || '').replace(/\//g, path.sep));
  return `media://local/?path=${encodeURIComponent(normalized)}`;
}

const aiStudioApi = {
  getBootstrap: () => ipcRenderer.invoke('studio:get-bootstrap'),
  refreshHealth: () => ipcRenderer.invoke('studio:refresh-health'),
  getLogs: () => ipcRenderer.invoke('studio:get-logs'),
  launchModule: (moduleId) => ipcRenderer.invoke('studio:launch-module', moduleId),
  launchAction: (action) => ipcRenderer.invoke('studio:launch-action', action),
  openUrl: (url) => ipcRenderer.invoke('studio:open-url', url),
  setCurrentWorkshop: (workshopId) => ipcRenderer.invoke('studio:set-current-workshop', workshopId),
  openWorkshopFolder: (workshopId) => ipcRenderer.invoke('studio:open-workshop-folder', workshopId),
  openWorkshopInCursor: (workshopId) => ipcRenderer.invoke('studio:open-workshop-cursor', workshopId),
  blacksmithCreateSession: (workshopId, mode, goal) =>
    ipcRenderer.invoke('blacksmith:create-session', workshopId, mode, goal),
  blacksmithGetSession: (sessionId) => ipcRenderer.invoke('blacksmith:get-session', sessionId),
  blacksmithListSessions: () => ipcRenderer.invoke('blacksmith:list-sessions'),
  blacksmithSendMessage: (sessionId, content) =>
    ipcRenderer.invoke('blacksmith:send-message', sessionId, content),
  blacksmithSendToCouncil: (sessionId) => ipcRenderer.invoke('blacksmith:send-to-council', sessionId),
  prepareWorkstation: () => ipcRenderer.invoke('studio:prepare-workstation'),
  startService: (serviceId) => ipcRenderer.invoke('studio:start-service', serviceId),
  restartComfyui: () => ipcRenderer.invoke('studio:restart-comfyui'),
  openCouncil: () => ipcRenderer.invoke('studio:open-council'),
  onWorkstationStatus: (callback) => {
    const handler = (_event, status) => callback(status);
    ipcRenderer.on('studio:workstation-status', handler);
    return () => ipcRenderer.removeListener('studio:workstation-status', handler);
  },
  imageStudioStart: () => ipcRenderer.invoke('image-studio:start'),
  imageStudioStop: () => ipcRenderer.invoke('image-studio:stop'),
  imageStudioStats: () => ipcRenderer.invoke('image-studio:stats'),
  imageStudioList: (opts) => ipcRenderer.invoke('image-studio:list', opts),
  imageStudioSearch: (query, opts) => ipcRenderer.invoke('image-studio:search', query, opts),
  imageStudioThumbnail: (filePath) => ipcRenderer.invoke('image-studio:thumbnail', filePath),
  imageStudioDelete: (filePath) => ipcRenderer.invoke('image-studio:delete', filePath),
  imageStudioReveal: (filePath) => ipcRenderer.invoke('image-studio:reveal', filePath),
  imageStudioOpenFolder: (folderPath) => ipcRenderer.invoke('image-studio:open-folder', folderPath),
  imageStudioOpenViewer: (filePath) => ipcRenderer.invoke('image-studio:open-viewer', filePath),
  imageStudioCopyImage: (filePath) => ipcRenderer.invoke('image-studio:copy-image', filePath),
  imageStudioCopyPrompt: (filePath) => ipcRenderer.invoke('image-studio:copy-prompt', filePath),
  imageStudioGenerate: (params) => ipcRenderer.invoke('image-studio:generate', params),
  imageStudioEditImage: (params) => ipcRenderer.invoke('image-studio:edit-image', params),
  imageStudioGenerationJobs: () => ipcRenderer.invoke('image-studio:generation-jobs'),
  imageStudioVariations: (filePath) => ipcRenderer.invoke('image-studio:variations', filePath),
  imageStudioUpscale: (filePath) => ipcRenderer.invoke('image-studio:upscale', filePath),
  imageStudioGetImage: (filePath) => ipcRenderer.invoke('image-studio:get-image', filePath),
  getMediaUrl,
  onImageStudioChanged: (callback) => {
    const handler = (_event, data) => callback(data);
    ipcRenderer.on('image-studio:changed', handler);
    return () => ipcRenderer.removeListener('image-studio:changed', handler);
  },
  onGenerationProgress: (callback) => {
    const handler = (_event, data) => callback(data);
    ipcRenderer.on('image-studio:generation-progress', handler);
    return () => ipcRenderer.removeListener('image-studio:generation-progress', handler);
  },
  videoStudioSetup: () => ipcRenderer.invoke('video-studio:setup'),
  videoStudioVramRisk: (params) => ipcRenderer.invoke('video-studio:vram-risk', params),
  videoStudioStart: () => ipcRenderer.invoke('video-studio:start'),
  videoStudioStop: () => ipcRenderer.invoke('video-studio:stop'),
  videoStudioStats: () => ipcRenderer.invoke('video-studio:stats'),
  videoStudioList: (opts) => ipcRenderer.invoke('video-studio:list', opts),
  videoStudioGenerate: (params) => invokeVideoGenerate(params),
  /** @deprecated alias — use videoStudioGenerate */
  imageStudioCreateVideo: (params) => invokeVideoGenerate(params),
  videoStudioReveal: (filePath) => ipcRenderer.invoke('video-studio:reveal', filePath),
  videoStudioOpenFolder: (folderPath) => ipcRenderer.invoke('video-studio:open-folder', folderPath),
  videoStudioOpenViewer: (filePath) => ipcRenderer.invoke('video-studio:open-viewer', filePath),
  videoStudioOpenSetup: () => ipcRenderer.invoke('video-studio:open-setup'),
  onVideoStudioChanged: (callback) => {
    const handler = (_event, data) => callback(data);
    ipcRenderer.on('video-studio:changed', handler);
    return () => ipcRenderer.removeListener('video-studio:changed', handler);
  },
};

try {
  contextBridge.exposeInMainWorld('aiStudio', aiStudioApi);
  logPreload('preload bridge exposed', { methods: Object.keys(aiStudioApi).length });
} catch (error) {
  logPreload('preload bridge failed', { error: error.message });
  console.error('[preload] Failed to expose aiStudio API:', error);
}

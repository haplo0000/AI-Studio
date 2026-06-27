const { contextBridge, ipcRenderer } = require('electron');
const fs = require('fs');
const path = require('path');

const PRELOAD_LOG = path.join('C:\\AI\\AIStudio', 'logs', 'preload.log');

function logPreload(message, meta = {}) {
  try {
    fs.mkdirSync(path.dirname(PRELOAD_LOG), { recursive: true });
    fs.appendFileSync(
      PRELOAD_LOG,
      `${JSON.stringify({ ts: new Date().toISOString(), message, meta })}\n`,
      'utf8',
    );
  } catch {
    // ignore log write failures
  }
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
  imageStudioVariations: (filePath) => ipcRenderer.invoke('image-studio:variations', filePath),
  imageStudioUpscale: (filePath) => ipcRenderer.invoke('image-studio:upscale', filePath),
  imageStudioGetImage: (filePath) => ipcRenderer.invoke('image-studio:get-image', filePath),
  getMediaUrl,
  onImageStudioChanged: (callback) => {
    const handler = (_event, data) => callback(data);
    ipcRenderer.on('image-studio:changed', handler);
    return () => ipcRenderer.removeListener('image-studio:changed', handler);
  },
};

try {
  contextBridge.exposeInMainWorld('aiStudio', aiStudioApi);
  logPreload('preload bridge exposed', { methods: Object.keys(aiStudioApi).length });
} catch (error) {
  logPreload('preload bridge failed', { error: error.message });
  console.error('[preload] Failed to expose aiStudio API:', error);
}

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('aiStudio', {
  getBootstrap: () => ipcRenderer.invoke('studio:get-bootstrap'),
  refreshHealth: () => ipcRenderer.invoke('studio:refresh-health'),
  getLogs: () => ipcRenderer.invoke('studio:get-logs'),
  launchModule: (moduleId) => ipcRenderer.invoke('studio:launch-module', moduleId),
  launchAction: (action) => ipcRenderer.invoke('studio:launch-action', action),
  openUrl: (url) => ipcRenderer.invoke('studio:open-url', url),
});

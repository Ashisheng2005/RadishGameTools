// preload.js
// const { contextBridge, ipcRenderer } = require('electron');

// contextBridge.exposeInMainWorld('electronAPI', {
//   launchApp: (appId, executablePath) => ipcRenderer.invoke('launch-app', appId, executablePath),
//   terminateApp: (appId) => ipcRenderer.invoke('terminate-app', appId),
//   getAppStatus: (appId) => ipcRenderer.invoke('get-app-status', appId)
// });
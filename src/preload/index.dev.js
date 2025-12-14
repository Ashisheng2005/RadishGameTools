const { contextBridge, ipcRenderer } = require('electron')

console.log('🚀 开发环境预加载脚本执行！')

const electronAPI = {
  isElectron: true,
  platform: process.platform,
  
  openFileDialog: (options) => 
    ipcRenderer.invoke('dialog:openFile', options),
  
  getFilePath: (file) => file.path || null,
  
  launchApp: (appId, executablePath) => 
    ipcRenderer.invoke('launch-app', appId, executablePath),
  
  terminateApp: (appId) => 
    ipcRenderer.invoke('terminate-app', appId),
  
  getAppStatus: (appId) => 
    ipcRenderer.invoke('get-app-status', appId)
}

contextBridge.exposeInMainWorld('electronAPI', electronAPI)
console.log('✅ electronAPI 已暴露到 window')
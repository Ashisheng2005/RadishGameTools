import { contextBridge, ipcRenderer } from 'electron'
import {
  AppData,
  AppConfig,
  LogMetadata,
  ErrorMetadata,
  IpcRendererListener
} from '../shared/types'

const api = {}
console.log('预加载执行脚本！')
// electronAPI
const customElectronAPI = {
  // 添加 isElectron 标识
  isElectron: true,

  // 添加平台信息
  platform: process.platform,

  // 跳转浏览器指定页面
  openExternalLink: (url: string) => ipcRenderer.invoke('open-external-link', url),

  // 添加文件对话框 API
  openFileDialog: (options?: {
    title?: string
    filters?: Array<{ name: string; extensions: string[] }>
    properties?: string[]
    defaultPath?: string
  }) => ipcRenderer.invoke('dialog:openFile', options),

  // 添加文件夹对话框 API
  saveFileDialog: (options?: {
    title?: string
    filters?: Array<{ name: string; extensions: string[] }>
    properties?: string[]
    defaultPath?: string
  }) => ipcRenderer.invoke('dialog:saveFile', options),

  // 提取缩略图到Buffer
  extraceThumbnail: (filePath: string) => ipcRenderer.invoke('extrace-thumbnail', filePath),

  // 提取略缩图到文件
  extraceThumbnailTOFile: (filePath: string) =>
    ipcRenderer.invoke('extrace-thumbnail-to-file', filePath),

  // 添加获取文件路径方法
  getFilePath: (file: File) => {
    const fileWithPath = file as File & { path?: string }
    return fileWithPath.path || null
  },

  // 获取Modification状态
  getModification: () => ipcRenderer.invoke('app:getModification'),

  launchApp: (app: AppData) =>
    // ipcRenderer.invoke('launch-app', appId, executablePath),
    ipcRenderer.invoke('app:launch', app),

  terminateApp: (appId: string) =>
    // ipcRenderer.invoke('terminate-app', appId),
    ipcRenderer.invoke('app:terminate', appId),

  getAppStatus: (appId: string) => ipcRenderer.invoke('app:getStatus', appId),

  // 获取所有正在运行的应用（来自主进程的 AppLauncher）
  getAllRunningApps: () => ipcRenderer.invoke('app:getAllRunning'),

  getAllApps: () => ipcRenderer.invoke('get-all-apps'),

  getApp: (appId: string) => ipcRenderer.invoke('get-app', appId),

  recordAppStart: (appId: string, appName: string) =>
    ipcRenderer.invoke('record-app-start', appId, appName),

  recordAppEnd: (sessionId: string, appId: string) =>
    ipcRenderer.invoke('record-app-end', sessionId, appId),

  getAppStart: (appId: string) => ipcRenderer.invoke('get-app-start', appId),

  saveApp: (app: AppData) => ipcRenderer.invoke('save-app', app),

  deleteApp: (appId: string) => ipcRenderer.invoke('delete-app', appId),

  loggerInfo: (
    private_operation: string,
    _message: string,
    _metadata: LogMetadata = null,
    _tableName: string | null = null,
    _entityId: string | null = null
  ) =>
    ipcRenderer.invoke(
      'log-message',
      'info',
      private_operation,
      _message,
      _metadata,
      _tableName,
      _entityId
    ),

  loggerWarn: (
    operation: string,
    message: string,
    metadata: LogMetadata = null,
    tableName: string | null = null,
    entityId: string | null = null
  ) => ipcRenderer.invoke('log-message', 'warn', operation, message, metadata, tableName, entityId),

  loggerError: (
    operation: string,
    message: string,
    error: unknown = null,
    tableName: string | null = null,
    entityId: string | null = null
  ) => {
    const metadata: ErrorMetadata | unknown =
      error instanceof Error
        ? { name: error.name, stack: error.stack, error: error.message }
        : error
    ipcRenderer.invoke('log-message', 'error', operation, message, metadata, tableName, entityId)
  },

  loggerDebug: (
    operation: string,
    message: string,
    metadata: LogMetadata = null,
    tableName: string | null = null,
    entityId: string | null = null
  ) =>
    ipcRenderer.invoke('log-message', 'debug', operation, message, metadata, tableName, entityId),

  // 获取配置
  getConfig: () => ipcRenderer.invoke('config:get'),

  // 更新配置
  setConfig: (newConfig: AppConfig) => ipcRenderer.invoke('config:set', newConfig),

  // 获取窗口状态
  getWindowState: () => ipcRenderer.invoke('window-state:get'),

  // 设置窗口状态
  // setWindowState: (state: unknown) =>
  //   ipcRenderer.invoke('window-state:set', state),

  // 添加事件监听方法
  on: (channel: string, listener: IpcRendererListener) => {
    ipcRenderer.on(channel, listener)
  },

  // 添加移除事件监听方法
  removeListener: (channel: string, listener: IpcRendererListener) => {
    ipcRenderer.removeListener(channel, listener)
  },

  extractIconFromExe: (executablePath: string) =>
    ipcRenderer.invoke('extract-icon-from-exe', executablePath),

  fileExists: (filePath: string) => ipcRenderer.invoke('file-exists', filePath),

  getWindowsIcon: (executablePath: string) =>
    ipcRenderer.invoke('get-windows-icon', executablePath),

  getIconFromRegistry: (executablePath: string) =>
    ipcRenderer.invoke('get-icon-from-registry', executablePath),

  findIconInDirectory: (executablePath: string) =>
    ipcRenderer.invoke('find-icon-in-directory', executablePath),

  readIconFileAsBase64: (iconPath: string) =>
    ipcRenderer.invoke('read-icon-file-as-base64', iconPath),

  extractFileIcon: (exePath: string) =>
    ipcRenderer.invoke('get-icon-from-extract-file-icon', exePath)
}

if (process.contextIsolated) {
  try {
    // contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
    contextBridge.exposeInMainWorld('electronAPI', customElectronAPI)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore (define in dts)
  window.electron = electronAPI
  // @ts-ignore (define in dts)
  window.api = api
  // @ts-ignore (define in dts)
  window.electronAPI = customElectronAPI
}

import { AppData, AppConfig, LogMetadata, IpcRendererListener } from '@shared/types'

export interface IElectronAPI {
  openFileDialog: (options?: {
    title?: string
    filters?: Array<{ name: string; extensions: string[] }>
    properties?: string[]
    defaultPath?: string
  }) => Promise<{ canceled: boolean; filePaths: string[] }>

  saveFileDialog: (options?: {
    title?: string
    filters?: Array<{ name: string; extensions: string[] }>
    properties?: string[]
    defaultPath?: string
  }) => Promise<{ canceled: boolean; filePaths: string[] }>

  openExternalLink: (url: string) => Promise<boolean>

  getFilePath: (file: File) => string | null

  platform: string
  isElectron: boolean

  getModification: () => Promise<{ state: boolean }>

  launchApp: (app: AppData) => Promise<{ success: boolean; error?: string }>
  terminateApp: (appId: string) => Promise<{ success: boolean; error?: string }>
  getAppStatus: (appId: string) => Promise<{ status: string; duration: number }>

  getAllApps: () => Promise<AppData[]>
  getAllRunningApps: () => Promise<
    Array<{ appId: string; startTime: Date; duration: number; pid?: number }>
  >

  getApp: (appId: string) => Promise<AppData | null>

  recordAppStart: (appId: string, appName: string) => Promise<string>

  recordAppEnd: (sessionId: string, appId: string) => Promise<void>

  getAppStart: (appId: string) => Promise<{
    totalRuntime: number
    dailyAverage: number
    sessionCount: number
    launchCount: number
  } | null>

  saveApp: (app: AppData) => Promise<void>

  deleteApp: (appId: string) => Promise<boolean>

  loggerInfo: (
    operation: string,
    message: string,
    metadata?: LogMetadata,
    tableName?: string | null,
    entityId?: string | null
  ) => Promise<void>

  loggerWarn: (
    operation: string,
    message: string,
    metadata?: LogMetadata,
    tableName?: string | null,
    entityId?: string | null
  ) => Promise<void>

  loggerError: (
    operation: string,
    message: string,
    error?: unknown,
    tableName?: string | null,
    entityId?: string | null
  ) => Promise<void>

  loggerDebug: (
    operation: string,
    message: string,
    metadata?: LogMetadata,
    tableName?: string | null,
    entityId?: string | null
  ) => Promise<void>

  getWindowState: () => Promise<{ isFocused: boolean; isMinimized: boolean }>

  on: (channel: string, func: IpcRendererListener) => void

  removeListener: (channel: string, func: IpcRendererListener) => void

  // =============== 图标处理相关 ===============
  // 从可执行文件中提取图标
  extractIconFromExe: (
    executablePath: string
  ) => Promise<{ found: boolean; iconPath?: string; iconData?: string; error?: string }>
  // 检查文件是否存在
  fileExists: (filePath: string) => Promise<boolean>
  // 通过Windows API 获取 Windows 图标
  getWindowsIcon: (
    executablePath: string
  ) => Promise<{ found: boolean; iconPath?: string; iconData?: string; error?: string }>
  // 从注册表获取图标信息
  getIconFromRegistry: (
    executablePath: string
  ) => Promise<{ found: boolean; iconPath?: string; error?: string }>
  // 遍历可执行文件同级目录查找图标文件
  findIconInDirectory: (
    executablePath: string
  ) => Promise<{ found: boolean; iconPath?: string; error?: string }>
  // 读取图标文件并返回 base64 数据
  readIconFileAsBase64: (
    iconPath: string
  ) => Promise<{ success: boolean; base64Data?: string; mimeType?: string }>
  // 通过 extract-file-cion 获取文件图标
  extractFileIcon: (
    exePath: string
  ) => Promise<{ found: boolean; iconPath?: string; error?: string }>

  // 通过组件获取buffer
  extraceThumbnail: (filePath: string) => Promise<{ found: boolean; base64Data?: string }>

  // 通过组件将略缩图保存到文件
  extraceThumbnailTOFile: (filePath: string) => Promise<{ found: boolean; iconPath?: string }>

  // =============== 配置管理相关 ===============
  // 获取配置
  getConfig: () => Promise<AppConfig>
  // 更新配置
  setConfig: (newConfig: AppConfig) => Promise<void>
}

declare global {
  interface Window {
    electronAPI: IElectronAPI
  }
}

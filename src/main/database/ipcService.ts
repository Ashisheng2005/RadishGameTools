import { ipcRenderer } from 'electron'
import { AppData } from '../../shared/types'

export const ipcService = {
  // 获取所有应用数据
  getAllApps: (): Promise<AppData[]> => {
    return ipcRenderer.invoke('get-all-apps')
  },

  // 获取单个应用数据
  getApp: (appId: string): Promise<AppData | null> => {
    return ipcRenderer.invoke('get-app', appId)
  },

  // 保存应用
  saveApp: (
    appData: Omit<AppData, 'sessions' | 'usageHistory' | 'weeklyActivity'>
  ): Promise<void> => {
    return ipcRenderer.invoke('save-app', appData)
  },

  // 记录应用启动
  recordAppStart: (appId: string, appName: string): Promise<string> => {
    return ipcRenderer.invoke('record-app-start', appId, appName)
  },

  // 记录应用结束
  recordAppEnd: (sessionId: string, appId: string): Promise<void> => {
    return ipcRenderer.invoke('record-app-end', sessionId, appId)
  },

  // 获取使用统计
  getAppStats: (
    appId: string
  ): Promise<{
    totalRuntime: number
    dailyAverage: number
    sessionCount: number
    launchCount: number
  } | null> => {
    return ipcRenderer.invoke('get-app-stats', appId)
  }
}

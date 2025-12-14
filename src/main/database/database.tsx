// // src/database/database.ts
// import { app } from 'electron'
// import fs from 'fs/promises'
// import { Session, AppData, UsageData, WeeklyData  } from '../../shared/types'

// export class DatabaseService {
//   private filePath: string
//   private static instance: DatabaseService

//   private constructor() {
//     // 在主进程中，app 是可用的
//     const userDataPath = app.getPath('userData')
//     this.filePath = `${userDataPath}/app-data.json`
//     console.log(`filePath: ${this.filePath}`)
//   }

//   public static getInstance(): DatabaseService {
//     if (!DatabaseService.instance) {
//       DatabaseService.instance = new DatabaseService()
//     }
//     return DatabaseService.instance
//   }

//   // 读取所有数据
//   private async readData(): Promise<AppData[]> {
//     try {
//       const data = await fs.readFile(this.filePath, 'utf-8')
//       return JSON.parse(data)
//     } catch (error) {
//       // 文件不存在，返回空数组
//       return []
//     }
//   }

//   // 保存所有数据
//   private async saveData(apps: AppData[]): Promise<void> {
//     try {
//       // 确保目录存在

//       const dir = this.filePath.substring(0, this.filePath.lastIndexOf('/'))
//       await fs.mkdir(dir, { 
//         recursive: true 
//       })
//       await fs.writeFile(this.filePath, JSON.stringify(apps, null, 2))

//     } catch (error) {
//       console.error('保存数据失败:', error)
//       throw error
//     }
//   }

//   // 生成空的使用历史
//   private generateEmptyUsageHistory(): UsageData[] {
//     return Array.from({ length: 14 }, (_, i) => {
//       const date = new Date()
//       date.setDate(date.getDate() - (13 - i))
//       return {
//         date: `${date.getMonth() + 1}/${date.getDate()}`,
//         duration: 0,
//       }
//     })
//   }

//   // 生成空的周活动数据
//   private generateEmptyWeeklyActivity(): WeeklyData[] {
//     return Array.from({ length: 7 }, (_, i) => ({
//       day: i,
//       value: 0,
//     }))
//   }

//   // 获取所有应用
//   async getAllApps(): Promise<AppData[]> {
//     return await this.readData()
//   }

//   // 获取单个应用
//   async getApp(id: string): Promise<AppData | null> {
//     const apps = await this.readData()
//     return apps.find(app => app.id === id) || null
//   }

//   // 保存应用
//   async saveApp(appData: AppData): Promise<void> {
//     const apps = await this.readData()
//     const existingIndex = apps.findIndex(app => app.id === appData.id)

//     // 检查是否为完整数据
//     const isCompleteData = 'totalRuntime' in appData && 'sessions' in appData
    
//     if (existingIndex >= 0) {
//       // 获取现有的应用数据
//       const existingApp = apps[existingIndex]
      
//       // 更新现有应用
//       const updatedApp: AppData = {
//         ...existingApp,
//         ...appData,
//         // 确保 sessions 等数组字段不被覆盖
//         sessions: 'sessions' in appData ? appData.sessions : existingApp.sessions,
//         usageHistory: 'usageHistory' in appData ? appData.usageHistory : existingApp.usageHistory,
//         weeklyActivity: 'weeklyActivity' in appData ? appData.weeklyActivity : existingApp.weeklyActivity,
//         totalRuntime: 'totalRuntime' in appData ? appData.totalRuntime : existingApp.totalRuntime,
//         launchCount: 'launchCount' in appData ? appData.launchCount : existingApp.launchCount,
//         lastUsed: 'lastUsed' in appData ? appData.lastUsed : existingApp.lastUsed
//       }
      
//       apps[existingIndex] = updatedApp
//     } else {
//       // 新增应用，确保有所有必要的字段
//       const newApp: AppData = {
//         // sessions: [],
//         // usageHistory: this.generateEmptyUsageHistory(),
//         // weeklyActivity: this.generateEmptyWeeklyActivity(),
//         // totalRuntime: 0,
//         // launchCount: 0,
//         // lastUsed: new Date().toISOString(),
//         // description: '',
//         // icon: 'default',
//         // color: '#666666',
//         category: 'Other',
//         ...appData,
//         totalRuntime: isCompleteData ? (appData as AppData).totalRuntime : 0,
//         launchCount: isCompleteData ? (appData as AppData).launchCount : 0,
//         lastUsed: isCompleteData ? (appData as AppData).lastUsed : new Date().toISOString(),
//         sessions: isCompleteData ? (appData as AppData).sessions : [],
//         usageHistory: isCompleteData ? (appData as AppData).usageHistory : this.generateEmptyUsageHistory(),
//         weeklyActivity: isCompleteData ? (appData as AppData).weeklyActivity : this.generateEmptyWeeklyActivity()
//       } as AppData
      
//       apps.push(newApp)
//     }
    
//     await this.saveData(apps)
//   }

//   // 获取应用会话
//   async getAppSessions(appId: string, limit: number = 50): Promise<Session[]> {
//     const app = await this.getApp(appId)
//     return app ? app.sessions.slice(0, limit) : []
//   }

//   // 添加会话
//   async addSession(session: Session, appId: string): Promise<void> {
//     const apps = await this.readData()
//     const appIndex = apps.findIndex(app => app.id === appId)
    
//     if (appIndex >= 0) {
//       // 更新会话（替换相同ID的会话）
//       const existingSessionIndex = apps[appIndex].sessions.findIndex(s => s.id === session.id)
//       if (existingSessionIndex >= 0) {
//         apps[appIndex].sessions[existingSessionIndex] = session
//       } else {
//         apps[appIndex].sessions.unshift(session)
//       }
//       await this.saveData(apps)
//     }
//   }

//   // 获取使用历史, days: number = 14
//   async getAppUsageHistory(appId: string): Promise<UsageData[]> {
//     const app = await this.getApp(appId)
//     return app ? app.usageHistory : []
//   }

//   // 更新使用历史
//   async updateUsageHistory(appId: string, date: string, duration: number): Promise<void> {
//     const apps = await this.readData()
//     const appIndex = apps.findIndex(app => app.id === appId)
    
//     if (appIndex >= 0) {
//       const usageIndex = apps[appIndex].usageHistory.findIndex(usage => usage.date === date)

//       if (usageIndex >= 0) {
//         apps[appIndex].usageHistory[usageIndex].duration += duration

//       } else {
//         // 如果不存在，添加到历史记录
//         apps[appIndex].usageHistory.push({ date, duration })
//         // 保持最近14天
//         if (apps[appIndex].usageHistory.length > 14) {
//           apps[appIndex].usageHistory = apps[appIndex].usageHistory.slice(-14)
//         }
//       }

//       await this.saveData(apps)
//     }
//   }

//   // 获取周活动数据
//   async getAppWeeklyActivity(appId: string): Promise<WeeklyData[]> {
//     const app = await this.getApp(appId)
//     if (!app) return this.generateEmptyWeeklyActivity()

//     // 计算最近7天的活动数据
//     const weeklyData = this.generateEmptyWeeklyActivity()
//     const oneWeekAgo = new Date()
//     oneWeekAgo.setDate(oneWeekAgo.getDate() - 7)

//     app.sessions.forEach(session => {
//       const sessionDate = new Date(session.startTime)
//       if (sessionDate >= oneWeekAgo) {
//         const dayOfWeek = sessionDate.getDay() // 0-6 (Sunday-Saturday)
//         weeklyData[dayOfWeek].value += session.duration
//       }
//     })

//     return weeklyData
//   }

//   // 更新应用统计
//   async updateAppStatistics(appId: string, duration: number): Promise<void> {
//     const apps = await this.readData()
//     const appIndex = apps.findIndex(app => app.id === appId)
    
//     if (appIndex >= 0) {
//       apps[appIndex].totalRuntime += duration
//       apps[appIndex].launchCount += 1
//       apps[appIndex].lastUsed = new Date().toISOString()
//       await this.saveData(apps)
//     }
//   }

//   // 关闭数据库（JSON不需要关闭操作）
//   close(): void {
//     // JSON存储不需要关闭操作
//   }
// }
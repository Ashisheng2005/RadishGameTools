import { DatabaseService } from '../database/databasesql'
import { Session, AppData, WeeklyData } from '../../shared/types'
import { v4 as uuidv4 } from 'uuid'
import { Logger } from './loggerService'

// DataService 负责封装数据库操作 (DatabaseService) 以提供业务逻辑，专为 IPC 服务或业务逻辑层设计。

export class DataService {
  private db: DatabaseService

  constructor() {
    this.db = DatabaseService.getInstance()
  }

  // ======================= CRUD 基础操作 ==============================

  // 获取所有应用数据
  async getAllApps(): Promise<AppData[]> {
    return await this.db.getAllApps()
  }

  // 获取单个应用数据
  async getApp(id: string): Promise<AppData | null> {
    // 在 Service 层将统计数据和会话数据组装起来
    const appInfo = await this.db.getApp(id)
    if (!appInfo) return null

    const sessions = await this.db.getAppSessions(id, 50) // 获取最近 50 个会话
    const usageHistory = await this.db.getAppUsageHistory(id, 30) // 获取最近 30 天的使用历史
    const weeklyActivity = await this.db.getAppWeeklyActivity(id) // 获取周活动

    return {
      ...appInfo,
      sessions: sessions,
      usageHistory: usageHistory,
      weeklyActivity: weeklyActivity
    } as AppData
  }

  async saveApp(appData: AppData): Promise<void> {
    try {
      await this.db.saveApp(appData)
      Logger.info('dataSqlService-saveApp', `save app successful: ${appData.name}`)
    } catch (error) {
      Logger.error('dataSqlService-saveApp', 'save app fail:', error)
      throw error
    }
  }

  async deleteApp(id: string): Promise<boolean> {
    try {
      return await this.db.deleteApp(id)
    } catch (error) {
      Logger.error('dataSqlService-deleteApp', 'detel app fail:', error)
      return false
    }
  }

  // ====================== 会话记录逻辑 =================================

  // 记录应用启动
  async recordAppStart(appId: string, appName: string): Promise<string> {
    // 不在使用时间崔， 改用uuid   `session-${Date.now()}`
    const sessionId = uuidv4()

    const newSession: Session = {
      id: sessionId,
      startTime: new Date().toISOString(),
      endTime: '',
      duration: 0,
      status: 'running'
    }

    // 确保应用存在
    const existingApp = await this.db.getApp(appId)
    if (!existingApp) {
      const newApp: AppData = {
        id: appId,
        name: appName,
        description: '',
        icon_default: true,
        icon: 'default',
        color: '#666666',
        executablePath: '',
        totalRuntime: 0,
        launchCount: 0,
        lastUsed: new Date().toISOString(),
        category: 'Other',
        sessions: [], // SQLite版本中这些字段在保存时会被忽略
        usageHistory: [],
        weeklyActivity: []
      }
      await this.db.saveApp(newApp)
    }

    // 插入会话记录 (sql 中的 DatabaseService 需要完整的 Session 对象)
    await this.db.addSession(newSession, appId)
    // Logger.info('dataSqlService-recordAppStart', `append session id is :${sessionId}`)
    // console.log(`append session id is :${sessionId}`)

    return sessionId
  }

  // 记录应用结束
  async recordAppEnd(
    sessionId: string,
    appId: string,
    durationFromRunner?: number
  ): Promise<boolean> {
    const endTime = new Date().toISOString()

    // 获取会话详情
    const session = await this.db.getSessionById(sessionId)
    if (!session || session.status !== 'running') {
      Logger.warn(
        'dataSqlService-recordAppEnd',
        `session ${sessionId} not find or ended, countinue processing`
      )

      try {
        const dbSize = this.db.getDatabaseSize ? this.db.getDatabaseSize() : -1
        Logger.warn('dataSqlService-recordAppEnd', `DB size: ${dbSize}`)

        // 列出该 app 最近的 10 条会话以辅助诊断
        const recent = await this.db.getAppSessions(appId, 10)
        Logger.warn(
          'dataSqlService-recordAppEnd',
          `Recent sessions for app ${appId}: ${recent.map((s) => s.id).join(', ')}`
        )
      } catch (err) {
        Logger.error('dataSqlService-recordAppEnd', 'Failed to fetch diagnostic session list', err)
      }

      // 如果提供了 runner 计算的 duration，我们可以尝试创建一个 completed 的会话记录
      if (durationFromRunner !== undefined) {
        try {
          const computedStart = new Date(Date.now() - durationFromRunner * 1000).toISOString()

          // 尝试先更新（以防存在），若无变化则插入
          const updated = await this.db.updateSessionStatus(sessionId, 'completed', endTime)
          if (!updated) {
            await this.db.addSession(
              {
                id: sessionId,
                startTime: computedStart,
                endTime,
                duration: durationFromRunner,
                status: 'completed'
              },
              appId
            )

            Logger.info(
              'dataSqlService-recordAppEnd',
              `Inserted fallback completed session ${sessionId} for app ${appId}`
            )
            // console.log(`Inserted fallback completed session ${sessionId} for app ${appId}`)
          } else {
            Logger.info(
              'dataSqlService-recordAppEnd',
              `Updated existing session ${sessionId} to completed`
            )
          }

          // 更新统计
          await this.db.updateAppStatistics(appId, durationFromRunner)
          return true
        } catch (err) {
          Logger.error(
            'dataSqlService-recordAppEnd',
            'Failed to create/update fallback session record',
            err
          )
          // console.error('Failed to create/update fallback session record', err)
          return false
        }
      }

      return false
    }

    if (session.startTime) {
      const startTime = new Date(session.startTime)
      const endTimeDate = new Date(endTime)

      // 计算时长 单位秒
      const duration = Math.floor((endTimeDate.getTime() - startTime.getTime()) / 1000)
      Logger.info(
        'dataSqlService-recordAppEnd',
        `recordAppEnd session.startTime: ${session.startTime} endTimeDate: ${endTimeDate}`
      )
      // console.log(`recordAppEnd session.startTime: ${session.startTime} endTimeDate: ${endTimeDate}`)

      // 更新会话状态 用专门的 API，更高效
      const success = await this.db.updateSessionStatus(sessionId, 'completed', endTime)

      if (success) {
        // 更新统计信息 (DatabaseService.updateAppStatistics 更新 UsageHistory)
        await this.db.updateAppStatistics(appId, duration)
      } else {
        // 若更新失败，插入一条完成记录以保证数据完整性
        await this.db.addSession(
          {
            id: sessionId,
            startTime: session.startTime,
            endTime,
            duration,
            status: 'completed'
          },
          appId
        )
      }
      return true
    }

    return false
  }

  // ==================== 统计和分析 ===========================

  // 获取应用使用统计, 和 JSON处理的方式不同，直接从App表中获取，不再依赖 AppData.sessions
  async getAppUsageStats(appId: string): Promise<{
    totalRuntime: number
    dailyAverage: number
    sessionCount: number
    launchCount: number
  } | null> {
    const app = await this.db.getApp(appId)
    if (!app) return null

    // 由于 AppData.sessions 不再是完整的列表，需要单独获取会话总数
    // 这是一个优化点，DatabaseService 应该提供 getSessionCountByAppId 方法
    // 暂时使用 metrics 中的 sessionCount 替代或假设 getAppSessions(id, Infinity)
    // 最好使用 DatabaseManager 直接查询 COUNT(*)

    const totalRuntime = app.totalRuntime
    const launchCount = app.launchCount

    // 假设总会话数需要查询（这里需要 DatabaseService 增加一个方法，
    // 暂时用 0 替代或使用复杂的查询，为了兼容性，目前直接返回 App 中的 launchCount 作为近似值）
    const sessionCount = app.launchCount

    // 7天平均计算，这里仍然在 Service 层进行，但更精确的做法是让 StatsRepository 提供
    const usageHistory = await this.db.getAppUsageHistory(appId, 7)
    const totalDurationLast7Days = usageHistory.reduce((sum, data) => sum + data.duration, 0)
    const dailyAverage = totalDurationLast7Days / 7

    return {
      totalRuntime,
      dailyAverage: Number(dailyAverage.toFixed(0)), // 四舍五入到整数秒
      sessionCount,
      launchCount: launchCount
    }
  }

  // 更新应用统计数据
  async updateAppStats(appId: string, duration: number): Promise<void> {
    try {
      Logger.info(
        'dataSqlService-updateAppStats',
        `update app total info: ${appId}, running duration: ${duration} s`
      )
      // console.log(`update app total info: ${appId}, running duration: ${duration} s`)

      // 替换原方法为集成操作
      await this.db.updateAppStatistics(appId, duration)
      Logger.info('dataSqlService-updateAppStats', `update app total info successful: ${appId}`)
      // console.log(`update app total info successful: ${appId}`)
    } catch (error) {
      Logger.error('dataSqlService-updateAppStats', 'update app total info fail:', error)
      // console.error('update app total info fail:', error)
      throw error
    }
  }

  // 获取应用健康状态
  async getAppHealthStatus(appId: string): Promise<{
    isRunning: boolean
    lastSession: Session | null
    avgSessionDuration: number
    crashRate: number
  }> {
    // 从 App 表获取基本信息
    const appInfo = await this.db.getApp(appId)
    if (!appInfo) {
      return { isRunning: false, lastSession: null, avgSessionDuration: 0, crashRate: 0 }
    }

    // 单独获取所有会话 (或者只获取最近的N个)
    const sessions = await this.db.getAppSessions(appId, 1000) // 获取足够的会话进行统计

    if (sessions.length === 0) {
      return { isRunning: false, lastSession: null, avgSessionDuration: 0, crashRate: 0 }
    }

    // 统计计算 (与原逻辑类似，但在 Service 层进行内存计算)
    const completedSessions = sessions.filter((s) => s.status === 'completed')
    const totalDuration = completedSessions.reduce((sum, s) => sum + s.duration, 0)
    const avgSessionDuration =
      completedSessions.length > 0 ? totalDuration / completedSessions.length : 0

    const crashedSessionsCount = sessions.filter((s) => s.status === 'crashed').length
    const crashRate = sessions.length > 0 ? (crashedSessionsCount / sessions.length) * 100 : 0

    const isRunning = sessions.some((s) => s.status === 'running')
    const lastSession = sessions.length > 0 ? sessions[0] : null // getAppSessions 默认按时间倒序

    return {
      isRunning,
      lastSession,
      avgSessionDuration: Number(avgSessionDuration.toFixed(0)),
      crashRate: Number(crashRate.toFixed(2))
    }
  }

  // 获取使用趋势， 这里直接调用 DatabaseService 的方法
  async getUsageTrend(
    appId: string,
    days: number = 7
  ): Promise<{
    dates: string[]
    durations: number[]
  }> {
    // 直接从 DatabaseService 获取历史数据
    const history = await this.db.getAppUsageHistory(appId, days)

    // 补齐缺失日期 (如果数据库中没有记录)
    const result: { dates: string[]; durations: number[] } = { dates: [], durations: [] }
    const historyMap = new Map<string, number>()
    history.forEach((u) => historyMap.set(u.date, u.duration))

    for (let i = days - 1; i >= 0; i--) {
      const date = new Date()
      date.setDate(date.getDate() - i)

      // DatabaseService 中 recordDailyUsage 使用 YYYY-MM-DD 格式
      const dateStr = date.toISOString().split('T')[0]

      result.dates.push(dateStr)
      result.durations.push(historyMap.get(dateStr) || 0)
    }

    return result
  }

  // 获取每周活动数据
  async getWeeklyActivity(appId: string): Promise<WeeklyData[]> {
    // 直接调用 DatabaseService 的高效 SQL 聚合方法
    return await this.db.getAppWeeklyActivity(appId)
  }

  // 批量处理多个应用的统计数据
  async batchUpdateAppStats(updates: Array<{ appId: string; duration: number }>): Promise<void> {
    try {
      // 在 Service 层使用事务（如果需要），但更简单的做法是顺序调用集成方法
      for (const update of updates) {
        // updateAppStatistics 现在是一个集成操作 (更新 App 表和 usage_history 表)
        await this.db.updateAppStatistics(update.appId, update.duration)
      }

      Logger.info('dataSqlService-batchUpdateAppStats', `batch update ${updates.length} apps info`)
      // console.log(`批量更新了 ${updates.length} 个应用的统计`)
    } catch (error) {
      Logger.error('dataSqlService-batchUpdateAppStats', 'batch update fail:', error)
      // console.error('批量更新应用统计失败:', error)
      throw error
    }
  }

  // 搜索应用
  async searchApps(query: string): Promise<AppData[]> {
    // 使用 DatabaseService 中基于 SQL 的高效搜索方法 (AppRepository.searchApps)
    return await this.db.searchApps(query)
  }

  // 获取最常使用应用
  async getMostUsedApps(limit: number = 5): Promise<AppData[]> {
    // 使用 DatabaseService 中基于 SQL 的高效统计方法
    const topAppsData = await this.db.getTopAppsByUsage(365, limit) // 查询一年内的使用情况

    // 提取并返回完整的 AppData
    const results: AppData[] = []
    for (const data of topAppsData) {
      const app = await this.db.getApp(data.appId)
      if (app) {
        results.push(app)
      }
    }
    return results
  }

  // 获取最近使用的应用
  async getRecentlyUsedApps(limit: number = 5): Promise<AppData[]> {
    // 直接调用 db.getAllApps() 并进行排序（如果 AppRepository 没有提供排序接口）
    const apps = await this.db.getAllApps(limit) // 假设 getAllApps 默认按 lastUsed DESC 排序
    return apps
  }

  // 获取应用类别列表
  async getCategories(): Promise<string[]> {
    // 可以在 DatabaseService 中增加一个 getCategories 方法，使用 SQL DISTINCT
    const apps = await this.db.getAllApps()
    const categories = new Set<string>()

    apps.forEach((app) => {
      if (app.category) {
        categories.add(app.category)
      }
    })

    return Array.from(categories)
  }

  // 根据类别筛选应用
  async getAppsByCategory(category: string): Promise<AppData[]> {
    // 可以在 DatabaseService 中增加一个 getAppsByCategory 方法，使用 SQL WHERE
    const apps = await this.db.getAllApps()
    return apps.filter((app) => app.category === category)
  }
}

// 单例实例
export const dataService = new DataService()

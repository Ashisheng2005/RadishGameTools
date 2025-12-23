export interface Session {
  id: string
  startTime: string
  endTime: string
  duration: number // in seconds
  status: 'completed' | 'crashed' | 'running'
}

export interface UsageData {
  date: string
  duration: number // in seconds
}

export interface WeeklyData {
  day: number // 0-6 for Mon-Sun
  value: number // in seconds
}

export interface DatabaseMetrics {
  queryCount: number
  databaseSize: number
  lastBackup: Date | null
  errorCount: number
  appCount: number
  sessionCount: number
}

export interface PaginationOptions {
  limit?: number
  offset?: number
  sortBy?: string
  sortOrder?: 'ASC' | 'DESC'
}

export interface SessionFilters {
  appId?: string
  status?: Session['status']
  startDate?: string
  endDate?: string
  limit?: number
  offset?: number
}

export interface LogEntry {
  id?: number
  level: 'info' | 'warn' | 'error' | 'debug'
  operation: string
  table_name?: string
  entity_id?: string
  message: string
  metadata?: LogMetadata
  created_at?: string
}

// 添加 LogMetadata 类型定义
export type LogMetadata = Record<string, unknown> | null

// 添加 ErrorMetadata 类型定义
export interface ErrorMetadata {
  name?: string
  stack?: string
  error?: string
  [key: string]: unknown
}

// 添加 IpcRendererListener 类型定义
export type IpcRendererListener = (event: unknown, ...args: unknown[]) => void

export interface AppConfig {
  // 界面相关
  theme: 'light' | 'dark' | 'system' // 主题模式
  immersiveMode: boolean // 沉浸模式

  // 行为控制
  autoLaunchAtStartup: boolean // 开机自启动
  minimizeToSystemTray: boolean // 最小化到托盘
  showOperationHints: boolean // 应用操作提示
  enableBackupLauncher: boolean // 启动备用启动器

  // 数据管理
  enableUsageAnalytics: boolean // 数据统计
  storageLocation: string // 数据存储位置
  // customStoragePath: string | null      // 自定义存储路径
  showTimer: boolean // 显示计时器
  submitErrorData: boolean // 提交错误数据
  categories?: defaultCateGories[] // 软件分类

  // 系统功能
  enableLogging: boolean // 日志记录
  logLevel: 'info' | 'warn' | 'error' | 'debug' // 日志级别
  autoCleanupEnabled: boolean // 自动清理
  autoOptimizeWindow?: boolean // 自动优化
}

export interface AppStatus {
  status: 'completed' | 'crashed' | 'running'
  duration?: number // in seconds
  isRunning: boolean
}

export interface ActiveAppInfo {
  // sessionId: string;
  startTime: number
  // lastStatusCheck: number;
}

export interface AppData {
  id: string
  name: string
  description: string
  icon_default: boolean
  icon: string
  color: string
  executablePath: string
  totalRuntime: number // in seconds
  launchCount: number
  lastUsed: string
  sessions: Session[]
  usageHistory: UsageData[]
  weeklyActivity: WeeklyData[]
  category?: string
}

export interface defaultCateGories {
  value: string
  label: string
  color: string
}

export interface NewAppData {
  name: string
  executablePath: string
  category: string
  customCategory?: string
  description: string
  icon_default?: boolean
  icon: string
  color: string
}

// 图标映射
export const defaultIconMap: { [key: string]: string } = {
  development: 'code',
  browser: 'browser',
  productivity: 'document',
  media: 'music',
  communication: 'chat',
  design: 'image',
  utility: 'folder',
  game: 'game',
  other: 'app'
}

export const mockApps: AppData[] = []

export interface Session {
  id: string
  startTime: string
  endTime: string
  duration: number // in seconds
  status: "completed" | "crashed" | "running"
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
  metadata?: any
  created_at?: string
}

export interface AppConfig {
  // 界面相关
  theme: 'light' | 'dark' | 'system'    // 主题模式
  immersiveMode: boolean                // 沉浸模式
  
  // 行为控制
  autoLaunchAtStartup: boolean          // 开机自启动
  minimizeToSystemTray: boolean         // 最小化到托盘
  showOperationHints: boolean           // 应用操作提示
  enableBackupLauncher: boolean         // 启动备用启动器
  
  // 数据管理
  enableUsageAnalytics: boolean         // 数据统计
  storageLocation: string               // 数据存储位置
  // customStoragePath: string | null      // 自定义存储路径
  showTimer: boolean                   // 显示计时器
  submitErrorData: boolean              // 提交错误数据
  categories?: defaultCateGories[]        // 软件分类
  
  // 系统功能
  enableLogging: boolean                          // 日志记录
  logLevel: 'info' | 'warn' | 'error' | 'debug'   // 日志级别
  autoCleanupEnabled: boolean                     // 自动清理
  autoOptimizeWindow?: boolean                   // 自动优化

  // wo不想学英语 QAQ， 这也太操蛋了。。。

  // 家庭中的一个公示： 不要再孩子面前吵架
  // there is a consensus in the family about no fighting in front of kids

  // 你工作努力，值得加薪
  // you deserve a pay raise for your hard work

  // 如果在开始中作弊，你会被贴上不诚实的标签
  // if you cheat in the exam, you'll be labelled as dishonest

  /// 同学们都取笑他的西班牙口语
  // the classmates tease him about his Spanish accent

  // 她结婚的消息很快就会传遍全城
  // it won't take long for the news of her marriage to get around th town

  // 任何对其他国家经济科技发展进行遏制的行为，都严重削弱国际社会应对共同挑战的努力
  // acts of holding back economic and technological advances of other countries will gravely undercutinternational efforts to tackle common challenges

  // 我有好多工作要做，但是我没办法静下心来
  // i've got a lot of work to do, but i can't seem to get down to it

  // 大多数国家面对牺牲经济还是牺牲人民的时候都会选择前者，中国是个例外
  // most countries, faced with the dilemma of economy of economy of people, would opt for the former at the expene of the latter
  // china was the exception

  // 我要花三年时间才能拿到学位证，我有决心坚持到底
  // the degree would take me three years to completer, but i was determined to see it through

  // 北京冬奥会之后，很多年轻人都以滑雪运动员为偶像
  // after bedjing 2022 Olympic Winter Games, lost of young men and women modelled themselves on skiers
}

export interface AppStatus {
  status: "completed" | "crashed" | "running"
  duration?: number // in seconds
  isRunning: boolean
}

export interface ActiveAppInfo {
  // sessionId: string;
  startTime: number;
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
  development: "code",
  browser: "browser",
  productivity: "document",
  media: "music",
  communication: "chat",
  design: "image",
  utility: "folder",
  game: "game",
  other: "app",
}

export const mockApps: AppData[] = []


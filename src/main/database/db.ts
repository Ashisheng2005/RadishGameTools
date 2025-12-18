import Database from 'better-sqlite3'
import path from 'path'
import fs from 'fs'
import { Logger } from '../services/loggerService'
import { ConfigManager } from '../services/configManager'

// 根据配置文件中的位置查找数据库文件
const config = ConfigManager.getInstance().getConfig()

// 数据库文件路径
const DB_PATH = path.join(config.storageLocation,'save', 'app_usage_data.db')

// 确保目录存在
fs.mkdirSync(path.dirname(DB_PATH), { recursive: true })
console.log(path.dirname(process.execPath))
Logger.info('main.db', `database get root path: ${path.dirname(process.execPath)}`)

export class DatabaseManager {
    private static instance: DatabaseManager
    private db: Database

    private constructor() {
        // 创建或打开数据库文件
        this.db = new Database(DB_PATH)
        this.db.pragma('journal_mode = WAL') // 启用 WAL 模式以获得更好的并发性能
        this.db.pragma('foreign_keys = ON') // 启用外键约束

        this.initializeTables()
    }

    public static getInstance(): DatabaseManager {
        if (!DatabaseManager.instance) {
            DatabaseManager.instance = new DatabaseManager()
        }
        return DatabaseManager.instance
    }

    public getDatabase(): Database {
        return this.db
    }

    // 初始化数据库表结构
    private initializeTables(): void {
        this.db.transaction(() => {
            // 应用表 (apps)
            // 存储App的基本信息和累计统计数据
            this.db.exec(`
                CREATE TABLE IF NOT EXISTS apps (
                    id TEXT PRIMARY KEY,
                    name TEXT NOT NULL,
                    description TEXT,
                    icon_default INTEGER DEFAULT 1, -- 为1表示使用默认类型的图标,icon为默认的类型 为0表示存在图标路径, icon存储为文件路径
                    icon TEXT,
                    color TEXT,
                    executablePath TEXT,
                    category TEXT,
                    totalRuntime INTEGER DEFAULT 0, -- 总运行时长 (秒)
                    launchCount INTEGER DEFAULT 0, -- 启动次数
                    lastUsed TEXT -- ISO 8601日期字符串
                );
            `)

            // 会话表 (sessions)
            // 存储每次应用的使用会话记录
            this.db.exec(`
                CREATE TABLE IF NOT EXISTS sessions (
                    id TEXT PRIMARY KEY,
                    appId TEXT NOT NULL,
                    startTime TEXT NOT NULL,
                    endTime TEXT,
                    duration INTEGER NOT NULL, -- 时长 (秒)
                    status TEXT NOT NULL, -- completed, crashed, running
                    FOREIGN KEY (appId) REFERENCES apps(id) ON DELETE CASCADE
                );
            `)
            this.db.exec(`CREATE INDEX IF NOT EXISTS idx_sessions_appId ON sessions (appId);`)
            this.db.exec(`CREATE INDEX IF NOT EXISTS idx_sessions_startTime ON sessions (startTime);`)

            // 日常使用历史表 (usage_history)
            // 存储应用每日使用时长
            this.db.exec(`
                CREATE TABLE IF NOT EXISTS usage_history (
                    appId TEXT NOT NULL,
                    date TEXT NOT NULL, -- YYYY-MM-DD
                    duration INTEGER DEFAULT 0, -- 每日总时长 (秒)
                    PRIMARY KEY (appId, date),
                    FOREIGN KEY (appId) REFERENCES apps(id) ON DELETE CASCADE
                );
            `)

        })();
        
        console.log('Database tables initialized successfully.')
    }

    // 获取数据库文件大小（以字节为单位）
    public getDatabaseSize(): number {
        try {
            const stats = fs.statSync(DB_PATH)
            return stats.size
        } catch (error) {
            console.error('Error getting database size:', error)
            return 0
        }
    }

    // 关闭数据库连接
    public close(): void {
        if (this.db) {
            this.db.close()
        }
    }

    // 备份数据库
    public backup(backupPath?: string): void {
        const targetPath = backupPath || path.join(process.cwd(), `backup_${Date.now()}.db`);
        this.db.backup(targetPath, { progress: (percentage) => console.log(`Backup progress: ${percentage * 100}%`) })
            .then(() => {
                console.log(`Database backed up successfully to ${targetPath}`)
            })
            .catch((err) => {
                console.error('Backup failed:', err)
            });
    }

    // 对数据库文件进行 VACUUM 操作以回收空间
    public vacuum(): void {
        this.db.exec('VACUUM')
    }
}
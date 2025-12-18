import * as fs from 'fs'
import * as path from 'path'
import { LogEntry } from '../../shared/types' 
import { ConfigManager } from './configManager'


// --- 配置常量 ---
const LOG_FILE_NAME = 'application.log';
const DEFAULT_LOG_DIR = path.join(process.cwd(), 'logs')  // 默认在当前工作目录下的 logs 文件夹
const MAX_LOG_SIZE_MB = 10; // 单个日志文件最大 10MB，超过则进行基础轮替

const CONFIG = ConfigManager.getInstance().getConfig()

// 定义日志级别简写
type LogLevel = LogEntry['level'];


// 封装文本文件日志记录器。使用单例模式并提供静态方法供全局简洁调用。
export class Logger {
    private static instance: Logger;
    private logFilePath!: string;
    private writeStream: fs.WriteStream | null = null;
    private isInitializing: boolean = false;

    // 私有构造函数，确保单例。
    private constructor() {
        // 构造函数中不进行初始化，改用静态 init 方法
    }

    // 获取日志文件路径。
    private getLogFilePath(): string {
        return this.logFilePath;
    }

    /**
     * 初始化日志记录器并打开写入流。
     * 必须在应用启动时调用一次。
     * @param logDir 日志文件存放目录
     */
    public static init(logDir: string = DEFAULT_LOG_DIR): void {
        if (Logger.instance && !Logger.instance.isInitializing) {
            return; // 已经初始化过了
        }
        
        if (!Logger.instance) {
            Logger.instance = new Logger()
        }

        const instance = Logger.instance
        instance.isInitializing = true
        instance.logFilePath = path.join(logDir, LOG_FILE_NAME)

        try {
            // 确保日志目录存在
            fs.mkdirSync(logDir, { recursive: true })
            
            // 检查文件大小并进行基础轮替
            try {
                const stats = fs.statSync(instance.logFilePath)
                if (stats.size > MAX_LOG_SIZE_MB * 1024 * 1024) {
                    // 超过最大限制，将当前文件重命名为备份
                    const backupPath = `${instance.logFilePath}.${Date.now()}.bak`
                    fs.renameSync(instance.logFilePath, backupPath)
                    console.log(`Log file rotated to: ${backupPath}`)
                }
            } catch (e: any) {
                // 文件不存在是正常情况，无需处理
                if (e.code !== 'ENOENT') {
                    console.error('Error during log file rotation check:', e)
                }
            }

            // 创建并打开写入流，使用 'a' 模式追加写入
            instance.writeStream = fs.createWriteStream(instance.logFilePath, { flags: 'a' })
            console.log(`Logger initialized. Log file path: ${instance.logFilePath}`)

        } catch (error) {
            console.error('Logger initialization failed:', error)
            instance.writeStream = null;
        } finally {
            instance.isInitializing = false;
        }
    }

    /**
     * 格式化日志条目为单行文本。
     * @private
     */
    private _formatLog(
        level: LogLevel,
        operation: string,
        message: string,
        metadata: any,
        tableName: string | null,
        entityId: string | null
    ): string {
        // UTC的问题要注意, 更具时区调整时间
        let datetime = new Date()

        // 获取当前时区与UTC的时间差 （以毫秒为单位）
        let timezoneOffset = datetime.getTimezoneOffset() * 60000
        let localDatetime = new Date(datetime.getTime() - timezoneOffset)

        // 通过使用原始时间创建一个新时间减去时区偏移即可实现
        const timestamp = localDatetime.toISOString()
        let logLine = `[${timestamp}] [${level.toUpperCase().padStart(5, ' ')}] - ${operation}: ${message}`

        if (tableName) {
            logLine += ` (Table: ${tableName}`
            if (entityId) {
                logLine += `, ID: ${entityId}`
            }
            logLine += `)`
        }
        
        if (metadata) {
            try {
                const metaStr = JSON.stringify(metadata)
                logLine += ` | Metadata: ${metaStr}`
            } catch (e) {
                logLine += ` | Metadata: [Serialization Error]`
            }
        }

        return logLine + '\n'
    }

    /**
     * 内部核心日志写入方法。
     * @private
     */
    private _writeLog(
        level: LogLevel,
        operation: string,
        message: string,
        metadata: any = null,
        tableName: string | null = null,
        entityId: string | null = null
    ): void {
        const logLine = this._formatLog(level, operation, message, metadata, tableName, entityId)
        
        // 始终输出到控制台（或仅在开发/调试模式下）
        if (level === 'error' || level === 'warn') {
            console.error(logLine.trim());
        } else if (level === 'debug') {
            console.debug(logLine.trim());
        } else {
            console.log(logLine.trim());
        }

        if (this.writeStream && CONFIG.enableLogging) {
            // 使用 writeStream 写入，这是异步操作，避免阻塞
            this.writeStream.write(logLine, (err) => {
                if (err) {
                    console.error('Failed to write log to file:', err)
                }
            });
        }
    }

    // ---  全局静态日志接口  ---

    // 写入 INFO 级别日志
    public static info(
        operation: string, 
        message: string, 
        metadata: any = null, 
        tableName: string | null = null, 
        entityId: string | null = null
    ): void {
        Logger.instance?._writeLog('info', operation, message, metadata, tableName, entityId)
    }
    
    // 写入 WARN 级别日志
    public static warn(
        operation: string, 
        message: string, 
        metadata: any = null, 
        tableName: string | null = null, 
        entityId: string | null = null
    ): void {
        Logger.instance?._writeLog('warn', operation, message, metadata, tableName, entityId)
    }

    // 写入 ERROR 级别日志
    public static error(
        operation: string, 
        message: string, 
        error: Error | any = null, // 接受一个 Error 对象或任何类型
        tableName: string | null = null, 
        entityId: string | null = null
    ): void {
        // 尝试提取 Error 对象的堆栈信息作为 metadata
        const metadata = error instanceof Error ? { name: error.name, stack: error.stack, error: error.message } : error
        Logger.instance?._writeLog('error', operation, message, metadata, tableName, entityId)
    }

    // 写入 DEBUG 级别日志
    public static debug(
        operation: string, 
        message: string, 
        metadata: any = null, 
        tableName: string | null = null, 
        entityId: string | null = null
    ): void {
        Logger.instance?._writeLog('debug', operation, message, metadata, tableName, entityId)
    }

    // 优雅地关闭日志写入流（可选）
    public static close(): void {
        if (Logger.instance && Logger.instance.writeStream) {
            Logger.instance.writeStream.end()
            Logger.instance.writeStream = null
            console.log('Logger stream closed.')
        }
    }
    
    // ---  文件日志专属管理方法  ---

    // 获取当前日志文件的路径
    public static getLogFilePath(): string {
        if (!Logger.instance) {
            return `Logger not initialized. Default Path: ${path.join(DEFAULT_LOG_DIR, LOG_FILE_NAME)}`
        }
        return Logger.instance.getLogFilePath()
    }
}
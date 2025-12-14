// 导入外部类型 (假设路径正确)
import { Session, AppData, UsageData, WeeklyData, DatabaseMetrics } from '../../shared/types';

// 导入内部模块 
import { DatabaseManager } from './db';
// import { DatabaseLogger } from './logger';
import { AppRepository } from './repositories/AppRepository';
import { SessionRepository } from './repositories/SessionRepository';
import { StatsRepository } from './repositories/StatsRepository';

/**
 * DatabaseService 是整个应用程序数据库操作的单例入口。
 * 它封装了 Repository 层的逻辑，提供高层接口并管理数据库度量。
 */
export class DatabaseService {
    private static instance: DatabaseService;
    
    private dbManager: DatabaseManager;
    // private logger: DatabaseLogger;
    private appRepository: AppRepository;
    private sessionRepository: SessionRepository;
    private statsRepository: StatsRepository;
    
    private metrics: DatabaseMetrics = {
        queryCount: 0,
        databaseSize: 0,
        lastBackup: null,
        errorCount: 0,
        appCount: 0,
        sessionCount: 0
    };

    private constructor() {
        this.dbManager = DatabaseManager.getInstance();
        // this.logger = DatabaseLogger.getInstance();
        
        // 实例化 Repositories
        this.appRepository = new AppRepository();
        this.sessionRepository = new SessionRepository();
        this.statsRepository = new StatsRepository();
        
        // 定期更新指标
        this.updateMetrics();
        // 每5分钟更新一次，使用箭头函数确保 this 上下文正确
        setInterval(() => this.updateMetrics(), 5 * 60 * 1000); 
    }

    public static getInstance(): DatabaseService {
        if (!DatabaseService.instance) {
            DatabaseService.instance = new DatabaseService();
        }
        return DatabaseService.instance;
    }

    // 获取本地日期字符串
    private getLocalDateString(date?: Date): string {
        const targetDate = date || new Date();
        const year = targetDate.getFullYear();
        const month = String(targetDate.getMonth() + 1).padStart(2, '0');
        const day = String(targetDate.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

    // ============================= 应用相关方法 =============================
    
    public async getAllApps(limit?: number, offset?: number): Promise<AppData[]> {
        this.metrics.queryCount++;
        return this.appRepository.getAllApps(limit, offset);
    }

    public async getApp(id: string): Promise<AppData | null> {
        this.metrics.queryCount++;
        return this.appRepository.getAppById(id);
    }

    public async saveApp(appData: AppData): Promise<void> {
        this.metrics.queryCount++;
        await this.appRepository.saveApp(appData);
    }

    public async deleteApp(id: string): Promise<boolean> {
        this.metrics.queryCount++;
        // 依赖 AppRepository 中 SQLite 外键 ON DELETE CASCADE 自动清理会话和统计
        return this.appRepository.deleteApp(id);
    }

    public async searchApps(searchTerm: string, limit: number = 20): Promise<AppData[]> {
        this.metrics.queryCount++;
        return this.appRepository.searchApps(searchTerm, limit);
    }

    public async updateAppStatistics(appId: string, duration: number): Promise<void> {
        this.metrics.queryCount++;
        // 此处应同时调用 AppRepository 和 StatsRepository
        await this.appRepository.updateAppStats(appId, duration);
        
        // 记录每日使用情况, 使用本地时间
        const today = this.getLocalDateString();
        await this.statsRepository.recordDailyUsage(appId, today, duration);
    }

    // ============================= 会话相关方法 =============================
    
    public async addSession(session: Session, appId: string): Promise<void> {
        this.metrics.queryCount++;
        await this.sessionRepository.addSession(session, appId);
    }

    public async addSessions(sessions: Session[], appId: string): Promise<void> {
        this.metrics.queryCount++;
        await this.sessionRepository.addSessions(sessions, appId);
    }

    public async getAppSessions(appId: string, limit: number = 50): Promise<Session[]> {
        this.metrics.queryCount++;
        return this.sessionRepository.getSessions({ appId, limit });
    }

    public async getRecentSessions(limit: number = 20): Promise<Session[]> {
        this.metrics.queryCount++;
        return this.sessionRepository.getRecentSessions(limit);
    }

    public async getSessionById(id: string): Promise<Session | null> {
        this.metrics.queryCount++;
        return this.sessionRepository.getSessionById(id);
    }

    public async updateSessionStatus(id: string, status: Session['status'], endTime?: string): Promise<boolean> {
        this.metrics.queryCount++;
        return this.sessionRepository.updateSessionStatus(id, status, endTime);
    }

    // ============================= 统计相关方法 =============================
    
    public async getAppUsageHistory(appId: string, days: number = 14): Promise<UsageData[]> {
        this.metrics.queryCount++;
        return this.statsRepository.getUsageHistory(appId, days);
    }
    
    // Note: updateUsageHistory 方法已合并到 updateAppStatistics 中，此处保留以兼容原接口
    public async updateUsageHistory(appId: string, date: string, duration: number): Promise<void> {
        this.metrics.queryCount++;
        await this.statsRepository.recordDailyUsage(appId, date, duration);
    }

    public async getAppWeeklyActivity(appId: string): Promise<WeeklyData[]> {
        this.metrics.queryCount++;
        return this.statsRepository.getAppWeeklyActivity(appId);
    }

    public async getTopAppsByUsage(days: number = 7, limit: number = 10): Promise<{ appId: string; name: string; totalDuration: number }[]> {
        this.metrics.queryCount++;
        return this.statsRepository.getTopAppsByUsage(days, limit);
    }

    public async getCategoryStats(): Promise<{ category: string; totalDuration: number; appCount: number }[]> {
        this.metrics.queryCount++;
        return this.statsRepository.getCategoryStats();
    }

    public async getHourlyActivity(appId?: string): Promise<{ hour: number; value: number }[]> {
        this.metrics.queryCount++;
        return this.statsRepository.getHourlyActivity(appId);
    }

    // ============================= 数据库管理方法 =============================
    
    public close(): void {
        this.dbManager.close();
        // this.logger.log({
        //     level: 'info',
        //     operation: 'CLOSE_DATABASE',
        //     message: 'Database service closed'
        // });
    }

    public backup(backupPath?: string): void {
        this.dbManager.backup(backupPath);
        this.metrics.lastBackup = new Date();
        
        // this.logger.log({
        //     level: 'info',
        //     operation: 'BACKUP_DATABASE',
        //     message: 'Database backup initiated',
        //     metadata: { backupPath }
        // });
    }

    public vacuum(): void {
        this.dbManager.vacuum();
        
        // this.logger.log({
        //     level: 'info',
        //     operation: 'VACUUM_DATABASE',
        //     message: 'Database vacuum completed'
        // });
    }

    public getDatabaseSize(): number {
        return this.dbManager.getDatabaseSize();
    }

    public async getMetrics(): Promise<DatabaseMetrics> {
        // 确保返回最新的数据
        await this.updateMetrics();
        return { ...this.metrics };
    }

    private async updateMetrics(): Promise<void> {
        try {
            const db = this.dbManager.getDatabase();
            
            this.metrics.databaseSize = this.dbManager.getDatabaseSize();
            // this.metrics.errorCount = this.logger.getErrorCount(24);
            
            // 获取应用数量
            const appCountStmt = db.prepare('SELECT COUNT(*) as count FROM apps');
            const appCountResult = appCountStmt.get() as { count: number };
            this.metrics.appCount = appCountResult.count;
            
            // 获取会话数量
            const sessionCountStmt = db.prepare('SELECT COUNT(*) as count FROM sessions');
            const sessionCountResult = sessionCountStmt.get() as { count: number };
            this.metrics.sessionCount = sessionCountResult.count;
            
        } catch (error) {
            console.error('Failed to update metrics:', error);
            //  this.logger.log({
            //     level: 'error',
            //     operation: 'UPDATE_METRICS',
            //     message: 'Failed to update database metrics',
            //     metadata: { error: (error as Error).message }
            // });
        }
    }

    // ============================= 日志相关方法 =============================
    
    // public getLogs(limit: number = 100, level?: 'info' | 'warn' | 'error' | 'debug') {
    //     return this.logger.getLogs(limit, level);
    // }

    // public clearOldLogs(daysToKeep: number = 30): void {
    //     this.logger.clearOldLogs(daysToKeep);
    // }

    // ============================= 清理方法 =============================
    
    // public async cleanupOldData(): Promise<{
    //     sessionsDeleted: number;
    //     statsDeleted: number;
    //     logsDeleted: number; // 日志清理通常不返回精确数量，此处保留为接口兼容
    // }> {
    //     try {
    //         // 删除 90 天前的旧会话
    //         const sessionsDeleted = await this.sessionRepository.deleteOldSessions(90);
    //         // 删除 365 天前的旧统计数据
    //         const statsDeleted = await this.statsRepository.cleanupOldStats(365);
            
    //         // 清理 30 天前的日志
    //         this.logger.clearOldLogs(30);
    //         const logsDeleted = 0; 
            
    //         this.logger.log({
    //             level: 'info',
    //             operation: 'CLEANUP_OLD_DATA',
    //             message: 'Old data cleanup completed',
    //             metadata: { sessionsDeleted, statsDeleted }
    //         });
            
    //         return { sessionsDeleted, statsDeleted, logsDeleted };
    //     } catch (error) {
    //         this.logger.log({
    //             level: 'error',
    //             operation: 'CLEANUP_OLD_DATA',
    //             message: 'Failed to cleanup old data',
    //             metadata: { error: (error as Error).message }
    //         });
    //         throw error;
    //     }
    // }

    // ============================= 测试连接 =============================
    
    public async testConnection(): Promise<boolean> {
        try {
            const stmt = this.dbManager.getDatabase().prepare('SELECT 1 as test');
            const result = stmt.get() as { test: number };
            return result.test === 1;
        } catch (error) {
            return false;
        }
    }
}
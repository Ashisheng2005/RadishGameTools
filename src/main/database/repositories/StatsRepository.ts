import Database from 'better-sqlite3';
import { DatabaseManager } from '../db';
import { UsageData, WeeklyData } from '../../../shared/types';
// import { DatabaseLogger } from '../logger';

export class StatsRepository {
    private db: Database;
    // private logger: DatabaseLogger;
    
    constructor() {
        this.db = DatabaseManager.getInstance().getDatabase();
        // this.logger = DatabaseLogger.getInstance();
    }

    // 获取本地日期字符串（YYYY-MM-DD）
    private getLocalDateString(date: Date): string {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

    // 记录或更新应用的每日使用时长
    public async recordDailyUsage(appId: string, date: string, duration: number): Promise<void> {
        // 使用 INSERT OR IGNORE 和 UPDATE 结合，或者使用 UPSERT 模式（如果SQLite版本支持），
        // better-sqlite3 倾向于使用以下模式，或直接使用 REPLACE INTO (但可能丢失其他字段)

        // 确保传入的date是正确的本地日期格式
        const localDate = this.getLocalDateString(new Date());
        const effectiveDate = date || localDate;
        
        // 尝试更新
        const updateStmt = this.db.prepare(`
            UPDATE usage_history
            SET duration = duration + ?
            WHERE appId = ? AND date = ?
        `);
        const updateResult = updateStmt.run(duration, appId, effectiveDate);

        if (updateResult.changes === 0) {
            // 如果没有记录被更新，则插入新记录
            const insertStmt = this.db.prepare(`
                INSERT INTO usage_history (appId, date, duration)
                VALUES (?, ?, ?)
            `);
            insertStmt.run(appId, effectiveDate, duration);
        }
        
        // this.logger.log({
        //     level: 'debug',
        //     operation: 'UPDATE_DAILY_USAGE',
        //     message: `Recorded ${duration}s for ${appId} on ${date}`,
        // }, 'usage_history', appId);
    }
    
    // 获取应用的每日使用历史
    public async getUsageHistory(appId: string, days: number = 14): Promise<UsageData[]> {
        const dateThreshold = new Date();
        dateThreshold.setDate(dateThreshold.getDate() - days);
        const isoDate = dateThreshold.toISOString().split('T')[0]; // YYYY-MM-DD

        const sql = `
            SELECT date, duration 
            FROM usage_history 
            WHERE appId = ? AND date >= ?
            ORDER BY date ASC
        `;
        
        const stmt = this.db.prepare(sql);
        const rows = stmt.all(appId, isoDate);
        
        return rows as UsageData[];
    }
    
    // 获取应用每周活跃数据（按周几聚合）
    public async getAppWeeklyActivity(appId: string): Promise<WeeklyData[]> {
        // SQLite 的 strftime('%w') 返回 0(Sun) - 6(Sat)
        const sql = `
            SELECT 
                CAST(strftime('%w', date) AS INTEGER) AS day,
                SUM(duration) AS value
            FROM usage_history
            WHERE appId = ?
            GROUP BY day
            ORDER BY day ASC
        `;
        
        const rows = this.db.prepare(sql).all(appId);
        return rows as WeeklyData[];
    }

    // 获取总使用时长排名前N的应用
    public async getTopAppsByUsage(
        days: number = 7, 
        limit: number = 10
    ): Promise<{ appId: string; name: string; totalDuration: number }[]> {
        const dateThreshold = new Date();
        dateThreshold.setDate(dateThreshold.getDate() - days);
        const isoDate = dateThreshold.toISOString().split('T')[0];
        
        const sql = `
            SELECT 
                T1.appId, 
                T2.name, 
                SUM(T1.duration) AS totalDuration
            FROM usage_history AS T1
            JOIN apps AS T2 ON T1.appId = T2.id
            WHERE T1.date >= ?
            GROUP BY T1.appId, T2.name
            ORDER BY totalDuration DESC
            LIMIT ?
        `;
        
        const rows = this.db.prepare(sql).all(isoDate, limit);
        return rows as { appId: string; name: string; totalDuration: number }[];
    }

    // 获取分类统计数据
    public async getCategoryStats(): Promise<{ category: string; totalDuration: number; appCount: number }[]> {
        const sql = `
            SELECT 
                T1.category,
                SUM(T1.totalRuntime) AS totalDuration,
                COUNT(T1.id) AS appCount
            FROM apps AS T1
            WHERE T1.category IS NOT NULL AND T1.category != ''
            GROUP BY T1.category
            ORDER BY totalDuration DESC
        `;
        
        const rows = this.db.prepare(sql).all();
        return rows as { category: string; totalDuration: number; appCount: number }[];
    }
    
    // 获取按小时的使用活跃度
    public async getHourlyActivity(appId?: string): Promise<{ hour: number; value: number }[]> {
        // SQLite 的 strftime('%H') 提取小时 (00-23)
        // 注意：这里需要从 sessions 表中计算
        let sql = `
            SELECT
                CAST(strftime('%H', startTime) AS INTEGER) AS hour,
                SUM(duration) AS value
            FROM sessions
            WHERE status IN ('completed', 'crashed')
        `;
        const params: string[] = [];
        
        if (appId) {
            sql += ` AND appId = ?`;
            params.push(appId);
        }
        
        sql += `
            GROUP BY hour
            ORDER BY hour ASC
        `;
        
        const rows = this.db.prepare(sql).all(...params);
        return rows as { hour: number; value: number }[];
    }
    
    // 清理指定天数前的旧统计数据
    public async cleanupOldStats(daysToKeep: number = 365): Promise<number> {
        const dateThreshold = new Date();
        dateThreshold.setDate(dateThreshold.getDate() - daysToKeep);
        const isoDate = dateThreshold.toISOString().split('T')[0];

        const sql = `DELETE FROM usage_history WHERE date < ?`;
        
        const result = this.db.prepare(sql).run(isoDate);
        
        // this.logger.log({
        //     level: 'info',
        //     operation: 'CLEANUP_STATS',
        //     message: `Deleted ${result.changes} usage history entries older than ${daysToKeep} days`,
        // }, 'usage_history');
        
        return result.changes;
    }
}
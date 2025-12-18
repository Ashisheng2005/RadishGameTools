import Database from 'better-sqlite3'
import { DatabaseManager } from '../db'
import { AppData } from '../../../shared/types'
import { Logger } from '../../services/loggerService'

export class AppRepository {
    private db: Database

    constructor() {
        this.db = DatabaseManager.getInstance().getDatabase()
    }
    
    // 辅助函数：将数据库行转换为 AppData 接口
    private mapToAppData(row: any): AppData {
        // 注意：AppData 接口中包含 sessions, usageHistory, weeklyActivity 等，
        // 这些信息通常需要从其他表 JOIN 或单独查询获取。
        // 为了简化，这里只映射 apps 表中的字段。
        // 在实际应用中，完整的 AppData需要在 Service 层进行组装。
        return {
            id: row.id,
            name: row.name,
            description: row.description || '',
            icon_default: Boolean(row.icon_default), 
            icon: row.icon || '',
            color: row.color || '',
            executablePath: row.executablePath,
            category: row.category,
            totalRuntime: row.totalRuntime,
            launchCount: row.launchCount,
            lastUsed: row.lastUsed,
            // 一下三项需要单独查询
            sessions: [], 
            usageHistory: [],
            weeklyActivity: [],
        } as AppData;
    }

    // 获取所有应用
    public async getAllApps(limit?: number, offset?: number): Promise<AppData[]> {
        let sql = `SELECT * FROM apps ORDER BY lastUsed DESC`
        const params: (number)[] = []

        if (limit !== undefined) {
            sql += ` LIMIT ?`
            params.push(limit)
            if (offset !== undefined) {
                sql += ` OFFSET ?`
                params.push(offset)
            }
        }

        const stmt = this.db.prepare(sql)
        const rows = stmt.all(...params)
        return rows.map(this.mapToAppData)
    }

    // 根据ID获取应用
    public async getAppById(id: string): Promise<AppData | null> {
        const stmt = this.db.prepare(`SELECT * FROM apps WHERE id = ?`)
        const row = stmt.get(id)
        
        if (row) {
            return this.mapToAppData(row)
        }
        return null
    }

    // 保存或更新应用数据
    public async saveApp(appData: AppData): Promise<void> {
        // 为避免使用 REPLACE 导致的删除（会触发外键 ON DELETE CASCADE），
        // 使用 UPSERT (INSERT ... ON CONFLICT DO UPDATE) 来更新已有记录而非替换。
        const stmt = this.db.prepare(`
            INSERT INTO apps (
                id, name, description, icon_default, icon, color, executablePath, category,
                totalRuntime, launchCount, lastUsed
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET
                name = excluded.name,
                description = excluded.description,
                icon_default = excluded.icon_default,
                icon = excluded.icon,
                color = excluded.color,
                executablePath = excluded.executablePath,
                category = excluded.category,
                totalRuntime = excluded.totalRuntime,
                launchCount = excluded.launchCount,
                lastUsed = excluded.lastUsed;
        `);

        const { id, name, description, icon_default, icon, color, executablePath, category, totalRuntime, launchCount, lastUsed } = appData;
        const _icon_default: number = icon_default ? 1 : 0;

        stmt.run(
            id, name, description, _icon_default, icon, color, executablePath, category,
            totalRuntime, launchCount, lastUsed
        )
        Logger.info('database-apprepository', `App ${name} saved/updated`)
    }

    // 删除应用
    public async deleteApp(id: string): Promise<boolean> {
        // 由于设置了外键 ON DELETE CASCADE，删除 apps 表记录会自动删除 sessions 和 usage_history 中的相关记录。
        const stmt = this.db.prepare(`DELETE FROM apps WHERE id = ?`)
        const result = stmt.run(id)

        if (result.changes > 0) {
            Logger.info('database-deleteApp', `delete App id is ${id}`)
            return true
        }
        return false
    }
    
    // 更新应用统计数据（运行时长和启动次数）
    public async updateAppStats(appId: string, duration: number): Promise<void> {
        const sql = `
            UPDATE apps
            SET totalRuntime = totalRuntime + ?,
                launchCount = launchCount + 1,
                lastUsed = ?
            WHERE id = ?
        `
        
        const result = this.db.prepare(sql).run(duration, new Date().toISOString(), appId);

        if (result.changes === 0) {
            Logger.info('database-updateAppStats', `Failed to update stats for app ID: ${appId} (App not found)`)
        }
    }
    
    // 模糊搜索应用 (按名称或可执行路径)
    public async searchApps(searchTerm: string, limit: number = 20): Promise<AppData[]> {
        // 使用通配符 '%' 包裹搜索词，实现模糊匹配
        const searchPattern = `%${searchTerm.toLowerCase()}%`;
        
        const sql = `
            SELECT * FROM apps 
            WHERE 
                LOWER(name) LIKE ? OR 
                LOWER(executablePath) LIKE ? 
            ORDER BY lastUsed DESC
            LIMIT ?
        `;
        
        const stmt = this.db.prepare(sql);
        
        // 确保使用相同数量的参数：搜索词 (name), 搜索词 (executablePath), limit
        const rows = stmt.all(searchPattern, searchPattern, limit);
        
        return rows.map(this.mapToAppData);
    }
}
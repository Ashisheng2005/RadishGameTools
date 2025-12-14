import Database from 'better-sqlite3'
import { DatabaseManager } from '../db'
import { Session, SessionFilters } from '../../../shared/types'
// import { DatabaseLogger } from '../logger'
import { v4 as uuidv4 } from 'uuid'
import { Logger } from '../../services/loggerService'


export class SessionRepository {
    private db: Database
    // private logger: DatabaseLogger

    private insertStmt: Database.Statement
    private updateStatusStmt: Database.Statement

    constructor() {
        this.db = DatabaseManager.getInstance().getDatabase()
        // this.logger = DatabaseLogger.getInstance()
        
        this.insertStmt = this.db.prepare(`
            INSERT INTO sessions (id, appId, startTime, endTime, duration, status)
            VALUES (?, ?, ?, ?, ?, ?)
        `)

        this.updateStatusStmt = this.db.prepare(`
            UPDATE sessions
            SET status = ?, endTime = ?, duration = ?
            WHERE id = ?
        `)
    }

    // 将数据库行转换为 Session 接口
    private mapToSession(row: any): Session {
        return {
            id: row.id,
            startTime: row.startTime,
            endTime: row.endTime || '',
            duration: row.duration,
            status: row.status as Session['status'],
        }
    }

    public async addSession(session: Session, appId: string): Promise<void> {
        const completeSession: Session = {
            id: session.id,
            startTime: session.startTime,
            endTime: session.endTime || '',
            duration: session.duration,
            status: session.status,
        };

        const endTimeValue = session.endTime && session.endTime.trim() !== '' ? session.endTime : null;

        try {
            // 插入会话（事务中）
            this.db.transaction(() => {
                this.insertStmt.run(
                    completeSession.id,
                    appId,
                    completeSession.startTime,
                    endTimeValue,
                    completeSession.duration,
                    completeSession.status
                );
                // console.log(`Inserted session ${completeSession.id} for app ${appId}`);
            })();

            // 验证插入是否成功
            const check = this.db.prepare('SELECT COUNT(*) as count FROM sessions WHERE id = ?').get(session.id);
            const dbSize = DatabaseManager.getInstance().getDatabaseSize()
            if (check.count > 0) {
                // console.log(`Immediate verification: OK (session ${session.id}) DB size: ${dbSize} bytes`);
            } else {
                Logger.info('Sessionrepository-addSession', `Immediate verification failed: Session ${session.id} not found after insertion. DB size: ${dbSize} bytes`)
                // console.error(`Immediate verification failed: Session ${session.id} not found after insertion. DB size: ${dbSize} bytes`);
            }
        } catch (error) {
            Logger.error('Sessionrepository-addSession', `Failed to add session ${session.id} for app ${appId}:`, error)
            // console.error(`Failed to add session ${session.id} for app ${appId}:`, error);
            throw error; // 重新抛出错误以便调用方处理
        }
    }

    // 添加一个会话
    // public async addSession(session: Session, appId: string): Promise<void> {
    //     // const id = uuidv4()
        
    //     // 构造一个完整的 Session 对象，以便于插入
    //     const completeSession: Session = {
    //         id: session.id,
    //         startTime: session.startTime,
    //         endTime: session.endTime || '',
    //         duration: session.duration,
    //         status: session.status
    //     };

    //     // endTime 处理
    //     const endTimeValue = session.endTime && session.endTime.trim() !== '' ? 
    //                      session.endTime : null;

    //     try{
    //         this.insertStmt.run(
    //             completeSession.id, 
    //             appId, 
    //             completeSession.startTime, 
    //             endTimeValue, 
    //             completeSession.duration, 
    //             completeSession.status
    //         )

    //         console.log(`Inserted session ${completeSession.id} for app ${appId}`);

    //     } catch {
    //         console.log("database addSession error: add session fail")
    //     }

    //     // 强制执行 WAL 检查点，将数据从 .wal 文件同步到 .db 文件
    //     // TRUNCATE 模式会清理 .wal 文件
    //     try {
    //         this.db.pragma('synchronous = FULL');
    //         const checkpointResult = this.db.pragma('wal_checkpoint(TRUNCATE)', { simple: false });
    //         console.log('Checkpoint Result:', checkpointResult);

    //     } catch (error) {
    //         console.error("Failed to run WAL checkpoint:", error);
    //     }

        
    //     // 强制刷新并验证
    //     // this.db.exec('PRAGMA wal_checkpoint(TRUNCATE)') // 如果是 WAL 模式
        
    //     // 验证，确保数据持久化
    //     const check = this.db.prepare('SELECT COUNT(*) as count FROM sessions WHERE id = ?')
    //         .get(session.id)
    //     console.log(`Immediate verification: ${check.count > 0 ? 'OK' : 'MISSING'}`)

    // }

    // 批量添加会话, 说实话，暂时永不到，但为后续的扩展留个接口，大不了再改就是了喵~
    public async addSessions(sessions: Session[], appId: string): Promise<void> {
        const insertMany = this.db.transaction((sessions: Session[]) => {
            for (const session of sessions) {
                const id = session.id || uuidv4()
                this.insertStmt.run(
                    id, 
                    appId, 
                    session.startTime, 
                    session.endTime || null, 
                    session.duration, 
                    session.status
                )
            }
        })
        
        insertMany(sessions)
        
        // this.logger.log({
        //     level: 'info',
        //     operation: 'BATCH_INSERT_SESSIONS',
        //     message: `Added ${sessions.length} sessions for app ${appId}`,
        // }, 'sessions')
    }

    // 根据过滤器获取会话列表
    public async getSessions(filters: SessionFilters): Promise<Session[]> {
        let sql = `SELECT * FROM sessions WHERE 1=1`
        const params: (string | number)[] = []

        if (filters.appId) {
            sql += ` AND appId = ?`
            params.push(filters.appId)
        }
        if (filters.status) {
            sql += ` AND status = ?`
            params.push(filters.status)
        }
        if (filters.startDate) {
             // 筛选大于等于开始时间的会话
            sql += ` AND startTime >= ?` 
            params.push(filters.startDate)
        }
        if (filters.endDate) {
            // 筛选小于结束时间的会话
            sql += ` AND startTime < ?` 
            params.push(filters.endDate)
        }

        sql += ` ORDER BY startTime DESC`

        if (filters.limit) {
            sql += ` LIMIT ?`
            params.push(filters.limit)
        }
        if (filters.offset) {
            sql += ` OFFSET ?`
            params.push(filters.offset)
        }

        const stmt = this.db.prepare(sql)
        const rows = stmt.all(...params)
        return rows.map(this.mapToSession)
    }
    
    // 获取最近的会话记录
    public async getRecentSessions(limit: number = 20): Promise<Session[]> {
        const sql = `SELECT * FROM sessions ORDER BY startTime DESC LIMIT ?`
        const stmt = this.db.prepare(sql)
        const rows = stmt.all(limit)
        return rows.map(this.mapToSession)
    }

    // 根据ID获取会话
    public async getSessionById(id: string): Promise<Session | null> {
        const sql = `SELECT * FROM sessions WHERE id = ?`
        const stmt = this.db.prepare(sql)
        const row = stmt.get(id)
        if (row) {
            // console.log(`getSessionById: found session ${id}`)
            return this.mapToSession(row)
        } else {
            const dbSize = DatabaseManager.getInstance().getDatabaseSize()
            Logger.warn('SessionRepository-getSessionById', `getSessionById: session ${id} NOT FOUND. DB size: ${dbSize} bytes`)
            // console.warn(`getSessionById: session ${id} NOT FOUND. DB size: ${dbSize} bytes`)
            return null
        }
    }


    public async updateSessionStatus(
        id: string, 
        status: Session['status'], 
        endTime?: string
    ): Promise<boolean> {
        try {
            const existingSession = await this.getSessionById(id);
            if (!existingSession) {
                Logger.error('SessionRepository-updateSessionStatus', `Session ID ${id} not found for status update.`)
                // console.error(`Session ID ${id} not found for status update.`);
                return false;
            }

            const newEndTime = endTime || new Date().toISOString();
            let duration = existingSession.duration;

            // 如果是首次更新到非运行状态，计算实际时长
            if (existingSession.status === 'running') {
                const start = new Date(existingSession.startTime).getTime();
                const end = new Date(newEndTime).getTime();
                duration = Math.max(0, Math.floor((end - start) / 1000)); // 确保时长为正数
            }

            const result = this.updateStatusStmt.run(status, newEndTime, duration, id);

            if (result.changes > 0) {
                // console.log(`Session ${id} status updated to ${status}`)
                return true;
            } else {
                Logger.error('SessionRepository-updateSessionStatus', `Failed to update session ${id}: No changes made.`)
                // console.error(`Failed to update session ${id}: No changes made.`)
                return false;
            }
        } catch (error) {
            Logger.error('SessionRepository-updateSessionStatus', `Error updating session ${id}:`, error)
            // console.error(`Error updating session ${id}:`, error)
            return false;
        }
    }

    // 更新会话状态、结束时间及计算时长
    // public async updateSessionStatus(
    //     id: string, 
    //     status: Session['status'], 
    //     endTime?: string
    // ): Promise<boolean> {
    //     const existingSession = await this.getSessionById(id)
    //     if (!existingSession) {
    //         // this.logger.log({
    //         //     level: 'error',
    //         //     operation: 'UPDATE_SESSION_STATUS_FAILED',
    //         //     message: `Session ID ${id} not found for status update.`,
    //         // }, 'sessions', id)
    //         return false
    //     }

    //     const newEndTime = endTime || new Date().toISOString()
    //     let duration = existingSession.duration

    //     // 如果是首次更新到非运行状态，计算实际时长 注意咱们要考虑市区问题。。。。
    //     if (existingSession.status === 'running') {
    //         const start = new Date(existingSession.startTime).getTime()
    //         const end = new Date(newEndTime).getTime()
    //         // 时长以秒为单位， 确保时长是正数
    //         duration = Math.max(0, Math.floor((end - start) / 1000))
    //     }

    //     const result = this.updateStatusStmt.run(status, newEndTime, duration, id)
        
    //     if (result.changes > 0) {
    //         console.log(`Session: UPDATE_SESSION_STATUS Session ${id} status updated to ${status} `)
    //         // this.logger.log({
    //         //     level: 'info',
    //         //     operation: 'UPDATE_SESSION_STATUS',
    //         //     message: `Session ${id} status updated to ${status}`,
    //         // }, 'sessions', id)
    //         return true
    //     }
    //     return false
    // }

    // 清理指定天数前的旧会话数据
    public async deleteOldSessions(daysToKeep: number = 90): Promise<number> {
        const dateThreshold = new Date()
        dateThreshold.setDate(dateThreshold.getDate() - daysToKeep)
        const isoDate = dateThreshold.toISOString()

        // 只删除已完成或崩溃的会话
        const sql = `
            DELETE FROM sessions 
            WHERE endTime IS NOT NULL 
            AND endTime < ?
            AND status IN ('completed', 'crashed')
        `
        
        const result = this.db.prepare(sql).run(isoDate)
        
        // this.logger.log({
        //     level: 'info',
        //     operation: 'CLEANUP_SESSIONS',
        //     message: `Deleted ${result.changes} sessions older than ${daysToKeep} days`,
        // }, 'sessions')

        return result.changes
    }
}
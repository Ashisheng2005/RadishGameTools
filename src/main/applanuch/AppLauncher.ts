// main/AppLauncher.ts
import { spawn, ChildProcess, execSync } from 'child_process'
import { EventEmitter } from 'events'
import { dataService } from '../services/dataSqlService'
import { AppData } from '../../shared/types'
import { Logger } from '../services/loggerService'
import * as path from 'path'
import * as fs from 'fs'

export class AppLauncher extends EventEmitter {
  private static instance: AppLauncher;
  private runningApps: Map<string, {
    process: ChildProcess
    startTime: Date
    sessionId: string
  }> = new Map()

  // 增加一个改动状态记录，初始为false， 有任何动作修改为true，被读取后为false
  private modification: boolean = false;

  private _activeModification() {
    this.modification = true
  }

  static async getModification() {
    return await this.getInstance()._getModification()
  }

  private async _getModification(): Promise<{ state: boolean }> {
    if (this.modification) {
      this.modification = false
      return {
        state: true
      }

    } else {
      return {
        state: false
      }
    }
  }
  
  private constructor() {
    super();
    this.setupCleanup();
  }
  
  static getInstance(): AppLauncher {
    if (!AppLauncher.instance) {
      AppLauncher.instance = new AppLauncher();
    }
    return AppLauncher.instance;
  }
  
  // 核心启动方法
  static async launchApp(app: AppData): Promise<{ success: boolean; error?: string; sessionId?: string }> {
    return await this.getInstance()._launchApp(app)
  }
  
  private async _launchApp(app: AppData): Promise<{ success: boolean; error?: string; sessionId?: string }> {
    try {

      Logger.info('AppLaunch-launchApp', `satrt appp.name: ${app.id}, app.path: ${app.executablePath}`)

      // 验证文件存在
      if (!fs.existsSync(app.executablePath)) {
        
        const error = `The executable file does not exist: ${app.executablePath}`
        Logger.error('AppLaunch-launchApp', error)
        return { success: false, error }
      }
      
      // 记录应用启动到数据库
      const sessionId = await dataService.recordAppStart(app.id, app.name)
      Logger.info('AppLaunch-launchApp', `create converstaion: ${sessionId} from app: ${app.name}`)
      
      // 获取应用数据来记录session
      const existingData = dataService.getApp(app.id)

      if (!existingData) {
        // 创建新的应用数据，使用 AppInfo 并添加默认值
        const newAppData: AppData = {
          ...app,
          description: app.description || '',
          icon_default: app.icon_default,
          icon: app.icon || 'default',
          color: app.color || '#666666',
          category: app.category || 'Other',
          totalRuntime: 0,
          launchCount: 1,
          lastUsed: new Date().toISOString(),
          sessions: [],
          usageHistory: [],
          weeklyActivity: []
        }
        
        await dataService.saveApp(newAppData)

      } else {
        // 更新现有应用数据
        const updatedAppData: AppData = {
          ...existingData,
          ...app, // 更新基本信息
          // launchCount: existingData.launchCount | 0 + 1,
          lastUsed: new Date().toISOString()
        }
        
        await dataService.saveApp(updatedAppData)
      }
      
      // 创建子进程
      const options: any = {
        cwd: path.dirname(app.executablePath),
        detached: false, // 保持连接以便监控
        stdio: 'pipe' as const,
        windowsHide: true // Windows下隐藏子进程窗口
      };
      
      let childProcess: ChildProcess;
      
      // 根据文件类型决定启动方式
      if (process.platform === 'win32') {
        // Windows：对于.exe文件直接启动
        if (app.executablePath.toLowerCase().endsWith('.exe')) {
          childProcess = spawn(app.executablePath, [], options);
        } else {
          // 其他文件类型使用cmd
          childProcess = spawn('cmd', ['/c', `"${app.executablePath}"`], options);
        }
      } else {
        // macOS/Linux
        childProcess = spawn(app.executablePath, [], options);
      }
      
      // 设置进程监听
      childProcess.on('error', (error) => {
        Logger.error('AppLaunch-launchApp', `app ${app.id} start fail:`, error)
        // console.error(`app ${app.id} start fail:`, error);
        this.handleProcessExit(app.id, 'crashed', 1);
      });
      
      childProcess.on('exit', (code) => {
        const status = code === 0 ? 'completed' : 'crashed';
        this.handleProcessExit(app.id, status, code || 0);
      });
      
      // 记录运行中应用
      this.runningApps.set(app.id, {
        process: childProcess,
        startTime: new Date(),
        sessionId: sessionId
      })
      
      Logger.info('AppLaunch-launchApp', `app ${app.id} start successful, PID: ${childProcess.pid}`)
      // console.log(`app ${app.id} start successful, PID: ${childProcess.pid}`)

      // 修改状态标志
      this._activeModification()
      return { success: true }
      
    } catch (error: any) {
      Logger.error('AppLaunch-launchApp', `app ${app.id} start fail:`, error)
      // console.error(`app ${app.id} start fail:`, error);
      // this.emit('launch-error', { app.id, error: error.message });
      return { success: false, error: error.message }
    }
  }

  private async handleProcessExit(appId: string, status: 'completed' | 'crashed' | 'running', exitCode: number): Promise<void> {
      const runningApp = this.runningApps.get(appId);
      if (!runningApp) {
          Logger.error('AppLaunch-lhandleProcessExit', `No running app found with ID ${appId}`)
          return;
      }

      // 计算运行时间
      const endTime = new Date();
      const duration = Math.floor((endTime.getTime() - runningApp.startTime.getTime()) / 1000);

      try {
          // 记录应用结束
            if (runningApp.sessionId) {
              Logger.info('AppLaunch-launchApp', `Stopping process session ID: ${runningApp.sessionId}`)
              // console.log(`Stopping process session ID: ${runningApp.sessionId}`);
              const success = await dataService.recordAppEnd(runningApp.sessionId, appId, duration);
              if (!success) {
                Logger.warn('AppLaunch-launchApp', `Session ${runningApp.sessionId} not found or already ended.`)
                // console.warn(`Session ${runningApp.sessionId} not found or already ended.`);
              }
            }

          // 更新统计数据
          await dataService.updateAppStats(appId, duration);

          // 清理运行记录
          this.runningApps.delete(appId);

          // 切换状态
          this._activeModification();

          // 触发事件
          this.emit('app-exited', { appId, status, exitCode, duration });
      } catch (error) {
          Logger.error('AppLaunch-lhandleProcessExit', `Error handling process exit for app ${appId}:`, error)
          // console.error(`Error handling process exit for app ${appId}:`, error);
      }
}
  
  // 处理进程退出
  // private async handleProcessExit(appId: string, status: 'completed' | 'crashed' | 'running', exitCode: number): Promise<void> {
  //   const runningApp = this.runningApps.get(appId)
  //   if (!runningApp) return
    
  //   // 计算运行时间
  //   const endTime = new Date()
  //   const duration = Math.floor((endTime.getTime() - runningApp.startTime.getTime()) / 1000)
    
  //   // 记录应用结束
  //   if (runningApp.sessionId) {
  //     console.log(`stop process session id is: ${runningApp.sessionId}`)
  //     await dataService.recordAppEnd(runningApp.sessionId, appId)
  //   }
    
  //   // 更新统计数据
  //   await dataService.updateAppStats(appId, duration)
    
  //   // 清理运行记录
  //   this.runningApps.delete(appId)

  //   // 切换状态
  //   this._activeModification()
    
  //   // 触发事件
  //   this.emit('app-exited', { appId, status, exitCode, duration })
  // }
  
  // 终止应用
  static terminateApp(appId: string, force?: boolean): boolean {
    return this.getInstance()._terminateApp(appId, force)
  }
  
  private _terminateApp(appId: string, force?: boolean): boolean {
    const runningApp = this.runningApps.get(appId)
    if (!runningApp){
      Logger.error('AppLauncher_terminateApp', `running is: ${runningApp}`)
      // console.log(`running is: ${runningApp}`)
      return false
    } 
    
    // 额外防御性检查
    const proc = runningApp.process as ChildProcess | undefined
    if (!proc) {
      Logger.warn('AppLauncher_terminateApp', `no child process object for app ${appId}`)
      this.runningApps.delete(appId)
      this._activeModification()
      return true
    }

    // 如果进程已标记为 killed 或已退出，则直接清理
    try {
      if ((proc as any).killed || (proc as any).exitCode !== null) {
        Logger.info('AppLauncher_terminateApp', `process already exited for app ${appId}`)
        this.runningApps.delete(appId)
        this._activeModification()
        return true
      }
    } catch (e) {
      // ignore
    }

    // 尝试优雅/强制终止，并在失败时使用平台降级方案
    try {
      if (force) {
        Logger.info('AppLauncher_terminateApp', `force kill requested for ${appId}`)
        proc.kill('SIGKILL')
      } else {
        // 优雅终止
        proc.kill('SIGTERM')

        // 在超时后尝试强制终止（防止进程无响应）
        const pid = (proc as any).pid
        setTimeout(() => {
          try {
            if (pid && !(proc as any).killed && (proc as any).exitCode === null) {
              try {
                proc.kill('SIGKILL')
              } catch (err2) {
                // 在某些平台上 kill 可能会抛出，使用平台特定命令作为降级
                try {
                  if (process.platform === 'win32' && pid) {
                    execSync(`taskkill /PID ${pid} /T /F`)
                  }
                } catch (taskErr) {
                  Logger.error('AppLauncher_terminateApp', `force kill fallback failed for ${appId}`, taskErr)
                }
              }
            }
          } catch (inner) {
            Logger.error('AppLauncher_terminateApp', `timeout force-kill check failed for ${appId}`, inner)
          }
        }, 3000)
      }

      // 标记修改并返回成功（实际退出可能稍后发生）
      this._activeModification()
      return true

    } catch (error: any) {
      // 如果 proc.kill 抛出异常（例如在某些 Windows 环境），尝试降级使用外部命令
      Logger.error('AppLauncher_terminateApp', `primary kill failed for ${appId}`, error)

      try {
        const pid = (proc as any).pid
        if (process.platform === 'win32' && pid) {
          execSync(`taskkill /PID ${pid} /T /F`)
          this._activeModification()
          return true
        }
      } catch (fallbackErr) {
        Logger.error('AppLauncher_terminateApp', `fallback taskkill failed for ${appId}`, fallbackErr)
      }

      // 最后，记录并返回 false，以便调用方知道终止失败
      Logger.error('AppLaunch_terminateApp', `end app ${appId} fail:`, error)
      // console.error(`end app ${appId} fail:`, error)
      return false
    }
  }
  
  // 获取应用状态
  static getAppStatus(appId: string): { status: string; duration: number; pid?: number } {
    return this.getInstance()._getAppStatus(appId)
  }
  
  private _getAppStatus(appId: string): { status: string; duration: number; pid?: number } {
    const runningApp = this.runningApps.get(appId)
    if (!runningApp) return { status: 'not_running', duration: 0 }
    
    // 检查进程是否存活
    if (runningApp.process.killed || runningApp.process.exitCode !== null) {
      return { status: 'exited', duration: 0 }
    }
    
    const duration = Math.floor(
      (new Date().getTime() - runningApp.startTime.getTime()) / 1000
    )
    
    return {
      status: 'running',
      duration,
      pid: runningApp.process.pid
    }
  }

  // 获取所有运行中的应用
  static getAllRunningApps(): Array<{ appId: string; startTime: Date; duration: number; pid?: number }> {
    return this.getInstance()._getAllRunningApps()
  }
  
  private _getAllRunningApps(): Array<{ appId: string; startTime: Date; duration: number; pid?: number }> {
    const result: Array<{ appId: string; startTime: Date; duration: number; pid?: number }> = []
    
    this.runningApps.forEach((runningApp, appId) => {
      if (!runningApp.process.killed && runningApp.process.exitCode === null) {
        const duration = Math.floor(
          (new Date().getTime() - runningApp.startTime.getTime()) / 1000
        )
        
        result.push({
          appId,
          startTime: runningApp.startTime,
          duration,
          pid: runningApp.process.pid
        })
      }
    })
    
    return result
  }
  
  // 获取使用统计
  static getUsageStats(appId?: string) {
    return this.getInstance()._getUsageStats(appId)
  }
  
  private _getUsageStats(appId?: string) {
    // 这里可以根据appId返回特定应用或所有应用的统计
    if (appId) {
      // 返回特定应用统计
      return {
        appId,
        running: this.runningApps.has(appId),
        count: this.runningApps.size
      }
    } else {
      // 返回所有应用统计
      return {
        runningCount: this.runningApps.size,
        apps: Array.from(this.runningApps.entries()).map(([appId, runningApp]) => ({
          appId,
          pid: runningApp.process.pid,
          startTime: runningApp.startTime
        }))
      }
    }
  }

  // 获取运行时间
  static getDuration(appId: string): number {
    const runningApp = this.getInstance().runningApps.get(appId)
    if (!runningApp) return 0
    
    const duration = Math.floor(
      (new Date().getTime() - runningApp.startTime.getTime()) / 1000
    )
    return duration
  }
  
   // 清理所有进程和轮询产生的定时器
  private setupCleanup(): void {
    
    process.on('exit', () => {

      // 清理轮询定时器
      // if (this._pollingTimer) {
      //     clearInterval(this._pollingTimer);
      // }

      // 清理线程
      this.runningApps.forEach((runningApp, appId) => {
        try {
          if (!runningApp.process.killed) {
            runningApp.process.kill('SIGTERM')
          }
        } catch (error) {
          Logger.error('AppLaunch-lhandleProcessExit', `clear up process ${appId} fail:`, error)
          // console.error(`clear up process ${appId} fail:`, error)
        }
      })
    })
  }
}
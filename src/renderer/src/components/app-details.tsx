import {
  Play,
  Calendar,
  Clock,
  TrendingUp,
  History,
  BarChart3,
  Square,
  Settings
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { AppIcon } from '@/components/app-icon'
import { UsageChart } from '@/components/usage-chart'
import { SessionHistory } from '@/components/session-history'
import { WeeklyHeatmap } from '@/components/weekly-heatmap'
import { formatDuration, formatDate } from '@/lib/utils'
import type { AppData, AppConfig, ActiveAppInfo } from '@shared/types'
import { useEffect, useState } from 'react'

interface AppDetailsProps {
  app: AppData
  config: AppConfig
  onLaunchApp: (app: AppData) => void
  onStopApp: (app: AppData) => void
  onOpenSettings: () => void
  appStatus: ActiveAppInfo | undefined
}

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export function AppDetails({
  app,
  config,
  onLaunchApp,
  onStopApp,
  onOpenSettings,
  appStatus
}: AppDetailsProps) {
  const [isLaunching, setIsLaunching] = useState(false)
  const [elapsedSeconds, setElapsedSeconds] = useState(0) // 新增状态

  // 如果存在则表示运行中，否则未运行
  const isRunning = Boolean(appStatus)

  // 平均会话时长
  const avgSessionTime = app.launchCount > 0 ? Math.round(app.totalRuntime / app.launchCount) : 0

  // useEffect(() => {
  //   console.log(`app-detail test: ${isRunning} ${appStatus}`)
  // }, [appStatus])

  // 实时计时器效果
  useEffect(() => {
    if (!config.showTimer || !isRunning || !appStatus) {
      setElapsedSeconds(0)
      return
    }

    // 计算初始已运行时间
    const initialElapsed = Math.round((Date.now() - appStatus.startTime) / 1000)
    setElapsedSeconds(initialElapsed)

    // 每秒更新一次
    const interval = setInterval(() => {
      setElapsedSeconds((prev) => prev + 1)
    }, 1000)

    return () => clearInterval(interval)
  }, [config.showTimer, isRunning, appStatus])

  // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
  const handleLaunch = async () => {
    setIsLaunching(true)
    try {
      if (window.electronAPI) {
        await onLaunchApp(app)

        // const result = await window.electronAPI.launchApp(app.id, app.executablePath)
        // }
      } else {
        // console.warn('Electron API 不可用，无法启动应用')
        // await window.electronAPI.loggerWarn("app-details", "Electron API Unavailable")
        alert('!!! Electron API 无法启动, 请重新安装尝试解决')
      }
    } catch (error) {
      // console.error(`启动应用 ${app.name} 时发生错误:`, error)
      await window.electronAPI.loggerError('app-detail', `启动应用 ${app.name} 时发生错误:${error}`)
    } finally {
      setTimeout(() => setIsLaunching(false), 1500)
    }
  }

  // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
  const handleTerminate = async () => {
    try {
      if (window.electronAPI) {
        await onStopApp(app)
        // const result = await window.electronAPI.terminateApp(app.id)
      }
    } catch (error) {
      // console.error(`终止应用 ${app.name} 时发生错误:`, error)
      await window.electronAPI.loggerError(
        'app-details',
        `终止应用 ${app.name} 时发生错误:${error}`
      )
    }
  }

  // 获取状态显示文本
  // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
  const getStatusDisplay = () => {
    if (appStatus) {
      return '运行中'
    } else {
      return '未运行'
    }

    // if (!appStatus) return null
    // const statusTexts: Record<string, string> = {
    //   running: '运行中',
    //   completed: '已完成',
    //   crashed: '已崩溃',
    //   not_running: '未运行',
    //   unknown: '未知'

    // return statusTexts[appStatus.status] || appStatus.status
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <AppIcon icon_default={app.icon_default} icon={app.icon} color={app.color} size="lg" />
          <div>
            <h1 className="text-2xl font-bold text-foreground">{app.name}</h1>
            <p className="text-muted-foreground">{app.description}</p>
            {appStatus && (
              <div className="flex items-center gap-2 mt-2">
                <div
                  className={cn(
                    'h-2 w-2 rounded-full',
                    isRunning ? 'bg-green-500 animate-pulse' : 'bg-gray-500'
                  )}
                />
                <span
                  className={cn(
                    'text-sm font-medium',
                    isRunning ? 'text-green-600' : 'text-muted-foreground'
                  )}
                >
                  {getStatusDisplay()}

                  {/* 根据用户具体配置显示计时器 */}
                  {/* {config.showTimer && isRunning ? `(${Math.round((Date.now() - appStatus.startTime) / 1000)}秒)` : null} */}
                  {config.showTimer && isRunning ? `(${elapsedSeconds}秒)` : null}
                </span>
              </div>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="lg"
            onClick={onOpenSettings}
            className="gap-2 border-border bg-transparent"
          >
            <Settings className="h-5 w-5" />
            {/* 设置 */}
          </Button>

          {isRunning ? (
            <Button size="lg" onClick={handleTerminate} variant="destructive" className="gap-2">
              <Square className="h-5 w-5" />
              终止应用
            </Button>
          ) : (
            <Button size="lg" onClick={handleLaunch} disabled={isLaunching} className="gap-2">
              <Play className={`h-5 w-5 ${isLaunching ? 'animate-spin' : ''}`} />
              {isLaunching ? '启动中...' : '启动应用'}
            </Button>
          )}
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="bg-card border-border">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">总运行时长</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">
              {formatDuration(app.totalRuntime)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">累计使用时间</p>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">启动次数</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{app.launchCount}</div>
            <p className="text-xs text-muted-foreground mt-1">总启动次数</p>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">平均时长</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">
              {formatDuration(avgSessionTime)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">每次使用平均时长</p>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">最后使用</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{formatDate(app.lastUsed)}</div>
            <p className="text-xs text-muted-foreground mt-1">上次启动时间</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Section */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-foreground">
              <TrendingUp className="h-5 w-5 text-primary" />
              使用趋势
            </CardTitle>
          </CardHeader>
          <CardContent>
            <UsageChart data={app.usageHistory} />
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-foreground">
              <Calendar className="h-5 w-5 text-primary" />
              周活跃度
            </CardTitle>
          </CardHeader>
          <CardContent>
            <WeeklyHeatmap data={app.weeklyActivity} />
          </CardContent>
        </Card>
      </div>

      {/* Session History */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-foreground">
            <History className="h-5 w-5 text-primary" />
            运行记录
          </CardTitle>
        </CardHeader>
        <CardContent>
          <SessionHistory sessions={app.sessions} />
        </CardContent>
      </Card>
    </div>
  )
}

// 添加缺失的 cn 工具函数
function cn(...classes: (string | undefined | null | boolean)[]): string {
  return classes.filter(Boolean).join(' ')
}

import { useEffect, useState } from "react"
import {
  Settings,Moon,Sun,
  Monitor,Bell,FolderOpen,Database,
  Trash2,Download,Upload,Info,
  ChevronLeft,Palette,Cog,Shield,
  Cpu,SquarePen,MonitorCog,Timer,
  Users,Scale, Bug, Lightbulb, Send,
  Search
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { cn } from "@/lib/utils"
import { AppConfig } from "@shared/types"
import { useTheme } from "@/components/themo-provider"

interface SettingsPageProps {
  onBack: () => void
}

type SettingsSection = "appearance" | "behavior" | "data" | "about"

export function SettingsPage({ onBack }: SettingsPageProps) {
  const [selfTheme, setSelfTheme] = useState<"light" | "dark" | "system">("dark")
  const [autoStart, setAutoStart] = useState(false)
  const [minimizeToTray, setMinimizeToTray] = useState(false)
  const [notifications, setNotifications] = useState(false)
  const [trackUsage, setTrackUsage] = useState(true)
  // 备份启动器
  const [standbylaunch, setStandbylaunch] = useState(true)
  // 沉浸模式
  const [lmmersion, setLmmersion] = useState(false)
  // 日志记录
  const [startlogger, setStartlogger] = useState(true)
  // 计时器
  const [showTimer, setShowTimer] = useState(true)
  // 自动清理
  const [autoCleanup, setAutoCleanup] = useState(false)
  // 提交异常数据
  const [submitErrorData, setSubmitErrorData] = useState(false)
  // 活动窗口优化
  const [autoOptimizeWindow, setAutoOptimizeWindow] = useState(true)
  const [dataPath, setDataPath] = useState("null")
  const [activeSection, setActiveSection] = useState<SettingsSection>("appearance")
  // 全局主题
  const { setTheme } = useTheme()

  useEffect(() => {
    // 在组件加载时获取当前配置
    window.electronAPI.getConfig().then((config) => {
      setSelfTheme(config.theme)
      setTheme(config.theme)
      setAutoStart(config.autoLaunchAtStartup)
      setMinimizeToTray(config.minimizeToSystemTray)
      setNotifications(config.showOperationHints)
      setTrackUsage(config.enableUsageAnalytics)
      setStandbylaunch(config.enableBackupLauncher)
      setLmmersion(config.immersiveMode)
      setStartlogger(config.enableLogging)
      setShowTimer(config.showTimer)
      setAutoCleanup(config.autoCleanupEnabled)
      setSubmitErrorData(config.submitErrorData ?? false)
      setDataPath(config.storageLocation)
      setAutoOptimizeWindow(config.autoOptimizeWindow ?? false)
      setAutoOptimizeWindow(config.autoOptimizeWindow ?? true)
    })
  }, [])  // 添加空依赖数组，确保只在组件挂载时执行

  const handleBrowseDataPath = async () => {
    if (window.electronAPI?.isElectron) {
      try {
        const result = await window.electronAPI.openFileDialog({
          properties: ["openFile"],
        })
        if (!result.canceled && result.filePaths.length > 0) {
          setDataPath(result.filePaths[0])
        }
      } catch (error) {
        console.error("选择文件夹失败:", error)
      }
    }
  }

  const handleExportData = () => {
    window.electronAPI.loggerInfo("setting-page", "Export data ...")
  }

  const handleImportData = () => {
    window.electronAPI.loggerInfo("setting-page", "Import data ...")
  }

  const handleClearData = () => {
    window.electronAPI.loggerInfo("setting-page", "Clear all data ...")
  }

  const menuItems = [
    { id: "appearance" as const, label: "外观", icon: Palette },
    { id: "behavior" as const, label: "行为", icon: Cog },
    { id: "data" as const, label: "数据与隐私", icon: Shield },
    { id: "about" as const, label: "关于", icon: Info },
  ]

  // 更新设置
  const updateSetting = () => {
    // 调用IPC保存设置
    
    // 构建新的配置对象
    const newConfig: AppConfig= {
      theme: selfTheme,
      autoLaunchAtStartup: autoStart,
      minimizeToSystemTray: minimizeToTray,
      showOperationHints: notifications,
      enableUsageAnalytics: trackUsage,
      enableBackupLauncher: standbylaunch,
      immersiveMode: lmmersion,
      enableLogging: startlogger,
      showTimer: showTimer,
      autoCleanupEnabled: autoCleanup,
      submitErrorData: submitErrorData,
      storageLocation: dataPath,
      logLevel: 'info' // 默认日志级别
    }

    window.electronAPI.setConfig(newConfig)
    window.electronAPI.loggerInfo("setting-page", "Update settings")

    // 调用Back函数返回上一页
    onBack()
  }

  return (
    <div className="flex flex-col h-full w-full bg-background">
      {/* Header */}
      <div className="flex items-center gap-4 p-6 border-b border-border shrink-0">
        <Button variant="ghost" size="icon" onClick={updateSetting}>
          <ChevronLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Settings className="h-6 w-6" />
            设置
          </h1>
          <p className="text-sm text-muted-foreground">配置应用程序的偏好设置</p>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* 左侧导航 */}
        <div className="w-56 border-r border-border bg-muted/20 shrink-0">
          <nav className="p-4 space-y-1">
            {menuItems.map((item) => {
              const Icon = item.icon
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveSection(item.id)}
                  className={cn(
                    "flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-left transition-colors",
                    activeSection === item.id
                      ? "bg-accent text-accent-foreground"
                      : "text-muted-foreground hover:bg-accent/50 hover:text-foreground",
                  )}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <span className="font-medium">{item.label}</span>
                </button>
              )
            })}
          </nav>
        </div>

        {/* 右侧内容区 */}
        <ScrollArea className="flex-1">
          <div className="p-6">
            <div className="max-w-2xl space-y-6">
              {/* Appearance */}
              {activeSection === "appearance" && (
                <div className="flex flex-row gap-4">
                  <Card className="bg-card border-border flex-1 min-w-[300px]">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Monitor className="h-5 w-5 text-primary" />
                        主题
                      </CardTitle>
                      <CardDescription>自定义应用程序的主题</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex items-center justify-between gap-4">
                        <Label htmlFor="selfTheme" className="flex items-center gap-2">
                          {selfTheme === "dark" ? <Moon className="h-4 w-4" /> : selfTheme === "light" ? <Sun className="h-4 w-4" /> : <MonitorCog className="h-4 w-4" />}
                          主题模式
                        </Label>
                        <Select value={selfTheme} onValueChange={(v) => {setSelfTheme(v as typeof selfTheme); setTheme(v as typeof selfTheme)}}>
                          <SelectTrigger className="w-[140px] bg-muted/50 border-border">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="light">浅色</SelectItem>
                            <SelectItem value="dark">深色</SelectItem>
                            <SelectItem value="system">跟随系统</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="flex-grow min-w-[280px]">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Monitor className="h-5 w-5 text-primary" />
                          详情页
                      </CardTitle>
                      <CardDescription>配置软件的详情展示</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <Label>
                            <Timer className="h-4 w-4 mr-1" />
                              显示计时器结果
                          </Label>
                          <p className="text-sm text-muted-foreground">时刻刷新详情页计时器结果</p>
                        </div>
                        <Switch checked={showTimer} onCheckedChange={setShowTimer} />
                      </div>
                    </CardContent>
                  </Card>
                </div>
                
              )}

              {/* Behavior */}
              {activeSection === "behavior" && (
                <div className="flex flex-row gap-3">
                  <Card className="bg-card border-border min-w-[280px]">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Settings className="h-5 w-5 text-primary" />
                        行为
                      </CardTitle>
                      <CardDescription>配置应用程序的启动和运行行为</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <Label>开机自启动</Label>
                          <p className="text-sm text-muted-foreground">系统启动时自动运行此应用</p>
                        </div>
                        <Switch checked={autoStart} onCheckedChange={setAutoStart} />
                      </div>
                      <Separator />
                      <div className="flex items-center justify-between gap-2">
                        <div className="space-y-0.5">
                          <Label>最小化到托盘</Label>
                          <p className="text-sm text-muted-foreground">关闭窗口时最小化到系统托盘</p>
                        </div>
                        <Switch checked={minimizeToTray} onCheckedChange={setMinimizeToTray} />
                      </div>
                      <Separator />
                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <Label className="flex items-center gap-2">
                            <Bell className="h-4 w-4" />
                            通知提醒
                          </Label>
                          <p className="text-sm text-muted-foreground">应用启动和关闭时显示通知</p>
                        </div>
                        <Switch checked={notifications} onCheckedChange={setNotifications} />
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="flex-grow min-w-[380px]">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Cpu className="h-5 w-5 text-primary" />
                        启动器
                      </CardTitle>
                      <CardDescription>配置驱动指定软件的执行器</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex items-center justify-between gap-4">
                        <div className="space-y-0.5">
                          <Label>备份启动器</Label>
                          <p className="text-sm text-muted-foreground">当默认启动器出现异常时主动唤醒备用启动器</p>
                        </div>
                        <Switch checked={standbylaunch} onCheckedChange={setStandbylaunch} />
                      </div>
                      <Separator />
                      <div className="flex items-center justify-between  gap-4">
                        <div className="space-y-0.5">
                          <Label>沉浸模式</Label>
                          <p className="text-sm text-muted-foreground">任意软件启动成功后自动隐藏此窗口</p>
                        </div>
                        <Switch checked={lmmersion} onCheckedChange={setLmmersion} />
                      </div>
                      <Separator />
                      <div className="flex items-center justify-between  gap-4">
                        <div className="space-y-0.5">
                          <Label className="flex items-center gap-2">
                            <SquarePen className="h-4 w-4" />
                            日志记录
                          </Label>
                          <p className="text-sm text-muted-foreground">所有操作以及产生的数据都记录到日志中</p>
                        </div>
                        <Switch checked={startlogger} onCheckedChange={setStartlogger} />
                      </div>
                    </CardContent>

                  </Card>
                  

                  <Card className="flex-grow min-w-[320px]">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Cpu className="h-5 w-5 text-primary" />
                          优化方案
                      </CardTitle>
                      <CardDescription>根据个人需求配置优化方案</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex items-center justify-between gap-4">
                        <div className="space-y-0.5">
                          <Label>活动窗口优化</Label>
                          <p className="text-sm text-muted-foreground">仅当窗口处于活动状态时刷新数据</p>
                        </div>
                        <Switch checked={autoOptimizeWindow} onCheckedChange={setAutoOptimizeWindow} />
                      </div>
                    </CardContent>

                  </Card>
              </div>

              )}

              {/* Data & Privacy */}
              {activeSection === "data" && (
                <div className="flex flex-row gap-4">
                  <Card className="bg-card border-border min-w-[440px]">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Database className="h-5 w-5 text-primary" />
                        数据收集和管理
                      </CardTitle>
                      <CardDescription>管理您的数据和使用统计</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <Label>使用统计</Label>
                          <p className="text-sm text-muted-foreground">记录应用使用时长和启动次数</p>
                        </div>
                        <Switch checked={trackUsage} onCheckedChange={setTrackUsage} />
                      </div>
                      <Separator />

                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <Label>自动清理</Label>
                          <p className="text-sm text-muted-foreground">根据天数自动清理日志等冗余数据</p>
                        </div>
                        <Switch checked={autoCleanup} onCheckedChange={setAutoCleanup} />
                      </div>
                      <Separator />

                      <div className="space-y-2">
                        <Label>数据存储位置</Label>
                        <div className="flex gap-2">
                          <Input
                            value={dataPath}
                            onChange={(e) => setDataPath(e.target.value)}
                            className="flex-1 bg-muted/50 border-border"
                            readOnly
                          />
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={handleBrowseDataPath}
                            className="border-border bg-transparent shrink-0"
                          >
                            <FolderOpen className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      <Separator />
                      <div className="flex flex-wrap gap-3">
                        <Button variant="outline" onClick={handleExportData} className="border-border bg-transparent">
                          <Download className="h-4 w-4 mr-2" />
                          导出数据
                        </Button>
                        <Button variant="outline" onClick={handleImportData} className="border-border bg-transparent">
                          <Upload className="h-4 w-4 mr-2" />
                          导入数据
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="destructive">
                              <Trash2 className="h-4 w-4 mr-2" />
                              清除所有数据
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent className="bg-background border-border">
                            <AlertDialogHeader>
                              <AlertDialogTitle>确认清除所有数据？</AlertDialogTitle>
                              <AlertDialogDescription>
                                此操作将删除所有应用记录和使用统计数据，且无法撤销。
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel className="border-border">取消</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={handleClearData}
                                className="bg-destructive text-destructive-foreground"
                              >
                                确认清除
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </CardContent>
                  </Card>

                  <div className='flex-col gap-y-3 flex min-w-[480px]'>
                    <Card className="bg-card border-border">
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <Users className="h-5 w-5 text-primary" />
                            开发者计划
                        </CardTitle>
                        <CardDescription>通过贡献您的异常数据参与开发者计划</CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="flex items-center justify-between">
                          <div className="space-y-0.5">
                            <Label>
                              <Bug className="h-4 w-4 mr-1" />
                              提交异常数据
                            </Label>
                            <p className="text-sm text-muted-foreground">当软件出现异常时, 提交异常数据以供开发者修复和完善</p>
                          </div>
                          <Switch checked={submitErrorData} onCheckedChange={setSubmitErrorData} />
                        </div>

                        <div className="flex items-center justify-between">
                          <div className="space-y-0.5">
                            <Label>
                              <Lightbulb className="h-4 w-4 mr-1" />
                              提交优化建议
                            </Label>
                            <p className="text-sm text-muted-foreground">提交一些您在使用过程中产生的建议</p>
                          </div>
                          <Button variant="outline" onClick={handleImportData} className="border-border bg-transparent">
                            <Send className="h-4 w-4 mr-2" />
                              点击提交
                          </Button>
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <Scale className="h-5 w-5 text-primary" />
                            隐私政策
                          </CardTitle>
                          <CardDescription>当你使用该软件即表示您同意并遵守所有要求的隐私政策</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <div className="flex items-center justify-between">
                            <div className="space-y-0.5">
                              <Label>查看隐私政策</Label>
                            </div>
                            <Button variant="outline" onClick={handleImportData} className="border-border bg-transparent">
                              <Search className="h-4 w-4 mr-2" />
                              点击查看
                            </Button>
                          </div>
                        </CardContent>
                    </Card>
                  </div>
                </div>
                
              )}

              {/* About */}
              {activeSection === "about" && (
                <div className="sm:w-[500px]">
                  <Card className="bg-card border-border">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Info className="h-5 w-5 text-primary" />
                        关于
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex justify-between py-2">
                        <span className="text-muted-foreground">版本</span>
                        <span className="text-foreground font-medium">dev-0.0.2(内测版)</span>
                      </div>
                      <Separator />
                      <div className="flex justify-between py-2">
                        <span className="text-muted-foreground">框架</span>
                        <span className="text-foreground font-medium">Electron + React</span>
                      </div>
                      <Separator />
                      <div className="flex justify-between py-2">
                        <span className="text-muted-foreground">存储</span>
                        <span className="text-foreground font-medium">Sqlite3 + JSON</span>
                      </div>
                      <Separator />
                      <div className="flex justify-between py-2">
                        <span className="text-muted-foreground">开发者</span>
                        <span className="text-foreground font-medium">Repork</span>
                      </div>
                      <Separator />
                      <div className="pt-4">
                        <p className="text-sm text-muted-foreground text-center">
                          感谢使用 如有问题请联系 Repork@qq.com
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}
            </div>
          </div>
        </ScrollArea>
      </div>
    </div>
  )
}

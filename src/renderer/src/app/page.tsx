import { useState, useCallback, useEffect } from "react"
import { ResizableSidebar } from "@/components/resizable-sidebar"
import { AppDetails } from "@/components/app-details"
import { AddAppDialog } from "@/components/add-app-dialog"
import { AppConfig, mockApps, ActiveAppInfo , type AppData, NewAppData } from "@shared/types"
import { SettingsPage } from "@/components/settings-page"
import { AppSettingsDialog } from "@/components/app-settings-dialog"
import { ThemeProvider } from "@/components/themo-provider"


export default function LauncherPage() {

  // window.electronAPI.loggerInfo("page", "Perform rendering")
  
  const [apps, setApps] = useState<AppData[]>(mockApps)
  const [selectedApp, setSelectedApp] = useState<AppData | null>(null)
  const [addDialogOpen, setAddDialogOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [initialPath, setInitialPath] = useState("")
  const [initialName, setInitialName] = useState("")
  const [selectedAppId, setSelectedAppId] = useState<string | null>(null) // 新增状态，只存储ID
  const [appSettingsOpen, setAppSettingsOpen] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [config, setConfig] = useState<AppConfig | null>(null)

  // 存储活动应用信息（会话ID -> 应用信息）
  const [activeApps, setActiveApps] = useState<Map<string, ActiveAppInfo>>(new Map())

  // 软件启动时加载所有应用数据
  useEffect(() => {
    // 使用requestIdleCallback或setTimeout让主题初始化先完成
    const loadData = async () => {
      const configData = await window.electronAPI.getConfig()
      setConfig(configData)
      await loadAllApps()
    }
    
    // 延迟100ms开始加载数据，让主题初始化先执行
    loadData()
    // setTimeout(() => {
    //   loadData()
    // }, 100)
  }, [])

  const checkActiveAppsStatus = useCallback(async () =>{
    const isUpdate = await window.electronAPI.getModification()
    // console.log(`update ui statue: ${isUpdate.state}`)
    if (isUpdate.state) {
      loadAllApps()

      // 同时同步运行中的应用状态
      try {
        const runningApps = await window.electronAPI.getAllRunningApps()
        
        setActiveApps(prev => {
          const next = new Map<string, ActiveAppInfo>()
          
          // 将主进程返回的运行中应用添加到新 Map
          runningApps.forEach((app: any) => {
            const appId = app.appId || app.id
            if (appId) {
              next.set(appId, {
                startTime: app.startTime ? new Date(app.startTime).getTime() : Date.now(),
              })
            }
          })
          
          // 如果新旧 Map 不同，才更新状态（避免不必要的重渲染）
          if (prev.size !== next.size || 
              Array.from(prev.keys()).some(key => !next.has(key))) {
            // console.log(`activeApps updated: ${prev.size} -> ${next.size}`)
            return next
          }
          return prev
        })
        
      } catch (error) {
        console.error('Failed to sync running apps:', error)
      }

      console.log(`activeApps: ${activeApps.size}`)
    }
  }, [activeApps])
  
  // 定时检查活动应用状态
useEffect(() => {
  const interval = setInterval(checkActiveAppsStatus, 2000);
  return () => clearInterval(interval);
}, [checkActiveAppsStatus])

// 窗口失焦时降低检查频率
useEffect(() => {
  let interval: NodeJS.Timeout
  
  const handleVisibilityChange = () => {
    if (document.hidden) {
      // 窗口不可见时，每30秒检查一次
      clearInterval(interval);
      interval = setInterval(checkActiveAppsStatus, 30000)

    } else {
      // 窗口可见时，每2秒检查一次
      clearInterval(interval);
      interval = setInterval(checkActiveAppsStatus, 2000)
    }
  };
  
  handleVisibilityChange(); // 初始化
  document.addEventListener('visibilitychange', handleVisibilityChange);
  
  return () => {
    document.removeEventListener('visibilitychange', handleVisibilityChange);
    clearInterval(interval);
  };
}, [checkActiveAppsStatus]);


  const loadAllApps = async () => {
    try {

      const appData = await window.electronAPI.getAllApps()
      // console.log(appData)
      setApps(appData)
      // console.log(`成功加载 ${appData.length} 个应用`)
      await window.electronAPI.loggerInfo("page", `Loading ${appData.length} applicaitons successful`)

    } catch (error) {
      await window.electronAPI.loggerError("page", "loading applicaitons fail", error)

      // 如果数据失败，使用空数据
      setApps(mockApps)

    } finally {
      setLoading(false)
    }
  }

  // 手动添加软件
  const handleAddAppClick = useCallback(() => {
    setInitialPath("")
    setInitialName("")
    setAddDialogOpen(true)
  }, [])

  // 拖入添加软件
  const handleFileDrop = useCallback((path: string, name: string) => {
    setInitialPath(path)
    setInitialName(name)
    setAddDialogOpen(true)
  }, [])

  // 生成随机颜色
  const getRandomColor = () => {
    const colors = [
      '#007ACC', // VS Code 蓝
      '#4285F4', // Chrome 蓝
      '#1DB954', // Spotify 绿
      '#F24E1E', // Figma 橙
      '#4A154B', // Slack 紫
      '#000000', // Notion 黑
      '#1C9BF6', // Finder 蓝
      '#FF6B00', // 橙色
      '#5856D6', // 紫色
      '#FF2D55', // 粉色
    ]
    return colors[Math.floor(Math.random() * colors.length)]
  }
  
  // 加载单个应用完整详情
  const loadAppDetails = useCallback(async (appId: string) => {
    try {
        // console.log(`正在加载应用 ${appId} 的完整详情...`)
        // 关键：调用 DataService.getApp(id)，该方法在 Service 层组装了所有关联数据
        const fullAppData = await window.electronAPI.getApp(appId)

        if (fullAppData) {
            // 仅更新 selectedApp 状态
            setSelectedApp(fullAppData)
        } else {
            await window.electronAPI.loggerError("page", `applicaiton ${appId} details were not found.`)
        }

    } catch (error) {
        await window.electronAPI.loggerError("page", `Loading ${appId} fail, error: ${error}`)
        setSelectedApp(null)
    }
    }, [])
  
  
    // 当 selectedAppId 变化时，加载该应用的完整详情
  useEffect(() => {
    if (selectedAppId) {
        // 在这里调用新的加载函数
        loadAppDetails(selectedAppId);

    } else {
        setSelectedApp(null);
    }
  }, [selectedAppId, loadAppDetails])

  // 添加软件的执行函数
  const handleAddApp = useCallback(async (newAppData: NewAppData) => {
    try{
      // 生成应用的ID, 基于应用的名称和时间戳
      const appId = `${newAppData.name.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${Date.now()}`
      // console.log(`appid: ${appId}`)
      const newApp: AppData = {
        id: appId,
        name: newAppData.name,
        description: newAppData.description || `${newAppData.name} 应用`,
        icon_default: Boolean(newAppData.icon_default),
        icon: newAppData.icon || "default",
        color: newAppData.color || getRandomColor(),
        executablePath: newAppData.executablePath,
        totalRuntime: 0,
        launchCount: 0,
        lastUsed: new Date().toISOString(),
        sessions: [],
        usageHistory: Array.from({ length: 14 }, (_, i) => {
          const date = new Date()
          date.setDate(date.getDate() - (13 - i))
          return {
            date: `${date.getMonth() + 1}/${date.getDate()}`,
            duration: 0,
          }
        }),
        weeklyActivity: Array.from({ length: 7 }, (_, i) => ({
          day: i,
          value: 0,
        })),
        category: newAppData.category || "Other"
      }

      // 保存到数据库
      await window.electronAPI.saveApp(newApp)

      // 刷新本地状态
      setApps(prevApps => [...prevApps, newApp])
      // setApps([...apps, newApp])
      setSelectedApp(newApp)

      // console.log(`应用 "${newAppData.name}" 添加成功, ID: ${appId}`)
      await window.electronAPI.loggerInfo("append applicaiton", `app name is  "${newAppData.name}" , ID: ${appId}, icon path: ${newAppData.icon}`)
    } catch (error) {
      // console.error('添加应用到数据库失败:', error)
      await window.electronAPI.loggerError("append applicaiton", '添加应用到数据库失败:', error)
      alert('添加应用失败，请重试')
    }
      
    }, [],)

  // 启动函数核心，只负责启动，具体页面在外套一层记录处理
  const handleLaunchAppKernel = async (app: AppData) => {

    // 核心不使用容错，具体错误由外层处理并记录
    // 优先是由child_process提供的接口，Electron IPC 调用 C++ 原生模块用作备用启动器
    // 核心的意思就是要保留最纯粹的执行功能，其他的东西都交给调用函数考虑口牙！
    const result = await window.electronAPI.launchApp(app)
    
    if (result.success) {
      await window.electronAPI.loggerInfo("run", `run applicaiton appid: ${app.id} app_path: ${app.executablePath} successful startup`)

      // 添加到活动应用app
      setActiveApps(prev => new Map(prev.set(app.id, {
        // sessionId: sessionsId,
        startTime: Date.now(),
        // lastStatusCheck: Date.now(),
      })))

      // 更新最后使用时间
      setApps(prevApps =>
        prevApps.map(a =>
          a.id === app.id
          ? {...a, lastUsed: new Date().toISOString()}
          : a
        )
      )
      // console.log(`会话开始: ${sessionsId}`)
      return true
      
    } else {
      await window.electronAPI.loggerError("run", `run applicaiton appid: ${app.id} app_path: ${app.executablePath} failed startup, ${result.error}`)
      // console.error(`启动应用 ${app.name} 失败:`, result.error)
      return false
    }
  }

  // 停止函数核心， 同样的，只是核心
  const handleStopAppKernel = useCallback(async (app: AppData) => {

    const result = await window.electronAPI.terminateApp(app.id)
    
    if (result.success) {
      // console.log(`应用 ${app.name} 已终止`)
      await window.electronAPI.loggerInfo("end", `app ${app.name} stop successful`)

      // 从活动应用中删除
      setActiveApps(prev => {
        const newMap = new Map(prev)
        newMap.delete(app.id)
        return newMap
      })

      // 强制立即刷新当前应用的数据
      if (app.id === selectedAppId) {
        // 添加一个小延迟确保数据库已更新
        setTimeout(async () => {
          await loadAppDetails(app.id)
        }, 100)
      }

      return true

    } else {
      // console.error(`终止应用 ${app.name} 失败:`, result.error)
      await window.electronAPI.loggerError("end", `stop app ${app.name} fail, ${result.error}`)
      return false
    }


  }, [selectedAppId, loadAppDetails])


  const handleSaveAppSettings = useCallback((updatedApp: AppData) => {
    setApps((prev) => prev.map((app) => (app.id === updatedApp.id ? updatedApp : app)))
    setSelectedApp(updatedApp)
  }, [])

  const handleDeleteApp = useCallback(
    (appId: string) => {
      setApps((prev) => prev.filter((app) => app.id !== appId))
      if (selectedApp?.id === appId) {
        setSelectedApp(apps.find((app) => app.id !== appId) || null)
      }
      window.electronAPI.deleteApp(appId)
      window.electronAPI.loggerInfo("DeleteApp", `delete app : ${appId}`)
    },
    [apps, selectedApp],
  )

  // 替换 onSelectApp 的实现，只存储 ID
  const handleSelectApp = useCallback((app: AppData) => {
      setSelectedAppId(app.id); // 仅存储 ID，触发 useEffect 加载详情
  }, []);


  if (loading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">正在加载应用数据...</p>
        </div>
      </div>
    )
  }

  if (showSettings) {
    return (
      <div className="flex h-screen w-screen min-h-screen overflow-hidden bg-background fixed inset-0">
        <SettingsPage onBack={() => setShowSettings(false)} />
      </div>
    )
  }

  return (
    <ThemeProvider defaultTheme={config?.theme} storageKey="vite-ui-theme">
      <div className="flex h-screen w-screen min-h-screen overflow-hidden bg-background fixed inset-0">
        <ResizableSidebar
          apps={apps}
          selectedApp={selectedApp}
          onSelectApp={handleSelectApp}
          onAddAppClick={handleAddAppClick}
          onFileDrop={handleFileDrop}
          onLaunchApp={handleLaunchAppKernel}
          onStopApp={handleStopAppKernel}
          onSettingsClick={() => setShowSettings(true)}
          AppStatus={activeApps}
        />
        <main className="flex-1 overflow-auto h-full">
          {selectedApp && config ? (
            <AppDetails
            app={selectedApp} 
            config={config}
            onLaunchApp={handleLaunchAppKernel}
            onStopApp={handleStopAppKernel}
            onOpenSettings={() => setAppSettingsOpen(true)}
            appStatus={activeApps.get(selectedApp.id)}
            // isRunning={isAppRunning(selectedApp)}
            // onRefreshData={refreshAppData}
            />
          ) : (
            <main className="flex-1 overflow-auto h-full">
            {selectedApp && config ? (
              <AppDetails 
                app={selectedApp} 
                config={config}
                onLaunchApp={handleLaunchAppKernel}
                onStopApp={handleStopAppKernel}
                onOpenSettings={() => setAppSettingsOpen(true)}
                appStatus={activeApps.get(selectedApp.id)}
              />
            ) : (
              <div className="flex h-full items-center justify-center">
                <p className="text-muted-foreground">选择一个应用以查看详情</p>
              </div>
            )}
          </main>

          )}
        </main>

        <AddAppDialog
          open={addDialogOpen}
          config={config!}
          onOpenChange={setAddDialogOpen}
          onAdd={handleAddApp}
          initialPath={initialPath}
          initialName={initialName}
        />

        {selectedApp && (
          <AppSettingsDialog
            open={appSettingsOpen}
            config={config!}
            onOpenChange={setAppSettingsOpen}
            app={selectedApp}
            onSave={handleSaveAppSettings}
            onDelete={handleDeleteApp}
          />
        )}
      </div>
    </ThemeProvider>

    
  )
}
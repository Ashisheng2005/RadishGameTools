"use client"

import type React from "react"
import { useState, useRef, useCallback, useEffect } from "react"
import { Play, Clock, Search, Plus, Settings, GripVertical, Carrot, Radar } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { ScrollArea } from "@/components/ui/scroll-area"
import { AppIcon } from "@/components/app-icon"
// import { formatDuration } from "@/lib/utils"
import type { AppData, ActiveAppInfo } from "@shared/types"
import { cn } from "@/lib/utils"


interface ResizableSidebarProps {
  apps: AppData[]
  selectedApp: AppData | null
  onSelectApp: (app: AppData) => void
  onAddAppClick: () => void
  onFileDrop: (path: string, name: string) => void
  onLaunchApp: (app: AppData) => void
  onStopApp: (app: AppData) => void
  onSettingsClick: () => void // 添加设置按钮点击回调
  AppStatus: Map<string, ActiveAppInfo>
}

const MIN_WIDTH = 280
const MAX_WIDTH = 500
const DEFAULT_WIDTH = 340
const COLLAPSED_WIDTH = 72 // 收起时的宽度
const COLLAPSE_DELAY = 100 // 侧边栏收起延迟

export function ResizableSidebar({ apps, selectedApp, onSelectApp, 
  onAddAppClick, onFileDrop, onLaunchApp,  onStopApp, onSettingsClick, AppStatus}: ResizableSidebarProps) {

  const [searchQuery, setSearchQuery] = useState("")
  const [launchingApp, setLaunchingApp] = useState<string | null>(null)
  // const [appStatus, setAppStatus] = useState<Record<string, { status: string; duration: number }>>({})
  const [width, setWidth] = useState(DEFAULT_WIDTH)
  const [isResizing, setIsResizing] = useState(false)
  const [isDraggingFile, setIsDraggingFile] = useState(false)
  const [isHovered, setIsHovered] = useState(false)
  const [isSearchFocused, setIsSearchFocused] = useState(false) // 添加搜索框激活状态
  const isCollapsible = true
  const sidebarRef = useRef<HTMLDivElement>(null)
  const contentRef = useRef<HTMLDivElement>(null) // 添加内容区域 ref
  // const footerRef = useRef<HTMLDivElement>(null) // Footer 引用
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // 简化展开逻辑：只要鼠标在侧边栏内、正在调整大小或搜索框激活，就保持展开
  const isSidebarActive = isHovered || isResizing || isSearchFocused
  const targetWidth = isCollapsible && !isSidebarActive ? COLLAPSED_WIDTH : width
  const isCollapsed = isCollapsible && !isSidebarActive

  // 用于控制内部内容的收起/展开，默认为 isCollapsed 的初始值
  const [isInternalCollapsed, setIsInternalCollapsed] = useState(isCollapsed)

  // 按频率排序，按搜索过滤
  const filteredApps = apps
    // 确保 app.name 存在，并且 searchQuery 至少是空字符串
    .filter((app) => 
        (app.name ?? '').toLowerCase().includes(searchQuery.toLowerCase())
    )
    // 排序逻辑保持不变
    .sort((a, b) => b.launchCount - a.launchCount)

  // 控制内部内容切换的 useEffect
  useEffect(() => {
    if (isCollapsed) {
      // 收缩时：等待 100ms，在宽度开始收缩后，再隐藏内部内容，减少卡顿感
      const timer = setTimeout(() => {
        setIsInternalCollapsed(true)
      }, 100) 
      return () => clearTimeout(timer)
    } else {
      // 展开时：立即显示内部内容
      setIsInternalCollapsed(false)
    }
    return 
  }, [isCollapsed])

  // 处理鼠标进入
  // const handleContentMouseEnter = useCallback((e: React.MouseEvent) => {
  //   // 着鸡毛给我真萌了，这啥呀 逻辑都快写成一坨屎了。。。
  //   // 如果侧边栏当前处于收起状态（!isSidebarActive），
  //   // 并且鼠标进入的元素是 Footer 区域或其子元素，则忽略此次 onMouseEnter 事件。
  //   // 使用 !isHovered 来近似判断当前是否处于收起状态
    
  //   // 如果鼠标进入的是 Footer 区域，且当前侧栏不是悬停状态，则不触发展开
  //   const isMovingWithinSidebar = sidebarRef.current && e.relatedTarget instanceof Node && sidebarRef.current.contains(e.relatedTarget)

  //   if ( isMovingWithinSidebar ) {
  //     return
  //   }

  //   if (hoverTimeoutRef.current) {
  //     clearTimeout(hoverTimeoutRef.current)
  //   }
  //   setIsHovered(true)
  // }, [isHovered])
  
  const handleContentMouseEnter = useCallback(() => {
    // 鼠标进入时，立即停止任何收缩延迟，并设置悬停状态
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current)
    }
    setIsHovered(true)
  }, [])

  // 处理鼠标离开
  // const handleContentMouseLeave = useCallback((e: React.MouseEvent) => {
  //   // 只有当鼠标实际离开整个侧边栏（不仅仅是移到子元素）时，才开始收缩延迟
  //   const relatedTarget = e.relatedTarget as Node | null
  //   if (!sidebarRef.current || !relatedTarget || !sidebarRef.current.contains(relatedTarget)) {
  //       if (hoverTimeoutRef.current) {
  //         clearTimeout(hoverTimeoutRef.current)
  //       }
  //       hoverTimeoutRef.current = setTimeout(() => {
  //         // 只有在没有调整大小且搜索框不聚焦时才收缩
  //         if (!isResizing && !isSearchFocused) { 
  //           setIsHovered(false)
  //         }
  //       }, COLLAPSE_DELAY)
  //   }
  // }, [isResizing, isSearchFocused])
  // 处理鼠标离开整个侧边栏 (包括 content 和 footer)
  const handleContentMouseLeave = useCallback((e: React.MouseEvent) => {
    // 只有当鼠标实际离开整个侧边栏时，才开始收缩延迟
    const relatedTarget = e.relatedTarget
    
    // 关键修复: 检查 relatedTarget 是否存在，以及它是否不在 sidebar 内部。
    const isLeavingSidebar = (
    !sidebarRef.current || 
    !(relatedTarget instanceof Node) || // 确保它是一个 Node
    !sidebarRef.current.contains(relatedTarget) // 确保它不在侧边栏内
  );

  if (isLeavingSidebar) {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current)
    }
    
    hoverTimeoutRef.current = setTimeout(() => {
      // 只有在没有调整大小且搜索框不聚焦时才收缩
      if (!isResizing && !isSearchFocused) { 
        setIsHovered(false)
      }
    }, COLLAPSE_DELAY)
  }
}, [isResizing, isSearchFocused])

  // 鼠标进入页脚：设置状态，确保 isHovered 为 true（通过主 onMouseEnter/onMouseLeave 维护）
  // const handleFooterMouseEnter = useCallback(() => {
  //   // setIsFooterHovered(true)
  //   // 进入 Footer 时，如果正在收缩，应该立即停止收缩
  //   if (hoverTimeoutRef.current) {
  //     clearTimeout(hoverTimeoutRef.current)
  //   }
  //   // setIsHovered(true)
  // }, [])

  // const handleFooterMouseLeave = useCallback(() => {
  //   hoverTimeoutRef.current = setTimeout(() => {
  //         setIsHovered(false)
  //       }, COLLAPSE_DELAY)

  //   // setIsFooterHovered(false)
  //   // 鼠标离开页脚后，如果同时离开了整个侧边栏，则开始收缩。
  //   // 由于主 onMouseLeave 绑定在父级 div，它会处理整个侧边栏的离开，所以无需额外操作。
  // }, [])

  useEffect(() => {
    return () => {
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current)
      }
    }
  }, [])

  // 启动应用
  const handleLaunch = async (app: AppData, e: React.MouseEvent) => {
    e.stopPropagation()
    setLaunchingApp(app.id)

    try {
      // 使用 Electron IPC 调用 C++ 原生模块
      if (window.electronAPI) {
        // 调用核心
        await onLaunchApp(app)

      } else {
        console.warn('Electron API 不可用，无法启动应用')
      }

    } catch (error) {
      console.error(`启动应用 ${app.name} 时发生错误:`, error)

    } finally {
      setTimeout(() => setLaunchingApp(null), 1000)
    }
  }

  // 终止应用
  const handleTerminate = async (app: AppData, e: React.MouseEvent) => {
    e.stopPropagation()
    
    try {
      if (window.electronAPI) {
        // 调用核心
        await onStopApp(app)

      }
    } catch (error) {
      console.error(`终止应用 ${app.name} 时发生错误:`, error)
    }
  }

  const startResizing = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    setIsResizing(true)
  }, [])

  const stopResizing = useCallback(() => {
    setIsResizing(false)
  }, [])

  const resize = useCallback(
    (e: MouseEvent) => {
      if (isResizing && sidebarRef.current) {
        const newWidth = e.clientX - sidebarRef.current.getBoundingClientRect().left
        if (newWidth >= MIN_WIDTH && newWidth <= MAX_WIDTH) {
          setWidth(newWidth)
        }
      }
    },
    [isResizing],
  )

  useEffect(() => {
    if (isResizing) {
      window.addEventListener("mousemove", resize)
      window.addEventListener("mouseup", stopResizing)
    }

    return () => {
      window.removeEventListener("mousemove", resize)
      window.removeEventListener("mouseup", stopResizing)
    }
  }, [isResizing, resize, stopResizing])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    // 检查是否是文件拖放
    if (e.dataTransfer.types.includes("Files")) {
      setIsDraggingFile(true)
    }
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDraggingFile(false)
  }, [])

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
      setIsDraggingFile(false)

      const files = e.dataTransfer.files
      if (files.length > 0) {
        const file = files[0]
        if (file.name.endsWith(".exe") || file.type === "application/x-msdownload") {
          const path = (file as any).path || file.name
          const name = file.name.replace(/\.exe$/i, "")
          onFileDrop(path, name)
        }
      }
    },
    [onFileDrop],
  )

  // 获取应用状态显示文本
  const getStatusDisplay = (appId: string) => {
    const status = Boolean(AppStatus.get(appId)) 
    
    if (status) {
      return '运行中'
    } else {
      return '未运行'
    }

  }

  return (
    <TooltipProvider delayDuration={0}>
      <div
        ref={sidebarRef}
        className={cn(
          "relative flex h-full shrink-0 border-r border-border bg-sidebar",
          "transition-[width] duration-300 ease-in-out",
          isDraggingFile && "ring-2 ring-primary ring-inset bg-primary/5",
        )}
        style={{ width: `${targetWidth}px`, willChange: 'width'}}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onMouseLeave={handleContentMouseLeave}
      >
        {isDraggingFile && (
          <div className="absolute inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
            <div className="flex flex-col items-center gap-2 text-primary">
              <Plus className="h-12 w-12 animate-pulse" />
              <span className="text-lg font-medium">释放以添加应用</span>
            </div>
          </div>
        )}

        <div className="flex flex-1 flex-col overflow-hidden">
          <div
            ref={contentRef}
            className="flex flex-1 flex-col overflow-hidden"
            onMouseEnter={handleContentMouseEnter}
            // onMouseLeave={handleContentMouseLeave}
          >
          {/* Header */}
          <div className={cn("border-b border-border px-4 py-3 transition-all duration-300")}>
            <div
              className={cn(
                "flex items-center transition-all duration-300 h-8",
                // 使用 isInternalCollapsed 控制 Logo 的居中对齐
                isInternalCollapsed ? "justify-center" : "gap-2",
              )}
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary shrink-0">
                <Carrot className="h-4 w-4 text-primary-foreground" />
              </div>

              <span className={cn(
                  "text-lg font-semibold text-foreground whitespace-nowrap transition-all duration-300 overflow-hidden",
                  // 使用 isInternalCollapsed 控制文本的隐藏/显示
                  isInternalCollapsed ? "opacity-0 w-0" : "opacity-100 w-auto",
                )}>Radish GameTools</span>
            </div>

            {/* 添加一个 div 来填充 logo 和搜索框之间的空间 */}
            <div className={cn("transition-all duration-300", isInternalCollapsed ? "h-0 mt-3" : "h-0 mt-4")} />

            <div className="relative">
              {isInternalCollapsed ? (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="w-full h-10 hover:bg-accent"
                        onClick={() => {
                          setIsSearchFocused(true)
                          setIsHovered(true)
                        }}
                      >
                        <Search className="h-4 w-4 text-muted-foreground" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="right">搜索应用</TooltipContent>
                  </Tooltip>
                ) : (
                  <div className="relative transition-all duration-300">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      placeholder="搜索应用..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      onFocus={() => setIsSearchFocused(true)}
                      onBlur={() => setIsSearchFocused(false)}
                      className="pl-9 bg-muted/50 border-border"
                    />
                  </div>
                )}
            </div>
          </div>

          {/* App List */}
          <div className="flex-1 overflow-hidden"
          // onMouseEnter={handleContentMouseEnter} 
          
          >
            <div className={cn(
                "px-4 transition-all duration-300 overflow-hidden",
                // 使用 isInternalCollapsed 控制列表标题的隐藏
                isInternalCollapsed ? "h-0 py-0 opacity-0" : "h-auto py-2 opacity-100",
              )}>

              <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                应用列表 ({filteredApps.length})
              </span>

            </div>
            {/* 使用 isInternalCollapsed 控制 ScrollArea 的高度和内边距 */}
            <ScrollArea className={cn("h-[calc(100%-2rem)]", isInternalCollapsed && "h-full")}>
              <div className={cn("space-y-1 pb-4 transition-all duration-300", isInternalCollapsed ? "px-2 py-2" : "px-2")}>
                {filteredApps.map((app) => {
                  const status = AppStatus.get(app.id)
                  const isRunning = Boolean(status)

                  if (isInternalCollapsed) {
                    return (
                      <Tooltip key={app.id}>
                        <TooltipTrigger asChild>
                          <button
                            onClick={() => onSelectApp(app)}
                            className={cn(
                              "flex w-full items-center justify-center rounded-lg p-2 transition-colors",
                              "hover:bg-accent",
                              selectedApp?.id === app.id && "bg-accent",
                            )}
                          >
                            <AppIcon icon_default={app.icon_default} icon={app.icon} color={app.color} size="md" />
                          </button>
                        </TooltipTrigger>
                        <TooltipContent side="right" className="flex items-center gap-2">
                          <span>{app.name}</span>
                          {isRunning && <span className="text-green-500 text-xs">(运行中)</span>}
                        </TooltipContent>
                      </Tooltip>
                    )
                  }
                  
                  return (
                    <div
                      key={app.id}
                      onClick={() => onSelectApp(app)}
                      className={cn(
                        "flex w-full items-center gap-3 rounded-lg p-3 text-left transition-colors",
                        "hover:bg-accent",
                        selectedApp?.id === app.id && "bg-accent",
                      )}
                    >
                      <AppIcon icon_default={app.icon_default} icon={app.icon} color={app.color} size="md" />
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-foreground truncate">{app.name}</div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                          <Clock className="h-3 w-3 shrink-0" />
                          
                          <span className={cn(
                              "truncate", 
                              isRunning ? "text-green-500": "text-muted-foreground"
                            )}>
                              {getStatusDisplay(app.id)}

                            </span>

                          <span className="text-muted-foreground/50">•</span>
                          <span className="shrink-0">{app.launchCount} 次</span>
                        </div>
                      </div>
                      <div className="flex gap-1">
                        {isRunning ? (
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 shrink-0 text-red-500 hover:text-red-600 hover:bg-red-500/10"
                            onClick={(e) => handleTerminate(app, e)}
                            title="终止应用"
                          >
                            <div className="h-2 w-2 bg-red-500 rounded-full" />
                          </Button>
                        ) : (
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 shrink-0 text-muted-foreground hover:text-primary hover:bg-primary/10"
                            onClick={(e) => handleLaunch(app, e)}
                            disabled={launchingApp === app.id}
                            title="启动应用"
                          >
                            <Play className={cn("h-4 w-4", launchingApp === app.id && "animate-pulse")} />
                            <span className="sr-only">启动 {app.name}</span>
                          </Button>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </ScrollArea>
          </div>
        </div>

          {/* Footer */}
          <div
            // ref={footerRef} // 将引用添加到 Footer 元素
            className={cn("border-t border-border transition-all duration-300", isInternalCollapsed ? "p-2" : "p-4")}
            onMouseEnter={() => {
                if (hoverTimeoutRef.current) {
                    clearTimeout(hoverTimeoutRef.current)
                }
                // 不设置 setIsHovered(true)，让它只在 Content 区域设置。
            }} 
            // onMouseEnter={handleFooterMouseEnter}
            // onMouseLeave={handleFooterMouseLeave}
          >
            <div
              className={cn("flex transition-all duration-300", isInternalCollapsed ? "flex-col items-center gap-2" : "gap-2")}
            >
              {isInternalCollapsed ? (
                <>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="outline"
                        size="icon"
                        className="border-border hover:bg-accent bg-transparent"
                        onClick={onAddAppClick}
                      >
                        <Plus className="h-4 w-4" />
                        <span className="sr-only">添加应用</span>
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="right">添加应用</TooltipContent>
                  </Tooltip>

                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="ghost" size="icon" className="hover:bg-accent" onClick={onSettingsClick}>
                        <Radar className="h-4 w-4" />
                        <span className="sr-only">系统导入</span>
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="right">系统导入</TooltipContent>
                  </Tooltip>

                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="ghost" size="icon" className="hover:bg-accent" onClick={onSettingsClick}>
                        <Settings className="h-4 w-4" />
                        <span className="sr-only">设置</span>
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="right">设置</TooltipContent>
                  </Tooltip>
                </>
              ) : (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 border-border hover:bg-accent bg-transparent"
                    onClick={onAddAppClick}
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    添加应用
                  </Button>
                  <Button variant="ghost" size="icon" className="hover:bg-accent" onClick={onSettingsClick}>
                    <Radar className="h-4 w-4" />
                    <span className="sr-only">系统导入</span>
                  </Button>
                  <Button variant="ghost" size="icon" className="hover:bg-accent" onClick={onSettingsClick}>
                    <Settings className="h-4 w-4" />
                    <span className="sr-only">设置</span>
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Resize Handle */}
        {!isCollapsed && (
          <div
            className={cn(
              "absolute right-0 top-0 h-full w-1 cursor-col-resize group",
              "hover:bg-primary/50 transition-colors",
              isResizing && "bg-primary",
            )}
            onMouseDown={startResizing}
          >
            <div
              className={cn(
                "absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2",
                "flex h-8 w-4 items-center justify-center rounded-sm",
                "opacity-0 group-hover:opacity-100 transition-opacity",
                isResizing && "opacity-100",
              )}
            >
              <GripVertical className="h-4 w-4 text-muted-foreground" />
            </div>
          </div>
        )}
      </div>
    </TooltipProvider>
  )
}

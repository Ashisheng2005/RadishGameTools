//  <reference path="../types/electron.d.ts" />

import type React from "react"
import { useState, useRef, useCallback, useEffect } from "react"
import { FolderOpen, Plus, X, FileIcon, Upload, Tag } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { defaultIconMap, NewAppData, AppConfig } from "@shared/types"
import { findAppIcon } from "./function/iconfinder"


// 图标映射
const CATEGORY_ICONS: Record<string, string> = defaultIconMap


interface AddAppDialogProps {
  open: boolean
  config: AppConfig,
  onOpenChange: (open: boolean) => void
  onAdd: (app: NewAppData) => void
  initialPath?: string
  initialName?: string
}

function getElectronAPI() {
  if (typeof window !== "undefined" && window.electronAPI?.isElectron) {
    return window.electronAPI
  }
  return null
}

export function AddAppDialog({ open, config,  onOpenChange, onAdd, initialPath = "", initialName = "" }: AddAppDialogProps) {
  const [name, setName] = useState(initialName)
  const [executablePath, setExecutablePath] = useState(initialPath)
  const [category, setCategory] = useState("")
  const [customCategory, setCustomCategory] = useState("")
  const [showCustomInput, setShowCustomInput] = useState(false)
  const [customCategories, setCustomCategories] = useState<Array<{ value: string; label: string; color: string }>>([])
  const [description, setDescription] = useState("")
  const [isDragging, setIsDragging] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  // const [iconPaht, setIconPath] = useState<string | null>(null);

  const DEFAULT_CATEGORIES = config.categories || []

  const dropZoneRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // 当 initialPath 或 initialName 改变时更新状态
  useEffect(() => {
    if (initialPath) setExecutablePath(initialPath)
    if (initialName) setName(initialName)
  }, [initialPath, initialName])

  // 重置表单
  const resetForm = useCallback(() => {
    setName("")
    setExecutablePath("")
    setCategory("")
    setCustomCategory("")
    setShowCustomInput(false)
    setDescription("")
    setErrors({})
  }, [])

  // 关闭时重置
  useEffect(() => {
    if (!open) {
      resetForm()
    }
  }, [open, resetForm])

  // 从路径提取应用名称
  const extractAppName = (path: string): string => {
    const fileName = path.split(/[/\\]/).pop() || ""
    return fileName.replace(/\.exe$/i, "")
  }

  // 处理拖放
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }, [])

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
      setIsDragging(false)

      const files = e.dataTransfer.files
      if (files.length > 0) {
        const file = files[0]

        if (file.name.endsWith(".exe") || file.type === "application/x-msdownload") {
          const filePath = (file as any).path as string | undefined

          if (filePath) {
            setExecutablePath(filePath)
            setErrors((prev) => ({ ...prev, path: "" }))

            if (!name) {
              setName(extractAppName(filePath))
            }
          } else {
            const electronAPI = getElectronAPI()
            if (electronAPI?.getFilePath) {
              const path = electronAPI.getFilePath(file)
              if (path) {
                setExecutablePath(path)
                setErrors((prev) => ({ ...prev, path: "" }))
                if (!name) {
                  setName(extractAppName(path))
                }
                return
              }
            }

            // 都获取不到时设置文件名，让用户补全路径
            if (!name) {
              setName(extractAppName(file.name))
            }
            setErrors((prev) => ({
              ...prev,
              path: "无法自动获取完整路径，请手动输入",
            }))
          }
        } else {
          setErrors((prev) => ({ ...prev, path: "请拖入 .exe 可执行文件" }))
        }
      }
    },
    [name],
  )

  const handleBrowse = async () => {
    const electronAPI = getElectronAPI()

    if (electronAPI?.openFileDialog) {
      try {
        const result = await electronAPI.openFileDialog({
          filters: [
            { name: "可执行文件", extensions: ["exe"] },
            { name: "所有文件", extensions: ["*"] },
          ],
          properties: ["openFile"],
        })

        if (!result.canceled && result.filePaths?.[0]) {
          const filePath = result.filePaths[0]
          setExecutablePath(filePath)
          setErrors((prev) => ({ ...prev, path: "" }))

          if (!name) {
            setName(extractAppName(filePath))
          }
        }
      } catch (err) {
        console.error("打开文件对话框失败:", err)
        fileInputRef.current?.click()
      }
    } else {
      // 非 Electron 环境使用标准 HTML input
      fileInputRef.current?.click()
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      // Electron 环境下 file.path 包含完整路径
      const filePath = (file as any).path as string | undefined

      if (filePath) {
        setExecutablePath(filePath)
        setErrors((prev) => ({ ...prev, path: "" }))
      }

      if (!name) {
        setName(extractAppName(file.name))
      }
    }
    // 重置 input 以便可以重复选择同一文件
    e.target.value = ""
  }

  // 添加自定义类型
  const handleAddCustomCategory = () => {
    if (customCategory.trim()) {
      const newCategory = {
        value: `custom_${Date.now()}`,
        label: customCategory.trim(),
        color: "#6B7280",
      }
      setCustomCategories([...customCategories, newCategory])
      setCategory(newCategory.value)
      setCustomCategory("")
      setShowCustomInput(false)
    }
  }

  // 验证表单
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {}

    if (!name.trim()) {
      newErrors.name = "请输入应用名称"
    }

    if (!executablePath.trim()) {
      newErrors.path = "请选择或输入可执行文件路径"
    } else if (!executablePath.toLowerCase().endsWith(".exe")) {
      newErrors.path = "路径必须指向 .exe 文件"
    }

    if (!category) {
      newErrors.category = "请选择应用类型"
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  // 提交表单
  const handleSubmit = async () => {
    if (!validateForm()) return

    const allCategories = [...DEFAULT_CATEGORIES, ...customCategories]
    const selectedCategory = allCategories.find((c) => c.value === category)
    let finalIconPath: string | undefined = undefined

    // 查找图标
    try{
      const iconResult = await findAppIcon(executablePath)

      if(iconResult.found){
        finalIconPath = iconResult.iconPath!
        // setIconPath(iconResult.iconPath!)
        window.electronAPI.loggerInfo("icon finder", `Found icon for ${iconResult.iconPath}, source: ${iconResult.source}`)
        // console.log(`找到图标，来源: ${iconResult.source}`)
        } else {
          window.electronAPI.loggerInfo("icon finder", `No icon found for ${executablePath}, using default icon`) 
          // Logger.info("icon finder", `No icon found for ${executablePath}, using default icon`)
          // console.log("未找到图标，使用默认图标")
        }

    } catch(error){
      console.error("查找图标时出错:", error)
    }

    window.electronAPI.loggerInfo("add app", `Adding app: ${name}, path: ${executablePath}, icon: ${finalIconPath || "default"}, icon_default: ${!Boolean(finalIconPath)}`)
    // 调用回调添加应用
    onAdd({
      name: name.trim(),
      executablePath: executablePath.trim(),
      category,
      customCategory: selectedCategory?.label || category,
      description: description.trim() || `${selectedCategory?.label || "应用"}`,
      icon_default: !Boolean(finalIconPath),
      icon: finalIconPath ||  CATEGORY_ICONS[category] || "app",
      color: selectedCategory?.color || "#6B7280",
    })

    onOpenChange(false)
  }

  const allCategories = [...DEFAULT_CATEGORIES, ...customCategories]
  const electronAPI = getElectronAPI()

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] bg-card border-border">
        <DialogHeader>
          <DialogTitle className="text-xl flex items-center gap-2">
            <Plus className="h-5 w-5 text-primary" />
            添加新应用
          </DialogTitle>
          <DialogDescription>添加一个新的应用程序到启动器，支持拖放 .exe 文件快速添加</DialogDescription>
        </DialogHeader>

        <div className="grid gap-5 py-4">
          {/* 拖放区域 */}
          <div
            ref={dropZoneRef}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={cn(
              "relative border-2 border-dashed rounded-lg p-6 transition-all cursor-pointer",
              "flex flex-col items-center justify-center gap-2 text-center",
              isDragging ? "border-primary bg-primary/10" : "border-border hover:border-muted-foreground/50",
              errors.path && !executablePath && "border-destructive",
            )}
            onClick={handleBrowse}
          >
            <Upload
              className={cn("h-8 w-8 transition-colors", isDragging ? "text-primary" : "text-muted-foreground")}
            />
            <div className="text-sm">
              <span className="font-medium">拖放 .exe 文件到此处</span>
              <span className="text-muted-foreground"> 或 </span>
              <span className="text-primary font-medium">点击选择文件</span>
            </div>
            <p className="text-xs text-muted-foreground">
              {electronAPI ? "支持拖放和文件选择" : "选择后请手动补全路径"}
            </p>
            <input
              ref={fileInputRef}
              type="file"
              accept=".exe"
              onChange={handleFileChange}
              className="hidden"
              onClick={(e) => e.stopPropagation()}
            />
          </div>

          {/* 软件路径 */}
          <div className="space-y-2">
            <Label htmlFor="path" className="text-sm font-medium">
              软件路径 <span className="text-destructive">*</span>
            </Label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <FileIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="path"
                  value={executablePath}
                  onChange={(e) => {
                    setExecutablePath(e.target.value)
                    if (errors.path) {
                      setErrors((prev) => ({ ...prev, path: "" }))
                    }
                  }}
                  placeholder="C:\Program Files\App\app.exe"
                  className={cn(
                    "pl-9 bg-muted/50 border-border font-mono text-sm",
                    errors.path && "border-destructive",
                  )}
                />
              </div>
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={handleBrowse}
                className="shrink-0 border-border hover:bg-accent bg-transparent"
                title="浏览文件"
              >
                <FolderOpen className="h-4 w-4" />
              </Button>
            </div>
            {errors.path && <p className="text-xs text-destructive">{errors.path}</p>}
          </div>

          {/* 软件名称 */}
          <div className="space-y-2">
            <Label htmlFor="name" className="text-sm font-medium">
              软件名称 <span className="text-destructive">*</span>
            </Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => {
                setName(e.target.value)
                if (errors.name) {
                  setErrors((prev) => ({ ...prev, name: "" }))
                }
              }}
              placeholder="例如: Visual Studio Code"
              className={cn("bg-muted/50 border-border", errors.name && "border-destructive")}
            />
            {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
          </div>

          {/* 软件类型 */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">
              软件类型 <span className="text-destructive">*</span>
            </Label>
            <div className="flex gap-2">
              <Select
                value={category}
                onValueChange={(val) => {
                  setCategory(val)
                  if (errors.category) {
                    setErrors((prev) => ({ ...prev, category: "" }))
                  }
                }}
              >
                <SelectTrigger
                  className={cn("flex-1 bg-muted/50 border-border", errors.category && "border-destructive")}
                >
                  <SelectValue placeholder="选择软件类型" />
                </SelectTrigger>
                <SelectContent className="bg-popover border-border">
                  {allCategories.map((cat) => (
                    <SelectItem key={cat.value} value={cat.value}>
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: cat.color }} />
                        {cat.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => setShowCustomInput(!showCustomInput)}
                className="shrink-0 border-border hover:bg-accent"
                title="添加自定义类型"
              >
                <Tag className="h-4 w-4" />
              </Button>
            </div>
            {errors.category && <p className="text-xs text-destructive">{errors.category}</p>}

            {/* 自定义类型输入 */}
            {showCustomInput && (
              <div className="flex gap-2 mt-2">
                <Input
                  value={customCategory}
                  onChange={(e) => setCustomCategory(e.target.value)}
                  placeholder="输入自定义类型名称"
                  className="flex-1 bg-muted/50 border-border"
                  onKeyDown={(e) => e.key === "Enter" && handleAddCustomCategory()}
                  autoFocus
                />
                <Button type="button" size="sm" onClick={handleAddCustomCategory} disabled={!customCategory.trim()}>
                  添加
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setShowCustomInput(false)
                    setCustomCategory("")
                  }}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            )}

            {/* 已添加的自定义类型标签 */}
            {customCategories.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {customCategories.map((cat) => (
                  <Badge
                    key={cat.value}
                    variant="secondary"
                    className="text-xs cursor-pointer hover:bg-destructive/20"
                    onClick={() => {
                      setCustomCategories(customCategories.filter((c) => c.value !== cat.value))
                      if (category === cat.value) setCategory("")
                    }}
                  >
                    {cat.label}
                    <X className="h-3 w-3 ml-1" />
                  </Badge>
                ))}
              </div>
            )}
          </div>

          {/* 描述（可选） */}
          <div className="space-y-2">
            <Label htmlFor="description" className="text-sm font-medium">
              描述 <span className="text-muted-foreground text-xs">(可选)</span>
            </Label>
            <Input
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="简短描述这个应用的用途"
              className="bg-muted/50 border-border"
            />
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="border-border hover:bg-accent"
          >
            取消
          </Button>
          <Button type="button" onClick={handleSubmit}>
            <Plus className="h-4 w-4 mr-2" />
            添加应用
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

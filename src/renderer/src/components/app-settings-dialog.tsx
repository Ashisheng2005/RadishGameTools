"use client"

import { useState, useEffect } from "react"
import { Settings, Trash2, FolderOpen, ImageIcon, Tag, Save, X} from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
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
import { Badge } from "@/components/ui/badge"
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
import { AppIcon } from "@/components/app-icon"
import type { AppData, AppConfig} from "@shared/types"
import { cn } from "@/lib/utils"

interface AppSettingsDialogProps {
  open: boolean
  config: AppConfig,
  onOpenChange: (open: boolean) => void
  app: AppData
  onSave: (updatedApp: AppData) => void
  onDelete: (appId: string) => void
}

export function AppSettingsDialog({ open, config, onOpenChange, app, onSave, onDelete }: AppSettingsDialogProps) {
  const [name, setName] = useState(app.name)
  const [executablePath, setExecutablePath] = useState(app.executablePath)
  const [iconPath, setIconPath] = useState("")
  const [category, setCategory] = useState(app.category || "")
  const [color, setColor] = useState(app.color)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [customCategories, setCustomCategories] = useState<Array<{ value: string; label: string; color: string }>>([])
  const [showCustomInput, setShowCustomInput] = useState(false)
  const [customCategory, setCustomCategory] = useState("")
  // 获取配置中定义的软件类型
  const DEFAULT_CATEGORIES = config.categories || []

  const allCategories = [...DEFAULT_CATEGORIES, ...customCategories]

  useEffect(() => {
    setName(app.name)
    setExecutablePath(app.executablePath)
    setCategory(app.category || "")
    setColor(app.color)
    setIconPath(app.icon_default ? "" : app.icon)
  }, [app])

  const handleBrowsePath = async () => {
    if (window.electronAPI?.isElectron) {
      try {
        const result = await window.electronAPI.openFileDialog({
          filters: [
            { name: "可执行文件", extensions: ["exe"] },
            { name: "所有文件", extensions: ["*"] },
          ],
          properties: ["openFile"],
        })
        if (!result.canceled && result.filePaths.length > 0) {
          setExecutablePath(result.filePaths[0])
        }
      } catch (error) {
        window.electronAPI.loggerError('app-setting-dialog', "open app info fail:", error)
        // console.error("打开文件对话框失败:", error)
      }
    }
  }

  const handleBrowseIcon = async () => {
    if (window.electronAPI?.isElectron) {
      try {
        const result = await window.electronAPI.openFileDialog({
          filters: [
            { name: "图片文件", extensions: ["png", "jpg", "jpeg", "ico", "svg"] },
            { name: "所有文件", extensions: ["*"] },
          ],
          properties: ["openFile"],
        })
        if (!result.canceled && result.filePaths.length > 0) {
          setIconPath(result.filePaths[0])
        }
      } catch (error) {
        window.electronAPI.loggerError('app-setting-dialog', "open app info fail:", error)
        // console.error("打开文件对话框失败:", error)
      }
    }
  }

  const handleSave = () => {
    const updatedApp: AppData = {
      ...app,
      name,
      executablePath,
      category,
      color,
    }
    onSave(updatedApp)
    onOpenChange(false)
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

  const handleDelete = () => {
    onDelete(app.id)
    onOpenChange(false)
  }

  const presetColors = [
    "#007ACC",
    "#4285F4",
    "#1DB954",
    "#F24E1E",
    "#4A154B",
    "#333333",
    "#E91E63",
    "#FF9800",
    "#00BCD4",
    "#9C27B0",
  ]

  return (  
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[618px] w-[100vw] max-h-[85vh] overflow-y-auto bg-background border-border [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-foreground">
            <Settings className="h-5 w-5" />
            应用设置
          </DialogTitle>
          <DialogDescription>
            修改 <span className="font-medium text-foreground">{app.name}</span> 的配置信息
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-5 py-4 ">
          {/* Preview */}
          <div className="flex items-center gap-4 p-4 rounded-lg bg-muted/30 border border-border">
            <AppIcon icon_default={app.icon_default} icon={app.icon} color={color} size="lg" />
            <div className="flex-1 min-w-0">
              <p className="font-medium text-foreground truncate">{name || "未命名应用"}</p>
              <p className="text-sm text-muted-foreground truncate max-w-[200px] sm:max-w-[300px]">{executablePath || "未设置路径"}</p>
            </div>
          </div>

          {/* Name */}
          <div className="grid gap-2">
            <Label htmlFor="app-name">应用名称</Label>
            <Input
              id="app-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="输入应用名称"
              className="bg-muted/50 border-border"
            />
          </div>

          {/* Path */}
          <div className="grid gap-2">
            <Label htmlFor="app-path">可执行文件路径</Label>
            <div className="flex gap-2">
              <div className="flex-1 min-w-0">
                <Input
                  id="app-path"
                  value={executablePath}
                  onChange={(e) => setExecutablePath(e.target.value)}
                  placeholder="C:\Program Files\..."
                  className="w-full bg-muted/50 border-border truncate max-w-[70ch]"
                  title={executablePath}
                />
              </div>
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={handleBrowsePath}
                className="shrink-0 border-border bg-transparent"
              >
                <FolderOpen className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Icon Path */}
          <div className="grid gap-2">
            <Label htmlFor="icon-path">自定义图标路径（可选）</Label>
            <div className="flex gap-2">
              <div className="flex-1 min-w-0">
                <Input
                  id="icon-path"
                  value={iconPath}
                  onChange={(e) => setIconPath(e.target.value)}
                  placeholder="留空使用默认图标"
                  className="w-full bg-muted/50 border-border truncate max-w-[70ch]"
                  title={iconPath}
                />
              </div>
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={handleBrowseIcon}
                className="shrink-0 border-border bg-transparent"
              >
                <ImageIcon className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Category */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">
              软件类型 
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

          {/* Color Picker */}
          <div className="grid gap-2">
            <Label>主题颜色</Label>
            <div className="flex flex-wrap gap-2">
              {presetColors.map((presetColor) => (
                <button
                  key={presetColor}
                  type="button"
                  className={`h-8 w-8 rounded-full border-2 transition-all ${
                    color === presetColor ? "border-foreground scale-110" : "border-transparent"
                  }`}
                  style={{ backgroundColor: presetColor }}
                  onClick={() => setColor(presetColor)}
                />
              ))}
              <Input
                type="color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="h-8 w-8 p-0 border-0 cursor-pointer"
              />
            </div>
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" className="sm:mr-auto">
                <Trash2 className="h-4 w-4 mr-2" />
                删除应用
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent className="bg-background border-border">
              <AlertDialogHeader>
                <AlertDialogTitle>确认删除？</AlertDialogTitle>
                <AlertDialogDescription>
                  此操作将删除 <span className="font-medium">{app.name}</span> 及其所有运行记录，且无法撤销。
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel className="border-border">取消</AlertDialogCancel>
                <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
                  确认删除
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          <Button variant="outline" onClick={() => onOpenChange(false)} className="border-border">
            取消
          </Button>
          <Button onClick={handleSave}>
            <Save className="h-4 w-4 mr-2" />
            保存更改
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

"use client"

import type React from "react"

import { Play, Clock, Zap, Search, Plus, Settings } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarFooter,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
} from "@/components/ui/sidebar"
import { AppIcon } from "@/components/app-icon"
import { formatDuration } from "@/lib/utils"
import type { AppData } from "@shared/types"
import { useState } from "react"

interface AppSidebarProps {
  apps: AppData[]
  selectedApp: AppData | null
  onSelectApp: (app: AppData) => void
}

export function AppSidebar({ apps, selectedApp, onSelectApp }: AppSidebarProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [launchingApp, setLaunchingApp] = useState<string | null>(null)

  // Sort by frequency and filter by search
  const filteredApps = apps
    .filter((app) => app.name.toLowerCase().includes(searchQuery.toLowerCase()))
    .sort((a, b) => b.launchCount - a.launchCount)

  const handleLaunch = async (app: AppData, e: React.MouseEvent) => {
    e.stopPropagation()
    setLaunchingApp(app.id)

    try {
      const response = await fetch("/api/launch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ appId: app.id, executablePath: app.executablePath }),
      })

      if (!response.ok) {
        throw new Error("启动失败")
      }

      console.log(`[v0] Launched app: ${app.name}`)
    } catch (error) {
      console.error(`[v0] Failed to launch app:`, error)
    } finally {
      setTimeout(() => setLaunchingApp(null), 1000)
    }
  }

  return (
    <Sidebar className="border-r border-sidebar-border bg-sidebar">
      <SidebarHeader className="border-b border-sidebar-border p-4">
        <div className="flex items-center gap-2 mb-4">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
            <Zap className="h-4 w-4 text-primary-foreground" />
          </div>
          <span className="text-lg font-semibold text-sidebar-foreground">App Launcher</span>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="搜索应用..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 bg-sidebar-accent border-sidebar-border text-sidebar-foreground placeholder:text-muted-foreground"
          />
        </div>
      </SidebarHeader>

      <SidebarContent className="p-2">
        <div className="mb-2 px-2">
          <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            应用列表 ({filteredApps.length})
          </span>
        </div>
        <SidebarMenu>
          {filteredApps.map((app) => (
            <SidebarMenuItem key={app.id}>
              <SidebarMenuButton
                onClick={() => onSelectApp(app)}
                isActive={selectedApp?.id === app.id}
                className="h-auto py-3 px-3 hover:bg-sidebar-accent data-[active=true]:bg-sidebar-accent"
              >
                <div className="flex w-full items-center gap-3">
                  <AppIcon icon_default={app.icon_default} icon={app.icon} color={app.color} size="md" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-sidebar-foreground truncate">{app.name}</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                      <Clock className="h-3 w-3" />
                      <span>{formatDuration(app.totalRuntime)}</span>
                      <span className="text-muted-foreground/50">•</span>
                      <span>{app.launchCount} 次</span>
                    </div>
                  </div>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8 shrink-0 text-muted-foreground hover:text-primary hover:bg-primary/10"
                    onClick={(e) => handleLaunch(app, e)}
                    disabled={launchingApp === app.id}
                  >
                    <Play className={`h-4 w-4 ${launchingApp === app.id ? "animate-pulse" : ""}`} />
                    <span className="sr-only">启动 {app.name}</span>
                  </Button>
                </div>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border p-4">
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            className="flex-1 border-sidebar-border text-sidebar-foreground hover:bg-sidebar-accent bg-transparent"
          >
            <Plus className="mr-2 h-4 w-4" />
            添加应用
          </Button>
          <Button variant="ghost" size="icon" className="text-sidebar-foreground hover:bg-sidebar-accent">
            <Settings className="h-4 w-4" />
            <span className="sr-only">设置</span>
          </Button>
        </div>
      </SidebarFooter>
    </Sidebar>
  )
}

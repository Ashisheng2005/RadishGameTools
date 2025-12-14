"use client"

import { formatDuration, formatDateTime } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import type { Session } from "@shared/types"

interface SessionHistoryProps {
  sessions: Session[]
}

export function SessionHistory({ sessions }: SessionHistoryProps) {
  const sortedSessions = [...sessions].sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime())

  return (
    <div className="space-y-2 max-h-[300px] overflow-y-auto">
      {sortedSessions.slice(0, 10).map((session) => (
        <div key={session.id} className="flex items-center justify-between rounded-lg bg-secondary/50 px-4 py-3">
          <div className="flex flex-col">
            <span className="text-sm font-medium text-foreground">{formatDateTime(session.startTime)}</span>
            <span className="text-xs text-muted-foreground">结束于 {formatDateTime(session.endTime)}</span>
          </div>
          <div className="flex items-center gap-3">
            <Badge variant="secondary" className="font-mono">
              {formatDuration(session.duration)}
            </Badge>
            <Badge
              variant={session.status === "completed" ? "default" : "destructive"}
              className={session.status === "completed" ? "bg-success text-white" : ""}
            >
              {session.status === "completed" ? "正常结束" : "异常退出"}
            </Badge>
          </div>
        </div>
      ))}
    </div>
  )
}

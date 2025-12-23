import { cn } from '@/lib/utils'
import type { WeeklyData } from '@shared/types'

interface WeeklyHeatmapProps {
  data: WeeklyData[]
}

const days = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export function WeeklyHeatmap({ data }: WeeklyHeatmapProps) {
  const maxValue = Math.max(...data.map((d) => d.value), 1)

  // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
  const getIntensity = (value: number) => {
    const ratio = value / maxValue
    if (ratio === 0) return 'bg-muted'
    if (ratio < 0.25) return 'bg-chart-1/20'
    if (ratio < 0.5) return 'bg-chart-1/40'
    if (ratio < 0.75) return 'bg-chart-1/60'
    return 'bg-chart-1'
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-7 gap-2">
        {days.map((day, index) => {
          const dayData = data.find((d) => d.day === index) || { day: index, value: 0 }
          return (
            <div key={day} className="text-center">
              <span className="text-xs text-muted-foreground">{day}</span>
              <div
                className={cn(
                  'mt-2 h-12 rounded-lg transition-colors',
                  getIntensity(dayData.value)
                )}
                title={`${day}: ${Math.round(dayData.value / 60)} 分钟`}
              />
              <span className="text-xs text-muted-foreground mt-1 block">
                {dayData.value > 0 ? `${Math.round(dayData.value / 60)}分` : '-'}
              </span>
            </div>
          )
        })}
      </div>
      <div className="flex items-center justify-end gap-2 text-xs text-muted-foreground">
        <span>少</span>
        <div className="flex gap-1">
          <div className="h-3 w-3 rounded bg-muted" />
          <div className="h-3 w-3 rounded bg-chart-1/20" />
          <div className="h-3 w-3 rounded bg-chart-1/40" />
          <div className="h-3 w-3 rounded bg-chart-1/60" />
          <div className="h-3 w-3 rounded bg-chart-1" />
        </div>
        <span>多</span>
      </div>
    </div>
  )
}

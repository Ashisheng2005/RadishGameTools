import {
  Code,
  FileText,
  Music,
  Video,
  ImageIcon,
  Globe,
  Terminal,
  Folder,
  MessageSquare,
  Mail,
  type LucideIcon,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { useEffect, useState } from "react"

const iconMap: Record<string, LucideIcon> = {
  code: Code,
  document: FileText,
  music: Music,
  video: Video,
  image: ImageIcon,
  browser: Globe,
  terminal: Terminal,
  folder: Folder,
  chat: MessageSquare,
  mail: Mail,
}

interface AppIconProps {
  icon_default: boolean,
  icon: string
  color: string
  size?: "sm" | "md" | "lg"
}

export function AppIcon({ icon_default, icon, color, size = "md" }: AppIconProps) {
  const Icon = iconMap[icon] || Code

  const sizeClasses = {
    sm: "h-8 w-8",
    md: "h-10 w-10",
    lg: "h-14 w-14",
  }

  const iconSizes = {
    sm: "h-4 w-4",
    md: "h-5 w-5",
    lg: "h-7 w-7",
  }

  const [base64Data, setBase64Data] = useState<string | null>(null)
  const [mimeType, setMimeType] = useState<string>('image/png')

  useEffect(() => {
    const checkFileExists = async () => {
      if (icon_default){
        return
      }

      const exists = await window.electronAPI.fileExists(icon)
      if (exists) {
        const result = await window.electronAPI.readIconFileAsBase64(icon)
        
        if (result.success && result.base64Data) {
            setBase64Data(result.base64Data)
            setMimeType(result.mimeType || 'image/png') // 更新 MIME 类型
            
        }else{
          // window.electronAPI.loggerInfo('app-ico', `${result.success}`)
        }
    }
      // window.electronAPI.loggerInfo("app-icon", `Icon file check for ${icon}: ${exists}`)
    }

    checkFileExists()
  }, [icon])

  return (
      icon_default ? (
        <div
          className={cn("flex items-center justify-center rounded-xl", sizeClasses[size])}
          style={{ backgroundColor: color }}
        >
        <Icon className={cn(iconSizes[size], "text-white")} />

        </div>
      ) : (
        <div className={cn("flex items-center justify-center rounded-xl", sizeClasses[size])} >
          <img
            src={`data:${mimeType};base64,${base64Data}`}
            alt="App Icon"
            className={cn("rounded-xl object-cover", sizeClasses[size])}
          />

        </div>
      )
  )

}

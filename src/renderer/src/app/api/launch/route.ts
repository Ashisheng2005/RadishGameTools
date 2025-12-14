import { type NextRequest, NextResponse } from "next/server"

// 这个API路由模拟调用C++脚本启动应用程序
// 在实际部署中，您需要使用Node.js的child_process或其他方式调用本地脚本

interface LaunchRequest {
  appId: string
  executablePath: string
}

interface LaunchRecord {
  appId: string
  startTime: string
  endTime?: string
  duration?: number
  status: "running" | "completed" | "crashed"
}

// 模拟存储运行记录
const runningApps = new Map<string, LaunchRecord>()

export async function POST(request: NextRequest) {
  try {
    const body: LaunchRequest = await request.json()
    const { appId, executablePath } = body

    // 记录启动时间
    const launchRecord: LaunchRecord = {
      appId,
      startTime: new Date().toISOString(),
      status: "running",
    }

    runningApps.set(appId, launchRecord)

    // 在实际应用中，这里会调用C++脚本来启动应用
    // 示例：使用child_process调用本地脚本
    /*
    import { spawn } from 'child_process'
    
    const launcher = spawn('./launcher.exe', [executablePath], {
      detached: true,
      stdio: 'ignore'
    })
    
    launcher.on('close', (code) => {
      const record = runningApps.get(appId)
      if (record) {
        record.endTime = new Date().toISOString()
        record.duration = (new Date(record.endTime).getTime() - new Date(record.startTime).getTime()) / 1000
        record.status = code === 0 ? 'completed' : 'crashed'
      }
    })
    */

    console.log(`[API] Launching app: ${appId} from ${executablePath}`)

    return NextResponse.json({
      success: true,
      message: `已启动 ${appId}`,
      launchTime: launchRecord.startTime,
    })
  } catch (error) {
    console.error("[API] Launch error:", error)
    return NextResponse.json({ success: false, error: "启动失败" }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const appId = searchParams.get("appId")

  if (appId) {
    const record = runningApps.get(appId)
    return NextResponse.json({ record })
  }

  return NextResponse.json({
    runningApps: Array.from(runningApps.entries()),
  })
}

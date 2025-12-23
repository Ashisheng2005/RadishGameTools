import AutoLaunch from 'auto-launch'
import { app } from 'electron'
import { Logger } from './loggerService'

// 清理旧的启动快捷方式
// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
function cleanupOldShortcuts() {
  if (process.platform === 'win32') {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const fs = require('fs')
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const path = require('path')
      const appName = app.getName()

      // 获取启动文件夹路径
      const startupPath = path.join(
        process.env.APPDATA,
        'Microsoft',
        'Windows',
        'Start Menu',
        'Programs',
        'Startup'
      )

      // 查找并删除旧的快捷方式
      const shortcutPath = path.join(startupPath, `${appName}.lnk`)
      if (fs.existsSync(shortcutPath)) {
        fs.unlinkSync(shortcutPath)
        Logger.info('auto start', `Removed old shortcut: ${shortcutPath}`)
      }
    } catch (error) {
      Logger.error('auto start', 'Failed to cleanup old shortcuts', error)
    }
  }
}

// 备用自启动设置方法
// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
function fallbackAutoStartSetup() {
  try {
    // 尝试使用 Electron 的原生方法作为备用方案, 这也是最最最最保底的方法了
    const appPath = process.execPath
    const appName = app.getName()
    Logger.warn('auto start', 'Using fallback auto-start method')

    // Windows 创建快捷方式到启动文件夹
    if (process.platform === 'win32') {
      try {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const { execSync } = require('child_process')
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const fs = require('fs')
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const path = require('path')
        // 清理旧的快捷方式
        cleanupOldShortcuts()
        // 获取启动文件夹路径
        const startupPath = path.join(
          process.env.APPDATA,
          'Microsoft',
          'Windows',
          'Start Menu',
          'Programs',
          'Startup'
        )
        // 确保启动文件夹存在
        if (!fs.existsSync(startupPath)) {
          fs.mkdirSync(startupPath, { recursive: true })
        }
        // 创建快捷方式文件路径
        const shortcutPath = path.join(startupPath, `${appName}.lnk`)

        // 使用 PowerShell 创建快捷方式
        const psCommand = `$WshShell = New-Object -ComObject WScript.Shell; $Shortcut = $WshShell.CreateShortcut("${shortcutPath}"); $Shortcut.TargetPath = "${appPath}"; $Shortcut.WorkingDirectory = "${path.dirname(appPath)}"; $Shortcut.Save()`

        execSync(`powershell -Command "${psCommand.replace(/"/g, '`"')}"`, { stdio: 'pipe' })
        Logger.info('auto start', `Created shortcut at: ${shortcutPath}`)
      } catch (error) {
        Logger.error('auto start', 'Failed to create startup shortcut', error)
      }
    }
  } catch (error) {
    Logger.error('auto start', 'Fallback auto-start setup failed', error)
  }
}

// 开启自启动，根据用户配置决定
// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export function setupAutoStart(autoLaunchAtStartup: boolean) {
  // windows 检查是否以管理员权限运行
  const isElevated = process.platform === 'win32' && process.geteuid ? false : undefined

  Logger.info(
    'auto start',
    `Setting up auto-start: ${autoLaunchAtStartup}, isElevated: ${isElevated}`
  )

  // 获取应用路径，确保路径正确
  let appPath = process.execPath
  const appName = app.getName()

  // 记录路径信息用于调试
  Logger.info('auto start', `App path: ${appPath}, App name: ${appName}`)

  // 检查路径是否包含空格或特殊字符 可能导致问题
  if (appPath.includes(' ') || appPath.includes('[') || appPath.includes(']')) {
    Logger.warn('auto start', `App path contains special characters: ${appPath}`)
    // 如果路径包含特殊字符，尝试使用短路径
    if (process.platform === 'win32') {
      try {
        // 在 Windows 上，可以尝试获取短路径
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const { execSync } = require('child_process')
        const shortPath = execSync(`cmd /c for %A in ("${appPath}") do @echo %~sA`)
          .toString()
          .trim()
        if (shortPath && shortPath !== appPath) {
          Logger.info('auto start', `Using short path: ${shortPath}`)
          appPath = shortPath
        }
      } catch (error) {
        Logger.error('auto start', 'Failed to get short path', error)
      }
    }
  }

  const autoLauncher = new AutoLaunch({
    name: appName,
    path: appPath,
    // 添加额外的选项以提高兼容性
    isHidden: false
  })
  if (autoLaunchAtStartup) {
    autoLauncher
      .isEnabled()
      .then((isEnabled) => {
        if (!isEnabled) {
          autoLauncher
            .enable()
            .then(() => {
              Logger.info('auto start', 'Auto-launch has been enabled.')
            })
            .catch((err) => {
              Logger.error('auto start', 'Failed to enable auto-launch', err)
              // 尝试使用备用方法
              fallbackAutoStartSetup()
            })
        } else {
          Logger.info('auto start', 'Auto-launch is already enabled.')
        }
      })
      .catch((err) => {
        Logger.error('auto start', 'Error checking auto-launch status', err)
        // 如果检查失败，尝试直接启用
        autoLauncher
          .enable()
          .then(() => {
            Logger.info('auto start', 'Auto-launch enabled after check error')
          })
          .catch((enableErr) => {
            Logger.error('auto start', 'Failed to enable auto-launch after check error', enableErr)
            fallbackAutoStartSetup()
          })
      })

    Logger.info('auto start', 'Auto-launch setup to enable at startup.')
  } else {
    autoLauncher
      .isEnabled()
      .then((isEnabled) => {
        if (isEnabled) {
          autoLauncher
            .disable()
            .then(() => {
              Logger.info('auto start', 'Auto-launch has been disabled.')
              // 同时清理可能存在的备用快捷方式
              cleanupOldShortcuts()
            })
            .catch((err) => {
              Logger.error('auto start', 'Failed to disable auto-launch', err)
              // 即使禁用失败，也尝试清理快捷方式
              cleanupOldShortcuts()
            })
        } else {
          Logger.info('auto start', 'Auto-launch is already disabled.')
          // 清理可能存在的备用快捷方式
          cleanupOldShortcuts()
        }
      })
      .catch((err) => {
        Logger.error('auto start', 'Error checking auto-launch status', err)
        // 即使检查失败，也尝试清理快捷方式
        cleanupOldShortcuts()
      })
  }
}

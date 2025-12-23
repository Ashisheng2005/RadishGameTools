import { app, shell, BrowserWindow, ipcMain, dialog, Tray, Menu } from 'electron'
import path from 'path'

// 强制将工作目录切换到软件安装目录
// 只有处于非开发环境下才会强制切换路劲
if (process.env.NODE_ENV !== 'development') {
  // process.execPath 是Node.js运行时环境底层API定义的，返回启动Node.js进程的可执行文件的绝对路径
  process.chdir(path.dirname(process.execPath))
}

// 需要先初始化日志
import { Logger } from './services/loggerService'
Logger.init()

import { ConfigManager } from './services/configManager'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.ico?asset'
// import { AppLauncher } from './native'
import { AppIcon } from './native'
import { dataService } from './services/dataSqlService'
// import { AppLauncher as AppLauncherNode } from './applanuch/AppLauncher'
import { AppLauncher } from './applanuch/AppLauncher'
import { AppData, AppConfig } from '../shared/types'

import { setupAutoStart } from './services/autoStartService'
import {
  extractIconFromExe,
  fileExists,
  getWindowsIcon,
  getIconFromRegistry,
  findIconInDirectory,
  readIconFileAsBase64
} from './services/iconhandlerService'

AppLauncher.getInstance()

// 跳转浏览器指定页面
ipcMain.handle('open-external-link', (_, url: string) => {
  // 这里可以直接调用 shell.openExternal
  // 或者通过 preload 脚本暴露的方法
  shell.openExternal(url)
  return true
})

// 基于child_process的启动器
ipcMain.handle('app:launch', async (_, app: AppData) => {
  try {
    // Logger.info("main.index", `test main index.ts: appp: ${app}`)
    const result = await AppLauncher.launchApp(app)
    return result
  } catch (error: unknown) {
    if (error instanceof Error) {
      return { success: false, error: error.message }
    }
    return { success: false, error: String(error) }
  }
})

// 提取缩略图到Buffer
ipcMain.handle('extrace-thumbnail', (_, filePath: string) => {
  const buffer = AppIcon.extraceThumbnail(filePath, 256)
  if (buffer) {
    return {
      found: true,
      base64Data: buffer.toString('base64')
    }
  }
  return {
    found: false
  }
})

// 提取略缩图到文件
ipcMain.handle('extrace-thumbnail-to-file', (_, filePath: string) => {
  const rootPath = process.cwd()
  const outputFileName = `icon_${Date.now()}_${path.basename(filePath, path.extname(filePath))}.png`
  const outputPath = path.join(rootPath, 'icos', outputFileName)
  Logger.info(
    'main-index',
    `windows.electronAPI.extrace-thumbnail-to-file:  ${filePath}, ${outputPath}`
  )

  const result = AppIcon.extractThumbnailToFile(filePath, outputPath, 256)
  if (result) {
    return {
      found: true,
      iconPath: outputPath
    }
  }

  return {
    found: false
  }
})

// 设置的IPC接口
ipcMain.handle('config:get', () => {
  const configManager = ConfigManager.getInstance()
  return configManager.getConfig()
})

ipcMain.handle('config:set', (_, newConfig: AppConfig) => {
  const configManager = ConfigManager.getInstance()
  configManager.updateConfig(newConfig)
})

// 日志的IPC接口
ipcMain.handle('log-message', (_, level, operation, message, metadata, tableName, entityId) => {
  // 注意：这里需要根据日志级别调用不同的方法
  switch (level) {
    case 'info':
      Logger.info(operation, message, metadata, tableName, entityId)
      break
    case 'warn':
      Logger.warn(operation, message, metadata, tableName, entityId)
      break
    case 'error':
      // 注意：错误日志的第三个参数是Error对象，但这里我们通过IPC传递的是metadata，所以需要调整
      // 或者，我们修改日志方法，使其接受一个对象，这样更容易通过IPC传递
      Logger.error(operation, message, metadata, tableName, entityId)
      break
    case 'debug':
      Logger.debug(operation, message, metadata, tableName, entityId)
      break
    default:
      Logger.info(operation, message, metadata, tableName, entityId)
  }
})

// 获取modification，如果有需要全部刷新页面的动作，modification为true， 否则为false
ipcMain.handle('app:getModification', () => {
  return AppLauncher.getModification()
})

// 终止应用
ipcMain.handle('app:terminate', (_, appId: string, force?: boolean) => {
  try {
    const result = AppLauncher.terminateApp(appId, force)
    // 如果返回布尔值，按约定包装为 { success, error }
    if (typeof result === 'boolean') {
      return { success: result, error: result ? undefined : 'terminate failed' }
    }
    // 如果已经是对象（向后兼容），直接返回
    return result
  } catch (err: unknown) {
    if (err instanceof Error) {
      return { success: false, error: err.message }
    }
    return { success: false, error: String(err) }
  }
})

// 获取应用状态
ipcMain.handle('app:getStatus', (_, appId: string) => {
  return AppLauncher.getAppStatus(appId)
})

// 获取所有运行中的应用
ipcMain.handle('app:getAllRunning', () => {
  return AppLauncher.getAllRunningApps()
})

// 获取使用统计
ipcMain.handle('app:getUsageStats', (_, appId?: string) => {
  return AppLauncher.getUsageStats(appId)
})

// 添加文件选择对话框 IPC 处理器
ipcMain.handle('dialog:openFile', async (_, options) => {
  const result = await dialog.showOpenDialog({
    title: options?.title,
    properties: options?.properties || ['openFile'],
    filters: options?.filters || [
      { name: '可执行文件', extensions: ['exe'] },
      { name: '数据文件', extensions: ['db'] },
      { name: '所有文件', extensions: ['*'] }
    ],
    defaultPath: options?.defaultPath
  })
  return result
})

// 添加文件夹选择对话框 IPC 处理器
ipcMain.handle('dialog:saveFile', async (_, options) => {
  const result = await dialog.showSaveDialog({
    title: options?.title || '选择导出位置',
    properties: options?.properties || ['openFile'],
    filters: options?.filters,
    //  || [{ name: 'SQLite Database', extensions: ['db'] }]
    defaultPath: options?.defaultPath || path.join(app.getPath('downloads'), 'backup.db')
  })
  return result
})

// 获取所有应用数据
ipcMain.handle('get-all-apps', async () => {
  return await dataService.getAllApps()
})

// 获取单个应用数据
ipcMain.handle('get-app', async (_, appId: string) => {
  return await dataService.getApp(appId)
})

// 记录应用启动
ipcMain.handle('record-app-start', async (_, appId: string, appName: string) => {
  return await dataService.recordAppStart(appId, appName)
})

// 记录应用结束
ipcMain.handle('record-app-end', async (_, sessionId: string, appId: string) => {
  await dataService.recordAppEnd(sessionId, appId)
})

// 获取使用统计
ipcMain.handle('get-app-stats', async (_, appId: string) => {
  return await dataService.getAppUsageStats(appId)
})

// 保存应用
ipcMain.handle('save-app', async (_, appData: AppData) => {
  return await dataService.saveApp(appData)
})

// 删除应用
ipcMain.handle('delete-app', async (_, appId: string) => {
  return await dataService.deleteApp(appId)
})

// =============== 图标处理相关 IPC 接口 ===============

// 从可执行文件中提取图标
ipcMain.handle('extract-icon-from-exe', async (_, executablePath: string) => {
  return await extractIconFromExe(executablePath)
})

// 检查文件是否存在
ipcMain.handle('file-exists', (_, filePath: string) => {
  return fileExists(filePath)
})

// 通过Windows API 或者 PowerShell 获取 Windows 图标
ipcMain.handle('get-windows-icon', async (_, executablePath: string) => {
  return await getWindowsIcon(executablePath)
})

// 从注册表获取图标信息
ipcMain.handle('get-icon-from-registry', async (_, executablePath: string) => {
  return await getIconFromRegistry(executablePath)
})

// 遍历可执行文件同级目录查找图标文件
ipcMain.handle('find-icon-in-directory', async (_, executablePath: string) => {
  return await findIconInDirectory(executablePath)
})

// 读取图标文件并返回 base64 数据
ipcMain.handle('read-icon-file-as-base64', async (_, iconPath: string) => {
  return await readIconFileAsBase64(iconPath)
})

// 获取窗口状态
// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
function setupWindowStateMonitoring(mainWindow) {
  // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
  const sendWindowState = () => {
    const isFocused = mainWindow.isFocused()
    const isMinimized = mainWindow.isMinimized()
    mainWindow.webContents.send('window-state-update', { isFocused, isMinimized })
  }

  // 监听窗口事件
  ipcMain.handle('window-state:get', () => {
    return {
      isFocused: mainWindow.isFocused(),
      isMinimized: mainWindow.isMinimized()
    }
  })

  // 当窗口状态变化时发送更新
  mainWindow.on('focus', sendWindowState)
  mainWindow.on('blur', sendWindowState)
  mainWindow.on('minimize', sendWindowState)
  mainWindow.on('restore', sendWindowState)

  // 初始化状态
  sendWindowState()
}

function createWindow(): void {
  // 在开发模式下使用源码，生产模式下使用构建文件
  const preloadPath =
    is.dev && process.env['ELECTRON_RENDERER_URL']
      ? path.join(__dirname, '../preload/index.js') // 开发模式指向源码
      : path.join(__dirname, '../preload/index.js') // 生产模式指向构建文件
  // __dirname 指向当前代码文件所在目录
  // console.log('预加载路径:', preloadPath)

  // 添加详细的路径调试
  // const preloadPath = join(__dirname, '../preload/index.js')
  Logger.info('main.index', `Preload the script path : ${preloadPath}`)

  // 检查文件是否存在
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const fs = require('fs')
  // console.log('预加载文件是否存在:', fs.existsSync(preloadPath))

  if (!fs.existsSync(preloadPath)) {
    Logger.error('main.index', 'The preloaded file does not exist')
    // 列出目录内容
    const dir = path.join(__dirname, '..')
    Logger.info('main.index', `The content of the superior directory:${fs.readdirSync(dir)}`)
  }

  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 1300,
    height: 800,
    show: false,
    title: 'Radish GameTools',
    autoHideMenuBar: true,
    ...(process.platform === 'linux' ? { icon } : { icon }),
    webPreferences: {
      preload: preloadPath,
      contextIsolation: true,
      nodeIntegration: false,
      // 允许渲染进程访问 file.path
      webSecurity: true
    }
  })

  // 监听窗口状态变化
  setupWindowStateMonitoring(mainWindow)

  // 获取配置实例
  const configManager = ConfigManager.getInstance()
  const config = configManager.getConfig()

  try {
    // 设置自启动
    setupAutoStart(config.autoLaunchAtStartup)
  } catch (error) {
    Logger.error('mainIndexAutoStart', 'setupAutoStartError', error)
  }

  // 窗口关闭的监听
  mainWindow.on('closed', () => {
    // mainWindow = null
    Logger.info('main.index', 'Main window closed')
  })

  // 触发关闭时行为
  mainWindow.on('close', (e) => {
    if (config.minimizeToSystemTray) {
      e.preventDefault()
      mainWindow.hide()
      Logger.info('main.index', 'Main window minimized to system tray instead of closing')
    } else {
      Logger.info('main.index', 'Main window is closing')
    }
  })

  // 新建托盘
  const tray = new Tray(icon)
  tray.setToolTip('Radish GameTools')

  // 点击托盘显示菜单
  const contextMenu = Menu.buildFromTemplate([
    {
      label: '显示主界面',
      click: () => {
        mainWindow.show()
      }
    },
    {
      label: '退出应用',
      click: () => {
        mainWindow.destroy()
        app.quit()
      }
    }
  ])

  // 载入托盘菜单
  tray.setContextMenu(contextMenu)

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  // HMR for renderer base on electron-vite cli.
  // Load the remote URL for development or the local html file for production.
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'))
  }

  // 开发环境加载 localhost，生产环境加载打包后的文件
  // if (process.env.NODE_ENV === "development") {
  //   mainWindow.loadURL("http://localhost:5173")
  //   mainWindow.webContents.openDevTools()
  // } else {
  //   mainWindow.loadFile(path.join(__dirname, "../dist/index.html"))
  // }
}

app.whenReady().then(() => {
  electronApp.setAppUserModelId('com.electron')

  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  // IPC test
  ipcMain.on('ping', () => Logger.info('main.index', 'IPC test Pong'))

  createWindow()

  app.on('activate', function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

// app.on("activate", () => {
//   if (BrowserWindow.getAllWindows().length === 0) {
//     createWindow()
//   }
// })
// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.

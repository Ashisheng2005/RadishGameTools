// lib/icon-finder.ts
// import path from 'path';

/**
 * 根据可执行文件路径查找软件图标
 * 支持多种策略：
 * 1. 检查可执行文件同级目录的图标文件
 * 2. 检查 Windows 资源管理器中的图标
 * 3. 检查注册表中的图标信息
 * 4. 提取可执行文件自身的图标
 */

export interface IconSearchResult {
  found: boolean
  iconPath?: string
  iconData?: string // base64 编码的图标数据
  source?: string
  error?: string
}

// 从可执行文件提取图标
export async function extractIconFromExe(executablePath: string): Promise<IconSearchResult> {
  try {
    if (window.electronAPI) {
      const result = await window.electronAPI.extractIconFromExe(executablePath)
      return result
    }

    return {
      found: false,
      error: 'Electron API 不可用'
    }
  } catch (error) {
    console.error('extract icon from exe error:', error)
    return {
      found: false,
      error: `提取图标失败: ${error}`
    }
  }
}

// 在 Windows 系统中查找应用图标
export async function findIconInWindowsSystem(executablePath: string): Promise<IconSearchResult> {
  console.log('Searching icon in Windows system for:', executablePath)

  if (!window.electronAPI) {
    return { found: false, error: 'Electron API 不可用' }
  }

  try {
    // 尝试通过第三方库进行获取
    // const iconFromExtractFileIcon = await window.electronAPI.extractFileIcon(executablePath)
    // console.log("Icon from extract-file-icon:", iconFromExtractFileIcon)
    // if (iconFromExtractFileIcon.found) {
    //   return {
    //     found: true,
    //     iconData: iconFromExtractFileIcon.iconPath,
    //     source: 'extrace-file-icon'
    //   }
    // }

    // win 中通过构建好的组件获取略缩图
    const extraceThumbnail = await window.electronAPI.extraceThumbnailTOFile(executablePath)
    window.electronAPI.loggerInfo('icon', `Icon from extrace Thumbnail:${executablePath}`)
    if (extraceThumbnail.found) {
      return {
        found: true,
        iconPath: extraceThumbnail.iconPath,
        source: 'electronAPI.extraceThumbnailTOFile'
      }
    }

    // 尝试从 Windows 图标缓存中查找
    const iconFromCache = await window.electronAPI.getWindowsIcon(executablePath)
    console.log('Icon from cache result:', iconFromCache)
    if (iconFromCache.found) {
      return {
        found: true,
        iconPath: iconFromCache.iconPath,
        iconData: iconFromCache.iconData,
        source: 'system'
      }
    }

    // 尝试查询注册表获取图标信息
    const iconFromRegistry = await window.electronAPI.getIconFromRegistry(executablePath)
    console.log('Icon from registry result:', iconFromRegistry)
    if (iconFromRegistry.found) {
      return {
        found: true,
        iconPath: iconFromRegistry.iconPath,
        source: 'registry'
      }
    }

    return { found: false }
  } catch (error) {
    return {
      found: false,
      error: `系统图标查找失败: ${error}`
    }
  }
}

// 主函数：综合查找图标
export async function findAppIcon(executablePath: string): Promise<IconSearchResult> {
  if (!executablePath) {
    return { found: false, error: '可执行文件路径为空' }
  }

  // 检查文件是否存在
  if (window.electronAPI) {
    const exists = await window.electronAPI.fileExists(executablePath)
    if (!exists) {
      return { found: false, error: '可执行文件不存在' }
    }
  }

  // 在 Windows 系统中查找（仅限 Windows）
  if (window.electronAPI && window.electronAPI.platform === 'win32') {
    console.log('Attempting to find icon in Windows system...')
    const systemIcon = await findIconInWindowsSystem(executablePath)
    if (systemIcon.found) {
      return systemIcon
    }
  }

  // console.log("Windows system icon search failed or not applicable.");
  window.electronAPI.loggerError('get icon', `Icon search in Windows system failed`)

  // 从可执行文件提取图标（macOS / Linux 和一些特定情况下的win）
  const exeIcon = await extractIconFromExe(executablePath)
  if (exeIcon.found) {
    console.log('Icon extracted from executable successfully.')
    return exeIcon
  }

  // console.log("Executable icon extraction failed:", exeIcon.error);
  window.electronAPI.loggerError(
    'get icon',
    `Icon extraction from executable failed: ${exeIcon.error}`
  )

  // 在同级目录查找图标文件
  const dirIcon = await window.electronAPI.findIconInDirectory(executablePath)
  if (dirIcon.found) {
    return dirIcon
  }

  window.electronAPI.loggerError('get icon', `Icon search in directory failed`)

  // 所有策略都失败，返回默认图标
  return {
    found: false,
    error: '未找到图标，将使用默认图标'
  }
}

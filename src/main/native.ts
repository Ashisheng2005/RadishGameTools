import { join } from 'path'
import { Logger } from './services/loggerService'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let nativeModule_launch: any
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let nativeModule_icon: any

try {
  // 开发环境路径
  const launchPath = join(__dirname, '../../native/build/Release/app_launcher.node')
  const iconPath = join(__dirname, '../../native/build/Release/icon_thumbnail.node')

  // eslint-disable-next-line @typescript-eslint/no-require-imports
  nativeModule_launch = require(launchPath)
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  nativeModule_icon = require(iconPath)
  Logger.info('native', 'Native module loaded successfully')
  // console.log('Native module loaded successfully')
} catch (error) {
  Logger.error('native', 'Native module not available:', error)
  // console.warn('Native module not available:', error);
  // 提供 JavaScript 回退实现
  nativeModule_launch = {
    launchApp: () => {
      Logger.warn('native', 'Native module not available - using fallback')
      // console.warn('Native module not available - using fallback');
      return false
    },
    terminateApp: () => {
      Logger.warn('native', 'Native module not available - using fallback')
      // console.warn('Native module not available - using fallback');
      return false
    },
    getStatus: () => 'not_available',
    getDuration: () => 0
  }

  nativeModule_icon = {
    iconApp: () => {
      Logger.warn('native', 'Native module Icon not available - using fallback')
      // console.warn('Native module Icon not available - using fallback');
      return false
    },

    terminateApp: () => {
      Logger.warn('native', 'Native module Icon not available - using fallback')
      // console.warn('Native module Icon not available - using fallback');
      return false
    },

    getStatus: () => 'not_available',
    getDuration: () => 0
  }
}

export const AppLauncher = nativeModule_launch
export const AppIcon = nativeModule_icon

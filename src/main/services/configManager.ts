import fs from 'fs'
import path from 'path'
import { AppConfig } from '../../shared/types'

import { Logger } from './loggerService'

// Logger.init()

export class ConfigManager {
  // 软件本身的配置管理

  private static instance: ConfigManager
  private config: AppConfig;
  private configPath: string;

  private constructor() {
    this.configPath = path.join(process.cwd(), 'config.json')
    this.config = this.loadConfig();
  }

  public static getInstance(): ConfigManager {
    if (!ConfigManager.instance) {
      ConfigManager.instance = new ConfigManager()
    }
    return ConfigManager.instance;
  }

  private loadConfig(): AppConfig {
    try {
      if (fs.existsSync(this.configPath)) {
        const data = fs.readFileSync(this.configPath, 'utf8')
        return JSON.parse(data);
      }
    } catch (error) {
      this.updateConfig(this.getDefaultConfig()) // 尝试保存默认配置
      Logger.error('configManager', 'loading config file error, get defaulet config', error)
      // console.error('加载配置文件时出错，已重置为默认配置:', error)
      // Logger.error("loading config", `from ${this.configPath} loading config file fail`, error)
    //   console.error('Error loading config file:', error)
    }

    // 如果文件不存在或解析错误，返回默认配置
    // Logger.info("insert log file fail", `file path ${this.configPath}`)
    return this.getDefaultConfig()
  }

  private getDefaultConfig(): AppConfig {
    const default_config: AppConfig = {
        // 界面相关
        theme: 'system',              
        immersiveMode: false,
        
        // 行为控制
        autoLaunchAtStartup: false,
        minimizeToSystemTray: false,
        showOperationHints: false,  
        enableBackupLauncher: true,
        
        // 数据管理
        enableUsageAnalytics: true,
        storageLocation: path.join(process.cwd(), 'save') ,
        showTimer: true,
        submitErrorData: false,
        categories: [
          { value: "development", label: "开发工具", color: "#007ACC" },
          { value: "browser", label: "浏览器", color: "#4285F4" },
          { value: "productivity", label: "效率工具", color: "#1DB954" },
          { value: "media", label: "媒体播放", color: "#FF6B6B" },
          { value: "communication", label: "通讯社交", color: "#4A154B" },
          { value: "design", label: "设计工具", color: "#F24E1E" },
          { value: "utility", label: "系统工具", color: "#333333" },
          { value: "game", label: "游戏", color: "#FF4500" },
          { value: "other", label: "其他", color: "#6B7280" },
        ],
        
        // 系统功能
        enableLogging: true,    
        logLevel: 'info',
        autoCleanupEnabled: false,
        autoOptimizeWindow: false,
    }

    return default_config;
  }

  public getConfig(): AppConfig {
    return this.config
  }

  public updateConfig(updates: Partial<AppConfig>): void {
    this.config = { ...this.config, ...updates }
    this.saveConfig()
  }

  private saveConfig(): void {
    try {
      fs.writeFileSync(this.configPath, JSON.stringify(this.config, null, 2))
      // Logger.info("configManager", `Config saved to ${this.configPath} successfully`)
    } catch (error) {
			// Logger.error("configManager", "Error saving config file", error)
      // console.error('Error saving config file:', error);
    }
  }
}
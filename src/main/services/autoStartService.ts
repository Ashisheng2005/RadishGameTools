import AutoLaunch from 'auto-launch'
import { app } from 'electron'
import { Logger } from './loggerService'


/*
 别用勾八app.setLoginItemSettings，这个API在Windows上有bug, 还tm不支持管理员权限启动的程序和Linux系统
 */


// 开启自启动，根据用户配置决定
export function setupAutoStart(autoLaunchAtStartup: boolean) {
    const autoLauncher = new AutoLaunch({
        name: app.getName(),
        path: process.execPath,
    });

    if (autoLaunchAtStartup) {
        autoLauncher.enable()
            .then((isEnabled) => {
                if (!isEnabled) {
                    autoLauncher.enable()
                        .then(() => {
                            Logger.info("auto start", "Auto-launch has been enabled.")
                        })
                        .catch((err) => {
                            Logger.error("auto start", "Failed to enable auto-launch", err)
                        })
                } else {
                    Logger.info("auto start", "Auto-launch is already enabled.")
                }
            })
            .catch(err => Logger.error("auto start", "Error checking auto-launch status", err))
        
        Logger.info("auto start", "Auto-launch setup to enable at startup.")

    } else {
        autoLauncher.isEnabled()
            .then((isEnabled) => {
                if (isEnabled) {
                    autoLauncher.disable()
                        .then(() => {
                            Logger.info("auto start", "Auto-launch has been disabled.")
                        })
                        .catch((err) => {
                            Logger.error("auto start", "Failed to disable auto-launch", err)
                        })
                } else {
                    Logger.info("auto start", "Auto-launch is already disabled.")
                }
            })
            .catch(err => Logger.error("auto start", "Error checking auto-launch status", err))
    }
    
}
        


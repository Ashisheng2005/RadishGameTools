#pragma once
#ifndef APP_LAUNCHER_H
#define APP_LAUNCHER_H

#include <string>
#include <vector>
#include <map>
#include <chrono>
#include <thread>
#include <atomic>
#include <mutex>

struct AppInfo {
  std::string appId;
  std::string executablePath;
  std::string iconPath; // 可选的图标路径
};

struct LaunchRecord {
  std::string appId;
  std::string startTime;
  std::string endTime;
  double duration = 0.0;
  std::string status; // "running", "completed", "crashed"
  int exitCode = 0;
  uint32_t processId = 0;
};

class AppLauncher {
public:
  AppLauncher();
  ~AppLauncher();

  // 启动应用程序
  bool LaunchApp(const AppInfo& appInfo, std::string& errorMsg);

  // 终止应用程序
  bool TerminateApp(const std::string& appId, std::string& errorMsg);

  // 获取运行状态
  LaunchRecord GetAppStatus(const std::string& appId);

  // 获取所有运行中的应用
  std::vector<LaunchRecord> GetAllRunningApps();

  // 获取应用程序图标（返回base64编码的图标数据）
  std::string GetAppIcon(const std::string& appPath);

private:
  std::map<std::string, LaunchRecord> runningApps_;
  std::map<std::string, uint32_t> appProcesses_; // appId -> processId
  std::mutex mutex_;

  // 监控进程状态的线程
  std::thread monitorThread_;
  std::atomic<bool> stopMonitor_{ false };

  void MonitorProcesses();
  std::string GetCurrentTimeString();
  double CalculateDuration(const std::string& startTime, const std::string& endTime);

#ifdef _WIN32
  // Windows specific functions
  bool LaunchAppWindows(const AppInfo& appInfo, std::string& errorMsg);
  bool TerminateAppWindows(uint32_t processId);
  std::string GetAppIconWindows(const std::string& appPath);
#else
  // Linux/macOS specific functions  
  bool LaunchAppUnix(const AppInfo& appInfo, std::string& errorMsg);
  bool TerminateAppUnix(uint32_t processId);
  std::string GetAppIconUnix(const std::string& appPath);
#endif
};

#endif // APP_LAUNCHER_H

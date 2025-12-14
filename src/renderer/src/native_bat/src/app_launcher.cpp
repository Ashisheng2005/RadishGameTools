#define _CRT_SECURE_NO_WARNINGS 1
#include "app_launcher.h"
#include <iostream>
#include <sstream>
#include <iomanip>
#include <fstream>
#include <chrono>
#include <ctime>

#ifdef _WIN32
#include <windows.h>
#include <tlhelp32.h>
#include <psapi.h>
#include <shellapi.h>
#include <gdiplus.h>
#pragma comment(lib, "gdiplus.lib")
#else
#include <sys/types.h>
#include <sys/wait.h>
#include <signal.h>
#include <unistd.h>
#include <dirent.h>
#endif

AppLauncher::AppLauncher() {
  monitorThread_ = std::thread(&AppLauncher::MonitorProcesses, this);
}

AppLauncher::~AppLauncher() {
  stopMonitor_ = true;
  if (monitorThread_.joinable()) {
    monitorThread_.join();
  }
}

bool AppLauncher::LaunchApp(const AppInfo& appInfo, std::string& errorMsg) {
  std::lock_guard<std::mutex> lock(mutex_);

  // 检查是否已经在运行
  if (runningApps_.find(appInfo.appId) != runningApps_.end()) {
    errorMsg = "Application is already running";
    return false;
  }

  bool success = false;

#ifdef _WIN32
  success = LaunchAppWindows(appInfo, errorMsg);
#else
  success = LaunchAppUnix(appInfo, errorMsg);
#endif

  if (success) {
    LaunchRecord record;
    record.appId = appInfo.appId;
    record.startTime = GetCurrentTimeString();
    record.status = "running";

    runningApps_[appInfo.appId] = record;
  }

  return success;
}

bool AppLauncher::TerminateApp(const std::string& appId, std::string& errorMsg) {
  std::lock_guard<std::mutex> lock(mutex_);

  auto it = appProcesses_.find(appId);
  if (it == appProcesses_.end()) {
    errorMsg = "Application not found or not running";
    return false;
  }

  bool success = false;

#ifdef _WIN32
  success = TerminateAppWindows(it->second);
#else
  success = TerminateAppUnix(it->second);
#endif

  if (success) {
    // 更新记录状态
    auto recordIt = runningApps_.find(appId);
    if (recordIt != runningApps_.end()) {
      recordIt->second.endTime = GetCurrentTimeString();
      recordIt->second.duration = CalculateDuration(recordIt->second.startTime, recordIt->second.endTime);
      recordIt->second.status = "completed";
      recordIt->second.exitCode = 0;
    }

    appProcesses_.erase(it);
  }
  else {
    errorMsg = "Failed to terminate application";
  }

  return success;
}

LaunchRecord AppLauncher::GetAppStatus(const std::string& appId) {
  std::lock_guard<std::mutex> lock(mutex_);

  auto it = runningApps_.find(appId);
  if (it != runningApps_.end()) {
    return it->second;
  }

  return LaunchRecord(); // 返回空记录
}

std::vector<LaunchRecord> AppLauncher::GetAllRunningApps() {
  std::lock_guard<std::mutex> lock(mutex_);

  std::vector<LaunchRecord> records;
  for (const auto& pair : runningApps_) {
    records.push_back(pair.second);
  }

  return records;
}

std::string AppLauncher::GetAppIcon(const std::string& appPath) {
#ifdef _WIN32
  return GetAppIconWindows(appPath);
#else
  return GetAppIconUnix(appPath);
#endif
}

void AppLauncher::MonitorProcesses() {
  while (!stopMonitor_) {
    std::this_thread::sleep_for(std::chrono::seconds(2));

    std::lock_guard<std::mutex> lock(mutex_);

    for (auto it = appProcesses_.begin(); it != appProcesses_.end(); ) {
      uint32_t processId = it->second;
      std::string appId = it->first;

      bool isRunning = false;

#ifdef _WIN32
      HANDLE process = OpenProcess(PROCESS_QUERY_INFORMATION, FALSE, processId);
      if (process) {
        DWORD exitCode;
        if (GetExitCodeProcess(process, &exitCode)) {
          isRunning = (exitCode == STILL_ACTIVE);
        }
        CloseHandle(process);
      }
#else
      // 检查进程是否存在
      if (kill(processId, 0) == 0) {
        isRunning = true;
      }
#endif

      if (!isRunning) {
        // 进程已结束
        auto recordIt = runningApps_.find(appId);
        if (recordIt != runningApps_.end()) {
          recordIt->second.endTime = GetCurrentTimeString();
          recordIt->second.duration = CalculateDuration(recordIt->second.startTime, recordIt->second.endTime);
          recordIt->second.status = "completed";

          // 尝试获取退出代码
#ifdef _WIN32
          HANDLE process = OpenProcess(PROCESS_QUERY_INFORMATION, FALSE, processId);
          if (process) {
            DWORD exitCode;
            if (GetExitCodeProcess(process, &exitCode) && exitCode != STILL_ACTIVE) {
              recordIt->second.exitCode = exitCode;
              if (exitCode != 0) {
                recordIt->second.status = "crashed";
              }
            }
            CloseHandle(process);
          }
#endif
        }

        it = appProcesses_.erase(it);
      }
      else {
        ++it;
      }
    }
  }
}

std::string AppLauncher::GetCurrentTimeString() {
  auto now = std::chrono::system_clock::now();
  auto time_t = std::chrono::system_clock::to_time_t(now);
  auto ms = std::chrono::duration_cast<std::chrono::milliseconds>(
    now.time_since_epoch()) % 1000;

  std::stringstream ss;
  ss << std::put_time(std::localtime(&time_t), "%Y-%m-%dT%H:%M:%S");
  ss << "." << std::setfill('0') << std::setw(3) << ms.count();

  return ss.str();
}

double AppLauncher::CalculateDuration(const std::string& startTime, const std::string& endTime) {
  std::tm startTm = {}, endTm = {};
  std::istringstream startSs(startTime), endSs(endTime);

  startSs >> std::get_time(&startTm, "%Y-%m-%dT%H:%M:%S");
  endSs >> std::get_time(&endTm, "%Y-%m-%dT%H:%M:%S");

  auto startT = std::mktime(&startTm);
  auto endT = std::mktime(&endTm);

  return std::difftime(endT, startT);
}

// Windows 特定实现
#ifdef _WIN32

bool AppLauncher::LaunchAppWindows(const AppInfo& appInfo, std::string& errorMsg) {
  STARTUPINFO si;
  PROCESS_INFORMATION pi;

  ZeroMemory(&si, sizeof(si));
  si.cb = sizeof(si);
  ZeroMemory(&pi, sizeof(pi));

  // 创建可修改的字符串
  std::vector<char> cmdLine(appInfo.executablePath.begin(), appInfo.executablePath.end());
  cmdLine.push_back('\0');

  if (!CreateProcess(
    NULL,           // 应用程序名
    cmdLine.data(), // 命令行
    NULL,           // 进程安全属性
    NULL,           // 线程安全属性
    FALSE,          // 继承句柄
    0,              // 创建标志
    NULL,           // 环境变量
    NULL,           // 当前目录
    &si,            // STARTUPINFO
    &pi             // PROCESS_INFORMATION
  )) {
    errorMsg = "Failed to create process. Error code: " + std::to_string(GetLastError());
    return false;
  }

  appProcesses_[appInfo.appId] = pi.dwProcessId;

  CloseHandle(pi.hProcess);
  CloseHandle(pi.hThread);

  return true;
}

bool AppLauncher::TerminateAppWindows(uint32_t processId) {
  HANDLE process = OpenProcess(PROCESS_TERMINATE, FALSE, processId);
  if (process) {
    BOOL result = TerminateProcess(process, 0);
    CloseHandle(process);
    return result != 0;
  }
  return false;
}

std::string AppLauncher::GetAppIconWindows(const std::string& appPath) {
  // 简化实现：返回空字符串或基本图标信息
  // 实际实现需要提取EXE文件的图标并转换为base64
  return ""; // 占位符
}

#else

// Unix (Linux/macOS) 特定实现
bool AppLauncher::LaunchAppUnix(const AppInfo& appInfo, std::string& errorMsg) {
  pid_t pid = fork();

  if (pid == 0) {
    // 子进程
    execl(appInfo.executablePath.c_str(), appInfo.executablePath.c_str(), NULL);
    exit(1); // 如果exec失败
  }
  else if (pid > 0) {
    // 父进程
    appProcesses_[appInfo.appId] = pid;
    return true;
  }
  else {
    errorMsg = "Failed to fork process";
    return false;
  }
}

bool AppLauncher::TerminateAppUnix(uint32_t processId) {
  return kill(processId, SIGTERM) == 0;
}

std::string AppLauncher::GetAppIconUnix(const std::string& appPath) {
  // Unix系统图标处理
  return ""; // 占位符
}

#endif

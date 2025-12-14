#include <napi.h>
#include <string>
#include <map>
#include <chrono>
#include <thread>
#include <mutex>

#ifdef _WIN32
#include <windows.h>
#include <tlhelp32.h>
#else
#include <sys/types.h>
#include <sys/wait.h>
#include <signal.h>
#include <unistd.h>
#endif

class AppLauncher {
private:
    std::map<std::string, uint32_t> runningProcesses_;
    std::map<std::string, std::chrono::system_clock::time_point> startTimes_;
    std::mutex mutex_;

public:
    bool LaunchApp(const std::string& appId, const std::string& executablePath) {
        std::lock_guard<std::mutex> lock(mutex_);
        
#ifdef _WIN32
        STARTUPINFO si;
        PROCESS_INFORMATION pi;
        
        ZeroMemory(&si, sizeof(si));
        si.cb = sizeof(si);
        ZeroMemory(&pi, sizeof(pi));
        
        // 创建命令行
        std::string command = "\"" + executablePath + "\"";
        std::vector<char> cmdLine(command.begin(), command.end());
        cmdLine.push_back('\0');
        
        if (!CreateProcess(
            NULL,
            cmdLine.data(),
            NULL,
            NULL,
            FALSE,
            CREATE_NEW_PROCESS_GROUP,
            NULL,
            NULL,
            &si,
            &pi
        )) {
            return false;
        }
        
        runningProcesses_[appId] = pi.dwProcessId;
        startTimes_[appId] = std::chrono::system_clock::now();
        
        CloseHandle(pi.hThread);
        CloseHandle(pi.hProcess);
        return true;
#else
        pid_t pid = fork();
        if (pid == 0) {
            setsid();
            execl(executablePath.c_str(), executablePath.c_str(), NULL);
            exit(1);
        } else if (pid > 0) {
            runningProcesses_[appId] = pid;
            startTimes_[appId] = std::chrono::system_clock::now();
            return true;
        }
        return false;
#endif
    }
    
    bool TerminateApp(const std::string& appId) {
        std::lock_guard<std::mutex> lock(mutex_);
        
        auto it = runningProcesses_.find(appId);
        if (it == runningProcesses_.end()) {
            return false;
        }
        
#ifdef _WIN32
        HANDLE process = OpenProcess(PROCESS_TERMINATE, FALSE, it->second);
        if (process) {
            BOOL result = TerminateProcess(process, 0);
            CloseHandle(process);
            if (result) {
                runningProcesses_.erase(it);
                startTimes_.erase(appId);
                return true;
            }
        }
#else
        if (kill(it->second, SIGTERM) == 0) {
            runningProcesses_.erase(it);
            startTimes_.erase(appId);
            return true;
        }
#endif
        return false;
    }
    
    std::string GetStatus(const std::string& appId) {
        std::lock_guard<std::mutex> lock(mutex_);
        
        auto it = runningProcesses_.find(appId);
        if (it == runningProcesses_.end()) {
            return "not_running";
        }
        
#ifdef _WIN32
        HANDLE process = OpenProcess(PROCESS_QUERY_INFORMATION, FALSE, it->second);
        if (process) {
            DWORD exitCode;
            if (GetExitCodeProcess(process, &exitCode)) {
                if (exitCode == STILL_ACTIVE) {
                    CloseHandle(process);
                    return "running";
                }
            }
            CloseHandle(process);
        }
        runningProcesses_.erase(it);
        startTimes_.erase(appId);
        return "exited";
#else
        if (kill(it->second, 0) == 0) {
            return "running";
        } else {
            runningProcesses_.erase(it);
            startTimes_.erase(appId);
            return "exited";
        }
#endif
    }
    
    double GetDuration(const std::string& appId) {
        std::lock_guard<std::mutex> lock(mutex_);
        
        auto timeIt = startTimes_.find(appId);
        if (timeIt == startTimes_.end()) {
            return 0.0;
        }
        
        auto now = std::chrono::system_clock::now();
        auto duration = std::chrono::duration_cast<std::chrono::seconds>(now - timeIt->second);
        return duration.count();
    }
};

// 全局实例
static AppLauncher appLauncher;

Napi::Boolean LaunchApp(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();
    
    if (info.Length() < 2 || !info[0].IsString() || !info[1].IsString()) {
        Napi::TypeError::New(env, "Expected two string arguments").ThrowAsJavaScriptException();
        return Napi::Boolean::New(env, false);
    }
    
    std::string appId = info[0].As<Napi::String>();
    std::string executablePath = info[1].As<Napi::String>();
    
    bool success = appLauncher.LaunchApp(appId, executablePath);
    return Napi::Boolean::New(env, success);
}

Napi::Boolean TerminateApp(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();
    
    if (info.Length() < 1 || !info[0].IsString()) {
        Napi::TypeError::New(env, "Expected one string argument").ThrowAsJavaScriptException();
        return Napi::Boolean::New(env, false);
    }
    
    std::string appId = info[0].As<Napi::String>();
    
    bool success = appLauncher.TerminateApp(appId);
    return Napi::Boolean::New(env, success);
}

Napi::String GetStatus(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();
    
    if (info.Length() < 1 || !info[0].IsString()) {
        Napi::TypeError::New(env, "Expected one string argument").ThrowAsJavaScriptException();
        return Napi::String::New(env, "error");
    }
    
    std::string appId = info[0].As<Napi::String>();
    std::string status = appLauncher.GetStatus(appId);
    
    return Napi::String::New(env, status);
}

Napi::Number GetDuration(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();
    
    if (info.Length() < 1 || !info[0].IsString()) {
        Napi::TypeError::New(env, "Expected one string argument").ThrowAsJavaScriptException();
        return Napi::Number::New(env, 0);
    }
    
    std::string appId = info[0].As<Napi::String>();
    double duration = appLauncher.GetDuration(appId);
    
    return Napi::Number::New(env, duration);
}

Napi::Object Init(Napi::Env env, Napi::Object exports) {
    exports.Set("launchApp", Napi::Function::New(env, LaunchApp));
    exports.Set("terminateApp", Napi::Function::New(env, TerminateApp));
    exports.Set("getStatus", Napi::Function::New(env, GetStatus));
    exports.Set("getDuration", Napi::Function::New(env, GetDuration));
    
    return exports;
}

NODE_API_MODULE(app_launcher, Init)
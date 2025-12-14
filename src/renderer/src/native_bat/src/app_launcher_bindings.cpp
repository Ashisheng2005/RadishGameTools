#define _CRT_SECURE_NO_WARNINGS 1
#include <napi.h>
#include "app_launcher.h"

class AppLauncherWrapper : public Napi::ObjectWrap<AppLauncherWrapper> {
public:
  static Napi::Object Init(Napi::Env env, Napi::Object exports);
  AppLauncherWrapper(const Napi::CallbackInfo& info);

private:
  AppLauncher launcher_;

  Napi::Value LaunchApp(const Napi::CallbackInfo& info);
  Napi::Value TerminateApp(const Napi::CallbackInfo& info);
  Napi::Value GetAppStatus(const Napi::CallbackInfo& info);
  Napi::Value GetAllRunningApps(const Napi::CallbackInfo& info);
  Napi::Value GetAppIcon(const Napi::CallbackInfo& info);
};

Napi::Object AppLauncherWrapper::Init(Napi::Env env, Napi::Object exports) {
  Napi::Function func = DefineClass(env, "AppLauncher", {
      InstanceMethod("launchApp", &AppLauncherWrapper::LaunchApp),
      InstanceMethod("terminateApp", &AppLauncherWrapper::TerminateApp),
      InstanceMethod("getAppStatus", &AppLauncherWrapper::GetAppStatus),
      InstanceMethod("getAllRunningApps", &AppLauncherWrapper::GetAllRunningApps),
      InstanceMethod("getAppIcon", &AppLauncherWrapper::GetAppIcon)
    });

  exports.Set("AppLauncher", func);
  return exports;
}

AppLauncherWrapper::AppLauncherWrapper(const Napi::CallbackInfo& info)
  : Napi::ObjectWrap<AppLauncherWrapper>(info) {
}

Napi::Value AppLauncherWrapper::LaunchApp(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();

  if (info.Length() < 2 || !info[0].IsString() || !info[1].IsString()) {
    Napi::TypeError::New(env, "String expected").ThrowAsJavaScriptException();
    return env.Null();
  }

  std::string appId = info[0].As<Napi::String>();
  std::string executablePath = info[1].As<Napi::String>();

  AppInfo appInfo;
  appInfo.appId = appId;
  appInfo.executablePath = executablePath;

  std::string errorMsg;
  bool success = launcher_.LaunchApp(appInfo, errorMsg);

  if (success) {
    return Napi::Boolean::New(env, true);
  }
  else {
    Napi::Error::New(env, errorMsg).ThrowAsJavaScriptException();
    return Napi::Boolean::New(env, false);
  }
}

Napi::Value AppLauncherWrapper::TerminateApp(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();

  if (info.Length() < 1 || !info[0].IsString()) {
    Napi::TypeError::New(env, "String expected").ThrowAsJavaScriptException();
    return env.Null();
  }

  std::string appId = info[0].As<Napi::String>();
  std::string errorMsg;
  bool success = launcher_.TerminateApp(appId, errorMsg);

  if (success) {
    return Napi::Boolean::New(env, true);
  }
  else {
    Napi::Error::New(env, errorMsg).ThrowAsJavaScriptException();
    return Napi::Boolean::New(env, false);
  }
}

Napi::Value AppLauncherWrapper::GetAppStatus(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();

  if (info.Length() < 1 || !info[0].IsString()) {
    Napi::TypeError::New(env, "String expected").ThrowAsJavaScriptException();
    return env.Null();
  }

  std::string appId = info[0].As<Napi::String>();
  LaunchRecord record = launcher_.GetAppStatus(appId);

  Napi::Object result = Napi::Object::New(env);
  result.Set("appId", record.appId);
  result.Set("startTime", record.startTime);
  result.Set("endTime", record.endTime);
  result.Set("duration", record.duration);
  result.Set("status", record.status);
  result.Set("exitCode", record.exitCode);
  result.Set("processId", record.processId);

  return result;
}

Napi::Value AppLauncherWrapper::GetAllRunningApps(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();

  auto records = launcher_.GetAllRunningApps();
  Napi::Array result = Napi::Array::New(env, records.size());

  for (size_t i = 0; i < records.size(); i++) {
    const auto& record = records[i];
    Napi::Object obj = Napi::Object::New(env);
    obj.Set("appId", record.appId);
    obj.Set("startTime", record.startTime);
    obj.Set("endTime", record.endTime);
    obj.Set("duration", record.duration);
    obj.Set("status", record.status);
    obj.Set("exitCode", record.exitCode);
    obj.Set("processId", record.processId);

    result[i] = obj;
  }

  return result;
}

Napi::Value AppLauncherWrapper::GetAppIcon(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();

  if (info.Length() < 1 || !info[0].IsString()) {
    Napi::TypeError::New(env, "String expected").ThrowAsJavaScriptException();
    return env.Null();
  }

  std::string appPath = info[0].As<Napi::String>();
  std::string iconData = launcher_.GetAppIcon(appPath);

  return Napi::String::New(env, iconData);
}

Napi::Object Init(Napi::Env env, Napi::Object exports) {
  return AppLauncherWrapper::Init(env, exports);
}

NODE_API_MODULE(app_launcher, Init)

#include "icon_thumbnail.h"
#include <comdef.h>
#include <iostream>
#include <locale>
#include <codecvt>

using namespace Napi;
using namespace Gdiplus;

// 全局GDI+管理器
static ULONG_PTR g_gdiplusToken = 0;
static bool g_gdiplusInitialized = false;

// UTF-8 到 UTF-16 转换
std::wstring Utf8ToWide(const std::string& utf8) {
    if (utf8.empty()) return L"";
    
    int size_needed = MultiByteToWideChar(CP_UTF8, 0, 
        utf8.c_str(), (int)utf8.size(), NULL, 0);
    
    if (size_needed == 0) return L"";
    
    std::wstring wstr(size_needed, 0);
    MultiByteToWideChar(CP_UTF8, 0, 
        utf8.c_str(), (int)utf8.size(), 
        &wstr[0], size_needed);
    
    return wstr;
}

// 初始化GDI+
bool EnsureGdiPlusInitialized() {
    if (!g_gdiplusInitialized) {
        GdiplusStartupInput gdiplusStartupInput;
        GdiplusStartup(&g_gdiplusToken, &gdiplusStartupInput, NULL);
        g_gdiplusInitialized = true;
    }
    return g_gdiplusInitialized;
}

// 获取PNG编码器
CLSID GetPngEncoderClsid() {
    UINT num = 0, size = 0;
    
    if (GetImageEncodersSize(&num, &size) != Ok || size == 0) {
        return CLSID_NULL;
    }
    
    std::unique_ptr<ImageCodecInfo[]> codecInfo(new ImageCodecInfo[size]);
    if (GetImageEncoders(num, size, codecInfo.get()) != Ok) {
        return CLSID_NULL;
    }
    
    for (UINT i = 0; i < num; ++i) {
        if (wcscmp(codecInfo[i].MimeType, L"image/png") == 0) {
            return codecInfo[i].Clsid;
        }
    }
    
    return CLSID_NULL;
}

// 保存位图到内存
bool SaveBitmapToBuffer(HBITMAP hBitmap, std::vector<BYTE>& buffer) {
    if (!hBitmap) return false;
    
    std::unique_ptr<Bitmap> bitmap(Bitmap::FromHBITMAP(hBitmap, NULL));
    if (!bitmap || bitmap->GetLastStatus() != Ok) {
        return false;
    }
    
    IStream* stream = NULL;
    if (CreateStreamOnHGlobal(NULL, TRUE, &stream) != S_OK) {
        return false;
    }
    
    CLSID clsidPng = GetPngEncoderClsid();
    if (clsidPng == CLSID_NULL) {
        stream->Release();
        return false;
    }
    
    if (bitmap->Save(stream, &clsidPng, NULL) != Ok) {
        stream->Release();
        return false;
    }
    
    STATSTG stat;
    if (stream->Stat(&stat, STATFLAG_NONAME) != S_OK) {
        stream->Release();
        return false;
    }
    
    HGLOBAL hGlobal = NULL;
    if (GetHGlobalFromStream(stream, &hGlobal) != S_OK) {
        stream->Release();
        return false;
    }
    
    BYTE* pData = (BYTE*)GlobalLock(hGlobal);
    if (!pData) {
        stream->Release();
        return false;
    }
    
    buffer.assign(pData, pData + stat.cbSize.QuadPart);
    
    GlobalUnlock(hGlobal);
    stream->Release();
    
    return true;
}

// 核心提取函数
bool ExtractThumbnailInternal(const std::wstring& filePath, int size, 
                              DWORD flags, std::vector<BYTE>& buffer) {
    if (!EnsureGdiPlusInitialized()) {
        return false;
    }
    
    HRESULT hr = CoInitializeEx(NULL, COINIT_APARTMENTTHREADED);
    if (FAILED(hr)) {
        return false;
    }
    
    IShellItemImageFactory* pFactory = NULL;
    HBITMAP hBitmap = NULL;
    bool success = false;
    
    do {
        hr = SHCreateItemFromParsingName(filePath.c_str(), NULL, 
                                        IID_IShellItemImageFactory, 
                                        reinterpret_cast<void**>(&pFactory));
        if (FAILED(hr)) break;
        
        SIZE sz = {size, size};
        hr = pFactory->GetImage(sz, flags, &hBitmap);
        if (FAILED(hr) || !hBitmap) break;
        
        success = SaveBitmapToBuffer(hBitmap, buffer);
        
    } while (false);
    
    if (hBitmap) DeleteObject(hBitmap);
    if (pFactory) pFactory->Release();
    
    CoUninitialize();
    
    return success;
}

// N-API: 提取到Buffer
Napi::Value ExtractThumbnail(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();
    
    if (info.Length() < 1 || !info[0].IsString()) {
        Napi::TypeError::New(env, "需要文件路径").ThrowAsJavaScriptException();
        return env.Null();
    }
    
    std::string filePath = info[0].As<Napi::String>().Utf8Value();
    int size = 256;
    DWORD flags = SIIGBF_BIGGERSIZEOK;
    
    if (info.Length() > 1 && info[1].IsNumber()) {
        size = info[1].As<Napi::Number>().Int32Value();
        size = std::max(16, std::min(size, 1024));
        flags = SIIGBF_RESIZETOFIT | SIIGBF_ICONONLY;
    }
    
    std::wstring wFilePath = Utf8ToWide(filePath);
    std::vector<BYTE> buffer;
    
    if (!ExtractThumbnailInternal(wFilePath, size, flags, buffer)) {
        Napi::Error::New(env, "无法提取缩略图").ThrowAsJavaScriptException();
        return env.Null();
    }
    
    return Napi::Buffer<BYTE>::Copy(env, buffer.data(), buffer.size());
}

// N-API: 提取到文件
Napi::Value ExtractThumbnailToFile(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();
    
    if (info.Length() < 2 || !info[0].IsString() || !info[1].IsString()) {
        Napi::TypeError::New(env, "需要文件路径和输出路径").ThrowAsJavaScriptException();
        return env.Null();
    }
    
    std::string filePath = info[0].As<Napi::String>().Utf8Value();
    std::string outputPath = info[1].As<Napi::String>().Utf8Value();
    int size = 256;
    DWORD flags = SIIGBF_BIGGERSIZEOK;
    
    if (info.Length() > 2 && info[2].IsNumber()) {
        size = info[2].As<Napi::Number>().Int32Value();
        size = std::max(16, std::min(size, 1024));
        flags = SIIGBF_RESIZETOFIT | SIIGBF_ICONONLY;
    }
    
    std::wstring wFilePath = Utf8ToWide(filePath);
    std::wstring wOutputPath = Utf8ToWide(outputPath);
    
    std::vector<BYTE> buffer;
    if (!ExtractThumbnailInternal(wFilePath, size, flags, buffer)) {
        Napi::Error::New(env, "无法提取缩略图").ThrowAsJavaScriptException();
        return env.Null();
    }
    
    // 使用Windows API写入文件（支持Unicode路径）
    HANDLE hFile = CreateFileW(
        wOutputPath.c_str(),
        GENERIC_WRITE,
        0,
        NULL,
        CREATE_ALWAYS,
        FILE_ATTRIBUTE_NORMAL,
        NULL);
    
    if (hFile == INVALID_HANDLE_VALUE) {
        DWORD error = GetLastError();
        std::string errorMsg = "无法创建文件，错误代码: " + std::to_string(error);
        Napi::Error::New(env, errorMsg).ThrowAsJavaScriptException();
        return env.Null();
    }
    
    DWORD bytesWritten;
    BOOL writeResult = WriteFile(
        hFile,
        buffer.data(),
        buffer.size(),
        &bytesWritten,
        NULL);
    
    CloseHandle(hFile);
    
    if (!writeResult) {
        Napi::Error::New(env, "写入文件失败").ThrowAsJavaScriptException();
        return env.Null();
    }
    
    return Napi::String::New(env, outputPath);
}

// N-API: 批量提取
Napi::Value ExtractThumbnails(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();
    
    if (info.Length() < 1 || !info[0].IsArray()) {
        Napi::TypeError::New(env, "需要文件路径数组").ThrowAsJavaScriptException();
        return env.Null();
    }
    
    Napi::Array filePaths = info[0].As<Napi::Array>();
    int size = 256;
    DWORD flags = SIIGBF_BIGGERSIZEOK;
    
    if (info.Length() > 1 && info[1].IsNumber()) {
        size = info[1].As<Napi::Number>().Int32Value();
        size = std::max(16, std::min(size, 1024));
        flags = SIIGBF_RESIZETOFIT | SIIGBF_ICONONLY;
    }
    
    Napi::Array results = Napi::Array::New(env, filePaths.Length());
    
    for (uint32_t i = 0; i < filePaths.Length(); i++) {
        Napi::Value item = filePaths[i];
        if (!item.IsString()) {
            results.Set(i, env.Null());
            continue;
        }
        
        std::string filePath = item.As<Napi::String>().Utf8Value();
        std::wstring wFilePath = Utf8ToWide(filePath);
        
        std::vector<BYTE> buffer;
        if (ExtractThumbnailInternal(wFilePath, size, flags, buffer)) {
            results.Set(i, Napi::Buffer<BYTE>::Copy(env, buffer.data(), buffer.size()));
        } else {
            results.Set(i, env.Null());
        }
    }
    
    return results;
}

// 模块初始化
Napi::Object Init(Napi::Env env, Napi::Object exports) {
    exports.Set("extractThumbnail", 
                Napi::Function::New(env, ExtractThumbnail));
    exports.Set("extractThumbnailToFile", 
                Napi::Function::New(env, ExtractThumbnailToFile));
    exports.Set("extractThumbnails", 
                Napi::Function::New(env, ExtractThumbnails));
    
    // 导出常量
    Napi::Object flags = Napi::Object::New(env);
    flags.Set("BIGGERSIZEOK", Napi::Number::New(env, SIIGBF_BIGGERSIZEOK));
    flags.Set("RESIZETOFIT", Napi::Number::New(env, SIIGBF_RESIZETOFIT));
    flags.Set("ICONONLY", Napi::Number::New(env, SIIGBF_ICONONLY));
    flags.Set("THUMBNAILONLY", Napi::Number::New(env, SIIGBF_THUMBNAILONLY));
    exports.Set("FLAGS", flags);
    
    return exports;
}

NODE_API_MODULE(icon_thumbnail, Init)
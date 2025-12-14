#ifndef ICON_THUMBNAIL_H
#define ICON_THUMBNAIL_H

#include <napi.h>
#include <windows.h>
#include <shobjidl.h>
#include <shlobj.h>
#include <gdiplus.h>
#include <vector>
#include <string>
#include <memory>
#include <fstream>

// Windows thumbnail API flags
#define SIIGBF_RESIZETOFIT     0x00000000
#define SIIGBF_BIGGERSIZEOK    0x00000001
#define SIIGBF_MEMORYONLY      0x00000002
#define SIIGBF_ICONONLY        0x00000004
#define SIIGBF_THUMBNAILONLY   0x00000008
#define SIIGBF_INCACHEONLY     0x00000010

// Main export functions
Napi::Value ExtractThumbnail(const Napi::CallbackInfo& info);
Napi::Value ExtractThumbnailToFile(const Napi::CallbackInfo& info);
Napi::Value ExtractThumbnails(const Napi::CallbackInfo& info);

// Internal helper functions
CLSID GetPngEncoderClsid();
bool SaveBitmapToBuffer(HBITMAP hBitmap, std::vector<BYTE>& buffer);
bool ExtractThumbnailInternal(const std::wstring& filePath, int size, 
                              DWORD flags, std::vector<BYTE>& buffer);

#endif
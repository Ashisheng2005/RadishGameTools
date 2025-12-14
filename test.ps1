# # 源文件路径(EXE 或 DLL)
# $exePath = "D:\NTQQ\QQ.exe"

# # 输出 ICO 文件路径
# $outputIco = "E:\RadishGameTools\save\icon.ico"

# # 加载 WinForms 程序集
# Add-Type -AssemblyName System.Drawing

# # 从文件中提取图标
# $icon = [System.Drawing.Icon]::ExtractAssociatedIcon($exePath)

# # 保存为 ICO 文件
# $fs = New-Object System.IO.FileStream($outputIco, [System.IO.FileMode]::Create)
# $icon.Save($fs)
# $fs.Close()

# Write-Host "图标已保存到 $outputIco"


# Add-Type -AssemblyName System.Drawing

# # 使用 try/catch/finally 块捕获错误并确保资源释放
# try {
#     $icon = [System.Drawing.Icon]::ExtractAssociatedIcon('E:\galgamebag\galapplicaiton\交响乐之雨\[交响乐之雨].SR_Cracked.exe')
    
#     if ($icon -ne $null) {
#         try {
#             # 创建文件流保存图标
#             $fs = New-Object System.IO.FileStream('E:\RadishGameTools\save\icon.ico', [System.IO.FileMode]::Create)
#             $icon.Save($fs)
#         }
#         catch {
#             Write-Error 'save file error: $($_.Exception.Message)'
#             exit 1
#         }
#         finally {
#             # 确保文件流被关闭
#             if ($fs -ne $null) {
#                 $fs.Close()
#                 $fs.Dispose()
#             }
#         }
        
#         # 成功时输出绝对路径
#         Write-Output 'E:\RadishGameTools\save\icon.ico'
#     } 
#     else {
#         Write-Error 'can not get ico'
#         exit 1
#     }
# } 
# catch {
#     Write-Error 'get error: $($_.Exception.Message)'
#     exit 1
# }
# finally {
#     # 确保图标对象被释放
#     if ($icon -ne $null) {
#         $icon.Dispose()
#     }
# }


# chcp 936
# [Console]::InputEncoding = [Text.UTF8Encoding]::new($false)
# [Console]::OutputEncoding = [Text.UTF8Encoding]::new($false)
# Add-Type -AssemblyName System.Drawing

# try {
#     $icon = [System.Drawing.Icon]::ExtractAssociatedIcon("E:\galgamebag\galapplicaiton\片羽 ―An' call Belle―\カタハネ ―An' call Belle―CHS.exe")
#     $fs = [System.IO.FileStream]::new('E:\RadishGameTools\save\icon.ico', [System.IO.FileMode]::Create)
#     $icon.Save($fs)
#     $fs.Close()
#     'E:\RadishGameTools\save\icon.ico'
# }
# catch {
#     'ERROR: ' + $_.Exception.Message
#     exit 1
# }
# finally {
#     if ($fs) { $fs.Dispose() }
#     if ($icon) { $icon.Dispose() }
# }


# $exePath = "E:\freepiano\freepiano.exe"
# $outPath = 'E:\RadishGameTools\save\icon.ico'
# [System.Reflection.Assembly]::LoadWithPartialName('System.Drawing') | Out-Null
# md $exePath -ea 0 | Out-Null
# dir $exePath *.exe -ea 0 -rec |
# ForEach-Object {
#     $baseName = [System.IO.Path]::GetFileNameWithoutExtension($_.FullName)
#     [System.Drawing.Icon]::ExtractAssociatedIcon($_.FullName).ToBitmap().Save($outPath)
#      Write-Output $outPath
# }

# $exePath = "E:\freepiano\freepiano.exe"
# $outPath = 'E:\RadishGameTools\save\icon.ico'

# # 确保输出目录存在
# $outputDir = [System.IO.Path]::GetDirectoryName($outPath)
# if (!(Test-Path $outputDir)) {
#     New-Item -ItemType Directory -Path $outputDir -Force | Out-Null
# }

# # 加载System.Drawing
# Add-Type -AssemblyName System.Drawing

# # 提取并保存图标
# try {
#     $icon = [System.Drawing.Icon]::ExtractAssociatedIcon($exePath)
#     $icon.ToBitmap().Save($outPath, [System.Drawing.Imaging.ImageFormat]::Png)
#     Write-Output $outPath
# }
# catch {
#     Write-Error "Error: $($_.Exception.Message)"
# }

$exePath = "E:\freepiano\freepiano.exe"
$outPath = 'C:\Windows\TEMP\icon_1765203405694_freepiano.ico'
$outputDir = [System.IO.Path]::GetDirectoryName($outPath)
if (!(Test-Path $outputDir)) {
    New-Item -ItemType Directory -Path $outputDir -Force | Out-Null
}

Add-Type -AssemblyName System.Drawing

try {
    $icon = [System.Drawing.Icon]::ExtractAssociatedIcon($exePath)
    $icon.ToBitmap().Save($outPath, [System.Drawing.Imaging.ImageFormat]::Png)
    Write-Output $outPath
}
catch {
    Write-Error "Error: $($_.Exception.Message)"
}

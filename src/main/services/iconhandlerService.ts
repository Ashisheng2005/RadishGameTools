import { nativeImage, app } from 'electron'
import fs from 'fs'
import path from 'path'
import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)
const writeFileAsync = promisify(fs.writeFile)
const mkdirAsync = promisify(fs.mkdir)

// 保存 base64 图标到文件
interface SaveIconFileOptions {
  base64Data: string
  appId: string
  size?: number
}

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export async function saveIconFile(options: SaveIconFileOptions) {
  try {
    const { base64Data, appId, size = 256 } = options

    if (!base64Data || base64Data.trim() === '') {
      console.error('Base64 data is empty or invalid')
      return {
        success: false,
        error: 'Base64 data is empty or invalid'
      }
    }

    // 解码 Base64 数据
    const buffer = Buffer.from(base64Data, 'base64')

    if (buffer.length === 0) {
      console.error('decoding after Buffer is empty')
      return {
        success: false,
        error: 'decoding after Buffer is empty'
      }
    }

    // 创建图标目录
    const iconsDir = path.join(app.getPath('userData'), 'icons')
    if (!fs.existsSync(iconsDir)) {
      await mkdirAsync(iconsDir, { recursive: true })
    }

    // 生成文件名和路径
    const hash = appId
    const filename = `icon_${hash}_x${size}.png`
    const filePath = path.join(iconsDir, filename)
    const relativePath = path.join('icons', filename)

    // 保存文件
    await writeFileAsync(filePath, buffer)

    console.log(`file save : ${filePath}, size: ${buffer.length} bit`)

    return {
      success: true,
      savedPath: filePath,
      relativePath: relativePath,
      filename
    }
  } catch (error) {
    console.error('save file error:', error)
    return {
      success: false,
      error: `save failed: ${error}`
    }
  }
}

// 读取文件返回base64
export async function readIconFileAsBase64(
  filePath: string
): Promise<{ success: boolean; base64Data?: string; mimeType?: string }> {
  try {
    // 使用 nativeImage 确保兼容处理 ICO 文件
    // const image = nativeImage.createFromPath(filePath);
    const buffer = fs.readFileSync(filePath)

    return {
      success: true,
      base64Data: buffer.toString('base64'),
      mimeType: 'image/png' // 明确返回 MIME 类型
    }
  } catch (error) {
    console.error('read icon file error:', error)
    return { success: false }
  }
}

// 从可执行文件提取图标
// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export async function extractIconFromExe(executablePath: string) {
  try {
    // 使用 Electron 的 nativeImage 从可执行文件创建图标
    const icon = nativeImage.createFromPath(executablePath)

    if (icon.isEmpty()) {
      // 如果 Electron 无法直接提取，尝试使用 Windows API
      if (process.platform === 'win32') {
        const winResult = await extractIconWindows(executablePath)
        return winResult
      }
      return { found: false, error: '无法从可执行文件提取图标' }
    }

    // 转换为 PNG base64
    const pngBuffer = icon.toPNG()
    const base64Icon = pngBuffer.toString('base64')

    if (!base64Icon || base64Icon.trim() === '') {
      console.error('Base64 is empty or invalid from exe extraction')
      return {
        success: false,
        error: 'Base64 is empty or invalid'
      }
    }

    // 将base64图标保存为文件
    const result = await saveIconFile({
      base64Data: base64Icon,
      appId: path.basename(executablePath, path.extname(executablePath))
    })
    if (!result.success) {
      return { found: false, error: 'save file fail' }
    }

    return {
      found: true,
      iconPath: result.savedPath,
      source: 'executable'
    }
  } catch (error) {
    return { found: false, error: `提取图标失败: ${error}` }
  }
}

// Windows 专用的图标提取（使用 C++ 模块或 PowerShell）
// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
async function extractIconWindows(executablePath: string) {
  try {
    const savePath = process.cwd()
    const outputFilename = `icon_${Date.now()}_${path.basename(executablePath, path.extname(executablePath))}.png`
    const outputIco = path.join(savePath, 'icos', outputFilename)
    const tempScriptPath = path.join(savePath, 'temp', 'extract.ps1')

    const escapedExePath = executablePath.replace(/ /g, '_')
    const escapedOutputPath = outputIco.replace(/ /g, '_')

    // console.log(`${escapedExePath} ${escapedOutputPath}`)

    if (!fileExists(tempScriptPath)) {
      fs.mkdirSync(path.dirname(tempScriptPath), { recursive: true })

      const psScript = `if ($args.Count -lt 2) {
    Write-Error "Error: 需要两个参数: exePath 和 outPath"
    exit 1
}

$rawExePath = $args[0]
$rawOutPath = $args[1]

$exePath = $rawExePath -replace "''", "'"
$exePath = $exePath -replace "_", " "
$outPath = $rawOutPath -replace "''", "'"

if (-not (Test-Path $exePath -PathType Leaf)) {
    Write-Error "Error: Executable file not found: $exePath (原始: $rawExePath)"
    exit 1
}

$outputDir = [System.IO.Path]::GetDirectoryName($outPath)
if (!(Test-Path $outputDir)) {
    New-Item -ItemType Directory -Path $outputDir -Force | Out-Null
}

[Console]::InputEncoding = [Text.UTF8Encoding]::new($false)
[Console]::OutputEncoding = [Text.UTF8Encoding]::new($false)
Add-Type -AssemblyName System.Drawing

try {
    $icon = [System.Drawing.Icon]::ExtractAssociatedIcon($exePath)
    $icon.ToBitmap().Save($outPath, [System.Drawing.Imaging.ImageFormat]::Png)
    Write-Output $outPath
}
catch {
    Write-Error "Error: $($_.Exception.Message)"
    exit 1
}`
      // 保存脚本到文件
      fs.writeFileSync(tempScriptPath, psScript, 'utf8')
    }

    // console.log(`${escapedExePath} ${escapedOutputPath}`)
    const { stdout, stderr } = await execAsync(
      `powershell -ExecutionPolicy Bypass -File "${tempScriptPath}" "${escapedExePath}" "${escapedOutputPath}"`
    )
    const output = stdout.trim()

    if (stderr.trim()) {
      // 如果 PowerShell 脚本内部有错误，它会输出到 stderr
      return { found: false, error: `PowerShell 脚本错误: ${stderr.trim()}` }
    }

    // 检查输出是否为有效的路径
    if (!output) {
      return { found: false, error: `PowerShell 未返回有效路径或文件不存在。Output: ${output}` }
    }

    return {
      found: true,
      iconPath: output, // 返回临时文件保存的绝对路径
      source: 'winAPI'
    }
  } catch (error) {
    return { found: false, error: `Windows 图标提取失败: ${error}` }
  }
}

// 在可执行文件同级目录查找图标文件
// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export async function findIconInDirectory(executablePath: string) {
  const dir = path.dirname(executablePath)
  // const baseName = path.basename(executablePath, path.extname(executablePath));
  // 常见图标文件扩展名
  const iconExtensions = ['.ico']

  try {
    // 读取目录下的所有文件
    const entries = fs.readdirSync(dir)

    for (const entry of entries) {
      const iconPath = path.join(dir, entry)

      try {
        if (!fs.statSync(iconPath).isFile()) {
          continue // 不是文件，跳过
        }
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
      } catch (err) {
        continue // 读取文件状态失败或者权限问题，跳过
      }

      const ext = path.extname(entry).toLowerCase()

      // 判断拓展名是否在常见图标文件扩展名中
      if (iconExtensions.includes(ext)) {
        return {
          found: true,
          iconPath: iconPath,
          source: 'directory'
        }
      }
    }

    return { found: false }
  } catch (error) {
    return { found: false, error: `Directory scan failed: ${error}` }
  }
}

// 检查文件是否存在
export function fileExists(filePath: string): boolean {
  return fs.existsSync(filePath)
}

// 使用 Windows API 或 PowerShell 获取系统图标
// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export async function getWindowsIcon(executablePath: string) {
  try {
    const psScript = `
      $shell = New-Object -ComObject Shell.Application
      $folder = $shell.Namespace((Get-Item "${executablePath}").DirectoryName)
      $item = $folder.ParseName((Get-Item "${executablePath}").Name)
      $iconPath = $item.ExtractIcon(0)  # 获取第一个图标
      $iconPath
    `

    const { stdout } = await execAsync(`powershell -Command "${psScript}"`)
    const iconPath = stdout.trim()

    if (iconPath) {
      // 提取图标数据
      const icon = nativeImage.createFromPath(iconPath)
      if (!icon.isEmpty()) {
        const pngBuffer = icon.toPNG()
        const base64Icon = pngBuffer.toString('base64')
        // 保存文件
        const result = await saveIconFile({
          base64Data: base64Icon,
          appId: path.basename(executablePath, path.extname(executablePath)) + '_system'
        })
        if (result.success) {
          return {
            found: true,
            iconPath: result.savedPath,
            iconData: base64Icon, // 也可以返回 base64 数据
            source: 'system'
          }
        } else {
          return { found: false, error: 'save file fail' }
        }
      } else {
        return { found: false, error: 'icon is empty' }
      }
    } else {
      return { found: false }
    }
  } catch (error) {
    return { found: false, error: `获取 Windows 图标失败: ${error}` }
  }
}

// 从注册表获取图标信息
// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export async function getIconFromRegistry(executablePath: string) {
  try {
    const psScript = `
      $exePath = "${executablePath.replace(/\\/g, '\\\\')}"
      # 在注册表中查找关联的图标
      $regPath = "HKLM:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\App Paths\\"
      Get-ChildItem $regPath -Recurse | Where-Object {
        (Get-ItemProperty $_.PSPath)."(default)" -eq $exePath
      } | ForEach-Object {
        $iconPath = (Get-ItemProperty $_.PSPath).Icon
        if ($iconPath) {
          $iconPath
          break
        }
      }
    `
    const { stdout } = await execAsync(`powershell -Command "${psScript}"`)
    const iconPath = stdout.trim()
    if (iconPath && fs.existsSync(iconPath)) {
      return {
        found: true,
        iconPath: iconPath
      }
    }

    return { found: false }
  } catch (error) {
    return { found: false, error: `Registry query failed: ${error}` }
  }
}

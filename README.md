

<div align="center">
    <h1>
        <img src="./resources/favicon.png" alt="koe" width="55px" height="50px">
        <span > Radish GameTools</span>
    </h1>
</div>
<p align="center" style="font-family: 'Roboto', sans-serif; font-size: 1em; color: #555;">
    <img title="QQ Group" src="https://img.shields.io/badge/QQ群-983104022-brightgreen" style="margin: 0 10px;">
    <img title="Github" src="https://img.shields.io/badge/GitHub-100000?style=for-the-badge&logo=github&logoColor=white">
    <img title="Typescript" src="https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white">
    <img title="Version" src="https://img.shields.io/badge/RadishGameTools-v0.0.2dev-blue">
</p>


​		

​         **RadishGameTools** 是一个基于 **Electron + React + TypeScript** 技术栈构建的现代化桌面应用启动器和软件使用统计工具。项目采用 **C++ 原生模块** 处理高性能图标提取和系统调用，结合 **Better-SQLite3** 数据库实现结构化数据管理。架构上采用清晰的主进程/渲染进程分离设计，通过 **Electron IPC** 实现进程间通信，配合 **shadcn/ui + Tailwind CSS** 提供现代化响应式界面。项目融合了原生性能优势与现代前端开发实践，实现了智能应用管理、详细使用统计和跨平台系统深度集成。but，如果你要问我为什么不用steam？难道你不会鬼使神差的点开某个游戏然后玩一下午吗？（笑）

> :warning: 当前处于开发版本，部分功能并不完善，很期待能够有更多的人加入这个项目一切完善它
>
> :warning: 版本号中包含 *dev* 即表示属于开发测试版本



<img src="\resources\github_1.png" alt="koe" width="850px" height="500px">



<img src="\resources\github_2.png" alt="koe" width="850px" height="500px">



## 🏗️ 技术栈

### 前端
- **Electron** - 跨平台桌面应用框架
- **React 19** - 用户界面库
- **TypeScript** - 类型安全的 JavaScript
- **Tailwind CSS** - 实用优先的 CSS 框架
- **shadcn/ui**  - 多种样式、可访问的 UI 组件
- **Recharts** - 图表可视化库

### 后端
- **Node.js** - JavaScript 运行时
- **Better-SQLite3** - 高性能 SQLite 数据库
- **原生 C++ 模块** - 用于图标提取和系统集成
- **Electron IPC** - 进程间通信

### 开发工具
- **Vite** - 快速的构建工具
- **Electron Vite** - Electron 专用的 Vite 配置
- **ESLint & Prettier** - 代码质量和格式化
- **pnpm** - 快速的包管理器

## 📁 项目结构

```
RadishGameTools/
├── src/
│   ├── main/                    # Electron 主进程
│   │   ├── applanuch/          # 应用启动器
│   │   ├── database/           # 数据库管理
│   │   └── services/           # 服务层
│   ├── renderer/               # React 渲染进程
│   │   └── src/
│   │       ├── app/            # 主应用页面
│   │       ├── components/     # React 组件
│   │       └── lib/            # 工具函数
│   ├── preload/                # 预加载脚本
│   └── shared/                 # 共享类型定义
├── native/                     # C++ 原生模块
│   ├── src/                    # 原生代码
│   └── build/                  # 编译输出
├── resources/                  # 应用资源文件
├── save/                       # 用户数据存储
└── config/                     # 配置文件
```



## 🚀 快速开始

### 环境要求
- Node.js 18+
- pnpm 8+
- Python 3.x (用于构建原生模块)

### 安装依赖
```bash
# 使用 pnpm 安装依赖
pnpm install

# 构建原生模块
pnpm run build:native
```

### 额外的包

```json
# 可见于package.json中的部分，如果出现环境问题可优先根据此处的包检查是否有遗漏

"dependencies": {
    "@electron-toolkit/preload": "^3.0.2",
    "@electron-toolkit/utils": "^4.0.0",
    "@radix-ui/react-alert-dialog": "^1.1.15",
    "@radix-ui/react-dialog": "^1.1.15",
    "@radix-ui/react-label": "^2.1.8",
    "@radix-ui/react-scroll-area": "^1.2.10",
    "@radix-ui/react-select": "^2.2.6",
    "@radix-ui/react-separator": "^1.1.8",
    "@radix-ui/react-slot": "^1.2.4",
    "@radix-ui/react-switch": "^1.2.6",
    "@radix-ui/react-tooltip": "^1.2.8",
    "app-launcher-native": "file:./native",
    "auto-launch": "^5.0.6",
    "better-sqlite3": "^12.5.0",
    "class-variance-authority": "^0.7.1",
    "clsx": "^2.1.1",
    "electron-updater": "^6.3.9",
    "lucide-react": "^0.555.0",
    "node-addon-api": "^8.5.0",
    "postcss": "^8.5.6",
    "react-resizable-panels": "^3.0.6",
    "recharts": "^3.5.1",
    "tailwind-merge": "^3.4.0",
    "tailwindcss": "^4.1.17",
    "tw-animate-css": "^1.4.0",
    "uuid": "^13.0.0"
    
  },
  "devDependencies": {
    "@electron-forge/cli": "^7.10.2",
    "@electron-toolkit/eslint-config-prettier": "^3.0.0",
    "@electron-toolkit/eslint-config-ts": "^3.1.0",
    "@electron-toolkit/tsconfig": "^2.0.0",
    "@electron/rebuild": "^4.0.1",
    "@tailwindcss/postcss": "^4.1.17",
    "@types/node": "^22.18.6",
    "@types/react": "^19.1.13",
    "@types/react-dom": "^19.1.9",
    "@vitejs/plugin-react": "^5.0.3",
    "sqlite3": "^5.1.7",
    "sirv": "^3.0.2",
    "ws": "^8.18.3",
    "opener": "^1.5.2",
    "electron": "^38.1.2",
    "electron-builder": "^25.1.8",
    "electron-rebuild": "^3.2.9",
    "electron-vite": "^4.0.1",
    "eslint": "^9.36.0",
    "eslint-plugin-react": "^7.37.5",
    "eslint-plugin-react-hooks": "^5.2.0",
    "eslint-plugin-react-refresh": "^0.4.20",
    "next": "^16.0.5",
    "node-gyp": "^12.1.0",
    "prettier": "^3.6.2",
    "react": "^19.2.0",
    "react-dom": "^19.2.0",
    "typescript": "^5.9.2",
    "vite": "^7.1.6"
  },
```

还有一件事, 如果你需要对原生模块做修改，则 native 中也需要配置环境， 否则直接使用 `native/build/Release`下的node文件即可

```json
{
  "name": "radish_game_tools_actuator",
  "version": "0.0.1",
  "description": "RadishGameTools's actuator",
  "main": "index.js",
  "scripts": {
    "install": "node-gyp rebuild",
    "build": "node-gyp build",
    "clean": "node-gyp clean",
    "rebuild": "node-gyp rebuild",
    "build:electron": "node-gyp rebuild --target=^38.1.2 --arch=x64 --dist-url=https://electronjs.org/headers"
  },
  "keywords": [],
  "author": "Repork",
  "license": "ISC",
  "packageManager": "pnpm@10.6.1",
  "dependencies": {
    "node-addon-api": "^8.5.0"
  },
  "devDependencies": {
    "node-gyp": "^12.1.0"
  }
}
```





### 开发模式

```bash
# 启动开发服务器
pnpm run dev
```

### 构建应用
```bash
# 构建 Windows 应用
pnpm build:win

# 构建 macOS 应用
pnpm build:mac

# 构建 Linux 应用
pnpm build:linux
```



## 🛠️ 原生模块

项目包含两个原生 C++ 模块：

### 1. App Launcher (`app_launcher`)

> 因为框架权限沙箱原因，这部分实现后并未启用

- 高性能应用启动管理
- 进程状态监控
- 系统集成功能

### 2. Icon Thumbnail (`icon_thumbnail`)

- 从可执行文件提取图标
- 图标缩略图生成
- 系统图标缓存



注意： 如果你需要对原生模块进行再开发，请务必阅读一下提示

1. 完成后进入native目录构建模块

   ```bash
   pnpm run rebuild
   ```

   

2. 如果是额外的功能，你需要编写验证脚本验证可用性，如果是对已有的功能做拓展或修复，请执行已有的验证脚本

   ```bash
   # 记得修改 test-direct.js 中的测试路径
   node .\src\preload\test-direct.js
   ```

   



## 📈 数据统计功能

### 使用统计
- **总使用时长**：每个应用的总运行时间
- **启动次数**：应用启动频率统计
- **会话记录**：详细的启动和关闭时间
- **趋势分析**：使用模式的可视化分析

### 报告功能
- **日报/周报/月报**：不同时间维度的统计
- **分类统计**：按应用分类分析使用情况
- **效率分析**：识别使用模式和优化建议

### 代码规范
- 使用 TypeScript 并启用严格模式
- 遵循 ESLint 和 Prettier 配置
- 编写清晰的注释和文档
- 添加适当的测试，尤其是原生模块需要进行测试后调用！

## 🔮 未来扩展

在之后的版本中，我们会优先向一下方向推进，同时也欢迎所有人提供意见

- **云同步**：用户数据跨设备同步

- **插件系统**：第三方功能扩展

- **在线版本检测和新版本下载**：通过 github 和 主站（radishtools.fun） 实现

- **多语言支持** ： 通过以插件补丁的方式实现多语言的支持

  

## 📄 许可证

本项目采用 MIT 许可证

## 🙏 致谢

- [Electron](https://www.electronjs.org/) - 跨平台桌面应用框架
- [React](https://reactjs.org/) - 用户界面库
- [Tailwind CSS](https://tailwindcss.com/) - CSS 框架
-  **shadcn/ui** - UI 组件库
- [Recharts](https://recharts.org/) - 图表库

## 📞 联系方式

如有问题或建议，请通过以下方式联系告知：
- 提交 [GitHub Issue](https://github.com/Ashisheng2005/RadishGameTools/issues)
- 发送邮件至 Repork@qq.com
- 注册 https://radishtools.fun/blog 发布相关博客

---

**RadishGameTools** - 让您的应用管理更智能、更高效！ 芜湖，全都给我飞起来！🚀


<div align="center">
    <h1>
        <img src="./resources/favicon.png" alt="koe" width="50px" height="50px">
        <span > Radish GameTools</span>
    </h1>
</div>

一个现代化的桌面应用启动器和软件使用统计工具，基于 Electron + React + TypeScript 构建。





![github_1](.\resources\github_1.png)



![github_1](.\resources\github_2.png)





## ✨ 功能特性

### 🚀 应用管理
- **智能应用启动器**：快速启动和管理桌面应用程序
- **应用分类管理**：支持自定义分类，方便组织应用
- **应用图标提取**：自动从可执行文件提取图标
- **应用设置自定义**：为每个应用配置启动参数和选项

### 📊 使用统计
- **详细使用记录**：自动记录每个应用的使用时长
- **数据可视化**：使用 Recharts 展示使用统计图表
- **会话管理**：跟踪应用启动、运行和关闭状态
- **历史数据分析**：查看每日、每周、每月的使用情况

### ⚙️ 系统集成
- **开机自启动**：支持系统启动时自动运行
- **系统托盘**：最小化到系统托盘，方便快速访问
- **原生模块**：使用 C++ 原生模块进行高性能图标提取
- **数据库存储**：使用 SQLite 存储应用数据和使用记录

### 🎨 用户界面
- **现代化 UI**：基于 Tailwind CSS 和 Radix UI 组件构建
- **主题切换**：支持亮色、暗色和系统主题
- **响应式布局**：可调整大小的侧边栏和面板
- **沉浸模式**：专注模式，减少干扰

## 🏗️ 技术栈

### 前端
- **Electron** - 跨平台桌面应用框架
- **React 19** - 用户界面库
- **TypeScript** - 类型安全的 JavaScript
- **Tailwind CSS** - 实用优先的 CSS 框架
- **Radix UI** - 无样式、可访问的 UI 组件
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
- Windows SDK (Windows 平台)

### 安装依赖
```bash
# 使用 pnpm 安装依赖
pnpm install

# 构建原生模块
pnpm run build:native
```

### 开发模式
```bash
# 启动开发服务器
pnpm dev
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

## 🔧 配置说明

### 应用配置
应用支持以下配置选项：
- **主题设置**：亮色/暗色/系统主题
- **启动行为**：开机自启动、最小化到托盘
- **数据统计**：使用统计、日志记录
- **系统集成**：图标提取、进程管理

### 数据库
应用使用 SQLite 数据库存储数据，包含以下表：
- `apps` - 应用基本信息和使用统计
- `sessions` - 应用会话记录
- `logs` - 系统日志
- `stats` - 统计数据

## 🛠️ 原生模块

项目包含两个原生 C++ 模块：

### 1. App Launcher (`app_launcher`)
- 高性能应用启动管理
- 进程状态监控
- 系统集成功能

### 2. Icon Thumbnail (`icon_thumbnail`)
- 从可执行文件提取图标
- 图标缩略图生成
- 系统图标缓存

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

## 🤝 贡献指南

欢迎提交 Issue 和 Pull Request！

### 开发流程
1. Fork 项目
2. 创建功能分支 (`git checkout -b feature/amazing-feature`)
3. 提交更改 (`git commit -m 'Add amazing feature'`)
4. 推送到分支 (`git push origin feature/amazing-feature`)
5. 创建 Pull Request

### 代码规范
- 使用 TypeScript 并启用严格模式
- 遵循 ESLint 和 Prettier 配置
- 编写清晰的注释和文档
- 添加适当的测试

## 📄 许可证

本项目采用 MIT 许可证 - 查看 [LICENSE](LICENSE) 文件了解详情。

## 🙏 致谢

- [Electron](https://www.electronjs.org/) - 跨平台桌面应用框架
- [React](https://reactjs.org/) - 用户界面库
- [Tailwind CSS](https://tailwindcss.com/) - CSS 框架
- [Radix UI](https://www.radix-ui.com/) - UI 组件库
- [Recharts](https://recharts.org/) - 图表库

## 📞 联系方式

如有问题或建议，请通过以下方式联系：
- 提交 [GitHub Issue](https://github.com/yourusername/RadishGameTools/issues)
- 发送邮件至 Repork@qq.com

---

**RadishGameTools** - 让您的应用管理更智能、更高效！ 🚀

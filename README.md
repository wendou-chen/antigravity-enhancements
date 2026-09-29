# Antigravity Web Enhancements (反重力全能增强套件)

> 专为 **Google Antigravity 桌面客户端** 量身定制的高品质交互增强套件。  
> 通过 Chrome DevTools Protocol (CDP) 注入引擎与常驻自愈守护进程，带来媲美 DSH 的丝滑体验。

---

## 🌟 核心特性

| 功能 | 说明 | 交互方式 |
| :--- | :--- | :--- |
| 📐 **页面阅读宽度自调整** | 全屏模式下告别被动拉伸，正文与输入框优雅居中聚拢；支持四档宽度切换：`紧凑 (760px)` / `标准 (896px)` / `宽屏 (1140px)` / `全宽 (100%)` | 快捷键 **`Alt + W`** 或悬浮球点击轮转 |
| ⚡ **可拖拽悬浮控制球 (FAB)** | 桌面右下角常驻悬浮控制球，支持任意位置拖拽记忆，外围 100% 点击穿透，展开菜单一键控制全套功能 | 单击展开菜单 / 长按拖拽位置 |
| 📐 **LaTeX 公式点击复制** | 命中模型输出中的 KaTeX / Math 节点，单击公式即时提取纯净 TeX 源码至剪贴板，并提供毛玻璃 Toast 反馈 | 单击任意数学公式 |
| 💬 **划词引用回复** | 划选 Agent 历史回复内容，自动在上方浮现圆润胶囊气泡，一键提取为 Markdown 引用块插入到底部输入框 | 划词弹出气泡或按 **`Alt + Q`** |
| ⌨️ **发送模式无缝切换** | 支持在「`Ctrl + Enter` 发送 / `Enter` 换行」与「`Enter` 发送 / `Shift + Enter` 换行」之间秒级切换，杜绝误触 | 悬浮球菜单一键切换 |
| 🔄 **动态 DOM 自愈注入守护** | 彻底摆脱对静态 ID 的依赖，采用探针式常驻 Daemon，无论客户端重启、切换工作区还是 `F5` / `Ctrl+R` 刷新界面，均在 **1.5 秒内自动完成静默热补注** | 随系统/客户端全自动静默运行 |

---

## 🛠️ 项目架构

```text
antigravity-enhancements/
├── src/
│   ├── cdp/
│   │   ├── injector.js        # CDP 端口扫描、目标发现与 DOM 探针式自愈注入引擎
│   │   └── client-assets.js   # 动态聚合 CSS 与 JS 注入负载
│   ├── client/
│   │   ├── client.js          # 注入到 Antigravity 页面中的交互逻辑（FAB、快捷键、公式、引用）
│   │   └── client.css         # 现代毛玻璃 UI 样式与过渡动画
│   ├── daemon.js              # 独立后台常驻守护进程（单实例锁 + 自愈重连）
│   └── extension.js           # VS Code 扩展规范兼容适配器
├── anti-enhancements-daemon.vbs# Windows 后台静默无窗口启动脚本
├── start-daemon.ps1           # 守护进程启动与自检脚本
├── stop-daemon.ps1            # 守护进程安全终止脚本
├── status.ps1                 # 运行状态与实机 DOM 注入实时探测
├── package.json               # 模块依赖与元数据声明
└── README.md                  # 项目全景说明
```

---

## 🚀 快速上手与运维

### 1. 启动守护进程
```powershell
.\start-daemon.ps1
```

### 2. 检查运行状态与实机注入
```powershell
.\status.ps1
```
输出示例：
```text
==========================================================
       Antigravity Enhancements Lifecycle Status          
==========================================================
  Daemon Status     : RUNNING (PID: 42864, Memory: 68.1 MB)
  Antigravity PID   : 9248 (Active)
  DevTools CDP Port : 55013
  Live DOM Injection: {"fab":true,"style":true,"width":"760px"}
==========================================================
```

### 3. 停止守护进程
```powershell
.\stop-daemon.ps1
```

### 4. 开机自启
本项目内置自动开机唤醒脚本，直接将 `anti-enhancements-daemon.vbs` 快捷方式放入 Windows `Startup` 目录即可：
`%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup\antigravity-enhancements.vbs`

---

## 📄 License

[MIT License](LICENSE)

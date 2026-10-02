# Antigravity Web Enhancements (反重力全能增强套件)

> 专为 **Google Antigravity 桌面客户端** 量身定制的高品质交互增强套件。  
> 通过 Chrome DevTools Protocol (CDP) 注入引擎与常驻自愈守护进程，带来媲美 DSH 的丝滑体验。

---

## 🌟 核心特性

| 功能 | 说明 | 交互方式 |
| :--- | :--- | :--- |
| 🌐 **Trancy 沉浸式划词翻译** | 划选中英文单词/句子瞬时弹窗，集成 Trancy 官方免鉴权权威词典、音标/拼音、分词性释义、例句与有道 50ms 极速兜底 | 划选任意文本或悬浮球切换气泡/Ctrl模式 |
| ✨ **AI 语境消歧 (彩色渐变标签)** | 双轨渐进渲染：首屏秒开词典，异步并发提取上下文句子并调用本地 CPA 8317 引擎，1:1 像素级呈现 Trancy 官方彩色流转光晕语境释义 | 划选中英文单词时全自动分析 |
| 📚 **本地生词本与收藏** | 词典卡片一键收藏生词（★），本地持久化存储，支持悬浮球状态查看与全量管理 | 点击卡片右上角星标 |
| 📐 **页面阅读宽度自调整** | 全屏模式下告别被动拉伸，正文与输入框优雅居中聚拢；支持四档宽度切换：`紧凑 (760px)` / `标准 (896px)` / `宽屏 (1140px)` / `全宽 (100%)` | 快捷键 **`Alt + W`** 或悬浮球点击轮转 |
| ⚡ **可拖拽悬浮控制球 (FAB)** | 桌面右下角常驻悬浮控制球，支持任意位置拖拽记忆，外围 100% 点击穿透，展开菜单一键控制全套功能 | 单击展开菜单 / 长按拖拽位置 |
| 📐 **LaTeX 公式点击复制** | 命中模型输出中的 KaTeX / Math 节点，单击公式即时提取纯净 TeX 源码至剪贴板，并提供毛玻璃 Toast 反馈 | 单击任意数学公式 |
| ⌨️ **发送模式无缝切换** | 支持在「`Ctrl + Enter` 发送 / `Enter` 换行」与「`Enter` 发送 / `Shift + Enter` 换行」之间秒级切换，杜绝误触 | 悬浮球菜单一键切换 |
| 🔄 **动态 DOM 自愈注入守护** | 采用探针式常驻 Daemon，无论客户端重启、切换工作区还是 `F5` / `Ctrl+R` 刷新界面，均在 **1.5 秒内自动完成静默热补注** | 随系统/客户端全自动静默运行 |

---

## 🛠️ 项目架构

```text
antigravity-enhancements/
├── src/
│   ├── cdp/
│   │   ├── injector.js        # CDP 端口扫描、目标发现与 DOM 探针式自愈注入引擎
│   │   └── client-assets.js   # 动态聚合 CSS 与 JS 注入负载
│   ├── client/
│   │   ├── client.js          # 注入运行时（Trancy 词典、AI 上下文消歧、FAB、safeStorage）
│   │   └── client.css         # 现代毛玻璃 UI 样式与 Trancy conic-gradient 渐变动画
│   ├── daemon.js              # 独立后台常驻守护进程（单实例锁 + 自愈重连）
│   └── extension.js           # VS Code 扩展规范兼容适配器
├── tests/
│   └── smoke_test.js          # 按照工作区 ECC 标准编写的自动化六级物理门禁冒烟测试
├── docs/
│   ├── REVERSE_ENGINEERING.md # Trancy 协议逆向、彩色光晕 CSS 规格与数据流矩阵
│   └── ARCHITECTURE.md        # 系统拓扑、生命周期守卫与发布铁律
├── anti-enhancements-daemon.vbs# Windows 后台静默无窗口启动脚本
├── start-daemon.ps1           # 守护进程启动与自检脚本
├── stop-daemon.ps1            # 守护进程安全终止脚本
├── status.ps1                 # 运行状态探测（支持 -Test 自动化冒烟验收）
├── CHANGELOG.md               # 版本迭代、真实问题与演进复盘日志
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

### 3. 一键端到端健康验收 (Smoke Test)
```powershell
.\status.ps1 -Test
# 或直接运行
node tests/smoke_test.js
```

### 4. 停止守护进程
```powershell
.\stop-daemon.ps1
```

### 5. 开机自启
本项目内置自动开机唤醒脚本，直接运行 `.\setup-autostart.ps1` 即可配置。

---

## 📄 License

[MIT License](LICENSE)

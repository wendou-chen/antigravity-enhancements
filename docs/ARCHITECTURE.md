# Antigravity Enhancements 系统架构与生命周期守卫 (ARCHITECTURE.md)

> 本文档规范了 Antigravity Enhancements 的守护进程自愈体系、CDP 动态注入引擎及三重门禁验收标准。

---

## 一、系统全景拓扑

```text
Windows 操作系统 (宿主环境)
│
├── 1. 自愈守护进程 (anti-enhancements-daemon.vbs -> daemon.js)
│    ├── 启动方式: WMI Win32_Process Detached 独立进程 (PID 隔离)
│    ├── 守护机制:
│    │    ├── 单实例 PID 文件锁 (daemon.pid)
│    │    ├── 心跳看门狗 (每 1.5s 检查 Antigravity DevToolsActivePort)
│    │    └── 进程自愈与死锁重连 (循环超时保护与强制回收)
│    └── 开机持久化: HKCU Run 注册表键 + 开始菜单启动项双重守护
│
├── 2. 动态注入引擎 (src/cdp/injector.js)
│    ├── 动态探针: 读取 %APPDATA%\Antigravity\DevToolsActivePort 发现 CDP 调试端口
│    ├── 目标过滤: 自动枚举 /json 识别主工作区窗口 (Mark / Obsidian / Antigravity)
│    ├── 幂等注入:
│    │    ├── 样式表检测 (data-version === '2.3.0')
│    │    ├── 悬浮球检测 (.anti-fab-container)
│    │    └── 发生刷新 (F5) 或页面重载时在 1.5s 内静默热补注
│    └── 资源聚合: src/cdp/client-assets.js 动态合并 client.css 与 client.js
│
└── 3. 页面交互运行时 (src/client/client.js)
     ├── 安全存储层: safeStorage (内存字典兜底，抵御 data: URL SecurityError)
     ├── 词典核心: TrancyEngine (免鉴权 /1/dictionary + 有道 50ms 兜底 + Google 兜底)
     ├── 语境消歧: queryContextExplain (本地 CPA 8317 端口 gemini-3.1-flash-lite)
     ├── 本地缓存: _TRANSLATE_CACHE (500 条 LRU 0ms 瞬间直出)
     └── UI 视图层:
          ├── 可拖拽 FAB 悬浮控制球 (.anti-fab-container)
          ├── 词典卡片 (.trancy-card-container)
          └── Trancy 原生同款彩色光晕语境消歧标签 (.pos.ai)
```

---

## 二、标准化维护与开发命令

| 命令 | 作用 |
| :--- | :--- |
| `.\start-daemon.ps1` | 静默启动后台自愈守护进程 (Detached WMI) |
| `.\stop-daemon.ps1` | 安全关闭守护进程与关联 Node 实例 |
| `.\status.ps1` | 查看运行状态、内存占用、CDP 端口与 DOM 注入证据 |
| `.\status.ps1 -Test` | **执行全套 6 级自动化冒烟验收测试套件 (Smoke Test)** |
| `node tests/smoke_test.js` | 直接执行端到端物理门禁验收脚本 |

---

## 三、重大发布与修改交付铁律

修改本套件任何源码（`client.js`、`client.css`、`injector.js`）交付前，**必须无条件执行以下四步闭环**：

1. **版本号同步递增**：
   - `package.json` 中的 `version`；
   - `src/cdp/client-assets.js` 中的 `data-version`；
   - `src/cdp/injector.js` 中的 `checkScript` 判断版本；
   - `src/client/client.js` 中的 FAB 面板展示版本。
2. **静态语法校验**：
   ```powershell
   node -c src/client/client.js; node -c src/cdp/client-assets.js; node -c src/cdp/injector.js
   ```
3. **热重载与冒烟验收**：
   ```powershell
   .\stop-daemon.ps1; .\start-daemon.ps1
   .\status.ps1 -Test
   ```
   **必须确认全部 6 项门禁均为绿色 [PASS]，方可宣称完成。**
4. **CHANGELOG 记录与提交**：
   - 在 `CHANGELOG.md` 记录详细问题现象、逆向根因、架构改进；
   - 执行 Git 提交。

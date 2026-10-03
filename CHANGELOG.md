# Antigravity Enhancements 更新与逆向日志 (CHANGELOG)

## [v2.4.1] - 2026-10-03

### 🎨 交互减噪与静默直出 (Silent Plan Mode Toggle)
- **剔除多余 Toast 弹窗条幅**：
  - 彻底移除 `togglePlanMode()` 中的模式切换弹窗条幅（`showToast`），消除屏幕中央遮挡与视觉噪音；
  - 保持输入框内原生胶囊芯片（包含官方 ballot 图标与 `plan` 标签）及 FAB 悬浮控制中心 Badge（`标准` / `Plan`）的双重实时状态反馈；
  - 实现零干扰、不打断打字心流的极致沉浸式键盘快捷切换（`Shift + Tab` / `Alt + P`）。
- **生命周期守卫与文档固化**：
  - 在工作区级 `AGENTS.md` 沉淀 Section 4「Antigravity Lexical 富文本与计划模式守卫」与 7 级物理门禁标准；
  - 形成对官方 Feature Request（官方富文本缺少计划模式快捷键的问题报告）的最佳合规建议与草案。

---

## [v2.4.0] - 2026-10-03

### 🌟 核心特性 (Antigravity 计划模式 Plan Mode 快速切换)
- **底层逆向突破 (Lexical contextScopeItemMention 原生节点适配)**：
  - 深入探查 Antigravity 输入框底层架构，确证为 Facebook Lexical 富文本编辑器；
  - 揭示纯文本 `/plan` 无法激活计划模式的根因：Antigravity 消息解析依赖内部 DecoratorNode `contextScopeItemMention` 结构，纯文本输入仅产生普通 `text` 节点；
  - 动态从 React Fiber 树检索 `slashCommandItems` 中的官方 `plan` 系统指令契约（包含 `modelFacingText`、`icon: ballot` 等），直接通过 `NodeClass.importJSON({ data: dataPayload })` 毫秒级原生直出胶囊芯片，零按键模拟、零弹窗闪烁。
- **双向平滑切换引擎 (`togglePlanMode`)**：
  - **一键开启**：输入框顶格插入原生 `slashCommand:plan` 胶囊并追加间隔空格，保留光标在文本末尾，用户原有草稿文本 100% 无损保留；
  - **一键关闭**：安全从 Lexical 树中移除 `contextScopeItemMention(plan)` 节点并智能消除前置多余空格，光标保持聚焦，秒级恢复常规对话。
- **多通道交互矩阵**：
  - **快捷键**：支持 `Shift + Tab`（与 DSH 肌肉记忆对齐）及 `Alt + P` 双快捷键一键秒切；
  - **FAB 控制中心**：悬浮球菜单新增「🎯 计划模式」按钮，实时呈现 `标准` 与高亮 `Plan` 徽标；
  - **输入态实时同态**：挂载输入监听，用户手动 Backspace 删掉胶囊时，FAB 状态徽标自动同态回退为 `标准`。
- **自动化物理门禁升级**：
  - `status.ps1 -Test` 自动化冒烟测试套件升级至 7 级物理门禁，CDP 实机验证计划模式开启/关闭/DOM 胶囊挂载与清除全部 100% PASS。

---

## [v2.3.0] - 2026-10-02

### 🌟 核心特性 (Trancy 原生同款 AI 上下文消歧)
- **双轨渐进渲染 (Progressive Dual-Track Rendering)**：
  - **第一轨 (0~100ms)**：即时调用 Trancy 原生免鉴权权威词典接口（`/1/dictionary`），瞬间呈现音标、基础词性紫色方块、权威例句；
  - **第二轨 (异步极速流入)**：在释义区预插入 Trancy 原版同款带有 `conic-gradient(#488cfb, #29dbbc, ...)` 彩色光晕与 `rotate-hue` 旋转动画的 AI 占位框；后台并发调用本地极速引擎（CPA 8317 端口 `gemini-3.1-flash-lite`），以轻量级 Prompt 完成上下文词义消歧并平滑填入，失败或离线优雅移除。
- **智能段落语境提取 (`extractContextSentence`)**：
  - 划词时自动沿 DOM 树向上探测所属段落/消息容器，按中英文标点精准提取包含目标词的上下文句子（限制 160 字符），杜绝无关冗余上下文。
- **本地零成本免会员**：
  - 彻底规避 Trancy 官方 `/1/explain` 强制绑定的付费会员限制，以本地 CPA 号池提供完全免费、无速率限制的毫秒级上下文词义消歧。

---

## [v2.2.3] - 2026-10-02

### 🐛 问题修复与健壮性
- **修复划中文词报「离线」错误**：
  - 引入中英文智能分流识别，中文词（≤12字符）自适应传递 `target=zh-CN&native=en`，返回拼音 `[shì yìng]` + 英文核心对应释义；
  - Google 动态翻译长句按中文/英文自动配置语言对（`sl=zh-CN&tl=en` / `sl=auto&tl=zh-CN`）；
  - 增加网易有道 Suggest 原生极速建议词典作为 30~50ms 秒级兜底。
- **修复 `data:` URL 沙箱环境下的 `localStorage` `SecurityError`**：
  - 封装带内存全局 fallback 的 `safeStorage`，防止 Electron 初始加载或沙箱页抛出权限拒绝异常阻断脚本运行。
- **中英双向真人发音**：
  - 英文单词调用真人美音音频流（`type=0`），中文词语调用标准普通话真人发音流（`le=zh`）。

---

## [v2.2.2] - 2026-10-02

### ⚡ 架构重构 (原生词典替代慢速 LLM)
- **剔除慢速大模型查词**：
  - 全面逆向并接入 Trancy 官方免鉴权原生字典接口 `https://api.trancy.org/1/dictionary`，将查词响应时间从原本 3~5 秒大幅缩减至 150ms；
- **本地全局 LRU 高速缓存**：
  - 引入 500 条上限的内存 LRU 缓存，重复查词实现 0ms 瞬间直出。

---

## [v2.2.1] - 2026-10-02

### 🧹 交互精简
- **移除划词引用回复功能**：
  - 彻底移除 `anti-quote-toolbar` 与快捷键，消除与 Antigravity 原生划词引用浮动条的重叠与竞争冲突。

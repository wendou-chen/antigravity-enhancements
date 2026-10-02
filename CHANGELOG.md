# Antigravity Enhancements 更新与逆向日志 (CHANGELOG)

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

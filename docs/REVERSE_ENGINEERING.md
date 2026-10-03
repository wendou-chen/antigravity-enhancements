# Trancy 核心协议与沉浸翻译技术逆向手册 (REVERSE_ENGINEERING.md)

> 本文档固化了对 Trancy 官方 Chrome 扩展（版本 `7.9.3_0`，扩展 ID: `mjdbhokoopacimoekfgkcoogikbfgngb`）的完整逆向分析结论与技术规格，供 Antigravity Enhancements 及周边网关生态维护参考。

---

## 一、官方功能与数据流拓扑矩阵

Trancy 客户端根据不同场景将请求分流到三类截然不同的服务通路中：

```text
Trancy 客户端请求路由拓扑
│
├── 1. 原生基础词典 (普通紫色 pos 标签: n. / web. / v.)
│    ├── 请求类型: GET https://api.trancy.org/1/dictionary
│    ├── 鉴权机制: 【免鉴权 / 开放接口】零 Cookie、零 Token 依赖
│    ├── 响应时间: 100ms ~ 200ms
│    └── 承载内容: 音标(phonetics)、分词性常规释义(explains/dict)、例句(examples)、词形变化(inflections)
│
├── 2. 单词语境 AI 消歧 (彩色光晕渐变 pos 标签: [n.] 支持者)
│    ├── 请求类型: GET https://api.trancy.org/1/explain?target=...&word=...&sentence=...
│    ├── 鉴权机制: 【Trancy 官方会员专属】强制要求登录态 Cookie/Token
│    ├── 拦截表现: 未登录返回 HTTP 401 (Please login)；非会员返回 HTTP 403 (premium_required)
│    └── 源码实锤: edreader-main.js:2116396 `if (!(user?.premium) && 403 === i) return uo.toggleSlider("/setting/premium");`
│
└── 3. 用户自建自定义 API (用户配置的 Gemini / OpenAI / 8000 网关)
     ├── 请求协议: POST /v1/chat/completions 或 POST /v1beta/models/...:generateContent
     └── 权限范围: 【严格受限】仅用于「网页整页沉浸式双语翻译」、「划长句/大段落翻译」与「YouTube 视频总结」
                   Trancy 官方词典卡片中的上下文消歧从来不调用用户的自定义 API。
```

---

## 二、Trancy 基础词典 (`/1/dictionary`) 逆向参数规格

### 1. 语言方向参数规范
- **英译中（划选英文）**：
  ```http
  GET https://api.trancy.org/1/dictionary?text=supporters&target=en&native=zh-CN
  ```
  - 音标位于 `data.phonetics`（`locale === 'us'` 或 `'uk'`）；
  - 核心释义位于 `data.translation` 或 `data.explains[0].terms`；
  - 分词性解析位于 `data.explains` 数组（包含 `pos` 与 `terms`）。

- **中译英（划选中文字词，如「适应」）**：
  ```http
  GET https://api.trancy.org/1/dictionary?text=适应&target=zh-CN&native=en
  ```
  - 拼音位于 `data.phonetics`（`locale === 'default'`，如 `[shì yìng]`）；
  - 核心英文位于 `data.dict` 或 `data.translation`；
  - 分词性解析位于 `data.dict` 数组（例如 `verb: adapt, fit, suit / noun: adaptation`）。

> ⚠️ **防踩坑守卫**：严禁中文字词请求时将参数写死为 `target=en&native=zh-CN`，否则服务端返回空或结构不匹配，导致客户端误判为接口离线。

---

## 三、Trancy 官方同款彩色渐变光晕样式规格

Trancy 客户端对 AI 上下文消歧项采用了一套标志性的视觉语言，通过 CSS 遮罩技术实现：

```css
/* 1. 词性标签基础容器 */
.pos.ai {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 26px;
  height: 20px;
  padding: 0 6px;
  font-size: 11px;
  font-weight: 700;
  color: #F8FAFC;
  background: rgba(255, 255, 255, 0.08);
  border-radius: 6px;
  box-sizing: border-box;
}

/* 2. 圆锥多色渐变与遮罩发光边框 (Trancy 核心资产) */
.pos.ai::after {
  --m-i: linear-gradient(#000, #000);
  --m-o: content-box, padding-box;
  content: "";
  position: absolute;
  left: 0;
  top: 0;
  width: 100%;
  height: 100%;
  padding: 1.5px;
  border-radius: 6px;
  background-image: conic-gradient(#488cfb, #29dbbc, #ddf505, #ff9f0e, #e440bb, #655adc, #488cfb);
  box-sizing: border-box;
  -webkit-mask-image: var(--m-i), var(--m-i);
  mask-image: var(--m-i), var(--m-i);
  -webkit-mask-origin: var(--m-o);
  mask-origin: var(--m-o);
  -webkit-mask-clip: var(--m-o);
  mask-clip: var(--m-o);
  -webkit-mask-composite: destination-out;
  mask-composite: exclude;
  filter: hue-rotate(0deg);
}

/* 3. 异步分析中的流转光彩动效 */
.pos.ai.loading::after {
  animation: rotate-hue linear 1.2s infinite;
}

@keyframes rotate-hue {
  0% { filter: hue-rotate(0deg); }
  100% { filter: hue-rotate(360deg); }
}
```

---

## 四、本地自建双轨渐进渲染方案 (Progressive Dual-Track)

为摆脱 Trancy 官方对 `/1/explain` 施加的付费门槛，本套件在客户端实现了**双轨渐进直出引擎**：

1. **第一轨 (0~100ms 瞬时直出)**：
   - 划词时立即发起免鉴权 `/1/dictionary` 请求；
   - 立即渲染词典面板与音标，释义区插入 Loading 态彩色边框占位符；
2. **第二轨 (异步后台分析)**：
   - 从 DOM 提取包含目标词的上下文句子（限制 160 字符）；
   - 并发请求本地 CPA 网关（`http://127.0.0.1:8317/v1/chat/completions`，模型锁定为 `gemini-3.1-flash-lite` 0 元号池）；
   - 提取严格 JSON：`{"pos":"n.","translation":"支持者"}`，平滑更新彩色占位框；
   - 若超时（>6s）或网关未开启，占位框优雅静默移除，绝不破坏基础词典秒开体验。

---

## 五、沙箱与环境防御守卫 (Security Directives)

1. **`data:` URL 与沙箱页面禁用 `localStorage` 守卫**：
   - **事故根因**：Electron 启动阶段或特定 webview 处于 `data:text/html` 沙箱环境。直接调用 `window.localStorage` 会触发 Chromium 原生抛出 `SecurityError: Failed to read the 'localStorage' property from 'Window': Storage is disabled inside 'data:' URLs.`，导致后续所有注入脚本全部中断。
   - **铁律防御**：所有存储读写统一经由 `safeStorage` 封装托管，在抛出异常时自动回退至 `window.__ANTI_MEM_STORAGE__` 内存对象，保证任意页面环境零崩溃。

---

## 六、Antigravity 计划模式 (Plan Mode) 与富文本 Lexical 架构逆向

### 1. 为什么纯文本 `/plan` 彻底无效？
- **DSH Web 架构**：DSH 采用纯文本 Command Claiming 机制，在 `<textarea>` 顶格插入 `/plan ` 后 dispatch 一个包含 keyCode 的 Space 键盘事件即可激活命令黄色高亮。
- **Antigravity 桌面架构**：输入框采用 **Facebook Lexical 富文本框架**（节点挂载 `editorEl.__lexicalEditor`）。消息提交时，Antigravity 不检查纯文本内容，而是解析 Lexical 树中的 DecoratorNode。纯文本输入只会创建普通 `PD` / `text` 节点，完全不会被系统识别为计划模式。

### 2. 原生 Slash Command 节点真实结构
通过 DevTools CDP 探查确认，Antigravity 注册的斜杠指令不是社区的 `beautifulMention`，而是专有扩展节点：
- **节点类型**：`type: "contextScopeItemMention"`（继承自 Lexical `MI` DecoratorNode）；
- **Payload 契约**：
  ```json
  {
    "trigger": "@",
    "value": "contextScopeItemMention",
    "data": {
      "mentionText": "plan",
      "data": "{\"slashCommand\":{\"info\":{\"name\":\"plan\",\"modelFacingText\":\"<PLAN>The user is requesting that you think and plan carefully before executing the upcoming task...\",\"type\":\"SLASH_COMMAND_TYPE_SYSTEM\",\"icon\":\"ballot\"}}}"
    },
    "type": "contextScopeItemMention",
    "version": 1
  }
  ```
- **DOM 表现**：
  渲染为 `<span data-lexical-decorator="true"><span class="inline-pill" data-uri="slashCommand:plan"><svg data-symbol-name="ballot">...</svg>plan</span></span>`。

### 3. 一键切换核心实现 (`togglePlanMode`)
- **开启**：
  1. 从 React Fiber (`curr.memoizedProps.slashCommandItems`) 动态提取官方 `plan` 指令定义（包含 `modelFacingText` 等），无 Fiber 降级为官方硬编码标准 Prompt；
  2. 获取节点类 `const NodeClass = editor._nodes.get('contextScopeItemMention').klass;`；
  3. 执行 `NodeClass.importJSON({ data: dataPayload })` 创建原生节点；
  4. 在第一段首个子节点前插入（若空段则直接 append），并在胶囊后追加 `' '` 空格节点；
  5. `root.selectEnd()` 将光标平滑聚焦在草稿末尾。
- **关闭**：
  1. 遍历段落子节点数组 `children = [...p.getChildren()]`；
  2. 命中 `node.getType() === 'contextScopeItemMention' && node.__data?.mentionText === 'plan'`；
  3. 检查后置兄弟 `children[i + 1]`（注意：DecoratorNode 无 `getNextSibling` 原型方法，必须通过数组索引查找），若为包含前导空格的文本节点，调用 `setTextContent(text.slice(1))` 清除前导空格；
  4. 调用 `node.remove()` 安全移除胶囊节点，恢复常规模式。

---

## 七、Trancy 官方真会员云端生词本与 AI 消歧协议逆向

### 1. 凭据提取与认证架构
- **存储位置**：Chrome 扩展使用 LevelDB 维护 `Local Extension Settings/mjdbhokoopacimoekfgkcoogikbfgngb`；
- **核心数据项**：LevelDB 内部序列化对象中包含 `user` 字段，其中 `user.token` 即为 Trancy 核心 JWT 鉴权凭据；
- **身份验证**：
  - 端点：`GET https://api.trancy.org/1/user/profile`
  - 请求头：`Authorization: Bearer <TOKEN>`
  - 返回：`{ "data": { "name": "陈文斗", "email": "cwd20050626@gmail.com", "premium": true } }`，且每次请求会滚动续签最新 Token。

### 2. 生词本官方云端协议规范
- **全量拉取生词本**：
  - 请求：`GET https://api.trancy.org/4/words?target=en&native=zh-CN&updatedAt=0`
  - 返回：带有 `text`、`star: true`、`translation`、`phonetic` 的数组；
- **添加/标星收藏生词**：
  - 请求：`POST https://api.trancy.org/1/words`
  - 请求体：`{ "text": "word", "target": "en", "native": "zh-CN", "star": true, "master": false }`
  - 成功返回：HTTP 200 `{ "data": { "text": "word", "star": true }, "message": "ok" }`；
- **取消收藏（去星）**：
  - 请求：`PATCH https://api.trancy.org/1/words/<word>`
  - 请求体：`{ "star": false, "target": "en", "native": "zh-CN" }`
  - 成功返回：HTTP 200 `{ "data": { "star": false }, "message": "ok" }`。

### 3. 会员原生 AI 上下文消歧接口
- **官方端点**：`GET https://api.trancy.org/1/explain?word=<word>&sentence=<sentence>&target=en&native=zh-CN`；
- **参数契约**：目标词参数必须为 `word`（非 `text`，传错报 409 `word: Required`）；
- **鉴权约束**：未带会员 Bearer Token 会报 401/403；带有效会员 Token 毫秒级返回 `{ "data": { "pos": "n.", "translation": "释义" } }`；
- **双轨容灾策略**：优先走官方会员接口，超时（>2.8s）或离线时平滑回退本地 CPA 8317 端口（Gemini 3.1 Flash-Lite）。

---

## 八、Antigravity 宿主主题探测与浅深双向自适应架构

### 1. 宿主主题探针判据
- **Class 契约**：Antigravity 在 `document.body` 挂载了 `theme-light` 与 `theme-dark` 两个标准 class（例如 Solarized Light 下为 `theme-standalone theme-light`）；
- **RGB 亮度兜底计算**：
  ```javascript
  const bg = window.getComputedStyle(document.body).backgroundColor;
  // 解析 rgb(r, g, b)
  const luminance = 0.299 * r + 0.587 * g + 0.114 * b;
  const isLight = luminance > 140; // >140 判定为浅色，否则深色
  ```
- **实时平滑联动**：挂载 `MutationObserver(document.body, { attributes: true, attributeFilter: ['class', 'style'] })`，宿主切换主题时 0ms 自动感知。

### 2. 样式变量分流与 1:1 排版复刻
- **变量分流契约**：在根选择器上通过 `[data-anti-theme="light"]` 与 `[data-anti-theme="dark"]` 分离全套卡片变量；
- **浅色明亮排版（1:1 复刻截图）**：
  - 卡片背景：`#FFFFFF` 纯白，边框 `1px solid rgba(0, 0, 0, 0.09)`；
  - 单词大标题：加粗纯黑字 `#111827`；
  - 音标徽标：浅灰底小胶囊 `#F3F4F6`，文字 `#4B5563`；
  - 词性标签：分词性独立着色（`n.` 紫底 `#EEF2FF` / 深紫字 `#4F46E5`；`web.` 蓝底 `#F3E8FF`；`v.` 绿底 `#ECFDF5`）；
  - AI 语境消歧：白底方形徽标 + `conic-gradient` 旋转彩色光晕边框 + `#0369A1` 高亮中文释义；
  - 手动切换状态持久化于 `safeStorage` 的 `anti_enhance_theme_mode`（`auto` / `light` / `dark`）。




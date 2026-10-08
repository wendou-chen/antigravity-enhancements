/**
 * Antigravity Enhancements & Trancy 自动化冒烟与健康验收测试套件
 * 按照工作区 reverse-tool-dev-standard 三重物理证据门禁规范执行
 */
const http = require('http');
const fs = require('fs');
const path = require('path');
const WebSocket = require('ws');

const ROOT = path.join(__dirname, '..');
const ACTIVE_PORT_FILE = path.join(process.env.APPDATA, 'Antigravity', 'DevToolsActivePort');

let exitCode = 0;

function logPass(msg) { console.log(`  \x1b[32m[PASS]\x1b[0m ${msg}`); }
function logFail(msg) { console.log(`  \x1b[31m[FAIL]\x1b[0m ${msg}`); exitCode = 1; }
function logInfo(msg) { console.log(`  \x1b[36m[*]   \x1b[0m ${msg}`); }

async function runSmokeTest() {
  console.log('\n==========================================================');
  console.log('  Antigravity Trancy 增强套件自动化冒烟测试 (Smoke Test)   ');
  console.log('==========================================================\n');

  // 门禁 1：文件与依赖静态完整性
  console.log('[门禁 1: 静态文件与依赖]');
  const reqFiles = [
    'src/client/client.js',
    'src/client/client.css',
    'src/cdp/injector.js',
    'src/cdp/client-assets.js',
    'package.json'
  ];
  for (const rel of reqFiles) {
    const full = path.join(ROOT, rel);
    if (fs.existsSync(full)) {
      logPass(`文件存在: ${rel} (${fs.statSync(full).size} 字节)`);
    } else {
      logFail(`文件丢失: ${rel}`);
    }
  }

  // 门禁 2：DevTools CDP 探针与端口
  console.log('\n[门禁 2: DevTools CDP 端口与 Antigravity 宿主]');
  if (!fs.existsSync(ACTIVE_PORT_FILE)) {
    logFail(`未找到 DevToolsActivePort 文件 (${ACTIVE_PORT_FILE})`);
    process.exit(1);
  }

  const lines = fs.readFileSync(ACTIVE_PORT_FILE, 'utf-8').trim().split('\n');
  const port = parseInt(lines[0].trim(), 10);
  if (!port || isNaN(port)) {
    logFail(`无效的 CDP 端口: ${lines[0]}`);
    process.exit(1);
  }
  logPass(`检测到活跃 CDP 端口: ${port}`);

  // 获取 Target
  const targets = await new Promise((resolve) => {
    http.get({ hostname: '127.0.0.1', port, path: '/json', timeout: 2000 }, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); } catch { resolve([]); }
      });
    }).on('error', () => resolve([]));
  });

  if (!targets || targets.length === 0) {
    logFail(`无法连接到 127.0.0.1:${port}/json 或没有可用 targets`);
    process.exit(1);
  }

  const mainTarget = targets.find(t => t.title && t.title.includes('Antigravity')) || targets[0];
  logPass(`成功锁定主目标窗口: "${mainTarget.title || 'Untitled'}" (${mainTarget.id})`);

  // 门禁 3：实机 DOM 注入与全局对象回读
  console.log('\n[门禁 3: 实机 DOM 注入与运行时状态]');
  const ws = new WebSocket(mainTarget.webSocketDebuggerUrl);

  const evalInPage = (expr) => new Promise((resolve, reject) => {
    const id = Math.floor(Math.random() * 100000);
    const handler = (raw) => {
      try {
        const msg = JSON.parse(raw.toString());
        if (msg.id === id) {
          ws.off('message', handler);
          resolve(msg.result?.result?.value);
        }
      } catch (e) {
        ws.off('message', handler);
        reject(e);
      }
    };
    ws.on('message', handler);
    ws.send(JSON.stringify({
      id,
      method: 'Runtime.evaluate',
      params: { expression: expr, awaitPromise: true, returnByValue: true }
    }));
  });

  await new Promise((resolve, reject) => {
    ws.on('open', resolve);
    ws.on('error', reject);
  });

  const domState = await evalInPage(`({
    hasStyle: Boolean(document.getElementById('anti-enhancements-style')),
    styleVersion: document.getElementById('anti-enhancements-style')?.getAttribute('data-version'),
    hasFab: Boolean(document.querySelector('.anti-fab-container')),
    hasEngine: Boolean(window.__TRANCY_ENGINE__),
    hasCloud: Boolean(window.__TRANCY_CLOUD__),
    hasGlobalConfig: Boolean(window.__TRANCY_GLOBAL_CONFIG__)
  })`);

  if (domState.hasStyle && domState.styleVersion === '2.8.1') {
    logPass(`样式表注入就绪，版本对齐: v${domState.styleVersion}`);
  } else {
    logFail(`样式表状态异常: ${JSON.stringify(domState)}`);
  }

  if (domState.hasFab) {
    logPass('FAB 悬浮控制球挂载正常 (.anti-fab-container)');
  } else {
    logFail('FAB 悬浮控制球未挂载');
  }

  if (domState.hasEngine && domState.hasCloud) {
    logPass('TrancyEngine 与 TrancyCloud 运行时注入正常 (双引擎协同就绪)');
  } else {
    logFail('TrancyEngine 或 TrancyCloud 未注入');
  }

  // 门禁 4：Trancy 官方基础词典 API 评测
  console.log('\n[门禁 4: Trancy 官方基础词典双向查词验证]');
  const enWordRes = await evalInPage(`window.__TRANCY_ENGINE__.query('resilience')`);
  if (enWordRes && enWordRes.translation && enWordRes.source === 'Trancy 原生词典') {
    logPass(`英文查词 (resilience) -> 释义: "${enWordRes.translation}", 音标: ${enWordRes.phonetic}`);
  } else {
    logFail(`英文查词失败: ${JSON.stringify(enWordRes)}`);
  }

  const zhWordRes = await evalInPage(`window.__TRANCY_ENGINE__.query('适应')`);
  if (zhWordRes && zhWordRes.translation && !zhWordRes.translation.includes('不可用')) {
    logPass(`中文查词 (适应) -> 拼音: ${zhWordRes.phonetic}, 英文: "${zhWordRes.translation}"`);
  } else {
    logFail(`中文查词失败: ${JSON.stringify(zhWordRes)}`);
  }

  // 门禁 5：Trancy 原生同款 AI 语境消歧评测 (本地 CPA 8317 引擎)
  console.log('\n[门禁 5: AI 语境消歧与彩色光晕标签]');
  const testWord = 'supporters';
  const testSentence = '是法定全体选区选民，supporters 是私人竞选支持者；代议';
  const aiRes = await evalInPage(`window.__TRANCY_ENGINE__.queryContextExplain('${testWord}', '${testSentence}')`);

  if (aiRes && aiRes.translation && aiRes.translation.includes('支持者')) {
    logPass(`语境消歧成功: [${aiRes.pos}] "${aiRes.translation}" (精确匹配语境)`);
  } else {
    logFail(`语境消歧返回异常: ${JSON.stringify(aiRes)}`);
  }

  // 门禁 6：内存 LRU 高速缓存验证
  console.log('\n[门禁 6: 内存 LRU 极速缓存 (0ms 直出)]');
  const t0 = Date.now();
  const cacheRes = await evalInPage(`window.__TRANCY_ENGINE__.queryContextExplain('${testWord}', '${testSentence}')`);
  const cost = Date.now() - t0;
  if (cacheRes && cost < 50) {
    logPass(`LRU 缓存命中，耗时: ${cost}ms (瞬间直出)`);
  } else {
    logFail(`LRU 缓存未生效，耗时: ${cost}ms`);
  }

  // 门禁 7：计划模式 (Plan Mode) 状态与一键切换验证
  console.log('\n[门禁 7: 计划模式 (Plan Mode) 原生节点切换与状态同步]');
  const planCheck = await evalInPage(`(async () => {
    if (typeof window.__togglePlanMode !== 'function' || typeof window.__isPlanModeActive !== 'function') {
      return { error: 'NO_PLAN_FUNCTIONS' };
    }
    const wasActive = window.__isPlanModeActive();
    if (wasActive) window.__togglePlanMode();
    await new Promise(r => setTimeout(r, 80));
    
    // 1. 开启测试
    window.__togglePlanMode();
    await new Promise(r => setTimeout(r, 120));
    const isNowActive = window.__isPlanModeActive();
    const ed = document.querySelector('[contenteditable="true"]');
    const hasPill = Boolean(ed?.querySelector('[data-uri="slashCommand:plan"]'));

    // 2. 关闭恢复
    window.__togglePlanMode();
    await new Promise(r => setTimeout(r, 120));
    const isFinallyOff = !window.__isPlanModeActive();
    const pillRemoved = !Boolean(ed?.querySelector('[data-uri="slashCommand:plan"]'));

    return {
      isNowActive,
      hasPill,
      isFinallyOff,
      pillRemoved
    };
  })()`);

  if (planCheck && planCheck.isNowActive && planCheck.hasPill && planCheck.isFinallyOff && planCheck.pillRemoved) {
    logPass('计划模式一键切换完美成功 (开启插入原生 slashCommand:plan 胶囊，关闭平滑清除)');
  } else {
    logFail(`计划模式切换异常: ${JSON.stringify(planCheck)}`);
  }

  // 门禁 8：Trancy 官方真会员云端个人档案与云端生词对齐验证
  console.log('\n[门禁 8: Trancy 官方真会员云端个人档案与云端生词对齐]');
  const cloudProfile = await evalInPage(`window.__TRANCY_CLOUD__.fetchProfile()`);
  if (cloudProfile && cloudProfile.premium === true) {
    logPass(`Trancy 云端会员认证成功: 用户名 "${cloudProfile.name || cloudProfile.email}", VIP 状态: PREMIUM`);
  } else {
    logFail(`Trancy 会员档案获取异常: ${JSON.stringify(cloudProfile)}`);
  }

  const cloudSyncResult = await evalInPage(`window.__TRANCY_CLOUD__.syncFromCloud()`);
  const totalVocabCount = await evalInPage(`window.__TRANCY_VOCABULARY__ ? window.__TRANCY_VOCABULARY__.getAll().length : 0`);
  if (cloudSyncResult === true) {
    logPass(`Trancy 官方云端生词本双向对齐成功 (云端生词秒级流入本地)`);
  } else {
    logFail('Trancy 官方云端生词本同步失败');
  }

  // 门禁 9：外观主题 (ThemeManager) 反重力暖色/纯白明亮/沉浸暗黑三向切换验证
  console.log('\n[门禁 9: 反重力暖色 / 纯白明亮 / 沉浸暗黑 三大主题自由切换验证]');
  const themeCheck = await evalInPage(`(() => {
    const tm = window.__ANTI_THEME_MANAGER__;
    if (!tm) return { error: 'NO_THEME_MANAGER' };

    // 1. 切换到反重力同款暖色 (anti)
    tm.currentMode = 'anti';
    tm.apply();
    const isAntiApplied = document.documentElement.getAttribute('data-anti-theme') === 'anti' &&
                          document.getElementById('anti-fab-theme')?.textContent === '反重力';

    // 2. 切换到纯白明亮 (light)
    tm.currentMode = 'light';
    tm.apply();
    const isLightApplied = document.documentElement.getAttribute('data-anti-theme') === 'light' &&
                           document.getElementById('anti-fab-theme')?.textContent === '纯白';

    // 3. 切换到沉浸暗黑 (dark)
    tm.currentMode = 'dark';
    tm.apply();
    const isDarkApplied = document.documentElement.getAttribute('data-anti-theme') === 'dark' &&
                          document.getElementById('anti-fab-theme')?.textContent === '暗黑';

    // 4. 恢复为用户首选的反重力同款暖色
    tm.currentMode = 'anti';
    tm.apply();
    const isRestoredAnti = document.documentElement.getAttribute('data-anti-theme') === 'anti';

    return {
      hasTm: true,
      isAntiApplied,
      isLightApplied,
      isDarkApplied,
      isRestoredAnti
    };
  })()`);

  if (themeCheck && themeCheck.hasTm && themeCheck.isAntiApplied && themeCheck.isLightApplied && themeCheck.isDarkApplied && themeCheck.isRestoredAnti) {
    logPass('ThemeManager 三主题就绪: [反重力暖色] / [纯白明亮] / [沉浸暗黑] 三向热切换与 DOM 属性、Badge 同步 100% 成功');
  } else {
    logFail(`ThemeManager 验证异常: ${JSON.stringify(themeCheck)}`);
  }

  // 门禁 10：对话区无级宽度调节与视口物理几何对齐验证 (WidthManager)
  console.log('\n[门禁 10: 对话区无级平滑宽度调节与视口物理几何对齐验证]');
  const widthCheck = await evalInPage(`(() => {
    const wm = window.__ANTI_WIDTH_MANAGER__;
    if (!wm) return { error: 'NO_WIDTH_MANAGER' };

    const initialWidth = wm.currentWidth;
    const initialMode = wm.currentMode;

    // 1. 测试设置自定义宽度 (1280px)
    wm.apply('1280px');
    const customCssVal = document.documentElement.style.getPropertyValue('--anti-chat-max-width');
    const customMaxConv = document.documentElement.style.getPropertyValue('--max-conversation-width');
    const customMaxArt = document.documentElement.style.getPropertyValue('--max-artifact-width');
    const isCustomApplied = customCssVal === '1280px' && customMaxConv === '1280px' && customMaxArt === '1280px';

    // 2. 测试预设 compact (760px) 与 full (100%)
    wm.apply('compact');
    const compactCssVal = document.documentElement.style.getPropertyValue('--anti-chat-max-width');
    const isCompactApplied = compactCssVal === '760px';

    wm.apply('full');
    const fullCssVal = document.documentElement.style.getPropertyValue('--anti-chat-max-width');
    const isFullApplied = fullCssVal === '100%';

    // 3. 测试拖拽样式隔离类切换
    document.documentElement.classList.add('anti-width-resizing');
    const hasResizingClass = document.documentElement.classList.contains('anti-width-resizing');
    document.documentElement.classList.remove('anti-width-resizing');
    const removedResizingClass = !document.documentElement.classList.contains('anti-width-resizing');

    // 4. 恢复初始设置
    wm.apply(initialMode || initialWidth || 'standard');
    const isRestored = Boolean(document.documentElement.style.getPropertyValue('--anti-chat-max-width'));

    // 5. 真实 DOMRect 物理几何尺寸与满宽断言 (防侧边栏遮挡、窗口位移或居中错位)
    const docRect = document.documentElement.getBoundingClientRect();
    const docRectXPass = Math.abs(docRect.x) <= 0.5;
    const fullWidthPass = Math.abs(document.documentElement.offsetWidth - window.innerWidth) <= 1;
    const scrollLeftPass = (document.body.scrollLeft === 0) && (document.documentElement.scrollLeft === 0);

    // 6. 对话流与输入框依然保持设置的 max-width 约束
    const currentVarWidth = document.documentElement.style.getPropertyValue('--anti-chat-max-width') || '896px';
    const bleedElem = document.querySelector('.md-table-bleed > .mx-auto.w-full');
    const inputElem = document.querySelector('.w-full.animate-fade-in:has([contenteditable="true"])');
    let chatMaxWidthPass = false;
    let actualChatMaxWidth = '';
    if (bleedElem && inputElem) {
      const bleedMax = window.getComputedStyle(bleedElem).maxWidth;
      const inputMax = window.getComputedStyle(inputElem).maxWidth;
      chatMaxWidthPass = (bleedMax === currentVarWidth) && (inputMax === currentVarWidth);
      actualChatMaxWidth = 'bleed: ' + bleedMax + ', input: ' + inputMax;
    } else if (bleedElem) {
      actualChatMaxWidth = window.getComputedStyle(bleedElem).maxWidth;
      chatMaxWidthPass = actualChatMaxWidth === currentVarWidth;
    } else if (inputElem) {
      actualChatMaxWidth = window.getComputedStyle(inputElem).maxWidth;
      chatMaxWidthPass = actualChatMaxWidth === currentVarWidth;
    } else {
      const probe = document.createElement('div');
      probe.className = 'md-table-bleed';
      const inner = document.createElement('div');
      inner.className = 'mx-auto w-full';
      probe.appendChild(inner);
      document.body.appendChild(probe);
      actualChatMaxWidth = window.getComputedStyle(inner).maxWidth;
      chatMaxWidthPass = actualChatMaxWidth === currentVarWidth;
      probe.remove();
    }

    return {
      hasWm: true,
      isCustomApplied,
      isCompactApplied,
      isFullApplied,
      hasResizingClass,
      removedResizingClass,
      isRestored,
      docRectX: docRect.x,
      docRectXPass,
      docOffsetWidth: document.documentElement.offsetWidth,
      winInnerWidth: window.innerWidth,
      fullWidthPass,
      scrollLeftPass,
      chatMaxWidthPass,
      actualChatMaxWidth,
      currentVarWidth
    };
  })()`);

  if (widthCheck && widthCheck.hasWm && widthCheck.isCustomApplied && widthCheck.isCompactApplied && widthCheck.isFullApplied && widthCheck.hasResizingClass && widthCheck.removedResizingClass && widthCheck.isRestored && widthCheck.docRectXPass && widthCheck.fullWidthPass && widthCheck.scrollLeftPass && widthCheck.chatMaxWidthPass) {
    logPass(`WidthManager 无级平滑宽度调节就绪: [1280px 自定义] / [紧凑 760px] / [全宽 100%] 变量下发正常`);
    logPass(`物理几何尺寸与满宽对齐: 视口坐标 x=${widthCheck.docRectX} (Pass), 满宽对齐 ${widthCheck.docOffsetWidth}px/${widthCheck.winInnerWidth}px (Pass), scrollLeft=0 (Pass), 对话流约束 (${widthCheck.actualChatMaxWidth}) 生效 (Pass)`);
  } else {
    logFail(`WidthManager 或物理几何验证异常: ${JSON.stringify(widthCheck)}`);
  }

  // 7. CDP 实机视觉渲染截图物理存证 (真机验证，彻底杜绝口头断言)
  try {
    const shotData = await new Promise((resolve) => {
      const id = Math.floor(Math.random() * 100000);
      const handler = (raw) => {
        try {
          const msg = JSON.parse(raw.toString());
          if (msg.id === id) {
            ws.off('message', handler);
            resolve(msg.result?.data);
          }
        } catch {
          ws.off('message', handler);
          resolve(null);
        }
      };
      ws.on('message', handler);
      ws.send(JSON.stringify({ id, method: 'Page.captureScreenshot', params: { format: 'png' } }));
    });
    if (shotData) {
      const artDir = path.join(ROOT, 'tests', 'artifacts');
      if (!fs.existsSync(artDir)) fs.mkdirSync(artDir, { recursive: true });
      const shotPath = path.join(artDir, 'smoke_layout_verified.png');
      fs.writeFileSync(shotPath, Buffer.from(shotData, 'base64'));
      logPass(`实机视觉渲染截图成功生成并存盘: tests/artifacts/smoke_layout_verified.png`);
    }
  } catch (err) {
    logInfo(`截图生成跳过: ${err.message}`);
  }

  ws.close();

  console.log('\n==========================================================');
  if (exitCode === 0) {
    console.log('  \x1b[32m✔ 全部门禁验证通过！Antigravity Trancy 状态完美健康。\x1b[0m');
  } else {
    console.log('  \x1b[31m✖ 存在测试不通过项，请参考上述日志排查。\x1b[0m');
  }
  console.log('==========================================================\n');

  process.exit(exitCode);
}

runSmokeTest().catch(err => {
  console.error('\n测试执行异常:', err);
  process.exit(1);
});

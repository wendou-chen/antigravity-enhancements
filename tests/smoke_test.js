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
    hasGlobalConfig: Boolean(window.__TRANCY_GLOBAL_CONFIG__)
  })`);

  if (domState.hasStyle && domState.styleVersion === '2.4.0') {
    logPass(`样式表注入就绪，版本对齐: v${domState.styleVersion}`);
  } else {
    logFail(`样式表状态异常: ${JSON.stringify(domState)}`);
  }

  if (domState.hasFab) {
    logPass('FAB 悬浮控制球挂载正常 (.anti-fab-container)');
  } else {
    logFail('FAB 悬浮控制球未挂载');
  }

  if (domState.hasEngine) {
    logPass('TrancyEngine 运行时注入正常 (window.__TRANCY_ENGINE__)');
  } else {
    logFail('TrancyEngine 未注入');
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

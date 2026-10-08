const vscode = require('vscode');
const http = require('http');
const { CDPInjector } = require('./cdp/injector');
const { DesmosServer } = require('./cdp/desmos-server');
const { VocabularyViewProvider } = require('./vocabulary/vocabulary-view');
const vocabStore = require('./vocabulary/vocabulary-store');

let injector = null;
let desmosServer = null;
let statusBarItem = null;
let vocabProvider = null;

function updateStatusBar(enabled) {
  if (!statusBarItem) return;
  const count = vocabStore.getAll().length;
  if (enabled) {
    statusBarItem.text = `$(book) Trancy 翻译 (${count}词)`;
    statusBarItem.tooltip = `Trancy 沉浸翻译已激活 (划词气泡·生词本·公式复制·划词引用)`;
    statusBarItem.backgroundColor = undefined;
  } else {
    statusBarItem.text = '$(circle-slash) Trancy 翻译 (已暂停)';
    statusBarItem.tooltip = '点击重新激活 Trancy 沉浸翻译套件';
    statusBarItem.backgroundColor = new vscode.ThemeColor('statusBarItem.warningBackground');
  }
}

/**
 * 快速翻译选中文本
 */
async function translateText(text) {
  const clean = text.trim();
  const config = vscode.workspace.getConfiguration('antiEnhance');
  const gatewayUrl = config.get('gatewayUrl') || 'http://127.0.0.1:8000';

  return new Promise((resolve) => {
    const postData = JSON.stringify({
      contents: [{ parts: [{ text: clean }] }]
    });

    const url = new URL(`${gatewayUrl}/v1beta/models/google-translate:generateContent?sl=auto&tl=zh-CN`);
    const req = http.request(
      {
        hostname: url.hostname,
        port: url.port || 80,
        path: url.pathname + url.search,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(postData)
        },
        timeout: 4000
      },
      (res) => {
        let raw = '';
        res.on('data', chunk => raw += chunk);
        res.on('end', () => {
          try {
            const data = JSON.parse(raw);
            const trans = data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts && data.candidates[0].content.parts[0] && data.candidates[0].content.parts[0].text;
            if (trans) {
              return resolve({ text: clean, translation: trans.trim(), source: 'Gemini Web2API' });
            }
          } catch {}
          resolve({ text: clean, translation: '翻译解析失败', source: 'Error' });
        });
      }
    );

    req.on('error', () => {
      resolve({ text: clean, translation: '本地 :8000 网关连接失败，请确认服务已启动', source: 'Offline' });
    });
    req.on('timeout', () => {
      req.destroy();
      resolve({ text: clean, translation: '翻译请求超时', source: 'Timeout' });
    });
    req.write(postData);
    req.end();
  });
}

/**
 * @param {vscode.ExtensionContext} context
 */
function activate(context) {
  console.log('[Antigravity-Trancy] Activating extension...');

  // 1. Initialize Status Bar
  statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
  statusBarItem.command = 'antiEnhance.toggle';
  updateStatusBar(true);
  statusBarItem.show();
  context.subscriptions.push(statusBarItem);

  // 2. Initialize Vocabulary View Provider
  vocabProvider = new VocabularyViewProvider(context.extensionUri);
  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider('antiEnhance.vocabularyView', vocabProvider)
  );

  // 3. Initialize CDP Injector & Desmos Server
  const outputChannel = vscode.window.createOutputChannel('Anti Trancy Enhancements');
  injector = new CDPInjector((msg) => outputChannel.appendLine(msg));
  injector.start();

  desmosServer = new DesmosServer(injector, (msg) => outputChannel.appendLine(msg));
  desmosServer.start();

  // 4. Register Commands
  const toggleCmd = vscode.commands.registerCommand('antiEnhance.toggle', async () => {
    if (injector.isRunning) {
      if (desmosServer) desmosServer.stop();
      injector.stop();
      updateStatusBar(false);
      vscode.window.showInformationMessage('Antigravity Trancy 增强套件已暂停。');
    } else {
      injector.start();
      if (desmosServer) desmosServer.start();
      updateStatusBar(true);
      vscode.window.showInformationMessage('Antigravity Trancy 增强套件已激活！');
    }
  });

  const reinjectCmd = vscode.commands.registerCommand('antiEnhance.reinject', async () => {
    if (injector) {
      await injector.forceReinject();
      vscode.window.showInformationMessage('已向 Antigravity 界面重新注入最新 Trancy 增强脚本！');
    }
  });

  // 选区划词翻译命令 (Alt+T)
  const translateCmd = vscode.commands.registerCommand('antiEnhance.translateSelection', async () => {
    const editor = vscode.window.activeTextEditor;
    if (!editor) return;

    const selection = editor.selection;
    const text = editor.document.getText(selection).trim();
    if (!text) {
      vscode.window.showWarningMessage('请先在代码或文档中选中需要翻译的文本！');
      return;
    }

    vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title: `正在翻译: "${text.length > 25 ? text.slice(0, 25) + '...' : text}"`,
        cancellable: false
      },
      async () => {
        const result = await translateText(text);
        const isFav = vocabStore.hasWord(text);
        const favAction = isFav ? '已在生词本' : '★ 加入生词本';

        const choice = await vscode.window.showInformationMessage(
          `【${text}】\n👉 ${result.translation}`,
          favAction,
          '📋 复制译文'
        );

        if (choice === '★ 加入生词本') {
          vocabStore.addWord({ word: text, translation: result.translation, context: editor.document.fileName });
          if (vocabProvider) vocabProvider.refresh();
          updateStatusBar(true);
          vscode.window.showInformationMessage(`★ 已将 "${text}" 收藏至沉浸生词本！`);
        } else if (choice === '📋 复制译文') {
          await vscode.env.clipboard.writeText(result.translation);
          vscode.window.showInformationMessage('译文已复制到剪贴板！');
        }
      }
    );
  });

  const openVocabCmd = vscode.commands.registerCommand('antiEnhance.openVocabulary', async () => {
    await vscode.commands.executeCommand('workbench.view.extension.anti-trancy-sidebar');
  });

  const exportVocabCmd = vscode.commands.registerCommand('antiEnhance.exportVocabulary', async () => {
    const pick = await vscode.window.showQuickPick(['导出为 Markdown 文档 (.md)', '导出为 CSV 表格 (.csv)'], {
      placeHolder: '选择生词本导出格式'
    });
    if (pick && pick.includes('Markdown')) {
      const md = vocabStore.exportMarkdown();
      const doc = await vscode.workspace.openTextDocument({ content: md, language: 'markdown' });
      await vscode.window.showTextDocument(doc);
    } else if (pick && pick.includes('CSV')) {
      const csv = vocabStore.exportCSV();
      const doc = await vscode.workspace.openTextDocument({ content: csv, language: 'csv' });
      await vscode.window.showTextDocument(doc);
    }
  });

  context.subscriptions.push(toggleCmd, reinjectCmd, translateCmd, openVocabCmd, exportVocabCmd);

  // 5. Listen to configuration changes
  context.subscriptions.push(
    vscode.workspace.onDidChangeConfiguration((e) => {
      if (e.affectsConfiguration('antiEnhance')) {
        injector.forceReinject();
      }
    })
  );

  console.log('[Antigravity-Trancy] Successfully activated!');
}

function deactivate() {
  if (desmosServer) {
    desmosServer.stop();
    desmosServer = null;
  }
  if (injector) {
    injector.stop();
    injector = null;
  }
}

module.exports = {
  activate,
  deactivate,
};

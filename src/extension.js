const vscode = require('vscode');
const { CDPInjector } = require('./cdp/injector');

let injector = null;
let statusBarItem = null;

function updateStatusBar(enabled) {
  if (!statusBarItem) return;
  if (enabled) {
    statusBarItem.text = '$(zap) Anti 增强套件';
    statusBarItem.tooltip = 'Antigravity 全能增强套件已激活 (公式复制·划词引用·发送切换·悬浮球)';
    statusBarItem.backgroundColor = undefined;
  } else {
    statusBarItem.text = '$(circle-slash) Anti 增强 (已暂停)';
    statusBarItem.tooltip = '点击重新激活 Antigravity 全能增强套件';
    statusBarItem.backgroundColor = new vscode.ThemeColor('statusBarItem.warningBackground');
  }
}

/**
 * @param {vscode.ExtensionContext} context
 */
function activate(context) {
  console.log('[Antigravity-Enhancements] Activating extension...');

  // 1. Initialize Status Bar
  statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
  statusBarItem.command = 'antiEnhance.toggle';
  updateStatusBar(true);
  statusBarItem.show();
  context.subscriptions.push(statusBarItem);

  // 2. Initialize CDP Injector
  const outputChannel = vscode.window.createOutputChannel('Anti Enhancements');
  injector = new CDPInjector((msg) => outputChannel.appendLine(msg));
  injector.start();

  // 3. Register Commands
  const toggleCmd = vscode.commands.registerCommand('antiEnhance.toggle', async () => {
    if (injector.isRunning) {
      injector.stop();
      updateStatusBar(false);
      vscode.window.showInformationMessage('Antigravity 全能增强套件已暂停。');
    } else {
      injector.start();
      updateStatusBar(true);
      vscode.window.showInformationMessage('Antigravity 全能增强套件已激活！');
    }
  });

  const reinjectCmd = vscode.commands.registerCommand('antiEnhance.reinject', async () => {
    if (injector) {
      await injector.forceReinject();
      vscode.window.showInformationMessage('已向 Antigravity 界面重新注入最新增强脚本！');
    }
  });

  context.subscriptions.push(toggleCmd, reinjectCmd);

  // 4. Listen to configuration changes
  context.subscriptions.push(
    vscode.workspace.onDidChangeConfiguration((e) => {
      if (e.affectsConfiguration('antiEnhance')) {
        injector.forceReinject();
      }
    })
  );

  console.log('[Antigravity-Enhancements] Successfully activated!');
}

function deactivate() {
  if (injector) {
    injector.stop();
    injector = null;
  }
}

module.exports = {
  activate,
  deactivate,
};

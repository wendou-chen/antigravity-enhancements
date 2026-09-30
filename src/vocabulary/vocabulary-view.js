const vscode = require('vscode');
const vocabStore = require('./vocabulary-store');

class VocabularyViewProvider {
  constructor(extensionUri) {
    this._extensionUri = extensionUri;
    this._view = undefined;
  }

  resolveWebviewView(webviewView, context, _token) {
    this._view = webviewView;

    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [this._extensionUri]
    };

    webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);

    webviewView.webview.onDidReceiveMessage(async (data) => {
      switch (data.type) {
        case 'load': {
          const list = vocabStore.getAll();
          this._view.webview.postMessage({ type: 'render', items: list });
          break;
        }
        case 'delete': {
          vocabStore.removeWord(data.id);
          const updated = vocabStore.getAll();
          this._view.webview.postMessage({ type: 'render', items: updated });
          vscode.window.showInformationMessage('已从生词本中移除: ' + data.word);
          break;
        }
        case 'export-md': {
          const md = vocabStore.exportMarkdown();
          const doc = await vscode.workspace.openTextDocument({
            content: md,
            language: 'markdown'
          });
          await vscode.window.showTextDocument(doc);
          vscode.window.showInformationMessage('生词本已导出为 Markdown！');
          break;
        }
        case 'export-csv': {
          const csv = vocabStore.exportCSV();
          const doc = await vscode.workspace.openTextDocument({
            content: csv,
            language: 'csv'
          });
          await vscode.window.showTextDocument(doc);
          vscode.window.showInformationMessage('生词本已导出为 CSV！');
          break;
        }
        case 'refresh': {
          const refreshed = vocabStore.getAll();
          this._view.webview.postMessage({ type: 'render', items: refreshed });
          break;
        }
      }
    });
  }

  refresh() {
    if (this._view) {
      const list = vocabStore.getAll();
      this._view.webview.postMessage({ type: 'render', items: list });
    }
  }

  _getHtmlForWebview(webview) {
    return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>沉浸式生词本</title>
  <style>
    body {
      padding: 10px;
      font-family: var(--vscode-font-family);
      font-size: var(--vscode-font-size);
      color: var(--vscode-foreground);
      background-color: var(--vscode-sideBar-background);
      box-sizing: border-box;
      margin: 0;
    }
    .header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 12px;
      padding-bottom: 8px;
      border-bottom: 1px solid var(--vscode-sideBarSectionHeader-border);
    }
    .title {
      font-size: 13px;
      font-weight: 600;
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .actions {
      display: flex;
      gap: 6px;
    }
    .btn {
      background: var(--vscode-button-secondaryBackground);
      color: var(--vscode-button-secondaryForeground);
      border: 1px solid var(--vscode-button-border, transparent);
      padding: 3px 8px;
      border-radius: 4px;
      font-size: 11px;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 4px;
      transition: opacity 0.15s;
    }
    .btn:hover {
      background: var(--vscode-button-secondaryHoverBackground);
    }
    .search-box {
      width: 100%;
      box-sizing: border-box;
      padding: 6px 8px;
      border-radius: 4px;
      border: 1px solid var(--vscode-input-border);
      background: var(--vscode-input-background);
      color: var(--vscode-input-foreground);
      margin-bottom: 12px;
      outline: none;
      font-size: 12px;
    }
    .search-box:focus {
      border-color: var(--vscode-focusBorder);
    }
    .word-list {
      display: flex;
      flex-direction: column;
      gap: 8px;
      max-height: calc(100vh - 120px);
      overflow-y: auto;
    }
    .word-card {
      background: var(--vscode-editor-background);
      border: 1px solid var(--vscode-widget-border, rgba(255,255,255,0.08));
      border-radius: 6px;
      padding: 8px 10px;
      position: relative;
      transition: transform 0.1s, border-color 0.1s;
    }
    .word-card:hover {
      border-color: var(--vscode-focusBorder);
    }
    .card-top {
      display: flex;
      align-items: baseline;
      justify-content: space-between;
      gap: 6px;
    }
    .word-name {
      font-weight: 700;
      font-size: 13px;
      color: var(--vscode-textLink-foreground);
    }
    .word-phonetic {
      font-size: 11px;
      color: var(--vscode-descriptionForeground);
      font-family: var(--vscode-editor-font-family);
    }
    .card-actions {
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .icon-btn {
      background: none;
      border: none;
      cursor: pointer;
      color: var(--vscode-descriptionForeground);
      padding: 2px;
      font-size: 12px;
      border-radius: 3px;
    }
    .icon-btn:hover {
      color: var(--vscode-foreground);
      background: var(--vscode-toolbar-hoverBackground);
    }
    .word-trans {
      font-size: 12px;
      margin-top: 4px;
      color: var(--vscode-foreground);
      line-height: 1.35;
    }
    .word-example {
      margin-top: 5px;
      padding-top: 4px;
      border-top: 1px dashed var(--vscode-widget-border, rgba(255,255,255,0.06));
      font-size: 11px;
      color: var(--vscode-descriptionForeground);
      line-height: 1.3;
    }
    .empty-state {
      text-align: center;
      padding: 30px 10px;
      color: var(--vscode-descriptionForeground);
      font-size: 12px;
    }
    .badge {
      font-size: 10px;
      padding: 1px 4px;
      border-radius: 3px;
      background: var(--vscode-badge-background);
      color: var(--vscode-badge-foreground);
      font-weight: 500;
    }
  </style>
</head>
<body>
  <div class="header">
    <div class="title">
      <span>📚 生词本</span>
      <span class="badge" id="count-badge">0</span>
    </div>
    <div class="actions">
      <button class="btn" id="btn-export-md" title="导出为 Markdown 格式">📝 MD</button>
      <button class="btn" id="btn-export-csv" title="导出为 CSV 表格">📊 CSV</button>
      <button class="btn" id="btn-refresh" title="刷新列表">🔄</button>
    </div>
  </div>

  <input type="text" class="search-box" id="search-input" placeholder="🔍 搜索生词或中文释义..." />

  <div class="word-list" id="word-list">
    <div class="empty-state">加载中...</div>
  </div>

  <script>
    const vscode = acquireVsCodeApi();
    let allWords = [];

    window.addEventListener('message', event => {
      const message = event.data;
      if (message.type === 'render') {
        allWords = message.items || [];
        renderWords(allWords);
      }
    });

    function speak(text) {
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        const u = new SpeechSynthesisUtterance(text);
        u.lang = 'en-US';
        u.rate = 0.9;
        window.speechSynthesis.speak(u);
      }
    }

    function renderWords(items) {
      const container = document.getElementById('word-list');
      const badge = document.getElementById('count-badge');
      badge.textContent = items.length;

      if (!items || items.length === 0) {
        container.innerHTML = '<div class="empty-state">暂无收藏的生词。<br/><br/>在 Antigravity AI 对话或代码中划词，点击「★ 收藏」即可自动汇集到这里！</div>';
        return;
      }

      container.innerHTML = items.map(item => {
        const phonetic = item.phonetic ? '<span class="word-phonetic">' + escapeHtml(item.phonetic) + '</span>' : '';
        const ex = item.examples && item.examples[0] ? '<div class="word-example">💡 ' + escapeHtml(item.examples[0].en) + '<br/>' + escapeHtml(item.examples[0].zh) + '</div>' : (item.context ? '<div class="word-example">📍 ' + escapeHtml(item.context) + '</div>' : '');
        
        return '<div class="word-card" data-id="' + escapeHtml(item.id) + '">' +
            '<div class="card-top">' +
              '<div>' +
                '<span class="word-name">' + escapeHtml(item.word) + '</span> ' +
                phonetic +
              '</div>' +
              '<div class="card-actions">' +
                '<button class="icon-btn btn-speak" data-word="' + escapeHtml(item.word) + '" title="发音朗读">🔊</button>' +
                '<button class="icon-btn btn-del" data-id="' + escapeHtml(item.id) + '" data-word="' + escapeHtml(item.word) + '" title="删除">🗑️</button>' +
              '</div>' +
            '</div>' +
            '<div class="word-trans">' + escapeHtml(item.translation || item.explanation || '暂无释义') + '</div>' +
            ex +
          '</div>';
      }).join('');

      container.querySelectorAll('.btn-speak').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          speak(btn.dataset.word);
        });
      });

      container.querySelectorAll('.btn-del').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          vscode.postMessage({ type: 'delete', id: btn.dataset.id, word: btn.dataset.word });
        });
      });
    }

    function escapeHtml(str) {
      if (!str) return '';
      return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
    }

    document.getElementById('search-input').addEventListener('input', (e) => {
      const q = e.target.value.trim().toLowerCase();
      if (!q) {
        renderWords(allWords);
        return;
      }
      const filtered = allWords.filter(x => 
        (x.word && x.word.toLowerCase().includes(q)) ||
        (x.translation && x.translation.toLowerCase().includes(q)) ||
        (x.explanation && x.explanation.toLowerCase().includes(q))
      );
      renderWords(filtered);
    });

    document.getElementById('btn-export-md').addEventListener('click', () => {
      vscode.postMessage({ type: 'export-md' });
    });

    document.getElementById('btn-export-csv').addEventListener('click', () => {
      vscode.postMessage({ type: 'export-csv' });
    });

    document.getElementById('btn-refresh').addEventListener('click', () => {
      vscode.postMessage({ type: 'refresh' });
    });

    // 初次加载数据
    vscode.postMessage({ type: 'load' });
  </script>
</body>
</html>`;
  }
}

module.exports = { VocabularyViewProvider };

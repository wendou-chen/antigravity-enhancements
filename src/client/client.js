/**
 * Antigravity Web Enhancements Client Payload
 * Injected into Antigravity Workspace DOM via Chrome DevTools Protocol
 */
(function () {
  // 0. 锁定视口溢出
  try {
    if (document.documentElement) {
      document.documentElement.style.overflowX = 'hidden';
      document.documentElement.style.maxWidth = '100vw';
    }
    if (document.body) {
      document.body.style.overflowX = 'hidden';
      document.body.style.maxWidth = '100vw';
    }
  } catch {}

  // Width Modes
  const WIDTH_MODES = {
    compact: { key: 'compact', label: '紧凑 760px', width: '760px' },
    standard: { key: 'standard', label: '标准 896px', width: '896px' },
    wide: { key: 'wide', label: '宽屏 1140px', width: '1140px' },
    full: { key: 'full', label: '全宽 100%', width: '100%' }
  };
  const WIDTH_ORDER = ['compact', 'standard', 'wide', 'full'];

  // State
  const state = {
    formulaCopyEnabled: true,
    mermaidEnabled: true,
    quoteReplyEnabled: true,
    sendMode: localStorage.getItem('anti_enhance_send_mode') || 'ctrl-enter', // 'ctrl-enter' | 'enter'
    widthMode: localStorage.getItem('anti_enhance_chat_width') || 'standard',
  };

  function applyChatWidth(modeKey, notify = false) {
    const mode = WIDTH_MODES[modeKey] || WIDTH_MODES.standard;
    state.widthMode = mode.key;
    localStorage.setItem('anti_enhance_chat_width', mode.key);
    document.documentElement.style.setProperty('--anti-chat-max-width', mode.width);

    const badge = document.getElementById('anti-fab-width');
    if (badge) {
      badge.textContent = mode.label.split(' ')[0];
    }

    if (notify) {
      showToast('📐 页面宽度已切换', mode.label);
    }
  }

  function cycleChatWidth() {
    const currentIndex = WIDTH_ORDER.indexOf(state.widthMode);
    const nextIndex = (currentIndex + 1) % WIDTH_ORDER.length;
    applyChatWidth(WIDTH_ORDER[nextIndex], true);
  }

  // 立即应用保存的宽度
  applyChatWidth(state.widthMode, false);

  if (window.__ANTI_ENHANCEMENTS_LOADED__) {
    console.log('[AntiEnhance] Already active, re-applied width state.');
    if (!document.querySelector('.anti-fab-container')) {
      // FAB 被 SPA 页面重绘移除时，允许重新挂载
      window.__ANTI_ENHANCEMENTS_LOADED__ = false;
    } else {
      return;
    }
  }
  window.__ANTI_ENHANCEMENTS_LOADED__ = true;

  console.log('[AntiEnhance] Initializing Antigravity Web Enhancements...');

  // -------------------------------------------------------------
  // 1. Toast Notification System
  // -------------------------------------------------------------
  function showToast(title, preview, isError = false, duration = 2200) {
    let viewport = document.querySelector('.anti-toast-viewport');
    if (!viewport) {
      viewport = document.createElement('div');
      viewport.className = 'anti-toast-viewport';
      document.body.appendChild(viewport);
    }

    const card = document.createElement('div');
    card.className = `anti-toast-card ${isError ? 'is-error' : 'is-success'}`;

    const icon = document.createElement('div');
    icon.className = 'anti-toast-icon';
    icon.textContent = isError ? '⚠️' : '📐';

    const content = document.createElement('div');
    content.className = 'anti-toast-content';

    const titleEl = document.createElement('span');
    titleEl.className = 'anti-toast-title';
    titleEl.textContent = title;
    content.appendChild(titleEl);

    if (preview) {
      const prevEl = document.createElement('code');
      prevEl.className = 'anti-toast-preview';
      prevEl.textContent = preview;
      content.appendChild(prevEl);
    }

    card.appendChild(icon);
    card.appendChild(content);
    viewport.appendChild(card);

    setTimeout(() => {
      card.style.opacity = '0';
      card.style.transform = 'translateY(-6px)';
      card.style.transition = 'all 0.2s ease';
      setTimeout(() => card.remove(), 200);
    }, duration - 200);
  }

  // -------------------------------------------------------------
  // 2. LaTeX Formula Click-to-Copy
  // -------------------------------------------------------------
  function extractLatex(target) {
    const katexEl = target.closest('.katex, .katex-display');
    if (katexEl) {
      const annotation = katexEl.querySelector('annotation[encoding="application/x-tex"]');
      if (annotation && annotation.textContent) {
        return annotation.textContent.trim();
      }
      const mathMl = katexEl.querySelector('math');
      if (mathMl && mathMl.getAttribute('alttext')) {
        return mathMl.getAttribute('alttext').trim();
      }
    }
    const texAttr = target.closest('[data-tex], [data-latex]');
    if (texAttr) {
      return texAttr.getAttribute('data-tex') || texAttr.getAttribute('data-latex') || '';
    }
    return '';
  }

  function initFormulaCopy() {
    document.addEventListener('click', (e) => {
      if (!state.formulaCopyEnabled) return;
      const target = e.target;
      if (!target) return;

      const latex = extractLatex(target);
      if (latex) {
        e.preventDefault();
        e.stopPropagation();
        navigator.clipboard.writeText(latex).then(() => {
          showToast('已复制 LaTeX 源码', latex);
        }).catch(() => {
          showToast('复制失败', latex, true);
        });
      }
    }, true);
  }

  // -------------------------------------------------------------
  // 3. Selection Quote Reply
  // -------------------------------------------------------------
  function findActiveComposerInput() {
    const monaco = document.querySelector('.monaco-editor [contenteditable="true"], .monaco-mouse-cursor-text');
    if (monaco) return monaco;

    const activeEl = document.activeElement;
    if (activeEl && (activeEl.tagName === 'TEXTAREA' || activeEl.isContentEditable)) {
      return activeEl;
    }

    return document.querySelector('textarea, [contenteditable="true"]');
  }

  function appendTextToComposer(text) {
    const quoteText = text.split('\n').map(line => `> ${line}`).join('\n') + '\n\n';
    const input = findActiveComposerInput();
    if (!input) {
      navigator.clipboard.writeText(quoteText);
      showToast('已复制引用内容到剪贴板', text.slice(0, 50));
      return;
    }

    if (input.tagName === 'TEXTAREA' || input.tagName === 'INPUT') {
      const val = input.value || '';
      input.value = val ? `${val}\n${quoteText}` : quoteText;
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.focus();
      input.setSelectionRange(input.value.length, input.value.length);
      showToast('已引用至输入框', text.slice(0, 40));
    } else if (input.isContentEditable) {
      input.focus();
      document.execCommand('insertText', false, quoteText);
      showToast('已引用至输入框', text.slice(0, 40));
    }
  }

  function initQuoteReply() {
    let toolbar = document.querySelector('.anti-quote-toolbar');
    if (!toolbar) {
      toolbar = document.createElement('div');
      toolbar.className = 'anti-quote-toolbar';
      toolbar.innerHTML = `<button type="button" class="anti-quote-btn-reply">💬 引用回复</button>`;
      document.body.appendChild(toolbar);
    }

    const btn = toolbar.querySelector('.anti-quote-btn-reply');
    let currentSelectedText = '';

    btn.addEventListener('mousedown', (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (currentSelectedText) {
        appendTextToComposer(currentSelectedText);
        toolbar.classList.remove('is-visible', 'active');
        window.getSelection()?.removeAllRanges();
      }
    });

    const updateToolbar = () => {
      if (!state.quoteReplyEnabled) {
        toolbar.classList.remove('is-visible', 'active');
        return;
      }
      const sel = window.getSelection();
      if (!sel || sel.isCollapsed || !sel.rangeCount) {
        toolbar.classList.remove('is-visible', 'active');
        currentSelectedText = '';
        return;
      }

      const text = sel.toString().trim();
      if (text.length < 2) {
        toolbar.classList.remove('is-visible', 'active');
        currentSelectedText = '';
        return;
      }

      currentSelectedText = text;
      const range = sel.getRangeAt(0);
      const rect = range.getBoundingClientRect();

      if (rect.width === 0 && rect.height === 0) {
        toolbar.classList.remove('is-visible', 'active');
        return;
      }

      const maxLeft = Math.max(10, window.innerWidth - 130);
      const left = Math.max(10, Math.min(maxLeft, window.scrollX + rect.left + rect.width / 2 - 50));
      toolbar.style.top = `${Math.max(10, window.scrollY + rect.top - 42)}px`;
      toolbar.style.left = `${left}px`;
      toolbar.classList.add('is-visible', 'active');
    };

    document.addEventListener('selectionchange', () => {
      setTimeout(updateToolbar, 10);
    });

    document.addEventListener('mouseup', () => {
      setTimeout(updateToolbar, 20);
    });

    // Alt+Q 快捷键引用
    window.addEventListener('keydown', (e) => {
      if (e.altKey && (e.key === 'q' || e.key === 'Q')) {
        const sel = window.getSelection();
        const text = sel ? sel.toString().trim() : '';
        if (text) {
          e.preventDefault();
          appendTextToComposer(text);
          toolbar.classList.remove('is-visible', 'active');
        }
      }
    }, true);
  }

  // -------------------------------------------------------------
  // 4. Send Mode & Global Shortcuts (Alt+W 调宽)
  // -------------------------------------------------------------
  function initKeyboardShortcuts() {
    window.addEventListener('keydown', (e) => {
      // 1. Alt+W 快速切换页面阅读宽度
      if (e.altKey && (e.key === 'w' || e.key === 'W' || e.code === 'KeyW')) {
        e.preventDefault();
        e.stopPropagation();
        cycleChatWidth();
        return;
      }

      // 2. 发送模式切换拦截
      if (e.key === 'Enter') {
        const target = e.target;
        if (!target) return;

        const isInput = target.tagName === 'TEXTAREA' || target.isContentEditable;
        if (!isInput) return;

        if (state.sendMode === 'ctrl-enter') {
          if (e.ctrlKey || e.metaKey) {
            return;
          } else if (!e.shiftKey && !e.altKey) {
            e.stopPropagation();
          }
        }
      }
    }, true);
  }

  // -------------------------------------------------------------
  // 5. Draggable Floating Action Button (FAB)
  // -------------------------------------------------------------
  function initFloatingBall() {
    let container = document.querySelector('.anti-fab-container');
    if (container) return;

    container = document.createElement('div');
    container.className = 'anti-fab-container';
    container.innerHTML = `
      <div class="anti-fab-trigger" title="Antigravity 全能增强套件 (拖拽移动)">
        <span class="anti-fab-icon">⚡</span>
      </div>
      <div class="anti-fab-menu">
        <div class="anti-fab-menu-header">
          <span>Anti Enhancements</span>
          <span style="color:#60A5FA;">v1.2</span>
        </div>
        <button type="button" class="anti-fab-menu-item" data-action="chat-width">
          <div class="anti-fab-item-left">
            <span>📐</span>
            <span>页面宽度 (Alt+W)</span>
          </div>
          <span class="anti-fab-badge is-active" id="anti-fab-width">${WIDTH_MODES[state.widthMode]?.label.split(' ')[0] || '标准'}</span>
        </button>
        <button type="button" class="anti-fab-menu-item" data-action="send-mode">
          <div class="anti-fab-item-left">
            <span>⌨️</span>
            <span>发送模式</span>
          </div>
          <span class="anti-fab-badge is-active" id="anti-fab-send-mode">${state.sendMode === 'ctrl-enter' ? 'Ctrl+Enter' : 'Enter'}</span>
        </button>
        <button type="button" class="anti-fab-menu-item" data-action="quote">
          <div class="anti-fab-item-left">
            <span>💬</span>
            <span>划词引用</span>
          </div>
          <span class="anti-fab-badge ${state.quoteReplyEnabled ? 'is-active' : ''}" id="anti-fab-quote">${state.quoteReplyEnabled ? '开' : '关'}</span>
        </button>
        <button type="button" class="anti-fab-menu-item" data-action="formula">
          <div class="anti-fab-item-left">
            <span>📐</span>
            <span>公式复制</span>
          </div>
          <span class="anti-fab-badge ${state.formulaCopyEnabled ? 'is-active' : ''}" id="anti-fab-formula">${state.formulaCopyEnabled ? '开' : '关'}</span>
        </button>
      </div>
    `;

    document.body.appendChild(container);

    const trigger = container.querySelector('.anti-fab-trigger');
    const menu = container.querySelector('.anti-fab-menu');

    // 菜单展开/收起
    let isMenuOpen = false;
    const toggleMenu = (open) => {
      isMenuOpen = typeof open === 'boolean' ? open : !isMenuOpen;
      if (isMenuOpen) {
        menu.classList.add('is-active');
      } else {
        menu.classList.remove('is-active');
      }
    };

    // 拖拽逻辑
    let isDragging = false;
    let startX = 0, startY = 0;
    let initialX = 0, initialY = 0;
    let hasMoved = false;

    // 恢复位置
    try {
      const savedPos = JSON.parse(localStorage.getItem('anti_enhance_fab_pos') || 'null');
      if (savedPos && savedPos.right !== undefined && savedPos.bottom !== undefined) {
        const safeRight = Math.max(16, Math.min(window.innerWidth - 56, savedPos.right));
        const safeBottom = Math.max(16, Math.min(window.innerHeight - 56, savedPos.bottom));
        container.style.right = `${safeRight}px`;
        container.style.bottom = `${safeBottom}px`;
      }
    } catch {}

    trigger.addEventListener('pointerdown', (e) => {
      isDragging = true;
      hasMoved = false;
      startX = e.clientX;
      startY = e.clientY;
      const rect = container.getBoundingClientRect();
      initialX = window.innerWidth - rect.right;
      initialY = window.innerHeight - rect.bottom;
      trigger.setPointerCapture(e.pointerId);
    });

    trigger.addEventListener('pointermove', (e) => {
      if (!isDragging) return;
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;
      if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
        hasMoved = true;
        const newRight = Math.max(16, Math.min(window.innerWidth - 56, initialX - dx));
        const newBottom = Math.max(16, Math.min(window.innerHeight - 56, initialY - dy));
        container.style.right = `${newRight}px`;
        container.style.bottom = `${newBottom}px`;
      }
    });

    trigger.addEventListener('pointerup', (e) => {
      if (!isDragging) return;
      isDragging = false;
      trigger.releasePointerCapture(e.pointerId);

      if (hasMoved) {
        const rect = container.getBoundingClientRect();
        const pos = {
          right: Math.max(16, Math.min(window.innerWidth - 56, window.innerWidth - rect.right)),
          bottom: Math.max(16, Math.min(window.innerHeight - 56, window.innerHeight - rect.bottom))
        };
        localStorage.setItem('anti_enhance_fab_pos', JSON.stringify(pos));
      } else {
        toggleMenu();
      }
    });

    // 菜单按钮交互
    menu.addEventListener('click', (e) => {
      const btn = e.target.closest('.anti-fab-menu-item');
      if (!btn) return;
      e.stopPropagation();

      const action = btn.dataset.action;
      if (action === 'chat-width') {
        cycleChatWidth();
      } else if (action === 'send-mode') {
        state.sendMode = state.sendMode === 'ctrl-enter' ? 'enter' : 'ctrl-enter';
        localStorage.setItem('anti_enhance_send_mode', state.sendMode);
        document.getElementById('anti-fab-send-mode').textContent = state.sendMode === 'ctrl-enter' ? 'Ctrl+Enter' : 'Enter';
        showToast('发送模式已切换', state.sendMode === 'ctrl-enter' ? 'Ctrl+Enter 发送 / Enter 换行' : 'Enter 发送 / Shift+Enter 换行');
      } else if (action === 'quote') {
        state.quoteReplyEnabled = !state.quoteReplyEnabled;
        const badge = document.getElementById('anti-fab-quote');
        badge.textContent = state.quoteReplyEnabled ? '开' : '关';
        badge.className = `anti-fab-badge ${state.quoteReplyEnabled ? 'is-active' : ''}`;
        showToast('划词引用', state.quoteReplyEnabled ? '已开启' : '已关闭');
      } else if (action === 'formula') {
        state.formulaCopyEnabled = !state.formulaCopyEnabled;
        const badge = document.getElementById('anti-fab-formula');
        badge.textContent = state.formulaCopyEnabled ? '开' : '关';
        badge.className = `anti-fab-badge ${state.formulaCopyEnabled ? 'is-active' : ''}`;
        showToast('公式点击复制', state.formulaCopyEnabled ? '已开启' : '已关闭');
      }
    });

    // 点击外部收起菜单
    document.addEventListener('click', (e) => {
      if (!container.contains(e.target)) {
        toggleMenu(false);
      }
    });
  }

  // -------------------------------------------------------------
  // 6. Bootstrap
  // -------------------------------------------------------------
  initFormulaCopy();
  initQuoteReply();
  initKeyboardShortcuts();
  initFloatingBall();
})();
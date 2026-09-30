/**
 * Antigravity Web Enhancements Client Payload
 * Injected into Antigravity Workspace DOM via Chrome DevTools Protocol
 * Features: LaTeX Copy, Mermaid Render, Quote Reply, Trancy Selection Translation, Vocabulary Favorites, Width Adjust
 */
(function () {
  // 0. 全局单例权威状态锁（确保无论注入多少次、旧闭包如何残留，全部以全局状态为准）
  window.__TRANCY_GLOBAL_CONFIG__ = window.__TRANCY_GLOBAL_CONFIG__ || {
    enabled: localStorage.getItem('anti_trancy_enabled') === 'true', // 默认彻底关闭
    triggerMode: localStorage.getItem('anti_trancy_trigger_mode') || 'ctrl' // 'ctrl' | 'auto'
  };

  // 清理旧版本挂载的 DOM
  try {
    document.querySelectorAll('.anti-fab-container, .anti-quote-toolbar, .trancy-card-container, .trancy-voice-overlay, .anti-input-mic-btn').forEach(el => el.remove());
  } catch(e) {}

  if (window.__ANTI_ENHANCEMENTS_CLEANUP__) {
    try { window.__ANTI_ENHANCEMENTS_CLEANUP__(); } catch (e) {}
  }
  window.__ANTI_ENHANCEMENTS_LOADED__ = true;

  const cleanups = [];
  window.__ANTI_ENHANCEMENTS_CLEANUP__ = function() {
    cleanups.forEach(fn => { try { fn(); } catch(e){} });
    document.querySelectorAll('.anti-fab-container, .anti-quote-toolbar, .trancy-card-container, .trancy-voice-overlay, .anti-input-mic-btn').forEach(el => el.remove());
  };

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
    get trancyTranslateEnabled() { return window.__TRANCY_GLOBAL_CONFIG__.enabled; },
    set trancyTranslateEnabled(val) { window.__TRANCY_GLOBAL_CONFIG__.enabled = Boolean(val); localStorage.setItem('anti_trancy_enabled', val ? 'true' : 'false'); },
    get trancyTriggerMode() { return window.__TRANCY_GLOBAL_CONFIG__.triggerMode; },
    set trancyTriggerMode(val) { window.__TRANCY_GLOBAL_CONFIG__.triggerMode = val; localStorage.setItem('anti_trancy_trigger_mode', val); },
    sendMode: localStorage.getItem('anti_enhance_send_mode') || 'ctrl-enter',
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

  applyChatWidth(state.widthMode, false);

  console.log('[AntiEnhance] Initializing Antigravity Web Enhancements v2.0 (Global Guard Active)...');

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
    icon.textContent = isError ? '⚠️' : '✨';

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
  // 2. Trancy 本地翻译引擎与生词本管理
  // -------------------------------------------------------------
  const TrancyVocabulary = {
    getAll() {
      try {
        return JSON.parse(localStorage.getItem('anti_trancy_vocabulary') || '[]');
      } catch {
        return [];
      }
    },
    saveAll(list) {
      localStorage.setItem('anti_trancy_vocabulary', JSON.stringify(list));
    },
    has(word) {
      if (!word) return false;
      const list = this.getAll();
      const norm = word.trim().toLowerCase();
      return list.some(x => x.word && x.word.trim().toLowerCase() === norm);
    },
    add(item) {
      if (!item || !item.word) return false;
      const list = this.getAll();
      const norm = item.word.trim().toLowerCase();
      const idx = list.findIndex(x => x.word && x.word.trim().toLowerCase() === norm);
      const entry = {
        id: 'vocab_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
        word: item.word.trim(),
        phonetic: item.phonetic || '',
        translation: item.translation || '',
        explanation: item.explanation || '',
        examples: Array.isArray(item.examples) ? item.examples : [],
        context: item.context || '',
        createdAt: new Date().toISOString()
      };
      if (idx >= 0) {
        list[idx] = Object.assign({}, list[idx], entry, { createdAt: list[idx].createdAt });
      } else {
        list.unshift(entry);
      }
      this.saveAll(list);
      return true;
    },
    remove(word) {
      if (!word) return false;
      const list = this.getAll();
      const norm = word.trim().toLowerCase();
      const filtered = list.filter(x => x.word && x.word.trim().toLowerCase() !== norm);
      if (filtered.length !== list.length) {
        this.saveAll(filtered);
        return true;
      }
      return false;
    }
  };

  const TrancyEngine = {
    async query(text) {
      const cleanText = text.trim();
      const isSingleWord = !cleanText.includes(' ') && cleanText.length <= 40;

      if (isSingleWord) {
        try {
          const res = await fetch('http://127.0.0.1:8000/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': 'Bearer sk-gemini'
            },
            body: JSON.stringify({
              model: 'gemini-3.8-flash',
              messages: [
                {
                  role: 'system',
                  content: '你是一个专业的英语词典与翻译引擎。用户给出一个单词或短语，请直接返回 JSON：{"phonetic": "/音标/", "translation": "中文释义", "explanation": "简要解析", "examples": [{"en": "英文例句", "zh": "例句中文翻译"}]}'
                },
                {
                  role: 'user',
                  content: cleanText
                }
              ],
              temperature: 0.1
            }),
            signal: AbortSignal.timeout(4500)
          });

          if (res.ok) {
            const data = await res.json();
            const rawContent = data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content;
            if (rawContent) {
              const jsonMatch = rawContent.match(/\{[\s\S]*\}/);
              if (jsonMatch) {
                const parsed = JSON.parse(jsonMatch[0]);
                return {
                  word: cleanText,
                  phonetic: parsed.phonetic || '',
                  translation: parsed.translation || '',
                  explanation: parsed.explanation || '',
                  examples: parsed.examples || [],
                  source: 'Gemini Web2API (Dict)'
                };
              }
            }
          }
        } catch (e) {}
      }

      try {
        const gtRes = await fetch('http://127.0.0.1:8000/v1beta/models/google-translate:generateContent?sl=auto&tl=zh-CN', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: cleanText }] }]
          }),
          signal: AbortSignal.timeout(3500)
        });

        if (gtRes.ok) {
          const gtData = await gtRes.json();
          const translated = gtData.candidates && gtData.candidates[0] && gtData.candidates[0].content && gtData.candidates[0].content.parts && gtData.candidates[0].content.parts[0] && gtData.candidates[0].content.parts[0].text;
          if (translated) {
            return {
              word: cleanText,
              phonetic: '',
              translation: translated.trim(),
              explanation: '',
              examples: [],
              source: 'Gemini Web2API (GT)'
            };
          }
        }
      } catch (e) {}

      try {
        const publicRes = await fetch(`https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=zh-CN&dt=t&q=${encodeURIComponent(cleanText)}`, {
          signal: AbortSignal.timeout(3000)
        });
        if (publicRes.ok) {
          const publicData = await publicRes.json();
          if (Array.isArray(publicData) && Array.isArray(publicData[0])) {
            const trans = publicData[0].map(x => x[0]).join('');
            return {
              word: cleanText,
              phonetic: '',
              translation: trans,
              explanation: '',
              examples: [],
              source: 'Google Translate'
            };
          }
        }
      } catch (e) {}

      return {
        word: cleanText,
        phonetic: '',
        translation: '翻译服务暂时无法连接',
        explanation: '',
        examples: [],
        source: 'Offline'
      };
    }
  };

  function playTts(text) {
    if (!text || typeof window === 'undefined') return;
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.lang = /^[\u4e00-\u9fa5]/.test(text) ? 'zh-CN' : 'en-US';
      u.rate = 0.9;
      window.speechSynthesis.speak(u);
    }
  }

  // -------------------------------------------------------------
  // 3. Trancy 划词智能悬浮卡片 (Selection Translator)
  // -------------------------------------------------------------
  let currentCard = null;

  function removeTrancyCard() {
    document.querySelectorAll('.trancy-card-container').forEach(el => el.remove());
    currentCard = null;
  }

  function initTrancySelection() {
    const onMouseUp = (e) => {
      // 核心开关守卫：如果全局未开启，坚决不响应任何划词
      if (!window.__TRANCY_GLOBAL_CONFIG__ || !window.__TRANCY_GLOBAL_CONFIG__.enabled) {
        removeTrancyCard();
        return;
      }

      // 如果是 Ctrl 模式，但用户没有按住 Ctrl/Cmd 键，坚决不打扰
      if (window.__TRANCY_GLOBAL_CONFIG__.triggerMode === 'ctrl' && !e.ctrlKey && !e.metaKey) {
        removeTrancyCard();
        return;
      }

      if (e.target && e.target.closest && e.target.closest('.trancy-card-container, .anti-fab-container, .anti-input-mic-btn, .trancy-voice-overlay')) {
        return;
      }

      setTimeout(async () => {
        if (!window.__TRANCY_GLOBAL_CONFIG__ || !window.__TRANCY_GLOBAL_CONFIG__.enabled) {
          removeTrancyCard();
          return;
        }

        const sel = window.getSelection();
        const text = sel ? sel.toString().trim() : '';

        if (!text || text.length === 0 || text.length > 2000) {
          removeTrancyCard();
          return;
        }

        if (e.target && ['INPUT', 'TEXTAREA'].includes(e.target.tagName) && e.target.closest && e.target.closest('.group\\/user-input-step')) {
          return;
        }

        if (!sel.rangeCount) return;
        const range = sel.getRangeAt(0);
        const rect = range.getBoundingClientRect();

        if (rect.width === 0 && rect.height === 0) {
          removeTrancyCard();
          return;
        }

        removeTrancyCard();

        const card = document.createElement('div');
        card.className = 'trancy-card-container is-visible';

        const scrollX = window.scrollX || window.pageXOffset || 0;
        const scrollY = window.scrollY || window.pageYOffset || 0;
        let top = rect.bottom + scrollY + 8;
        let left = rect.left + scrollX + (rect.width / 2) - 165;

        if (left < 16) left = 16;
        if (left + 330 > window.innerWidth - 16) left = window.innerWidth - 346;
        if (top + 260 > window.innerHeight + scrollY) {
          top = Math.max(16, rect.top + scrollY - 240);
        }

        card.style.top = `${top}px`;
        card.style.left = `${left}px`;

        const isFav = TrancyVocabulary.has(text);

        card.innerHTML = `
          <div class="trancy-header">
            <div class="trancy-title-wrap">
              <span class="trancy-word" title="${escapeHtml(text)}">${escapeHtml(text)}</span>
              <span class="trancy-phonetic" id="trancy-card-phonetic"></span>
            </div>
            <div class="trancy-header-actions">
              <button class="trancy-btn-action" id="trancy-btn-tts" title="朗读发音">🔊</button>
              <button class="trancy-btn-action ${isFav ? 'is-fav' : ''}" id="trancy-btn-fav" title="加入生词本">★</button>
            </div>
          </div>
          <div class="trancy-body" id="trancy-card-body">
            <div class="trancy-skeleton">
              <div class="trancy-skeleton-line" style="width: 85%;"></div>
              <div class="trancy-skeleton-line" style="width: 60%;"></div>
              <div class="trancy-skeleton-line" style="width: 75%;"></div>
            </div>
          </div>
          <div class="trancy-footer">
            <span class="trancy-engine-tag" id="trancy-card-engine">⚡ Trancy 引擎</span>
            <span>Antigravity 沉浸翻译</span>
          </div>
        `;

        document.body.appendChild(card);
        currentCard = card;

        card.querySelector('#trancy-btn-tts').addEventListener('click', (ev) => {
          ev.stopPropagation();
          playTts(text);
        });

        let currentResult = null;

        const favBtn = card.querySelector('#trancy-btn-fav');
        favBtn.addEventListener('click', (ev) => {
          ev.stopPropagation();
          if (TrancyVocabulary.has(text)) {
            TrancyVocabulary.remove(text);
            favBtn.classList.remove('is-fav');
            showToast('已移出生词本', text);
          } else {
            TrancyVocabulary.add(currentResult || { word: text, translation: '' });
            favBtn.classList.add('is-fav');
            showToast('★ 已加入生词本', text);
          }
        });

        const result = await TrancyEngine.query(text);
        if (currentCard !== card) return;

        currentResult = result;
        const phoneticEl = card.querySelector('#trancy-card-phonetic');
        if (phoneticEl && result.phonetic) {
          phoneticEl.textContent = result.phonetic;
        }

        const engineEl = card.querySelector('#trancy-card-engine');
        if (engineEl && result.source) {
          engineEl.textContent = '⚡ ' + result.source;
        }

        const bodyEl = card.querySelector('#trancy-card-body');
        if (bodyEl) {
          let bodyHtml = `<div class="trancy-trans-text">${escapeHtml(result.translation)}</div>`;
          if (result.explanation) {
            bodyHtml += `<div class="trancy-explanation">${escapeHtml(result.explanation)}</div>`;
          }
          if (result.examples && result.examples.length > 0) {
            bodyHtml += '<div class="trancy-examples">';
            result.examples.forEach(ex => {
              bodyHtml += `
                <div class="trancy-example-item">
                  <div class="trancy-example-en">💡 ${escapeHtml(ex.en)}</div>
                  <div class="trancy-example-zh">${escapeHtml(ex.zh)}</div>
                </div>
              `;
            });
            bodyHtml += '</div>';
          }
          bodyEl.innerHTML = bodyHtml;
        }
      }, 30);
    };

    const onKeyDown = (e) => {
      if (e.key === 'Escape') {
        removeTrancyCard();
      }
    };

    document.addEventListener('mouseup', onMouseUp);
    document.addEventListener('keydown', onKeyDown);
    cleanups.push(() => {
      document.removeEventListener('mouseup', onMouseUp);
      document.removeEventListener('keydown', onKeyDown);
    });
  }

  // -------------------------------------------------------------
  // 5. LaTeX Formula Click-to-Copy
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
    const onDocClick = (e) => {
      if (!state.formulaCopyEnabled) return;
      const target = e.target;
      if (!target) return;

      const latex = extractLatex(target);
      if (latex) {
        e.preventDefault();
        e.stopPropagation();
        navigator.clipboard.writeText(latex).then(() => {
          showToast('LaTeX 公式已复制', latex.length > 45 ? latex.slice(0, 45) + '...' : latex);
        });
      }
    };
    document.addEventListener('click', onDocClick);
    cleanups.push(() => document.removeEventListener('click', onDocClick));
  }

  // -------------------------------------------------------------
  // 6. 划词引用快捷回复 (Quote Reply)
  // -------------------------------------------------------------
  function initQuoteReply() {
    let quoteToolbar = null;

    function getToolbar() {
      if (quoteToolbar) return quoteToolbar;
      quoteToolbar = document.createElement('div');
      quoteToolbar.className = 'anti-quote-toolbar';
      quoteToolbar.innerHTML = `
        <button class="anti-quote-btn-reply" id="anti-btn-quote-reply">
          <span>💬</span>
          <span>引用回复</span>
        </button>
      `;
      document.body.appendChild(quoteToolbar);

      quoteToolbar.querySelector('#anti-btn-quote-reply').addEventListener('click', () => {
        const sel = window.getSelection();
        const text = sel ? sel.toString().trim() : '';
        if (!text) return;

        const input = document.querySelector('textarea, div[contenteditable="true"]');
        if (input) {
          const quoteStr = '> ' + text.split('\n').join('\n> ') + '\n\n';
          input.focus();
          if (input.tagName === 'TEXTAREA') {
            input.value = quoteStr + input.value;
            input.dispatchEvent(new Event('input', { bubbles: true }));
          } else if (input.isContentEditable) {
            document.execCommand('insertText', false, quoteStr);
          }
          showToast('已引用选中内容', text.slice(0, 30) + '...');
        }
        quoteToolbar.classList.remove('is-visible');
      });

      return quoteToolbar;
    }

    const onQuoteMouseUp = (e) => {
      if (!state.quoteReplyEnabled) return;
      if (e.target.closest && e.target.closest('.anti-quote-toolbar, .trancy-card-container, .anti-fab-container')) return;

      setTimeout(() => {
        const sel = window.getSelection();
        const text = sel ? sel.toString().trim() : '';
        if (text && text.length > 3) {
          const tb = getToolbar();
          const rect = sel.getRangeAt(0).getBoundingClientRect();
          const scrollX = window.scrollX || window.pageXOffset || 0;
          const scrollY = window.scrollY || window.pageYOffset || 0;
          tb.style.top = `${rect.top + scrollY - 38}px`;
          tb.style.left = `${rect.left + scrollX}px`;
          tb.classList.add('is-visible');
        } else if (quoteToolbar) {
          quoteToolbar.classList.remove('is-visible');
        }
      }, 50);
    };

    document.addEventListener('mouseup', onQuoteMouseUp);
    cleanups.push(() => document.removeEventListener('mouseup', onQuoteMouseUp));
  }

  // -------------------------------------------------------------
  // 7. 发送快捷键与全局监听
  // -------------------------------------------------------------
  function initKeyboardShortcuts() {
    const onKey = (e) => {
      // Alt+Shift+T 快速开关划词翻译
      if (e.altKey && e.shiftKey && (e.key === 't' || e.key === 'T')) {
        e.preventDefault();
        state.trancyTranslateEnabled = !state.trancyTranslateEnabled;
        if (!state.trancyTranslateEnabled) {
          removeTrancyCard();
        }
        const b = document.getElementById('anti-fab-trancy');
        if (b) {
          b.textContent = state.trancyTranslateEnabled ? (state.trancyTriggerMode === 'ctrl' ? 'Ctrl+划词' : '开') : '关';
          b.className = `anti-fab-badge ${state.trancyTranslateEnabled ? 'is-active' : ''}`;
        }
        showToast('Trancy 划词翻译', state.trancyTranslateEnabled ? `已开启 (${state.trancyTriggerMode === 'ctrl' ? '按住 Ctrl 划选才翻译' : '自动弹出'})` : '已彻底关闭');
        return;
      }

      const isTextarea = e.target.tagName === 'TEXTAREA' || e.target.isContentEditable;
      if (!isTextarea) return;

      if (state.sendMode === 'ctrl-enter') {
        if (e.key === 'Enter' && !e.ctrlKey && !e.metaKey && !e.shiftKey) {
          // Enter 换行
        } else if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
          const sendBtn = document.querySelector('button[aria-label*="Send"], button[type="submit"], [class*="send-button"]');
          if (sendBtn) {
            e.preventDefault();
            sendBtn.click();
          }
        }
      }
    };
    document.addEventListener('keydown', onKey, true);
    cleanups.push(() => document.removeEventListener('keydown', onKey, true));
  }

  // -------------------------------------------------------------
  // 8. 可拖拽 FAB 悬浮控制球 (功能中心)
  // -------------------------------------------------------------
  function initFloatingBall() {
    const existing = document.querySelector('.anti-fab-container');
    if (existing) existing.remove();

    const container = document.createElement('div');
    container.className = 'anti-fab-container';

    let trancyLabel = '关';
    if (state.trancyTranslateEnabled) {
      trancyLabel = state.trancyTriggerMode === 'ctrl' ? 'Ctrl+划词' : '自动开';
    }

    container.innerHTML = `
      <div class="anti-fab-trigger" title="Antigravity 增强与 Trancy 翻译中心">
        <span class="anti-fab-icon">⚡</span>
      </div>
      <div class="anti-fab-menu">
        <div class="anti-fab-menu-header">
          <span>Antigravity · Trancy 增强</span>
          <span style="font-size: 9.5px; opacity: 0.7;">v2.1</span>
        </div>

        <button class="anti-fab-menu-item" data-action="trancy">
          <div class="anti-fab-item-left">
            <span>🌐</span>
            <span>划词翻译</span>
          </div>
          <span class="anti-fab-badge ${state.trancyTranslateEnabled ? 'is-active' : ''}" id="anti-fab-trancy">${trancyLabel}</span>
        </button>


        <button class="anti-fab-menu-item" data-action="vocab">
          <div class="anti-fab-item-left">
            <span>📚</span>
            <span>生词本</span>
          </div>
          <span class="anti-fab-badge" id="anti-fab-vocab-count">${TrancyVocabulary.getAll().length} 词</span>
        </button>

        <button class="anti-fab-menu-item" data-action="chat-width">
          <div class="anti-fab-item-left">
            <span>📐</span>
            <span>对话区宽度</span>
          </div>
          <span class="anti-fab-badge" id="anti-fab-width">${(WIDTH_MODES[state.widthMode] || WIDTH_MODES.standard).label.split(' ')[0]}</span>
        </button>

        <button class="anti-fab-menu-item" data-action="send-mode">
          <div class="anti-fab-item-left">
            <span>⌨️</span>
            <span>发送模式</span>
          </div>
          <span class="anti-fab-badge is-active" id="anti-fab-send-mode">${state.sendMode === 'ctrl-enter' ? 'Ctrl+Enter' : 'Enter'}</span>
        </button>

        <button class="anti-fab-menu-item" data-action="quote">
          <div class="anti-fab-item-left">
            <span>💬</span>
            <span>划词引用</span>
          </div>
          <span class="anti-fab-badge ${state.quoteReplyEnabled ? 'is-active' : ''}" id="anti-fab-quote">${state.quoteReplyEnabled ? '开' : '关'}</span>
        </button>

        <button class="anti-fab-menu-item" data-action="formula">
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

    let isMenuOpen = false;
    const toggleMenu = (open) => {
      isMenuOpen = typeof open === 'boolean' ? open : !isMenuOpen;
      if (isMenuOpen) {
        menu.classList.add('is-active');
        const vocabBadge = document.getElementById('anti-fab-vocab-count');
        if (vocabBadge) vocabBadge.textContent = TrancyVocabulary.getAll().length + ' 词';
      } else {
        menu.classList.remove('is-active');
      }
    };

    let isDragging = false;
    let startX = 0, startY = 0;
    let initialX = 0, initialY = 0;
    let hasMoved = false;

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
      if (!hasMoved) {
        toggleMenu();
      }
    });

    menu.addEventListener('click', (e) => {
      const btn = e.target.closest('.anti-fab-menu-item');
      if (!btn) return;
      e.stopPropagation();

      const action = btn.dataset.action;
      if (action === 'trancy') {
        // 循环切换：彻底关闭 -> Ctrl+划词模式 -> 全自动弹出模式 -> 彻底关闭
        if (!state.trancyTranslateEnabled) {
          state.trancyTranslateEnabled = true;
          state.trancyTriggerMode = 'ctrl';
        } else if (state.trancyTriggerMode === 'ctrl') {
          state.trancyTriggerMode = 'auto';
        } else {
          state.trancyTranslateEnabled = false;
          removeTrancyCard();
        }

        const b = document.getElementById('anti-fab-trancy');
        if (b) {
          let label = '关';
          if (state.trancyTranslateEnabled) {
            label = state.trancyTriggerMode === 'ctrl' ? 'Ctrl+划词' : '自动开';
          }
          b.textContent = label;
          b.className = `anti-fab-badge ${state.trancyTranslateEnabled ? 'is-active' : ''}`;
        }

        let toastMsg = '已彻底关闭';
        if (state.trancyTranslateEnabled) {
          toastMsg = state.trancyTriggerMode === 'ctrl' ? '已开启 (按住 Ctrl 划选才翻译，日常选词不打扰)' : '已开启 (选中文本自动弹出)';
        }
        showToast('Trancy 划词翻译', toastMsg);

      } else if (action === 'vocab') {
        const count = TrancyVocabulary.getAll().length;
        showToast('📚 生词本', `当前共收藏 ${count} 个词条，可在 VS Code 侧边栏打开完整面板`);
      } else if (action === 'chat-width') {
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

    const onDocClick = (e) => {
      if (!container.contains(e.target)) {
        toggleMenu(false);
      }
    };
    document.addEventListener('click', onDocClick);
    cleanups.push(() => document.removeEventListener('click', onDocClick));
  }

  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  // -------------------------------------------------------------
  // 9. 启动全套能力
  // -------------------------------------------------------------
  initFormulaCopy();
  initQuoteReply();
  initTrancySelection();
  initKeyboardShortcuts();
  initFloatingBall();
})();

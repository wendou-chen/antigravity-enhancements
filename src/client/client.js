/**
 * Antigravity Web Enhancements Client Payload
 * Injected into Antigravity Workspace DOM via Chrome DevTools Protocol
 * Features: LaTeX Copy, Mermaid Render, Trancy Selection Translation, Vocabulary Favorites, Width Adjust
 */
(function () {
  // 0. 全局单例权威状态锁（确保无论注入多少次、旧闭包如何残留，全部以全局状态为准）
  window.__TRANCY_GLOBAL_CONFIG__ = window.__TRANCY_GLOBAL_CONFIG__ || {
    enabled: localStorage.getItem('anti_trancy_enabled') !== 'false', // 默认开启
    triggerMode: localStorage.getItem('anti_trancy_trigger_mode') || 'auto' // 默认 'auto' 选词即译 (支持 'auto' | 'bubble' | 'ctrl')
  };

  // 清理旧版本挂载的 DOM
  try {
    document.querySelectorAll('.anti-fab-container, .anti-quote-toolbar, .trancy-card-container, .trancy-bubble-trigger, .trancy-voice-overlay, .anti-input-mic-btn').forEach(el => el.remove());
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

  const _TRANSLATE_CACHE = new Map();

  const TrancyEngine = {
    async query(text) {
      const cleanText = text.trim();
      if (!cleanText) {
        return { word: '', phonetic: '', translation: '', explanation: '', examples: [], source: '' };
      }

      // 0. 本地内存 LRU 极速缓存 (0ms 瞬间直出)
      if (_TRANSLATE_CACHE.has(cleanText)) {
        return _TRANSLATE_CACHE.get(cleanText);
      }

      // 单个单词判定（纯英文字母、连字符、无空格、长度 <= 45）
      const isSingleWord = !cleanText.includes(' ') && cleanText.length <= 45 && /^[a-zA-Z\-'’]+$/.test(cleanText);

      let result = null;

      if (isSingleWord) {
        // 1. 首选：Trancy 官方原生权威词典引擎 (原汁原味音标 + 分词性释义 + 权威例句)
        try {
          const trancyRes = await fetch(`https://api.trancy.org/1/dictionary?text=${encodeURIComponent(cleanText)}&target=en&native=zh-CN`, {
            signal: AbortSignal.timeout(2200)
          });
          if (trancyRes.ok) {
            const json = await trancyRes.json();
            if (json && json.data) {
              const d = json.data;

              // 提取美音/英音音标
              let phonetic = '';
              if (Array.isArray(d.phonetics)) {
                const usPh = d.phonetics.find(p => p.locale === 'us' && p.value && p.value[0]);
                const ukPh = d.phonetics.find(p => p.locale === 'uk' && p.value && p.value[0]);
                const targetPh = usPh || ukPh;
                if (targetPh && targetPh.value && targetPh.value[0]) {
                  phonetic = `/${targetPh.value[0].replace(/^\/|\/$/g, '')}/`;
                }
              }

              // 提取主要翻译项
              let translation = '';
              if (Array.isArray(d.translation) && d.translation.length > 0) {
                translation = d.translation.slice(0, 3).map(t => t.trans).join('；');
              } else if (Array.isArray(d.explains) && d.explains.length > 0 && d.explains[0].terms) {
                translation = d.explains[0].terms.slice(0, 3).join('；');
              }

              // 提取词性分类详细解析
              let explanation = '';
              if (Array.isArray(d.explains) && d.explains.length > 0) {
                explanation = d.explains
                  .filter(e => e.terms && e.terms.length > 0)
                  .map(e => `${e.pos || ''} ${e.terms.slice(0, 5).join('，')}`.trim())
                  .join('\n');
              }

              // 提取例句
              let examples = [];
              if (Array.isArray(d.sentences) && d.sentences.length > 0) {
                examples = d.sentences.slice(0, 2).map(s => ({
                  en: s.text || '',
                  zh: s.trans || ''
                }));
              }

              if (translation || explanation) {
                result = {
                  word: cleanText,
                  phonetic,
                  translation: translation || cleanText,
                  explanation,
                  examples,
                  source: 'Trancy 原生词典'
                };
              }
            }
          }
        } catch (e) {}

        // 2. 备选：有道原生词典建议引擎 (极速毫秒级直出)
        if (!result) {
          try {
            const ydRes = await fetch(`https://dict.youdao.com/suggest?num=1&doctype=json&q=${encodeURIComponent(cleanText)}`, {
              signal: AbortSignal.timeout(1800)
            });
            if (ydRes.ok) {
              const ydData = await ydRes.json();
              if (ydData && ydData.data && Array.isArray(ydData.data.entries) && ydData.data.entries[0]) {
                const entry = ydData.data.entries[0];
                result = {
                  word: cleanText,
                  phonetic: '',
                  translation: entry.explain || cleanText,
                  explanation: '',
                  examples: [],
                  source: '有道原生词典'
                };
              }
            }
          } catch (e) {}
        }
      }

      // 3. 短语或句子，或者单词词典均未命中的情况：Google Translate 原生极速翻译
      if (!result) {
        try {
          const gtRes = await fetch(`https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=zh-CN&dt=t&dt=bd&q=${encodeURIComponent(cleanText)}`, {
            signal: AbortSignal.timeout(2500)
          });
          if (gtRes.ok) {
            const data = await gtRes.json();
            let transText = '';
            if (Array.isArray(data) && Array.isArray(data[0])) {
              transText = data[0].map(x => x[0]).join('');
            }

            let dictExplains = '';
            if (Array.isArray(data[1])) {
              dictExplains = data[1].map(posGroup => {
                const pos = posGroup[0] || '';
                const terms = Array.isArray(posGroup[1]) ? posGroup[1].slice(0, 4).join('，') : '';
                return `${pos}. ${terms}`;
              }).join('\n');
            }

            if (transText) {
              result = {
                word: cleanText,
                phonetic: '',
                translation: transText,
                explanation: dictExplains,
                examples: [],
                source: 'Google 原生翻译'
              };
            }
          }
        } catch (e) {}
      }

      // 4. 离线/异常保底
      if (!result) {
        result = {
          word: cleanText,
          phonetic: '',
          translation: '查询服务暂时不可用，请检查网络连接',
          explanation: '',
          examples: [],
          source: '离线'
        };
      }

      // 存入 LRU 缓存
      if (_TRANSLATE_CACHE.size > 500) {
        const firstKey = _TRANSLATE_CACHE.keys().next().value;
        _TRANSLATE_CACHE.delete(firstKey);
      }
      _TRANSLATE_CACHE.set(cleanText, result);

      return result;
    }
  };
  window.__TRANCY_ENGINE__ = TrancyEngine;

  function playTts(text) {
    if (!text || typeof window === 'undefined') return;
    const clean = text.trim();
    if (/^[a-zA-Z\-'’]+$/.test(clean)) {
      try {
        const audio = new Audio(`https://dict.youdao.com/dictvoice?type=0&audio=${encodeURIComponent(clean)}`);
        audio.play().catch(() => {
          fallbackSpeech(clean);
        });
        return;
      } catch (e) {}
    }
    fallbackSpeech(clean);
  }

  function fallbackSpeech(text) {
    if ('speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel();
        const u = new SpeechSynthesisUtterance(text);
        u.lang = /^[\u4e00-\u9fa5]/.test(text) ? 'zh-CN' : 'en-US';
        u.rate = 0.95;
        window.speechSynthesis.speak(u);
      } catch (e) {}
    }
  }

  // -------------------------------------------------------------
  // 3. Trancy 划词智能悬浮卡片 (Selection Translator)
  // -------------------------------------------------------------
  let currentCard = null;
  let currentBubble = null;

  function removeTrancyCard() {
    document.querySelectorAll('.trancy-card-container, .trancy-bubble-trigger').forEach(el => el.remove());
    currentCard = null;
    currentBubble = null;
  }

  function calculateSafeViewportPosition(rect, cardWidth, cardHeight, mouseEvent) {
    let top = 0;
    let left = 0;

    const hasValidRect = rect && typeof rect.top === 'number' && !isNaN(rect.top) && rect.width > 0 && rect.height > 0 && rect.top > -100 && rect.bottom < window.innerHeight + 100;

    if (hasValidRect) {
      top = rect.bottom + 8;
      left = rect.left + (rect.width / 2) - (cardWidth / 2);

      // 如果下方超出屏幕，翻转到选区上方
      if (top + cardHeight > window.innerHeight - 16) {
        const topCandidate = rect.top - cardHeight - 8;
        if (topCandidate >= 16) {
          top = topCandidate;
        }
      }
    } else if (mouseEvent && typeof mouseEvent.clientY === 'number') {
      top = mouseEvent.clientY + 12;
      left = mouseEvent.clientX - (cardWidth / 2);
    } else {
      top = Math.max(16, (window.innerHeight - cardHeight) / 2);
      left = Math.max(16, (window.innerWidth - cardWidth) / 2);
    }

    // 强行安全边界钳制（绝对杜绝负数和超出屏幕右侧/底部）
    left = Math.max(16, Math.min(window.innerWidth - cardWidth - 16, left));
    top = Math.max(16, Math.min(window.innerHeight - cardHeight - 16, top));

    return { top, left };
  }

  async function renderTrancyCard(text, rect, mouseEvent) {
    removeTrancyCard();

    const card = document.createElement('div');
    card.className = 'trancy-card-container is-visible';

    const cardWidth = 330;
    const cardHeight = 260;
    const pos = calculateSafeViewportPosition(rect, cardWidth, cardHeight, mouseEvent);

    card.style.top = `${pos.top}px`;
    card.style.left = `${pos.left}px`;

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
        <span class="trancy-engine-tag" id="trancy-card-engine">⚡ 查询中...</span>
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
  }

  function initTrancySelection() {
    const onMouseUp = (e) => {
      // 点击自身或菜单不触发重绘
      if (e.target && e.target.closest && e.target.closest('.trancy-card-container, .anti-fab-container, .trancy-bubble-trigger')) {
        return;
      }

      // 开关状态守卫
      if (!window.__TRANCY_GLOBAL_CONFIG__ || !window.__TRANCY_GLOBAL_CONFIG__.enabled) {
        removeTrancyCard();
        return;
      }

      const mode = window.__TRANCY_GLOBAL_CONFIG__.triggerMode || 'auto';

      // 如果当前是 ctrl 模式，但用户没有按住 Ctrl，不触发
      if (mode === 'ctrl' && !e.ctrlKey && !e.metaKey) {
        removeTrancyCard();
        return;
      }

      setTimeout(() => {
        const sel = window.getSelection();
        const text = sel ? sel.toString().trim() : '';

        if (!text || text.length === 0 || text.length > 2000) {
          removeTrancyCard();
          return;
        }

        // 输入框内正常编辑打字时不弹卡片打扰
        if (e.target && ['INPUT', 'TEXTAREA'].includes(e.target.tagName)) {
          return;
        }
        if (e.target && (e.target.isContentEditable || (e.target.closest && e.target.closest('[contenteditable="true"]')))) {
          return;
        }

        if (!sel.rangeCount) return;
        const range = sel.getRangeAt(0);
        const rect = range.getBoundingClientRect();

        if (mode === 'bubble') {
          // 气泡模式：在光标旁显示优雅的小 🌐 图标，点击展开卡片
          removeTrancyCard();
          const bubble = document.createElement('div');
          bubble.className = 'trancy-bubble-trigger';
          bubble.title = '点击翻译选中文本';
          bubble.innerHTML = '🌐';

          const bubblePos = calculateSafeViewportPosition(rect, 28, 28, e);
          const rightX = (rect && rect.right > 0) ? rect.right + 6 : bubblePos.left;
          bubble.style.top = `${bubblePos.top}px`;
          bubble.style.left = `${Math.min(window.innerWidth - 36, rightX)}px`;

          bubble.addEventListener('click', (ev) => {
            ev.stopPropagation();
            renderTrancyCard(text, rect, e);
          });

          document.body.appendChild(bubble);
          currentBubble = bubble;
        } else {
          // auto 或 ctrl 模式：直接展开翻译卡片
          renderTrancyCard(text, rect, e);
        }
      }, 30);
    };

    const onMouseDown = (e) => {
      if (e.target && e.target.closest && e.target.closest('.trancy-card-container, .anti-fab-container, .trancy-bubble-trigger')) {
        return;
      }
      removeTrancyCard();
    };

    const onKeyDown = (e) => {
      if (e.key === 'Escape') {
        removeTrancyCard();
      }
    };

    document.addEventListener('mouseup', onMouseUp);
    document.addEventListener('mousedown', onMouseDown);
    document.addEventListener('keydown', onKeyDown);
    cleanups.push(() => {
      document.removeEventListener('mouseup', onMouseUp);
      document.removeEventListener('mousedown', onMouseDown);
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
  // 6. 发送快捷键与全局监听 (Alt+W 调宽, Alt+Shift+T 翻译, Ctrl+Enter 发送)
  // -------------------------------------------------------------
  function initKeyboardShortcuts() {
    const onKey = (e) => {
      // 1. Alt+W 快速切换页面宽度
      if (e.altKey && !e.ctrlKey && !e.metaKey && (e.key === 'w' || e.key === 'W' || e.code === 'KeyW')) {
        e.preventDefault();
        e.stopPropagation();
        cycleChatWidth();
        return;
      }

      // 2. Alt+Shift+T 快速开关划词翻译
      if (e.altKey && e.shiftKey && (e.key === 't' || e.key === 'T')) {
        e.preventDefault();
        e.stopPropagation();
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

      // 3. 拦截输入框发送模式
      const target = e.target;
      if (!target) return;
      const isInput = target.tagName === 'TEXTAREA' || target.isContentEditable || Boolean(target.closest && target.closest('[contenteditable="true"]'));
      if (!isInput) return;

      // 中文输入法合成状态不拦截
      if (e.isComposing || e.keyCode === 229) return;

      if (e.key !== 'Enter') return;

      if (state.sendMode === 'ctrl-enter') {
        // 单按 Enter: 换行，阻止发送
        if (!e.ctrlKey && !e.metaKey && !e.shiftKey && !e.altKey) {
          e.preventDefault();
          e.stopImmediatePropagation();

          if (target.isContentEditable || (target.closest && target.closest('[contenteditable="true"]'))) {
            const host = target.closest('[contenteditable="true"]') || target;
            const shiftEnterEvt = new KeyboardEvent('keydown', {
              key: 'Enter',
              code: 'Enter',
              keyCode: 13,
              which: 13,
              shiftKey: true,
              bubbles: true,
              cancelable: true,
              composed: true
            });
            host.dispatchEvent(shiftEnterEvt);
          } else if (target.tagName === 'TEXTAREA') {
            const start = target.selectionStart;
            const end = target.selectionEnd;
            const val = target.value;
            target.value = val.substring(0, start) + '\n' + val.substring(end);
            target.selectionStart = target.selectionEnd = start + 1;
            target.dispatchEvent(new Event('input', { bubbles: true }));
          }
          return;
        }

        // 按 Ctrl+Enter 或 Cmd+Enter: 发送
        if (e.ctrlKey || e.metaKey) {
          e.preventDefault();
          e.stopImmediatePropagation();

          const sendBtn = document.querySelector('button[data-testid="send-button"], button[aria-label="Send message"], button[aria-label*="Send" i], button[type="submit"]');
          if (sendBtn && !sendBtn.disabled && sendBtn.getAttribute('aria-disabled') !== 'true') {
            sendBtn.click();
          }
          return;
        }
      } else {
        // enter 模式下，按 Ctrl+Enter 也允许发送
        if (e.ctrlKey || e.metaKey) {
          e.preventDefault();
          e.stopImmediatePropagation();
          const sendBtn = document.querySelector('button[data-testid="send-button"], button[aria-label="Send message"], button[aria-label*="Send" i], button[type="submit"]');
          if (sendBtn && !sendBtn.disabled && sendBtn.getAttribute('aria-disabled') !== 'true') {
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
      if (state.trancyTriggerMode === 'bubble') trancyLabel = '气泡开';
      else if (state.trancyTriggerMode === 'ctrl') trancyLabel = 'Ctrl+划词';
      else trancyLabel = '自动开';
    }

    container.innerHTML = `
      <div class="anti-fab-trigger" title="Antigravity 增强与 Trancy 翻译中心">
        <span class="anti-fab-icon">⚡</span>
      </div>
      <div class="anti-fab-menu">
        <div class="anti-fab-menu-header">
          <span>Antigravity · Trancy 增强</span>
          <span style="font-size: 9.5px; opacity: 0.7;">v2.2.0</span>
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
        // 循环切换：自动开 -> 气泡开 -> Ctrl+划词 -> 彻底关闭 -> 自动开
        if (!state.trancyTranslateEnabled) {
          state.trancyTranslateEnabled = true;
          state.trancyTriggerMode = 'auto';
        } else if (state.trancyTriggerMode === 'auto') {
          state.trancyTriggerMode = 'bubble';
        } else if (state.trancyTriggerMode === 'bubble') {
          state.trancyTriggerMode = 'ctrl';
        } else {
          state.trancyTranslateEnabled = false;
          removeTrancyCard();
        }

        const b = document.getElementById('anti-fab-trancy');
        if (b) {
          let label = '关';
          if (state.trancyTranslateEnabled) {
            if (state.trancyTriggerMode === 'bubble') label = '气泡开';
            else if (state.trancyTriggerMode === 'ctrl') label = 'Ctrl+划词';
            else label = '自动开';
          }
          b.textContent = label;
          b.className = `anti-fab-badge ${state.trancyTranslateEnabled ? 'is-active' : ''}`;
        }

        let toastMsg = '已彻底关闭';
        if (state.trancyTranslateEnabled) {
          if (state.trancyTriggerMode === 'auto') toastMsg = '已开启 (选中文本自动弹出翻译大卡片)';
          else if (state.trancyTriggerMode === 'bubble') toastMsg = '已开启 (选中文本显示 🌐 悬浮球，点击展开)';
          else if (state.trancyTriggerMode === 'ctrl') toastMsg = '已开启 (按住 Ctrl 划选才弹出)';
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
  initTrancySelection();
  initKeyboardShortcuts();
  initFloatingBall();
})();

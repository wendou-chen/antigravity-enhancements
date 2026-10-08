/**
 * Antigravity Web Enhancements Client Payload (v2.9.0 VIP)
 * Injected into Antigravity Workspace DOM via Chrome DevTools Protocol
 * Features: LaTeX Copy, Mermaid Render, Trancy Selection Translation, Vocabulary Favorites, Smooth Width Slider, Desmos Math Grapher
 */
(function () {
  // 安全存储封装（兼容 data: URL 等禁用 localStorage 的沙箱环境）
  const _memoryStore = (typeof window !== 'undefined' && window.__ANTI_MEM_STORAGE__) || {};
  if (typeof window !== 'undefined') window.__ANTI_MEM_STORAGE__ = _memoryStore;

  const safeStorage = {
    getItem(key) {
      try {
        if (typeof window !== 'undefined' && window.localStorage) {
          return window.localStorage.getItem(key);
        }
      } catch (e) {}
      return _memoryStore[key] !== undefined ? _memoryStore[key] : null;
    },
    setItem(key, value) {
      const str = String(value);
      try {
        if (typeof window !== 'undefined' && window.localStorage) {
          window.localStorage.setItem(key, str);
        }
      } catch (e) {}
      _memoryStore[key] = str;
    },
    removeItem(key) {
      try {
        if (typeof window !== 'undefined' && window.localStorage) {
          window.localStorage.removeItem(key);
        }
      } catch (e) {}
      delete _memoryStore[key];
    }
  };

  // 0. 全局单例权威状态锁（确保无论注入多少次、旧闭包如何残留，全部以全局状态为准）
  window.__TRANCY_GLOBAL_CONFIG__ = window.__TRANCY_GLOBAL_CONFIG__ || {
    enabled: safeStorage.getItem('anti_trancy_enabled') !== 'false', // 默认开启
    triggerMode: safeStorage.getItem('anti_trancy_trigger_mode') || 'auto' // 默认 'auto' 选词即译 (支持 'auto' | 'bubble' | 'ctrl')
  };

  // 清理旧版本挂载的 DOM
  try {
    document.querySelectorAll('.anti-fab-container, .anti-quote-toolbar, .trancy-card-container, .trancy-bubble-trigger, .trancy-voice-overlay, .anti-input-mic-btn, .anti-desmos-drawer').forEach(el => el.remove());
  } catch(e) {}

  if (window.__ANTI_ENHANCEMENTS_CLEANUP__) {
    try { window.__ANTI_ENHANCEMENTS_CLEANUP__(); } catch (e) {}
  }
  window.__ANTI_ENHANCEMENTS_LOADED__ = true;
  window.__ANTI_VERSION__ = '2.9.0';

  const cleanups = [];
  window.__ANTI_ENHANCEMENTS_CLEANUP__ = function() {
    cleanups.forEach(fn => { try { fn(); } catch(e){} });
    document.querySelectorAll('.anti-fab-container, .anti-quote-toolbar, .trancy-card-container, .trancy-voice-overlay, .anti-input-mic-btn, .anti-desmos-drawer').forEach(el => el.remove());
    if (document.documentElement) document.documentElement.classList.remove('anti-width-resizing');
  };

  // 0. 锁定视口溢出并彻底复位横向偏移
  try {
    if (document.documentElement) {
      document.documentElement.style.overflowX = 'hidden';
      document.documentElement.style.maxWidth = '100vw';
      document.documentElement.scrollLeft = 0;
    }
    if (document.body) {
      document.body.style.overflowX = 'hidden';
      document.body.style.maxWidth = '100vw';
      document.body.scrollLeft = 0;
    }
  } catch {}

  // -------------------------------------------------------------
  // Width Modes & Manager (v2.9.0)
  // -------------------------------------------------------------
  const WIDTH_MODES = {
    compact: { key: 'compact', label: '紧凑 760px', width: '760px', num: 760 },
    standard: { key: 'standard', label: '标准 896px', width: '896px', num: 896 },
    wide: { key: 'wide', label: '宽屏 1140px', width: '1140px', num: 1140 },
    full: { key: 'full', label: '全宽 100%', width: '100%', num: 1800 }
  };
  const WIDTH_ORDER = ['compact', 'standard', 'wide', 'full'];

  /**
   * 弹性宽度解析器：
   * 支持预设名 ('compact', 'standard', 'wide', 'full')、
   * 百分比 ('100%')、纯数字 (1050) 或像素字符串 ('1050px')
   */
  function parseWidthValue(val) {
    if (typeof val === 'string') {
      const lower = val.trim().toLowerCase();
      if (WIDTH_MODES[lower]) {
        const m = WIDTH_MODES[lower];
        return { key: m.key, cssVal: m.width, num: m.num, isFull: m.key === 'full', label: m.label };
      }
      if (lower === '100%' || lower === 'full') {
        const m = WIDTH_MODES.full;
        return { key: 'full', cssVal: '100%', num: 1800, isFull: true, label: m.label };
      }
      const numMatch = lower.match(/^(\d+)(px)?$/);
      if (numMatch) {
        const n = parseInt(numMatch[1], 10);
        let key = 'custom';
        let label = `${n}px`;
        if (n === 760) key = 'compact';
        else if (n === 896) key = 'standard';
        else if (n === 1140) key = 'wide';
        return { key, cssVal: `${n}px`, num: n, isFull: false, label };
      }
    } else if (typeof val === 'number' && !isNaN(val)) {
      const n = Math.round(val);
      let key = 'custom';
      let label = `${n}px`;
      if (n === 760) key = 'compact';
      else if (n === 896) key = 'standard';
      else if (n === 1140) key = 'wide';
      return { key, cssVal: `${n}px`, num: n, isFull: false, label };
    }

    // 默认回退为标准 896px
    const def = WIDTH_MODES.standard;
    return { key: def.key, cssVal: def.width, num: def.num, isFull: false, label: def.label };
  }

  const savedWidthVal = safeStorage.getItem('anti_enhance_chat_width') || 'standard';
  const initialParsedWidth = parseWidthValue(savedWidthVal);

  // State
  const state = {
    formulaCopyEnabled: true,
    mermaidEnabled: true,
    get trancyTranslateEnabled() { return window.__TRANCY_GLOBAL_CONFIG__.enabled; },
    set trancyTranslateEnabled(val) { window.__TRANCY_GLOBAL_CONFIG__.enabled = Boolean(val); safeStorage.setItem('anti_trancy_enabled', val ? 'true' : 'false'); },
    get trancyTriggerMode() { return window.__TRANCY_GLOBAL_CONFIG__.triggerMode; },
    set trancyTriggerMode(val) { window.__TRANCY_GLOBAL_CONFIG__.triggerMode = val; safeStorage.setItem('anti_trancy_trigger_mode', val); },
    sendMode: safeStorage.getItem('anti_enhance_send_mode') || 'ctrl-enter',
    widthMode: initialParsedWidth.key,
    chatWidth: initialParsedWidth.cssVal,
  };

  function applyChatWidth(val, notify = false) {
    const parsed = parseWidthValue(val);
    state.widthMode = parsed.key;
    state.chatWidth = parsed.cssVal;
    safeStorage.setItem('anti_enhance_chat_width', parsed.key === 'custom' ? parsed.cssVal : parsed.key);

    // 彻底复位可能存在的横向偏移
    try {
      if (document.documentElement) document.documentElement.scrollLeft = 0;
      if (document.body) document.body.scrollLeft = 0;
    } catch {}

    // 同步分发 CSS 变量 (穿透宿主行内 max(30vw, ...) 钳位)
    document.documentElement.style.setProperty('--anti-chat-max-width', parsed.cssVal);
    document.documentElement.style.setProperty('--max-conversation-width', parsed.cssVal);
    document.documentElement.style.setProperty('--max-artifact-width', parsed.cssVal);

    // 同步 FAB 组件状态
    const display = document.getElementById('anti-width-value-display');
    if (display) {
      display.textContent = parsed.isFull ? '100% 全宽' : parsed.cssVal;
    }

    const slider = document.getElementById('anti-width-slider');
    if (slider) {
      slider.value = parsed.num;
    }

    const badge = document.getElementById('anti-fab-width');
    if (badge) {
      badge.textContent = parsed.isFull ? '全宽' : (parsed.key !== 'custom' ? WIDTH_MODES[parsed.key].label.split(' ')[0] : parsed.cssVal);
    }

    // 更新 4 组预设按钮的激活高亮状态
    const presetBtns = document.querySelectorAll('.anti-fab-preset-btn');
    presetBtns.forEach(btn => {
      const pKey = btn.dataset.preset;
      if (pKey === parsed.key) {
        btn.classList.add('is-active');
      } else {
        btn.classList.remove('is-active');
      }
    });

    if (notify) {
      showToast('📐 页面宽度已切换', parsed.isFull ? '全宽 100%' : parsed.cssVal);
    }
  }

  function cycleChatWidth() {
    let currentIndex = WIDTH_ORDER.indexOf(state.widthMode);
    if (currentIndex === -1) currentIndex = 1;
    const nextIndex = (currentIndex + 1) % WIDTH_ORDER.length;
    applyChatWidth(WIDTH_ORDER[nextIndex], true);
  }

  // 挂载全局 WidthManager 供自动化门禁测试与外部交互
  window.__ANTI_WIDTH_MANAGER__ = {
    get currentWidth() { return state.chatWidth || '896px'; },
    get currentMode() { return state.widthMode || 'standard'; },
    parseWidthValue,
    apply: (val, notify) => applyChatWidth(val, notify),
    cycle: () => cycleChatWidth(),
    MODES: WIDTH_MODES
  };

  applyChatWidth(savedWidthVal, false);

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
  // 1.5 ThemeManager: 外观主题管理 (反重力羊皮纸暖色 / 纯白明亮 / 沉浸暗黑 三大主题自由切换)
  // -------------------------------------------------------------
  const ThemeManager = {
    MODE_KEY: 'anti_enhance_theme_mode',
    currentMode: 'anti', // 'anti' (反重力羊皮纸暖色 - 默认) | 'light' (纯白明亮) | 'dark' (沉浸暗黑)

    getResolvedTheme() {
      if (['anti', 'light', 'dark'].includes(this.currentMode)) {
        return this.currentMode;
      }
      return 'anti';
    },

    apply() {
      const resolved = this.getResolvedTheme();
      try {
        document.documentElement.setAttribute('data-anti-theme', resolved);
        document.body.setAttribute('data-anti-theme', resolved);
      } catch (e) {}
      const badge = document.getElementById('anti-fab-theme');
      if (badge) {
        if (this.currentMode === 'anti') {
          badge.textContent = '反重力';
          badge.className = 'anti-fab-badge is-active';
        } else if (this.currentMode === 'light') {
          badge.textContent = '纯白';
          badge.className = 'anti-fab-badge';
        } else {
          badge.textContent = '暗黑';
          badge.className = 'anti-fab-badge is-active';
        }
      }
      // 同步当前卡片
      const card = document.querySelector('.trancy-card-container');
      if (card) {
        card.setAttribute('data-anti-theme', resolved);
      }

      // 同步 Desmos 数学画板主题
      if (window.__ANTI_DESMOS__ && typeof window.__ANTI_DESMOS__.updateTheme === 'function') {
        window.__ANTI_DESMOS__.updateTheme(resolved === 'dark');
      }
    },

    cycle() {
      // 循环切换：反重力暖色 -> 纯白明亮 -> 沉浸暗黑 -> 反重力暖色
      if (this.currentMode === 'anti') {
        this.currentMode = 'light';
      } else if (this.currentMode === 'light') {
        this.currentMode = 'dark';
      } else {
        this.currentMode = 'anti';
      }
      safeStorage.setItem(this.MODE_KEY, this.currentMode);
      this.apply();

      let modeText = '反重力暖色 (羊皮纸护眼)';
      if (this.currentMode === 'light') modeText = '纯白明亮';
      else if (this.currentMode === 'dark') modeText = '沉浸暗黑';
      showToast('🎨 外观主题', `已切换为：${modeText}`);
    },

    init() {
      const saved = safeStorage.getItem(this.MODE_KEY);
      if (saved && ['anti', 'light', 'dark'].includes(saved)) {
        this.currentMode = saved;
      } else {
        this.currentMode = 'anti'; // 默认直接采用反重力同款暖色！
      }
      this.apply();
    }
  };
  window.__ANTI_THEME_MANAGER__ = ThemeManager;

  // -------------------------------------------------------------
  // 2. Trancy 官方真会员云端同步与生词本管理
  // -------------------------------------------------------------
  const TrancyCloud = {
    DEFAULT_TOKEN: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJuYW1lIjoi6ZmI5paH5paXIiwiaWQiOiI2OWFlOWE4NGI3Mjc1MGI0ODA2MWYzODEiLCJpYXQiOjE3OTEwMzM3MzJ9.ZRJc5x3ffn1NzSh7isPvY-O-UFZIiTTnGh9N-ir2LBo',
    getToken() {
      return safeStorage.getItem('anti_trancy_token') || this.DEFAULT_TOKEN;
    },
    setToken(token) {
      if (token) safeStorage.setItem('anti_trancy_token', token.trim());
    },
    getUser() {
      try {
        return JSON.parse(safeStorage.getItem('anti_trancy_user_profile') || 'null');
      } catch {
        return null;
      }
    },
    setUser(user) {
      if (user) safeStorage.setItem('anti_trancy_user_profile', JSON.stringify(user));
    },
    async fetchProfile() {
      const token = this.getToken();
      if (!token) return null;
      try {
        const res = await fetch('https://api.trancy.org/1/user/profile', {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/json'
          },
          signal: AbortSignal.timeout(4000)
        });
        if (res.ok) {
          const json = await res.json();
          if (json && json.data) {
            this.setUser(json.data);
            if (json.data.token && json.data.token !== token) {
              this.setToken(json.data.token);
            }
            return json.data;
          }
        }
      } catch (e) {
        console.warn('[TrancyCloud] fetchProfile error:', e);
      }
      return this.getUser();
    },
    async syncFromCloud() {
      const token = this.getToken();
      if (!token) return false;
      try {
        const res = await fetch('https://api.trancy.org/4/words?target=en&native=zh-CN&updatedAt=0', {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/json'
          },
          signal: AbortSignal.timeout(6000)
        });
        if (res.ok) {
          const json = await res.json();
          if (json && Array.isArray(json.data)) {
            TrancyVocabulary.mergeCloudWords(json.data);
            return true;
          }
        }
      } catch (e) {
        console.warn('[TrancyCloud] syncFromCloud error:', e);
      }
      return false;
    },
    async addWord(word) {
      const token = this.getToken();
      if (!token || !word) return false;
      try {
        const res = await fetch('https://api.trancy.org/1/words', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          body: JSON.stringify({
            text: word.trim(),
            target: 'en',
            native: 'zh-CN',
            star: true,
            master: false
          }),
          signal: AbortSignal.timeout(5000)
        });
        return res.ok;
      } catch (e) {
        console.warn('[TrancyCloud] addWord error:', e);
        return false;
      }
    },
    async removeWord(word) {
      const token = this.getToken();
      if (!token || !word) return false;
      try {
        const res = await fetch(`https://api.trancy.org/1/words/${encodeURIComponent(word.trim())}`, {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          body: JSON.stringify({
            star: false,
            target: 'en',
            native: 'zh-CN'
          }),
          signal: AbortSignal.timeout(5000)
        });
        return res.ok;
      } catch (e) {
        console.warn('[TrancyCloud] removeWord error:', e);
        return false;
      }
    }
  };
  window.__TRANCY_CLOUD__ = TrancyCloud;

  const TrancyVocabulary = {
    getAll() {
      try {
        return JSON.parse(safeStorage.getItem('anti_trancy_vocabulary') || '[]');
      } catch {
        return [];
      }
    },
    saveAll(list) {
      safeStorage.setItem('anti_trancy_vocabulary', JSON.stringify(list));
      const badge = document.getElementById('anti-fab-vocab-count');
      if (badge) badge.textContent = `${list.length} 词`;
    },
    has(word) {
      if (!word) return false;
      const list = this.getAll();
      const norm = word.trim().toLowerCase();
      return list.some(x => x.word && x.word.trim().toLowerCase() === norm);
    },
    add(item, syncToCloud = true) {
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
      if (syncToCloud) {
        TrancyCloud.addWord(item.word);
      }
      return true;
    },
    remove(word, syncToCloud = true) {
      if (!word) return false;
      const list = this.getAll();
      const norm = word.trim().toLowerCase();
      const filtered = list.filter(x => x.word && x.word.trim().toLowerCase() !== norm);
      if (filtered.length !== list.length) {
        this.saveAll(filtered);
        if (syncToCloud) {
          TrancyCloud.removeWord(word);
        }
        return true;
      }
      return false;
    },
    mergeCloudWords(cloudWords) {
      if (!Array.isArray(cloudWords)) return;
      const list = this.getAll();
      const map = new Map();
      list.forEach(item => {
        if (item && item.word) map.set(item.word.trim().toLowerCase(), item);
      });
      cloudWords.forEach(cw => {
        if (!cw || !cw.text) return;
        const norm = cw.text.trim().toLowerCase();
        const transText = Array.isArray(cw.translation) && cw.translation[0] ? (cw.translation[0].trans || '') : (typeof cw.translation === 'string' ? cw.translation : '');
        if (!map.has(norm)) {
          const entry = {
            id: 'cloud_' + (cw._id || norm),
            word: cw.text.trim(),
            phonetic: cw.phonetic || '',
            translation: transText,
            explanation: '',
            examples: [],
            context: '',
            createdAt: cw.starAt ? new Date(cw.starAt).toISOString() : new Date().toISOString()
          };
          map.set(norm, entry);
          list.unshift(entry);
        }
      });
      this.saveAll(list);
    }
  };
  window.__TRANCY_VOCABULARY__ = TrancyVocabulary;

  const _TRANSLATE_CACHE = (typeof window !== 'undefined' && (window.__TRANCY_CACHE__ = window.__TRANCY_CACHE__ || new Map())) || new Map();

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

      // 智能语言判断与方向适配
      const isChinese = /[\u4e00-\u9fa5]/.test(cleanText);
      const targetLang = isChinese ? 'zh-CN' : 'en';
      const nativeLang = isChinese ? 'en' : 'zh-CN';
      const gtSl = isChinese ? 'zh-CN' : 'auto';
      const gtTl = isChinese ? 'en' : 'zh-CN';

      // 单词/短词判定：英文单词或中文短词（≤12字符且无标点换行）
      const isEnglishWord = !isChinese && !cleanText.includes(' ') && cleanText.length <= 45 && /^[a-zA-Z\-'’]+$/.test(cleanText);
      const isChineseWord = isChinese && cleanText.length <= 12 && !/[\r\n。，！？；]/.test(cleanText);
      const isDictEligible = isEnglishWord || isChineseWord;

      let result = null;

      if (isDictEligible) {
        // 1. 首选：Trancy 官方原生权威词典引擎 (原汁原味音标/拼音 + 分词性释义 + 权威例句)
        try {
          const trancyRes = await fetch(`https://api.trancy.org/1/dictionary?text=${encodeURIComponent(cleanText)}&target=${targetLang}&native=${nativeLang}`, {
            signal: AbortSignal.timeout(2200)
          });
          if (trancyRes.ok) {
            const json = await trancyRes.json();
            if (json && json.data) {
              const d = json.data;

              // 提取音标（英文显示美音/英音，中文显示拼音）
              let phonetic = '';
              if (Array.isArray(d.phonetics)) {
                if (isChinese) {
                  const p = d.phonetics.find(x => x.value && x.value[0]);
                  if (p && p.value && p.value[0]) {
                    phonetic = `[${p.value[0]}]`;
                  }
                } else {
                  const usPh = d.phonetics.find(p => p.locale === 'us' && p.value && p.value[0]);
                  const ukPh = d.phonetics.find(p => p.locale === 'uk' && p.value && p.value[0]);
                  const targetPh = usPh || ukPh;
                  if (targetPh && targetPh.value && targetPh.value[0]) {
                    phonetic = `/${targetPh.value[0].replace(/^\/|\/$/g, '')}/`;
                  }
                }
              }

              // 提取核心翻译
              let translation = '';
              if (Array.isArray(d.translation) && d.translation.length > 0) {
                translation = d.translation.slice(0, 3).map(t => t.trans).join('；');
              } else if (Array.isArray(d.explains) && d.explains.length > 0 && d.explains[0].terms) {
                translation = d.explains[0].terms.slice(0, 3).join('；');
              } else if (Array.isArray(d.dict) && d.dict.length > 0 && d.dict[0].terms) {
                translation = d.dict[0].terms.slice(0, 3).join('；');
              }

              // 提取分词性详细解析（同时支持英文 explains 与中文 dict）
              let explainsList = [];
              let explanation = '';
              if (Array.isArray(d.explains) && d.explains.length > 0) {
                explainsList = d.explains
                  .filter(e => e.terms && e.terms.length > 0)
                  .map(e => ({
                    pos: e.pos || '',
                    terms: Array.isArray(e.terms) ? e.terms : [e.terms]
                  }));
                explanation = d.explains
                  .filter(e => e.terms && e.terms.length > 0)
                  .map(e => `${e.pos || ''} ${e.terms.slice(0, 5).join('，')}`.trim())
                  .join('\n');
              } else if (Array.isArray(d.dict) && d.dict.length > 0) {
                explainsList = d.dict
                  .filter(e => e.terms && e.terms.length > 0)
                  .map(e => ({
                    pos: e.pos || '',
                    terms: Array.isArray(e.terms) ? e.terms : [e.terms]
                  }));
                explanation = d.dict
                  .filter(e => e.terms && e.terms.length > 0)
                  .map(e => `${e.pos ? e.pos + ': ' : ''}${e.terms.slice(0, 5).join(', ')}`.trim())
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
                  explainsList,
                  explanation,
                  examples,
                  source: 'Trancy 原生词典'
                };
              }
            }
          }
        } catch (e) {}

        // 2. 备选：有道原生词典建议引擎 (中英双向秒回，纯字典毫秒级直出)
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

      // 3. 短语或句子，或者单词词典均未命中的情况：Google Translate 原生极速翻译 (动态中英双向)
      if (!result) {
        try {
          const gtRes = await fetch(`https://translate.googleapis.com/translate_a/single?client=gtx&sl=${gtSl}&tl=${gtTl}&dt=t&dt=bd&q=${encodeURIComponent(cleanText)}`, {
            signal: AbortSignal.timeout(2500)
          });
          if (gtRes.ok) {
            const data = await gtRes.json();
            let transText = '';
            if (Array.isArray(data) && Array.isArray(data[0])) {
              transText = data[0].map(x => x[0]).join('');
            }

            let dictExplains = '';
            let explainsList = [];
            if (Array.isArray(data[1])) {
              explainsList = data[1].map(posGroup => ({
                pos: posGroup[0] ? (posGroup[0].endsWith('.') ? posGroup[0] : posGroup[0] + '.') : '',
                terms: Array.isArray(posGroup[1]) ? posGroup[1] : []
              }));
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
                explainsList,
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
    },

    // 5. 上下文 AI 单词语境消歧（Trancy 官方真会员优先 + 本地 CPA 极速号池兜底）
    async queryContextExplain(word, sentence) {
      const cleanWord = (word || '').trim();
      const cleanSentence = (sentence || '').trim();
      if (!cleanWord || !cleanSentence || cleanWord.length > 50) return null;

      const cacheKey = `ctx:${cleanWord}::${cleanSentence.slice(0, 80)}`;
      if (_TRANSLATE_CACHE.has(cacheKey)) {
        return _TRANSLATE_CACHE.get(cacheKey);
      }

      // 5.1 第一优先级：Trancy 官方会员原生 AI 语境消歧接口
      const token = TrancyCloud.getToken();
      if (token) {
        try {
          const cloudUrl = `https://api.trancy.org/1/explain?word=${encodeURIComponent(cleanWord)}&sentence=${encodeURIComponent(cleanSentence)}&target=en&native=zh-CN`;
          const cRes = await fetch(cloudUrl, {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Accept': 'application/json'
            },
            signal: AbortSignal.timeout(2800)
          });
          if (cRes.ok) {
            const cJson = await cRes.json();
            if (cJson && cJson.data && (cJson.data.translation || cJson.data.trans)) {
              const item = {
                pos: cJson.data.pos || 'AI',
                translation: cJson.data.translation || cJson.data.trans,
                source: 'Trancy 官方 AI'
              };
              if (_TRANSLATE_CACHE.size > 500) {
                const firstKey = _TRANSLATE_CACHE.keys().next().value;
                _TRANSLATE_CACHE.delete(firstKey);
              }
              _TRANSLATE_CACHE.set(cacheKey, item);
              return item;
            }
          }
        } catch (e) {
          // 官方接口超时或失败，无缝降级到本地 CPA
        }
      }

      // 5.2 第二优先级：本地 CPA 8317 极速网关兜底 (Gemini 3.1 Flash-Lite)
      try {
        const prompt = `你是一个极简词典引擎。请根据上下文句子判断目标单词在语境中的词性和最准确的一个中文释义。\n上下文：${cleanSentence}\n目标单词：${cleanWord}\n输出严格遵循JSON格式（不要markdown标记，不要多余字符）：{"pos":"词性缩写如n./v./adj./web.","translation":"极简中文释义"}`;

        const res = await fetch('http://127.0.0.1:8317/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer sk-soIl8VyFs9ZoDnUDH03Rlz6Pdoi5pgY3WCtxZy4f7dWR9YzIqcJSGj8ymftudx0G'
          },
          body: JSON.stringify({
            model: 'gemini-3.1-flash-lite',
            messages: [{ role: 'user', content: prompt }],
            temperature: 0.1,
            max_tokens: 60
          }),
          signal: AbortSignal.timeout(5000)
        });

        if (res.ok) {
          const data = await res.json();
          const raw = data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content;
          if (raw) {
            const cleanJson = raw.replace(/```json|```/g, '').trim();
            const match = cleanJson.match(/\{[\s\S]*\}/);
            if (match) {
              const parsed = JSON.parse(match[0]);
              if (parsed && (parsed.translation || parsed.trans)) {
                const item = {
                  pos: parsed.pos || 'AI',
                  translation: parsed.translation || parsed.trans,
                  source: '本地 CPA'
                };
                if (_TRANSLATE_CACHE.size > 500) {
                  const firstKey = _TRANSLATE_CACHE.keys().next().value;
                  _TRANSLATE_CACHE.delete(firstKey);
                }
                _TRANSLATE_CACHE.set(cacheKey, item);
                return item;
              }
            }
          }
        }
      } catch (e) {}

      return null;
    }
  };
  window.__TRANCY_ENGINE__ = TrancyEngine;

  function playTts(text) {
    if (!text || typeof window === 'undefined') return;
    const clean = text.trim();
    // 英文单词真人发音
    if (/^[a-zA-Z\-'’]+$/.test(clean)) {
      try {
        const audio = new Audio(`https://dict.youdao.com/dictvoice?type=0&audio=${encodeURIComponent(clean)}`);
        audio.play().catch(() => {
          fallbackSpeech(clean);
        });
        return;
      } catch (e) {}
    }
    // 中文词语真人发音
    if (/[\u4e00-\u9fa5]/.test(clean)) {
      try {
        const audio = new Audio(`https://dict.youdao.com/dictvoice?le=zh&audio=${encodeURIComponent(clean)}`);
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

  function extractContextSentence(range, word) {
    if (!range || !word) return '';
    try {
      let node = range.commonAncestorContainer;
      let el = node.nodeType === Node.TEXT_NODE ? node.parentElement : node;
      if (!el) return '';
      const blockEl = el.closest('p, div, li, td, pre, code, .prose, [class*="message"], [class*="content"]') || el;
      const full = (blockEl.innerText || blockEl.textContent || '').trim();
      if (!full) return '';

      const parts = full.split(/([。！？!?;\n\r]+)/);
      for (let i = 0; i < parts.length; i++) {
        if (parts[i] && parts[i].includes(word)) {
          const s = parts[i].trim();
          if (s.length >= 4) return s.slice(0, 160);
        }
      }

      const idx = full.indexOf(word);
      if (idx !== -1) {
        const start = Math.max(0, idx - 45);
        const end = Math.min(full.length, idx + word.length + 45);
        return full.substring(start, end).trim();
      }
      return full.slice(0, 140);
    } catch (e) {
      return '';
    }
  }

  async function renderTrancyCard(text, rect, mouseEvent, contextSentence = '') {
    removeTrancyCard();

    const card = document.createElement('div');
    card.className = 'trancy-card-container is-visible';
    card.setAttribute('data-anti-theme', ThemeManager.getResolvedTheme());

    const cardWidth = 330;
    const cardHeight = 260;
    const pos = calculateSafeViewportPosition(rect, cardWidth, cardHeight, mouseEvent);

    card.style.top = `${pos.top}px`;
    card.style.left = `${pos.left}px`;

    const isFav = TrancyVocabulary.has(text);
    const isSingleWord = !text.includes(' ') && text.length <= 45;

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
        showToast('已移出生词本', `${text} (已从 Trancy 云端同步移除)`);
      } else {
        TrancyVocabulary.add(currentResult || { word: text, translation: '' });
        favBtn.classList.add('is-fav');
        showToast('★ 已加入生词本', `${text} (已同步至 Trancy 官方云端)`);
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
      let bodyHtml = '';

      const hasExplainsList = Array.isArray(result.explainsList) && result.explainsList.length > 0;

      if (hasExplainsList) {
        bodyHtml += '<div class="trancy-explains-list">';
        result.explainsList.forEach(item => {
          const posRaw = (item.pos || '').toLowerCase();
          let posClass = 'pos-other';
          if (posRaw.includes('n')) posClass = 'pos-n';
          else if (posRaw.includes('v')) posClass = 'pos-v';
          else if (posRaw.includes('adj') || posRaw.includes('a.')) posClass = 'pos-adj';
          else if (posRaw.includes('web')) posClass = 'pos-web';
          else if (posRaw.includes('adv')) posClass = 'pos-adj';

          const termsStr = Array.isArray(item.terms) ? item.terms.slice(0, 6).join('； ') : String(item.terms || '');
          bodyHtml += `
            <div class="trancy-pos-row">
              <span class="trancy-pos-tag ${posClass}">${escapeHtml(item.pos || '释')}</span>
              <span class="trancy-pos-terms">${escapeHtml(termsStr)}</span>
            </div>
          `;
        });

        // 如果选中的是单个单词且有上下文语境，预先插入 Trancy 原生同款 AI 语境消歧 Loading 框 (彩色旋转光晕边框 - 如截图第3行)
        if (isSingleWord && contextSentence) {
          bodyHtml += `
            <div class="trancy-pos-row trancy-ai-row" id="trancy-ai-context-box">
              <span class="trancy-pos-ai loading">AI.</span>
              <span class="trancy-ai-text">语境消歧中...</span>
              <span class="trancy-ai-badge">✨ 上下文 AI</span>
            </div>
          `;
        }
        bodyHtml += '</div>';
      } else {
        bodyHtml += `<div class="trancy-trans-text">${escapeHtml(result.translation)}</div>`;
        if (isSingleWord && contextSentence) {
          bodyHtml += `
            <div class="trancy-pos-row trancy-ai-row" id="trancy-ai-context-box">
              <span class="trancy-pos-ai loading">AI.</span>
              <span class="trancy-ai-text">语境消歧中...</span>
              <span class="trancy-ai-badge">✨ 上下文 AI</span>
            </div>
          `;
        }
        if (result.explanation) {
          bodyHtml += `<div class="trancy-explanation">${escapeHtml(result.explanation)}</div>`;
        }
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

      // 异步第二轨：获取 AI 上下文精准释义
      if (isSingleWord && contextSentence) {
        TrancyEngine.queryContextExplain(text, contextSentence).then((aiRes) => {
          if (currentCard !== card) return;
          const aiBox = card.querySelector('#trancy-ai-context-box');
          if (!aiBox) return;
          if (aiRes && aiRes.translation) {
            aiBox.innerHTML = `
              <span class="trancy-pos-ai">${escapeHtml(aiRes.pos ? (aiRes.pos.endsWith('.') ? aiRes.pos : aiRes.pos + '.') : 'AI.')}</span>
              <span class="trancy-ai-text">${escapeHtml(aiRes.translation)}</span>
              <span class="trancy-ai-badge">✨ 上下文释义</span>
            `;
          } else {
            aiBox.remove();
          }
        }).catch(() => {
          const aiBox = card.querySelector('#trancy-ai-context-box');
          if (aiBox) aiBox.remove();
        });
      }
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
        const contextSentence = extractContextSentence(range, text);

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
            renderTrancyCard(text, rect, e, contextSentence);
          });

          document.body.appendChild(bubble);
          currentBubble = bubble;
        } else {
          // auto 或 ctrl 模式：直接展开翻译卡片
          renderTrancyCard(text, rect, e, contextSentence);
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
          showToast('LaTeX 公式已复制 & 画板联动', latex.length > 40 ? latex.slice(0, 40) + '...' : latex);
        });
        // KaTeX 即点即画：联动 Desmos 画板
        if (window.__ANTI_DESMOS__) {
          window.__ANTI_DESMOS__.plot(latex);
        }
      }
    };
    document.addEventListener('click', onDocClick);
    cleanups.push(() => document.removeEventListener('click', onDocClick));
  }

  // -------------------------------------------------------------
  // 6. 计划模式 (Plan Mode) 快速切换与 Lexical 节点注入
  // -------------------------------------------------------------
  function getChatEditor() {
    const eds = document.querySelectorAll('[contenteditable="true"]');
    if (eds.length === 1) return eds[0];
    if (eds.length > 1) {
      const focused = Array.from(eds).find(el => el === document.activeElement || el.contains(document.activeElement));
      if (focused) return focused;
      const composer = Array.from(eds).find(el => el.classList.contains('cursor-text') || el.closest('[data-testid="agent-input-box"]') || el.closest('form'));
      if (composer) return composer;
      return eds[0];
    }
    return null;
  }

  function isPlanModeActive() {
    const ed = getChatEditor();
    if (!ed) return false;
    if (ed.querySelector('[data-uri="slashCommand:plan"]')) return true;
    const editor = ed.__lexicalEditor;
    if (editor && editor._editorState && editor._editorState._nodeMap) {
      for (const [k, node] of editor._editorState._nodeMap.entries()) {
        if (node.getType() === 'contextScopeItemMention' && node.__data?.mentionText === 'plan') {
          return true;
        }
      }
    }
    return false;
  }

  function updateFabPlanBadge(active) {
    const badge = document.getElementById('anti-fab-plan-mode');
    if (!badge) return;
    const isAct = typeof active === 'boolean' ? active : isPlanModeActive();
    badge.textContent = isAct ? 'Plan' : '标准';
    if (isAct) {
      badge.classList.add('is-active');
    } else {
      badge.classList.remove('is-active');
    }
  }

  function togglePlanMode() {
    const ed = getChatEditor();
    if (!ed) {
      showToast('计划模式', '未找到活跃的输入框', true);
      return false;
    }

    const editor = ed.__lexicalEditor;
    if (!editor) {
      showToast('计划模式', '未找到 Lexical 编辑器实例', true);
      return false;
    }

    const currentlyActive = isPlanModeActive();

    if (currentlyActive) {
      // 1. 关闭计划模式：移除 contextScopeItemMention(plan) 节点及紧随的前导空格
      editor.update(() => {
        const root = editor._editorState._nodeMap.get('root');
        if (!root) return;
        for (const p of root.getChildren()) {
          const children = [...p.getChildren()];
          for (let i = 0; i < children.length; i++) {
            const node = children[i];
            if (node.getType() === 'contextScopeItemMention' && node.__data?.mentionText === 'plan') {
              const next = children[i + 1];
              if (next && next.getType() === 'text') {
                const text = next.getTextContent();
                if (text.startsWith(' ')) {
                  next.setTextContent(text.slice(1));
                }
              }
              node.remove();
            }
          }
        }
        root.selectEnd();
      });

      ed.focus();
      updateFabPlanBadge(false);
      return false;
    } else {
      // 2. 开启计划模式：嵌入原生 contextScopeItemMention 节点
      let planCmd = null;
      try {
        let curr = ed[Object.keys(ed).find(k => k.startsWith('__reactFiber$'))];
        while (curr) {
          if (curr.memoizedProps?.slashCommandItems) {
            planCmd = curr.memoizedProps.slashCommandItems.find(i => (i.title === 'plan' || i.name === 'plan' || i.info?.name === 'plan'));
            if (planCmd) break;
          }
          curr = curr.return;
        }
      } catch (e) {}

      const defaultModelFacingText = '<PLAN>The user is requesting that you think and plan carefully before executing the upcoming task.\\nCarefully research the task, make sure that you and the user are aligned on the goals and requirements,\\ncreate a detailed implementation plan artifact, and get user approval on the plan before making any code changes (besides artifacts)\\nor running any modifying commands.\\n\\n# Guidelines\\n- Establish a shared understanding of the task with the user. If there are any ambiguities, underspecified requirements,\\nor implicit assumptions, clarify them with the user before proceeding.\\n- Thoroughly research the codebase to establish a solid understanding of the relevant components, systems, dependencies, and architecture.\\nAs you research, provide verbal updates of your research steps and thought process with the user, so they can follow along.\\n- Create an implementation plan artifact that outlines your proposed execution strategy.\\nSet request_feedback = true and user_facing = true in the ArtifactMetadata. The user will automatically\\nsee any new and modified plans you create, so DO NOT re-summarize the plan.\\n- Only after the user explicitly approves the plan should you proceed to execution.\\n- Verify that your changes have the desired effects e.g. run unit tests, make sure code builds, etc. before claiming that the task is complete.\\n- After you\\\'ve completed your task and verified that your solution works, create a walkthrough artifact to summarize your work.\\n\\n# Planning Mode Artifacts\\nWhen in planning mode, you should create two special artifacts.\\n\\n# Implementation Plan\\nPath: <Artifact Directory>/<plan_name>.md\\n\\n**Purpose**: A technical design document to present your implementation plan to the user for feedback and approval.\\nAfter reading the document, the user should understand the key technical details of your plan, and be able to make an informed decision on whether to approve it.\\nThis document should be very detailed, including code snippets, diffs, mermaid diagrams, verification strategies, and background information.\\n\\n**Format**: Use the following format, omitting any irrelevant sections:\\n\\n## [Goal Description]\\nProvide a brief description of the problem, any background context, and what the change accomplishes.\\n\\n## User Review Required\\nDocument anything that requires user review or feedback, for example, breaking changes or significant design decisions. Use GitHub alerts (IMPORTANT/WARNING/CAUTION) to highlight critical items.\\n\\n## Open Questions\\nAny clarifying or design questions for the user that will impact the implementation plan. Use GitHub alerts (IMPORTANT/WARNING/CAUTION) to highlight critical items.\\n\\n## Proposed Changes\\nGroup files by component (e.g., package, feature area, dependency layer) and order logically (dependencies first). Separate components with horizontal rules for visual clarity.\\n\\n### [Component Name]\\nSummary of what will change in this component with explicit code snippets and diffs. For specific files, Use [NEW] and [DELETE] to demarcate new and deleted files, for example:\\n#### [MODIFY] file basename\\n#### [NEW] file basename\\n#### [DELETE] file basename\\n\\n## Verification Plan\\nSummary of how you will verify that your changes have the desired effects.\\n\\n### Automated Tests\\nExact commands to run automated tests\\n\\n### Manual Verification\\nInstructions for what the user should manually verify.\\n\\n# Walkthrough\\nPath: <Artifact Directory>/walkthrough.md\\n\\n**Purpose**: After completing work, summarize what you accomplished. Update an existing walkthrough for related follow-up work rather than creating a new one.\\n\\n**Document**:\\n- Changes made\\n- What was tested\\n- Validation results\\n\\nEmbed screenshots and recordings to visually demonstrate UI changes and user flows.</PLAN>';

      const modelFacingText = planCmd?.info?.modelFacingText || defaultModelFacingText;

      const entry = editor._nodes.get('contextScopeItemMention');
      const NodeClass = entry ? entry.klass : null;
      const TextKlass = editor._nodes.get('text')?.klass;

      if (!NodeClass) {
        showToast('计划模式', '未找到 contextScopeItemMention 节点定义', true);
        return false;
      }

      const dataPayload = {
        mentionText: 'plan',
        data: JSON.stringify({
          slashCommand: {
            info: {
              name: 'plan',
              modelFacingText: modelFacingText,
              type: 'SLASH_COMMAND_TYPE_SYSTEM',
              icon: 'ballot'
            }
          }
        })
      };

      editor.update(() => {
        const root = editor._editorState._nodeMap.get('root').getWritable();
        let p = root.getFirstChild();
        if (!p) {
          const ParagraphKlass = editor._nodes.get('paragraph').klass;
          p = new ParagraphKlass();
          root.append(p);
        }
        const writableP = p.getWritable();
        const pillNode = NodeClass.importJSON({ data: dataPayload });

        const firstChild = writableP.getFirstChild();
        if (firstChild) {
          firstChild.insertBefore(pillNode);
        } else {
          writableP.append(pillNode);
        }
        if (TextKlass) {
          pillNode.insertAfter(new TextKlass(' '));
        }
        root.selectEnd();
      });

      ed.focus();
      updateFabPlanBadge(true);
      return true;
    }
  }

  window.__togglePlanMode = togglePlanMode;
  window.__isPlanModeActive = isPlanModeActive;

  // -------------------------------------------------------------
  // 7. 发送快捷键与全局监听 (Shift+Tab/Alt+P 计划模式, Alt+W 调宽, Alt+Shift+T 翻译, Ctrl+Enter 发送)
  // -------------------------------------------------------------
  function initKeyboardShortcuts() {
    const onKey = (e) => {
      // 0. Shift+Tab 或 Alt+P: 快速切换计划模式 (Plan Mode ⇄ 标准模式)
      if ((e.shiftKey && e.key === 'Tab') || (e.altKey && !e.ctrlKey && !e.metaKey && (e.key === 'p' || e.key === 'P' || e.code === 'KeyP'))) {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        togglePlanMode();
        return;
      }

      // 1. Alt+W 快速切换页面宽度
      if (e.altKey && !e.ctrlKey && !e.metaKey && (e.key === 'w' || e.key === 'W' || e.code === 'KeyW')) {
        e.preventDefault();
        e.stopPropagation();
        cycleChatWidth();
        return;
      }

      // 1.5 Alt+D 快速开关 Desmos 数学画板
      if (e.altKey && !e.ctrlKey && !e.metaKey && (e.key === 'd' || e.key === 'D' || e.code === 'KeyD')) {
        e.preventDefault();
        e.stopPropagation();
        if (window.__ANTI_DESMOS__) {
          window.__ANTI_DESMOS__.toggleDrawer();
        }
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

    const onInput = () => {
      updateFabPlanBadge();
    };
    document.addEventListener('input', onInput, true);
    cleanups.push(() => document.removeEventListener('input', onInput, true));
  }

  // -------------------------------------------------------------
  // 7.5 Desmos 数学画板控制器 (window.__ANTI_DESMOS__) & 脚本按需加载器
  // -------------------------------------------------------------
  function autoFixContinuousLatex(latex) {
    if (!latex || typeof latex !== 'string') return '';
    let s = latex.trim();
    if (s.includes('\\left\\{') || s.includes('\\{') || s.includes(':')) {
      return s;
    }
    const fracPattern = /^(?:y\s*=\s*)?\\frac\{\\sin(?:\(([^)]+)\)|\s*([a-zA-Z0-9.+*-]+))\s*\}\{x\}$/;
    const m1 = s.match(fracPattern);
    if (m1) {
      const rawArg = (m1[1] || m1[2] || '').trim();
      let limitVal = '1';
      if (rawArg === 'x' || rawArg === '') {
        limitVal = '1';
      } else {
        const coefMatch = rawArg.match(/^([0-9.]+)\s*\*?\s*x$/);
        if (coefMatch) {
          limitVal = coefMatch[1];
        } else {
          limitVal = rawArg.replace(/\*?\s*x$/, '') || '1';
        }
      }
      const pureExpr = s.replace(/^y\s*=\s*/, '');
      return `y=\\left\\{x=0:${limitVal},\\ ${pureExpr}\\right\\}`;
    }
    return s;
  }

  function is3DFormula(formula) {
    if (!formula || typeof formula !== 'string') return false;
    const s = formula.replace(/\s+/g, '');
    return /\bz\b|[zZ]=|=[zZ]|\+z\^|\+z_|\([a-zA-Z0-9+\-*/.]+,[a-zA-Z0-9+\-*/.]+,[a-zA-Z0-9+\-*/.]+\)/.test(s);
  }

  const DesmosScriptLoader = {
    _promise: null,
    load() {
      if (typeof window !== 'undefined' && window.Desmos) {
        return Promise.resolve(window.Desmos);
      }
      if (this._promise) return this._promise;

      this._promise = new Promise((resolve, reject) => {
        if (typeof window !== 'undefined' && window.Desmos) return resolve(window.Desmos);
        const existing = document.querySelector('script[data-desmos-api]');
        if (existing) {
          existing.addEventListener('load', () => resolve(window.Desmos));
          existing.addEventListener('error', (e) => reject(e));
          return;
        }
        const script = document.createElement('script');
        script.setAttribute('data-desmos-api', 'true');
        script.src = 'http://127.0.0.1:8325/assets/desmos_api.js';
        script.onload = () => {
          if (window.Desmos) {
            resolve(window.Desmos);
          } else {
            reject(new Error('window.Desmos not found after script load'));
          }
        };
        script.onerror = () => {
          this._promise = null;
          reject(new Error('Failed to load desmos_api.js from :8325'));
        };
        (document.head || document.documentElement).appendChild(script);
      });
      return this._promise;
    }
  };

  const AntiDesmos = {
    drawerEl: null,
    calcContainer: null,
    calc: null,
    dimension: '2d',
    expressions: [],
    isOpen: false,

    init() {
      this.renderDrawer();
    },

    renderDrawer() {
      let existing = document.querySelector('.anti-desmos-drawer');
      if (existing) existing.remove();

      const drawer = document.createElement('div');
      drawer.className = 'anti-desmos-drawer';
      drawer.innerHTML = `
        <div class="anti-desmos-header">
          <div class="anti-desmos-title-box">
            <span>📐</span>
            <span>Desmos 数学画板</span>
          </div>
          <div class="anti-desmos-dim-control">
            <button class="anti-desmos-dim-btn is-active" data-dim="2d">2D 平面</button>
            <button class="anti-desmos-dim-btn" data-dim="3d">3D 空间</button>
          </div>
          <div class="anti-desmos-actions">
            <button class="anti-desmos-btn" data-action="clear" title="清空画布公式">🧹 清空</button>
            <button class="anti-desmos-btn" data-action="export" title="导出高清 PNG 图像">💾 导出</button>
            <button class="anti-desmos-btn-close" data-action="close" title="关闭画板 (Alt+D)">✕</button>
          </div>
        </div>
        <div class="anti-desmos-body">
          <div id="anti-desmos-calculator"></div>
        </div>
        <div class="anti-desmos-footer">
          <div class="anti-desmos-status">
            <div class="anti-desmos-status-dot"></div>
            <span id="anti-desmos-status-text">画板就绪</span>
          </div>
          <span class="anti-desmos-shortcut-tip">Alt+D 开关 · 点 KaTeX 绘制</span>
        </div>
      `;

      document.body.appendChild(drawer);
      this.drawerEl = drawer;
      this.calcContainer = drawer.querySelector('#anti-desmos-calculator');

      const dimBtns = drawer.querySelectorAll('.anti-desmos-dim-btn');
      dimBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          this.setDimension(btn.dataset.dim);
        });
      });

      drawer.querySelector('[data-action="clear"]').addEventListener('click', (e) => {
        e.stopPropagation();
        this.clear();
        showToast('🧹 Desmos 画板', '画布公式已清空');
      });

      drawer.querySelector('[data-action="export"]').addEventListener('click', (e) => {
        e.stopPropagation();
        this.exportImage();
      });

      drawer.querySelector('[data-action="close"]').addEventListener('click', (e) => {
        e.stopPropagation();
        this.closeDrawer();
      });
    },

    async ensureCalculator(targetDim = this.dimension) {
      if (!this.drawerEl) this.renderDrawer();
      if (!this.calcContainer) this.calcContainer = this.drawerEl.querySelector('#anti-desmos-calculator');

      await DesmosScriptLoader.load();

      if (this.calc && this.dimension === targetDim) {
        return this.calc;
      }

      if (this.calc) {
        try { this.calc.destroy(); } catch {}
        this.calc = null;
        this.calcContainer.innerHTML = '';
      }

      this.dimension = targetDim;

      if (this.drawerEl) {
        const btns = this.drawerEl.querySelectorAll('.anti-desmos-dim-btn');
        btns.forEach(b => {
          if (b.dataset.dim === targetDim) b.classList.add('is-active');
          else b.classList.remove('is-active');
        });
      }

      const isDark = document.documentElement.getAttribute('data-anti-theme') === 'dark';
      const commonOptions = {
        keypad: false,
        expressions: false,
        settingsMenu: true,
        zoomButtons: true,
        invertedColors: isDark,
        fontSize: 14,
        border: false
      };

      if (targetDim === '3d') {
        if (typeof window.Desmos.Calculator3D === 'function') {
          this.calc = window.Desmos.Calculator3D(this.calcContainer, commonOptions);
        } else {
          console.warn('[AntiDesmos] Calculator3D not found, fallback to 2D');
          this.calc = window.Desmos.GraphingCalculator(this.calcContainer, commonOptions);
          this.dimension = '2d';
        }
      } else {
        this.calc = window.Desmos.GraphingCalculator(this.calcContainer, commonOptions);
      }

      if (this.expressions && this.expressions.length > 0) {
        this.expressions.forEach(e => {
          try { this.calc.setExpression(e); } catch {}
        });
      }

      this.updateStatus(targetDim === '3d' ? '3D 空间就绪' : '2D 平面就绪');
      setTimeout(() => { try { this.calc?.resize?.(); } catch {} }, 60);

      return this.calc;
    },

    updateStatus(text) {
      const el = document.getElementById('anti-desmos-status-text');
      if (el) el.textContent = text;
    },

    async setDimension(dim) {
      if (dim !== '2d' && dim !== '3d') return;
      await this.ensureCalculator(dim);
      if (this.expressions.length === 0) {
        if (dim === '3d') {
          this.calc.setExpression({ id: 'surf_init', latex: 'z=x^2-y^2', color: '#2563eb' });
        } else {
          this.calc.setExpression({ id: 'expr_init', latex: 'y=\\sin(x)', color: '#2563eb', lineWidth: 3.5 });
          try { this.calc.setMathBounds({ left: -6.28, right: 6.28, bottom: -2, top: 2 }); } catch {}
        }
      }
    },

    openDrawer() {
      if (!this.drawerEl) this.renderDrawer();
      this.drawerEl.classList.add('open');
      this.isOpen = true;
      this.ensureCalculator(this.dimension).then(() => {
        setTimeout(() => { try { this.calc?.resize?.(); } catch {} }, 100);
      });
    },

    closeDrawer() {
      if (this.drawerEl) {
        this.drawerEl.classList.remove('open');
      }
      this.isOpen = false;
    },

    toggleDrawer() {
      if (this.isOpen) {
        this.closeDrawer();
      } else {
        this.openDrawer();
      }
    },

    async plot(formulas, options = {}) {
      const rawList = Array.isArray(formulas) ? formulas : [formulas];
      if (rawList.length === 0) return;

      let targetDim = options.dimension || (options.threeD ? '3d' : (options.twoD ? '2d' : 'auto'));
      if (targetDim === 'auto') {
        const has3D = rawList.some(f => {
          const str = typeof f === 'object' && f !== null ? (f.latex || f.expr || '') : String(f);
          return is3DFormula(str);
        });
        targetDim = has3D ? '3d' : '2d';
      }

      this.openDrawer();
      const calc = await this.ensureCalculator(targetDim);

      if (!options.append) {
        try { calc.setBlank(); } catch {}
        this.expressions = [];
      }

      const formatted = rawList.map((f, idx) => {
        if (typeof f === 'object' && f !== null) {
          return {
            id: f.id || (options.append ? `expr_live_${Date.now()}_${idx}` : `expr_${idx + 1}`),
            latex: autoFixContinuousLatex(f.latex || f.expr || ''),
            label: f.label,
            showLabel: !!f.label,
            color: f.color || options.color || undefined,
            lineWidth: f.lineWidth || (targetDim === '3d' ? undefined : 3.5),
            hidden: f.hidden !== undefined ? f.hidden : false
          };
        }
        let latex = String(f);
        let label = undefined;
        if (latex.includes('#')) {
          const parts = latex.split('#');
          latex = parts[0].trim();
          label = parts.slice(1).join('#').trim();
        }
        return {
          id: options.append ? `expr_live_${Date.now()}_${idx}` : `expr_${idx + 1}`,
          latex: autoFixContinuousLatex(latex),
          label: label,
          showLabel: !!label,
          color: options.color || undefined,
          lineWidth: targetDim === '3d' ? undefined : 3.5
        };
      });

      formatted.forEach(e => {
        try { calc.setExpression(e); } catch {}
      });

      this.expressions = options.append ? [...this.expressions, ...formatted] : formatted;

      if (options.bounds && calc.setMathBounds) {
        try { calc.setMathBounds(options.bounds); } catch {}
      }

      this.updateStatus(`已绘制 ${this.expressions.length} 条公式`);
      showToast('📈 Desmos 绘图', `已渲染 ${formatted.length} 条公式 (${targetDim === '3d' ? '3D 空间' : '2D 平面'})`);
      return { success: true, dimension: targetDim, expressions: this.expressions };
    },

    clear() {
      if (this.calc) {
        try { this.calc.setBlank(); } catch {}
      }
      this.expressions = [];
      this.updateStatus('画布已清空');
    },

    exportImage(options = {}) {
      if (!this.calc) {
        showToast('导出失败', '计算器实例未就绪', true);
        return;
      }

      const width = options.width || 1600;
      const height = options.height || 1000;
      const targetPixelRatio = options.targetPixelRatio || 2;
      const filename = `desmos_plot_${Date.now()}.png`;

      const download = (dataUri) => {
        if (!dataUri) {
          showToast('导出失败', '获取图片数据失败', true);
          return;
        }
        const a = document.createElement('a');
        a.download = filename;
        a.href = dataUri;
        document.body.appendChild(a);
        a.click();
        a.remove();
        showToast('💾 图像导出成功', filename);
      };

      try {
        if (this.dimension === '3d') {
          // 3D 走同步 screenshot
          if (typeof this.calc.screenshot === 'function') {
            const res = this.calc.screenshot({ width, height, targetPixelRatio });
            if (typeof res === 'string') {
              download(res);
            } else if (res && typeof res.then === 'function') {
              res.then(download);
            } else if (typeof this.calc.asyncScreenshot === 'function') {
              this.calc.asyncScreenshot({ width, height, targetPixelRatio }, download);
            }
          } else if (typeof this.calc.asyncScreenshot === 'function') {
            this.calc.asyncScreenshot({ width, height, targetPixelRatio }, download);
          }
        } else {
          // 2D 走 asyncScreenshot
          if (typeof this.calc.asyncScreenshot === 'function') {
            this.calc.asyncScreenshot({ width, height, targetPixelRatio }, download);
          } else if (typeof this.calc.screenshot === 'function') {
            const res = this.calc.screenshot({ width, height, targetPixelRatio });
            if (typeof res === 'string') download(res);
          }
        }
      } catch (err) {
        showToast('导出异常', err.message, true);
      }
    },

    handlePlotPayload(payload) {
      if (!payload) return;
      if (payload.action === 'clear') {
        this.clear();
        return;
      }
      this.plot(payload.expressions || [], {
        action: payload.action,
        dimension: payload.dimension,
        bounds: payload.bounds,
        append: payload.action === 'append'
      });
    },

    updateTheme(isDark) {
      if (this.calc && typeof this.calc.updateSettings === 'function') {
        try {
          this.calc.updateSettings({ invertedColors: isDark });
        } catch {}
      }
    }
  };
  window.__ANTI_DESMOS__ = AntiDesmos;

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
          <span style="font-size: 9.5px; opacity: 0.7; color: #f59e0b; font-weight: 700;">v2.9.0 VIP</span>
        </div>

        <button class="anti-fab-menu-item" data-action="plan-mode" title="按 Shift+Tab 或 Alt+P 快速切换">
          <div class="anti-fab-item-left">
            <span>🎯</span>
            <span>计划模式</span>
          </div>
          <span class="anti-fab-badge" id="anti-fab-plan-mode">标准</span>
        </button>

        <button class="anti-fab-menu-item" data-action="desmos" title="按 Alt+D 快速开关 Desmos 数学画板">
          <div class="anti-fab-item-left">
            <span>📈</span>
            <span>Desmos 画板</span>
          </div>
          <span class="anti-fab-badge is-active" id="anti-fab-desmos">Alt+D</span>
        </button>

        <button class="anti-fab-menu-item" data-action="theme" title="点击循环切换外观主题：反重力暖色 / 纯白明亮 / 沉浸暗黑">
          <div class="anti-fab-item-left">
            <span>🎨</span>
            <span>外观主题</span>
          </div>
          <span class="anti-fab-badge is-active" id="anti-fab-theme">反重力</span>
        </button>

        <button class="anti-fab-menu-item" data-action="trancy">
          <div class="anti-fab-item-left">
            <span>🌐</span>
            <span>划词翻译</span>
          </div>
          <span class="anti-fab-badge ${state.trancyTranslateEnabled ? 'is-active' : ''}" id="anti-fab-trancy">${trancyLabel}</span>
        </button>

        <button class="anti-fab-menu-item" data-action="vocab" title="点击立即与 Trancy 官方云端双向同步">
          <div class="anti-fab-item-left">
            <span>📚</span>
            <span>Trancy 云端生词本</span>
          </div>
          <span class="anti-fab-badge" id="anti-fab-vocab-count">${TrancyVocabulary.getAll().length} 词</span>
        </button>

        <div class="anti-fab-slider-box" id="anti-fab-width-slider-box">
          <div class="anti-fab-slider-header">
            <div class="anti-fab-slider-header-left">
              <span>📐</span>
              <span>对话区宽度</span>
              <span class="anti-fab-badge" id="anti-fab-width" style="display:none;">${state.widthMode}</span>
            </div>
            <span class="anti-fab-slider-value" id="anti-width-value-display">${state.chatWidth === '100%' ? '100% 全宽' : state.chatWidth}</span>
          </div>
          <input type="range" class="anti-fab-slider" id="anti-width-slider" min="680" max="1800" step="10" value="${(parseWidthValue(state.chatWidth)).num}" />
          <div class="anti-fab-presets">
            <button type="button" class="anti-fab-preset-btn ${state.widthMode === 'compact' ? 'is-active' : ''}" data-preset="compact">紧凑 760</button>
            <button type="button" class="anti-fab-preset-btn ${state.widthMode === 'standard' ? 'is-active' : ''}" data-preset="standard">标准 896</button>
            <button type="button" class="anti-fab-preset-btn ${state.widthMode === 'wide' ? 'is-active' : ''}" data-preset="wide">宽屏 1140</button>
            <button type="button" class="anti-fab-preset-btn ${state.widthMode === 'full' ? 'is-active' : ''}" data-preset="full">全宽 100%</button>
          </div>
        </div>

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
        ThemeManager.apply();
        const vocabBadge = document.getElementById('anti-fab-vocab-count');
        if (vocabBadge) vocabBadge.textContent = TrancyVocabulary.getAll().length + ' 词';
        const planBadge = document.getElementById('anti-fab-plan-mode');
        if (planBadge) updateFabPlanBadge();
        const curParsed = parseWidthValue(state.chatWidth);
        const wSlider = document.getElementById('anti-width-slider');
        if (wSlider) wSlider.value = curParsed.num;
        const wDisplay = document.getElementById('anti-width-value-display');
        if (wDisplay) wDisplay.textContent = curParsed.isFull ? '100% 全宽' : curParsed.cssVal;
        const pBtns = container.querySelectorAll('.anti-fab-preset-btn');
        pBtns.forEach(btn => {
          if (btn.dataset.preset === curParsed.key) btn.classList.add('is-active');
          else btn.classList.remove('is-active');
        });
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

    // 滑块拖拽状态锁与事件 (60fps 无级平滑与防关闭保护)
    let isResizingWidth = false;
    const widthSlider = container.querySelector('#anti-width-slider');
    const presetBtns = container.querySelectorAll('.anti-fab-preset-btn');

    if (widthSlider) {
      const onSliderStart = () => {
        isResizingWidth = true;
        document.documentElement.classList.add('anti-width-resizing');
      };

      const onSliderInput = (e) => {
        const val = parseInt(e.target.value, 10);
        applyChatWidth(`${val}px`, false);
      };

      const onSliderEnd = () => {
        if (!isResizingWidth) return;
        document.documentElement.classList.remove('anti-width-resizing');
        setTimeout(() => {
          isResizingWidth = false;
        }, 80);
      };

      widthSlider.addEventListener('pointerdown', onSliderStart);
      widthSlider.addEventListener('input', onSliderInput);
      widthSlider.addEventListener('pointerup', onSliderEnd);
      widthSlider.addEventListener('change', () => {
        showToast('📐 页面宽度已调整', state.chatWidth);
      });

      window.addEventListener('pointerup', onSliderEnd);
      cleanups.push(() => window.removeEventListener('pointerup', onSliderEnd));
    }

    presetBtns.forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const pKey = btn.dataset.preset;
        applyChatWidth(pKey, true);
      });
    });

    menu.addEventListener('click', (e) => {
      const btn = e.target.closest('.anti-fab-menu-item');
      if (!btn) return;
      e.stopPropagation();

      const action = btn.dataset.action;
      if (action === 'plan-mode') {
        togglePlanMode();
      } else if (action === 'theme') {
        ThemeManager.cycle();
      } else if (action === 'trancy') {
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

      } else if (action === 'desmos') {
        if (window.__ANTI_DESMOS__) {
          window.__ANTI_DESMOS__.toggleDrawer();
        }
        toggleMenu(false);
      } else if (action === 'vocab') {
        const count = TrancyVocabulary.getAll().length;
        showToast('📚 Trancy 生词本', `正在与官方云端双向同步... 当前本地共 ${count} 词`);
        TrancyCloud.syncFromCloud().then(ok => {
          const newCount = TrancyVocabulary.getAll().length;
          const badge = document.getElementById('anti-fab-vocab-count');
          if (badge) badge.textContent = `${newCount} 词`;
          if (ok) {
            showToast('✅ 同步完成', `Trancy 云端生词已同步，当前共 ${newCount} 词`);
          } else {
            showToast('ℹ️ 本地生词本', `当前共 ${newCount} 个词条 (离线模式已保障)`);
          }
        });
      } else if (action === 'chat-width') {
        cycleChatWidth();
      } else if (action === 'send-mode') {
        state.sendMode = state.sendMode === 'ctrl-enter' ? 'enter' : 'ctrl-enter';
        safeStorage.setItem('anti_enhance_send_mode', state.sendMode);
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
      if (isResizingWidth) return;
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
  ThemeManager.init();
  AntiDesmos.init();
  initFormulaCopy();
  initTrancySelection();
  initKeyboardShortcuts();
  initFloatingBall();

  // 预热：延迟 1.2 秒静默拉取 Trancy 云端个人资料与生词本
  setTimeout(() => {
    TrancyCloud.fetchProfile().then(() => {
      TrancyCloud.syncFromCloud().then(() => {
        const badge = document.getElementById('anti-fab-vocab-count');
        if (badge) badge.textContent = `${TrancyVocabulary.getAll().length} 词`;
      });
    });
  }, 1200);
})();

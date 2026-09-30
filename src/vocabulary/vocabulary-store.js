const fs = require('fs');
const path = require('path');
const os = require('os');

const VOCAB_DIR = path.join(os.homedir(), '.antigravity');
const VOCAB_FILE = path.join(VOCAB_DIR, 'trancy_vocab.json');

function ensureFile() {
  if (!fs.existsSync(VOCAB_DIR)) {
    fs.mkdirSync(VOCAB_DIR, { recursive: true });
  }
  if (!fs.existsSync(VOCAB_FILE)) {
    fs.writeFileSync(VOCAB_FILE, JSON.stringify([], null, 2), 'utf-8');
  }
}

function getAll() {
  ensureFile();
  try {
    const raw = fs.readFileSync(VOCAB_FILE, 'utf-8');
    return JSON.parse(raw);
  } catch (err) {
    return [];
  }
}

function saveAll(list) {
  ensureFile();
  fs.writeFileSync(VOCAB_FILE, JSON.stringify(list, null, 2), 'utf-8');
}

function addWord(item) {
  if (!item || !item.word) return false;
  const list = getAll();
  const normalized = item.word.trim().toLowerCase();
  const existingIdx = list.findIndex(x => x.word && x.word.trim().toLowerCase() === normalized);
  const now = new Date().toISOString();
  
  const entry = {
    id: 'vocab_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
    word: item.word.trim(),
    phonetic: item.phonetic || '',
    translation: item.translation || '',
    explanation: item.explanation || '',
    examples: Array.isArray(item.examples) ? item.examples : [],
    context: item.context || '',
    source: item.source || 'Antigravity',
    createdAt: now,
    updatedAt: now,
    tags: item.tags || ['Antigravity', 'Trancy']
  };

  if (existingIdx >= 0) {
    list[existingIdx] = Object.assign({}, list[existingIdx], entry, { createdAt: list[existingIdx].createdAt, id: list[existingIdx].id });
  } else {
    list.unshift(entry);
  }
  saveAll(list);
  return entry;
}

function removeWord(wordOrId) {
  const list = getAll();
  const filtered = list.filter(x => x.id !== wordOrId && (x.word ? x.word.trim().toLowerCase() !== wordOrId.trim().toLowerCase() : true));
  if (filtered.length !== list.length) {
    saveAll(filtered);
    return true;
  }
  return false;
}

function hasWord(word) {
  if (!word) return false;
  const list = getAll();
  const normalized = word.trim().toLowerCase();
  return list.some(x => x.word && x.word.trim().toLowerCase() === normalized);
}

function exportMarkdown() {
  const list = getAll();
  let md = '# 📚 Antigravity 沉浸式生词本 (Trancy Vocabulary)\n\n';
  md += '> 导出时间: ' + new Date().toLocaleString() + ' | 共 ' + list.length + ' 个生词\n\n';
  md += '| 序号 | 单词/短语 | 音标 | 中文释义 | 语境例句 | 收藏时间 |\n';
  md += '|:---:|---|---|---|---|---|\n';
  list.forEach((item, idx) => {
    const ex = item.examples && item.examples[0] ? (item.examples[0].en + ' (' + item.examples[0].zh + ')') : (item.context || '-');
    const cleanEx = (ex || '').replace(/\|/g, '\\|').replace(/\n/g, ' ');
    const cleanTrans = (item.translation || '').replace(/\|/g, '\\|').replace(/\n/g, ' ');
    md += '| ' + (idx + 1) + ' | **' + item.word + '** | `' + (item.phonetic || '-') + '` | ' + cleanTrans + ' | ' + cleanEx + ' | ' + new Date(item.createdAt).toLocaleDateString() + ' |\n';
  });
  return md;
}

function exportCSV() {
  const list = getAll();
  let csv = 'Word,Phonetic,Translation,Explanation,Example,Context,CreatedAt\n';
  list.forEach(item => {
    const row = [
      item.word || '',
      item.phonetic || '',
      item.translation || '',
      item.explanation || '',
      item.examples && item.examples[0] ? item.examples[0].en : '',
      item.context || '',
      item.createdAt || ''
    ].map(val => '"' + String(val).replace(/"/g, '""') + '"');
    csv += row.join(',') + '\n';
  });
  return csv;
}

module.exports = {
  VOCAB_FILE,
  getAll,
  saveAll,
  addWord,
  removeWord,
  hasWord,
  exportMarkdown,
  exportCSV
};

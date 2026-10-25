const KEY = 'daily-mind-summaries-v1';
const levels = ['urgent', 'support', 'observe', 'quiet'];
const allowedNames = ['情绪','兴趣与动力','焦虑与恐慌','睡眠','精力与冲动','注意与思维','反复想法与行为','创伤相关体验','感知与现实判断','安全状况'];
const scoreIds = ['mood', 'interest', 'anxiety', 'sleep', 'activation', 'cognition', 'compulsion', 'trauma', 'perception'];
function validScores(value) {
  return Array.isArray(value) && value.length <= 9 && new Set(value.map(d => d?.id)).size === value.length && value.every(d => d && scoreIds.includes(d.id) && (d.score === null || Number.isInteger(d.score) && d.score >= 0 && d.score <= 3));
}
export function read(storage) {
  const raw = storage.getItem(KEY);
  if (!raw) return [];
  let parsed;
  try { parsed = JSON.parse(raw); } catch { throw new Error('本机记录无法读取。请先导出或清理损坏记录，不会自动覆盖。'); }
  if (!Array.isArray(parsed) || parsed.some(r => !r || typeof r.id !== 'string' || !Number.isFinite(r.timestamp) || !levels.includes(r.level) || !Array.isArray(r.domains) || r.domains.some(n => !allowedNames.includes(n)) || r.scores !== undefined && !validScores(r.scores))) throw new Error('本机记录格式异常，不会自动覆盖。');
  return parsed.slice(0, 90);
}
export function save(storage, result, id) {
  const records = read(storage);
  const record = { id, timestamp: result.timestamp, level: result.level, complete: result.complete, domains: result.flags.map(f => f.name) };
  if (Array.isArray(result.scores)) {
    record.scoreVersion = result.scoreVersion || 1;
    record.scores = result.scores.map(({ id, score }) => ({ id, score }));
    if (!validScores(record.scores)) throw new Error('Invalid scores');
  }
  storage.setItem(KEY, JSON.stringify([record, ...records.filter(r => r.id !== id)].slice(0, 90)));
}
export function remove(storage, id) { storage.setItem(KEY, JSON.stringify(read(storage).filter(r => r.id !== id))); }
export function clear(storage) { storage.removeItem(KEY); }

const JOURNAL_KEY = 'daily-mind-journal-v1';
export const eventTypes = ['组会', '实验', '工作', '人际', '休息', '积极小事', '无特定事件', '工作 / 学业', '人际 / 家庭', '健康 / 身体', '睡眠 / 作息', '其他事件'];
export const emotionTypes = ['未选择', '开心', '平静', '难过', '焦虑', '愤怒', '混合感受'];
function validJournal(r) {
  return r && typeof r.id === 'string' && Number.isFinite(r.timestamp) &&
    Number.isInteger(r.mood) && r.mood >= -3 && r.mood <= 3 &&
    Number.isInteger(r.excitement) && r.excitement >= 0 && r.excitement <= 3 &&
    (r.sleep === null || Number.isFinite(r.sleep) && r.sleep >= 0 && r.sleep <= 24) &&
    eventTypes.includes(r.eventType) && emotionTypes.includes(r.emotion) &&
    Number.isInteger(r.eventImpact) && r.eventImpact >= 0 && r.eventImpact <= 3 &&
    (r.eventTag === undefined || typeof r.eventTag === 'string' && r.eventTag.length <= 30) && typeof r.note === 'string' && r.note.length <= 200;
}
export function readJournal(storage) {
  const raw = storage.getItem(JOURNAL_KEY);
  if (!raw) return [];
  let parsed;
  try { parsed = JSON.parse(raw); } catch { throw new Error('心情日志损坏，不会自动覆盖。'); }
  if (!Array.isArray(parsed) || parsed.some(r => !validJournal(r))) throw new Error('心情日志格式异常，不会自动覆盖。');
  return parsed.sort((a, b) => b.timestamp - a.timestamp).slice(0, 90);
}
export function saveJournal(storage, entry) {
  if (!validJournal(entry)) throw new Error('请检查心情、兴奋程度、睡眠与事件记录的取值。');
  const current = readJournal(storage);
  const sorted = [entry, ...current.filter(r => r.id !== entry.id)].sort((a, b) => b.timestamp - a.timestamp).slice(0, 90);
  storage.setItem(JOURNAL_KEY, JSON.stringify(sorted));
}
export function removeJournal(storage, id) { storage.setItem(JOURNAL_KEY, JSON.stringify(readJournal(storage).filter(r => r.id !== id))); }
export function clearJournal(storage) { storage.removeItem(JOURNAL_KEY); }

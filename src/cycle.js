import { dayKey } from './trends.js?v=support25';
const CYCLE_KEY = 'her-space-periods-v1';
export function validDay(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const d = new Date(value + 'T12:00:00Z');
  return Number.isFinite(d.getTime()) && d.toISOString().slice(0, 10) === value;
}
export function daysBetween(a, b) { return Math.round((Date.parse(b + 'T12:00:00Z') - Date.parse(a + 'T12:00:00Z')) / 86400000); }
export function readPeriods(storage) {
  const raw = storage.getItem(CYCLE_KEY);
  if (!raw) return [];
  let rows;
  try { rows = JSON.parse(raw); } catch { throw new Error('经期记录损坏，不会自动覆盖。'); }
  if (!Array.isArray(rows) || rows.some(r => !r || !validDay(r.start) || r.end !== null && (!validDay(r.end) || r.end < r.start) || typeof r.note !== 'string' || r.note.length > 100) || new Set(rows.map(r => r.start)).size !== rows.length) throw new Error('经期记录格式异常，不会自动覆盖。');
  return rows.sort((a, b) => a.start.localeCompare(b.start)).slice(-48);
}
export function savePeriod(storage, entry, now = Date.now()) {
  if (!validDay(entry.start) || entry.start > dayKey(now) || entry.end !== null && (!validDay(entry.end) || entry.end < entry.start || entry.end > dayKey(now)) || typeof entry.note !== 'string' || entry.note.length > 100) throw new Error('请检查开始与结束日期，不能记录未来经期。');
  const current = readPeriods(storage);
  if (entry.originalStart && !current.some(r => r.start === entry.originalStart)) throw new Error('原记录已变化，请重新打开记录。');
  if (entry.originalStart && entry.originalStart !== entry.start && current.some(r => r.start === entry.start)) throw new Error('新开始日期已有记录，请修改原条目而不要合并两条经期。');
  const rows = current.filter(r => r.start !== entry.start && r.start !== entry.originalStart);
  if (rows.some(r => (entry.end || entry.start) >= r.start && entry.start <= (r.end || r.start))) throw new Error('经期日期与另一条记录重叠，请先修改或删除旧记录。');
  rows.push({ start: entry.start, end: entry.end, note: entry.note });
  storage.setItem(CYCLE_KEY, JSON.stringify(rows.sort((a, b) => a.start.localeCompare(b.start)).slice(-48)));
}
export function removePeriod(storage, start) { storage.setItem(CYCLE_KEY, JSON.stringify(readPeriods(storage).filter(r => r.start !== start))); }
export function clearPeriods(storage) { storage.removeItem(CYCLE_KEY); storage.removeItem('her-space-cycle-context-v1'); }

export function estimatePeriod(periods) {
  if (periods.length < 3) return null;
  const recent = periods.slice(-7);
  const intervals = recent.slice(1).map((p,i) => daysBetween(recent[i].start,p.start));
  if (intervals.some(n => n < 21 || n > 45) || Math.max(...intervals)-Math.min(...intervals) > 9) return null;
  const average = Math.round(intervals.reduce((a,b) => a+b,0)/intervals.length);
  const d = new Date(recent.at(-1).start+'T12:00:00Z'); d.setUTCDate(d.getUTCDate()+average);
  return { start: d.toISOString().slice(0,10), average, count: intervals.length };
}

import { dayKey } from './trends.js?v=397ffaa8c08a4e2e';
const CYCLE_KEY = 'her-space-periods-v1';
const CYCLE_CONTEXT_KEY = 'her-space-cycle-context-v1';
export const cycleContexts = ['不确定 / 暂不适用示意', '自然周期较规律', '周期不规则', '使用激素避孕或激素治疗', '孕期 / 产后 / 哺乳期', '围绝经期 / 已绝经'];
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
export function clearPeriods(storage) { storage.removeItem(CYCLE_KEY); storage.removeItem(CYCLE_CONTEXT_KEY); }
export function readCycleContext(storage) {
  const raw = storage.getItem(CYCLE_CONTEXT_KEY);
  if (raw === null) return cycleContexts[0];
  if (!cycleContexts.includes(raw)) throw new Error('周期背景记录异常，不会自动覆盖。');
  return raw;
}
export function saveCycleContext(storage, value) {
  if (!cycleContexts.includes(value)) throw new Error('未知周期背景');
  storage.setItem(CYCLE_CONTEXT_KEY, value);
}
// Schematic shapes, not a fitted biological model; no units or concentrations.
// Only align within a completed, observed start-to-start interval, never predict ovulation.
export function buildCycleOverlay(periods, trend, context) {
  const eligible = context === '自然周期较规律';
  return trend.map(d => {
    const bleeding = periods.some(p => d.key >= p.start && d.key <= (p.end || p.start));
    const i = periods.findIndex((p, n) => n + 1 < periods.length && d.key >= p.start && d.key < periods[n + 1].start);
    const base = { ...d, bleeding, estrogen: null, progesterone: null, phase: bleeding ? '已记录出血' : '阶段不确定', cycleDay: null };
    if (!eligible || i < 0) return base;
    const length = daysBetween(periods[i].start, periods[i + 1].start);
    if (length < 21 || length > 35) return base;
    const day = daysBetween(periods[i].start, d.key);
    const ov = length - 14; // Teaching approximation, not measured ovulation.
    const gaussian = (x, center, spread) => Math.exp(-0.5 * ((x - center) / spread) ** 2);
    const estrogen = 0.12 + 0.78 * gaussian(day, ov - 1, 2.3) + 0.38 * gaussian(day, ov + 7, 3);
    const progesterone = day < ov ? 0.05 : 0.05 + 0.83 * Math.sin(Math.PI * (day - ov) / 14) ** 2;
    return { ...base, estrogen: Math.min(1, estrogen), progesterone: Math.min(1, progesterone), cycleDay: day + 1,
      phase: bleeding ? '已记录出血' : day < ov - 2 ? '卵泡阶段示意' : day <= ov + 1 ? '排卵附近示意（未确认）' : '黄体阶段示意' };
  });
}

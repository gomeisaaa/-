export function dayKey(timestamp) {
  const d = new Date(timestamp);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
export function buildTrend(entries, days = 7, now = Date.now()) {
  if (![7, 14, 30].includes(days)) throw new Error('Unsupported trend range');
  const end = new Date(now);
  const grouped = new Map();
  for (const entry of entries) {
    const key = dayKey(entry.timestamp);
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key).push(entry);
  }
  return Array.from({ length: days }, (_, index) => {
    const date = new Date(end.getFullYear(), end.getMonth(), end.getDate() - days + 1 + index);
    const key = dayKey(date.getTime());
    const items = (grouped.get(key) || []).sort((a, b) => a.timestamp - b.timestamp);
    const last = items.at(-1);
    return { key, label: `${date.getMonth() + 1}/${date.getDate()}`, count: items.length,
      mood: last ? last.mood : null, excitement: last ? Math.max(...items.map(r => r.excitement)) : null,
      events: items.filter(r => r.eventType !== '无特定事件').map(r => ({ type: r.eventType, emotion: r.emotion, impact: r.eventImpact })) };
  });
}
// Split on missing days: missing data must never appear as zero or a continuous trend.
export function chartSegments(values) {
  const segments = []; let current = [];
  values.forEach((value, index) => {
    if (value === null) { if (current.length) segments.push(current); current = []; }
    else current.push({ index, value });
  });
  if (current.length) segments.push(current);
  return segments;
}

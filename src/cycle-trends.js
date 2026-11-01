import { dayKey } from './trends.js?v=cycle-axis1';
import { daysBetween, estimatePeriod } from './cycle.js?v=cycle-axis1';

export function cycleSeries(entries, periods, now = Date.now()) {
  const starts = periods.slice().sort((a, b) => a.start.localeCompare(b.start));
  return starts.map((p, i) => {
    const nextStart = starts[i + 1]?.start || null;
    const end = nextStart || dayKey(now);
    const length = daysBetween(p.start, end) + (nextStart ? 0 : 1);
    if (length < 1) return null;
    const grouped = new Map();
    for (const e of entries) {
      const key = dayKey(e.timestamp);
      if (key >= p.start && (nextStart ? key < end : key <= end)) {
        const prior = grouped.get(key);
        if (!prior || prior.timestamp <= e.timestamp) grouped.set(key, e);
      }
    }
    return {
      start: p.start, nextStart, bleedingEnd: p.end || null, length,
      points: [...grouped].map(([date, e]) => ({ date, day: daysBetween(p.start, date) + 1, mood: e.mood })).sort((a, b) => a.day - b.day)
    };
  }).filter(Boolean);
}

// Calendar-only illustration; never a measurement of ovulation, hormones or fertile days.
export function cyclePhaseLayout(series, periods, unknown = false) {
  const regular = estimatePeriod(periods);
  const referenceLength = series.nextStart ? series.length : regular?.average;
  const overdue = !series.nextStart && regular && series.length > regular.average + 3;
  const canEstimate = !!regular && !unknown && !overdue && referenceLength >= 21 && referenceLength <= 45;
  const horizon = canEstimate ? Math.max(series.length, referenceLength) : series.length;
  const ovulationDay = canEstimate ? referenceLength - 14 : null;
  const phases = canEstimate ? [
    { id: 'follicular', name: '卵泡期', from: 1, to: ovulationDay - 3 },
    { id: 'ovulatory', name: '排卵附近', from: ovulationDay - 2, to: ovulationDay + 2 },
    { id: 'luteal', name: '黄体期', from: ovulationDay + 3, to: referenceLength }
  ] : [];
  const bleedingTo = series.bleedingEnd ? Math.min(series.length, daysBetween(series.start, series.bleedingEnd) + 1) : 1;
  return {
    horizon, phases, referenceLength, ovulationDay, canEstimate,
    bleeding: { from: 1, to: bleedingTo, endKnown: !!series.bleedingEnd },
    reason: unknown ? '已选择阶段未知 / 不适用，不划分估计阶段。' : overdue ? '本次已超过历史参考长度，暂不划分阶段，请按实际情况补记。' : !regular ? '至少需要3次较规律的实际开始日期，阶段暂无法可靠估计。' : !canEstimate ? '本次周期长度超出参考范围，不划分阶段。' : '',
    ongoing: !series.nextStart, observedDays: series.length
  };
}

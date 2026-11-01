// Pure scoring; item text is intentionally NOT supplied until the Chinese source is verified.
// These thresholds describe symptom screening, never a clinical diagnosis or suicide risk level.
export const PHQ_SOURCE_STATUS = 'pending-verification';
export function scorePHQ(answers) {
  if (!Array.isArray(answers) || answers.length !== 9 || !Array.from({length:9},(_,i)=>answers[i]).every(v => Number.isInteger(v) && v >= 0 && v <= 3)) throw new Error('九题均须回答 0–3，缺题时不计算总分。');
  const total = answers.reduce((a,b) => a+b,0);
  const bands = ['极轻微或未报告明显抑郁症状','轻度','中度','中重度','重度'];
  const band = total < 5 ? 0 : total < 10 ? 1 : total < 15 ? 2 : total < 20 ? 3 : 4;
  return { total, label: bands[band], item9NeedsFollowup: answers[8] > 0,
    // Item 9 is independent of total and is not a full risk assessment.
    frequentItems: answers.flatMap((v,i) => v >= 2 ? [i+1] : []) };
}
export function safetyMessage(item9, immediateDanger = false) {
  if (!Number.isInteger(item9) || item9 < 0 || item9 > 3) throw new Error('第9题回答无效。');
  if (immediateDanger) return { priority: 'immediate-help', message: '如果已发生危险、可能立即伤害自己或无法保持安全，请立即联系当地紧急服务，并请可信任的人陪伴。本站没有实时监测、主动报警或人工救援能力。' };
  if (item9 > 0) return { priority: 'professional-followup', message: '你报告了死亡或自伤相关想法，请及时联系专业人员进一步评估，也可以请可信任的人陪伴。第9题不是完整的自杀风险评估，不能据此判定风险等级。' };
  return { priority: 'ordinary-support', message: '本次未报告相关想法，不代表排除风险；需要时随时使用即时帮助。' };
}
export function nextSuggestedDate(timestamp) {
  if (!Number.isFinite(timestamp)) throw new Error('测评日期无效。');
  const d = new Date(timestamp); d.setDate(d.getDate()+14); return d.getTime();
}
export function frequencyStatus(rows, now = Date.now()) {
  if (!rows.length) return { due: true, next: null, message: '可以按需要开始一次自查。' };
  const next = nextSuggestedDate(Math.max(...rows.map(r => r.timestamp)));
  return { due: now >= next, next, message: now >= next ? '距离上次已满14天，可按需要再做一次。' : '距离上次完整自查尚不足14天。结果可能反映重叠时段；如确有需要仍可自查，求助入口始终可用。' };
}

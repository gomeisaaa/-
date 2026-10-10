import { domains, gates, followups, careGuides, sharedQuestions } from './questions.js?v=b927c75080abe457';
export function emergency(a) {
  return a.safety === 3 || a.safety_intent === 2 || a.safety_safe === 2 || a.perception_pattern === 3 || a.activation_risk === 3;
}
export function queue(a) {
  const remainingGates = gates().filter(q => !Number.isInteger(a[q.id]));
  if (a.safety > 0) {
    const pending = followups('safety').filter(q => !Number.isInteger(a[q.id]));
    if (pending.length) return pending;
  }
  if (remainingGates.length) return remainingGates;
  return domains.filter(d => d.id !== 'safety' && a[d.id] > 0)
    .flatMap(d => followups(d.id, a)).concat(domains.some(d => d.id !== 'safety' && a[d.id] > 0) ? sharedQuestions : []).filter(q => !Number.isInteger(a[q.id]));
}
export function next(a) {
  if (emergency(a)) return { type: 'emergency' };
  const remaining = queue(a);
  return remaining.length ? { type: 'question', question: remaining[0] } : { type: 'complete' };
}
export function submit(a, id, value) {
  const state = next(a);
  if (state.type !== 'question' || state.question.id !== id || !state.question.options.some(o => o.value === value)) throw new Error('Invalid or out-of-order answer');
  return { ...a, [id]: value };
}
export function progress(a) {
  const done = gates().filter(q => Number.isInteger(a[q.id])).length;
  const details = domains.filter(d => d.id !== 'safety' && a[d.id] > 0).flatMap(d => followups(d.id, a));
  if (domains.some(d => d.id !== 'safety' && a[d.id] > 0)) details.push(...sharedQuestions);
  if (a.safety > 0) details.unshift(...followups('safety'));
  const detailDone = details.filter(q => Number.isInteger(a[q.id])).length;
  return { done, detailDone, detailTotal: details.length, percent: Math.round(((done + detailDone) / (10 + details.length)) * 100) };
}
export function scoreDimensions(a) {
  const labels = ['未报告明显困扰', '轻微困扰', '明显困扰', '强烈困扰'];
  return domains.filter(d => d.id !== 'safety').map(d => {
    const answered = Number.isInteger(a[d.id]);
    const detailComplete = answered && (a[d.id] === 0 || followups(d.id).every(q => Number.isInteger(a[q.id])));
    // Ordinal descriptive score, no duration points and no cross-domain total.
    const score = detailComplete ? Math.max(a[d.id], a[d.id + '_pattern'] || 0, d.id === 'activation' ? a.activation_risk || 0 : d.id === 'anxiety' ? a.anxiety_panic || 0 : 0) : null;
    const detailSummary = detailComplete && a[d.id] > 0 ? followups(d.id).filter(q => !q.id.endsWith('_duration')).map(q => q.options.find(o => o.value === a[q.id])?.label).filter(Boolean).join('；') : '';
    const guide = careGuides[d.id];
    const reason = !answered ? '本维度尚未回答，不能解释。' : !detailComplete ? '已报告状态变化，但追问因安全分流未完成，暂不评分。' : a[d.id] === 0 ? '主问题未报告相关变化，未进入详细追问；不代表已排除问题。' : `你报告的${guide.focus}${['', '较轻微', '较明显', '较强烈'][score]}。补充回答：${detailSummary}。维度分数来自今日表现和补充信息中的最高等级，不是量表分。${d.id === 'sleep' ? '睡眠类型不计分。' : ''}`;
    return { id: d.id, name: d.name, score, label: score === null ? '尚未完成' : labels[score], reason,
      basis: detailComplete ? { today: a[d.id], pattern: a[d.id] > 0 ? Math.max(a[d.id + '_pattern'] || 0, d.id === 'anxiety' ? a.anxiety_panic || 0 : d.id === 'activation' ? a.activation_risk || 0 : 0) : null, impact: d.id === 'activation' && a[d.id] > 0 ? a.activation_risk : null } : null };
  });
}
export function buildResult(a, now = Date.now()) {
  const state = next(a);
  if (state.type === 'question') throw new Error('Assessment is incomplete');
  const flags = domains.filter(d => a[d.id] > 0).map(d => ({ id: d.id, name: d.name, impact: null, persistent: d.id === 'activation' && a.activation_duration >= 2 }));
  const scores = scoreDimensions(a);
  const professional = a.context_impact >= 2 || a.context_duration >= 2 && scores.some(d => d.score >= 2) || a.safety > 0 || scores.some(d => d.score === 3 || d.basis?.impact >= 2) ||
    a.perception >= 2 || (a.activation >= 2 && a.activation_pattern >= 2) ||
    flags.some(f => f.persistent && scores.find(d => d.id === f.id)?.score >= 2);
  const level = emergency(a) ? 'urgent' : professional ? 'support' : flags.length ? 'observe' : 'quiet';
  const high = scores.filter(d => d.score !== null && d.score >= 2).sort((x, y) => y.score - x.score);
  const low = scores.filter(d => d.score !== null && d.score <= 1);
  const raised = scores.filter(d => d.score !== null && d.score > 0).sort((x, y) => y.score - x.score);
  const focus = (high.length ? high : raised).slice(0, 2).map(d => d.name).join('、');
  const content = {
    urgent: { title: '请先获得即时帮助', description: '你的回答提示此刻可能存在安全风险。常规自查已停止，请优先联系身边的人与紧急服务。', actions: ['若已受伤、服用过量药物，或可能马上行动，请立即联系当地急救或前往急诊。', '请可信任的人到你身边陪伴；在安全可行时远离可能用于伤害的物品。', '如他人的行为让你不安全，先离开危险环境并求助。'] },
    support: { title: a.safety > 0 ? '先关注安全，再看各维度的变化' : `${focus || '部分维度'}的困扰较突出`, description: '以下按维度汇报你描述的困扰程度、生活影响与改善思路。较低分数只说明此次自述较少，不能用来抵消其他维度或安全风险。', actions: ['先选择一个最困扰的维度，尝试对应的一项小调整，观察它是否适合你。', '记录睡眠、压力和日常活动的变化；明显影响生活或持续恶化时，应就医评估。'] },
    observe: { title: `${focus || '今天'}有一些状态变化`, description: '下方分数与解释呈现各维度的具体程度。先了解较突出的部分，再选择适合自己的运动、作息或放松方法。', actions: ['先选一项容易做到的小调整，不要求一次解决所有问题。', '留意是否持续、加重或影响生活，必要时就医，不必等待达到某个分数。'] },
    quiet: { title: '本次各维度困扰评分较低', description: '此次 9 个状态维度均为 0 分，安全题也未报告风险。这表示本次自述未报告相关变化，不代表已排除疾病。', actions: ['保持适合自己的睡眠节奏、日常活动与人际联系。', '身体允许时安排散步或温和运动；需要放松时可短暂关注自然呼吸，若不适就停止。', '需要时再来记录，不必每天打卡；实际困扰或生活影响比低分更值得关注。'] }
  }[level];
  const advice = level === 'urgent' ? [] : raised.map(d => ({ id: d.id, name: d.name, score: d.score, ...careGuides[d.id] }));
  const medicalNeeded = professional || emergency(a);
  const medical = medicalNeeded ? { title: '什么时候需要就医或讨论治疗？', description: a.safety > 0 ? '已报告不想活、自伤或伤害他人的想法，请尽快就医并让可信任的人陪伴；无法保持安全或可能马上行动时立即急救。' : '强烈困扰、明显影响生活、持续加重，以及异常感知或显著精力变化，应尽快就医评估。运动、冥想与作息调整不能代替必要的医疗处置。', medication: '医生可能根据诊断、病程、身体状况和用药史，讨论心理治疗、药物治疗或两者结合。单次自查分数不能判断是否需要药物，也不应据此自行开始、停用或调整药物。' } : null;
  const safety = { status: emergency(a) ? '需要即时帮助' : a.safety > 0 ? '已报告安全相关想法' : '本次未报告安全相关想法', note: '安全状况单独处理，不计入维度分数，也不会被低分抵消。' };
  return { scoreVersion: 2, context: { duration: a.context_duration ?? null, impact: a.context_impact ?? null }, level, flags, scores, high, low, advice, medical, safety, timestamp: now, complete: state.type === 'complete', ...content };
}

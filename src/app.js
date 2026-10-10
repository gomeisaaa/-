import { domains, gates, followups, sharedQuestions, scaleReferences } from './questions.js';
import { next, submit, progress, buildResult } from './assessment.js';
import * as records from './storage.js';
import { buildTrend, chartSegments } from './trends.js';
import { dailyTasks, toggleDailyTask, clearDailyTasks } from './selfcare.js';

import { readPeriods, savePeriod, removePeriod, clearPeriods, readCycleContext, saveCycleContext, cycleContexts, buildCycleOverlay } from './cycle.js';
import { evidence, evidenceAccessNote } from './evidence.js';

const main = document.querySelector('#main');
const dialog = document.querySelector('#help-dialog');
let session = null;
let result = null;
let resultId = null;
let saved = false;
let selected = null;
let lastRoute = 'home';
let historyCache = [];
let storageError = '';
let journalCache = [];
let journalError = '';
let trendRange = 7;
let showAllJournal = false;
const moodNames = ['非常低落', '偏低', '稍低', '中性', '稍好', '较好', '很好'];
const excitementNames = ['没有', '轻微', '明显', '强烈'];
let toastTimer;
const levelNames = { quiet: '本次未记录明显异常', observe: '继续观察与照顾', support: '部分维度需要重点关注', urgent: '优先即时帮助' };
const escape = text => String(text).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const date = timestamp => new Intl.DateTimeFormat('zh-CN', { month: 'long', day: 'numeric', weekday: 'long' }).format(timestamp);
const time = timestamp => new Intl.DateTimeFormat('zh-CN', { hour: '2-digit', minute: '2-digit', hour12: false }).format(timestamp);
function toast(message) {
  const el = document.querySelector('#toast');
  el.textContent = message; el.classList.add('visible');
  clearTimeout(toastTimer); toastTimer = setTimeout(() => el.classList.remove('visible'), 3500);
}
function loadHistory() {
  try { historyCache = records.read(localStorage); storageError = ''; }
  catch (e) { historyCache = []; storageError = '本机存储暂不可用或记录损坏。自查仍可使用，但暂不能保存。'; }
  try { journalCache = records.readJournal(localStorage); journalError = ''; }
  catch { journalCache = []; journalError = '心情日志暂不可用或已损坏，不会自动覆盖旧记录。'; }
  try { document.documentElement.dataset.hasPeriods = String(readPeriods(localStorage).length > 0); } catch { document.documentElement.dataset.hasPeriods = 'true'; }
  document.querySelector('#nav-count').textContent = historyCache.length + journalCache.length;
}
const leafArt = `<svg class="leaf-art" viewBox="0 0 320 290" fill="none" aria-hidden="true"><circle cx="163" cy="142" r="110" stroke="#b8ccaf" stroke-dasharray="3 8"/><circle cx="163" cy="142" r="83" fill="#d4e3c5"/><path d="M169 239C152 186 162 107 203 60" stroke="#54785a" stroke-width="3" stroke-linecap="round"/><path d="M177 180C113 189 97 151 102 121C154 112 180 143 177 180Z" fill="#8fab83"/><path d="M167 146C215 147 248 107 227 81C185 82 166 114 167 146Z" fill="#547c62"/><path d="M178 103C150 100 135 76 145 54C177 57 186 80 178 103Z" fill="#acc59b"/><path d="M178 179L113 130M170 144L218 93M180 100L149 61" stroke="#e7efde" stroke-width="2"/><circle cx="66" cy="93" r="7" fill="#f9fcf4"/><circle cx="253" cy="199" r="9" fill="#f9fcf4"/><path d="M66 189V201M60 195H72M253 49V65M245 57H261" stroke="#648060" stroke-width="2"/><ellipse cx="165" cy="244" rx="60" ry="8" fill="#b4caa6" opacity=".45"/></svg>`;

function smallThings() {
  let daily;
  try { daily = dailyTasks(localStorage); }
  catch { return '<section class="card warning"><h3>每日小事勾选暂不可读取</h3><p>旧记录不会自动覆盖。自查与心情日志仍可使用。</p><button class="inline-link" data-action="clear-tasks">清除小事勾选记录</button></section>'; }
  return `<section class="small-things-section"><div class="section-heading"><div><span class="eyebrow">FIVE LITTLE THINGS</span><h2>今天的 5 件小事</h2></div><span>${daily.done} / 5 已完成</span></div><p class="small muted">替代动作同样算完成。勾选仅存本机，少做一点也没关系。</p><div class="tiny-task-list">${daily.tasks.map(t => `<button class="tiny-task ${t.done ? 'done' : ''}" data-action="toggle-task" data-id="${t.id}" aria-pressed="${t.done}"><span class="task-check">${t.done ? '✓' : ''}</span><span class="task-copy"><strong>${t.title}</strong><small>${t.note}</small></span></button>`).join('')}</div>${daily.complete ? `<div class="task-reward"><span class="pill">今天为自己留了一点空间，已经很好。</span><blockquote>“${daily.quote.text}”</blockquote><p>— ${daily.quote.author} · ${daily.quote.source}</p>${daily.quote.original ? `<p class="quote-original">${daily.quote.original}</p>` : ''}</div>` : '<p class="task-footnote">全部完成后，送你一句来自文学作品的话。没有补做、连续打卡或扣分。</p>'}<button class="inline-link task-clear" data-action="clear-tasks">清除勾选记录</button></section>`;
}
function home() {
  const latest = historyCache[0];
  return `<section class="page-heading"><div><div class="eyebrow">DAILY CHECK-IN</div><h1>今天，给自己一点时间。</h1><p class="muted">不急着判断对错，先听听身体与情绪的声音。</p></div><div class="date-chip"><span class="status-dot"></span>${date(Date.now())}</div></section>
    <section class="hero"><div class="hero-copy"><span class="hero-label">每一次觉察，都是照顾自己的开始</span><h2>你今天，<br>感觉怎么样？</h2><p>用 10 个简单问题，了解此刻的状态。<br>如果有需要，我们会再多问一点。</p><button class="button primary" data-action="intro">开始今日自查 <span aria-hidden="true">↗</span></button><div class="hero-meta"><span>◷ 约 2–3 分钟</span><span>◇ 异常时追加追问</span></div></div>${leafArt}<span class="hero-caption">慢一点，也没关系。</span></section>
    <div class="module-links"><a href="#action">行动 · 今天的 5 件小事 →</a><a href="#history">记录 · 心情与经期 →</a><a href="#about">工具说明 · 题库与文献 →</a></div>
    <section class="quick-stats" aria-label="自查概览"><div><span class="stat-icon">☷</span><div><strong>10 个关注领域</strong><p>从情绪、睡眠到安全状况</p></div></div><div><span class="stat-icon">⤳</span><div><strong>按你的回答展开</strong><p>只追问需要进一步了解的部分</p></div></div><div><span class="stat-icon">▣</span><div><strong>由你决定是否保存</strong><p>无账号，不上传自查数据</p></div></div></section>
    <div class="section-heading"><h2>先了解，再开始</h2><span>让自查成为一种温柔的习惯</span></div>
    <section class="info-grid"><article class="card"><span class="card-kicker">01 / 自查方式</span><h3>关注今天，也看见变化</h3><p>主问题回顾过去 24 小时。出现变化时，再了解持续时间与生活影响。无需给自己贴标签。</p><div class="tag-row"><span>每日状态</span><span>条件追问</span><span>行动建议</span></div></article><article class="card"><span class="card-kicker">02 / 关于依据</span><h3>有参考，也有明确边界</h3><p>参照 DSM-5-TR / ICD-11 的分类思路，并核对经典量表的关注范围。原创改写与跳题不能继承原量表的信效度，自查不构成诊断。</p><a class="inline-link" href="#about">了解依据与使用须知 <span aria-hidden="true">→</span></a></article></section>
    <section class="recent-strip"><div class="recent-icon">◷</div><div><h3>${latest ? '上一次，你为自己留了一份记录' : '留一点空间，给未来的自己'}</h3><p>${latest ? `${date(latest.timestamp)} · ${levelNames[latest.level]}` : '完成后可选择保存摘要，慢慢看见自己的状态变化。'}</p></div><a href="#history" class="inline-link">查看记录 →</a></section>
    ${storageError ? `<p class="storage-warning" role="status">${storageError}</p>` : ''}`;
}
function intro() {
  return `<section class="compact-heading"><div class="eyebrow">BEFORE WE BEGIN</div><h1>先约定，如何照顾自己。</h1><p class="muted">没有标准答案，按你的真实感受回答就好。</p></section>
    <section class="intro-layout"><div class="card intro-card"><div class="intro-item"><span>01</span><div><h3>从今天的状态开始</h3><p>10 道主问题。安全题先问；报告变化后，每个相关领域追加不同的 1–3 题。通用病程和整体影响各问一次，全部分支最多 27 题。你可以随时退出。</p></div></div><div class="intro-item"><span>02</span><div><h3>不把一次回答当作诊断</h3><p>这是原创筛查草案，不是经过验证的量表。疾病判断还需要专业人员了解完整病程、背景和排除条件。</p></div></div><div class="intro-item"><span>03</span><div><h3>隐私由你掌握</h3><p>答案仅暂存于当前页面内存，刷新即清除。完成后只有你主动保存，摘要才会留在本机；共享设备可能让他人看到记录。</p></div></div><label class="consent"><input id="consent" type="checkbox"><span>我已满 18 岁，理解自查不能代替诊断，并同意开始。<a href="#about">查看完整说明</a></span></label><button id="start-button" class="button primary full" data-action="start" disabled>我准备好了，开始自查 <span aria-hidden="true">→</span></button><button class="button text-button full" data-action="home">暂时不做，返回首页</button></div><aside class="gentle-card"><span class="gentle-icon">♡</span><h3>不需要独自承受。</h3><p>如果你此刻不安全，或可能马上伤害自己或他人，请先寻求即时帮助，不要等待完成自查。</p><button class="inline-link" data-action="help">查看即时求助指引 →</button><div class="divider"></div><p class="small">这里没有实时监测或人工救援。突然严重的身体不适或混乱也应及时就医。</p></aside></section>`;
}
function check() {
  const state = next(session.answers);
  if (state.type !== 'question') return '';
  const q = state.question;
  const p = progress(session.answers);
  const safety = q.domain === 'safety';
  const detail = q.kind === 'detail';
  return `<section class="check-heading"><div><span class="eyebrow">${detail ? 'A CLOSER LOOK' : 'DAILY CHECK-IN'}</span><h1>${safety ? '先确认你的安全。' : detail ? '我们再多了解一点。' : '一步一步，听见自己。'}</h1></div><button class="inline-link muted" data-action="exit">退出自查 ×</button></section>
    <section class="assessment-layout"><div><div class="progress-label"><span>${detail ? `主问题已完成 ${p.done}/10 · 已完成追问 ${p.detailDone}/${p.detailTotal}` : `主问题 ${q.number} / 10`}</span><span>${q.name}</span></div><progress max="100" value="${p.percent}" aria-label="当前自查完成进度">${p.percent}%</progress><div class="card question-card ${safety ? 'safety-question' : ''}"><div class="question-label"><span class="pill">${detail ? '进一步了解' : '过去 24 小时'}</span><span class="small muted">${detail ? '只为了解你的情况' : '请选择最接近的一项'}</span></div><h2 id="question-title" tabindex="-1">${q.title}</h2>${q.hint ? `<p class="question-hint">${q.hint}</p>` : ''}
      <fieldset class="options" aria-labelledby="question-title"><legend class="sr-only">${q.title}</legend>${q.options.map(o => `<label class="option ${selected === o.value ? 'selected' : ''}"><input type="radio" name="answer" value="${o.value}" ${selected === o.value ? 'checked' : ''}><span class="radio-mark"></span><span class="option-copy"><strong>${o.label}</strong>${o.hint ? `<small>${o.hint}</small>` : ''}</span></label>`).join('')}</fieldset>
      ${safety ? '<div class="safety-note">若你已受伤或可能马上行动，请现在就联系紧急服务。<button class="inline-link" data-action="help">查看求助指引 →</button></div>' : ''}
      <div class="question-controls"><button class="button text-button" data-action="back" ${!session.steps.length ? 'disabled' : ''}>← 上一题</button><button id="next-button" class="button primary" data-action="next" ${selected === null ? 'disabled' : ''}>${p.done === 9 && !detail ? '继续' : '下一步'} <span aria-hidden="true">→</span></button></div></div><p class="under-question">每个人的体验都不同。如实回答就足够了。</p></div>
      <aside class="assessment-aside"><div class="aside-heading">这次，我们关注</div><div class="domain-list">${domains.map(d => `<div class="${q.domain === d.id ? 'current' : ''} ${Number.isInteger(session.answers[d.id]) ? 'done' : ''}"><span class="domain-icon">${d.icon}</span><span>${d.name}</span><span class="domain-tick">${Number.isInteger(session.answers[d.id]) ? '✓' : q.domain === d.id ? '·' : ''}</span></div>`).join('')}</div><div class="aside-note">自查不计算疾病总分。<br>结果会结合你的回答，给出下一步建议。</div></aside></section>`;
}
function resultView() {
  const urgent = result.level === 'urgent';
  const scored = result.scores.filter(d => d.score !== null);
  const safetyConcern = result.flags.some(f => f.id === 'safety');
  return `<section class="compact-heading"><span class="eyebrow">${urgent ? 'SAFETY FIRST' : 'YOUR DIMENSION REPORT'}</span><h1>${urgent ? '现在，先照顾你的安全。' : '看见每个维度，再找到下一步。'}</h1><p class="muted">${date(result.timestamp)} · ${time(result.timestamp)} · ${result.complete ? '自查已完成' : '常规自查因安全提示中止'}</p></section>
    <section class="result-layout"><div><article class="result-card level-${result.level}"><div class="result-symbol">${urgent ? '♡' : '✳'}</div><span class="pill">${urgent ? '即时安全提醒' : '本次维度报告'}</span><h2>${result.title}</h2><p>${result.description}</p>${urgent ? '<button class="button danger-button" data-action="help">查看即时求助指引 ↗</button>' : ''}</article>
      <article class="card score-report"><div class="section-heading"><h3>各维度困扰程度</h3><span>0–3 分 · 越高表示困扰越明显</span></div><p class="score-caveat">描述性自查分数，未经临床验证；不是 DSM / ICD 诊断分或疾病概率，各维度不相加。</p>
        <div class="score-summary"><span><strong>${result.high.length}</strong> 个维度为 2–3 分</span><span><strong>${result.low.length}</strong> 个维度为 0–1 分</span>${scored.length < 9 ? `<span>${9 - scored.length} 个尚未完成</span>` : ''}</div>
        ${result.high.length ? `<p class="dimension-overview">较高维度：${result.high.map(d => `${d.name} ${d.score} 分`).join('、')}。</p>` : ''}
        ${result.low.length ? `<p class="dimension-overview">较低维度：${result.low.map(d => `${d.name} ${d.score} 分`).join('、')}。低分不等于没有问题。</p>` : ''}
        <div class="dimension-grid">${result.scores.map(d => `<section class="dimension-card score-${d.score === null ? 'pending' : d.score}"><div class="dimension-heading"><h4>${d.name}</h4><span class="dimension-value">${d.score === null ? '未完成' : `${d.score}<small> / 3</small>`}</span></div><div class="score-scale" aria-hidden="true">${[1, 2, 3].map(n => `<span class="${d.score !== null && n <= d.score ? 'filled' : ''}"></span>`).join('')}</div><div class="dimension-label">${d.label}</div><p>${d.reason}</p>${d.basis && d.basis.today > 0 ? `<div class="score-basis">今日 ${d.basis.today} · 补充 ${d.basis.pattern}${d.basis.impact !== null ? ` · 冲动 ${d.basis.impact}` : ''}</div>` : ''}</section>`).join('')}</div>
        <details class="scoring-rule"><summary>分数如何计算？</summary><p>0＝未报告明显困扰，1＝轻微，2＝明显，3＝强烈。完成追问的维度取“今日表现与该维度补充信息”的最高等级；恐慌和激活的冲动后果纳入对应维度。睡眠类型、症状数量及持续天数不加分。整体生活影响单独报告，不加到每个维度。主问题为 0 时不追问，显示主问题的 0 分；追问未完成则不评分。安全题单独处理。这是产品的描述性规则，尚未经验证，不能代替临床评估。</p></details></article>
      ${result.context && result.context.impact !== null ? `<article class="card context-report"><h3>整体生活影响 · 单独报告</h3><p>${sharedQuestions[1].options[result.context.impact].label}；最困扰变化的病程：${sharedQuestions[0].options[result.context.duration].label}。不把整体影响归因于每个维度。</p></article>` : ''}
      <article class="card ${safetyConcern ? 'safety-report' : ''}"><h3>安全状况 · 独立确认</h3><p class="safety-status">${result.safety.status}</p><p>${result.safety.note}</p>${safetyConcern ? '<button class="inline-link" data-action="help">查看即时求助指引 →</button>' : ''}</article>
      <article class="card"><h3>${urgent ? '现在优先做这些事' : '可以从这几件事开始'}</h3><ol class="care-list">${result.actions.map(a => `<li>${a}</li>`).join('')}</ol></article>
      ${result.advice.length ? `<article class="card"><h3>按维度选择改善思路</h3><p class="small muted">选一个最需要照顾的部分开始；这些方法不是处方，也不保证改善。</p><div class="advice-list">${result.advice.map(a => `<section class="advice-item"><span class="pill">${a.name} · ${a.score} 分</span><h4>${a.title}</h4><ul>${a.ideas.map(idea => `<li>${idea}</li>`).join('')}</ul></section>`).join('')}</div></article>` : ''}
      ${result.medical ? `<article class="card medical-card"><span class="pill">严重或持续情况</span><h3>${result.medical.title}</h3><p>${result.medical.description}</p><h4>关于药物治疗</h4><p>${result.medical.medication}</p>${urgent ? '<button class="button danger-button" data-action="help">查看即时帮助 ↗</button>' : ''}</article>` : ''}
    </div><aside><div class="card save-card"><span class="save-icon">▣</span><h3>留一份记录给自己</h3><p>仅保存日期、维度分数与状态摘要，不保存具体答案。最多保留 90 条，可随时删除。</p><button class="button ${saved ? 'secondary' : 'primary'} full" data-action="save" ${saved ? 'disabled' : ''}>${saved ? '已保存在本机 ✓' : '保存本次摘要'}</button><a class="button text-button full" href="#history">查看状态记录 →</a><div class="divider"></div><p class="small muted">默认不保存，也不会上传。本站无法通过记录联系或救援你。</p></div><div class="result-footnote"><strong>分数描述困扰，不用于诊断</strong><p>高分不等于确诊，低分不排除问题。持续时间、生活影响与身体状况仍需结合了解；严重情况应就医评估。</p></div><button class="button secondary full" data-action="home">返回首页</button></aside></section>`;
}
function trendChart(trend, kind) {
  const mood = kind === 'mood';
  const min = mood ? -3 : 0, max = 3;
  const width = 600, left = 45, right = 575, top = 25, bottom = 174;
  const x = index => left + index * (right - left) / (trend.length - 1);
  const y = value => bottom - (value - min) / (max - min) * (bottom - top);
  const values = trend.map(d => d[kind]);
  const segments = chartSegments(values);
  const title = mood ? '心情变化' : '异常兴奋 / 易怒';
  const levels = mood ? [3, 0, -3] : [3, 2, 1, 0];
  const ticks = [0, Math.floor((trend.length - 1) / 2), trend.length - 1];
  return `<article class="trend-card ${mood ? 'mood-chart' : 'excitement-chart'}"><h3>${title}</h3><p>${mood ? '每天最后一条记录 · −3 非常低落到 +3 很好' : '每天最高记录 · 0 没有到 3 强烈'}</p><svg class="trend-svg" viewBox="0 0 ${width} 218" role="img" aria-label="最近 ${trend.length} 天${title}，${values.filter(v => v !== null).length} 天有记录。详细值见下方数据表。">
      ${levels.map(v => `<line x1="${left}" y1="${y(v)}" x2="${right}" y2="${y(v)}" class="chart-grid"/><text x="31" y="${y(v) + 4}" class="axis-label" text-anchor="end">${v > 0 && mood ? '+' : ''}${v}</text>`).join('')}
      ${segments.filter(segment => segment.length > 1).map(segment => `<polyline points="${segment.map(p => `${x(p.index)},${y(p.value)}`).join(' ')}" class="trend-line"/>`).join('')}
      ${trend.map((d, i) => d[kind] === null ? '' : `<circle cx="${x(i)}" cy="${y(d[kind])}" r="4" class="trend-point"><title>${d.key}：${d[kind]}；${d.count} 条记录</title></circle>${d.events.length ? `<path d="M ${x(i)} 183 l 4 4 l -4 4 l -4 -4 Z" class="event-marker"><title>${d.key} 有 ${d.events.length} 条相关事件记录</title></path>` : ''}`).join('')}
      ${ticks.map(i => `<text x="${x(i)}" y="207" text-anchor="middle" class="axis-label">${trend[i].label}</text>`).join('')}
      ${segments.length ? '' : `<text x="310" y="100" text-anchor="middle" class="chart-empty">这段时间还没有记录</text>`}
      </svg></article>`;
}
function journalCard(r) {
  return `<article class="journal-entry"><div class="row journal-entry-top"><strong>${date(r.timestamp)} · ${time(r.timestamp)}</strong><button class="icon-button" data-action="delete-journal" data-id="${escape(r.id)}" aria-label="删除 ${escape(date(r.timestamp))} ${escape(time(r.timestamp))} 的心情日志">×</button></div><div class="journal-values"><span>心情 <strong>${r.mood > 0 ? '+' : ''}${r.mood}</strong> · ${moodNames[r.mood + 3]}</span><span>异常兴奋 <strong>${r.excitement}</strong> · ${excitementNames[r.excitement]}</span><span>睡眠 ${r.sleep === null ? '未记录' : `${r.sleep} 小时`}</span></div>${r.eventType !== '无特定事件' ? `<div class="event-summary"><span class="event-dot">◆</span>${escape(r.eventType)} · ${escape(r.emotion)} · 波动 ${r.eventImpact}/3</div>` : r.emotion !== '未选择' ? `<div class="event-summary">主要感受：${escape(r.emotion)}</div>` : ''}${r.note ? `<p class="journal-note">${escape(r.note)}</p>` : ''}${r.excitement >= 2 ? '<p class="small journal-alert">若明显少睡却不困或冲动加重，应尽快就医；普通心情好不等于异常兴奋。</p>' : ''}</article>`;
}
function historyView() {
  const trend = buildTrend(journalCache, trendRange);
  const visibleJournal = showAllJournal ? journalCache : journalCache.slice(0, 7);
  return `<section class="page-heading"><div><span class="eyebrow">YOUR MOMENTS</span><h1>慢慢看见自己的变化。</h1><p class="muted">把心情、精力与发生的事，放在同一段时间里了解。</p></div><div class="history-actions"><button class="button primary" data-action="journal">＋ 记一笔心情</button>${historyCache.length || journalCache.length || storageError || journalError || document.documentElement.dataset.hasPeriods === 'true' ? '<button class="button outline-button small" data-action="clear">清空本机记录</button>' : ''}</div></section>
    <div class="privacy-strip">▣ 仅保存在当前浏览器 · 自查摘要与心情日志各保留最多 90 条 · 不自动上传或同步</div>
    <section class="card trend-panel"><div class="section-heading"><div><h2>最近的心情与精力</h2><p class="small muted">图表来自主动填写的心情日志，不从自查评分推算心情。</p></div><div class="range-switch" role="group" aria-label="趋势时间范围">${[7, 14, 30].map(n => `<button data-action="trend-range" data-days="${n}" class="${trendRange === n ? 'active' : ''}" aria-pressed="${trendRange === n}">${n} 天</button>`).join('')}</div></div><div class="trend-grid">${trendChart(trend, 'mood')}${trendChart(trend, 'excitement')}</div><p class="chart-footnote">◆ 表示当天有相关事件。没有记录的日期留空、不连线；单个点不足以说明趋势。高兴与异常兴奋分别记录，图表不能判断躁狂或其他疾病。</p><details class="trend-data"><summary>查看逐日数据与事件关联</summary><div class="table-scroll"><table><caption class="sr-only">最近 ${trendRange} 天的手动日志统计</caption><thead><tr><th>日期</th><th>心情（最后）</th><th>异常兴奋（最高）</th><th>相关事件</th></tr></thead><tbody>${trend.map(d => `<tr><td>${d.key}</td><td>${d.mood === null ? '未记录' : d.mood}</td><td>${d.excitement === null ? '未记录' : d.excitement}</td><td>${d.events.length ? d.events.map(e => `${escape(e.type)} / ${escape(e.emotion)} / 波动${e.impact}`).join('；') : '未记录事件'}</td></tr>`).join('')}</tbody></table></div></details></section>
    ${cyclePanel()}
    <div class="section-heading history-section-heading"><h2>心情与事件日志 <span class="count-pill">${journalCache.length}</span></h2><span>可补记，不必每天填写</span></div>
    ${journalError ? `<div class="card warning"><p>${journalError}</p></div>` : journalCache.length ? `<div class="journal-list">${visibleJournal.map(journalCard).join('')}</div>${journalCache.length > 7 ? `<button class="button text-button full" data-action="toggle-journal">${showAllJournal ? '收起较早的日志 ↑' : `查看全部 ${journalCache.length} 条日志 ↓`}</button>` : ''}` : `<div class="card journal-empty"><span>❧</span><div><h3>留下一笔，更容易看见变化。</h3><p>记录此刻心情、睡眠或一件影响你的事，不必先完成问卷。</p></div><button class="inline-link" data-action="journal">开始记录 →</button></div>`}
    <div class="section-heading history-section-heading"><h2>自查维度摘要 <span class="count-pill">${historyCache.length}</span></h2><a href="#intro" class="inline-link">做一次自查 →</a></div>
    ${storageError ? `<div class="card warning" role="alert"><h3>暂时无法读取本机摘要</h3><p>${storageError}</p></div>` : historyCache.length ? `<div class="history-list">${historyCache.map(r => `<article class="history-card"><div class="history-date"><strong>${date(r.timestamp)}</strong><span>${time(r.timestamp)} · ${r.complete ? '完整自查' : '安全分流'}</span></div><div class="history-content"><span class="level-label level-${r.level}">${levelNames[r.level]}</span><p>${r.domains.length ? r.domains.map(escape).join(' · ') : '此次未报告上述领域的明显变化'}</p><div class="history-scores">${r.scores ? `<span>规则 v${r.scoreVersion || 1}</span>` + r.scores.map(d => `<span>${domains.find(x => x.id === d.id).name} ${d.score === null ? '未完成' : d.score + '分'}</span>`).join('') : '<span>旧版摘要：未记录维度分数</span>'}</div></div><button class="icon-button delete-record" data-action="delete" data-id="${escape(r.id)}" aria-label="删除 ${escape(date(r.timestamp))} ${escape(time(r.timestamp))} 的记录">×</button></article>`).join('')}</div>` : '<div class="card journal-empty"><div><h3>尚未保存自查摘要</h3><p>完成自查后可主动保存维度分数，也可以只体验、不保存。</p></div></div>'}
    <p class="history-note">分值与事件只反映自述，不能证明因果或诊断疾病。共享设备可能让他人看到笔记；本地存储未加密，清理浏览器数据或更换设备会丢失记录。</p>`;
}
function applyTheme(theme) {
  const value = ['mint', 'yellow', 'purple'].includes(theme) ? theme : 'mint';
  document.documentElement.dataset.theme = value;
  document.querySelectorAll('[data-action="theme"]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.theme === value)));
  document.querySelector('meta[name="theme-color"]').content = { mint: '#f5fcf9', yellow: '#fffdf3', purple: '#faf8ff' }[value];
}
try { applyTheme(localStorage.getItem('her-space-theme-v1')); } catch { applyTheme('mint'); }
function cyclePanel() {
  let periods, context;
  try { periods = readPeriods(localStorage); context = readCycleContext(localStorage); }
  catch { return '<section class="card warning"><h2>经期记录暂不可读取</h2><p>不会覆盖旧记录。心情日志仍可使用。</p><button class="inline-link" data-action="clear-periods">清除经期记录</button></section>'; }
  const rows = buildCycleOverlay(periods, buildTrend(journalCache, 30), context);
  const x = i => 55 + i * 490 / 29;
  const yMood = v => 180 - (v + 3) / 6 * 140;
  const yHormone = v => 180 - v * 140;
  const lines = (key, y, cls) => chartSegments(rows.map(r => r[key])).filter(s => s.length > 1).map(s => `<polyline class="${cls}" points="${s.map(p => `${x(p.index)},${y(p.value)}`).join(' ')}"/>`).join('');
  const hasModel = rows.some(r => r.estrogen !== null);
  return `<section class="card cycle-section"><div class="section-heading"><div><span class="eyebrow">CYCLE & MOOD</span><h2>经期 × 最近 30 天心情</h2></div><button class="button secondary" data-action="period">＋ 记录生理期</button></div><label class="cycle-settings">我的周期背景（只决定是否适用典型示意）<select id="cycle-context">${cycleContexts.map(c => `<option ${c === context ? 'selected' : ''}>${c}</option>`).join('')}</select></label><p class="cycle-disclaimer">实线：你的心情记录（左轴 −3～+3）。虚线：雌激素 / 孕酮的典型相对变化示意（右轴低～高），不是你的实测或预测激素浓度。出血底色来自实际记录。重叠仅帮助观察时间关系，不证明激素造成情绪变化。</p><div class="cycle-legend"><span class="observed-mood">心情 · 实线</span><span class="estrogen">雌激素 · 示意虚线</span><span class="progesterone">孕酮 · 示意点线</span><span>▧ 已记录出血</span><span>◆ 当天有事件</span></div><svg class="cycle-svg" viewBox="0 0 630 240" role="img" aria-label="最近30天心情与周期示意对照；激素曲线不是个人浓度，逐日值见下表">${rows.map((r, i) => r.bleeding ? `<rect class="bleeding" x="${x(i) - 7}" y="35" width="14" height="150"/>` : '').join('')}${[-3, 0, 3].map(v => `<line class="chart-grid" x1="55" x2="545" y1="${yMood(v)}" y2="${yMood(v)}"/><text class="axis-label" x="40" y="${yMood(v)+4}" text-anchor="end">${v}</text>`).join('')}<text class="axis-label" x="18" y="20">心情</text><text class="axis-label" x="554" y="20">相对示意</text>${['高','中','低'].map((v,i)=>`<text class="axis-label" x="559" y="${44+i*70}">${v}</text>`).join('')}${rows.map((r,i)=>r.events.length?`<text class="axis-label" x="${x(i)}" y="${r.mood===null?28:yMood(r.mood)-10}" text-anchor="middle">◆</text>`:'').join('')}${lines('estrogen',yHormone,'hormone-e')}${lines('progesterone',yHormone,'hormone-p')}${lines('mood',yMood,'actual-mood')}${rows.map((r,i)=>r.mood===null?'':`<circle class="trend-point" fill="currentColor" cx="${x(i)}" cy="${yMood(r.mood)}" r="3"/>`).join('')}${[0,14,29].map(i=>`<text class="axis-label" x="${x(i)}" y="215" text-anchor="middle">${rows[i].label}</text>`).join('')}</svg><p class="small muted">${hasModel ? '仅在已记录的两次经期开始之间绘制示意；采用排卵约在下一次月经前 14 天的教学近似，未确认排卵，个体差异可很大。' : '目前不绘制激素示意：需选择“自然周期较规律”，且近 30 天包含至少一个已完成、开始间隔 21–35 天的记录周期。只有一次开始日期时不猜测。'} 不向未来或未完成周期外推；不用于避孕、备孕或 PMDD 诊断。</p><details class="trend-data"><summary>查看逐日记录与阶段示意</summary><div class="table-scroll"><table class="cycle-data"><thead><tr><th>日期</th><th>心情</th><th>出血记录</th><th>阶段（示意）</th></tr></thead><tbody>${rows.map(r=>`<tr><td>${r.key}</td><td>${r.mood??'未记录'}</td><td>${r.bleeding?'有':'未记录'}</td><td>${r.phase}</td></tr>`).join('')}</tbody></table></div></details><div class="period-list">${periods.slice().reverse().map(p=>`<article class="period-entry"><div class="row"><strong>${p.start} → ${p.end||'结束未记录'}</strong><div><button class="inline-link" data-action="edit-period" data-start="${p.start}">修改</button><button class="icon-button" data-action="delete-period" data-start="${p.start}" aria-label="删除 ${p.start} 经期记录">×</button></div></div>${p.note?`<p>${escape(p.note)}</p>`:''}</article>`).join('') || '<p class="small muted">还没有经期记录。不记录经期也可以使用其他功能。</p>'}</div><p class="small muted">明显经期改变、持续异常出血或疼痛应就医；大量出血伴头晕、晕厥或剧烈腹痛应及时急诊评估。</p><a class="inline-link" href="#about">阅读周期与情绪的文献及局限 →</a><button class="inline-link task-clear" data-action="clear-periods">清除经期记录与背景</button></section>`;
}
function bankView() {
  const all = [...gates(), ...domains.flatMap(d=>followups(d.id)), ...sharedQuestions];
  return `<section class="question-bank"><h2>完整题库与跳题规则 · v2</h2><p>安全题先问；报告想法立即进入 2 道安全确认。之后完成其余 9 道主问题。主问题为 0 跳过该维度；1–3 分进入只补充新信息的 1–3 道追问。存在非安全维度变化时，病程及整体影响各问一次。无异常共 10 题，全分支最多 27 题。已行动、准备行动、无法保持安全或追问提示立即危险则停止常规题目。</p><p>不重复询问每个维度的病程和功能影响。回退会恢复之前的答案快照，重新计算分支；修改后跳过的答案不会进入计分。周期及经期信息不会自动改变自查分数。</p>${all.map(q=>`<details><summary>${q.id} · ${escape(q.title)}</summary><p>${escape(q.hint||'按最接近的情况选择。')}</p><ol start="0">${q.options.map(o=>`<li>${escape(o.label)}</li>`).join('')}</ol><p class="small muted">${q.kind==='gate'?'主问题':q.domain==='context'?'有任一非安全维度变化时，仅问一次':`仅 ${q.domain} 主问题为 1–3 时呈现`}${q.id==='sleep_type'?'；分类题不计分':''}</p></details>`).join('')}</section>`;
}
function actionView() {
  return `<section class="compact-heading"><span class="eyebrow">A LITTLE ACTION</span><h1>先做一件很小的事。</h1><p class="muted">身体、感官、音乐、绘画或一句善待自己的话。完成一点，就算一点。</p></section>${smallThings()}<p class="small muted">这是日常自我关爱活动，不是专业艺术治疗、音乐治疗或医疗处方。没有立刻开心也不意味着失败。</p>`;
}
function about() {
  return `<section class="compact-heading"><span class="eyebrow">HOW THIS SPACE WORKS</span><h1>行动、自查、记录，慢慢照顾自己。</h1><p class="muted">面向成年女性的自我关爱工具。不预设每位女性都月经规律或有经期。</p></section><article class="card prose"><h2>四个模块</h2><p>行动：每天 5 件可完成的小事与有出处的文学短句。自查：10 道快速题、条件追问、描述性维度分与必要时的就医建议。记录：心情、异常兴奋、睡眠、重大事件和经期；支持最近一个月心情与周期示意对照。工具说明：完整题库、参考关系、科学依据与隐私边界。</p><h2>量表参考不等于量表施测</h2><p>DSM-5-TR 与 ICD-11 用于核对关注范围。SCL-90、SAS、SDS、HCL-32 / HCL-33、Y-BOCS、PSQI 用于检查题目覆盖思路；这版是原创改写题，不复制整套量表，不输出这些量表的分数或阈值，也不能继承其信效度。正式加入某份量表前应核对中文版本、授权、完整施测及验证要求。</p>${scaleReferences.map(([name,use,boundary])=>`<p><strong>${name}</strong>：${use}。${boundary}</p>`).join('')}<h2>分数意味着什么？</h2><p>每个维度为 0–3 级描述性困扰分：取今日主问题与该维度补充题的最高等级。睡眠类型及持续时间不加分，焦虑纳入恐慌后果，激活纳入冲动后果。整体影响单独报告，不加到所有维度。无跨维度总分，无疾病概率；高分不等于确诊，低分不排除疾病。旧记录为 v1，不能把不同规则版本直接当成同一量表趋势。</p><p>强烈困扰、明显生活影响、持续恶化、异常感知或明显少睡却不困应就医。医生结合诊断、身体状况和病程讨论心理治疗或药物；不根据网页分数自行开始、停用或调整药物。安全风险独立优先处理，本站没有实时监测或救援功能。</p><h2>经期能告诉我们多少？</h2><p>仅凭经期日期不能计算个人雌激素、孕酮的浓度，也不能可靠确认排卵。图中的虚线是典型自然周期的教学示意，采用两个已记录开始日期之间的周期长度与“下次月经前约 14 天”的近似；系数仅用于画形态，不是经过拟合的预测模型。真实个人激素需结合合适时点的检测和医疗解释。</p><p>仅在选择自然周期较规律且有 21–35 天的已完成记录周期时显示；不是对所有正常周期范围的判定。激素避孕、孕期、产后哺乳、围绝经期、周期不规则或背景不确定时不展示。当前周期及未来不预测。出血底色只覆盖已记录日期，结束未填仅标起始日；缺少心情记录处不连接。</p><p>激素变化可能与部分人的情绪有关，但关系有很大个体差异；压力、睡眠、疼痛、重大事件和用药也可能同时影响。对照图展示时间关联，不能证明因果。不能用于避孕、备孕或诊断经前烦躁障碍（PMDD）。若周期性困扰明显，可带至少两个周期的每日症状及影响记录就医；本工具单一心情分不等同完整 DRSP 或 C-PASS。</p><h2>文献与它们支持的范围</h2><p class="small muted">${evidenceAccessNote}</p>${evidence.map(e=>`<div class="source-item"><a href="${e.url}" target="_blank" rel="noopener noreferrer">${e.title} ↗</a><p>${e.supports}</p></div>`).join('')}<div class="source-links"><a href="https://www.psychiatry.org/psychiatrists/practice/dsm" target="_blank" rel="noopener noreferrer">APA · DSM</a><a href="https://icd.who.int/browse/2026-01/mms/en" target="_blank" rel="noopener noreferrer">WHO · ICD-11</a></div><h2>小事的用途</h2><p>绘画、音乐聆听、温和正念和感官活动是容易开始的自我关爱思路，不将它们称为专业艺术疗法或音乐治疗，也不承诺治疗疾病。冥想若加重不适就停止。任务每天 5 件，勾选可撤回，完成后显示有作者和作品来源的短句。没有惩罚、连续打卡或补做。</p><h2>隐私与删除</h2><p>无需账号，记录不上传、不跨设备同步。具体自查答案仅暂存页面内存，刷新清除；主动保存后只留维度摘要。摘要与心情日志各保留 90 条，经期最多 48 条，小事最多 90 天，配色与周期背景另存本机。经期、事件和心情都是敏感信息，本机存储未加密，共享设备可能让别人看到；清理浏览器数据会丢失。记录页支持单条删除，经期单独清除，以及全部记录清空；全部清空不删除配色或每日小事勾选。</p>${bankView()}</article>`;
}

function navigate(route) {
  if (location.hash === '#' + route) render();
  else location.hash = route;
}
function render(focus = true) {
  let route = location.hash.slice(1) || 'home';
  if (!['home', 'action', 'intro', 'check', 'result', 'history', 'about'].includes(route)) route = 'home';
  if (lastRoute === 'check' && route !== 'check' && route !== 'result' && session) {
    if (!confirm('退出会清除此次尚未完成的回答，确定退出吗？')) { location.hash = 'check'; return; }
    session = null; selected = null;
  }
  if (route === 'check' && !session || route === 'result' && !result) route = 'home';
  loadHistory();
  document.querySelectorAll('[data-nav]').forEach(a => {
    const active = a.dataset.nav === route || (a.dataset.nav === 'home' && ['intro', 'check', 'result'].includes(route));
    a.classList.toggle('active', active);
    if (active) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
  });
  main.innerHTML = ({ home, action: actionView, intro, check, result: resultView, history: historyView, about }[route])();
  lastRoute = route;
  if (focus) { main.focus({ preventScroll: true }); window.scrollTo(0, 0); }
}
function finish() {
  result = buildResult(session.answers);
  // IDs are only local deduplication keys, not authentication credentials.
  resultId = globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  saved = false;
  session = null; selected = null; navigate('result');
}
function advance() {
  if (!session || selected === null) return;
  const q = next(session.answers).question;
  session.steps.push({ answers: { ...session.answers }, choice: selected });
  session.answers = submit(session.answers, q.id, selected); selected = null;
  if (next(session.answers).type !== 'question') finish();
  else { render(); document.querySelector('#question-title')?.focus({ preventScroll: true }); }
}
function openJournal() {
  const form = document.querySelector('#journal-form');
  form.reset();
  const now = new Date();
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
  form.elements.timestamp.value = local;
  form.elements.timestamp.max = local;
  form.elements.eventImpact.disabled = true;
  document.querySelector('#mood-output').textContent = '0 · 中性';
  document.querySelector('#excitement-output').textContent = '0 · 没有';
  document.querySelector('#excitement-hint').hidden = true;
  document.querySelector('#journal-dialog').showModal();
}
document.addEventListener('input', event => {
  if (event.target.id === 'mood-input') {
    const value = Number(event.target.value);
    document.querySelector('#mood-output').textContent = `${value > 0 ? '+' : ''}${value} · ${moodNames[value + 3]}`;
  }
  if (event.target.id === 'excitement-input') {
    const value = Number(event.target.value);
    document.querySelector('#excitement-output').textContent = `${value} · ${excitementNames[value]}`;
    document.querySelector('#excitement-hint').hidden = value < 2;
  }
});
document.addEventListener('submit', event => {
  if (event.target.id === 'period-form') {
    event.preventDefault();
    if (!event.target.reportValidity()) return;
    const data = new FormData(event.target);
    try { savePeriod(localStorage, { start: data.get('start'), end: data.get('end') || null, note: data.get('note').trim(), originalStart: event.target.dataset.originalStart || null }); document.querySelector('#period-dialog').close(); render(false); toast('经期记录已保存。'); }
    catch (e) { toast(e.message); }
    return;
  }
  if (event.target.id !== 'journal-form') return;
  event.preventDefault();
  const form = event.target;
  if (!form.reportValidity()) return;
  const data = new FormData(form);
  const timestamp = new Date(data.get('timestamp')).getTime();
  if (!Number.isFinite(timestamp) || timestamp > Date.now() + 60000) { toast('请填写有效时间，不能记录未来的状态。'); return; }
  const sleep = data.get('sleep');
  const entry = { id: globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`, timestamp,
    mood: Number(data.get('mood')), excitement: Number(data.get('excitement')), sleep: sleep === '' ? null : Number(sleep),
    eventType: data.get('eventType'), emotion: data.get('emotion'), eventImpact: Number(data.get('eventImpact') || 0), note: data.get('note').trim() };
  try {
    records.saveJournal(localStorage, entry);
    document.querySelector('#journal-dialog').close();
    render(false); toast('心情日志已保存，趋势图已更新。');
  } catch { toast('日志保存失败，请检查本机存储权限或旧记录格式。'); }
});
document.addEventListener('change', event => {
  if (event.target.id === 'cycle-context') { try { saveCycleContext(localStorage, event.target.value); render(false); } catch { toast('周期背景未保存，请检查存储。'); } }
  if (event.target.id === 'consent') document.querySelector('#start-button').disabled = !event.target.checked;
  if (event.target.name === 'eventType') {
    const field = document.querySelector('#journal-form').elements.eventImpact;
    field.disabled = event.target.value === '无特定事件';
    if (field.disabled) field.value = '0';
  }
  if (event.target.name === 'answer' && session) {
    selected = Number(event.target.value);
    document.querySelectorAll('.option').forEach(el => el.classList.toggle('selected', el.querySelector('input').checked));
    document.querySelector('#next-button').disabled = false;
    const id = next(session.answers).question.id;
    if (id === 'safety' && selected === 3 || id === 'safety_intent' && selected === 2 || id === 'safety_safe' && selected === 2) advance();
  }
});
document.addEventListener('click', event => {
  const el = event.target.closest('[data-action]');
  if (!el || el.disabled) return;
  switch (el.dataset.action) {
    case 'theme': applyTheme(el.dataset.theme); try { localStorage.setItem('her-space-theme-v1', el.dataset.theme); } catch { toast('配色已切换，但本机暂不能保存偏好。'); } break;
    case 'period': case 'edit-period': {
      const form = document.querySelector('#period-form'); form.reset(); form.dataset.originalStart = el.dataset.start || '';
      const now = new Date(); const max = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;
      form.elements.start.max = max; form.elements.end.max = max;
      if (el.dataset.start) { try { const p = readPeriods(localStorage).find(p=>p.start===el.dataset.start); form.elements.start.value=p.start; form.elements.end.value=p.end||''; form.elements.note.value=p.note; } catch { toast('记录暂不可读取。'); return; } }
      document.querySelector('#period-dialog').showModal(); break;
    }
    case 'close-period': document.querySelector('#period-dialog').close(); break;
    case 'delete-period': if (confirm('删除这条经期记录？图表也会更新。')) { try { removePeriod(localStorage,el.dataset.start); render(false); } catch { toast('删除失败。'); } } break;
    case 'clear-periods': if (confirm('清除经期记录与周期背景？无法恢复，心情记录不受影响。')) { try { clearPeriods(localStorage); render(false); } catch { toast('清除失败。'); } } break;
    case 'help': dialog.showModal(); break;
    case 'toggle-task':
      try { toggleDailyTask(localStorage, el.dataset.id); render(false); document.querySelector(`[data-action="toggle-task"][data-id="${el.dataset.id}"]`)?.focus({ preventScroll: true }); }
      catch { render(false); toast('勾选未保存，请检查本机存储或刷新今日任务。'); }
      break;
    case 'clear-tasks':
      if (confirm('清除每日小事勾选？今天仍是同样的 5 件事，自查摘要和心情日志不受影响。')) {
        try { clearDailyTasks(localStorage); render(false); toast('勾选记录已清除。'); } catch { toast('清除失败，请检查存储权限。'); }
      }
      break;
    case 'close-help': dialog.close(); break;
    case 'journal': openJournal(); break;
    case 'close-journal': document.querySelector('#journal-dialog').close(); break;
    case 'trend-range': trendRange = Number(el.dataset.days); render(false); break;
    case 'toggle-journal': showAllJournal = !showAllJournal; render(false); break;
    case 'delete-journal':
      if (confirm('删除这条心情与事件日志？相关趋势点也会更新，删除后无法恢复。')) {
        try { records.removeJournal(localStorage, el.dataset.id); render(false); toast('心情日志已删除，趋势图已更新。'); }
        catch { toast('删除失败，请检查浏览器存储权限。'); }
      }
      break;
    case 'intro': navigate('intro'); break;
    case 'home': navigate('home'); break;
    case 'start':
      if (!document.querySelector('#consent')?.checked) return;
      session = { answers: {}, steps: [] }; result = null; selected = null; navigate('check'); break;
    case 'next': advance(); break;
    case 'back': {
      const prior = session?.steps.pop();
      if (prior) { session.answers = prior.answers; selected = prior.choice; render(); }
      break;
    }
    case 'exit': navigate('home'); break;
    case 'save':
      if (!result || saved) return;
      try { records.save(localStorage, result, resultId); saved = true; render(false); toast('摘要已保存在本机，可在状态记录中删除。'); }
      catch { toast('保存失败：本机存储不可用或已有记录损坏。此次结果仍可查看。'); }
      break;
    case 'delete':
      if (confirm('删除这条本机摘要？删除后无法恢复。')) {
        try { records.remove(localStorage, el.dataset.id); if (el.dataset.id === resultId) saved = false; render(); toast('该条记录已删除。'); } catch { toast('删除失败，请检查浏览器存储权限。'); }
      }
      break;
    case 'clear':
      if (confirm('清空全部自查摘要、心情事件日志和经期记录？每日小事勾选和配色不受影响。此操作无法恢复。')) {
        try { records.clear(localStorage); saved = false; records.clearJournal(localStorage); clearPeriods(localStorage); render(); toast('自查摘要、心情日志和经期记录已清空。'); }
        catch { render(false); toast('未能全部清空，部分记录可能已删除。请检查浏览器存储权限。'); }
      }
      break;
  }
});
window.addEventListener('hashchange', () => render());
window.addEventListener('storage', () => render(false));
window.addEventListener('beforeunload', event => { if (session) { event.preventDefault(); event.returnValue = ''; } });
render();

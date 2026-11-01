import {clearDB,allEvents} from './event-db.js?v=phq-hans1';
import {getEvents,cycleUnknown} from './events-ui.js?v=phq-hans1';
import {hydratePhotos,bindPhotos} from './photos.js?v=phq-hans1';
import {memoriesView,bindMemories} from './memories.js?v=phq-hans1';
import { eventsView, bindEvents, refreshEvents, openEvent } from './events-ui.js?v=phq-hans1';
import { domains, sharedQuestions } from './questions.js?v=phq-hans1';
import { phqIntro, phqCheck, phqResult, phqHistory, bindPHQ, resetPHQ, hasSafetyConcern, phqActive, phqReminder } from './phq9-ui.js?v=phq-hans1';
import { initializeV3, clearAllVersionedData, exportRawData } from './versioned-data.js?v=phq-hans1';
import * as records from './storage.js?v=phq-hans1';
import { buildTrend, chartSegments } from './trends.js?v=phq-hans1';
import { dailyTasks, updateDailyTask, clearDailyTasks } from './selfcare.js?v=phq-hans1';

import { readPeriods, savePeriod, removePeriod, clearPeriods, daysBetween, estimatePeriod } from './cycle.js?v=phq-hans1';

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
let recordTab = 'mood';
const formError = (form, message = '') => { const el = form.querySelector('.form-error'); el.textContent = message; el.hidden = !message; };
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
  let periodCount = 0;
  try { periodCount = readPeriods(localStorage).length; document.documentElement.dataset.hasPeriods = String(periodCount > 0); } catch { document.documentElement.dataset.hasPeriods = 'true'; }
  document.querySelector('#nav-count').textContent = historyCache.length + journalCache.length + periodCount;
}
const leafArt = `<svg class="leaf-art cat-art" viewBox="0 0 320 290" fill="none" aria-hidden="true"><circle cx="162" cy="143" r="111" class="cat-halo"/><path d="M111 220Q89 184 111 151L119 95 145 113Q163 104 181 113L207 95 213 151Q236 194 211 222Z" class="cat-body"/><path d="M116 140 119 95 145 113M181 113 207 95 211 140" class="cat-outline"/><path d="M145 145v5m35-5v5M155 159q8 12 16 0M117 155l22 4m-22 7 22-1m70-11-23 4m23 8-23-1" class="cat-outline"/><path d="M123 206q-22 18-37-3-10-16 3-27" class="cat-outline"/><path d="M148 204q15-32 30 0" class="cat-outline"/><path d="M153 184c-12-15-32 1-19 14l27 22 27-22c13-13-7-29-19-14l-8 7Z" class="cat-heart"/><path d="M91 86v12m-6-6h12m137 111v14m-7-7h14" class="cat-outline"/><ellipse cx="163" cy="238" rx="65" ry="7" class="cat-shadow"/></svg>`;

const encouragements = [
  '你不必一直向前走，停下来时，也有人为你喝彩。',
  '今天的你，已经值得一份温柔。',
  '愿你对自己，也像对在意的人一样温柔。',
  '你值得被喜欢，不需要拿今天的表现来交换。',
  '生活可以慢慢来，你也可以。'
];
let lastEncouragement = -1;
function showEncouragement() {
  if (hasSafetyConcern()) return;
  const next = (lastEncouragement + 1 + Math.floor(Math.random() * (encouragements.length - 1))) % encouragements.length;
  lastEncouragement = next;
  document.querySelector('#encouragement-message').textContent = encouragements[next];
  document.querySelector('#encouragement-dialog').showModal();
}
function smallThings() {
  let daily;
  try { daily = dailyTasks(localStorage); }
  catch { return '<section class="card warning"><h3>每日小事勾选暂不可读取</h3><p>旧记录不会自动覆盖。自查与心情日志仍可使用。</p><button class="inline-link" data-action="clear-tasks">清除小事勾选记录</button></section>'; }
  if (daily.resting) return `<section class="card rest-support"><span class="eyebrow">今天，可以停在这里</span><h2>累了，就先不做。</h2><p>你不需要完成任务来换取休息。今天到这里就好，不必补做，这里没有断签或扣分。</p><p>如果愿意，可以让自己待在舒服一点的地方；什么都不调整也可以。</p><a class="button primary" href="#home">结束今天的行动</a><button class="button secondary" data-action="task-return">重新看看建议</button></section>`;
  return `<section class="small-things-section"><div class="section-heading"><div><span class="eyebrow">按今天的精力来</span><h2>今天想试试什么？</h2></div><span>已选 ${daily.selected} / 3 项</span></div><p>下面是五个建议，选择 0–3 项就好。随时跳过、更换或撤销，没有补做、断签或扣分。</p><button class="button secondary full" data-action="task-rest">今天很累，我不想做任何事</button><div class="tiny-task-list">${daily.tasks.map(t => `<article class="tiny-task ${t.done ? 'done' : ''}"><div class="task-copy"><strong>${t.title}</strong><small>${t.note}</small><div class="task-controls"><button class="button secondary" data-action="task-choose" data-id="${t.id}" aria-pressed="${t.selected}">${t.selected ? '跳过 / 取消选择' : '选择这项'}</button>${t.selected ? `<button class="button secondary" data-action="toggle-task" data-id="${t.id}" aria-pressed="${t.done}">${t.done ? '撤销完成' : '完成了'}</button>` : ''}<button class="inline-link" data-action="task-replace" data-id="${t.id}">换一个建议</button></div></div></article>`).join('')}</div><p class="task-reward" role="status">${daily.done ? '你为自己做了一点事情。可以就停在这里，不必再多做。' : '今天不选择任何行动，也欢迎你来这里歇一会儿。'}</p><button class="inline-link task-clear" data-action="clear-tasks">清除行动记录</button></section>`;
}
function home() {
 return `<section class="page-heading"><div><span class="eyebrow">HER LITTLE SPACE · V3.0</span><h1>把今天的感受，轻轻放在这里。</h1><p class="muted">你的周期、你的经历、你的节奏。无需每天记录。</p></div><div class="date-chip">${date(Date.now())}</div></section><section class="hero"><div class="hero-copy"><span class="hero-label">不用先解释清楚，也可以开始</span><h2>今天发生了什么，<br>你想记住吗？</h2><p>在日历里记录不同的心情与事件，<br>把周期作为背景，慢慢回顾自己的变化。</p><a class="button primary" href="#history">打开周期情绪记录 →</a><button class="button secondary" data-action="event-new">记一件事</button></div>${leafArt}</section><section class="info-grid"><article class="card"><span class="eyebrow">过去两周</span><h2>PHQ-9 状态自查</h2><p>完整九题，抑郁症状程度筛查参考。提醒每14天一次，仍可按需要提前自查；结果不是诊断。</p><p>${phqReminder()}</p><a class="button secondary" href="#intro">了解并开始 PHQ-9</a></article><article class="card"><span class="eyebrow">按今天的精力</span><h2>小行动，或安心休息</h2><p>从五个建议中任选0–3项。累了什么都不做，也能收到一句小小的鼓励。</p><a class="button secondary" href="#action">去看看行动与休息</a></article></section><div class="module-links"><a href="#memories">我的温暖记忆 →</a><a href="#about">隐私与工具说明 →</a><a href="#legacy">旧版记录 →</a></div>${reminderEnabled?'<aside class="card" role="status">想记一笔此刻的心情吗？今天跳过也可以。<button class="inline-link" data-action="event-new">记一笔</button><button class="inline-link" data-action="reminder">关闭轻提醒</button></aside>':''}`;
}
function intro() { return phqIntro(); }
function check() { return phqCheck(); }
function resultView() { return phqResult(); }
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
      ${trend.map((d, i) => d[kind] === null ? '' : `<circle cx="${x(i)}" cy="${y(d[kind])}" r="8" class="trend-point" role="button" tabindex="0" data-action="trend-day" data-day="${d.key}" aria-label="查看 ${d.key} 的记录与事件"><title>${d.key}：${d[kind]}；${d.count} 条记录</title></circle>${d.events.length ? `<path d="M ${x(i)} 183 l 4 4 l -4 4 l -4 -4 Z" class="event-marker"><title>${d.key} 有 ${d.events.length} 条相关事件记录</title></path>` : ''}`).join('')}
      ${ticks.map(i => `<text x="${x(i)}" y="207" text-anchor="middle" class="axis-label">${trend[i].label}</text>`).join('')}
      ${segments.length ? '' : `<text x="310" y="100" text-anchor="middle" class="chart-empty">这段时间还没有记录</text>`}
      </svg></article>`;
}
function journalCard(r) {
  return `<article id="journal-${escape(r.id)}" class="journal-entry"><div class="row journal-entry-top"><strong>${date(r.timestamp)} · ${time(r.timestamp)}</strong><div class="entry-controls"><button class="inline-link" data-action="edit-journal" data-id="${escape(r.id)}" aria-label="修改这条心情日志">修改</button><button class="icon-button" data-action="delete-journal" data-id="${escape(r.id)}" aria-label="删除 ${escape(date(r.timestamp))} ${escape(time(r.timestamp))} 的心情日志">×</button></div></div><div class="journal-values"><span>心情 <strong>${r.mood > 0 ? '+' : ''}${r.mood}</strong> · ${moodNames[r.mood + 3]}</span><span>异常兴奋 <strong>${r.excitement}</strong> · ${excitementNames[r.excitement]}</span><span>睡眠 ${r.sleep === null ? '未记录' : `${r.sleep} 小时`}</span></div>${r.eventType !== '无特定事件' || r.eventTag ? `<div class="event-summary"><span class="event-dot">◆</span>${escape(r.eventTag || r.eventType)} · ${escape(r.emotion)} · 波动 ${r.eventImpact}/3</div>` : r.emotion !== '未选择' ? `<div class="event-summary">主要感受：${escape(r.emotion)}</div>` : ''}${r.note ? `<p class="journal-note">${escape(r.note)}</p>` : ''}${r.excitement >= 2 ? '<p class="small journal-alert">若明显少睡却不困或冲动加重，应尽快就医；普通心情好不等于异常兴奋。</p>' : ''}</article>`;
}
const localDay = timestamp => { const d = new Date(timestamp); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; };
function monthlySummary() {
  const month = localDay(Date.now()).slice(0,7);
  const rows = journalCache.filter(r => localDay(r.timestamp).startsWith(month));
  const days = new Set(rows.map(r => localDay(r.timestamp))).size;
  const tags = [...new Set(rows.map(r => r.eventTag || r.eventType).filter(t => t !== '无特定事件'))];
  const values = rows.map(r => r.mood);
  return `<section class="card"><h2>${month} · 月度回顾</h2><p>${rows.length ? `已保留 ${rows.length} 条记录，分布在 ${days} 天。心情记录范围 ${Math.min(...values)} 至 ${Math.max(...values)}，反映填写当时的感受。` : '这个月还没有记录，不必补记。'}</p><p>${tags.length ? `自选事件：${tags.map(escape).join('、')}。` : '事件标签可以不填。'}</p><p class="small muted">仅统计本机仍保留的记录，不代表整月状态，也不判断疾病或事件原因。可以记下一件积极小事，也可以什么都不写。</p></section>`;
}
function historyView() {
  const trend = buildTrend(journalCache, trendRange);
  const visibleJournal = showAllJournal ? journalCache : journalCache.slice(0, 7);
  return `${phqHistory()}<section class="page-heading"><div><span class="eyebrow">YOUR MOMENTS</span><h1>慢慢看见自己的变化。</h1><p class="muted">把心情、精力与发生的事，放在同一段时间里了解。</p></div><div class="history-actions"><button class="button primary" data-action="journal">＋ 记一笔心情</button>${historyCache.length || journalCache.length || storageError || journalError || document.documentElement.dataset.hasPeriods === 'true' ? '<button class="button outline-button small" data-action="clear">清空本机记录</button>' : ''}</div></section>
    <div class="privacy-strip">▣ 仅保存在当前浏览器 · 自查摘要与心情日志各保留最多 90 条 · 不自动上传或同步</div>
    <div class="record-tabs" role="tablist" aria-label="记录类别">${[['mood','心情与事件'],['cycle','经期记录'],['summary','自查摘要']].map(([id,label])=>`<button role="tab" id="tab-${id}" aria-controls="panel-${id}" aria-selected="${recordTab===id}" tabindex="${recordTab===id?0:-1}" data-action="record-tab" data-tab="${id}">${label}</button>`).join('')}</div>
    <section id="panel-mood" class="record-pane" role="tabpanel" aria-labelledby="tab-mood" ${recordTab==='mood'?'':'hidden'}>
    <section class="card trend-panel"><div class="section-heading"><div><h2>最近的心情与精力</h2><p class="small muted">图表来自主动填写的心情日志，不从自查评分推算心情。</p></div><div class="range-switch" role="group" aria-label="趋势时间范围">${[7, 14, 30].map(n => `<button data-action="trend-range" data-days="${n}" class="${trendRange === n ? 'active' : ''}" aria-pressed="${trendRange === n}">${n} 天</button>`).join('')}</div></div>${monthlySummary()}<div class="trend-grid">${trendChart(trend, 'mood')}${trendChart(trend, 'excitement')}</div><div id="day-detail" tabindex="-1" aria-live="polite"><p class="small muted">点选图上的数据点，查看当天记录与事件。</p></div><p class="chart-footnote">◆ 表示当天有相关事件。没有记录的日期留空、不连线；单个点不足以说明趋势。高兴与异常兴奋分别记录，图表不能判断躁狂或其他疾病。</p><details class="trend-data"><summary>查看逐日数据与事件关联</summary><div class="table-scroll"><table><caption class="sr-only">最近 ${trendRange} 天的手动日志统计</caption><thead><tr><th>日期</th><th>心情（最后）</th><th>异常兴奋（最高）</th><th>相关事件</th></tr></thead><tbody>${trend.map(d => `<tr><td>${d.key}</td><td>${d.mood === null ? '未记录' : d.mood}</td><td>${d.excitement === null ? '未记录' : d.excitement}</td><td>${d.events.length ? d.events.map(e => `${escape(e.type)} / ${escape(e.emotion)} / 波动${e.impact}`).join('；') : '未记录事件'}</td></tr>`).join('')}</tbody></table></div></details></section>
    <div class="section-heading history-section-heading"><h2>心情与事件日志 <span class="count-pill">${journalCache.length}</span></h2><span>可补记，不必每天填写</span></div>
    ${journalError ? `<div class="card warning"><p>${journalError}</p></div>` : journalCache.length ? `<div class="journal-list">${visibleJournal.map(journalCard).join('')}</div>${journalCache.length > 7 ? `<button class="button text-button full" data-action="toggle-journal">${showAllJournal ? '收起较早的日志 ↑' : `查看全部 ${journalCache.length} 条日志 ↓`}</button>` : ''}` : `<div class="card journal-empty"><span>❧</span><div><h3>留下一笔，更容易看见变化。</h3><p>记录此刻心情、睡眠或一件影响你的事，不必先完成问卷。</p></div><button class="inline-link" data-action="journal">开始记录 →</button></div>`}
    </section><section id="panel-cycle" class="record-pane" role="tabpanel" aria-labelledby="tab-cycle" ${recordTab==='cycle'?'':'hidden'}>${cyclePanel()}</section>
    <section id="panel-summary" class="record-pane" role="tabpanel" aria-labelledby="tab-summary" ${recordTab==='summary'?'':'hidden'}>
    <div class="section-heading history-section-heading"><h2>旧版自查记录 <span class="count-pill">${historyCache.length}</span></h2><a href="#intro" class="inline-link">做一次自查 →</a></div>
    ${storageError ? `<div class="card warning" role="alert"><h3>暂时无法读取本机摘要</h3><p>${storageError}</p></div>` : historyCache.length ? `<div class="history-list">${historyCache.map(r => `<article class="history-card"><div class="history-date"><strong>${date(r.timestamp)}</strong><span>${time(r.timestamp)} · ${r.complete ? '完整自查' : '安全分流'}</span></div><div class="history-content"><span class="level-label level-${r.level}">${levelNames[r.level]}</span><p>${r.domains.length ? r.domains.map(escape).join(' · ') : '此次未报告上述领域的明显变化'}</p><div class="history-scores">${r.scores ? `<span>规则 v${r.scoreVersion || 1}</span>` + r.scores.map(d => `<span>${domains.find(x => x.id === d.id).name} ${d.score === null ? '未完成' : d.score + '分'}</span>`).join('') : '<span>旧版摘要：未记录维度分数</span>'}</div></div><button class="icon-button delete-record" data-action="delete" data-id="${escape(r.id)}" aria-label="删除 ${escape(date(r.timestamp))} ${escape(time(r.timestamp))} 的记录">×</button></article>`).join('')}</div>` : '<div class="card journal-empty"><div><h3>尚未保存自查摘要</h3><p>完成自查后可主动保存维度分数，也可以只体验、不保存。</p></div></div>'}
    </section><p class="history-note">分值与事件只反映自述，不能证明因果或诊断疾病。共享设备可能让他人看到笔记；本地存储未加密，清理浏览器数据或更换设备会丢失记录。</p>`;
}
function applyTheme(theme) {
  const preferred = theme === 'purple' ? 'blue' : theme;
  const value = ['mint', 'yellow', 'blue'].includes(preferred) ? preferred : 'mint';
  document.documentElement.dataset.theme = value;
  document.querySelectorAll('[data-action="theme"]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.theme === value)));
  document.querySelector('meta[name="theme-color"]').content = { mint: '#f5fcf9', yellow: '#fffdf3', blue: '#f4faff' }[value];
}
try { applyTheme(localStorage.getItem('her-space-theme-v1')); } catch { applyTheme('mint'); }
let calendarOffset = 0;
let predictionEnabled = false;
let reminderEnabled = false;
try { predictionEnabled = localStorage.getItem('her-space-prediction-v1') === 'on'; reminderEnabled = localStorage.getItem('her-space-reminder-v1') === 'on'; } catch {}
function cycleCalendar(periods) {
  const today = new Date(); const month = new Date(today.getFullYear(), today.getMonth()+calendarOffset, 1);
  const year = month.getFullYear(), m = month.getMonth();
  const estimate = predictionEnabled && !cycleUnknown() ? estimatePeriod(periods) : null;
  const cells = Array.from({length: (month.getDay()+6)%7}, () => '<span></span>');
  for (let n=1; n<=new Date(year,m+1,0).getDate(); n++) {
    const key = localDay(new Date(year,m,n));
    const recorded = periods.some(p => key >= p.start && key <= (p.end || p.start));
    const predicted = estimate && Math.abs(daysBetween(estimate.start,key)) <= 3;
    cells.push(`<div class="calendar-day ${recorded?'recorded':predicted?'predicted':''}" aria-label="${key}${recorded?' 已记录出血':predicted?' 估算开始日期范围':''}">${n}</div>`);
  }
  return `<section class="prediction-summary"><h3>下次经期参考</h3><button class="button secondary" data-action="prediction" aria-pressed="${predictionEnabled}">${predictionEnabled?'关闭':'开启'}经期估算</button><p role="status">${!predictionEnabled ? '开启后，根据已记录的周期估算下次开始日期。' : !estimate ? `还不能估算：${cycleUnknown() ? '你已选择阶段未知 / 不适用；不提供日期估算。' : periods.length < 3 ? `目前有 ${periods.length} 次记录，请补充至至少 3 次真实开始日期。` : '最近的日期间隔不够规律，暂不提供可能误导的预测。'}` : estimate.start < localDay(Date.now()) ? `上次估算的开始日为 ${estimate.start}，现已过去。请补记实际经期；不会自动滚动推算下一周期。` : `预计下次开始日：${estimate.start}（仅供参考）。`}</p>${predictionEnabled && estimate ? '<button class="inline-link" data-action="prediction-month">查看估算日期所在月份 →</button>' : ''}</section><div class="section-heading"><button class="button secondary" data-action="calendar-prev" aria-label="上个月">←</button><h3>${year} 年 ${m+1} 月</h3><button class="button secondary" data-action="calendar-next" aria-label="下个月">→</button></div><div class="cycle-calendar">${['一','二','三','四','五','六','日'].map(d=>`<strong>${d}</strong>`).join('')}${cells.join('')}</div><p class="small muted">实色：实际出血记录；虚线：估算开始日附近 ±3 天，仅作展示参考，不是置信区间，也不表示出血持续时间。</p><p class="small muted">${predictionEnabled ? estimate ? `根据最近 ${estimate.count} 个已记录间隔的平均值（${estimate.average} 天），下次开始日约为 ${estimate.start}。` : '至少需要 3 次开始日期；间隔不规则或超出估算范围时不提供预测。' : '估算默认关闭，可按需要开启。'} 记录缺漏、周期变化、用药等都会使估算不准，实际日期可能在标示范围之外。不用于避孕、排卵判断、疾病或激素推断。</p>`;
}
function cyclePanel() {
  let periods;
  try { periods = readPeriods(localStorage); }
  catch { return '<section class="card warning"><h2>经期记录暂不可读取</h2><p>不会覆盖旧记录。心情日志仍可使用。</p><button class="inline-link" data-action="clear-periods">清除经期记录</button></section>'; }
  return `<section class="card cycle-section"><div class="section-heading"><div><span class="eyebrow">YOUR PERIOD NOTES</span><h2>经期记录</h2></div><button class="button secondary" data-action="period">＋ 记录生理期</button></div><p class="small muted">记下实际开始、结束日期和身体感受，可以补记、修改或删除。</p>${cycleCalendar(periods)}<div class="period-list">${periods.slice().reverse().map(p=>`<article class="period-entry"><div class="row"><strong>${p.start} → ${p.end||'结束未记录'}</strong><div class="entry-controls"><button class="inline-link" data-action="edit-period" data-start="${p.start}">修改</button><button class="icon-button" data-action="delete-period" data-start="${p.start}" aria-label="删除 ${p.start} 经期记录">×</button></div></div>${p.end?`<p class="small muted">已记录 ${daysBetween(p.start,p.end)+1} 天（含开始与结束日）</p>`:''}${p.note?`<p>${escape(p.note)}</p>`:''}</article>`).join('') || '<div class="period-empty"><p>还没有经期记录。</p><p class="small muted">从实际开始的那一天记起；结束日期可以稍后补上。</p></div>'}</div><p class="small muted">日历中实际记录与估算分别标示。明显经期改变、持续异常出血或疼痛应就医。</p>${periods.length?'<button class="inline-link task-clear" data-action="clear-periods">清除全部经期记录</button>':''}</section>`;
}
function actionView() {
  return `<section class="compact-heading"><span class="eyebrow">A LITTLE ACTION</span><h1>按自己的节奏，做或不做。</h1><p class="muted">想试试时选一件，累了就休息。这里没有必须完成的清单。</p></section>${smallThings()}<p class="small muted">这是日常自我关爱活动，不是专业艺术治疗、音乐治疗或医疗处方。没有立刻开心也不意味着失败。</p>`;
}
function introductionCopy() {
  return `<h2>这里适合谁</h2><p>主要面向 18 岁及以上女性，尤其是在学习、科研、工作、人际或身体变化中感到疲惫、想更了解自己的人。不必先反复质疑自己“是不是真的有问题”，也不用等到明确了原因，才开始照顾自己的感受。</p><h2>在这里，我们可以提供哪些支持？</h2><p><strong>行动与休息：</strong>从简单建议中任选 0–3 项，完成自己选的全部行动后，会有一句小小的鼓励作为彩蛋。你可以随时跳过、换一项或撤销。如果今天没有力气，就选择休息，不需要补做，你的人生仍值得喝彩。什么都不做，也会收到一句支持你的话。</p><p><strong>轻量记录：</strong>选一选此刻的心情；事件、睡眠和文字笔记都可不填。也可以自愿进入更完整的自查，帮助整理感受和寻求支持时想说的话。</p><p><strong>回顾变化：</strong>查看心情趋势、事件和月度记录概况；经期记录与估算帮助安排生活，不解释激素，也不推断情绪的生理原因。</p><h2>这是你的情绪缓冲区，所以要怎么使用，都由你决定</h2><p>不要求每天来，不设连续打卡奖励或断签惩罚。各模块可单独使用，随时退出；休息、跳过或不保存都可以。这里提供日常支持，不保证改善，也不能代替诊断、治疗或紧急救援。PHQ-9 是一种经过验证的抑郁症状筛查工具，帮助你回顾过去两周的状态。结果用于自我了解与寻求支持，不等于诊断。</p><h2>你的记录，由你掌握</h2><p>无需账号。V3事件与照片保存在当前浏览器的 IndexedDB；PHQ-9完整回答、旧版记录、经期、行动与迁移备份保存在本机 localStorage。不上传、不跨设备同步，且未加密。网站加载时托管服务仍会收到普通页面请求，但应用不会发送记录。共享设备可能暴露记录；清理浏览器数据会丢失记录。未主动保存的PHQ-9回答只在页面内存中，退出或刷新清除；保存后保留完整九题及总分。</p><p>V3事件、PHQ-9及经期记录不再自动淘汰；旧版历史原样保留，原先已被旧版自动淘汰的记录无法恢复。行动仍保留最近90个有记录日期。升级前会保存一份原始旧数据备份，因此单条旧记录删除后可能仍在迁移备份中，需用“清空全部本地数据”一并删除。浏览器空间不足时会明确报错，请先导出文字或删除不需要的照片；不会悄悄覆盖旧事件。</p><h2>需要更多支持时</h2><p>困扰持续、加重或明显影响生活时，可以联系专业人员。无法保持安全、已经受伤或可能马上伤害自己或他人时，请立即联系当地紧急服务。页面顶部始终有即时帮助入口；本站没有实时监测或人工救援。</p>`;
}
function welcome() { return `<section class="compact-heading"><span class="eyebrow">欢迎来到她的缓冲区</span><h1>你好，我们是一款面向年轻女性的心理支持小工具</h1><p>你可以在这里记录自己的心情，自查今天的状态，也可以尝试一点小行动，或者只是停一会儿。</p></section><article class="card prose">${introductionCopy()}<button class="button primary" data-action="welcome-done">了解了，按我的节奏开始</button><button class="button text-button" data-action="welcome-done">暂时跳过介绍</button></article>`; }
function about() {
  return `<section class="compact-heading"><h1>需要时，回来看看怎么用。</h1><p>所有支持都可以选择，不必把照顾自己变成新的任务。</p></section><nav class="about-toc" aria-label="工具说明目录"></nav><article class="card prose simple-about">${introductionCopy()}<h2>数据管理</h2><p>导出包含本机文字、PHQ-9完整回答和备份，不含照片。文件敏感，请妥善保管；不提供自动云备份或导入。</p><button class="button secondary" data-action="v3-export">导出本机文字数据</button><button class="button outline-button" data-action="v3-clear">清空全部本地数据</button><p id="data-status" role="status"></p><h2>轻提醒</h2><p>仅在打开首页时显示一句提醒，不发送系统通知，不催促补记。可以随时关闭。</p><button class="button secondary" data-action="reminder" aria-pressed="${reminderEnabled}">${reminderEnabled ? '关闭' : '开启'}轻提醒</button></article>`;
}
let welcomeSeen = false;
try { welcomeSeen = localStorage.getItem('her-space-welcome-v1') === 'seen'; } catch {}

function navigate(route) {
  if (location.hash === '#' + route) render();
  else location.hash = route;
}
function render(focus = true) {
  let route = location.hash.slice(1) || 'home';
  if (!welcomeSeen) route = 'welcome';
  if (!['welcome', 'home', 'action', 'intro', 'check', 'result', 'history', 'legacy', 'memories', 'about'].includes(route)) route = 'home';
  if (lastRoute === 'check' && !['check','result'].includes(route)) resetPHQ();
  if (route==='check' && !phqActive()) route='intro';
  document.body.dataset.view = route;
  loadHistory();
  document.querySelectorAll('[data-nav]').forEach(a => {
    const active = a.dataset.nav === route || (a.dataset.nav === 'home' && ['intro', 'check', 'result'].includes(route));
    a.classList.toggle('active', active);
    if (active) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
  });
  main.innerHTML = ({ welcome, home, action: actionView, intro, check, result: resultView, history: eventsView, legacy: historyView, memories: memoriesView, about }[route])();
  hydratePhotos(main);
  document.querySelector('#nav-count').textContent=getEvents().length;
  if (route === 'about') {
    const toc = main.querySelector('.about-toc');
    main.querySelectorAll('.prose h2').forEach((heading, i) => { heading.id = 'about-section-' + i; const b = document.createElement('button'); b.textContent = heading.textContent; b.dataset.action = 'about-section'; b.dataset.target = heading.id; toc.append(b); });
  }
  lastRoute = route;
  if (focus) { main.focus({preventScroll:true}); window.scrollTo({top:0,behavior:'instant'}); }
}
function openJournal(id = null) {
  const form = document.querySelector('#journal-form');
  form.reset(); document.querySelector('#journal-extras').open = false; form.dataset.entryId = id || ''; formError(form);
  const now = new Date();
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
  form.elements.timestamp.value = local;
  form.elements.timestamp.max = local;
  form.elements.eventImpact.disabled = true;
  document.querySelector('#mood-output').textContent = '0 · 中性';
  document.querySelector('#excitement-output').textContent = '0 · 没有';
  document.querySelector('#excitement-hint').hidden = true;
  if (id) {
    document.querySelector('#journal-extras').open = true;
    try {
      const entry = records.readJournal(localStorage).find(e => e.id === id);
      if (!entry) throw new Error('记录已变化');
      const localTime = new Date(entry.timestamp - new Date(entry.timestamp).getTimezoneOffset() * 60000).toISOString().slice(0,16);
      form.elements.timestamp.value = localTime;
      for (const key of ['mood','excitement','sleep','eventType','emotion','eventImpact','note','eventTag']) form.elements[key].value = entry[key] ?? '';
      form.elements.eventImpact.disabled = entry.eventType === '无特定事件';
      document.querySelector('#mood-output').textContent = `${entry.mood > 0 ? '+' : ''}${entry.mood} · ${moodNames[entry.mood + 3]}`;
      document.querySelector('#excitement-output').textContent = `${entry.excitement} · ${excitementNames[entry.excitement]}`;
      document.querySelector('#excitement-hint').hidden = entry.excitement < 2;
    } catch { toast('无法打开这条记录，请刷新后重试。'); return; }
  }
  document.querySelector('#journal-title').textContent = id ? '修改这条心情记录' : '记下此刻的心情';
  form.querySelector('[type="submit"]').textContent = id ? '保存修改' : '保存心情日志';
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
    formError(event.target);
    const data = new FormData(event.target);
    try { savePeriod(localStorage, { start: data.get('start'), end: data.get('end') || null, note: data.get('note').trim(), originalStart: event.target.dataset.originalStart || null }); document.querySelector('#period-dialog').close(); recordTab = 'cycle'; render(false); toast('经期记录已保存。'); }
    catch (e) { formError(event.target, e.message); }
    return;
  }
  if (event.target.id !== 'journal-form') return;
  event.preventDefault();
  const form = event.target;
  if (!form.reportValidity()) return;
  formError(form);
  const data = new FormData(form);
  const timestamp = new Date(data.get('timestamp')).getTime();
  if (!Number.isFinite(timestamp) || timestamp > Date.now() + 60000) { formError(form, '请填写有效时间，不能记录未来的状态。'); return; }
  const sleep = data.get('sleep');
  const entry = { id: form.dataset.entryId || globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`, timestamp,
    mood: Number(data.get('mood')), excitement: Number(data.get('excitement')), sleep: sleep === '' ? null : Number(sleep),
    eventType: data.get('eventType'), emotion: data.get('emotion'), eventImpact: Number(data.get('eventImpact') || 0), note: data.get('note').trim(), eventTag: data.get('eventTag').trim() };
  try {
    if (form.dataset.entryId && !records.readJournal(localStorage).some(e=>e.id === form.dataset.entryId)) { formError(form, '这条记录已被删除，未保存修改。'); return; }
    records.saveJournal(localStorage, entry);
    recordTab = 'mood';
    document.querySelector('#journal-dialog').close();
    render(false); toast('心情日志已保存，趋势图已更新。');
  } catch { formError(form, '日志保存失败，请检查本机存储权限或旧记录格式。'); }
});
document.addEventListener('change', event => {
  if (event.target.id === 'consent') document.querySelector('#start-button').disabled = !event.target.checked;
  if (event.target.name === 'eventType') {
    const field = document.querySelector('#journal-form').elements.eventImpact;
    field.disabled = event.target.value === '无特定事件';
    if (field.disabled) field.value = '0';
  }

});
document.addEventListener('click', event => {
  const el = event.target.closest('[data-action]');
  if (!el || el.disabled) return;
  switch (el.dataset.action) {
    case 'calendar-prev': calendarOffset--; render(false); break;
    case 'calendar-next': calendarOffset++; render(false); break;
    case 'prediction-month': { const estimate = estimatePeriod(readPeriods(localStorage)); if (estimate) { const target = new Date(estimate.start+'T12:00:00'); const today = new Date(); calendarOffset = (target.getFullYear()-today.getFullYear())*12 + target.getMonth()-today.getMonth(); render(false); } break; }
    case 'prediction': predictionEnabled = !predictionEnabled; try { localStorage.setItem('her-space-prediction-v1',predictionEnabled?'on':'off'); } catch {} render(false); break;
    case 'reminder': reminderEnabled = !reminderEnabled; try { localStorage.setItem('her-space-reminder-v1',reminderEnabled?'on':'off'); } catch {} render(false); break;
    case 'record-tab': recordTab = el.dataset.tab; render(false); main.querySelector(`#tab-${recordTab}`).focus({ preventScroll: true }); break;
    case 'about-section': document.getElementById(el.dataset.target)?.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' }); break;
    case 'edit-journal': openJournal(el.dataset.id); break;
    case 'theme': applyTheme(el.dataset.theme); try { localStorage.setItem('her-space-theme-v1', el.dataset.theme); } catch { toast('配色已切换，但本机暂不能保存偏好。'); } break;
    case 'period': case 'edit-period': {
      const form = document.querySelector('#period-form'); form.reset(); formError(form); form.dataset.originalStart = el.dataset.start || '';
      const now = new Date(); const max = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;
      form.elements.start.max = max; form.elements.end.max = max;
      if (el.dataset.start) { try { const p = readPeriods(localStorage).find(p=>p.start===el.dataset.start); form.elements.start.value=p.start; form.elements.end.value=p.end||''; form.elements.note.value=p.note; } catch { toast('记录暂不可读取。'); return; } }
      document.querySelector('#period-title').textContent = el.dataset.start ? '修改这条经期记录' : '记一笔生理期';
      form.querySelector('[type="submit"]').textContent = el.dataset.start ? '保存修改' : '保存经期记录';
      document.querySelector('#period-dialog').showModal(); break;
    }
    case 'close-period': document.querySelector('#period-dialog').close(); break;
    case 'delete-period': if (confirm('删除这条经期记录？图表也会更新。')) { try { removePeriod(localStorage,el.dataset.start); render(false); } catch { toast('删除失败。'); } } break;
    case 'clear-periods': if (confirm('清除全部经期记录？无法恢复，心情记录不受影响。')) { try { clearPeriods(localStorage); render(false); } catch { toast('清除失败。'); } } break;
    case 'help': dialog.showModal(); break;
    case 'welcome-done': welcomeSeen = true; try { localStorage.setItem('her-space-welcome-v1','seen'); } catch {} navigate('home'); break;
    case 'close-encouragement': document.querySelector('#encouragement-dialog').close(); break;
    case 'task-rest':
      try { updateDailyTask(localStorage, 'rest'); render(false); showEncouragement(); } catch (e) { toast(e.message); } break;
    case 'task-return': case 'task-choose': case 'task-replace':
      try { updateDailyTask(localStorage, {'task-rest':'rest','task-return':'return','task-choose':'choose','task-replace':'replace'}[el.dataset.action], el.dataset.id); render(false); } catch (e) { toast(e.message); } break;
    case 'toggle-task':
      try { const before = dailyTasks(localStorage); const after = updateDailyTask(localStorage, 'done', el.dataset.id); render(false); document.querySelector(`[data-action="toggle-task"][data-id="${el.dataset.id}"]`)?.focus({ preventScroll: true }); if (after.selected > 0 && after.done === after.selected && before.done < after.done) showEncouragement(); }
      catch { render(false); toast('勾选未保存，请检查本机存储或刷新今日任务。'); }
      break;
    case 'clear-tasks':
      if (confirm('清除每日小事勾选？今天仍可自由选择建议，自查摘要和心情日志不受影响。')) {
        try { clearDailyTasks(localStorage); render(false); toast('勾选记录已清除。'); } catch { toast('清除失败，请检查存储权限。'); }
      }
      break;
    case 'close-help': dialog.close(); break;
    case 'journal': openEvent(); break;
    case 'close-journal': document.querySelector('#journal-dialog').close(); break;
    case 'trend-day': { const entries = journalCache.filter(r => localDay(r.timestamp) === el.dataset.day); const panel = document.querySelector('#day-detail'); panel.innerHTML = `<h3>${escape(el.dataset.day)} 的记录</h3>${entries.map(journalCard).join('')}`; panel.focus(); break; }
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
    case 'exit': navigate('home'); break;
    case 'delete':
      if (confirm('删除这条本机摘要？删除后无法恢复。')) {
        try { records.remove(localStorage, el.dataset.id); if (el.dataset.id === resultId) saved = false; render(); toast('该条记录已删除。'); } catch { toast('删除失败，请检查浏览器存储权限。'); }
      }
      break;
    case 'clear': document.querySelector('[data-action=v3-clear]')?.click(); if(document.body.dataset.view!=='about') navigate('about'); break;
    case 'v3-export': {
      (async()=>{try{const liveEvents=await allEvents();
      const file = JSON.stringify({format:'her-space-v3-text-export',version:3,exportedAt:new Date().toISOString(),legacyAndPHQ:JSON.parse(exportRawData(localStorage)),events:liveEvents,photosIncluded:false},null,2);
      const url=URL.createObjectURL(new Blob([file],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download='her-space-text-backup.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);toast('文字导出已生成，不含照片。');}catch(err){toast('导出失败：'+err.message);}})();break;
    }
    case 'v3-clear':
      if(confirm('清空全部事件、照片、PHQ-9完整回答、旧版记录、经期、行动及迁移备份？此操作无法恢复。配色保留。')) {
        (async()=>{try{await clearDB();clearAllVersionedData(localStorage);localStorage.removeItem('her-space-cycle-context-v1');resetPHQ();await refreshEvents();render(false);toast('全部本地敏感记录及备份已清空。');}catch(err){toast('未能全部清空，部分数据可能已删除：'+err.message);}})();
      }
      break;
  }
});
window.addEventListener('hashchange', () => {render();refreshEvents().then(()=>render(false));});
document.addEventListener('keydown', event => {
  if (event.target.matches('[data-action="trend-day"]') && ['Enter',' '].includes(event.key)) { event.preventDefault(); event.target.dispatchEvent(new MouseEvent('click', {bubbles:true})); return; }
  const tab = event.target.closest('[role="tab"][data-tab]');
  if (!tab || !['ArrowLeft','ArrowRight','Home','End'].includes(event.key)) return;
  event.preventDefault(); const ids = ['mood','cycle','summary']; const i = ids.indexOf(tab.dataset.tab);
  recordTab = ids[event.key==='Home'?0:event.key==='End'?2:(i+(event.key==='ArrowRight'?1:2))%3]; render(false); main.querySelector(`#tab-${recordTab}`).focus({preventScroll:true});
});
window.addEventListener('storage', event => { if (event.key === 'her-space-theme-v1') applyTheme(event.newValue); render(false); });
window.addEventListener('beforeunload', event => { if (document.body.dataset.view==='check') { event.preventDefault(); event.returnValue = ''; } });
bindPHQ({navigate,render,periods:()=>readPeriods(localStorage)});
bindPhotos(render);
bindMemories(render);
bindEvents({navigate,render,periods:()=>readPeriods(localStorage),periodsUI:cyclePanel});
render();

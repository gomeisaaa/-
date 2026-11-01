import { cyclePhaseLayout } from './cycle-trends.js?v=phq-hans1';
const escape = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const colors = { follicular: '#edf6e9', ovulatory: '#fff1ca', luteal: '#e9effa' };
function svgChart(series, layout, axisMax, index) {
  const left = 68, right = 860, width = right - left;
  const x = day => left + (day - 1) * width / (axisMax - 1);
  const y = mood => 250 - mood * 23;
  const cell = width / (axisMax - 1);
  const bounds = (from, to) => {
    const start = Math.max(left, x(from) - cell / 2);
    return { start, width: Math.min(right, x(to) + cell / 2) - start };
  };
  const ticks = [...new Set([1, ...Array.from({ length: Math.floor(axisMax / 7) }, (_, i) => (i + 1) * 7), axisMax])].filter((n, i, all) => i === all.length - 1 || n === 1 || axisMax - n >= 3);
  return `<div class="physio-scroll" role="region" aria-label="生理周期横轴图，可左右滚动；下方提供文字明细" tabindex="0"><svg class="physio-svg" viewBox="0 0 900 430" role="img" aria-label="${escape(series.start)}开始的生理周期：横轴为周期天数与阶段参考，纵轴为主观心情负3到正3。实际出血单独显示；估计阶段不能确认排卵。">
    <text x="${left}" y="22" class="physio-axis-title">生理周期阶段 · ${layout.canEstimate ? '日历估计，非生理检测' : '未知 / 不适用'}</text>
    ${layout.canEstimate ? layout.phases.map(p => { const b = bounds(p.from, p.to); return `<rect x="${b.start}" y="42" width="${b.width}" height="286" fill="${colors[p.id]}"/><text x="${b.start + b.width / 2}" y="69" text-anchor="middle" class="physio-stage-label">${p.name}（估计）</text><text x="${b.start + b.width / 2}" y="92" text-anchor="middle" class="physio-stage-days">第${p.from}–${p.to}天</text>`; }).join('') : `<rect x="${left}" y="42" width="${bounds(1, layout.horizon).width}" height="286" fill="#f0f2f1"/><text x="${left + 20}" y="76" class="physio-stage-label">卵泡期 / 排卵附近 / 黄体期：资料不足或不适用，暂不划界</text>`}
    <text x="${left}" y="120" class="physio-bleeding-title">实际月经出血 · 与上方阶段可重叠</text>
    ${(() => { const b = bounds(1, layout.bleeding.to); return `<rect x="${b.start}" y="131" width="${Math.max(b.width, 6)}" height="12" rx="4" fill="#bf7086"/>`; })()}
    <text x="${left}" y="169" class="physio-bleeding-note">${layout.bleeding.endKnown ? `已记录出血：第1–${layout.bleeding.to}天` : '仅记录开始日；结束未填，不推测出血天数'}</text>
    ${[-3, 0, 3].map(n => `<line x1="${left}" y1="${y(n)}" x2="${right}" y2="${y(n)}" class="physio-grid"/><text x="${left - 15}" y="${y(n) + 5}" text-anchor="end">${n > 0 ? '+' : ''}${n}</text>`).join('')}
    ${series.points.map((p, i) => { const prior = series.points[i - 1]; return prior && p.day === prior.day + 1 ? `<line x1="${x(prior.day)}" y1="${y(prior.mood)}" x2="${x(p.day)}" y2="${y(p.mood)}" class="physio-line"/>` : ''; }).join('')}
    ${series.points.map(p => `<a href="#history" data-action="event-day" data-day="${p.date}" aria-label="${p.date}，周期第${p.day}天，心情${p.mood}，查看事件"><circle cx="${x(p.day)}" cy="${y(p.mood)}" r="6" class="physio-point"><title>${p.date} · 周期第${p.day}天 · 心情${p.mood}</title></circle></a>`).join('')}
    ${!series.points.length ? `<text x="${left + 25}" y="218">此周期还没有心情记录；空白不代表0分</text>` : ''}
    <line x1="${left}" y1="328" x2="${right}" y2="328" class="physio-grid"/>
    ${ticks.map(n => `<line x1="${x(n)}" y1="328" x2="${x(n)}" y2="336" class="physio-grid"/><text x="${x(n)}" y="358" text-anchor="middle">第${n}天</text>`).join('')}
    <text x="${left}" y="397" class="physio-axis-title">横轴：生理周期（实际月经开始日 = 第1天）</text>
    <text x="${left}" y="421" class="physio-stage-days">纵轴：主观心情方向 −3 至 +3，不是 PHQ-9 分数</text>
  </svg></div>`;
}
export function physiologicalChart(seriesList, periods, unknown = false, compare = false) {
  const models = seriesList.map(s => cyclePhaseLayout(s, periods, unknown));
  const max = Math.max(2, ...models.map(m => m.horizon));
  return `<section class="physio-chart-panel"><div class="physio-heading"><span class="eyebrow">MENSTRUAL CYCLE × MOOD</span><h2>${compare ? '按生理周期位置，回看相邻两次变化' : '沿着一个生理周期，看见心情变化'}</h2><p>月经出血单独标记；卵泡期、排卵附近、黄体期作为有条件的日历参考背景。</p></div><div class="physio-key"><span class="phase-bleed">实际月经出血</span><span class="phase-follicular">卵泡期 · 估计</span><span class="phase-ovulatory">排卵附近 · 估计</span><span class="phase-luteal">黄体期 · 估计</span></div>${seriesList.map((s, i) => {
    const m = models[i];
    return `<article class="physio-cycle"><h3>${s.start} 开始的周期 <span class="pill">${m.ongoing ? `进行中 · 第${s.length}天` : `已结束 · ${s.length}天`}</span></h3>${m.canEstimate ? `<p class="physio-method">${m.ongoing ? `按历史开始日间隔，参考全周期约${m.referenceLength}天；未来区间没有记录时留空。` : `使用实际周期长度${s.length}天绘制，阶段仍是日历估计。`}</p>` : `<p class="physio-unknown">${m.reason}仍可记录与回顾；不强套28天。</p>`}${svgChart(s, m, max, i)}<p class="physio-mobile-hint">小屏可左右滑动图表。点击心情点查看当天事件。</p><details><summary>查看实际日期、周期位置与心情</summary><div class="table-scroll"><table><thead><tr><th>实际日期</th><th>周期位置</th><th>当天最后心情</th></tr></thead><tbody>${s.points.map(p => `<tr><td><button class="inline-link" data-action="event-day" data-day="${p.date}">${p.date}</button></td><td>第${p.day}天</td><td>${p.mood > 0 ? '+' : ''}${p.mood}</td></tr>`).join('')}</tbody></table></div></details></article>`;
  }).join('')}<div class="physio-explanation"><p><strong>怎么读：</strong>同日有多条记录时取最后一条，明细全部保留；缺失日期不补零、不连线。${compare ? '两次周期使用相同的周期天数刻度，各自显示阶段参考；短周期不拉伸，空白不代表相同生理阶段。' : ''}</p><details><summary>阶段参考如何估计？</summary><p>仅在至少3次开始日期、最近间隔均为21–45天且极差不超过9天时提供。已结束周期用实际长度，进行中周期用历史平均长度。示意排卵中心日按“参考周期长度减14天”计算，附近±2天画为参考窗口，随后显示黄体期参考。此简化日历算法不能确认排卵，±2天不是置信区间，实际变化可能发生在范围之外。</p><p>实际出血窗口根据填写的开始与结束日期绘制；月经出血与卵泡期在生理上重叠，所以另画一条出血带。周期不规律、激素避孕、妊娠、哺乳或不适用时请选择“阶段未知”。不能用此图避孕、诊断或推断个人激素水平。</p></details></div></section>`;
}

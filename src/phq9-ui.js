import { scorePHQ, safetyMessage, frequencyStatus } from './phq9-scoring.js?v=cycle-axis1';
import { initializeV3, readPHQ, savePHQ, deletePHQ } from './versioned-data.js?v=cycle-axis1';
export const sourceVersion = 'user-supplied-CUHK-infographic-2026-11-01-zh-Hant';
export const items = [
 '做任何事都覺得沉悶或者根本不想做任何事', '情緒低落、抑鬱或絕望',
 '難於入睡；半夜會醒或相反地睡覺時間過多', '覺得疲倦或活力不足', '胃口極差或進食過量',
 '不喜歡自己 - 覺得自己做得不好、對自己失望或有負家人期望',
 '難於集中精神做事，例如看報紙或看電視',
 '其他人反映你行動或說話遲緩；或者相反地，你比平常活動更多 - 坐立不安、停不下來',
 '想到自己最好去死或者自殘'
];
export const options = ['完全不會','幾天','一半以上的天數','近乎每天'];
const esc = s => String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let active=false;
export function phqActive(){return active;}
let current = null, draft = Array(9).fill(null), saved = false, background = false;
export function hasSafetyConcern() { return draft[8] > 0 || current?.answers[8] > 0; }
export function resetPHQ() { active=false;draft=Array(9).fill(null); current=null; saved=false; background=false; }
function safety(value) { return `<section class="card safety-report" role="alert"><h2>先照顾你的安全</h2><p>${safetyMessage(value).message}</p><button class="button danger-button" data-action="help">我现在无法保持安全 / 查看即时帮助</button><p>这里没有实时监测或人工救援。求助不受自查间隔限制。</p></section>`; }
function rows() { try { return readPHQ(localStorage); } catch { return null; } }
export function phqIntro() {
 const history=rows(), status=frequencyStatus(history||[]);
 return `<section class="compact-heading"><h1>PHQ-9 · 两周状态自查</h1><p>回顾过去两周的出现频率，完整九题，约需2–3分钟。</p></section><article class="card prose"><p>${status.message}${status.next ? ` 下次建议日期：${new Date(status.next).toLocaleDateString('zh-CN')}。` : ''}</p>${history===null?'<p role="alert">PHQ-9历史暂不可读取，原记录不会覆盖。仍可自查，但请先导出异常记录。</p>':''}<p>每14天一次是本产品的低负担策略，不是对所有人的统一临床推荐。可以提前再做一次，也可以随时查看支持。</p><p>这是抑郁症状程度筛查参考，不能确诊疾病。题目保留你提供的香港中文大学医院图示繁体措辞；未独立核验其发布页或授权，版本见工具说明。</p><label class="consent"><input id="phq-consent" type="checkbox">我已满18岁，理解筛查不是诊断，愿意开始。</label><button class="button primary" data-action="phq-start">开始 PHQ-9</button><a class="button secondary" href="#home">暂时不做</a><p id="phq-intro-error" role="alert"></p><button class="inline-link" data-action="help">随时查看即时帮助</button></article>`;
}
export function phqCheck() {
 return `<section class="compact-heading"><h1>PHQ-9 · 回顾过去两周</h1><p lang="zh-Hant">在過去兩個星期，你有多經常受以下問題困擾？</p><p>请选择频率，不要求你解释原因。可以随时退出；缺题不计算总分。</p></section><div id="phq-live-safety">${draft[8]>0?safety(draft[8]):''}</div><form id="phq-form" class="card"><p class="form-error" role="alert" hidden></p>${items.map((item,i)=>`<fieldset class="phq-item"><legend lang="zh-Hant">${i+1}. ${item}</legend><div class="phq-options">${options.map((o,n)=>`<label><input type="radio" name="phq-${i}" value="${n}" ${draft[i]===n?'checked':''} required><span lang="zh-Hant">${o}</span><small>${n}分</small></label>`).join('')}</div></fieldset>`).join('')}<button type="submit" class="button primary">查看本次结果</button><a class="button secondary" href="#home">退出，不保存</a></form>`;
}
const support = ['可以暂缓一件不紧急的事，或留意什么还让你感到一点兴趣。','可以联系愿意倾听的人，或把最近的感受带给专业人员。','可以留意睡眠节奏；持续失眠或过度嗜睡时寻求评估。','可以减少今天的负担；疲劳持续或明显影响生活时考虑就医。','可以留意进食变化；不必靠自责强迫自己调整。','可以尝试把评价换成事实描述，也可以请信任的人陪伴。','可以将事情分小一步，或暂时休息。','若变化明显或加重，可以及时联系专业人员。','请及时联系专业人员进一步评估。'];
export function phqResult() {
 if (!current) return '<article class="card"><p>没有当前结果。</p><a href="#intro">开始自查</a></article>';
 const score=scorePHQ(current.answers);
 return `<section class="compact-heading"><h1>PHQ-9 · 本次筛查参考</h1><p>${new Date(current.timestamp).toLocaleString('zh-CN')} · 过去两周</p></section>${score.item9NeedsFollowup?safety(current.answers[8]):''}<article class="card"><h2>当前记录概述</h2><p class="phq-total">${score.total}<small> / 27 分</small></p><p>${score.label} · 抑郁症状程度筛查参考</p><h2>温和解释</h2><p>总分是九题之和，不能用来确诊。低分也不排除实际困扰或安全问题。第9题单独处理，不会被低总分抵消。</p><details><summary>查看九题回答</summary><ol>${items.map((t,i)=>`<li>${t}<p>${options[current.answers[i]]} · ${current.answers[i]}分</p><meter min="0" max="3" value="${current.answers[i]}" aria-label="第${i+1}题${current.answers[i]}分"></meter></li>`).join('')}</ol><p>条目用于呈现回答，没有独立常模、分量表或诊断临界值。</p></details><h2>可选下一步</h2><p>${score.total>=10?'本次报告的症状较多，建议联系专业人员评估；不必等到某个分数才寻求支持。':'可以按需要休息或寻求支持；如果困扰持续、加重或影响生活，建议联系专业人员。'}</p>${score.frequentItems.map(n=>`<p>第${n}题报告较频繁：${support[n-1]}</p>`).join('')}<a class="button secondary" href="#action">看看小行动或休息</a>${!score.item9NeedsFollowup?'<a class="button secondary" href="#memories">我的温暖记忆（自愿查看）</a>':''}<button class="button primary" data-action="phq-save" ${saved?'disabled':''}>${saved?'已保存完整回答':'保存本次完整记录'}</button><p>默认不保存。主动保存日期、九题回答、总分及版本，留在本机。</p><button class="inline-link" data-action="phq-background">${background?'隐藏':'同意查看'}已记录的经期背景</button><div id="phq-background"></div><p id="phq-result-status" role="status"></p></article>`;
}
export function phqHistory() {
 const history=rows();
 return `<section class="card"><h2>PHQ-9 历史 · 独立版本</h2>${history===null?'<p>历史损坏，未覆盖。请在工具说明页导出备份。</p>':history.length?history.map(r=>`<details><summary>${new Date(r.timestamp).toLocaleDateString('zh-CN')} · ${r.total}/27</summary><p>${esc(r.sourceVersion)}</p><ol>${r.answers.map((a,i)=>`<li>${items[i]}：${options[a]}（${a}分）</li>`).join('')}</ol>${r.answers[8]>0?safety(r.answers[8]):''}<button class="inline-link" data-action="phq-delete" data-id="${esc(r.id)}">删除此测评</button></details>`).join(''):'<p>尚未保存PHQ-9记录。</p>'}<p>旧版自编分数不转换为PHQ-9，不在同一趋势中比较。</p><a href="#intro">按需要再次自查</a></section>`;
}
export function bindPHQ({navigate,render,periods}) {
 document.addEventListener('change',e=>{if(!e.target.name?.startsWith('phq-'))return; const i=Number(e.target.name.slice(4)); draft[i]=Number(e.target.value); if(i===8){document.querySelector('#phq-live-safety').innerHTML=draft[8]>0?safety(draft[8]):'';if(draft[8]>0)document.querySelector('#phq-live-safety').scrollIntoView({block:'start'});}});
 document.addEventListener('submit',e=>{if(e.target.id!=='phq-form')return; e.preventDefault();try{scorePHQ(draft);current={schemaVersion:1,instrument:'PHQ-9',recallDays:14,id:crypto.randomUUID(),timestamp:Date.now(),sourceVersion,answers:[...draft],total:scorePHQ(draft).total};saved=false;navigate('result');}catch(err){const box=e.target.querySelector('.form-error');box.hidden=false;box.textContent=err.message;}});
 document.addEventListener('click',e=>{const b=e.target.closest('[data-action]');if(!b)return;
 if(b.dataset.action==='phq-start'){if(!document.querySelector('#phq-consent')?.checked){document.querySelector('#phq-intro-error').textContent='请先阅读并确认自愿开始。';return;}resetPHQ();active=true;navigate('check');}
 if(b.dataset.action==='phq-save'){try{initializeV3(localStorage);savePHQ(localStorage,current);saved=true;render(false);}catch(err){document.querySelector('#phq-result-status').textContent='保存失败，结果仍可查看：'+err.message;}}
 if(b.dataset.action==='phq-delete'&&confirm('删除这次PHQ-9记录？不会影响旧版记录。')){try{deletePHQ(localStorage,b.dataset.id);render(false);}catch(err){alert(err.message);}}
 if(b.dataset.action==='phq-background'){background=!background; const box=document.querySelector('#phq-background');try{const rows=periods();box.textContent=background?(rows.length?`你记录的最近一次经期开始日为 ${rows.at(-1).start}。疲劳或情绪可能受到睡眠、科研、工作、活动量、经期不适等多种因素影响。日期不能确认激素水平或因果，PHQ-9计分不变。明显困扰请寻求专业评估。`:'没有已记录的经期信息，不推断周期背景。'):'';b.textContent=background?'隐藏经期背景':'同意查看已记录的经期背景';}catch{box.textContent='经期信息暂不可读，不推断背景。';}}
 });
}

export function phqReminder(){const history=rows();if(history===null)return 'PHQ-9历史暂不可读，请先导出检查。';const s=frequencyStatus(history);return s.next?`${s.message} 建议日期：${new Date(s.next).toLocaleDateString('zh-CN')}。`:s.message;}

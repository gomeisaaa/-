import assert from 'node:assert/strict';
import {dailyTasks,updateDailyTask} from '../src/selfcare.js';
import {estimatePeriod,savePeriod,readPeriods} from '../src/cycle.js';
import {buildResult,next,submit} from '../src/assessment.js';
const map=new Map(), s={getItem:k=>map.get(k)||null,setItem:(k,v)=>map.set(k,v),removeItem:k=>map.delete(k)};
const now=Date.now();let d=dailyTasks(s,now);assert.equal(d.selected,0);for(const t of d.tasks.slice(0,3))updateDailyTask(s,'choose',t.id,now);assert.throws(()=>updateDailyTask(s,'choose',d.tasks[3].id,now));updateDailyTask(s,'done',d.tasks[0].id,now);updateDailyTask(s,'rest',null,now);assert.equal(dailyTasks(s,now).done,1);updateDailyTask(s,'return',null,now);assert.equal(dailyTasks(s,now).done,1);assert.equal(dailyTasks(s,now+86400000).selected,0);
assert.equal(estimatePeriod([]),null);assert.equal(estimatePeriod([{start:'2026-07-01'},{start:'2026-07-29'},{start:'2026-08-26'}]).start,'2026-09-23');assert.equal(estimatePeriod([{start:'2026-07-01'},{start:'2026-07-29'},{start:'2026-09-20'}]),null);
let a={};while(next(a).type==='question'){let q=next(a).question;a=submit(a,q.id,0)}assert.equal(buildResult(a).scores.length,9);assert.ok(buildResult(a).scores.every(x=>x.score===0));assert.throws(()=>buildResult({mood:1}));assert.equal(buildResult({safety:3}).level,'urgent');assert.ok(buildResult({safety:3}).scores.every(x=>x.score===null));
console.log('PASS domain: 0–3 cap, rest retains completion, next day reset, predictable/irregular cycles, complete/incomplete/emergency scoring');

// Old v1 records retain their stored history while the new UI selects at most three.
const legacyDaily = dailyTasks(s, now);
map.set('daily-mind-small-things-v1', JSON.stringify([{day:legacyDaily.day, completed:legacyDaily.tasks.map(t=>t.id)}]));
assert.equal(dailyTasks(s,now).selected,3);
assert.equal(dailyTasks(s,now).done,3);
map.set('daily-mind-small-things-v1','broken');
assert.throws(()=>updateDailyTask(s,'rest',null,now));
assert.equal(map.get('daily-mind-small-things-v1'),'broken');
console.log('PASS legacy migration and damaged-data preservation');

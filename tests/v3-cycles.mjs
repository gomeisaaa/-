import assert from 'node:assert/strict';
import {cycleSeries,cyclePhaseLayout} from '../src/cycle-trends.js';
const t=s=>new Date(s+'T12:00:00').getTime();
const rows=[{timestamp:t('2026-10-01'),mood:-2},{timestamp:t('2026-10-01')+1000,mood:2},{timestamp:t('2026-10-03'),mood:-1},{timestamp:t('2026-10-29'),mood:0}];
const p=[{start:'2026-10-01'},{start:'2026-10-29'}];
const series=cycleSeries(rows,p,t('2026-11-01'));
assert.equal(series[0].length,28);assert.equal(series[1].length,4);
assert.deepEqual(series[0].points.map(p=>p.day),[1,3]);assert.equal(series[0].points[0].mood,2);assert.equal(series[1].points[0].date,'2026-10-29');assert.equal(cycleSeries(rows,[]).length,0);
assert.equal(cycleSeries([{timestamp:t('2024-02-29'),mood:1}],[{start:'2024-02-28'}],t('2024-03-01'))[0].points[0].day,2);
console.log('PASS cycle start/day coordinates, daily last entry, distinct cycle lengths, date retention, missing days and leap day');

const regular=[{start:'2026-09-03',end:'2026-09-07'},{start:'2026-10-01',end:'2026-10-05'},{start:'2026-10-29',end:'2026-10-31'}];
const current=cycleSeries([],regular,t('2026-11-01')).at(-1);
const model=cyclePhaseLayout(current,regular);
assert.equal(current.length,4);assert.equal(model.horizon,28);assert.equal(model.ovulationDay,14);
assert.deepEqual(model.phases.map(p=>[p.name,p.from,p.to]),[['卵泡期',1,11],['排卵附近',12,16],['黄体期',17,28]]);
assert.equal(model.bleeding.to,3);assert.equal(model.phases[0].from,1); // Bleeding overlaps follicular reference.
assert.equal(cyclePhaseLayout(current,regular,true).phases.length,0);
assert.equal(cyclePhaseLayout(current,regular.slice(-1)).canEstimate,false);
const irregular=[{start:'2026-08-01'},{start:'2026-09-17'},{start:'2026-10-29'}];
assert.equal(cyclePhaseLayout(current,irregular).canEstimate,false);
assert.equal(cyclePhaseLayout({...current,length:40},regular).canEstimate,false);
assert.equal(cyclePhaseLayout({...current,bleedingEnd:null},regular).bleeding.to,1);
const completed=cycleSeries([],regular,t('2026-11-01'))[1];assert.equal(cyclePhaseLayout(completed,regular).horizon,28);
console.log('PASS full-cycle horizon, phase estimate boundaries, menstrual overlap, unknown/irregular/overdue fallback and unfilled bleeding end');

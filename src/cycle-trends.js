import { dayKey } from './trends.js?v=v30r1';
import { daysBetween } from './cycle.js?v=v30r1';
export function cycleSeries(entries, periods, now=Date.now()) {
 const starts=periods.slice().sort((a,b)=>a.start.localeCompare(b.start));
 return starts.map((p,i)=>{const end=starts[i+1]?.start||dayKey(now);const length=daysBetween(p.start,end)+(starts[i+1]?0:1);if(length<1)return null;const grouped=new Map();for(const e of entries){const key=dayKey(e.timestamp);if(key>=p.start&&(starts[i+1]?key<end:key<=end)){const prior=grouped.get(key);if(!prior||prior.timestamp<=e.timestamp)grouped.set(key,e);}}return {start:p.start,length,points:[...grouped].map(([date,e])=>({date,day:daysBetween(p.start,date)+1,mood:e.mood})).sort((a,b)=>a.day-b.day)};}).filter(Boolean);
}

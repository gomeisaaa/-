export function openDB() {
 return new Promise((resolve,reject)=>{const r=indexedDB.open('her-space-v3',1);r.onupgradeneeded=()=>{for(const name of ['events','photos','settings'])if(!r.result.objectStoreNames.contains(name))r.result.createObjectStore(name,{keyPath:'id'});};r.onerror=()=>reject(r.error);r.onblocked=()=>reject(new Error('请关闭其他旧版标签页后重试。'));r.onsuccess=()=>{r.result.onversionchange=()=>r.result.close();resolve(r.result);};});
}
export async function transaction(names,mode,run) { const db=await openDB();try{return await new Promise((resolve,reject)=>{const tx=db.transaction(names,mode);let value;tx.oncomplete=()=>resolve(value);tx.onabort=tx.onerror=()=>reject(tx.error||new Error('本地存储操作失败；请检查空间或隐私模式。'));try{value=run(tx);}catch(e){tx.abort();reject(e);}});}finally{db.close();} }
export async function allEvents() { let rows;await transaction(['events'],'readonly',tx=>{const q=tx.objectStore('events').getAll();q.onsuccess=()=>{rows=q.result;};});if(rows.some(r=>!validEvent(r)))throw new Error('事件格式异常，不会覆盖。');return rows.sort((a,b)=>b.timestamp-a.timestamp); }
export function validEvent(r){return r&&r.version===3&&typeof r.id==='string'&&Number.isFinite(r.timestamp)&&Number.isInteger(r.mood)&&r.mood>=-3&&r.mood<=3&&typeof r.title==='string'&&r.title.length<=80&&typeof r.note==='string'&&r.note.length<=1000&&typeof r.tag==='string'&&r.tag.length<=30&&['开心','平静','难过','焦虑','愤怒','混合感受','其他'].includes(r.emotion)&&typeof r.favorite==='boolean';}
export async function putEvent(row) { if(!validEvent(row))throw new Error('请检查事件日期、心情和文字长度。');await transaction(['events'],'readwrite',tx=>tx.objectStore('events').put(row)); }
export async function deleteEvent(id) { await transaction(['events','photos'],'readwrite',tx=>{tx.objectStore('events').delete(id);tx.objectStore('photos').delete(id);}); }
export async function clearDB() { await transaction(['events','photos','settings'],'readwrite',tx=>{for(const name of ['events','photos','settings'])tx.objectStore(name).clear();}); }
export async function setting(id,value) {if(arguments.length===2){await transaction(['settings'],'readwrite',tx=>tx.objectStore('settings').put({id,value}));return value;}let stored;await transaction(['settings'],'readonly',tx=>{const q=tx.objectStore('settings').get(id);q.onsuccess=()=>stored=q.result?.value;});return stored;}
export async function getPhoto(id) {let blob=null;await transaction(['photos'],'readonly',tx=>{const q=tx.objectStore('photos').get(id);q.onsuccess=()=>blob=q.result?.blob||null;});return blob;}
export async function saveEventWithPhoto(row,photoChange=undefined) {
 if(!validEvent(row))throw new Error('事件格式异常。');
 if(photoChange instanceof Blob&&navigator.storage?.estimate){const e=await navigator.storage.estimate();if(e.quota&&e.usage+photoChange.size+10000>e.quota)throw new Error('本机空间不足，请先导出或删除不需要的照片；原记录未覆盖。');}
 await transaction(['events','photos'],'readwrite',tx=>{tx.objectStore('events').put(row);if(photoChange===null)tx.objectStore('photos').delete(row.id);else if(photoChange instanceof Blob)tx.objectStore('photos').put({id:row.id,blob:photoChange});});
}
export async function removePhoto(id){await transaction(['photos'],'readwrite',tx=>tx.objectStore('photos').delete(id));}

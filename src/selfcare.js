import { dayKey } from './trends.js?v=support27';
const SELFCARE_KEY = 'daily-mind-small-things-v1';
const taskPools = [
  [
    { id: 'jump', title: '做 3 组轻轻的开合跳', note: '每组 5 次即可。不适合跳跃时，改为坐着舒展双手；不舒服就停止。' },
    { id: 'shoulders', title: '慢慢舒展肩膀 1 分钟', note: '在舒服的范围里活动；只动动手指也算。' },
    { id: 'ground', title: '睁眼冥想 1 分钟', note: '自然呼吸，留意脚底和身边三样东西。不舒服就停止，改为看看窗外。' },
    { id: 'walk', title: '走动 1 分钟', note: '不方便走动，坐着活动脚踝或双手也算。' }
  ],
  [
    { id: 'daylight', title: '感受 5 分钟自然光', note: '在窗边或安全的户外都可以，不直视太阳，不必暴晒。' },
    { id: 'sky', title: '看一会儿天空或窗外', note: '大约 1 分钟；看一张让你舒服的自然照片也算。' },
    { id: 'osmanthus', title: '出门闻一闻桂花或附近的花香', note: '在安全地方、不摘花。不当季或对气味敏感，看看一片叶子也算。' },
    { id: 'air', title: '在舒适的地方停留 2 分钟', note: '感受空气或光线，待在室内也可以。' }
  ],
  [
    { id: 'cat', title: '摸摸愿意靠近你的小猫', note: '只在动物愿意时轻摸。不方便接触动物，摸摸柔软毯子也算。' },
    { id: 'soft', title: '摸一件柔软的东西 30 秒', note: '毛衣、毯子或抱枕都可以，留意它的触感。' },
    { id: 'humming', title: '轻轻哼一小段喜欢的旋律', note: '只哼几秒也算，不必唱准。安静地想起一段旋律也可以。' },
    { id: 'sound', title: '听一首喜欢的歌', note: '30 秒就好；不想听声音，看看喜欢的颜色也算。' }
  ],
  [
    { id: 'water', title: '按自己的习惯喝一口水', note: '留意温度与味道；不方便喝水，温柔地擦擦手也算。' },
    { id: 'wash', title: '温柔地洗脸或擦擦手', note: '用让你舒服的温度，轻轻感受，不需要额外护肤步骤。' },
    { id: 'draw-cat', title: '在笔记本角落画一只小猫', note: '两个三角耳朵、几根胡须就好。只画一个圆也算，不评价画得好不好。' },
    { id: 'colour', title: '用喜欢的颜色涂一个小色块', note: '纸上或脑海里都可以。把注意留在颜色上半分钟，不需要作品。' },
    { id: 'rest', title: '给自己 1 分钟小休息', note: '坐着、靠着或闭目片刻都可以，不要求冥想。' }
  ],
  [
    { id: 'kind', title: '对自己说一句好听的话', note: '比如“今天可以慢慢来”。没有感觉也没关系，轻轻说一句就算。' },
    { id: 'write', title: '写下一句自己想听的话', note: '只写几个字也可以，不必分享到任何地方。' },
    { id: 'boundary', title: '允许自己暂缓一件不紧急的事', note: '给自己留一点空间，不需要解释或证明。' }
  ]
];
const knownIds = new Set(taskPools.flat().map(t => t.id));
function hash(text) { let value = 0; for (const c of text) value = (value * 31 + c.charCodeAt(0)) >>> 0; return value; }
function readDailyStates(storage) {
  const raw = storage.getItem(SELFCARE_KEY);
  if (!raw) return [];
  let states;
  try { states = JSON.parse(raw); } catch { throw new Error('每日小事记录损坏，不会自动覆盖。'); }
  if (!Array.isArray(states) || states.some(s => !s || !/^\d{4}-\d{2}-\d{2}$/.test(s.day) || !Array.isArray(s.completed) || s.completed.length > 5 || new Set(s.completed).size !== s.completed.length || s.completed.some(id => !knownIds.has(id)))) throw new Error('每日小事格式异常，不会自动覆盖。');
  if (states.some(s => s.selected !== undefined && (!Array.isArray(s.selected) || s.selected.length > 3 || new Set(s.selected).size !== s.selected.length || s.selected.some(id => !knownIds.has(id))) || s.offsets !== undefined && (!Array.isArray(s.offsets) || s.offsets.length > 5 || s.offsets.some(n => n !== null && (!Number.isSafeInteger(n) || n < 0))) || s.resting !== undefined && typeof s.resting !== 'boolean')) throw new Error('行动记录格式异常，不会自动覆盖。');
  return states;
}
export function dailyTasks(storage, now = Date.now()) {
  const day = dayKey(now);
  const state = readDailyStates(storage).find(s => s.day === day) || { completed: [] };
  const tasks = taskPools.map((pool, i) => ({ ...pool[(hash(`${day}:${i}`) + (state.offsets?.[i] || 0)) % pool.length] }));
  const chosen = state.selected || state.completed.slice(0, 3);
  tasks.forEach(t => { t.selected = chosen.includes(t.id); t.done = t.selected && state.completed.includes(t.id); });
  return { day, tasks, selected: chosen.length, done: tasks.filter(t => t.done).length, resting: !!state.resting, offsets: state.offsets || [] };
}
export function updateDailyTask(storage, action, id, now = Date.now()) {
  const daily = dailyTasks(storage, now);
  const task = daily.tasks.find(t => t.id === id);
  let selected = daily.tasks.filter(t => t.selected).map(t => t.id);
  let completed = daily.tasks.filter(t => t.done).map(t => t.id);
  const offsets = [...daily.offsets]; let resting = daily.resting;
  if (action === 'rest') { resting = true; }
  else if (action === 'return') { resting = false; }
  else {
    if (!task) throw new Error('请重新查看今天的建议。');
    if (action === 'choose') {
      if (selected.includes(id)) { selected = selected.filter(x => x !== id); completed = completed.filter(x => x !== id); }
      else { if (selected.length >= 3) throw new Error('最多选择 3 项；可以先取消一项。'); selected.push(id); }
    }
    if (action === 'done' && task.selected) completed = task.done ? completed.filter(x => x !== id) : [...completed, id];
    if (action === 'replace') {
      const i = daily.tasks.indexOf(task); offsets[i] = (offsets[i] || 0) + 1;
      const replacement = taskPools[i][(hash(`${daily.day}:${i}`) + offsets[i]) % taskPools[i].length];
      selected = selected.map(x => x === id ? replacement.id : x); completed = completed.filter(x => x !== id);
    }
  }
  const states = [{ day: daily.day, selected, completed, offsets, resting }, ...readDailyStates(storage).filter(s => s.day !== daily.day)].sort((a,b) => b.day.localeCompare(a.day)).slice(0,90);
  storage.setItem(SELFCARE_KEY, JSON.stringify(states));
  return dailyTasks(storage, now);
}
export function clearDailyTasks(storage) { storage.removeItem(SELFCARE_KEY); }

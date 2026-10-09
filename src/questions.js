// Original prompts, not a validated scale or a transcription of diagnostic criteria.
export const frequency = [
  { value: 0, label: '没有', hint: '过去 24 小时没有出现' },
  { value: 1, label: '轻微 / 偶尔', hint: '有一点，但基本能照常生活' },
  { value: 2, label: '明显 / 经常', hint: '较难忽略，影响到一些事情' },
  { value: 3, label: '强烈 / 持续', hint: '很难应对，日常生活明显受影响' }
];
const impact = [
  { value: 0, label: '没有影响' }, { value: 1, label: '有些困难，仍能完成' },
  { value: 2, label: '明显影响工作、学习或关系' }, { value: 3, label: '难以完成基本生活或照顾自己' }
];
const duration = [
  { value: 0, label: '只在今天 / 不到 2 天' }, { value: 1, label: '2–6 天' },
  { value: 2, label: '1–2 周' }, { value: 3, label: '超过 2 周' }
];
export const domains = [
  { id: 'mood', name: '情绪', icon: '☁', title: '今天，你感到低落、空虚或无望吗？', detail: '近两周，低落是否在一天的大部分时间出现？', note: '短暂低落和持续的情绪困扰需要结合病程与生活影响区分。' },
  { id: 'interest', name: '兴趣与动力', icon: '✧', title: '今天，你对平时喜欢的事情失去兴趣，或很难开始做事吗？', detail: '近两周，兴趣或愉悦感下降是否在多数日子出现？', note: '兴趣变化可有多种原因，不凭这一项判断抑郁障碍。' },
  { id: 'anxiety', name: '焦虑与恐慌', icon: '≈', title: '今天，你有难以控制的担忧、紧张，或突发强烈恐惧吗？', detail: '近期，担忧或恐慌是否难以控制，或让你回避某些情境？', note: '担忧与恐慌的时间条件和表现不同，需要进一步了解。' },
  { id: 'sleep', name: '睡眠', icon: '☾', title: '最近一次睡眠，有入睡困难、频繁醒来，或比平时睡得明显更多吗？', detail: '近期，睡眠变化是否让你白天疲惫或难以正常活动？', note: '睡眠变化也可能与作息、身体状况或药物有关。' },
  { id: 'activation', name: '精力与冲动', icon: '↗', title: '今天，你比平时异常兴奋或易怒，精力明显增加、思维加速或冲动吗？', detail: '这段时间，你是否睡得明显更少却不困，并有精力增加或冲动行为？', note: '关注不同于平常的变化，单纯心情好不等于躁狂或轻躁狂。', duration: [
    { value: 0, label: '不到 1 天' }, { value: 1, label: '1–3 天' }, { value: 2, label: '4–6 天' }, { value: 3, label: '7 天或更久' }
  ] },
  { id: 'cognition', name: '注意与思维', icon: '◎', title: '今天，你是否难以集中注意、思考明显变慢，或比平时混乱？', detail: '近期，注意或思维变化是否持续出现，且不同于你的平常状态？', note: '突然出现的明显混乱，尤其伴身体不适时，应及时接受医疗评估。' },
  { id: 'compulsion', name: '反复想法与行为', icon: '⟳', title: '今天，你有不想要却反复出现的想法，或难以停止的重复行为吗？', detail: '近期，这些想法或行为是否很难控制，占用大量时间或让你痛苦？', note: '关注痛苦与生活影响，重复行为本身不能用于诊断。' },
  { id: 'trauma', name: '创伤相关体验', icon: '❧', title: '今天，是否有与可怕经历相关的闪回、回避、过度警觉，或不真实感？', detail: '近期，这些体验是否持续出现，并使你回避提醒物或难以安定？', note: '无需在这里描述经历细节。创伤与解离体验需要分别评估。' },
  { id: 'perception', name: '感知与现实判断', icon: '◐', title: '今天，在清醒且非入睡或刚醒时，你有别人未感知到的声音、影像，或强烈的被害感吗？', detail: '这些体验是否让你害怕、难以判断现实，或影响你的行动？', note: '文化背景、睡眠、药物和身体疾病等也可能影响这些体验。' },
  { id: 'safety', name: '安全状况', icon: '♡', title: '过去 24 小时，你有不想活、自伤，或伤害他人的想法吗？', note: '可以如实回答。相关回答会优先进入安全确认，不与其他题目相加。', options: [
    { value: 0, label: '没有这些想法' },
    { value: 1, label: '有不想活的想法，但没有行动想法' },
    { value: 2, label: '有自伤、自杀或伤害他人的行动想法' },
    { value: 3, label: '已经行动，或准备马上行动' }
  ] }
];
export function gates() {
  return domains.map((d, index) => ({ id: d.id, domain: d.id, name: d.name, title: d.title, options: d.options || frequency, hint: d.note, kind: 'gate', number: index + 1 }));
}
export function followups(id) {
  const d = domains.find(item => item.id === id);
  if (!d) return [];
  if (id === 'safety') return [
    { id: 'safety_intent', domain: id, name: '安全确认', kind: 'detail', title: '此刻，你是否有近期行动的打算、准备，或难以控制的冲动？', options: [
      { value: 0, label: '没有' }, { value: 1, label: '不确定，担心自己可能行动' }, { value: 2, label: '有行动打算、准备或难以控制的冲动' }
    ] },
    { id: 'safety_safe', domain: id, name: '安全确认', kind: 'detail', title: '此刻，你能否保持自己和他人的安全，并联系可信任的人陪伴？', options: [
      { value: 0, label: '能保持安全，并能联系到支持者' }, { value: 1, label: '能保持安全，但暂时联系不到支持者' }, { value: 2, label: '不确定或无法保持安全' }
    ] }
  ];
  return [
    { id: id + '_pattern', domain: id, name: d.name, kind: 'detail', title: d.detail, hint: '回顾这一段时间，而不仅是今天。', options: frequency.map(o => ({ value: o.value, label: o.label })) },
    { id: id + '_duration', domain: id, name: d.name, kind: 'detail', title: '这种不同于平常的状态，大约已经持续多久？', hint: '持续时间不会单独用于判断疾病。', options: d.duration || duration },
    { id: id + '_impact', domain: id, name: d.name, kind: 'detail', title: '这种状态对你的生活造成了多大影响？', options: impact }
  ];
}

// Practical self-care ideas; not treatment prescriptions or promises of efficacy.
export const careGuides = {
  mood: { focus: '低落、空虚或无望感', title: '把活动拆成小步', ideas: ['如果身体允许，从 10–15 分钟散步或轻度运动开始，按耐受程度逐渐增加。', '选一件今天能完成的小事，并和可信任的人保持一点联系。'] },
  interest: { focus: '兴趣减少与启动困难', title: '先行动一点，不等待动力', ideas: ['安排一个 5 分钟的小活动，例如洗漱、晒太阳或听一首喜欢的歌。', '把任务拆成一个具体步骤，完成后留意感受，不要求马上恢复愉悦。'] },
  anxiety: { focus: '担忧、紧张或恐慌体验', title: '让注意力回到当下', ideas: ['尝试 2–5 分钟自然呼吸或睁眼正念，温和地关注脚底与周围环境，不屏息或强迫深呼吸。', '减少过量咖啡因，安排轻度运动；冥想若让你更不适，就停止并换成散步或感官定位。'] },
  sleep: { focus: '睡眠变化与白天影响', title: '先稳定起床与休息节奏', ideas: ['尽量固定起床时间，白天适度活动，睡前减少刺激性内容。', '避免用酒精帮助入睡，减少下午或晚间咖啡因；持续失眠时可就医讨论失眠认知行为治疗。'] },
  activation: { focus: '异常兴奋、易怒或冲动', title: '减少刺激，暂缓重大决定', ideas: ['优先规律休息，减少咖啡因、酒精与刺激性活动，暂缓大额消费或重要决定。', '请可信任的人一起留意睡眠和冲动变化；如果睡得很少却不困、行为失控或明显不同于平常，应尽快就医。'] },
  cognition: { focus: '注意困难或思维变化', title: '降低同时处理的负担', ideas: ['一次只做一件事，使用清单与短暂休息，留意睡眠不足和疲劳是否相关。', '若突然明显混乱、伴发热、剧烈头痛或其他身体症状，应立即就医，不先尝试运动或冥想。'] },
  compulsion: { focus: '侵入想法与重复行为', title: '记录影响，减少自责', ideas: ['记录反复想法或行为占用的时间与触发情境；不把想法本身当作行动或品格证明。', '明显影响生活时可就医讨论认知行为治疗及暴露与反应预防；不自行进行强烈暴露练习。'] },
  trauma: { focus: '闪回、回避或不真实感', title: '先回到安全的当下', ideas: ['尝试睁眼辨认身边的物品、触感和声音，并提醒自己此刻所在的位置。', '不强迫回忆或讲述经历；闭眼冥想若加重闪回或不真实感，立即停止，改用温和的感官定位。'] },
  perception: { focus: '异常感知或现实判断困扰', title: '减少负担，记录具体变化', ideas: ['尽量保持睡眠，避免酒精和其他非医嘱精神活性物质，请可信任的人陪伴。', '若这些体验持续、明显害怕、影响行动或让你无法判断安全，应尽快接受医疗评估，不仅依靠冥想。'] }
};

import { addDays, toKey } from './date.js'

const KEY = 'habit-checkin:v1'

export function uid() {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4)
}

/* ---------------- 读写 ---------------- */

export function normalize(data) {
  const habits = (data.habits || []).map((h, i) => ({
    id: h.id ?? uid(),
    name: h.name ?? '未命名',
    emoji: h.emoji ?? '✅',
    color: h.color ?? '#0A84FF',
    type: h.type === 'count' ? 'count' : 'daily',
    dailyTarget: h.dailyTarget ?? 1,
    unit: h.unit ?? '次',
    totalTarget: h.totalTarget,
    encouragements: Array.isArray(h.encouragements) ? h.encouragements : [],
    milestones: Array.isArray(h.milestones) ? h.milestones : [],
    rewards: (Array.isArray(h.rewards) ? h.rewards : []).map((r) => ({
      id: r.id ?? uid(),
      title: r.title ?? '奖励',
      kind: r.kind === 'streak' ? 'streak' : 'total',
      threshold: Math.max(1, Number(r.threshold) || 1),
      claimedAt: r.claimedAt,
    })),
    createdAt: h.createdAt ?? new Date().toISOString(),
    archived: !!h.archived,
    sort: typeof h.sort === 'number' ? h.sort : i,
  }))

  const checkins = (data.checkins || [])
    .filter((c) => c && typeof c.habitId === 'string' && typeof c.date === 'string')
    .map((c) => ({
      habitId: c.habitId,
      date: c.date,
      amount: Number(c.amount) > 0 ? Number(c.amount) : 1,
      backfill: !!c.backfill,
      note: c.note,
      updatedAt: c.updatedAt ?? new Date().toISOString(),
    }))

  habits.sort((a, b) => a.sort - b.sort)
  return { version: 1, habits, checkins }
}

export function load() {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return null
    return normalize(JSON.parse(raw))
  } catch {
    return null
  }
}

export function save(data) {
  try {
    localStorage.setItem(KEY, JSON.stringify(data))
    return true
  } catch {
    return false
  }
}

/* ---------------- 导入导出 ---------------- */

export function exportBackup(data) {
  const payload = { app: 'habit-checkin', exportedAt: new Date().toISOString(), ...data }
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  const d = new Date()
  const stamp = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(
    d.getDate(),
  ).padStart(2, '0')}`
  a.href = url
  a.download = `打卡备份-${stamp}.json`
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 2000)
}

export function parseBackup(text) {
  const parsed = JSON.parse(text)
  if (!parsed || !Array.isArray(parsed.habits) || !Array.isArray(parsed.checkins)) {
    throw new Error('这不是有效的备份文件')
  }
  return normalize(parsed)
}

/* ---------------- 示例数据 ---------------- */

function makeRng(seed) {
  let s = seed >>> 0
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0
    return s / 4294967296
  }
}

export function createSeedData() {
  const now = new Date().toISOString()
  const habits = [
    {
      id: 'h-zaoqi',
      name: '早起',
      emoji: '☀️',
      color: '#FF9F0A',
      type: 'daily',
      dailyTarget: 1,
      unit: '次',
      encouragements: [
        '把早晨留给自己，一整天都从容。',
        '你比昨天早起了一点，这就是进步。',
        '清晨的安静，是给坚持的人的礼物。',
        '今天的时间，是你赢来的。',
      ],
      milestones: [
        { day: 7, text: '整整一周了，生物钟开始站在你这边。' },
        { day: 30, text: '一个月。这已经不是你"在努力"，而是你"就是这样的人"。' },
      ],
      rewards: [
        { id: 'r-z1', title: '奖励自己一杯手冲咖啡', kind: 'streak', threshold: 7, claimedAt: now },
        { id: 'r-z2', title: '买一件想很久的衣服', kind: 'streak', threshold: 30 },
      ],
      createdAt: now,
      archived: false,
      sort: 0,
    },
    {
      id: 'h-heshui',
      name: '喝水',
      emoji: '💧',
      color: '#32ADE6',
      type: 'count',
      dailyTarget: 8,
      unit: '杯',
      totalTarget: 300,
      encouragements: [
        '水喝够了，脑子才转得动。',
        '身体收到了，谢谢你照顾它。',
        '一杯一杯来，别急。',
      ],
      milestones: [{ day: 21, text: '三周的水，都变成了你皮肤的光泽。' }],
      rewards: [
        { id: 'r-h1', title: '吃一顿最爱的火锅', kind: 'total', threshold: 150 },
        { id: 'r-h2', title: '点一杯奶茶犒劳自己', kind: 'streak', threshold: 7 },
      ],
      createdAt: now,
      archived: false,
      sort: 1,
    },
    {
      id: 'h-danci',
      name: '背单词',
      emoji: '📖',
      color: '#5856D6',
      type: 'count',
      dailyTarget: 30,
      unit: '个',
      totalTarget: 900,
      encouragements: [
        '这些词，会在某天派上用场。',
        '记不住也没关系，见多了就熟了。',
        '今天这 30 个，是明天的底气。',
      ],
      milestones: [{ day: 14, text: '半个月不断，词汇量已经在悄悄变化了。' }],
      rewards: [
        { id: 'r-d1', title: '安心看一集剧，不心虚', kind: 'streak', threshold: 14 },
        { id: 'r-d2', title: '买个一直想要的本子', kind: 'total', threshold: 900 },
      ],
      createdAt: now,
      archived: false,
      sort: 2,
    },
    {
      id: 'h-yuedu',
      name: '阅读',
      emoji: '📚',
      color: '#34C759',
      type: 'count',
      dailyTarget: 20,
      unit: '页',
      totalTarget: 600,
      encouragements: [
        '书里那句话，可能正好是今天需要的。',
        '读进去的，都留在了你身上。',
        '二十页也是往前走了。',
      ],
      milestones: [{ day: 10, text: '十天了。你比十天前多了一整个世界的见闻。' }],
      rewards: [
        { id: 'r-y1', title: '买一本新书', kind: 'total', threshold: 600 },
        { id: 'r-y2', title: '周末去看场电影', kind: 'streak', threshold: 10 },
      ],
      createdAt: now,
      archived: false,
      sort: 3,
    },
  ]

  const profile = {
    'h-zaoqi': { p: 0.84, min: 1, max: 1 },
    'h-heshui': { p: 0.78, min: 4, max: 9 },
    'h-danci': { p: 0.72, min: 12, max: 34 },
    'h-yuedu': { p: 0.64, min: 6, max: 26 },
  }

  const rng = makeRng(20260101)
  const checkins = []
  const today = new Date()

  for (let i = 45; i >= 1; i--) {
    const dateKey = toKey(addDays(today, -i))
    // 最近三天保持全勤，让连续天数看起来更有说服力
    const forced = i <= 3
    for (const h of habits) {
      const cfg = profile[h.id]
      if (!forced && rng() > cfg.p) continue
      const amount = h.type === 'daily' ? 1 : Math.floor(cfg.min + rng() * (cfg.max - cfg.min + 1))
      checkins.push({ habitId: h.id, date: dateKey, amount, updatedAt: now })
    }
  }

  // 今天留一部分没完成，方便演示交互
  const tk = toKey(today)
  checkins.push({ habitId: 'h-zaoqi', date: tk, amount: 1, updatedAt: now })
  checkins.push({ habitId: 'h-yuedu', date: tk, amount: 20, updatedAt: now })
  checkins.push({ habitId: 'h-heshui', date: tk, amount: 3, updatedAt: now })

  return { version: 1, habits, checkins }
}

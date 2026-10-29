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

/* ---------------- 初始数据 ---------------- */

/** 全新安装时是空的，所有事项由用户自己添加 */
export function createEmptyData() {
  return { version: 1, habits: [], checkins: [] }
}

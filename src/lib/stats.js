import { addDays, fromKey, toKey } from './date.js'

export function keyOf(habitId, date) {
  return `${habitId}|${date}`
}

export function buildAmountMap(checkins) {
  const map = new Map()
  for (const c of checkins) map.set(keyOf(c.habitId, c.date), c.amount)
  return map
}

export function amountOf(map, habitId, date) {
  return map.get(keyOf(habitId, date)) ?? 0
}

export function isDoneOn(habit, amount) {
  if (habit.type === 'daily') return amount >= 1
  return amount >= (habit.dailyTarget ?? 1)
}

export function dailyTargetOf(habit) {
  return habit.type === 'daily' ? 1 : Math.max(1, habit.dailyTarget ?? 1)
}

/** 历史累计：daily 记天数，count 记次数总和 */
export function cumulativeOf(habit, map) {
  let sum = 0
  for (const [k, v] of map) {
    const bar = k.lastIndexOf('|')
    if (k.slice(0, bar) !== habit.id) continue
    sum += habit.type === 'daily' ? 1 : v
  }
  return sum
}

/** 当前连续完成天数（今天没完成时从昨天往前算） */
export function currentStreak(habit, map, today) {
  const todayDone = isDoneOn(habit, amountOf(map, habit.id, today))
  let cursor = todayDone ? fromKey(today) : addDays(fromKey(today), -1)
  let streak = 0
  for (let i = 0; i < 3650; i++) {
    if (!isDoneOn(habit, amountOf(map, habit.id, toKey(cursor)))) break
    streak++
    cursor = addDays(cursor, -1)
  }
  return streak
}

/** 历史最长连续天数 */
export function bestStreak(habit, map, today) {
  let earliest = null
  for (const k of map.keys()) {
    const bar = k.lastIndexOf('|')
    if (k.slice(0, bar) !== habit.id) continue
    const d = k.slice(bar + 1)
    if (!earliest || d < earliest) earliest = d
  }
  if (!earliest) return 0

  let cursor = fromKey(earliest)
  const end = fromKey(today)
  let run = 0
  let best = 0
  for (let i = 0; i < 3650 && cursor.getTime() <= end.getTime(); i++) {
    if (isDoneOn(habit, amountOf(map, habit.id, toKey(cursor)))) {
      run++
      if (run > best) best = run
    } else {
      run = 0
    }
    cursor = addDays(cursor, 1)
  }
  return best
}

/** 某天整体完成情况 */
export function daySummary(habits, map, date) {
  const active = habits.filter((h) => !h.archived)
  const total = active.length
  if (total === 0) return { done: 0, total: 0, ratio: 0 }
  let done = 0
  for (const h of active) if (isDoneOn(h, amountOf(map, h.id, date))) done++
  return { done, total, ratio: done / total }
}

export function rewardProgress(habit, map, today) {
  const cumulative = cumulativeOf(habit, map)
  const best = bestStreak(habit, map, today)
  return habit.rewards.map((rule) => {
    const current = rule.kind === 'total' ? cumulative : best
    const threshold = Math.max(1, rule.threshold)
    return {
      rule,
      habit,
      current,
      threshold,
      ratio: Math.min(1, current / threshold),
      unlocked: current >= threshold,
    }
  })
}

/** 所有事项里已解锁但还没领取的奖励 */
export function claimableRewards(habits, map, today) {
  const out = []
  for (const h of habits) {
    if (h.archived) continue
    for (const p of rewardProgress(h, map, today)) {
      if (p.unlocked && !p.rule.claimedAt) out.push(p)
    }
  }
  return out
}

/** 某事项在指定月份内的完成天数 */
export function monthStats(habit, map, year, month, today) {
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  let done = 0
  let elapsed = 0
  for (let d = 1; d <= daysInMonth; d++) {
    const key = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
    if (key > today) continue
    elapsed++
    if (isDoneOn(habit, amountOf(map, habit.id, key))) done++
  }
  return { done, elapsed, daysInMonth }
}

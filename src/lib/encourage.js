import { dayOfYear } from './date.js'

export const GLOBAL_LINES = [
  '又前进了一步，真不错。',
  '你今天没有辜负自己。',
  '小事坚持久了，就成了了不起的事。',
  '做完了，剩下的交给时间。',
  '这一下，是给未来的自己攒的。',
]

function pickStable(arr, seed) {
  return arr[Math.abs(seed) % arr.length]
}

/** 里程碑专属句 > 自己的鼓励语池 > 全局兜底 */
export function pickEncouragement(habit, { streak, doneCount, today }) {
  const hit = [...habit.milestones]
    .sort((a, b) => a.day - b.day)
    .filter((m) => m.day === streak || m.day === doneCount)
    .pop()
  if (hit) return hit.text

  const pool = habit.encouragements.filter((s) => s.trim().length > 0)
  const seed = dayOfYear(today) + doneCount * 7 + habit.name.length
  if (pool.length > 0) return pickStable(pool, seed)
  return pickStable(GLOBAL_LINES, seed)
}

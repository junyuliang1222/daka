import { el } from './dom.js'
import {
  amountOf,
  buildAmountMap,
  cumulativeOf,
  currentStreak,
  isDoneOn,
} from './lib/stats.js'
import {
  createSeedData,
  exportBackup,
  load,
  parseBackup,
  save,
} from './lib/store.js'
import { pickEncouragement } from './lib/encourage.js'
import { todayKey } from './lib/date.js'
import { icon } from './dom.js'
import { todayView } from './views/today.js'
import { statsView } from './views/stats.js'
import { editorSheet } from './views/editor.js'
import { settingsSheet } from './views/settings.js'

/* ---------------- 状态 ---------------- */

const NOW = new Date()

const state = {
  data: load() || createSeedData(),
  tab: 'today',
  lastTab: null,
  flash: null,
  toastTimer: null,
  calMonth: { y: NOW.getFullYear(), m: NOW.getMonth() },
}

const today = todayKey()
const todayDate = new Date()

const rootPage = document.getElementById('page')
const rootTabbar = document.getElementById('tabbar')
const rootToast = document.getElementById('toast-root')
const rootSheet = document.getElementById('sheet-root')

function persist() {
  save(state.data)
}

/* ---------------- 浮层 ---------------- */

function showToast({ emoji, text, title, color }) {
  clearTimeout(state.toastTimer)
  rootToast.replaceChildren(
    el(
      'div',
      { class: 'toast-wrap' },
      el(
        'div',
        { class: 'toast', style: { borderLeft: `3px solid ${color}` } },
        el('span', { class: 'emoji' }, emoji),
        el('div', { style: { minWidth: '0' } }, el('p', {}, text), el('div', { class: 'hint', style: { color } }, title)),
      ),
    ),
  )
  state.toastTimer = setTimeout(() => rootToast.replaceChildren(), 3400)
}

function openSheet(node) {
  rootSheet.replaceChildren(node)
}

function closeSheet() {
  rootSheet.replaceChildren()
}

/* ---------------- 打卡动作 ---------------- */

function changeAmount(habit, nextAmount) {
  const map = buildAmountMap(state.data.checkins)
  const before = amountOf(map, habit.id, today)
  const wasDone = isDoneOn(habit, before)
  const nowDone = isDoneOn(habit, nextAmount)

  const rest = state.data.checkins.filter(
    (c) => !(c.habitId === habit.id && c.date === today),
  )
  if (nextAmount > 0) {
    rest.push({
      habitId: habit.id,
      date: today,
      amount: nextAmount,
      updatedAt: new Date().toISOString(),
    })
  }
  state.data = { ...state.data, checkins: rest }
  persist()

  if (!wasDone && nowDone) {
    const nextMap = buildAmountMap(state.data.checkins)
    const streak = currentStreak(habit, nextMap, today)
    const doneCount = cumulativeOf(habit, nextMap)
    showToast({
      emoji: habit.emoji,
      text: pickEncouragement(habit, { streak, doneCount, today: new Date() }),
      title: habit.name,
      color: habit.color,
    })
    state.flash = { habitId: habit.id }
    render()

/* Service Worker：只在 https 或 localhost 下生效，局域网 http 会自动跳过 */
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(() => {})
  })
}
    setTimeout(() => {
      state.flash = null
    }, 520)
    return
  }

  render()

/* Service Worker：只在 https 或 localhost 下生效，局域网 http 会自动跳过 */
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(() => {})
  })
}
}

const actions = {
  inc(habit) {
    const map = buildAmountMap(state.data.checkins)
    const cur = amountOf(map, habit.id, today)
    changeAmount(habit, cur + 1)
  },
  dec(habit) {
    const map = buildAmountMap(state.data.checkins)
    const cur = amountOf(map, habit.id, today)
    changeAmount(habit, Math.max(0, cur - 1))
  },
  toggle(habit) {
    const map = buildAmountMap(state.data.checkins)
    const cur = amountOf(map, habit.id, today)
    changeAmount(habit, cur > 0 ? 0 : 1)
  },
  claim(habitId, rewardId) {
    const habit = state.data.habits.find((h) => h.id === habitId)
    state.data = {
      ...state.data,
      habits: state.data.habits.map((h) =>
        h.id !== habitId
          ? h
          : {
              ...h,
              rewards: h.rewards.map((r) =>
                r.id === rewardId ? { ...r, claimedAt: new Date().toISOString() } : r,
              ),
            },
      ),
    }
    persist()
    if (habit) {
      showToast({ emoji: '🎉', text: '奖励已入账，你值得。', title: habit.name, color: habit.color })
    }
    render()

/* Service Worker：只在 https 或 localhost 下生效，局域网 http 会自动跳过 */
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(() => {})
  })
}
  },
  goStats() {
    state.tab = 'stats'
    render()
    window.scrollTo({ top: 0 })
  },
  prevMonth() {
    const { y, m } = state.calMonth
    state.calMonth = m === 0 ? { y: y - 1, m: 11 } : { y, m: m - 1 }
    render()
  },
  nextMonth() {
    const { y, m } = state.calMonth
    const now = new Date()
    if (y === now.getFullYear() && m === now.getMonth()) return
    state.calMonth = m === 11 ? { y: y + 1, m: 0 } : { y, m: m + 1 }
    render()
  },
  openHabit(habit) {
    openSheet(
      editorSheet({
        initial: habit,
        onSave: saveHabit,
        onDelete: deleteHabit,
        onClose: closeSheet,
      }),
    )
  },
  openCreate() {
    openSheet(
      editorSheet({
        initial: null,
        onSave: saveHabit,
        onDelete: null,
        onClose: closeSheet,
      }),
    )
  },
  openSettings() {
    openSheet(
      settingsSheet({
        data: state.data,
        onExport: () => exportBackup(state.data),
        onImportText: handleImportText,
        onClose: closeSheet,
      }),
    )
  },
}

/* ---------------- 事项增删改 ---------------- */

function saveHabit(habit) {
  const exists = state.data.habits.some((h) => h.id === habit.id)
  state.data = {
    ...state.data,
    habits: exists
      ? state.data.habits.map((h) => (h.id === habit.id ? { ...h, ...habit } : h))
      : [...state.data.habits, { ...habit, sort: state.data.habits.length }],
  }
  persist()
  closeSheet()
  render()

/* Service Worker：只在 https 或 localhost 下生效，局域网 http 会自动跳过 */
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(() => {})
  })
}
}

function deleteHabit(id) {
  state.data = {
    ...state.data,
    habits: state.data.habits.filter((h) => h.id !== id),
    checkins: state.data.checkins.filter((c) => c.habitId !== id),
  }
  persist()
  closeSheet()
  render()

/* Service Worker：只在 https 或 localhost 下生效，局域网 http 会自动跳过 */
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(() => {})
  })
}
}

function handleImportText(text) {
  if (text === null) {
    showToast({ emoji: '⚠️', text: '文件读取失败', title: '导入失败', color: '#FF3B30' })
    return
  }
  try {
    const parsed = parseBackup(text)
    state.data = parsed
    persist()
    closeSheet()
    render()

/* Service Worker：只在 https 或 localhost 下生效，局域网 http 会自动跳过 */
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(() => {})
  })
}
    showToast({
      emoji: '✅',
      text: `已恢复 ${parsed.habits.length} 个事项、${parsed.checkins.length} 条记录。`,
      title: '备份导入成功',
      color: '#34C759',
    })
  } catch (err) {
    showToast({
      emoji: '⚠️',
      text: err && err.message ? err.message : '这不是有效的备份文件',
      title: '导入失败',
      color: '#FF3B30',
    })
  }
}

/* ---------------- 渲染 ---------------- */

const TABS = [
  { key: 'today', label: '今日', name: 'today' },
  { key: 'stats', label: '进度', name: 'stats' },
]

function renderTabbar() {
  rootTabbar.replaceChildren(
    ...TABS.map((t) =>
      el(
        'button',
        {
          class: `tab${state.tab === t.key ? ' active' : ''}`,
          onclick: () => {
            if (state.tab === t.key) return
            state.tab = t.key
            render()

/* Service Worker：只在 https 或 localhost 下生效，局域网 http 会自动跳过 */
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(() => {})
  })
}
            window.scrollTo({ top: 0 })
          },
        },
        icon(t.name, 25),
        el('span', {}, t.label),
      ),
    ),
  )
}

function render() {
  const map = buildAmountMap(state.data.checkins)
  const ctx = {
    habits: state.data.habits,
    map,
    today,
    todayDate,
    flash: state.flash,
    calMonth: state.calMonth,
    actions,
  }

  const view = state.tab === 'today' ? todayView(ctx) : statsView(ctx)

  if (state.tab !== state.lastTab) {
    view.classList.add('enter')
    state.lastTab = state.tab
  }

  rootPage.replaceChildren(view)
  renderTabbar()
}

render()

/* Service Worker：只在 https 或 localhost 下生效，局域网 http 会自动跳过 */
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(() => {})
  })
}

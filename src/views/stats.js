import { el, icon } from '../dom.js'
import {
  amountOf,
  bestStreak,
  cumulativeOf,
  currentStreak,
  daySummary,
  isDoneOn,
  monthStats,
  rewardProgress,
} from '../lib/stats.js'
import { addDays, fromKey, toKey } from '../lib/date.js'
import { hexAlpha } from '../lib/color.js'

const SLOTS = 9 // 每天一个九宫格，完成 1 个事项涂 1 格
const WEEKDAY_LABELS = ['一', '二', '三', '四', '五', '六', '日']

function weekdayHeader(cls) {
  const head = el('div', { class: cls })
  for (const w of WEEKDAY_LABELS) head.appendChild(el('div', { class: 'cal-w' }, w))
  return head
}

/** 总体打卡月历：每天一个 3×3 九宫格，完成一个事项涂一格 */
function overallCalendar(active, map, year, month, today) {
  const wrap = el('div', { class: 'ocal' })
  wrap.appendChild(weekdayHeader('ocal-head'))

  const body = el('div', { class: 'ocal-body' })

  const first = new Date(year, month, 1)
  const offset = (first.getDay() + 6) % 7 // 周一为一周起点
  for (let i = 0; i < offset; i++) {
    body.appendChild(el('div', { class: 'oc-cell blank' }))
  }

  const daysInMonth = new Date(year, month + 1, 0).getDate()

  for (let d = 1; d <= daysInMonth; d++) {
    const key = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
    const future = key > today
    const isToday = key === today

    const doneHabits = active.filter((h) => isDoneOn(h, amountOf(map, h.id, key)))

    const classes = ['oc-cell']
    if (future) classes.push('future')
    if (isToday) classes.push('today')

    const grid = el('div', { class: 'oc-grid' })
    for (let i = 0; i < SLOTS; i++) {
      const h = doneHabits[i]
      grid.appendChild(
        el('div', {
          class: `oc-sq${h ? ' on' : ''}`,
          style: h ? { background: h.color } : undefined,
          title: h ? `${key}　${h.name}` : key,
        }),
      )
    }

    const cell = el('div', { class: classes.join(' ') })
    cell.appendChild(el('div', { class: 'oc-num' }, String(d)))
    cell.appendChild(grid)
    body.appendChild(cell)
  }

  wrap.appendChild(body)
  return wrap
}

/* ---------------- 单事项月历 ---------------- */

function monthCalendar(habit, map, year, month, today, actions) {
  const grid = el('div', { class: 'cal' })

  const head = el('div', { class: 'cal-head' })
  for (const w of WEEKDAY_LABELS) head.appendChild(el('div', { class: 'cal-w' }, w))
  grid.appendChild(head)

  const body = el('div', { class: 'cal-body' })

  const first = new Date(year, month, 1)
  const offset = (first.getDay() + 6) % 7 // 周一为一周起点
  for (let i = 0; i < offset; i++) {
    body.appendChild(el('div', { class: 'cal-cell blank' }))
  }

  const daysInMonth = new Date(year, month + 1, 0).getDate()
  for (let d = 1; d <= daysInMonth; d++) {
    const key = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
    const amount = amountOf(map, habit.id, key)
    const done = isDoneOn(habit, amount)
    const future = key > today
    const isToday = key === today

    const classes = ['cal-cell']
    if (done) classes.push('done')
    else if (amount > 0) classes.push('partial')
    else if (future) classes.push('future')
    else classes.push('missed')
    if (isToday) classes.push('today')
    if (!future) classes.push('editable')

    let style
    if (done) style = { background: habit.color, color: '#fff' }
    else if (amount > 0) style = { background: hexAlpha(habit.color, 0.22), color: habit.color }

    body.appendChild(
      el(
        'div',
        {
          class: classes.join(' '),
          style,
          title: future ? key : `${key}　点一下补打卡`,
          onclick: future ? undefined : () => actions.openDay(habit, key),
        },
        String(d),
      ),
    )
  }

  grid.appendChild(body)
  return grid
}

/* ---------------- 事项奖励 ---------------- */

function rewardsInline(habit, map, today, onClaim) {
  if (!habit.rewards || habit.rewards.length === 0) return null

  const rows = []
  for (const p of rewardProgress(habit, map, today)) {
    const claimed = !!p.rule.claimedAt
    const unit = p.rule.kind === 'streak' ? '天' : habit.type === 'daily' ? '天' : habit.unit || '次'
    const metric = p.rule.kind === 'streak' ? '连续' : '累计'

    let tail
    if (claimed) {
      tail = el('span', { class: 'cr-state claimed' }, icon('check', 13), '已领取')
    } else if (p.unlocked) {
      tail = el(
        'button',
        { class: 'cr-claim', onclick: () => onClaim(habit.id, p.rule.id) },
        '领取',
      )
    } else {
      tail = el('span', { class: 'cr-state' }, `${Math.round(p.ratio * 100)}%`)
    }

    rows.push(
      el(
        'div',
        { class: `cr-row${claimed ? ' cr-claimed' : p.unlocked ? ' cr-unlocked' : ''}` },
        el('span', { class: 'cr-badge' }, claimed ? '🏆' : p.unlocked ? '🎉' : '🎁'),
        el(
          'span',
          { class: 'cr-main' },
          el('span', { class: 'cr-name' }, p.rule.title),
          el(
            'span',
            { class: 'cr-meta' },
            `${metric} ${Math.min(p.current, p.threshold)}/${p.threshold} ${unit}`,
          ),
        ),
        tail,
      ),
    )
  }

  return el(
    'div',
    { class: 'card-rewards' },
    el('div', { class: 'cr-title' }, '奖励'),
    ...rows,
  )
}

/* ---------------- 页面 ---------------- */

export function statsView(ctx) {
  const { habits, map, today, actions, calMonth } = ctx
  const active = habits.filter((h) => !h.archived)
  const { y, m } = calMonth

  const page = el(
    'div',
    { class: 'page' },
    el(
      'div',
      { class: 'head' },
      el(
        'div',
        {},
        el('p', { class: 'subtitle' }, `${active.length} 个事项在打卡`),
        el('h1', { class: 'large-title' }, '进度'),
      ),
    ),
  )

  if (active.length === 0) {
    page.appendChild(
      el(
        'div',
        { class: 'card', style: { marginTop: '16px' } },
        el(
          'div',
          { class: 'empty' },
          el('div', { class: 'big' }, '📊'),
          '还没有数据',
          el('div', { class: 'hintline' }, '添加事项并开始打卡后，这里会长出来'),
          el(
            'button',
            {
              class: 'btn-secondary',
              style: { marginTop: '16px', maxWidth: '200px', marginInline: 'auto' },
              onclick: actions.openCreate,
            },
            '新建事项',
          ),
        ),
      ),
    )
    return page
  }

  /* ---- 月份切换（总览与各项表现共用） ---- */
  const now = new Date()
  const atCurrentMonth = y === now.getFullYear() && m === now.getMonth()
  const oldest = new Date(now.getFullYear(), now.getMonth() - 23, 1)
  const atOrAfterLimit =
    y < oldest.getFullYear() || (y === oldest.getFullYear() && m <= oldest.getMonth())

  const monthNav = el(
    'div',
    { class: 'month-nav' },
    el(
      'button',
      {
        class: atOrAfterLimit ? 'disabled' : '',
        'aria-label': '上个月',
        onclick: atOrAfterLimit ? undefined : actions.prevMonth,
      },
      el(
        'span',
        { style: { display: 'inline-flex', transform: 'rotate(180deg)' } },
        icon('chevron', 15),
      ),
    ),
    el('span', { class: 'month-label' }, `${y}年${m + 1}月`),
    el(
      'button',
      {
        class: atCurrentMonth ? 'disabled' : '',
        'aria-label': '下个月',
        onclick: atCurrentMonth ? undefined : actions.nextMonth,
      },
      icon('chevron', 15),
    ),
  )

  /* ---- 打卡总览月历 ---- */
  page.appendChild(
    el(
      'div',
      { class: 'month-row' },
      el('div', { class: 'section-title', style: { margin: '0' } }, '打卡总览'),
      monthNav,
    ),
  )

  page.appendChild(
    el(
      'div',
      { class: 'card ocal-card' },
      overallCalendar(active, map, y, m, today),
      el(
        'div',
        { class: 'ocal-hint' },
        '每完成 1 个事项，当天涂亮 1 格',
        el('span', { class: 'dot' }, '·'),
        `共 ${active.length} 个事项`,
      ),
    ),
  )

  /* ---- 汇总 ---- */
  const recordDaysSet = new Set()
  let totalChecks = 0
  for (const [k, v] of map) {
    const bar = k.lastIndexOf('|')
    const habitId = k.slice(0, bar)
    const habit = active.find((h) => h.id === habitId)
    if (!habit) continue
    recordDaysSet.add(k.slice(bar + 1))
    totalChecks += habit.type === 'daily' ? 1 : v
  }

  const bestAll = active.reduce((mx, h) => Math.max(mx, bestStreak(h, map, today)), 0)
  const todayD = fromKey(today)
  let sum = 0
  for (let i = 0; i < 30; i++) sum += daySummary(active, map, toKey(addDays(todayD, -i))).ratio
  const avg = sum / 30

  const statBox = (value, unit, key) =>
    el(
      'div',
      { class: 'stat-box' },
      el('div', { class: 'v' }, value, unit ? el('small', {}, unit) : null),
      el('div', { class: 'k' }, key),
    )

  page.appendChild(
    el(
      'div',
      { class: 'stat-grid' },
      statBox(String(recordDaysSet.size), '天', '有记录的天数'),
      statBox(String(totalChecks), '', '累计打卡次数'),
      statBox(String(bestAll), '天', '最长连续'),
      statBox(String(Math.round(avg * 100)), '%', '近 30 天完成率'),
    ),
  )

  /* ---- 各项表现 ---- */
  page.appendChild(
    el(
      'div',
      { class: 'section-title' },
      '各项表现',
      el('span', { class: 'hint-right' }, '点日期可补打卡'),
    ),
  )

  for (const h of active) {
    const cum = cumulativeOf(h, map)
    const cur = currentStreak(h, map, today)
    const best = bestStreak(h, map, today)
    const unit = h.type === 'daily' ? '天' : h.unit || '次'
    const ms = monthStats(h, map, y, m, today)

    const card = el(
      'div',
      { class: 'card habit-card' },
      el(
        'div',
        { class: 'hc-head' },
        el('div', { class: 'tile', style: { background: hexAlpha(h.color, 0.16) } }, h.emoji),
        el(
          'div',
          { class: 'hc-main' },
          el('div', { class: 'hc-name' }, h.name),
          el(
            'div',
            { class: 'hc-meta' },
            `本月 ${ms.done}/${ms.elapsed} 天`,
            el('span', { class: 'dot' }, '·'),
            `连续 ${cur} 天`,
          ),
        ),
        el(
          'button',
          { class: 'hc-edit', 'aria-label': '编辑', onclick: () => actions.openHabit(h) },
          icon('chevron', 16),
        ),
      ),
      monthCalendar(h, map, y, m, today, actions),
      el(
        'div',
        { class: 'hc-foot' },
        `累计 ${cum} ${unit}`,
        el('span', { class: 'dot' }, '·'),
        `最长连续 ${best} 天`,
      ),
    )

    const rw = rewardsInline(h, map, today, actions.claim)
    if (rw) card.appendChild(rw)

    page.appendChild(card)
  }

  page.appendChild(el('div', { class: 'footer-space' }))
  return page
}

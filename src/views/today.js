import { el, icon } from '../dom.js'
import {
  amountOf,
  claimableRewards,
  cumulativeOf,
  currentStreak,
  isDoneOn,
} from '../lib/stats.js'
import { formatDateCN } from '../lib/date.js'
import { hexAlpha } from '../lib/color.js'

function habitRow(h, ctx, done) {
  const { map, today, actions, flash } = ctx
  const amount = amountOf(map, h.id, today)
  const target = h.type === 'daily' ? 1 : Math.max(1, h.dailyTarget ?? 1)
  const ratio = Math.min(1, amount / target)
  const streak = currentStreak(h, map, today)
  const cum = cumulativeOf(h, map)

  const subParts = []
  if (streak > 0) subParts.push(`连续 ${streak} 天`)
  subParts.push(h.type === 'daily' ? `累计 ${cum} 天` : `累计 ${cum} ${h.unit || '次'}`)

  const isFlashing = flash && flash.habitId === h.id

  let control
  if (h.type === 'daily') {
    control = el(
      'button',
      {
        class: `check${done ? ' done' : ''}${isFlashing ? ' pop' : ''}`,
        style: done ? { background: h.color, borderColor: h.color } : undefined,
        'aria-label': done ? `取消${h.name}打卡` : `${h.name}打卡`,
        onclick: (e) => {
          e.stopPropagation()
          actions.toggle(h)
        },
      },
      icon('check', 17),
    )
  } else if (amount === 0) {
    control = el(
      'button',
      {
        class: `check${isFlashing ? ' pop' : ''}`,
        style: { borderColor: hexAlpha(h.color, 0.5) },
        'aria-label': `${h.name}打卡`,
        onclick: (e) => {
          e.stopPropagation()
          actions.inc(h)
        },
      },
      icon('check', 17),
    )
  } else {
    control = el(
      'div',
      { class: 'stepper', onclick: (e) => e.stopPropagation() },
      el(
        'button',
        {
          'aria-label': '减一',
          onclick: (e) => {
            e.stopPropagation()
            actions.dec(h)
          },
        },
        '−',
      ),
      el(
        'span',
        { class: `num${done ? ' full' : ''}`, style: done ? { color: h.color } : undefined },
        `${amount}/${target}`,
      ),
      el(
        'button',
        {
          'aria-label': '加一',
          onclick: (e) => {
            e.stopPropagation()
            actions.inc(h)
          },
        },
        '+',
      ),
    )
  }

  return el(
    'div',
    {
      class: 'row tappable',
      role: 'button',
      onclick: () => actions.openHabit(h),
    },
    el('div', { class: 'tile', style: { background: hexAlpha(h.color, 0.16) } }, h.emoji),
    el(
      'div',
      { class: 'row-main' },
      el('div', { class: 'row-title', style: { opacity: done ? '0.55' : '1' } }, h.name),
      el('div', { class: 'row-sub' }, subParts.join(' · ')),
      h.type === 'count'
        ? el(
            'div',
            { class: 'mini-bar' },
            el('i', { style: { width: `${ratio * 100}%`, background: h.color } }),
          )
        : null,
    ),
    control,
  )
}

export function todayView(ctx) {
  const { habits, map, today, todayDate, actions } = ctx
  const active = habits.filter((h) => !h.archived)

  const pending = []
  const done = []
  for (const h of active) {
    if (isDoneOn(h, amountOf(map, h.id, today))) done.push(h)
    else pending.push(h)
  }

  const total = active.length

  const page = el(
    'div',
    { class: 'page' },
    el(
      'div',
      { class: 'head' },
      el(
        'div',
        {},
        el('p', { class: 'subtitle' }, formatDateCN(todayDate)),
        el('h1', { class: 'large-title' }, '今天'),
      ),
      el(
        'div',
        { class: 'head-actions' },
        el(
          'button',
          { class: 'icon-btn muted', 'aria-label': '设置', onclick: actions.openSettings },
          icon('gear', 19),
        ),
        el(
          'button',
          { class: 'icon-btn', 'aria-label': '新建事项', onclick: actions.openCreate },
          icon('plus', 19),
        ),
      ),
    ),
  )

  if (total === 0) {
    page.appendChild(
      el(
        'div',
        { class: 'card', style: { marginTop: '16px' } },
        el(
          'div',
          { class: 'empty' },
          el('div', { class: 'big' }, '🌱'),
          '还没有要打卡的事项',
          el('div', { class: 'hintline' }, '点右上角的 + 添加第一个'),
        ),
      ),
    )
    return page
  }

  // 有奖励解锁时，在顶部提示一次，点击跳到进度页
  const claimable = claimableRewards(active, map, today)
  if (claimable.length > 0) {
    page.appendChild(
      el(
        'button',
        { class: 'reward-banner', onclick: actions.goStats },
        el('span', { class: 'rb-emoji' }, '🎉'),
        el(
          'span',
          { class: 'rb-text' },
          `有 ${claimable.length} 个奖励可以领取`,
          el('span', { class: 'rb-sub' }, claimable.map((c) => c.rule.title).join(' · ')),
        ),
        el('span', { class: 'rb-arrow' }, icon('chevron', 16)),
      ),
    )
  }

  if (pending.length > 0) {
    page.appendChild(
      el(
        'div',
        { class: 'section-title' },
        '待完成',
        el('span', { class: 'count' }, String(pending.length)),
      ),
    )
    const list = el('div', { class: 'list' })
    for (const h of pending) list.appendChild(habitRow(h, ctx, false))
    page.appendChild(list)
  }

  if (done.length > 0) {
    page.appendChild(
      el(
        'div',
        { class: 'section-title' },
        '已完成',
        el('span', { class: 'count' }, String(done.length)),
      ),
    )
    const list = el('div', { class: 'list' })
    for (const h of done) list.appendChild(habitRow(h, ctx, true))
    page.appendChild(list)
  }

  page.appendChild(el('div', { class: 'footer-space' }))
  return page
}

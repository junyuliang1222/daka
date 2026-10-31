import { el, icon } from '../dom.js'
import { formatKeyCN } from '../lib/date.js'
import { hexAlpha } from '../lib/color.js'

/**
 * 补打卡弹层：编辑某个事项在指定日期的完成情况
 * @param habit   事项
 * @param date    YYYY-MM-DD
 * @param amount  当天当前次数
 * @param isToday 是否今天
 * @param onSet   (newAmount) => void  立即生效
 * @param onClose () => void
 */
export function dayEditorSheet({ habit, date, amount, isToday, onSet, onClose }) {
  const target = habit.type === 'daily' ? 1 : Math.max(1, habit.dailyTarget ?? 1)
  const unit = habit.type === 'daily' ? '次' : habit.unit || '次'

  let current = amount

  const backdrop = el('div', { class: 'sheet-backdrop' })
  const sheet = el('div', { class: 'sheet' })
  backdrop.appendChild(sheet)
  backdrop.addEventListener('click', onClose)
  sheet.addEventListener('click', (e) => e.stopPropagation())

  sheet.appendChild(el('div', { class: 'sheet-grabber' }))
  sheet.appendChild(
    el(
      'div',
      { class: 'sheet-head' },
      el('button', { class: 'text-btn muted', onclick: onClose }, '关闭'),
      el('h2', {}, isToday ? '今天' : '补打卡'),
      el('span', { style: { width: '34px' } }),
    ),
  )

  // 事项信息
  sheet.appendChild(
    el(
      'div',
      { class: 'day-head' },
      el('div', { class: 'tile', style: { background: hexAlpha(habit.color, 0.16) } }, habit.emoji),
      el(
        'div',
        { class: 'day-head-main' },
        el('div', { class: 'day-name' }, habit.name),
        el(
          'div',
          { class: 'day-date' },
          formatKeyCN(date),
          habit.type === 'count' ? el('span', { class: 'dot' }, '·') : null,
          habit.type === 'count' ? `目标 ${target} ${unit}` : null,
        ),
      ),
    ),
  )

  // 控制区
  const control = el('div', { class: 'day-control' })
  sheet.appendChild(control)

  const actions = el('div', { class: 'sheet-actions' })
  sheet.appendChild(actions)

  function apply(next) {
    const clamped = Math.max(0, Math.min(next, 999))
    if (clamped === current) return
    current = clamped
    onSet(current)
    update()
  }

  function update() {
    control.replaceChildren()
    actions.replaceChildren()

    if (habit.type === 'daily') {
      const done = current >= 1
      control.appendChild(
        el(
          'div',
          { class: `day-state${done ? ' on' : ''}`, style: done ? { color: habit.color } : undefined },
          el('span', { class: 'day-state-ico' }, done ? icon('check', 20) : icon('plus', 20)),
          done ? '已打卡' : '还没打卡',
        ),
      )
      actions.appendChild(
        el(
          'button',
          {
            class: done ? 'btn-secondary' : 'btn-primary',
            onclick: () => apply(done ? 0 : 1),
          },
          done ? '取消这天的打卡' : '标记为已打卡',
        ),
      )
      return
    }

    // 多次计数型
    const ratio = Math.min(1, current / target)
    control.appendChild(
      el(
        'div',
        { class: 'big-stepper' },
        el('button', { 'aria-label': '减一', onclick: () => apply(current - 1) }, '−'),
        el(
          'span',
          { class: 'val', style: current >= target ? { color: habit.color } : undefined },
          String(current),
          el('small', {}, ` / ${target} ${unit}`),
        ),
        el('button', { 'aria-label': '加一', onclick: () => apply(current + 1) }, '+'),
      ),
    )

    control.appendChild(
      el(
        'div',
        { class: 'mini-bar', style: { maxWidth: 'none', height: '5px', marginTop: '10px' } },
        el('i', { style: { width: `${ratio * 100}%`, background: habit.color } }),
      ),
    )

    const statusLine = el(
      'div',
      { class: 'day-status' },
      current >= target
        ? el('span', { style: { color: habit.color, fontWeight: '600' } }, '✓ 这天算完成')
        : current > 0
          ? `还差 ${target - current} ${unit}`
          : '这天还没有记录',
    )
    control.appendChild(statusLine)

    actions.appendChild(el('button', { class: 'btn-secondary', onclick: () => apply(0) }, '清零'))
    actions.appendChild(
      el('button', { class: 'btn-primary', onclick: () => apply(target) }, '标记完成'),
    )
  }

  update()
  sheet.appendChild(el('div', { class: 'footer-space' }))
  return backdrop
}

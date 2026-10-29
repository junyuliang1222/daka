import { el, icon } from '../dom.js'

export function settingsSheet({ data, onExport, onImportText, onClose }) {
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
      el('h2', {}, '设置'),
      el('span', { style: { width: '34px' } }),
    ),
  )

  const fileInput = el('input', { type: 'file', accept: 'application/json,.json', class: 'hidden-input' })
  fileInput.addEventListener('change', async (e) => {
    const file = e.target.files && e.target.files[0]
    if (!file) return
    try {
      const text = await file.text()
      onImportText(text)
    } catch {
      onImportText(null)
    } finally {
      e.target.value = ''
    }
  })
  sheet.appendChild(fileInput)

  sheet.appendChild(el('div', { class: 'section-title', style: { marginTop: '0' } }, '数据备份'))

  const rowBtn = (emoji, title, sub, onclick) =>
    el(
      'button',
      { class: 'row tappable', onclick },
      el('div', { class: 'tile', style: { background: 'var(--fill-4)' } }, emoji),
      el(
        'div',
        { class: 'row-main' },
        el('div', { class: 'row-title' }, title),
        el('div', { class: 'row-sub' }, sub),
      ),
      el('span', { style: { color: 'var(--label-3)', display: 'inline-flex' } }, icon('chevron', 16)),
    )

  const list = el('div', { class: 'list' })
  list.appendChild(
    rowBtn(
      '⬇️',
      '导出备份',
      `当前 ${data.habits.length} 个事项 · ${data.checkins.length} 条记录`,
      () => onExport(),
    ),
  )
  list.appendChild(rowBtn('⬆️', '从备份恢复', '会覆盖当前所有数据，请先导出', () => fileInput.click()))
  sheet.appendChild(list)

  sheet.appendChild(el('div', { class: 'section-title' }, '关于数据'))
  sheet.appendChild(
    el(
      'div',
      { class: 'card' },
      el(
        'div',
        { class: 'note' },
        '所有打卡记录只存在这台手机里，不会上传到任何服务器。',
        el('br', {}),
        '建议每隔一段时间导出一份备份，存到「文件」App 或发给自己，防止系统清理网页数据。',
      ),
    ),
  )

  sheet.appendChild(el('div', { class: 'footer-space' }))
  sheet.appendChild(el('div', { class: 'footer-space' }))

  return backdrop
}

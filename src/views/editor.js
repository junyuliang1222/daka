import { el } from '../dom.js'
import { uid } from '../lib/store.js'

const EMOJIS = [
  '☀️', '🌙', '💧', '🍎', '📖', '📚', '🏃', '💪',
  '🧘', '✍️', '🎸', '🎨', '🧹', '💊', '🚭', '💰',
  '🌱', '🐱', '☕️', '🚴',
]

const COLORS = [
  '#FF9F0A', '#FF3B30', '#FF2D55', '#AF52DE',
  '#5856D6', '#32ADE6', '#0A84FF', '#34C759', '#8E8E93',
]

export function editorSheet({ initial, onSave, onDelete, onClose }) {
  const form = {
    name: initial?.name ?? '',
    emoji: initial?.emoji ?? '☀️',
    color: initial?.color ?? '#FF9F0A',
    type: initial?.type ?? 'daily',
    dailyTarget: String(initial?.dailyTarget ?? 8),
    unit: initial?.unit ?? '次',
    totalTarget: initial?.totalTarget ? String(initial.totalTarget) : '',
    encText: (initial?.encouragements ?? []).join('\n'),
    // 新建时给一条空奖励，直接就能看到并拖动滑块
    rewards: initial?.rewards
      ? initial.rewards.map((r) => ({ ...r }))
      : [{ id: uid(), title: '', kind: 'total', threshold: 30 }],
    milestones: (initial?.milestones ?? []).map((m) => ({ ...m })),
  }
  if (form.type === 'daily') form.dailyTarget = '1'

  const backdrop = el('div', { class: 'sheet-backdrop' })
  const sheet = el('div', { class: 'sheet' })
  backdrop.appendChild(sheet)
  backdrop.addEventListener('click', onClose)
  sheet.addEventListener('click', (e) => e.stopPropagation())

  /* ---- 头部 ---- */
  const saveBtn = el('button', { class: 'text-btn strong', onclick: () => submit() }, '保存')
  sheet.appendChild(el('div', { class: 'sheet-grabber' }))
  sheet.appendChild(
    el(
      'div',
      { class: 'sheet-head' },
      el('button', { class: 'text-btn muted', onclick: onClose }, '取消'),
      el('h2', {}, initial ? '编辑事项' : '新建事项'),
      saveBtn,
    ),
  )

  /* ---- 名称 ---- */
  sheet.appendChild(
    el(
      'div',
      { class: 'form-group' },
      el('label', { class: 'form-label' }, '名称'),
      el('input', {
        class: 'field',
        value: form.name,
        placeholder: '比如：早起、喝水、背单词',
        maxlength: '24',
        oninput: (e) => {
          form.name = e.target.value
          syncSaveState()
        },
      }),
    ),
  )

  /* ---- 图标 ---- */
  const emojiChips = el('div', { class: 'chips' })
  const emojiButtons = EMOJIS.map((emoji) => {
    const b = el(
      'button',
      {
        class: `chip${form.emoji === emoji ? ' on' : ''}`,
        onclick: () => {
          form.emoji = emoji
          emojiButtons.forEach((btn) => btn.classList.toggle('on', btn.textContent === emoji))
        },
      },
      emoji,
    )
    return b
  })
  emojiButtons.forEach((b) => emojiChips.appendChild(b))
  sheet.appendChild(
    el('div', { class: 'form-group' }, el('label', { class: 'form-label' }, '图标'), emojiChips),
  )

  /* ---- 主题色 ---- */
  const colorRow = el('div', { class: 'chips' })
  const colorButtons = COLORS.map((c) => {
    const b = el('button', {
      class: `swatch${form.color === c ? ' on' : ''}`,
      style: { background: c },
      'aria-label': c,
      onclick: () => {
        form.color = c
        colorButtons.forEach((btn) => btn.classList.toggle('on', btn.dataset.c === c))
      },
    })
    b.dataset.c = c
    return b
  })
  colorButtons.forEach((b) => colorRow.appendChild(b))
  sheet.appendChild(
    el('div', { class: 'form-group' }, el('label', { class: 'form-label' }, '主题色'), colorRow),
  )

  /* ---- 打卡方式 ---- */
  const dailyBtn = el('button', { class: form.type === 'daily' ? 'on' : '' }, '每天一次')
  const countBtn = el('button', { class: form.type === 'count' ? 'on' : '' }, '一天多次计数')
  const targetRow = el('div', { class: 'form-group' })

  const setType = (t) => {
    form.type = t
    dailyBtn.classList.toggle('on', t === 'daily')
    countBtn.classList.toggle('on', t === 'count')
    targetRow.style.display = t === 'count' ? '' : 'none'
    // 累计型奖励的单位文案依赖打卡方式，重建一次
    if (typeof rebuildRewards === 'function') rebuildRewards()
  }
  dailyBtn.addEventListener('click', () => setType('daily'))
  countBtn.addEventListener('click', () => setType('count'))

  sheet.appendChild(
    el(
      'div',
      { class: 'form-group' },
      el('label', { class: 'form-label' }, '打卡方式'),
      el('div', { class: 'seg' }, dailyBtn, countBtn),
    ),
  )

  /* ---- 每日目标 ---- */
  targetRow.appendChild(el('label', { class: 'form-label' }, '每日目标'))
  targetRow.appendChild(
    el(
      'div',
      { class: 'inline-fields' },
      el('input', {
        class: 'field',
        inputmode: 'numeric',
        value: form.dailyTarget,
        placeholder: '8',
        oninput: (e) => {
          form.dailyTarget = e.target.value.replace(/[^\d]/g, '')
          e.target.value = form.dailyTarget
        },
      }),
      el('input', {
        class: 'field',
        value: form.unit,
        placeholder: '杯 / 个 / 页',
        oninput: (e) => {
          form.unit = e.target.value
        },
      }),
    ),
  )
  targetRow.style.display = form.type === 'count' ? '' : 'none'
  sheet.appendChild(targetRow)

  /* ---- 累计目标 ---- */
  sheet.appendChild(
    el(
      'div',
      { class: 'form-group' },
      el('label', { class: 'form-label' }, '累计目标（可选）'),
      el('input', {
        class: 'field',
        inputmode: 'numeric',
        value: form.totalTarget,
        placeholder: '比如读 600 页、跑 100 公里',
        oninput: (e) => {
          form.totalTarget = e.target.value.replace(/[^\d]/g, '')
          e.target.value = form.totalTarget
        },
      }),
    ),
  )

  /* ---- 鼓励语 ---- */
  sheet.appendChild(
    el(
      'div',
      { class: 'form-group' },
      el('label', { class: 'form-label' }, '鼓励自己的话（每行一句）'),
      el('textarea', {
        class: 'field',
        rows: '3',
        placeholder: '把早晨留给自己，一整天都从容。\n你今天没有辜负自己。',
        oninput: (e) => {
          form.encText = e.target.value
        },
      }, form.encText),
    ),
  )

  /* ---- 里程碑 ---- */
  const milestoneList = el('div', {})
  const rebuildMilestones = () => {
    milestoneList.replaceChildren()
    form.milestones.forEach((m, i) => {
      milestoneList.appendChild(
        el(
          'div',
          { class: 'reward-edit' },
          el('input', {
            class: 'field tiny',
            inputmode: 'numeric',
            value: m.day ? String(m.day) : '',
            placeholder: '7',
            oninput: (e) => {
              // 允许临时清空，保存时才兜底成 1
              const raw = e.target.value.replace(/[^\d]/g, '')
              form.milestones[i].day = raw === '' ? 0 : Number(raw)
              if (e.target.value !== raw) e.target.value = raw
            },
          }),
          el('input', {
            class: 'field',
            value: m.text,
            placeholder: '第 N 天想对自己说的话',
            oninput: (e) => {
              form.milestones[i].text = e.target.value
            },
          }),
          el(
            'button',
            {
              class: 'remove-btn',
              'aria-label': '删除',
              onclick: () => {
                form.milestones.splice(i, 1)
                rebuildMilestones()
              },
            },
            '×',
          ),
        ),
      )
    })
  }
  rebuildMilestones()

  sheet.appendChild(
    el(
      'div',
      { class: 'form-group' },
      el('label', { class: 'form-label' }, '里程碑专属鼓励（可选）'),
      milestoneList,
      el(
        'button',
        {
          class: 'btn-secondary',
          onclick: () => {
            form.milestones.push({ day: 7, text: '' })
            rebuildMilestones()
          },
        },
        '加一条里程碑',
      ),
    ),
  )

  /* ---- 奖励 ---- */
  const rewardList = el('div', {})

  // 连续型看天数，累计型看次数/天数
  const unitFor = (kind) => (kind === 'streak' ? '天' : form.type === 'count' ? '次' : '天')
  // 滑块的量程固定 1-30；已有值超出 30 时自动放宽，避免把老数据卡掉
  const maxFor = (kind, value) => Math.max(30, value)

  const buildRewardBlock = (r, i) => {
    const unit = unitFor(r.kind)
    const max = maxFor(r.kind, r.threshold)

    const valueLabel = el('span', { class: 're-val' }, `${r.threshold} ${unit}`)

    const slider = el('input', {
      type: 'range',
      class: 'slider',
      min: '1',
      max: String(max),
      step: '1',
      value: String(Math.min(r.threshold, max)),
      'aria-label': '达成次数',
    })

    const paint = () => {
      const pct = ((Number(slider.value) - 1) / (max - 1)) * 100
      slider.style.background = `linear-gradient(to right, var(--accent) ${pct}%, var(--fill-3) ${pct}%)`
    }
    slider.addEventListener('input', () => {
      form.rewards[i].threshold = Number(slider.value)
      valueLabel.textContent = `${form.rewards[i].threshold} ${unitFor(form.rewards[i].kind)}`
      paint()
    })
    paint()

    const kindSelect = el(
      'select',
      {
        class: 'field re-kind',
        onchange: (e) => {
          const nextKind = e.target.value
          form.rewards[i].kind = nextKind
          const nextMax = maxFor(nextKind, form.rewards[i].threshold)
          if (form.rewards[i].threshold > nextMax) form.rewards[i].threshold = nextMax
          rebuildRewards()
        },
      },
      el('option', { value: 'total' }, '累计'),
      el('option', { value: 'streak' }, '连续'),
    )
    kindSelect.value = r.kind

    const block = el(
      'div',
      { class: 'reward-block' },
      el(
        'div',
        { class: 're-top' },
        el('input', {
          class: 'field',
          value: r.title,
          placeholder: '比如：奖励自己一杯咖啡',
          oninput: (e) => {
            form.rewards[i].title = e.target.value
          },
        }),
        el(
          'button',
          {
            class: 'remove-btn',
            'aria-label': '删除奖励',
            onclick: () => {
              form.rewards.splice(i, 1)
              rebuildRewards()
            },
          },
          '×',
        ),
      ),
      el(
        'div',
        { class: 're-bottom' },
        kindSelect,
        el('span', { class: 're-mid' }, '满'),
        valueLabel,
      ),
      slider,
      el(
        'div',
        { class: 're-scale' },
        el('span', {}, '1'),
        el('span', {}, String(max)),
      ),
    )

    return block
  }

  const rebuildRewards = () => {
    rewardList.replaceChildren()
    form.rewards.forEach((r, i) => rewardList.appendChild(buildRewardBlock(r, i)))
  }
  rebuildRewards()

  sheet.appendChild(
    el(
      'div',
      { class: 'form-group' },
      el('label', { class: 'form-label' }, '奖励（达成后点亮，可手动领取）'),
      rewardList,
      el(
        'button',
        {
          class: 'btn-secondary',
          onclick: () => {
            form.rewards.push({ id: uid(), title: '', kind: 'total', threshold: 30 })
            rebuildRewards()
          },
        },
        '加一个奖励',
      ),
    ),
  )

  /* ---- 提交 ---- */
  const primaryBtn = el('button', { class: 'btn-primary', onclick: () => submit() }, initial ? '保存修改' : '创建事项')
  sheet.appendChild(primaryBtn)

  if (initial && onDelete) {
    sheet.appendChild(
      el(
        'div',
        { class: 'btn-row' },
        el(
          'button',
          {
            class: 'btn-danger',
            onclick: () => {
              if (confirm(`确定删除「${initial.name}」吗？所有相关打卡记录也会一起删除。`)) {
                onDelete(initial.id)
              }
            },
          },
          '删除这个事项',
        ),
      ),
    )
  }

  sheet.appendChild(el('div', { class: 'footer-space' }))

  function syncSaveState() {
    const ok = form.name.trim().length > 0
    saveBtn.style.opacity = ok ? '1' : '0.35'
    primaryBtn.disabled = !ok
  }
  syncSaveState()

  function submit() {
    if (!form.name.trim()) return
    const habit = {
      id: initial?.id ?? uid(),
      name: form.name.trim(),
      emoji: form.emoji,
      color: form.color,
      type: form.type,
      dailyTarget: form.type === 'count' ? Math.max(1, Number(form.dailyTarget) || 1) : 1,
      unit: form.unit.trim() || '次',
      totalTarget: form.totalTarget ? Math.max(1, Number(form.totalTarget) || 0) : undefined,
      encouragements: form.encText
        .split('\n')
        .map((s) => s.trim())
        .filter(Boolean),
      milestones: form.milestones
        .filter((m) => m.text.trim().length > 0)
        .map((m) => ({ day: Math.max(1, Math.round(m.day || 1)), text: m.text.trim() })),
      rewards: form.rewards
        .filter((r) => r.title.trim().length > 0)
        .map((r) => ({
          id: r.id ?? uid(),
          title: r.title.trim(),
          kind: r.kind,
          threshold: Math.max(1, Math.round(r.threshold || 1)),
          claimedAt: r.claimedAt,
        })),
      createdAt: initial?.createdAt ?? new Date().toISOString(),
      archived: initial?.archived ?? false,
    }
    onSave(habit)
  }

  return backdrop
}

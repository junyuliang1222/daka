/* 极简 DOM 构建工具，替代 JSX */

export function el(tag, props, ...children) {
  const node = document.createElement(tag)

  if (props) {
    for (const [key, val] of Object.entries(props)) {
      if (val === null || val === undefined || val === false) continue
      if (key === 'class') node.className = val
      else if (key === 'style') {
        if (typeof val === 'string') node.style.cssText = val
        else Object.assign(node.style, val)
      } else if (key === 'html') node.innerHTML = val
      else if (key === 'dataset') Object.assign(node.dataset, val)
      else if (key.startsWith('on') && typeof val === 'function') {
        node.addEventListener(key.slice(2).toLowerCase(), val)
      } else {
        node.setAttribute(key, val === true ? '' : String(val))
      }
    }
  }

  appendChildren(node, children)
  return node
}

function appendChildren(node, children) {
  for (const child of children) {
    if (child === null || child === undefined || child === false || child === '') continue
    if (Array.isArray(child)) appendChildren(node, child)
    else if (child instanceof Node) node.appendChild(child)
    else node.appendChild(document.createTextNode(String(child)))
  }
}

/* ---------- 图标 ---------- */

const ICONS = {
  check: '<path d="M4.5 12.6l5 5L19.5 6.8" stroke="currentColor" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round" fill="none"/>',
  plus: '<path d="M12 5v14M5 12h14" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" fill="none"/>',
  gear:
    '<circle cx="12" cy="12" r="3" stroke="currentColor" stroke-width="1.8" fill="none"/>' +
    '<path d="M12 3.2v2.1M12 18.7v2.1M20.8 12h-2.1M5.3 12H3.2M18.2 5.8l-1.5 1.5M7.3 16.7l-1.5 1.5M18.2 18.2l-1.5-1.5M7.3 7.3L5.8 5.8" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" fill="none"/>',
  today:
    '<circle cx="12" cy="12" r="8.2" stroke="currentColor" stroke-width="1.7" fill="none"/>' +
    '<path d="M8.4 12.3l2.4 2.4 4.8-5" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" fill="none"/>',
  stats:
    '<rect x="3.6" y="12.5" width="4" height="8" rx="1.4" stroke="currentColor" stroke-width="1.7" fill="none"/>' +
    '<rect x="10" y="8" width="4" height="12.5" rx="1.4" stroke="currentColor" stroke-width="1.7" fill="none"/>' +
    '<rect x="16.4" y="3.5" width="4" height="17" rx="1.4" stroke="currentColor" stroke-width="1.7" fill="none"/>',
  chevron: '<path d="M9 5l7 7-7 7" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none"/>',
}

export function icon(name, size = 25) {
  const span = document.createElement('span')
  span.className = 'ico'
  span.innerHTML = `<svg width="${size}" height="${size}" viewBox="0 0 24 24" aria-hidden="true">${
    ICONS[name] || ''
  }</svg>`
  return span
}

/** 绘制进度环 */
export function ringSvg({ value, size = 74, stroke = 7, color = 'var(--accent)', track = 'var(--fill-3)' }) {
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  const pct = Math.max(0, Math.min(1, value))
  const ns = 'http://www.w3.org/2000/svg'
  const svg = document.createElementNS(ns, 'svg')
  svg.setAttribute('width', String(size))
  svg.setAttribute('height', String(size))
  svg.setAttribute('viewBox', `0 0 ${size} ${size}`)

  const mk = (strokeColor, dashOffset, extra) => {
    const circle = document.createElementNS(ns, 'circle')
    circle.setAttribute('cx', String(size / 2))
    circle.setAttribute('cy', String(size / 2))
    circle.setAttribute('r', String(r))
    circle.setAttribute('fill', 'none')
    circle.setAttribute('stroke', strokeColor)
    circle.setAttribute('stroke-width', String(stroke))
    if (extra) extra(circle)
    return circle
  }

  svg.appendChild(mk(track))
  svg.appendChild(
    mk(color, 0, (circle) => {
      circle.setAttribute('stroke-linecap', 'round')
      circle.setAttribute('stroke-dasharray', String(c))
      circle.setAttribute('stroke-dashoffset', String(c * (1 - pct)))
      circle.setAttribute('transform', `rotate(-90 ${size / 2} ${size / 2})`)
      circle.style.transition = 'stroke-dashoffset .55s cubic-bezier(.22,1,.36,1)'
    }),
  )
  return svg
}

/** 环形进度 + 中心文字 */
export function ring({ value, size = 74, stroke = 7, color, label }) {
  const wrap = el('div', { style: { position: 'relative', width: `${size}px`, height: `${size}px`, flex: '0 0 auto' } })
  wrap.appendChild(ringSvg({ value, size, stroke, color }))
  wrap.appendChild(
    el(
      'div',
      {
        style: {
          position: 'absolute',
          inset: '0',
          display: 'grid',
          placeItems: 'center',
          fontSize: `${Math.round(size * 0.26)}px`,
          fontWeight: '700',
          letterSpacing: '-0.3px',
          fontVariantNumeric: 'tabular-nums',
        },
      },
      label,
    ),
  )
  return wrap
}

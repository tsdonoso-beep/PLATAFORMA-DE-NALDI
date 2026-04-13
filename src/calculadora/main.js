import JXG from 'jsxgraph'
import { createBoard, attachResizeObserver } from '../shared/js/board-factory.js'
import { formatNumber } from '../shared/js/utils.js'

document.getElementById('footer-year').textContent = new Date().getFullYear()

// ── Palette ────────────────────────────────────────────────────────────────
const COLORS = ['#00529B', '#e07b00', '#2a7d4f', '#9b0045', '#6b21a8', '#0e7490']
const FN_COUNT = 6

// ── Board ──────────────────────────────────────────────────────────────────
const board = createBoard('board-calc', {
  bbox: [-10, 10, 10, -10],
  keepAspectRatio: false,
  axis: true,
  grid: true,
})

// ── State ──────────────────────────────────────────────────────────────────
let mode = 'cartesian'   // 'cartesian' | 'polar' | 'parametric'
let focusedRow = 0       // which fn row the keyboard targets

// Each slot: { expr, enabled, curve, color, fn }
const slots = []

// Active tool overlay objects
let toolOverlays = []    // JSXGraph objects to remove on next tool run
let integralShade = null

// ── Function parser ────────────────────────────────────────────────────────
function parseExpr(expr, variable = 'x') {
  // Replace ^ with ** for JessieCode, support PI / E constants
  const cleaned = expr.trim()
  if (!cleaned) return null
  try {
    const fn = board.jc.snippet(cleaned, true, variable, true)
    // Quick test — throws if invalid
    fn(0)
    return fn
  } catch {
    return null
  }
}

// Numerical derivative (central differences)
function derivative(fn, x, h = 1e-4) {
  return (fn(x + h) - fn(x - h)) / (2 * h)
}

// Numerical integral (Simpson's rule)
function integrate(fn, a, b, n = 500) {
  if (n % 2 !== 0) n++
  const h = (b - a) / n
  let sum = fn(a) + fn(b)
  for (let i = 1; i < n; i++) {
    sum += fn(a + i * h) * (i % 2 === 0 ? 2 : 4)
  }
  return (h / 3) * sum
}

// Find roots of fn in [a,b] via bisection sampling
function findRoots(fn, a, b, steps = 2000) {
  const roots = []
  const dx = (b - a) / steps
  let prev = fn(a)
  for (let i = 1; i <= steps; i++) {
    const x1 = a + (i - 1) * dx
    const x2 = a + i * dx
    const curr = fn(x2)
    if (isNaN(prev) || isNaN(curr)) { prev = curr; continue }
    if (prev * curr <= 0) {
      // bisect
      let lo = x1, hi = x2
      for (let k = 0; k < 48; k++) {
        const mid = (lo + hi) / 2
        if (fn(mid) * fn(lo) <= 0) hi = mid; else lo = mid
      }
      const root = (lo + hi) / 2
      if (roots.length === 0 || Math.abs(root - roots[roots.length - 1]) > 0.01) {
        roots.push(root)
      }
    }
    prev = curr
  }
  return roots
}

// Find local extrema via sign change of derivative
function findExtrema(fn, a, b, steps = 1000) {
  const pts = []
  const dx = (b - a) / steps
  let prevD = derivative(fn, a)
  for (let i = 1; i <= steps; i++) {
    const x = a + i * dx
    const d = derivative(fn, x)
    if (prevD * d < 0) {
      // sign change → extremum between x-dx and x
      let lo = x - dx, hi = x
      for (let k = 0; k < 48; k++) {
        const mid = (lo + hi) / 2
        if (derivative(fn, lo) * derivative(fn, mid) <= 0) hi = mid; else lo = mid
      }
      const xm = (lo + hi) / 2
      pts.push({ x: xm, y: fn(xm), type: prevD > 0 ? 'max' : 'min' })
    }
    prevD = d
  }
  return pts
}

// ── Build function rows ────────────────────────────────────────────────────
function getVariable() {
  if (mode === 'polar') return 'theta'
  if (mode === 'parametric') return 't'
  return 'x'
}

function rebuildCurves() {
  slots.forEach((s, i) => {
    if (s.curve) { try { board.removeObject(s.curve) } catch {} s.curve = null }
    if (s.tracePoint) { try { board.removeObject(s.tracePoint) } catch {} s.tracePoint = null }
    if (!s.enabled || !s.expr.trim()) return

    const color = s.color
    try {
      if (mode === 'cartesian') {
        const fn = parseExpr(s.expr, 'x')
        if (!fn) return
        s.fn = fn
        s.curve = board.create('functiongraph', [fn, -100, 100], {
          strokeColor: color, strokeWidth: 2.2, highlight: false,
        })
        // Glider for trace
        s.tracePoint = board.create('glider', [0, 0, s.curve], {
          name: '', size: 5, fillColor: color, strokeColor: '#fff',
          strokeWidth: 1.5, fixed: false, highlight: false, visible: false,
        })
        s.tracePoint.on('drag', () => updateTraceBar(i))

      } else if (mode === 'polar') {
        const rfn = parseExpr(s.expr, 'theta')
        if (!rfn) return
        s.fn = rfn
        s.curve = board.create('curve', [
          t => rfn(t) * Math.cos(t),
          t => rfn(t) * Math.sin(t),
          0, Math.PI * 4,
        ], { strokeColor: color, strokeWidth: 2.2, highlight: false })

      } else if (mode === 'parametric') {
        // expr format: "cos(t), sin(t)"  or  "t^2, t^3"
        const parts = s.expr.split(',')
        if (parts.length < 2) return
        const xfn = parseExpr(parts[0].trim(), 't')
        const yfn = parseExpr(parts.slice(1).join(',').trim(), 't')
        if (!xfn || !yfn) return
        s.fn = { x: xfn, y: yfn }
        const tMin = parseFloat(document.getElementById('sl-tmin').value)
        const tMax = parseFloat(document.getElementById('sl-tmax').value)
        s.curve = board.create('curve', [xfn, yfn, tMin, tMax], {
          strokeColor: color, strokeWidth: 2.2, highlight: false,
        })
      }

      markInput(i, true)
    } catch {
      markInput(i, false)
    }
  })
  board.update()
}

function markInput(i, valid) {
  const el = document.getElementById(`fn-input-${i}`)
  if (!el) return
  el.classList.toggle('fn-error', !valid)
}

// ── Build DOM rows ─────────────────────────────────────────────────────────
const DEFAULTS = ['x^2 - 4', 'sin(x) * 3', '', '', '', '']

function buildRows() {
  const list = document.getElementById('fn-list')
  list.innerHTML = ''

  for (let i = 0; i < FN_COUNT; i++) {
    slots[i] = slots[i] || { expr: DEFAULTS[i] || '', enabled: i < 2, color: COLORS[i], curve: null, tracePoint: null, fn: null }
    const s = slots[i]

    const row = document.createElement('div')
    row.className = 'fn-row'
    row.innerHTML = `
      <div class="fn-color-dot" id="fn-dot-${i}" style="background:${s.color}" title="Color Y${i+1}"></div>
      <input type="text" id="fn-input-${i}" class="fn-input-calc"
        value="${s.expr}" placeholder="Y${i+1}: ej. sin(x)" spellcheck="false"/>
      <label class="fn-toggle" title="Mostrar/Ocultar">
        <input type="checkbox" id="fn-chk-${i}" ${s.enabled ? 'checked' : ''}>
        <div class="fn-toggle-track"></div>
        <div class="fn-toggle-thumb"></div>
      </label>`
    list.appendChild(row)

    document.getElementById(`fn-input-${i}`).addEventListener('input', e => {
      slots[i].expr = e.target.value
      rebuildCurves()
    })
    document.getElementById(`fn-input-${i}`).addEventListener('focus', () => { focusedRow = i })
    document.getElementById(`fn-chk-${i}`).addEventListener('change', e => {
      slots[i].enabled = e.target.checked
      rebuildCurves()
    })
  }
}

// ── Math keyboard ──────────────────────────────────────────────────────────
document.getElementById('math-kb').addEventListener('click', e => {
  const btn = e.target.closest('[data-ins]')
  if (!btn) return
  const ins = btn.dataset.ins
  const el = document.getElementById(`fn-input-${focusedRow}`)
  if (!el) return
  const start = el.selectionStart, end = el.selectionEnd
  el.value = el.value.slice(0, start) + ins + el.value.slice(end)
  el.selectionStart = el.selectionEnd = start + ins.length
  el.focus()
  slots[focusedRow].expr = el.value
  rebuildCurves()
})

// ── Mode switching ─────────────────────────────────────────────────────────
document.getElementById('mode-tabs').addEventListener('click', e => {
  const tab = e.target.closest('[data-mode]')
  if (!tab) return
  mode = tab.dataset.mode
  document.querySelectorAll('.mode-tab').forEach(b => b.classList.toggle('active', b.dataset.mode === mode))

  // Update placeholders and defaults
  const pholders = {
    cartesian:  ['x^2 - 4', 'sin(x) * 3', '', '', '', ''],
    polar:      ['2 + cos(theta)', 'sin(2*theta)*3', '', '', '', ''],
    parametric: ['cos(t), sin(t)', '2*cos(t), sin(2*t)', '', '', '', ''],
  }
  slots.forEach((s, i) => {
    s.expr = pholders[mode][i] || ''
    s.enabled = i < 2
    const el = document.getElementById(`fn-input-${i}`)
    const chk = document.getElementById(`fn-chk-${i}`)
    if (el) el.value = s.expr
    if (chk) chk.checked = s.enabled
  })

  document.getElementById('parametric-extra').style.display = mode === 'parametric' ? '' : 'none'
  clearToolUI()
  rebuildCurves()
})

// ── Parametric t range ─────────────────────────────────────────────────────
;[['sl-tmin','val-tmin'],['sl-tmax','val-tmax']].forEach(([sid,vid]) => {
  document.getElementById(sid).addEventListener('input', () => {
    document.getElementById(vid).textContent = document.getElementById(sid).value
    rebuildCurves()
  })
})

// ── View controls ──────────────────────────────────────────────────────────
document.getElementById('btn-reset-view').addEventListener('click', () => {
  board.setBoundingBox([-10, 10, 10, -10], true)
  board.update()
})

document.getElementById('btn-fit').addEventListener('click', () => {
  // Find extent of active curves
  if (mode !== 'cartesian') return
  const activeFns = slots.filter(s => s.enabled && s.fn)
  if (activeFns.length === 0) return
  const bb = board.getBoundingBox()
  const xs = []
  activeFns.forEach(s => {
    for (let x = bb[0]; x <= bb[2]; x += (bb[2]-bb[0])/200) {
      const y = s.fn(x)
      if (isFinite(y)) xs.push(y)
    }
  })
  if (xs.length === 0) return
  const yMin = Math.min(...xs), yMax = Math.max(...xs)
  const pad = (yMax - yMin) * 0.1 || 1
  board.setBoundingBox([bb[0], yMax + pad, bb[2], yMin - pad], true)
  board.update()
})

// ── Trace bar ──────────────────────────────────────────────────────────────
function updateTraceBar(i) {
  const tp = slots[i].tracePoint
  if (!tp) return
  const x = tp.X(), y = tp.Y()
  document.getElementById('trace-bar').style.display = ''
  document.getElementById('trace-x').textContent = formatNumber(x, 4)
  document.getElementById('trace-y').textContent = formatNumber(y, 4)
  document.getElementById('trace-fn-label').innerHTML = `<span style="color:${COLORS[i]}">Y${i+1}</span>`
}

// Enable trace points on curve click
board.on('down', () => {
  slots.forEach(s => { if (s.tracePoint) s.tracePoint.setAttribute({ visible: true }) })
  board.update()
})

// ── Tool helpers ───────────────────────────────────────────────────────────
function clearToolUI() {
  toolOverlays.forEach(o => { try { board.removeObject(o) } catch {} })
  toolOverlays = []
  if (integralShade) { try { board.removeObject(integralShade) } catch {} integralShade = null }
  document.getElementById('tool-result').textContent = ''
  document.getElementById('integral-controls').style.display = 'none'
  document.getElementById('table-controls').style.display = 'none'
}

function getActiveFn() {
  // First enabled cartesian slot with valid fn
  return slots.find(s => s.enabled && s.fn && mode === 'cartesian') || null
}

function visibleRange() {
  const bb = board.getBoundingBox()
  return { xMin: bb[0], xMax: bb[2] }
}

// ── Tool: Roots ────────────────────────────────────────────────────────────
document.getElementById('btn-zeros').addEventListener('click', () => {
  clearToolUI()
  const s = getActiveFn()
  if (!s) { document.getElementById('tool-result').textContent = 'Selecciona una función en modo cartesiano.'; return }
  const { xMin, xMax } = visibleRange()
  const roots = findRoots(s.fn, xMin, xMax)
  if (roots.length === 0) {
    document.getElementById('tool-result').textContent = 'No se encontraron raíces en la vista actual.'
    return
  }
  roots.forEach(x => {
    const pt = board.create('point', [x, 0], {
      name: `x≈${formatNumber(x, 3)}`, fixed: true, size: 5,
      fillColor: s.color, strokeColor: '#fff', strokeWidth: 1.5, highlight: false,
      label: { offset: [0, 12], fontSize: 10, color: s.color },
    })
    toolOverlays.push(pt)
  })
  document.getElementById('tool-result').textContent = `Raíces: ${roots.map(r => formatNumber(r, 4)).join(', ')}`
  board.update()
})

// ── Tool: Intersections ───────────────────────────────────────────────────
document.getElementById('btn-intersect').addEventListener('click', () => {
  clearToolUI()
  const active = slots.filter(s => s.enabled && s.fn && mode === 'cartesian')
  if (active.length < 2) {
    document.getElementById('tool-result').textContent = 'Necesitas al menos 2 funciones activas.'
    return
  }
  const { xMin, xMax } = visibleRange()
  const diff = x => active[0].fn(x) - active[1].fn(x)
  const xs = findRoots(diff, xMin, xMax)
  if (xs.length === 0) {
    document.getElementById('tool-result').textContent = 'No se encontraron intersecciones en la vista.'
    return
  }
  const results = []
  xs.forEach(x => {
    const y = active[0].fn(x)
    const pt = board.create('point', [x, y], {
      name: `(${formatNumber(x,2)}, ${formatNumber(y,2)})`, fixed: true, size: 5,
      fillColor: '#FFD700', strokeColor: '#b8860b', strokeWidth: 1.5, highlight: false,
      label: { offset: [6, 8], fontSize: 10, color: '#7a5c00' },
    })
    toolOverlays.push(pt)
    results.push(`(${formatNumber(x,3)}, ${formatNumber(y,3)})`)
  })
  document.getElementById('tool-result').textContent = `Intersecciones: ${results.join(' | ')}`
  board.update()
})

// ── Tool: Extrema ──────────────────────────────────────────────────────────
document.getElementById('btn-extrema').addEventListener('click', () => {
  clearToolUI()
  const s = getActiveFn()
  if (!s) { document.getElementById('tool-result').textContent = 'Selecciona una función en modo cartesiano.'; return }
  const { xMin, xMax } = visibleRange()
  const pts = findExtrema(s.fn, xMin, xMax)
  if (pts.length === 0) {
    document.getElementById('tool-result').textContent = 'No se encontraron extremos en la vista.'
    return
  }
  const lines = []
  pts.forEach(({ x, y, type }) => {
    const color = type === 'max' ? '#2a7d4f' : '#9b0045'
    const pt = board.create('point', [x, y], {
      name: `${type === 'max' ? '▲' : '▼'}(${formatNumber(x,2)},${formatNumber(y,2)})`,
      fixed: true, size: 5, fillColor: color, strokeColor: '#fff', strokeWidth: 1.5, highlight: false,
      label: { offset: [6, type === 'max' ? 10 : -18], fontSize: 10, color },
    })
    toolOverlays.push(pt)
    lines.push(`${type === 'max' ? 'Máx' : 'Mín'}: x=${formatNumber(x,4)}, y=${formatNumber(y,4)}`)
  })
  document.getElementById('tool-result').textContent = lines.join(' | ')
  board.update()
})

// ── Tool: Integral ─────────────────────────────────────────────────────────
document.getElementById('btn-integral').addEventListener('click', () => {
  clearToolUI()
  const s = getActiveFn()
  if (!s) { document.getElementById('tool-result').textContent = 'Selecciona una función en modo cartesiano.'; return }
  document.getElementById('integral-controls').style.display = ''
  buildIntegralShade()
})

function buildIntegralShade() {
  if (integralShade) { try { board.removeObject(integralShade) } catch {} integralShade = null }
  const s = getActiveFn()
  if (!s) return
  const a = parseFloat(document.getElementById('sl-ia').value)
  const b = parseFloat(document.getElementById('sl-ib').value)
  if (a >= b) { document.getElementById('stat-integral-val').textContent = '—'; return }

  const steps = 120, dx = (b - a) / steps
  const xs = [a], ys = [0]
  for (let i = 0; i <= steps; i++) {
    const x = a + i * dx
    xs.push(x); ys.push(s.fn(x))
  }
  xs.push(b); ys.push(0)

  integralShade = board.create('curve', [xs, ys], {
    fillColor: s.color + '44', fillOpacity: 0.35,
    strokeColor: s.color, strokeWidth: 0.8, highlight: false,
  })
  const val = integrate(s.fn, a, b)
  document.getElementById('stat-integral-val').textContent = formatNumber(val, 6)
  board.update()
}

;[['sl-ia','val-ia'],['sl-ib','val-ib']].forEach(([sid,vid]) => {
  document.getElementById(sid).addEventListener('input', () => {
    document.getElementById(vid).textContent = document.getElementById(sid).value
    buildIntegralShade()
  })
})

// ── Tool: Value Table ──────────────────────────────────────────────────────
document.getElementById('btn-table').addEventListener('click', () => {
  clearToolUI()
  document.getElementById('table-controls').style.display = ''
  buildTable()
})

function buildTable() {
  const active = slots.filter(s => s.enabled && s.fn && mode === 'cartesian')
  const xStart = parseFloat(document.getElementById('sl-tx-start').value)
  const xEnd   = parseFloat(document.getElementById('sl-tx-end').value)
  const xStep  = parseFloat(document.getElementById('sl-tx-step').value)

  const head = document.getElementById('val-table-head')
  const body = document.getElementById('val-table-body')
  head.innerHTML = '<th>x</th>' + active.map((s, i) => `<th style="color:${s.color}">Y${slots.indexOf(s)+1}</th>`).join('')
  body.innerHTML = ''

  for (let x = xStart; x <= xEnd + 1e-9; x += xStep) {
    const xr = Math.round(x * 1000) / 1000
    const tr = document.createElement('tr')
    tr.innerHTML = `<td>${formatNumber(xr, 3)}</td>` +
      active.map(s => { const y = s.fn(xr); return `<td>${isFinite(y) ? formatNumber(y, 4) : '∞'}</td>` }).join('')
    body.appendChild(tr)
  }
}

;[['sl-tx-start','val-tx-start'],['sl-tx-end','val-tx-end'],['sl-tx-step','val-tx-step']].forEach(([sid,vid]) => {
  document.getElementById(sid).addEventListener('input', () => {
    document.getElementById(vid).textContent = document.getElementById(sid).value
    buildTable()
  })
})

// ── Init ───────────────────────────────────────────────────────────────────
buildRows()
rebuildCurves()
attachResizeObserver(board, document.getElementById('board-calc'))

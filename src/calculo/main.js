import JXG from 'jsxgraph'
import '../shared/styles/jsxgraph.css'
import '../shared/styles/base.css'
import '../shared/styles/components.css'
import '../shared/styles/simulator-layout.css'
import '../shared/styles/tabs.css'
import { createBoard, attachResizeObserver } from '../shared/js/board-factory.js'
import { formatNumber } from '../shared/js/utils.js'

document.getElementById('footer-year').textContent = new Date().getFullYear()

// ── Board ──────────────────────────────────────────────────────────────────
const board = createBoard('board-calculo', { bbox: [-6, 12, 10, -6], keepAspectRatio: false })

// ── Numerical helpers ──────────────────────────────────────────────────────
const H = 1e-6
function numDeriv(f, x) { return (f(x + H) - f(x - H)) / (2 * H) }

function numIntegral(f, a, b, steps = 2000) {
  if (a >= b) return 0
  const dx = (b - a) / steps
  let s = 0
  for (let i = 0; i < steps; i++) s += f(a + (i + 0.5) * dx) * dx
  return s
}

// Parse function string safely using JSXGraph's math parser
function parseFunc(str) {
  try {
    const fn = board.jc.snippet(str, true, 'x', true)
    fn(0) // test call
    return fn
  } catch {
    return null
  }
}

// ── STATE ──────────────────────────────────────────────────────────────────
let activeTab = 'funciones'
let fxFn  = parseFunc('x^2 - 2*x - 3')
let gxFn  = null
let rFn   = parseFunc('x^2 - 2*x + 2')
let tFn   = parseFunc('sin(x)')

// ── JSXGraph elements for FUNCIONES tab ───────────────────────────────────
const curveFx  = board.create('functiongraph', [x => fxFn ? fxFn(x) : 0, -8, 10], {
  strokeColor: '#00529B', strokeWidth: 2.5, highlight: false,
})
const curveGx  = board.create('functiongraph', [x => gxFn ? gxFn(x) : 0, -8, 10], {
  strokeColor: '#2a7d4f', strokeWidth: 2, dash: 1, highlight: false, visible: false,
})
const curveDeriv = board.create('functiongraph', [x => fxFn ? numDeriv(fxFn, x) : 0, -8, 10], {
  strokeColor: '#e07b00', strokeWidth: 1.8, dash: 2, highlight: false,
})

// Glider on f(x) curve for tangent
const glider = board.create('glider', [1, 0, curveFx], {
  name: 'T', size: 5, fillColor: '#9b0045', strokeColor: '#6d0030',
  label: { offset: [8, 8], fontSize: 12, color: '#9b0045' },
})
const tangentLine = board.create('tangent', [glider], {
  strokeColor: '#9b0045', strokeWidth: 1.5, dash: 2,
})

// Root markers (up to 6)
const rootMarkers = []
for (let i = 0; i < 6; i++) {
  rootMarkers.push(board.create('point', [0, 0], {
    name: '', fixed: true, size: 5,
    fillColor: '#e07b00', strokeColor: '#b45309',
    visible: false, highlight: false,
  }))
}

// ── JSXGraph elements for RIEMANN tab ─────────────────────────────────────
let riemannEl = null

function buildRiemann() {
  if (riemannEl) { try { board.removeObject(riemannEl) } catch {} riemannEl = null }
  const n    = parseInt(document.getElementById('sl-n').value)
  const ra   = parseFloat(document.getElementById('sl-ra').value)
  const rb   = parseFloat(document.getElementById('sl-rb').value)
  const type = document.getElementById('sel-riemann-type').value
  if (!rFn || ra >= rb) return

  const fn = rFn
  riemannEl = board.create('riemannsum', [
    fn, () => parseInt(document.getElementById('sl-n').value),
    type,
    () => parseFloat(document.getElementById('sl-ra').value),
    () => parseFloat(document.getElementById('sl-rb').value),
  ], {
    fillColor: 'rgba(0,82,155,0.25)',
    strokeColor: '#00529B',
    strokeWidth: 0.5,
    highlight: false,
  })

  const rsVal  = riemannEl.Value()
  const exact  = numIntegral(fn, ra, rb)
  document.getElementById('stat-riemann').textContent = formatNumber(rsVal, 4)
  document.getElementById('stat-integral').textContent = formatNumber(exact, 4)
  document.getElementById('stat-error').textContent = formatNumber(Math.abs(rsVal - exact), 5)
}

let rCurve = board.create('functiongraph', [x => rFn ? rFn(x) : 0, -8, 10], {
  strokeColor: '#9b0045', strokeWidth: 2.5, visible: false, highlight: false,
})

// Limit markers for Riemann
const ptA = board.create('point', [-1, 0], {
  name: 'a', fixed: true, size: 5,
  fillColor: '#9b0045', strokeColor: '#6d0030',
  visible: false,
})
const ptB = board.create('point', [3, 0], {
  name: 'b', fixed: true, size: 5,
  fillColor: '#2a7d4f', strokeColor: '#1a5c39',
  visible: false,
})

// ── JSXGraph elements for TAYLOR tab ──────────────────────────────────────
let tCurve = board.create('functiongraph', [x => tFn ? tFn(x) : 0, -8, 10], {
  strokeColor: '#00529B', strokeWidth: 2.5, visible: false, highlight: false,
})
let tPolyEl = board.create('functiongraph', [x => taylorApprox(x), -8, 10], {
  strokeColor: '#e07b00', strokeWidth: 2, dash: 1, visible: false, highlight: false,
})
const centerPt = board.create('point', [0, 0], {
  name: 'a', fixed: true, size: 5,
  fillColor: '#9b0045', strokeColor: '#6d0030',
  visible: false,
  label: { offset: [8, -14], fontSize: 12, color: '#9b0045' },
})

// Taylor polynomial computation using numerical derivatives
function factorial(n) { let r = 1; for (let i = 2; i <= n; i++) r *= i; return r }

function nthDerivative(f, x, n) {
  if (n === 0) return f(x)
  if (n === 1) return numDeriv(f, x)
  // Higher order: recursive finite differences
  const h = 1e-3
  if (n === 2) return (f(x + h) - 2 * f(x) + f(x - h)) / (h * h)
  if (n === 3) return (f(x + 2*h) - 2*f(x + h) + 2*f(x - h) - f(x - 2*h)) / (2 * h**3)
  if (n === 4) return (f(x + 2*h) - 4*f(x + h) + 6*f(x) - 4*f(x - h) + f(x - 2*h)) / (h**4)
  // For n > 4, use central differences with larger h
  return nthDerivApprox(f, x, n)
}

function nthDerivApprox(f, x, n) {
  const h = 1e-2
  let sum = 0
  for (let k = 0; k <= n; k++) {
    const sign = (n - k) % 2 === 0 ? 1 : -1
    const binom = factorial(n) / (factorial(k) * factorial(n - k))
    sum += sign * binom * f(x + k * h)
  }
  return sum / Math.pow(h, n)
}

function taylorApprox(x) {
  if (!tFn) return 0
  const a   = parseFloat(document.getElementById('sl-ta').value)
  const deg = parseInt(document.getElementById('sl-tn').value)
  let result = 0
  for (let k = 0; k <= deg; k++) {
    try {
      const dk = nthDerivative(tFn, a, k)
      if (!isFinite(dk)) continue
      result += (dk / factorial(k)) * Math.pow(x - a, k)
    } catch { /* skip */ }
  }
  return result
}

function buildTaylorPoly() {
  if (!tFn) return
  const a   = parseFloat(document.getElementById('sl-ta').value)
  const deg = parseInt(document.getElementById('sl-tn').value)
  let terms = []
  for (let k = 0; k <= deg; k++) {
    try {
      const dk = nthDerivative(tFn, a, k)
      if (!isFinite(dk) || Math.abs(dk) < 1e-10) continue
      const coef = dk / factorial(k)
      if (k === 0) terms.push(formatNumber(coef, 3))
      else if (k === 1) terms.push(`${formatNumber(coef, 3)}(x${a !== 0 ? '−' + formatNumber(a, 2) : ''})`)
      else terms.push(`${formatNumber(coef, 4)}(x${a !== 0 ? '−' + formatNumber(a, 2) : ''})^${k}`)
    } catch { /* skip */ }
  }
  document.getElementById('stat-taylor-poly').textContent = 'P(x) = ' + (terms.join(' + ') || '0')
  const fa = tFn(a)
  const pa = taylorApprox(a)
  document.getElementById('stat-tfa').textContent = formatNumber(fa, 4)
  document.getElementById('stat-tpa').textContent = formatNumber(pa, 4)
  centerPt.setPosition(JXG.COORDS_BY_USER, [a, tFn(a)])
  board.update()
}

// ── Show/hide elements per tab ─────────────────────────────────────────────
function setVisibility(funcVisible, riemannVisible, taylorVisible) {
  // Funciones tab elements
  curveFx.setAttribute({ visible: funcVisible })
  curveGx.setAttribute({ visible: funcVisible && document.getElementById('chk-gx').checked })
  curveDeriv.setAttribute({ visible: funcVisible && document.getElementById('chk-deriv').checked })
  glider.setAttribute({ visible: funcVisible && document.getElementById('chk-tangent').checked })
  tangentLine.setAttribute({ visible: funcVisible && document.getElementById('chk-tangent').checked })
  // Riemann tab elements
  rCurve.setAttribute({ visible: riemannVisible })
  ptA.setAttribute({ visible: riemannVisible })
  ptB.setAttribute({ visible: riemannVisible })
  if (riemannEl) riemannEl.setAttribute({ visible: riemannVisible })
  // Taylor tab elements
  tCurve.setAttribute({ visible: taylorVisible })
  tPolyEl.setAttribute({ visible: taylorVisible })
  centerPt.setAttribute({ visible: taylorVisible })
  // Root markers
  rootMarkers.forEach(p => p.setAttribute({
    visible: funcVisible && document.getElementById('chk-roots').checked,
  }))
}

function switchTab(tab) {
  activeTab = tab
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.toggle('tab-active', b.dataset.tab === tab))
  document.querySelectorAll('.tab-panel').forEach(p => p.classList.toggle('active', p.id === `panel-${tab}`))
  setVisibility(tab === 'funciones', tab === 'riemann', tab === 'taylor')
  board.update()
}

// ── Root finding (bisection) ───────────────────────────────────────────────
function findRoots(f, a, b, steps = 500) {
  const xs = []
  const dx = (b - a) / steps
  let prev = f(a)
  for (let i = 1; i <= steps; i++) {
    const x = a + i * dx
    const curr = f(x)
    if (prev * curr < 0) {
      // bisect
      let lo = x - dx, hi = x
      for (let j = 0; j < 40; j++) {
        const mid = (lo + hi) / 2
        if (f(mid) * f(lo) < 0) hi = mid; else lo = mid
      }
      xs.push((lo + hi) / 2)
    }
    prev = curr
  }
  return xs
}

function updateRoots() {
  if (!fxFn || !document.getElementById('chk-roots').checked) {
    rootMarkers.forEach(p => p.setAttribute({ visible: false }))
    return
  }
  const roots = findRoots(fxFn, -8, 10)
  rootMarkers.forEach((p, i) => {
    if (i < roots.length) {
      p.setPosition(JXG.COORDS_BY_USER, [roots[i], 0])
      p.setAttribute({ visible: true })
    } else {
      p.setAttribute({ visible: false })
    }
  })
  board.update()
}

// ── Update stats for tangent ───────────────────────────────────────────────
board.on('update', () => {
  if (activeTab !== 'funciones' || !fxFn) return
  const x0 = glider.X()
  const fx0 = fxFn(x0)
  const dfx0 = numDeriv(fxFn, x0)
  document.getElementById('stat-x0').textContent = formatNumber(x0, 3)
  document.getElementById('stat-fx0').textContent = formatNumber(fx0, 3)
  document.getElementById('stat-dfx0').textContent = formatNumber(dfx0, 3)
  document.getElementById('stat-slope').textContent = formatNumber(dfx0, 3)
})

// ── Tab buttons ───────────────────────────────────────────────────────────
document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', () => switchTab(btn.dataset.tab))
})

// ── Funciones tab controls ────────────────────────────────────────────────
function applyFx() {
  const str = document.getElementById('input-fx').value
  const fn = parseFunc(str)
  if (fn) { fxFn = fn; curveFx.Y = (x) => fxFn(x); board.update(); updateRoots() }
  document.getElementById('input-fx').style.borderColor = fn ? '' : '#c00'
}
function applyGx() {
  const str = document.getElementById('input-gx').value
  const fn = parseFunc(str)
  if (fn) {
    gxFn = fn
    curveGx.Y = (x) => gxFn(x)
    curveGx.setAttribute({ visible: document.getElementById('chk-gx').checked })
    board.update()
  }
  document.getElementById('input-gx').style.borderColor = fn ? '' : '#c00'
}

document.getElementById('input-fx').addEventListener('change', applyFx)
document.getElementById('input-gx').addEventListener('change', applyGx)
document.getElementById('chk-gx').addEventListener('change', e => {
  curveGx.setAttribute({ visible: e.target.checked })
  board.update()
})
document.getElementById('chk-deriv').addEventListener('change', e => {
  curveDeriv.setAttribute({ visible: e.target.checked })
  board.update()
})
document.getElementById('chk-tangent').addEventListener('change', e => {
  glider.setAttribute({ visible: e.target.checked })
  tangentLine.setAttribute({ visible: e.target.checked })
  board.update()
})
document.getElementById('chk-roots').addEventListener('change', updateRoots)

// ── Riemann tab controls ───────────────────────────────────────────────────
function applyRFx() {
  const str = document.getElementById('input-rfx').value
  const fn = parseFunc(str)
  if (fn) {
    rFn = fn
    rCurve.Y = (x) => rFn(x)
    buildRiemann()
    board.update()
  }
  document.getElementById('input-rfx').style.borderColor = fn ? '' : '#c00'
}
document.getElementById('input-rfx').addEventListener('change', applyRFx)
document.getElementById('sel-riemann-type').addEventListener('change', buildRiemann)

;['sl-n', 'sl-ra', 'sl-rb'].forEach(id => {
  const el = document.getElementById(id)
  const displayId = { 'sl-n': 'val-n', 'sl-ra': 'val-ra', 'sl-rb': 'val-rb' }[id]
  el.addEventListener('input', () => {
    document.getElementById(displayId).textContent = el.value
    if (id === 'sl-ra') ptA.setPosition(JXG.COORDS_BY_USER, [parseFloat(el.value), 0])
    if (id === 'sl-rb') ptB.setPosition(JXG.COORDS_BY_USER, [parseFloat(el.value), 0])
    buildRiemann()
    board.update()
  })
})

// ── Taylor tab controls ────────────────────────────────────────────────────
function applyTFx() {
  const fn = parseFunc(document.getElementById('input-tfx').value)
  if (fn) {
    tFn = fn
    tCurve.Y = (x) => tFn(x)
    buildTaylorPoly()
    board.update()
  }
  document.getElementById('input-tfx').style.borderColor = fn ? '' : '#c00'
}
document.getElementById('input-tfx').addEventListener('change', applyTFx)
document.getElementById('sl-ta').addEventListener('input', () => {
  document.getElementById('val-ta').textContent = document.getElementById('sl-ta').value
  buildTaylorPoly()
  board.update()
})
document.getElementById('sl-tn').addEventListener('input', () => {
  document.getElementById('val-tn').textContent = document.getElementById('sl-tn').value
  tPolyEl.Y = (x) => taylorApprox(x)
  buildTaylorPoly()
  board.update()
})

// ── Reset ──────────────────────────────────────────────────────────────────
document.getElementById('btn-reset').addEventListener('click', () => {
  document.getElementById('input-fx').value   = 'x^2 - 2*x - 3'
  document.getElementById('input-gx').value   = 'sin(x)*3'
  document.getElementById('input-rfx').value  = 'x^2 - 2*x + 2'
  document.getElementById('input-tfx').value  = 'sin(x)'
  document.getElementById('sl-n').value   = 10; document.getElementById('val-n').textContent = '10'
  document.getElementById('sl-ra').value  = -1; document.getElementById('val-ra').textContent = '-1'
  document.getElementById('sl-rb').value  = 3;  document.getElementById('val-rb').textContent = '3'
  document.getElementById('sl-ta').value  = 0;  document.getElementById('val-ta').textContent = '0'
  document.getElementById('sl-tn').value  = 3;  document.getElementById('val-tn').textContent = '3'
  fxFn = parseFunc('x^2 - 2*x - 3')
  rFn  = parseFunc('x^2 - 2*x + 2')
  tFn  = parseFunc('sin(x)')
  curveFx.Y  = x => fxFn(x)
  rCurve.Y   = x => rFn(x)
  tCurve.Y   = x => tFn(x)
  tPolyEl.Y  = x => taylorApprox(x)
  if (riemannEl) { try { board.removeObject(riemannEl) } catch {} riemannEl = null }
  board.update()
})

// ── ResizeObserver ─────────────────────────────────────────────────────────
attachResizeObserver(board, document.getElementById('board-calculo'))

// ── Init ───────────────────────────────────────────────────────────────────
switchTab('funciones')

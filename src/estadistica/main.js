import JXG from 'jsxgraph'
import { createBoard, attachResizeObserver } from '../shared/js/board-factory.js'
import { formatNumber } from '../shared/js/utils.js'

document.getElementById('footer-year').textContent = new Date().getFullYear()

// ── Board ──────────────────────────────────────────────────────────────────
const board = createBoard('board-estadistica', { bbox: [-5, 0.55, 5, -0.1], keepAspectRatio: false })

// ════════════════════════════════════════════════════════════
// TAB 1: DISTRIBUCIÓN NORMAL
// ════════════════════════════════════════════════════════════
function normalPDF(x, mu, sigma) {
  return (1 / (sigma * Math.sqrt(2 * Math.PI))) * Math.exp(-0.5 * ((x - mu) / sigma) ** 2)
}

function normalCDF(x, mu, sigma) {
  // Approximation using error function
  const z = (x - mu) / (sigma * Math.sqrt(2))
  return 0.5 * (1 + erf(z))
}

function erf(x) {
  const t = 1 / (1 + 0.3275911 * Math.abs(x))
  const poly = t * (0.254829592 + t * (-0.284496736 + t * (1.421413741 + t * (-1.453152027 + t * 1.061405429))))
  const result = 1 - poly * Math.exp(-x * x)
  return x >= 0 ? result : -result
}

// Normal curve
const normalCurve = board.create('functiongraph', [
  x => normalPDF(x, parseFloat(document.getElementById('sl-mu').value), parseFloat(document.getElementById('sl-sigma').value)),
  -10, 10,
], { strokeColor: '#00529B', strokeWidth: 2.5, highlight: false })

// Shaded area (Riemann approximation for fill)
let shadedEl = null

function buildShading() {
  if (shadedEl) { try { board.removeObject(shadedEl) } catch {} shadedEl = null }
  const mu = parseFloat(document.getElementById('sl-mu').value)
  const sigma = parseFloat(document.getElementById('sl-sigma').value)
  const na = parseFloat(document.getElementById('sl-na').value)
  const nb = parseFloat(document.getElementById('sl-nb').value)
  if (na >= nb) return
  const steps = 120
  const dx = (nb - na) / steps
  const xs = [], ys = []
  xs.push(na); ys.push(0)
  for (let i = 0; i <= steps; i++) {
    const x = na + i * dx
    xs.push(x); ys.push(normalPDF(x, mu, sigma))
  }
  xs.push(nb); ys.push(0)
  shadedEl = board.create('curve', [xs, ys], {
    fillColor: 'rgba(0,82,155,0.3)',
    fillOpacity: 0.3,
    strokeColor: 'rgba(0,82,155,0.5)',
    strokeWidth: 0.5,
    highlight: false,
  })
  board.update()
}

// Limit markers
const markerA = board.create('point', [-1, 0], {
  name: 'a', fixed: true, size: 5, fillColor: '#9b0045', strokeColor: '#6d0030',
  label: { offset: [0, -18], fontSize: 11, color: '#9b0045' },
})
const markerB = board.create('point', [1, 0], {
  name: 'b', fixed: true, size: 5, fillColor: '#2a7d4f', strokeColor: '#1a5c39',
  label: { offset: [0, -18], fontSize: 11, color: '#2a7d4f' },
})
const meanLine = board.create('line', [[0,-1],[0,10]], { strokeColor: '#e07b00', strokeWidth: 1.5, dash: 2 })

function updateNormal() {
  const mu    = parseFloat(document.getElementById('sl-mu').value)
  const sigma = parseFloat(document.getElementById('sl-sigma').value)
  const na    = parseFloat(document.getElementById('sl-na').value)
  const nb    = parseFloat(document.getElementById('sl-nb').value)

  // Update curve, board bbox
  normalCurve.Y = x => normalPDF(x, mu, sigma)
  const peak = normalPDF(mu, mu, sigma)
  board.setBoundingBox([-5 * sigma + mu - 1, peak * 1.2, 5 * sigma + mu + 1, -peak * 0.15], false)

  markerA.setPosition(JXG.COORDS_BY_USER, [na, 0])
  markerB.setPosition(JXG.COORDS_BY_USER, [nb, 0])
  meanLine.point1.setPosition(JXG.COORDS_BY_USER, [mu, -1])
  meanLine.point2.setPosition(JXG.COORDS_BY_USER, [mu, 10])

  buildShading()

  const prob = normalCDF(nb, mu, sigma) - normalCDF(na, mu, sigma)
  const cdfA = normalCDF(na, mu, sigma)
  const za = (na - mu) / sigma
  const zb = (nb - mu) / sigma

  document.getElementById('stat-prob').textContent = formatNumber(prob * 100, 2) + '%'
  document.getElementById('stat-cdf-a').textContent = formatNumber(cdfA * 100, 2) + '%'
  document.getElementById('stat-za').textContent = formatNumber(za, 3)
  document.getElementById('stat-zb').textContent = formatNumber(zb, 3)
  document.getElementById('stat-moda').textContent = formatNumber(mu, 3)
  document.getElementById('stat-var').textContent = formatNumber(sigma * sigma, 4)

  board.update()
}

;['sl-mu','sl-sigma','sl-na','sl-nb'].forEach(id => {
  document.getElementById(id).addEventListener('input', () => {
    const displayMap = { 'sl-mu': 'val-mu', 'sl-sigma': 'val-sigma', 'sl-na': 'val-na', 'sl-nb': 'val-nb' }
    document.getElementById(displayMap[id]).textContent = document.getElementById(id).value
    updateNormal()
  })
})

// ════════════════════════════════════════════════════════════
// TAB 2: REGRESIÓN LINEAL
// ════════════════════════════════════════════════════════════
let regrPoints = []
let regrLine = null

// Board axes for regression (will reconfigure on tab switch)
const INITIAL_REGR_POINTS = [
  [1, 2.2], [2, 3.8], [3, 4.1], [4, 5.9], [5, 5.2],
  [6, 7.8], [7, 7.1], [8, 9.3], [9, 9.8], [10, 11.2],
]

function addRegrPoint(x, y) {
  const pt = board.create('point', [x, y], {
    size: 6, fillColor: '#e07b00', strokeColor: '#b45309',
    name: '', label: { visible: false },
  })
  regrPoints.push(pt)
  updateRegression()
}

function removeLastPoint() {
  if (regrPoints.length === 0) return
  const pt = regrPoints.pop()
  try { board.removeObject(pt) } catch {}
  updateRegression()
}

function linearRegression() {
  const n = regrPoints.length
  if (n < 2) return null
  const xs = regrPoints.map(p => p.X())
  const ys = regrPoints.map(p => p.Y())
  const xBar = xs.reduce((a, b) => a + b) / n
  const yBar = ys.reduce((a, b) => a + b) / n
  const sxy = xs.reduce((s, x, i) => s + (x - xBar) * (ys[i] - yBar), 0)
  const sxx = xs.reduce((s, x) => s + (x - xBar) ** 2, 0)
  if (sxx < 1e-10) return null
  const m = sxy / sxx
  const b = yBar - m * xBar

  // R²
  const ssRes = ys.reduce((s, y, i) => s + (y - (m * xs[i] + b)) ** 2, 0)
  const ssTot = ys.reduce((s, y) => s + (y - yBar) ** 2, 0)
  const R2 = ssTot < 1e-10 ? 1 : 1 - ssRes / ssTot
  const r = Math.sqrt(Math.max(0, R2)) * Math.sign(m)

  return { m, b, R2, r, xBar, yBar }
}

function updateRegression() {
  if (regrLine) { try { board.removeObject(regrLine) } catch {} regrLine = null }
  const res = linearRegression()
  if (!res) {
    ['stat-r2','stat-r','stat-m','stat-b','stat-xbar','stat-ybar','stat-eq','stat-interp'].forEach(id => {
      document.getElementById(id).textContent = regrPoints.length < 2 ? 'Necesita ≥2 puntos' : '—'
    })
    return
  }
  const { m, b, R2, r, xBar, yBar } = res

  // Draw regression line
  regrLine = board.create('functiongraph', [x => m * x + b, -100, 100], {
    strokeColor: '#00529B', strokeWidth: 2, dash: 1, highlight: false,
  })
  board.update()

  document.getElementById('stat-r2').textContent = formatNumber(R2, 4)
  document.getElementById('stat-r').textContent  = formatNumber(r, 4)
  document.getElementById('stat-m').textContent  = formatNumber(m, 4)
  document.getElementById('stat-b').textContent  = formatNumber(b, 4)
  document.getElementById('stat-xbar').textContent = formatNumber(xBar, 3)
  document.getElementById('stat-ybar').textContent = formatNumber(yBar, 3)
  document.getElementById('stat-eq').textContent  = `ŷ = ${formatNumber(m, 3)}x + ${formatNumber(b, 3)}`

  const strength = Math.abs(r) > 0.9 ? 'Correlación muy fuerte' :
                   Math.abs(r) > 0.7 ? 'Correlación fuerte' :
                   Math.abs(r) > 0.5 ? 'Correlación moderada' :
                   Math.abs(r) > 0.3 ? 'Correlación débil' : 'Sin correlación significativa'
  const dir = r > 0 ? 'positiva' : 'negativa'
  document.getElementById('stat-interp').textContent = `${strength} ${dir}. R²=${formatNumber(R2*100,1)}% de la varianza explicada.`
}

// Click on board to add point (regression mode)
board.on('down', e => {
  if (activeTab !== 'regresion') return
  const coords = board.getUsrCoordsOfMouse(e)
  addRegrPoint(coords[1], coords[2])
})

document.getElementById('btn-add-pt').addEventListener('click', () => {
  const xs = regrPoints.map(p => p.X())
  const xNew = xs.length > 0 ? Math.max(...xs) + 1 + Math.random() : Math.random() * 10
  const yNew = xNew * 1.1 + (Math.random() - 0.5) * 2
  addRegrPoint(xNew, yNew)
})

document.getElementById('btn-remove-pt').addEventListener('click', removeLastPoint)

// ── Tab switching ──────────────────────────────────────────────────────────
let activeTab = 'normal'

function switchBoardForNormal() {
  // Remove regression points and line
  regrPoints.forEach(p => { try { board.removeObject(p) } catch {} })
  regrPoints = []
  if (regrLine) { try { board.removeObject(regrLine) } catch {} regrLine = null }
  // Show normal elements
  normalCurve.setAttribute({ visible: true })
  markerA.setAttribute({ visible: true })
  markerB.setAttribute({ visible: true })
  meanLine.setAttribute({ visible: true })
  buildShading()
  updateNormal()
}

function switchBoardForRegression() {
  // Hide normal elements
  normalCurve.setAttribute({ visible: false })
  markerA.setAttribute({ visible: false })
  markerB.setAttribute({ visible: false })
  meanLine.setAttribute({ visible: false })
  if (shadedEl) { try { board.removeObject(shadedEl) } catch {} shadedEl = null }
  board.setBoundingBox([-1, 14, 13, -2], false)
  // Load default points
  INITIAL_REGR_POINTS.forEach(([x, y]) => addRegrPoint(x, y))
  board.update()
}

function switchTab(tab) {
  activeTab = tab
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.toggle('tab-active', b.dataset.tab === tab))
  document.querySelectorAll('.tab-panel').forEach(p => p.classList.toggle('active', p.id === `panel-${tab}`))
  if (tab === 'normal') switchBoardForNormal()
  else switchBoardForRegression()
}

document.querySelectorAll('.tab-btn').forEach(btn => btn.addEventListener('click', () => switchTab(btn.dataset.tab)))

// ── Reset ──────────────────────────────────────────────────────────────────
document.getElementById('btn-reset').addEventListener('click', () => {
  if (activeTab === 'normal') {
    document.getElementById('sl-mu').value = 0;    document.getElementById('val-mu').textContent = '0'
    document.getElementById('sl-sigma').value = 1; document.getElementById('val-sigma').textContent = '1'
    document.getElementById('sl-na').value = -1;   document.getElementById('val-na').textContent = '-1'
    document.getElementById('sl-nb').value = 1;    document.getElementById('val-nb').textContent = '1'
    updateNormal()
  } else {
    regrPoints.forEach(p => { try { board.removeObject(p) } catch {} })
    regrPoints = []
    if (regrLine) { try { board.removeObject(regrLine) } catch {} regrLine = null }
    INITIAL_REGR_POINTS.forEach(([x, y]) => addRegrPoint(x, y))
    board.update()
  }
})

attachResizeObserver(board, document.getElementById('board-estadistica'))

// ── Init ───────────────────────────────────────────────────────────────────
updateNormal()

import JXG from 'jsxgraph'
import '../shared/styles/jsxgraph.css'
import '../shared/styles/base.css'
import '../shared/styles/components.css'
import '../shared/styles/simulator-layout.css'
import { createBoard, attachResizeObserver } from '../shared/js/board-factory.js'
import { formatNumber, quadraticRoots } from '../shared/js/utils.js'

// ── Footer year ──
const yearEl = document.getElementById('footer-year')
if (yearEl) yearEl.textContent = new Date().getFullYear()

// ── DOM refs ──
const slA = document.getElementById('sl-a')
const slB = document.getElementById('sl-b')
const slC = document.getElementById('sl-c')
const slD = document.getElementById('sl-d')
const valA = document.getElementById('val-a')
const valB = document.getElementById('val-b')
const valC = document.getElementById('val-c')
const valD = document.getElementById('val-d')
const selMode = document.getElementById('sel-mode')
const groupD = document.getElementById('group-d')
const btnReset = document.getElementById('btn-reset')
const btnToggleTangent = document.getElementById('btn-toggle-tangent')
const statVx = document.getElementById('stat-vx')
const statVy = document.getElementById('stat-vy')
const statR1 = document.getElementById('stat-r1')
const statR2 = document.getElementById('stat-r2')
const statDisc = document.getElementById('stat-disc')
const statSlope = document.getElementById('stat-slope')
const statFormula = document.getElementById('stat-formula')

// ── State ──
let mode = 'quad'   // 'quad' | 'cubic'
let showTangent = true

// ── Board ──
const board = createBoard('board-funciones', {
  bbox: [-8, 14, 8, -6],
  keepAspectRatio: false,
})

// ── JSXGraph elements ──
// Curve (functiongraph)
const curve = board.create('functiongraph', [evalF, -9, 9], {
  strokeColor: '#e07b00',
  strokeWidth: 2.5,
  highlight: false,
})

// Vertex point
const vertexPt = board.create('point', [vertexX, vertexY], {
  name: 'V',
  fixed: true,
  size: 5,
  fillColor: '#00529B',
  strokeColor: '#003d75',
  label: {
    offset: [8, 8],
    fontSize: 12,
    color: '#00529B',
  },
})

// Root points (two, may be hidden)
const root1Pt = board.create('point', [0, 0], {
  name: 'R₁',
  fixed: true,
  size: 4,
  fillColor: '#2a7d4f',
  strokeColor: '#1a5c39',
  label: { offset: [8, -14], fontSize: 11, color: '#2a7d4f' },
})

const root2Pt = board.create('point', [0, 0], {
  name: 'R₂',
  fixed: true,
  size: 4,
  fillColor: '#2a7d4f',
  strokeColor: '#1a5c39',
  label: { offset: [8, 8], fontSize: 11, color: '#2a7d4f' },
})

// Glider point on curve for tangent
const glider = board.create('glider', [1, 0, curve], {
  name: 'T',
  size: 5,
  fillColor: '#9b0045',
  strokeColor: '#6d0030',
  label: {
    offset: [8, 8],
    fontSize: 12,
    color: '#9b0045',
  },
})

// Tangent line at glider
const tangentLine = board.create('tangent', [glider], {
  strokeColor: '#9b0045',
  strokeWidth: 1.5,
  dash: 2,
})

// ── Helper: current coefficient values ──
function getCoeffs() {
  return {
    a: parseFloat(slA.value),
    b: parseFloat(slB.value),
    c: parseFloat(slC.value),
    d: parseFloat(slD.value),
  }
}

// ── Eval function ──
function evalF(x) {
  const { a, b, c, d } = getCoeffs()
  if (mode === 'quad') {
    return a * x * x + b * x + c
  } else {
    return a * x * x * x + b * x * x + c * x + d
  }
}

// ── Vertex for quadratic ──
function vertexX() {
  const { a, b } = getCoeffs()
  if (mode !== 'quad' || Math.abs(a) < 1e-10) return 0
  return -b / (2 * a)
}

function vertexY() {
  const vx = vertexX()
  return evalF(vx)
}

// ── Build formula string ──
function buildFormula() {
  const { a, b, c, d } = getCoeffs()
  const fmtC = (v, isFirst = false) => {
    if (Math.abs(v) < 1e-10) return null
    const s = formatNumber(v, 2)
    if (isFirst) return s
    return v > 0 ? ` + ${s}` : ` - ${formatNumber(Math.abs(v), 2)}`
  }

  if (mode === 'quad') {
    let parts = []
    const ap = fmtC(a, true)
    if (ap !== null) parts.push(`${ap}x²`)
    const bp = fmtC(b)
    if (bp !== null) parts.push(`${bp}x`)
    const cp = fmtC(c)
    if (cp !== null) parts.push(cp)
    return `f(x) = ${parts.length ? parts.join('') : '0'}`
  } else {
    let parts = []
    const ap = fmtC(a, true)
    if (ap !== null) parts.push(`${ap}x³`)
    const bp = fmtC(b)
    if (bp !== null) parts.push(`${bp}x²`)
    const cp = fmtC(c)
    if (cp !== null) parts.push(`${cp}x`)
    const dp = fmtC(d)
    if (dp !== null) parts.push(dp)
    return `f(x) = ${parts.length ? parts.join('') : '0'}`
  }
}

// ── Numerical derivative at a point ──
function derivative(x) {
  const h = 1e-6
  return (evalF(x + h) - evalF(x - h)) / (2 * h)
}

// ── Update stats DOM ──
function updateStats() {
  const { a, b, c } = getCoeffs()

  // Formula
  statFormula.textContent = buildFormula()

  if (mode === 'quad') {
    // Vertex
    const vx = Math.abs(a) > 1e-10 ? -b / (2 * a) : 0
    const vy = evalF(vx)
    statVx.textContent = formatNumber(vx, 3)
    statVy.textContent = formatNumber(vy, 3)

    // Roots
    const { disc, roots } = quadraticRoots(a, b, c)
    statR1.textContent = roots[0]
    statR2.textContent = roots[1]
    statDisc.textContent = disc !== null ? formatNumber(disc, 2) : '—'

    // Update root point positions
    const disc2 = b * b - 4 * a * c
    if (Math.abs(a) > 1e-10 && disc2 >= 0) {
      const sq = Math.sqrt(disc2)
      const r1 = (-b + sq) / (2 * a)
      const r2 = (-b - sq) / (2 * a)
      root1Pt.setPosition(JXG.COORDS_BY_USER, [r1, 0])
      root2Pt.setPosition(JXG.COORDS_BY_USER, [r2, 0])
      root1Pt.setAttribute({ visible: true })
      root2Pt.setAttribute({ visible: disc2 > 1e-8 })
    } else {
      root1Pt.setAttribute({ visible: false })
      root2Pt.setAttribute({ visible: false })
    }

    // Update vertex point
    if (Math.abs(a) > 1e-10) {
      const vx2 = -b / (2 * a)
      vertexPt.setPosition(JXG.COORDS_BY_USER, [vx2, evalF(vx2)])
      vertexPt.setAttribute({ visible: true })
    } else {
      vertexPt.setAttribute({ visible: false })
    }

  } else {
    // Cubic — hide vertex display
    statVx.textContent = '—'
    statVy.textContent = '—'
    statR1.textContent = '—'
    statR2.textContent = '—'
    statDisc.textContent = '—'
    vertexPt.setAttribute({ visible: false })
    root1Pt.setAttribute({ visible: false })
    root2Pt.setAttribute({ visible: false })
  }

  // Slope at glider
  try {
    const slope = derivative(glider.X())
    statSlope.textContent = formatNumber(slope, 3)
  } catch {
    statSlope.textContent = '—'
  }

  board.update()
}

// ── Slider listeners ──
function bindSlider(slider, display) {
  slider.addEventListener('input', () => {
    display.textContent = formatNumber(parseFloat(slider.value), 2)
    updateStats()
  })
}

bindSlider(slA, valA)
bindSlider(slB, valB)
bindSlider(slC, valC)
bindSlider(slD, valD)

// Update slope stat when glider moves
board.on('update', () => {
  try {
    const slope = derivative(glider.X())
    statSlope.textContent = formatNumber(slope, 3)
  } catch {
    statSlope.textContent = '—'
  }
})

// ── Mode switch ──
selMode.addEventListener('change', () => {
  mode = selMode.value
  groupD.style.display = mode === 'cubic' ? '' : 'none'
  updateStats()
})

// ── Reset ──
btnReset.addEventListener('click', () => {
  slA.value = 1; valA.textContent = '1'
  slB.value = 0; valB.textContent = '0'
  slC.value = 0; valC.textContent = '0'
  slD.value = 0; valD.textContent = '0'
  updateStats()
})

// ── Toggle tangent ──
btnToggleTangent.addEventListener('click', () => {
  showTangent = !showTangent
  tangentLine.setAttribute({ visible: showTangent })
  glider.setAttribute({ visible: showTangent })
  btnToggleTangent.textContent = `Tangente: ${showTangent ? 'ON' : 'OFF'}`
  board.update()
})

// ── ResizeObserver ──
const container = document.getElementById('board-funciones')
attachResizeObserver(board, container)

// ── Init ──
updateStats()

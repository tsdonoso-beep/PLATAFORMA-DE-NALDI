import JXG from 'jsxgraph'
import '../shared/styles/jsxgraph.css'
import '../shared/styles/base.css'
import '../shared/styles/components.css'
import '../shared/styles/simulator-layout.css'
import { createBoard, attachResizeObserver } from '../shared/js/board-factory.js'
import { formatNumber, toDegrees } from '../shared/js/utils.js'

// ── Footer year ──
const yearEl = document.getElementById('footer-year')
if (yearEl) yearEl.textContent = new Date().getFullYear()

// ── State ──
let showSum  = true
let showDiff = true
let showPara = true

// ── Board ──
const board = createBoard('board-vectores', {
  bbox: [-10, 10, 10, -10],
  keepAspectRatio: true,
})

// ── Origin (fixed) ──
const origin = board.create('point', [0, 0], {
  name: 'O',
  fixed: true,
  size: 4,
  fillColor: '#555',
  strokeColor: '#333',
  label: { offset: [-12, -12], fontSize: 12, color: '#555' },
})

// ── Vector endpoints (draggable) ──
const P1 = board.create('point', [4, 2], {
  name: 'u',
  size: 6,
  fillColor: '#00529B',
  strokeColor: '#003d75',
  label: { offset: [8, 8], fontSize: 14, fontWeight: 'bold', color: '#003d75' },
})

const P2 = board.create('point', [-2, 4], {
  name: 'v',
  size: 6,
  fillColor: '#e07b00',
  strokeColor: '#b45309',
  label: { offset: [8, 8], fontSize: 14, fontWeight: 'bold', color: '#b45309' },
})

// ── Vector arrows u and v ──
const arrowU = board.create('arrow', [origin, P1], {
  strokeColor: '#00529B',
  strokeWidth: 2.8,
  lastArrow: { size: 7 },
  highlight: false,
})

const arrowV = board.create('arrow', [origin, P2], {
  strokeColor: '#e07b00',
  strokeWidth: 2.8,
  lastArrow: { size: 7 },
  highlight: false,
})

// ── Sum vector endpoint (computed) ──
const Psum = board.create('point', [
  () => P1.X() + P2.X(),
  () => P1.Y() + P2.Y(),
], {
  name: 'u+v',
  fixed: true,
  size: 5,
  fillColor: '#2a7d4f',
  strokeColor: '#1a5c39',
  label: { offset: [8, 8], fontSize: 12, fontWeight: 'bold', color: '#2a7d4f' },
})

const arrowSum = board.create('arrow', [origin, Psum], {
  strokeColor: '#2a7d4f',
  strokeWidth: 2.5,
  lastArrow: { size: 7 },
  dash: 1,
  highlight: false,
})

// ── Parallelogram dashed construction lines ──
const paraLine1 = board.create('segment', [P1, Psum], {
  strokeColor: '#2a7d4f',
  strokeWidth: 1.2,
  dash: 2,
  highlight: false,
})
const paraLine2 = board.create('segment', [P2, Psum], {
  strokeColor: '#2a7d4f',
  strokeWidth: 1.2,
  dash: 2,
  highlight: false,
})

// ── Difference vector endpoint ──
const Pdiff = board.create('point', [
  () => P1.X() - P2.X(),
  () => P1.Y() - P2.Y(),
], {
  name: 'u-v',
  fixed: true,
  size: 5,
  fillColor: '#9b0045',
  strokeColor: '#6d0030',
  label: { offset: [8, -14], fontSize: 12, fontWeight: 'bold', color: '#9b0045' },
})

const arrowDiff = board.create('arrow', [origin, Pdiff], {
  strokeColor: '#9b0045',
  strokeWidth: 2,
  lastArrow: { size: 6 },
  dash: 2,
  highlight: false,
})

// ── Angle arc between u and v ──
const angleArc = board.create('angle', [P1, origin, P2], {
  radius: 1.5,
  fillColor: 'rgba(0,82,155,0.12)',
  strokeColor: '#00529B',
  strokeWidth: 1.5,
  name: '',
  label: { fontSize: 11, color: '#003d75' },
})

// ── DOM refs ──
const statUx    = document.getElementById('stat-ux')
const statUy    = document.getElementById('stat-uy')
const statMagU  = document.getElementById('stat-mag-u')
const statVx    = document.getElementById('stat-vx')
const statVy    = document.getElementById('stat-vy')
const statMagV  = document.getElementById('stat-mag-v')
const statSumX  = document.getElementById('stat-sum-x')
const statSumY  = document.getElementById('stat-sum-y')
const statDiffX = document.getElementById('stat-diff-x')
const statDiffY = document.getElementById('stat-diff-y')
const statDot   = document.getElementById('stat-dot')
const statAngle = document.getElementById('stat-angle')
const statCross = document.getElementById('stat-cross')
const statOrtho = document.getElementById('stat-ortho')
const statOrthoBlock = document.getElementById('stat-ortho-block')

// ── Update stats ──
function updateStats() {
  const ux = P1.X(), uy = P1.Y()
  const vx = P2.X(), vy = P2.Y()

  const magU = Math.hypot(ux, uy)
  const magV = Math.hypot(vx, vy)

  statUx.textContent = formatNumber(ux, 2)
  statUy.textContent = formatNumber(uy, 2)
  statMagU.textContent = formatNumber(magU, 3)

  statVx.textContent = formatNumber(vx, 2)
  statVy.textContent = formatNumber(vy, 2)
  statMagV.textContent = formatNumber(magV, 3)

  // Sum / Diff
  statSumX.textContent  = formatNumber(ux + vx, 2)
  statSumY.textContent  = formatNumber(uy + vy, 2)
  statDiffX.textContent = formatNumber(ux - vx, 2)
  statDiffY.textContent = formatNumber(uy - vy, 2)

  // Dot product
  const dot = ux * vx + uy * vy
  statDot.textContent = formatNumber(dot, 3)

  // Angle
  if (magU > 1e-6 && magV > 1e-6) {
    const cosTheta = Math.max(-1, Math.min(1, dot / (magU * magV)))
    const theta = toDegrees(Math.acos(cosTheta))
    statAngle.textContent = formatNumber(theta, 2) + '°'

    // Orthogonality
    const isOrtho = Math.abs(dot) < 0.05
    statOrtho.textContent = isOrtho ? '✓ Sí' : 'No'
    statOrthoBlock.className = isOrtho ? 'stat-block stat-block--success' : 'stat-block'
  } else {
    statAngle.textContent = '—'
    statOrtho.textContent = '—'
    statOrthoBlock.className = 'stat-block'
  }

  // Cross product magnitude (z-component of 3D cross)
  const cross = Math.abs(ux * vy - uy * vx)
  statCross.textContent = formatNumber(cross, 3)
}

board.on('update', updateStats)

// ── Toggle buttons ──
document.getElementById('btn-toggle-sum').addEventListener('click', (e) => {
  showSum = !showSum
  arrowSum.setAttribute({ visible: showSum })
  Psum.setAttribute({ visible: showSum })
  e.target.textContent = `Suma u+v: ${showSum ? 'ON' : 'OFF'}`
  // Parallelogram follows sum visibility
  if (!showSum) {
    paraLine1.setAttribute({ visible: false })
    paraLine2.setAttribute({ visible: false })
  } else if (showPara) {
    paraLine1.setAttribute({ visible: true })
    paraLine2.setAttribute({ visible: true })
  }
  board.update()
})

document.getElementById('btn-toggle-diff').addEventListener('click', (e) => {
  showDiff = !showDiff
  arrowDiff.setAttribute({ visible: showDiff })
  Pdiff.setAttribute({ visible: showDiff })
  e.target.textContent = `Resta u-v: ${showDiff ? 'ON' : 'OFF'}`
  board.update()
})

document.getElementById('btn-toggle-para').addEventListener('click', (e) => {
  showPara = !showPara
  paraLine1.setAttribute({ visible: showPara && showSum })
  paraLine2.setAttribute({ visible: showPara && showSum })
  e.target.textContent = `Paralelogramo: ${showPara ? 'ON' : 'OFF'}`
  board.update()
})

document.getElementById('btn-reset').addEventListener('click', () => {
  P1.setPosition(JXG.COORDS_BY_USER, [4, 2])
  P2.setPosition(JXG.COORDS_BY_USER, [-2, 4])
  board.update()
})

// ── ResizeObserver ──
const container = document.getElementById('board-vectores')
attachResizeObserver(board, container)

// ── Init ──
updateStats()

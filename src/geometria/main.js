import JXG from 'jsxgraph'
import '../shared/styles/jsxgraph.css'
import '../shared/styles/base.css'
import '../shared/styles/components.css'
import '../shared/styles/simulator-layout.css'
import { createBoard, attachResizeObserver } from '../shared/js/board-factory.js'
import { formatNumber, toDegrees, dist2d } from '../shared/js/utils.js'

// ── Footer year ──
const yearEl = document.getElementById('footer-year')
if (yearEl) yearEl.textContent = new Date().getFullYear()

// ── State ──
let showSquares = true
let showLabels = true

// ── Board ──
const board = createBoard('board-geometria', {
  bbox: [-9, 9, 9, -9],
  keepAspectRatio: true,
})

// ── Triangle vertices ──
const ptA = board.create('point', [0, 5], {
  name: 'A', size: 6,
  fillColor: '#00529B', strokeColor: '#003d75',
  label: { offset: [-16, 8], fontSize: 14, fontWeight: 'bold', color: '#003d75' },
})
const ptB = board.create('point', [-4, -2], {
  name: 'B', size: 6,
  fillColor: '#00529B', strokeColor: '#003d75',
  label: { offset: [-16, -4], fontSize: 14, fontWeight: 'bold', color: '#003d75' },
})
const ptC = board.create('point', [4, -2], {
  name: 'C', size: 6,
  fillColor: '#00529B', strokeColor: '#003d75',
  label: { offset: [8, -4], fontSize: 14, fontWeight: 'bold', color: '#003d75' },
})

// ── Triangle polygon ──
const triangle = board.create('polygon', [ptA, ptB, ptC], {
  fillColor: 'rgba(0,82,155,0.06)',
  strokeColor: '#00529B',
  strokeWidth: 2,
  vertices: { visible: false },
  borders: { strokeColor: '#00529B', strokeWidth: 2.2 },
})

// ── Angle arcs ──
const angleA = board.create('angle', [ptB, ptA, ptC], {
  radius: 0.9,
  fillColor: 'rgba(0,82,155,0.15)',
  strokeColor: '#00529B',
  label: { fontSize: 12, color: '#003d75' },
  name: '',
})
const angleB = board.create('angle', [ptA, ptB, ptC], {
  radius: 0.9,
  fillColor: 'rgba(224,123,0,0.15)',
  strokeColor: '#e07b00',
  label: { fontSize: 12, color: '#b45309' },
  name: '',
})
const angleC = board.create('angle', [ptB, ptC, ptA], {
  radius: 0.9,
  fillColor: 'rgba(42,125,79,0.15)',
  strokeColor: '#2a7d4f',
  label: { fontSize: 12, color: '#1a5c39' },
  name: '',
})

// ── Side length labels ──
const labelAB = board.create('text', [
  () => (ptA.X() + ptB.X()) / 2 - 0.7,
  () => (ptA.Y() + ptB.Y()) / 2,
  () => formatNumber(dist2d(ptA.X(), ptA.Y(), ptB.X(), ptB.Y()), 2),
], { fontSize: 12, color: '#555', anchorX: 'middle' })

const labelBC = board.create('text', [
  () => (ptB.X() + ptC.X()) / 2,
  () => (ptB.Y() + ptC.Y()) / 2 - 0.55,
  () => formatNumber(dist2d(ptB.X(), ptB.Y(), ptC.X(), ptC.Y()), 2),
], { fontSize: 12, color: '#555', anchorX: 'middle' })

const labelCA = board.create('text', [
  () => (ptC.X() + ptA.X()) / 2 + 0.55,
  () => (ptC.Y() + ptA.Y()) / 2,
  () => formatNumber(dist2d(ptC.X(), ptC.Y(), ptA.X(), ptA.Y()), 2),
], { fontSize: 12, color: '#555', anchorX: 'middle' })

// ── Pythagorean squares (drawn on each side) ──
// Square on side BC (side a)
function squareOnSide(p1, p2, color) {
  const sq = board.create('polygon', [
    p1,
    p2,
    () => {
      const dx = p2.X() - p1.X()
      const dy = p2.Y() - p1.Y()
      return [p2.X() - dy, p2.Y() + dx]
    },
    () => {
      const dx = p2.X() - p1.X()
      const dy = p2.Y() - p1.Y()
      return [p1.X() - dy, p1.Y() + dx]
    },
  ], {
    fillColor: color,
    fillOpacity: 0.15,
    strokeColor: color,
    strokeWidth: 1.5,
    vertices: { visible: false },
    borders: { strokeColor: color, strokeWidth: 1.5 },
    highlight: false,
    fixed: true,
  })
  return sq
}

const squareA = squareOnSide(ptB, ptC, '#e07b00')  // side a = BC
const squareB = squareOnSide(ptC, ptA, '#2a7d4f')  // side b = CA
const squareC = squareOnSide(ptA, ptB, '#9b0045')  // side c = AB

// ── DOM refs ──
const statAngA   = document.getElementById('stat-angA')
const statAngB   = document.getElementById('stat-angB')
const statAngC   = document.getElementById('stat-angC')
const statSum    = document.getElementById('stat-sum')
const statSideA  = document.getElementById('stat-sideA')
const statSideB  = document.getElementById('stat-sideB')
const statSideC  = document.getElementById('stat-sideC')
const statArea   = document.getElementById('stat-area')
const statPythag = document.getElementById('stat-pythag')
const statPythagBlock = document.getElementById('stat-pythag-block')
const statA2     = document.getElementById('stat-a2')
const statB2     = document.getElementById('stat-b2')
const statC2     = document.getElementById('stat-c2')
const statAb2    = document.getElementById('stat-ab2')

// ── Update stats ──
function updateStats() {
  const angA = toDegrees(angleA.Value())
  const angB = toDegrees(angleB.Value())
  const angC = toDegrees(angleC.Value())
  const sum  = angA + angB + angC

  statAngA.textContent = formatNumber(angA, 1) + '°'
  statAngB.textContent = formatNumber(angB, 1) + '°'
  statAngC.textContent = formatNumber(angC, 1) + '°'
  statSum.textContent  = formatNumber(sum, 1) + '°'

  // Side lengths
  const sideA = dist2d(ptB.X(), ptB.Y(), ptC.X(), ptC.Y())
  const sideB = dist2d(ptC.X(), ptC.Y(), ptA.X(), ptA.Y())
  const sideC = dist2d(ptA.X(), ptA.Y(), ptB.X(), ptB.Y())

  statSideA.textContent = formatNumber(sideA, 3)
  statSideB.textContent = formatNumber(sideB, 3)
  statSideC.textContent = formatNumber(sideC, 3)

  // Area (shoelace)
  const area = 0.5 * Math.abs(
    (ptB.X() - ptA.X()) * (ptC.Y() - ptA.Y()) -
    (ptC.X() - ptA.X()) * (ptB.Y() - ptA.Y())
  )
  statArea.textContent = formatNumber(area, 3)

  // Pythagorean theorem — identify largest side as hypotenuse
  const sides = [
    { name: 'a (BC)', val: sideA },
    { name: 'b (CA)', val: sideB },
    { name: 'c (AB)', val: sideC },
  ].sort((x, y) => y.val - x.val)

  const hyp = sides[0].val
  const leg1 = sides[1].val
  const leg2 = sides[2].val
  const a2 = leg1 * leg1
  const b2 = leg2 * leg2
  const c2 = hyp * hyp
  const diff = Math.abs(a2 + b2 - c2)

  statA2.textContent  = formatNumber(leg1 * leg1, 2)
  statB2.textContent  = formatNumber(leg2 * leg2, 2)
  statC2.textContent  = formatNumber(hyp * hyp, 2)
  statAb2.textContent = formatNumber(a2 + b2, 2)

  const isRight = diff < 0.15
  if (isRight) {
    statPythag.textContent = '✓ Triángulo rectángulo'
    statPythagBlock.className = 'stat-block stat-block--success'
  } else {
    statPythag.textContent = 'No rectángulo'
    statPythagBlock.className = 'stat-block'
  }
}

board.on('update', updateStats)

// ── Buttons ──
document.getElementById('btn-reset').addEventListener('click', () => {
  ptA.setPosition(JXG.COORDS_BY_USER, [0, 5])
  ptB.setPosition(JXG.COORDS_BY_USER, [-4, -2])
  ptC.setPosition(JXG.COORDS_BY_USER, [4, -2])
  board.update()
})

document.getElementById('btn-toggle-squares').addEventListener('click', (e) => {
  showSquares = !showSquares
  squareA.setAttribute({ visible: showSquares })
  squareB.setAttribute({ visible: showSquares })
  squareC.setAttribute({ visible: showSquares })
  e.target.textContent = `Cuadrados: ${showSquares ? 'ON' : 'OFF'}`
  board.update()
})

document.getElementById('btn-toggle-labels').addEventListener('click', (e) => {
  showLabels = !showLabels
  labelAB.setAttribute({ visible: showLabels })
  labelBC.setAttribute({ visible: showLabels })
  labelCA.setAttribute({ visible: showLabels })
  e.target.textContent = `Medidas: ${showLabels ? 'ON' : 'OFF'}`
  board.update()
})

// ── ResizeObserver ──
const container = document.getElementById('board-geometria')
attachResizeObserver(board, container)

// ── Init ──
updateStats()

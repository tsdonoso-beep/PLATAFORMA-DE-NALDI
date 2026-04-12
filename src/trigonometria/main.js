import JXG from 'jsxgraph'
import { createBoard, attachResizeObserver } from '../shared/js/board-factory.js'
import { formatNumber, toDegrees, toRadians } from '../shared/js/utils.js'

document.getElementById('footer-year').textContent = new Date().getFullYear()

// ── Two boards ─────────────────────────────────────────────────────────────
const circleBoard = JXG.JSXGraph.initBoard('board-circle', {
  boundingbox: [-1.6, 1.6, 1.6, -1.6],
  axis: true, grid: false, showCopyright: false, showNavigation: false,
  keepAspectRatio: true,
  zoom: { enabled: false }, pan: { enabled: false },
  defaultAxes: {
    x: { strokeColor: '#00529B', strokeWidth: 1.2, ticks: { strokeColor: '#888', strokeWidth: 1, label: { fontSize: 9 } } },
    y: { strokeColor: '#00529B', strokeWidth: 1.2, ticks: { strokeColor: '#888', strokeWidth: 1, label: { fontSize: 9 } } },
  },
  background: { color: '#fafcff', opacity: 1 },
})

const waveBoard = JXG.JSXGraph.initBoard('board-wave', {
  boundingbox: [-0.4, 2, Math.PI * 2 + 0.4, -2],
  axis: true, grid: true, showCopyright: false, showNavigation: false,
  keepAspectRatio: false,
  zoom: { enabled: false }, pan: { enabled: false },
  defaultAxes: {
    x: { strokeColor: '#00529B', strokeWidth: 1.2, ticks: { strokeColor: '#888', strokeWidth: 1, label: { fontSize: 9 } } },
    y: { strokeColor: '#00529B', strokeWidth: 1.2, ticks: { strokeColor: '#888', strokeWidth: 1, label: { fontSize: 9 } } },
  },
  background: { color: '#fafcff', opacity: 1 },
})

// ── Circle board elements ──────────────────────────────────────────────────
// Unit circle
circleBoard.create('circle', [[0,0], 1], { strokeColor: '#ccc', strokeWidth: 1.5, fillColor: 'rgba(0,82,155,0.03)' })

// Radius vector endpoint (draggable on circle)
let thetaRad = toRadians(45)

const ptOnCircle = circleBoard.create('point', [Math.cos(thetaRad), Math.sin(thetaRad)], {
  name: 'P', size: 7,
  fillColor: '#e07b00', strokeColor: '#b45309',
  label: { offset: [8, 8], fontSize: 12, fontWeight: 'bold', color: '#b45309' },
})

// Radius line
const radiusLine = circleBoard.create('segment', [[0,0], ptOnCircle], {
  strokeColor: '#00529B', strokeWidth: 2,
})

// sin projection (vertical) — dashed
const sinLine = circleBoard.create('segment', [
  () => [ptOnCircle.X(), 0],
  ptOnCircle,
], { strokeColor: '#e07b00', strokeWidth: 2, dash: 1 })

// cos projection (horizontal) — dashed
const cosLine = circleBoard.create('segment', [
  [0, 0],
  () => [ptOnCircle.X(), 0],
], { strokeColor: '#2a7d4f', strokeWidth: 2, dash: 1 })

// sin label
const sinLabel = circleBoard.create('text', [
  () => ptOnCircle.X() + 0.08,
  () => ptOnCircle.Y() / 2,
  () => `sin=${formatNumber(Math.sin(thetaRad), 3)}`,
], { fontSize: 10, color: '#e07b00' })

// cos label
const cosLabel = circleBoard.create('text', [
  () => ptOnCircle.X() / 2,
  -0.12,
  () => `cos=${formatNumber(Math.cos(thetaRad), 3)}`,
], { fontSize: 10, color: '#2a7d4f', anchorX: 'middle' })

// Angle arc
const angleArc = circleBoard.create('angle', [
  [1, 0],
  [0, 0],
  ptOnCircle,
], { radius: 0.25, strokeColor: '#00529B', fillColor: 'rgba(0,82,155,0.1)', name: '', label: { offset: [18, 0] } })

// Special angle labels on the circle
const SPECIAL = [
  [0, '0'], [30, '30°'], [45, '45°'], [60, '60°'], [90, '90°'],
  [120, '120°'], [135, '135°'], [150, '150°'], [180, '180°'],
  [210, '210°'], [225, '225°'], [240, '240°'], [270, '270°'],
  [300, '300°'], [315, '315°'], [330, '330°'],
]
const specialPts = SPECIAL.map(([deg]) => {
  const r = toRadians(deg)
  return circleBoard.create('point', [Math.cos(r), Math.sin(r)], {
    name: '', size: 3, fillColor: '#ccc', strokeColor: '#aaa', fixed: true,
    highlight: false, visible: false,
  })
})
const specialLabels = SPECIAL.map(([deg, label]) => {
  const r = toRadians(deg)
  const x = Math.cos(r) * 1.25, y = Math.sin(r) * 1.25
  return circleBoard.create('text', [x, y, label], { fontSize: 9, color: '#999', anchorX: 'middle', visible: false })
})

// tan line (from (1,0) to y-axis crossing)
const tanLine = circleBoard.create('segment', [
  [1, 0],
  () => [1, Math.tan(thetaRad)],
], { strokeColor: '#9b0045', strokeWidth: 2, visible: false })
const tanLabel = circleBoard.create('text', [1.05, () => Math.tan(thetaRad) / 2, () => `tan=${formatNumber(Math.tan(thetaRad), 3)}`], {
  fontSize: 10, color: '#9b0045', visible: false,
})

// ── Wave board elements ────────────────────────────────────────────────────
function getWaveParams() {
  return {
    A: parseFloat(document.getElementById('sl-A').value),
    B: parseFloat(document.getElementById('sl-B').value),
    C: parseFloat(document.getElementById('sl-C').value),
    D: parseFloat(document.getElementById('sl-D').value),
  }
}

const sinWave = waveBoard.create('functiongraph', [
  x => { const { A, B, C, D } = getWaveParams(); return A * Math.sin(B * x + C) + D },
  -1, Math.PI * 2 + 1,
], { strokeColor: '#e07b00', strokeWidth: 2.5 })

const cosWave = waveBoard.create('functiongraph', [
  x => { const { A, B, C, D } = getWaveParams(); return A * Math.cos(B * x + C) + D },
  -1, Math.PI * 2 + 1,
], { strokeColor: '#2a7d4f', strokeWidth: 2, dash: 1, visible: true })

const tanWave = waveBoard.create('functiongraph', [
  x => { const { A, B, C, D } = getWaveParams(); const t = A * Math.tan(B * x + C) + D; return Math.abs(t) > 5 ? NaN : t },
  -1, Math.PI * 2 + 1,
], { strokeColor: '#9b0045', strokeWidth: 1.8, dash: 2, visible: false })

// Vertical line at current angle
const vertLine = waveBoard.create('line', [[thetaRad, -10],[thetaRad, 10]], {
  strokeColor: '#00529B', strokeWidth: 1.2, dash: 1,
})

// Marker dots on waves
const markerSin = waveBoard.create('point', [thetaRad, Math.sin(thetaRad)], {
  name: '', fixed: true, size: 5, fillColor: '#e07b00', strokeColor: '#b45309', highlight: false,
})
const markerCos = waveBoard.create('point', [thetaRad, Math.cos(thetaRad)], {
  name: '', fixed: true, size: 5, fillColor: '#2a7d4f', strokeColor: '#1a5c39', highlight: false,
})

// Wave legend
waveBoard.create('text', [0.1, 1.7, 'sin(x)'], { fontSize: 11, color: '#e07b00' })
waveBoard.create('text', [0.1, 1.5, 'cos(x)'], { fontSize: 11, color: '#2a7d4f' })

// ── Sync angle between slider ↔ draggable point ────────────────────────────
function updateFromTheta(deg) {
  thetaRad = toRadians(deg)
  document.getElementById('val-theta').textContent = Math.round(deg)
  document.getElementById('sl-theta').value = Math.round(deg)

  const s = Math.sin(thetaRad), c = Math.cos(thetaRad), t = Math.tan(thetaRad)

  document.getElementById('stat-deg').textContent = Math.round(deg) + '°'
  document.getElementById('stat-rad').textContent = formatNumber(thetaRad, 4)
  document.getElementById('stat-sin').textContent = formatNumber(s, 4)
  document.getElementById('stat-cos').textContent = formatNumber(c, 4)
  document.getElementById('stat-tan').textContent = Math.abs(c) < 0.01 ? '∞' : formatNumber(t, 4)
  document.getElementById('stat-cot').textContent = Math.abs(s) < 0.01 ? '∞' : formatNumber(c / s, 4)
  document.getElementById('stat-sec').textContent = Math.abs(c) < 0.01 ? '∞' : formatNumber(1 / c, 4)
  document.getElementById('stat-csc').textContent = Math.abs(s) < 0.01 ? '∞' : formatNumber(1 / s, 4)

  // Move circle point
  ptOnCircle.setPosition(JXG.COORDS_BY_USER, [c, s])
  tanLine.point2.setPosition(JXG.COORDS_BY_USER, [1, t])
  tanLabel.setPosition(JXG.COORDS_BY_USER, [1.05, t / 2])

  // Move wave markers and vertical line
  const { A, B, C: ph, D } = getWaveParams()
  markerSin.setPosition(JXG.COORDS_BY_USER, [thetaRad, A * Math.sin(B * thetaRad + ph) + D])
  markerCos.setPosition(JXG.COORDS_BY_USER, [thetaRad, A * Math.cos(B * thetaRad + ph) + D])
  vertLine.point1.setPosition(JXG.COORDS_BY_USER, [thetaRad, -10])
  vertLine.point2.setPosition(JXG.COORDS_BY_USER, [thetaRad, 10])

  circleBoard.update()
  waveBoard.update()
}

// When point on circle is dragged
circleBoard.on('update', () => {
  const deg = (Math.atan2(ptOnCircle.Y(), ptOnCircle.X()) * 180 / Math.PI + 360) % 360
  updateFromTheta(deg)
})

// Slider
document.getElementById('sl-theta').addEventListener('input', e => updateFromTheta(parseFloat(e.target.value)))

// Wave parameter sliders
;[['sl-A','val-A'],['sl-B','val-B'],['sl-C','val-C'],['sl-D','val-D']].forEach(([sid, vid]) => {
  document.getElementById(sid).addEventListener('input', () => {
    document.getElementById(vid).textContent = document.getElementById(sid).value
    sinWave.Y = x => { const { A, B, C, D } = getWaveParams(); return A * Math.sin(B * x + C) + D }
    cosWave.Y = x => { const { A, B, C, D } = getWaveParams(); return A * Math.cos(B * x + C) + D }
    tanWave.Y = x => { const { A, B, C, D } = getWaveParams(); const t = A * Math.tan(B * x + C) + D; return Math.abs(t) > 5 ? NaN : t }
    updateFromTheta(parseFloat(document.getElementById('sl-theta').value))
  })
})

// Toggle overlays
document.getElementById('chk-cos').addEventListener('change', e => { cosWave.setAttribute({ visible: e.target.checked }); markerCos.setAttribute({ visible: e.target.checked }); waveBoard.update() })
document.getElementById('chk-tan').addEventListener('change', e => { tanWave.setAttribute({ visible: e.target.checked }); tanLine.setAttribute({ visible: e.target.checked }); tanLabel.setAttribute({ visible: e.target.checked }); waveBoard.update() })
document.getElementById('chk-special').addEventListener('change', e => { specialPts.forEach(p => p.setAttribute({ visible: e.target.checked })); specialLabels.forEach(l => l.setAttribute({ visible: e.target.checked })); circleBoard.update() })

// ── Animation ──────────────────────────────────────────────────────────────
let animating = false, animFrame2 = null, animAngle = 45
const btnAnim = document.getElementById('btn-animate')
btnAnim.addEventListener('click', () => {
  animating = !animating
  btnAnim.textContent = animating ? '⏸ Pausar' : '▶ Animar'
  if (animating) animate()
  else if (animFrame2) { cancelAnimationFrame(animFrame2); animFrame2 = null }
})
function animate() {
  animAngle = (animAngle + 0.8) % 360
  updateFromTheta(animAngle)
  animFrame2 = requestAnimationFrame(animate)
}

// ── ResizeObserver ─────────────────────────────────────────────────────────
attachResizeObserver(circleBoard, document.getElementById('board-circle'))
attachResizeObserver(waveBoard,   document.getElementById('board-wave'))

// ── Init ───────────────────────────────────────────────────────────────────
updateFromTheta(45)

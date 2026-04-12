import JXG from 'jsxgraph'
import '../shared/styles/jsxgraph.css'
import '../shared/styles/base.css'
import '../shared/styles/components.css'
import '../shared/styles/simulator-layout.css'
import '../shared/styles/tabs.css'
import { createBoard, attachResizeObserver } from '../shared/js/board-factory.js'
import { formatNumber, toRadians } from '../shared/js/utils.js'

document.getElementById('footer-year').textContent = new Date().getFullYear()

// ── Board ──────────────────────────────────────────────────────────────────
const board = createBoard('board-fisica', {
  bbox: [-3, 35, 80, -5],
  keepAspectRatio: false,
  axis: true,
  grid: false,
})

// Ground line
board.create('line', [[-100, 0], [200, 0]], { strokeColor: '#888', strokeWidth: 1.5, fixed: true, highlight: false })

// ── State ──────────────────────────────────────────────────────────────────
let animFrame = null
let trajectories = []   // stored JXG curve objects for previous shots
let velArrows = []

// ── Get params ─────────────────────────────────────────────────────────────
function getParams() {
  const v0    = parseFloat(document.getElementById('sl-v0').value)
  const thetaDeg = parseFloat(document.getElementById('sl-theta').value)
  const h0    = parseFloat(document.getElementById('sl-h0').value)
  const g     = parseFloat(document.getElementById('sl-g').value)
  const useAir = document.getElementById('chk-air').checked
  const k     = useAir ? parseFloat(document.getElementById('sl-k').value) : 0
  const theta = toRadians(thetaDeg)
  return { v0, theta, thetaDeg, h0, g, k }
}

// ── Analytical trajectory (no air resistance): y(x) ──────────────────────
function makeTrajectory({ v0, theta, h0, g }) {
  const vx = v0 * Math.cos(theta)
  const vy = v0 * Math.sin(theta)
  return (x) => {
    if (Math.abs(vx) < 1e-10) return h0
    const t = x / vx
    return h0 + vy * t - 0.5 * g * t * t
  }
}

function flightTime({ v0, theta, h0, g }) {
  const vy = v0 * Math.sin(theta)
  const disc = vy * vy + 2 * g * h0
  if (disc < 0) return 0
  return (vy + Math.sqrt(disc)) / g
}

// ── Numerical trajectory with air resistance (Euler method) ──────────────
function computeNumerical({ v0, theta, h0, g, k }, dt = 0.01) {
  const pts = []
  let x = 0, y = h0
  let vx = v0 * Math.cos(theta), vy = v0 * Math.sin(theta)
  let t = 0
  const maxT = 200
  while (y >= 0 && t < maxT) {
    pts.push([x, y])
    const v = Math.sqrt(vx * vx + vy * vy)
    const ax = -k * v * vx
    const ay = -g - k * v * vy
    vx += ax * dt; vy += ay * dt
    x  += vx * dt; y  += vy * dt
    t  += dt
  }
  pts.push([x, Math.max(y, 0)])
  return pts
}

// ── Draw trajectory curve ──────────────────────────────────────────────────
const COLORS = ['#00529B', '#e07b00', '#2a7d4f', '#9b0045', '#555']
let shotCount = 0

// ── Current projectile point (animated) ───────────────────────────────────
const projectile = board.create('point', [0, 0], {
  name: '', size: 8, fillColor: '#e07b00', strokeColor: '#b45309', fixed: true, highlight: false,
})

// Velocity arrow components
const velArrowTotal = board.create('arrow', [[0,0],[1,1]], { strokeColor: '#9b0045', strokeWidth: 2.5, lastArrow: { size: 7 }, highlight: false })
const velArrowX     = board.create('arrow', [[0,0],[1,0]], { strokeColor: '#00529B', strokeWidth: 1.8, lastArrow: { size: 5 }, dash: 1, highlight: false })
const velArrowY     = board.create('arrow', [[0,0],[0,1]], { strokeColor: '#2a7d4f', strokeWidth: 1.8, lastArrow: { size: 5 }, dash: 1, highlight: false })

// ── Launch animation ────────────────────────────────────────────────────────
function updateStats(p) {
  const { v0, theta, h0, g, k } = p
  const vx0 = v0 * Math.cos(theta), vy0 = v0 * Math.sin(theta)
  document.getElementById('stat-v0x').textContent = formatNumber(vx0, 2) + ' m/s'
  document.getElementById('stat-v0y').textContent = formatNumber(vy0, 2) + ' m/s'

  if (k === 0) {
    const tFly = flightTime(p)
    const xMax = vx0 * tFly
    const yMax = h0 + vy0 * vy0 / (2 * g)
    const vImp = Math.sqrt(vx0 * vx0 + (vy0 - g * tFly) ** 2)
    document.getElementById('stat-xmax').textContent  = formatNumber(xMax, 2) + ' m'
    document.getElementById('stat-ymax').textContent  = formatNumber(yMax, 2) + ' m'
    document.getElementById('stat-tfly').textContent  = formatNumber(tFly, 2) + ' s'
    document.getElementById('stat-vimp').textContent  = formatNumber(vImp, 2) + ' m/s'
  }
}

function launch() {
  if (animFrame) { cancelAnimationFrame(animFrame); animFrame = null }

  const p = getParams()
  const color = COLORS[shotCount % COLORS.length]
  shotCount++

  let pts, xVals, yVals
  if (p.k === 0) {
    // Analytical
    const yFn = makeTrajectory(p)
    const tFly = flightTime(p)
    const xMax = p.v0 * Math.cos(p.theta) * tFly
    const steps = 300
    xVals = []; yVals = []
    for (let i = 0; i <= steps; i++) {
      const x = (xMax / steps) * i
      const y = yFn(x)
      if (y < 0) break
      xVals.push(x); yVals.push(y)
    }
    pts = xVals.map((x, i) => [x, yVals[i]])
  } else {
    pts = computeNumerical(p)
    xVals = pts.map(pt => pt[0])
    yVals = pts.map(pt => pt[1])
  }

  // Draw trajectory curve
  const traj = board.create('curve', [xVals, yVals], {
    strokeColor: color, strokeWidth: 2, highlight: false,
  })
  trajectories.push(traj)
  updateStats(p)

  // Animate projectile
  let i = 0
  const showVec   = document.getElementById('chk-vectors').checked
  const showComp  = document.getElementById('chk-components').checked
  const vx0 = p.v0 * Math.cos(p.theta)
  const vy0 = p.v0 * Math.sin(p.theta)

  function step() {
    if (i >= pts.length) {
      velArrowTotal.setAttribute({ visible: false })
      velArrowX.setAttribute({ visible: false })
      velArrowY.setAttribute({ visible: false })
      return
    }
    const [x, y] = pts[i]
    projectile.setPosition(JXG.COORDS_BY_USER, [x, y])

    // Velocity at time t
    const t = p.k === 0 ? (x / (vx0 || 1e-6)) : (i * 0.01)
    const vx = p.k === 0 ? vx0 : vx0 * Math.exp(-p.k * t)
    const vy = p.k === 0 ? (vy0 - p.g * t) : (vy0 - p.g * t) * Math.exp(-p.k * t)
    const scale = 0.3

    velArrowTotal.setAttribute({ visible: showVec })
    velArrowTotal.point1.setPosition(JXG.COORDS_BY_USER, [x, y])
    velArrowTotal.point2.setPosition(JXG.COORDS_BY_USER, [x + vx * scale, y + vy * scale])

    velArrowX.setAttribute({ visible: showVec && showComp })
    velArrowX.point1.setPosition(JXG.COORDS_BY_USER, [x, y])
    velArrowX.point2.setPosition(JXG.COORDS_BY_USER, [x + vx * scale, y])

    velArrowY.setAttribute({ visible: showVec && showComp })
    velArrowY.point1.setPosition(JXG.COORDS_BY_USER, [x, y])
    velArrowY.point2.setPosition(JXG.COORDS_BY_USER, [x, y + vy * scale])

    board.update()
    i += 2
    animFrame = requestAnimationFrame(step)
  }
  step()
}

// ── Controls ───────────────────────────────────────────────────────────────
document.getElementById('btn-launch').addEventListener('click', launch)

document.getElementById('btn-clear').addEventListener('click', () => {
  if (animFrame) { cancelAnimationFrame(animFrame); animFrame = null }
  trajectories.forEach(t => { try { board.removeObject(t) } catch {} })
  trajectories = []; shotCount = 0
  projectile.setPosition(JXG.COORDS_BY_USER, [0, 0])
  velArrowTotal.setAttribute({ visible: false })
  velArrowX.setAttribute({ visible: false })
  velArrowY.setAttribute({ visible: false })
  board.update()
})

document.getElementById('sel-planet').addEventListener('change', e => {
  const g = parseFloat(e.target.value)
  if (!isNaN(g)) {
    document.getElementById('sl-g').value = g
    document.getElementById('val-g').textContent = g
  }
})

;[['sl-v0','val-v0'],['sl-theta','val-theta'],['sl-h0','val-h0'],['sl-g','val-g'],['sl-k','val-k']].forEach(([sid, vid]) => {
  document.getElementById(sid).addEventListener('input', () => {
    document.getElementById(vid).textContent = document.getElementById(sid).value
  })
})

document.getElementById('chk-air').addEventListener('change', e => {
  document.getElementById('group-air').style.display = e.target.checked ? '' : 'none'
})

velArrowTotal.setAttribute({ visible: false })
velArrowX.setAttribute({ visible: false })
velArrowY.setAttribute({ visible: false })

attachResizeObserver(board, document.getElementById('board-fisica'))

// Auto-preview on load
const p0 = getParams()
updateStats(p0)

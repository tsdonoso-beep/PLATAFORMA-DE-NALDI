import JXG from 'jsxgraph'
import { createBoard, attachResizeObserver } from '../shared/js/board-factory.js'
import { formatNumber, toDegrees, dist2d } from '../shared/js/utils.js'

document.getElementById('footer-year').textContent = new Date().getFullYear()

const board = createBoard('board-geometria', { bbox: [-9, 9, 9, -9], keepAspectRatio: true })

// ════════════════════════════════════════════════════════════
// TAB 1: TRIÁNGULO Y CENTROS
// ════════════════════════════════════════════════════════════

const ptA = board.create('point', [0, 6], { name: 'A', size: 6, fillColor: '#00529B', strokeColor: '#003d75', label: { offset: [-14, 8], fontSize: 14, fontWeight: 'bold', color: '#003d75' } })
const ptB = board.create('point', [-5, -2], { name: 'B', size: 6, fillColor: '#00529B', strokeColor: '#003d75', label: { offset: [-14, -4], fontSize: 14, fontWeight: 'bold', color: '#003d75' } })
const ptC = board.create('point', [5, -2], { name: 'C', size: 6, fillColor: '#00529B', strokeColor: '#003d75', label: { offset: [8, -4], fontSize: 14, fontWeight: 'bold', color: '#003d75' } })

const tri = board.create('polygon', [ptA, ptB, ptC], {
  fillColor: 'rgba(0,82,155,0.06)', strokeColor: '#00529B', strokeWidth: 2.2,
  vertices: { visible: false }, borders: { strokeColor: '#00529B', strokeWidth: 2.2 },
})

const angA = board.create('angle', [ptB, ptA, ptC], { radius: 0.8, fillColor: 'rgba(0,82,155,0.15)', strokeColor: '#00529B', name: '' })
const angB = board.create('angle', [ptA, ptB, ptC], { radius: 0.8, fillColor: 'rgba(224,123,0,0.15)', strokeColor: '#e07b00', name: '' })
const angC = board.create('angle', [ptB, ptC, ptA], { radius: 0.8, fillColor: 'rgba(42,125,79,0.15)', strokeColor: '#2a7d4f', name: '' })

// ── Centroid G ──────────────────────────────────────────────
const centroid = board.create('point', [
  () => (ptA.X() + ptB.X() + ptC.X()) / 3,
  () => (ptA.Y() + ptB.Y() + ptC.Y()) / 3,
], { name: 'G', fixed: true, size: 7, fillColor: '#00529B', strokeColor: '#003d75', label: { offset: [8, 8], fontSize: 13, fontWeight: 'bold', color: '#003d75' } })

// Median lines
const medAG = board.create('segment', [ptA, () => [(ptB.X() + ptC.X()) / 2, (ptB.Y() + ptC.Y()) / 2]], { strokeColor: '#00529B', strokeWidth: 1.2, dash: 1 })
const medBG = board.create('segment', [ptB, () => [(ptA.X() + ptC.X()) / 2, (ptA.Y() + ptC.Y()) / 2]], { strokeColor: '#00529B', strokeWidth: 1.2, dash: 1 })
const medCG = board.create('segment', [ptC, () => [(ptA.X() + ptB.X()) / 2, (ptA.Y() + ptB.Y()) / 2]], { strokeColor: '#00529B', strokeWidth: 1.2, dash: 1 })

// ── Circumcenter O ─────────────────────────────────────────
function circumcenter() {
  const ax = ptA.X(), ay = ptA.Y()
  const bx = ptB.X(), by = ptB.Y()
  const cx = ptC.X(), cy = ptC.Y()
  const D = 2 * (ax * (by - cy) + bx * (cy - ay) + cx * (ay - by))
  if (Math.abs(D) < 1e-10) return [0, 0]
  const ux = ((ax*ax + ay*ay)*(by - cy) + (bx*bx + by*by)*(cy - ay) + (cx*cx + cy*cy)*(ay - by)) / D
  const uy = ((ax*ax + ay*ay)*(cx - bx) + (bx*bx + by*by)*(ax - cx) + (cx*cx + cy*cy)*(bx - ax)) / D
  return [ux, uy]
}
const circumPt = board.create('point', [() => circumcenter()[0], () => circumcenter()[1]], {
  name: 'O', fixed: true, size: 7, fillColor: '#e07b00', strokeColor: '#b45309',
  label: { offset: [8, 8], fontSize: 13, fontWeight: 'bold', color: '#b45309' },
})
const circumCircle = board.create('circle', [circumPt, ptA], {
  strokeColor: '#e07b00', strokeWidth: 1.5, fillColor: 'rgba(224,123,0,0.04)', fillOpacity: 0.04,
})

// ── Incenter I ─────────────────────────────────────────────
function incenter() {
  const a = dist2d(ptB.X(), ptB.Y(), ptC.X(), ptC.Y())
  const b = dist2d(ptA.X(), ptA.Y(), ptC.X(), ptC.Y())
  const c = dist2d(ptA.X(), ptA.Y(), ptB.X(), ptB.Y())
  const s = a + b + c
  if (s < 1e-10) return [0, 0]
  return [(a * ptA.X() + b * ptB.X() + c * ptC.X()) / s, (a * ptA.Y() + b * ptB.Y() + c * ptC.Y()) / s]
}
function inradius() {
  const a = dist2d(ptB.X(), ptB.Y(), ptC.X(), ptC.Y())
  const b = dist2d(ptA.X(), ptA.Y(), ptC.X(), ptC.Y())
  const c = dist2d(ptA.X(), ptA.Y(), ptB.X(), ptB.Y())
  const s = (a + b + c) / 2
  const area = Math.abs((ptB.X()-ptA.X())*(ptC.Y()-ptA.Y())-(ptC.X()-ptA.X())*(ptB.Y()-ptA.Y())) / 2
  return s > 1e-10 ? area / s : 0
}
const incenterPt = board.create('point', [() => incenter()[0], () => incenter()[1]], {
  name: 'I', fixed: true, size: 7, fillColor: '#2a7d4f', strokeColor: '#1a5c39',
  label: { offset: [8, 8], fontSize: 13, fontWeight: 'bold', color: '#2a7d4f' },
})
const incircle = board.create('circle', [incenterPt, () => inradius()], {
  strokeColor: '#2a7d4f', strokeWidth: 1.5, fillColor: 'rgba(42,125,79,0.05)', fillOpacity: 0.05,
})

// ── Orthocenter H ──────────────────────────────────────────
function orthocenter() {
  const ax = ptA.X(), ay = ptA.Y(), bx = ptB.X(), by = ptB.Y(), cx = ptC.X(), cy = ptC.Y()
  const D = ax*(by - cy) + bx*(cy - ay) + cx*(ay - by)
  if (Math.abs(D) < 1e-10) return [0, 0]
  const Hx = (ax*ax*(by-cy) + bx*bx*(cy-ay) + cx*cx*(ay-by) - (by*cy*(by-cy) + ay*cy*(cy-ay) + ay*by*(ay-by))) / D
  const Hy = (ay*ay*(bx-cx) + by*by*(cx-ax) + cy*cy*(ax-bx) - (bx*cx*(bx-cx) + ax*cx*(cx-ax) + ax*bx*(ax-bx))) / D
  return [Hx, Hy]
}
const orthoPt = board.create('point', [() => orthocenter()[0], () => orthocenter()[1]], {
  name: 'H', fixed: true, size: 7, fillColor: '#9b0045', strokeColor: '#6d0030',
  label: { offset: [8, 8], fontSize: 13, fontWeight: 'bold', color: '#9b0045' },
})

// Altitude lines (foot of perpendicular)
function altFoot(P, Q, R) {
  return () => {
    const dx = Q.X()-P.X(), dy = Q.Y()-P.Y()
    const t = ((R.X()-P.X())*dx + (R.Y()-P.Y())*dy) / (dx*dx + dy*dy)
    return [P.X() + t*dx, P.Y() + t*dy]
  }
}
const altA = board.create('segment', [ptA, altFoot(ptB, ptC, ptA)()], { strokeColor: '#9b0045', strokeWidth: 1.2, dash: 1 })
const altB = board.create('segment', [ptB, altFoot(ptA, ptC, ptB)()], { strokeColor: '#9b0045', strokeWidth: 1.2, dash: 1 })
const altC = board.create('segment', [ptC, altFoot(ptA, ptB, ptC)()], { strokeColor: '#9b0045', strokeWidth: 1.2, dash: 1 })

// ── Euler line (O–G–H) ─────────────────────────────────────
const eulerLine = board.create('line', [circumPt, orthoPt], {
  strokeColor: '#555', strokeWidth: 1.5, dash: 3,
})

// ── Stats update ───────────────────────────────────────────
board.on('update', () => {
  const dA = toDegrees(angA.Value()), dB = toDegrees(angB.Value()), dC = toDegrees(angC.Value())
  document.getElementById('stat-angA').textContent = formatNumber(dA, 1) + '°'
  document.getElementById('stat-angB').textContent = formatNumber(dB, 1) + '°'
  document.getElementById('stat-angC').textContent = formatNumber(dC, 1) + '°'
  document.getElementById('stat-sum').textContent  = formatNumber(dA + dB + dC, 1) + '°'

  const area = Math.abs((ptB.X()-ptA.X())*(ptC.Y()-ptA.Y())-(ptC.X()-ptA.X())*(ptB.Y()-ptA.Y())) / 2
  document.getElementById('stat-area').textContent = formatNumber(area, 3)

  const sA = dist2d(ptB.X(), ptB.Y(), ptC.X(), ptC.Y())
  const sB = dist2d(ptA.X(), ptA.Y(), ptC.X(), ptC.Y())
  const sC = dist2d(ptA.X(), ptA.Y(), ptB.X(), ptB.Y())
  const R = (sA * sB * sC) / (4 * area || 1e-10)
  const r = inradius()
  document.getElementById('stat-R').textContent = formatNumber(R, 3)
  document.getElementById('stat-r').textContent = formatNumber(r, 3)

  const maxAng = Math.max(dA, dB, dC)
  let tipo = ''
  if (Math.abs(maxAng - 90) < 1) tipo = 'Rectángulo'
  else if (maxAng > 90) tipo = 'Obtusángulo'
  else tipo = 'Acutángulo'
  const sides = [sA, sB, sC].sort()
  if (Math.abs(sides[0]-sides[2]) < 0.05) tipo += ' · Equilátero'
  else if (Math.abs(sides[0]-sides[1]) < 0.05 || Math.abs(sides[1]-sides[2]) < 0.05) tipo += ' · Isósceles'
  else tipo += ' · Escaleno'
  document.getElementById('stat-tipo').textContent = tipo
})

// ── Toggles for triangle tab ───────────────────────────────
function applyTriangleToggles() {
  const showC = document.getElementById('chk-centroid').checked
  const showO = document.getElementById('chk-circum').checked
  const showI = document.getElementById('chk-incenter').checked
  const showH = document.getElementById('chk-ortho').checked
  const showE = document.getElementById('chk-euler').checked
  const showAlt = document.getElementById('chk-altitudes').checked
  const showMed = document.getElementById('chk-medians').checked

  centroid.setAttribute({ visible: showC })
  medAG.setAttribute({ visible: showC && showMed }); medBG.setAttribute({ visible: showC && showMed }); medCG.setAttribute({ visible: showC && showMed })
  circumPt.setAttribute({ visible: showO }); circumCircle.setAttribute({ visible: showO })
  incenterPt.setAttribute({ visible: showI }); incircle.setAttribute({ visible: showI })
  orthoPt.setAttribute({ visible: showH })
  altA.setAttribute({ visible: showH && showAlt }); altB.setAttribute({ visible: showH && showAlt }); altC.setAttribute({ visible: showH && showAlt })
  eulerLine.setAttribute({ visible: showE && showO && showH })
  board.update()
}
['chk-centroid','chk-circum','chk-incenter','chk-ortho','chk-euler','chk-altitudes','chk-medians'].forEach(id => {
  document.getElementById(id).addEventListener('change', applyTriangleToggles)
})

// ════════════════════════════════════════════════════════════
// TAB 2: CÓNICAS
// ════════════════════════════════════════════════════════════
let conicEl = null, focusEls = [], directrixEl = null, axisEls = []

function clearConics() {
  [conicEl, directrixEl, ...focusEls, ...axisEls].forEach(el => {
    if (el) try { board.removeObject(el) } catch {}
  })
  conicEl = null; directrixEl = null; focusEls = []; axisEls = []
}

function buildConic() {
  clearConics()
  const type  = document.getElementById('sel-conic').value
  const a     = parseFloat(document.getElementById('sl-a').value)
  const b     = parseFloat(document.getElementById('sl-b').value)
  const p     = parseFloat(document.getElementById('sl-p').value)
  const showF = document.getElementById('chk-foci').checked

  const blue = '#00529B', ora = '#e07b00', grn = '#2a7d4f', red = '#9b0045'

  if (type === 'circle') {
    conicEl = board.create('circle', [[0, 0], a], { strokeColor: blue, strokeWidth: 2.2, fillColor: 'rgba(0,82,155,0.05)' })
    document.getElementById('stat-e').textContent = '0'
    document.getElementById('stat-c').textContent = '0'
    document.getElementById('stat-focos').textContent = '(0, 0)'
    document.getElementById('stat-carea').textContent = formatNumber(Math.PI * a * a, 3)
  } else if (type === 'ellipse') {
    conicEl = board.create('conic', [[-a,0],[a,0],[0,b],[0,-b],[1,0]], { strokeColor: blue, strokeWidth: 2.2, fillColor: 'rgba(0,82,155,0.05)' })
    const c = Math.sqrt(Math.max(a*a - b*b, 0))
    const e = c / a
    document.getElementById('stat-e').textContent = formatNumber(e, 4)
    document.getElementById('stat-c').textContent = formatNumber(c, 3)
    document.getElementById('stat-focos').textContent = `(±${formatNumber(c,2)}, 0)`
    document.getElementById('stat-carea').textContent = formatNumber(Math.PI * a * b, 3)
    if (showF) {
      focusEls.push(board.create('point', [c, 0], { name: 'F₁', fixed: true, size: 5, fillColor: ora, strokeColor: '#b45309', label: { offset: [0,-16] } }))
      focusEls.push(board.create('point', [-c, 0], { name: 'F₂', fixed: true, size: 5, fillColor: ora, strokeColor: '#b45309', label: { offset: [0,-16] } }))
    }
  } else if (type === 'hyperbola') {
    conicEl = board.create('conic', [[-a,0],[a,0],[0,b],[0,-b],[1,0.5]], { strokeColor: red, strokeWidth: 2.2 })
    const c = Math.sqrt(a*a + b*b)
    const e = c / a
    document.getElementById('stat-e').textContent = formatNumber(e, 4)
    document.getElementById('stat-c').textContent = formatNumber(c, 3)
    document.getElementById('stat-focos').textContent = `(±${formatNumber(c,2)}, 0)`
    document.getElementById('stat-carea').textContent = '∞'
    if (showF) {
      focusEls.push(board.create('point', [c, 0], { name: 'F₁', fixed: true, size: 5, fillColor: red, strokeColor: '#6d0030', label: { offset: [0,-16] } }))
      focusEls.push(board.create('point', [-c, 0], { name: 'F₂', fixed: true, size: 5, fillColor: red, strokeColor: '#6d0030', label: { offset: [0,-16] } }))
      // Asymptotes
      axisEls.push(board.create('line', [[0,0],[a,b]], { strokeColor: '#aaa', strokeWidth: 1, dash: 2 }))
      axisEls.push(board.create('line', [[0,0],[a,-b]], { strokeColor: '#aaa', strokeWidth: 1, dash: 2 }))
    }
  } else if (type === 'parabola') {
    conicEl = board.create('functiongraph', [x => Math.sqrt(4*p*x), 0, 9], { strokeColor: grn, strokeWidth: 2.2 })
    const conicEl2 = board.create('functiongraph', [x => -Math.sqrt(4*p*x), 0, 9], { strokeColor: grn, strokeWidth: 2.2 })
    axisEls.push(conicEl2)
    document.getElementById('stat-e').textContent = '1'
    document.getElementById('stat-c').textContent = formatNumber(p, 3)
    document.getElementById('stat-focos').textContent = `(${formatNumber(p,2)}, 0)`
    document.getElementById('stat-carea').textContent = '∞'
    if (showF) {
      focusEls.push(board.create('point', [p, 0], { name: 'F', fixed: true, size: 5, fillColor: grn, strokeColor: '#1a5c39', label: { offset: [8, 8] } }))
      directrixEl = board.create('line', [[-p,-5],[-p,5]], { strokeColor: grn, strokeWidth: 1.2, dash: 2 })
      focusEls.push(board.create('text', [-p - 0.3, 4, 'Directriz'], { fontSize: 11, color: grn, anchorX: 'right' }))
    }
  }
  board.update()
}

document.getElementById('sel-conic').addEventListener('change', () => {
  const type = document.getElementById('sel-conic').value
  document.getElementById('group-p').style.display = type === 'parabola' ? '' : 'none'
  document.getElementById('group-b').style.display = type === 'parabola' ? 'none' : ''
  buildConic()
})
;['sl-a','sl-b','sl-p'].forEach(id => {
  document.getElementById(id).addEventListener('input', () => {
    document.getElementById(`val-${id.slice(3)}`).textContent = document.getElementById(id).value
    buildConic()
  })
})
document.getElementById('chk-foci').addEventListener('change', buildConic)

// ── Tab switching ──────────────────────────────────────────
let activeTab = 'triangulo'
function setTriangleVisible(v) {
  [ptA,ptB,ptC,tri,angA,angB,angC].forEach(el => el.setAttribute({ visible: v }))
  if (v) applyTriangleToggles()
  else {
    [centroid,circumPt,circumCircle,incenterPt,incircle,orthoPt,eulerLine,altA,altB,altC,medAG,medBG,medCG].forEach(el => el.setAttribute({ visible: false }))
  }
}
function switchTab(tab) {
  activeTab = tab
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.toggle('tab-active', b.dataset.tab === tab))
  document.querySelectorAll('.tab-panel').forEach(p => p.classList.toggle('active', p.id === `panel-${tab}`))
  if (tab === 'triangulo') {
    clearConics()
    setTriangleVisible(true)
  } else {
    setTriangleVisible(false)
    buildConic()
  }
  board.update()
}
document.querySelectorAll('.tab-btn').forEach(btn => btn.addEventListener('click', () => switchTab(btn.dataset.tab)))

// ── Reset ──────────────────────────────────────────────────
document.getElementById('btn-reset').addEventListener('click', () => {
  ptA.setPosition(JXG.COORDS_BY_USER, [0, 6])
  ptB.setPosition(JXG.COORDS_BY_USER, [-5, -2])
  ptC.setPosition(JXG.COORDS_BY_USER, [5, -2])
  board.update()
})

attachResizeObserver(board, document.getElementById('board-geometria'))

// Init
applyTriangleToggles()

/**
 * Format a number to N decimal places, removing trailing zeros.
 * @param {number} n
 * @param {number} decimals
 * @returns {string}
 */
export function formatNumber(n, decimals = 3) {
  if (!isFinite(n)) return '—'
  const s = n.toFixed(decimals)
  // Remove trailing zeros after decimal point
  return s.replace(/(\.\d*?)0+$/, '$1').replace(/\.$/, '')
}

/**
 * Convert radians to degrees.
 * @param {number} rad
 * @returns {number}
 */
export function toDegrees(rad) {
  return rad * (180 / Math.PI)
}

/**
 * Convert degrees to radians.
 * @param {number} deg
 * @returns {number}
 */
export function toRadians(deg) {
  return deg * (Math.PI / 180)
}

/**
 * Clamp a value between min and max.
 * @param {number} val
 * @param {number} min
 * @param {number} max
 * @returns {number}
 */
export function clamp(val, min, max) {
  return Math.min(Math.max(val, min), max)
}

/**
 * Round to N decimal places.
 * @param {number} val
 * @param {number} decimals
 * @returns {number}
 */
export function roundTo(val, decimals = 4) {
  const factor = 10 ** decimals
  return Math.round(val * factor) / factor
}

/**
 * Compute discriminant for ax²+bx+c=0
 * @returns {{disc: number, roots: string[]}}
 */
export function quadraticRoots(a, b, c) {
  if (Math.abs(a) < 1e-10) return { disc: null, roots: ['—', '—'] }
  const disc = b * b - 4 * a * c
  if (disc < 0) {
    return { disc, roots: ['No reales', 'No reales'] }
  }
  const sq = Math.sqrt(disc)
  const r1 = (-b + sq) / (2 * a)
  const r2 = (-b - sq) / (2 * a)
  return {
    disc,
    roots: [formatNumber(r1, 3), formatNumber(r2, 3)],
  }
}

/**
 * Distance between two [x,y] points.
 */
export function dist2d(x1, y1, x2, y2) {
  return Math.hypot(x2 - x1, y2 - y1)
}

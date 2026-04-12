import JXG from 'jsxgraph'

/**
 * Creates a JSXGraph board with Inroprin brand defaults.
 * @param {string} divId - The HTML element ID to attach the board to
 * @param {object} options - Override options
 * @returns {JXG.Board}
 */
export function createBoard(divId, options = {}) {
  return JXG.JSXGraph.initBoard(divId, {
    boundingbox:    options.bbox ?? [-10, 10, 10, -10],
    axis:           options.axis ?? true,
    grid:           options.grid ?? true,
    showCopyright:  false,
    showNavigation: options.showNavigation ?? true,
    keepAspectRatio: options.keepAspectRatio ?? false,
    zoom: {
      factorX:   1.1,
      factorY:   1.1,
      wheel:     true,
      needShift: false,
    },
    pan: {
      enabled:        true,
      needTwoFingers: false,
    },
    defaultAxes: {
      x: {
        strokeColor: '#00529B',
        strokeWidth: 1.5,
        ticks: {
          strokeColor:  '#888',
          strokeWidth:  1,
          label: { fontSize: 11, color: '#555' },
        },
        name: 'x',
        withLabel: false,
      },
      y: {
        strokeColor: '#00529B',
        strokeWidth: 1.5,
        ticks: {
          strokeColor:  '#888',
          strokeWidth:  1,
          label: { fontSize: 11, color: '#555' },
        },
        name: 'y',
        withLabel: false,
      },
    },
    background: {
      color:   '#fafcff',
      opacity: 1,
    },
  })
}

/**
 * Attaches a ResizeObserver so the board fills its container
 * when the window or layout changes.
 * @param {JXG.Board} board
 * @param {HTMLElement} container
 */
export function attachResizeObserver(board, container) {
  const ro = new ResizeObserver(() => {
    board.resizeContainer(container.offsetWidth, container.offsetHeight)
    board.fullUpdate()
  })
  ro.observe(container)
  return ro
}

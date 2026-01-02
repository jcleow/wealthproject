import type { Chart, Plugin } from 'chart.js'

/** Hit tolerance in pixels for detecting clicks/hovers near the line */
const HIT_TOLERANCE = 8

/** Track drag state per chart instance */
const dragState = new WeakMap<Chart, { isDragging: boolean; isHovering: boolean }>()

/**
 * Options for the current position line plugin
 */
export interface CurrentPositionLineOptions {
  /** The x-axis value (yearIndex/month index) where the line should be drawn */
  position: number | null
  /** Line color - defaults to a subtle grey */
  color?: string
  /** Line width in pixels */
  lineWidth?: number
  /** Whether the line is visible */
  visible?: boolean
  /** Optional dash pattern for the line */
  lineDash?: number[]
  /** Callback when position changes via drag */
  onPositionChange?: (newPosition: number) => void
  /** Whether drag is enabled */
  draggable?: boolean
}

/**
 * Get or initialize drag state for a chart
 */
function getDragState(chart: Chart) {
  let state = dragState.get(chart)
  if (!state) {
    state = { isDragging: false, isHovering: false }
    dragState.set(chart, state)
  }
  return state
}

/**
 * Check if a mouse position is near the reference line
 */
function isNearLine(mouseX: number, lineX: number): boolean {
  return Math.abs(mouseX - lineX) <= HIT_TOLERANCE
}

/**
 * Chart.js plugin that draws a vertical line at the current slider position.
 * Supports dragging to change the position interactively.
 */
export const currentPositionLinePlugin: Plugin<'line'> = {
  id: 'currentPositionLine',

  afterDatasetsDraw(chart: Chart, _args, options: CurrentPositionLineOptions) {
    // Skip if not visible or no position set
    if (!options?.visible || options.position === null || options.position === undefined) {
      return
    }

    const { ctx, chartArea, scales } = chart
    const xScale = scales['x']

    if (!xScale || !chartArea) return

    // Get pixel position for the current value
    const xPixel = xScale.getPixelForValue(options.position)

    // Skip if the line would be outside the visible chart area
    if (xPixel < chartArea.left || xPixel > chartArea.right) {
      return
    }

    const state = getDragState(chart)
    const isDragging = state.isDragging
    const isHovering = state.isHovering

    // Use brighter color when dragging or hovering
    const baseColor = options.color ?? 'rgba(148, 163, 184, 0.5)'
    const activeColor = 'rgba(148, 163, 184, 0.8)'
    const color = isDragging || isHovering ? activeColor : baseColor
    const lineWidth = isDragging ? 2.5 : (options.lineWidth ?? 1.5)

    ctx.save()

    // Draw the vertical line from top to bottom of chart area
    ctx.beginPath()
    ctx.moveTo(xPixel, chartArea.top)
    ctx.lineTo(xPixel, chartArea.bottom)

    ctx.strokeStyle = color
    ctx.lineWidth = lineWidth
    ctx.setLineDash(options.lineDash ?? [])
    ctx.stroke()

    // Draw a handle/grip indicator at the top (larger when active)
    const handleRadius = isDragging || isHovering ? 5 : 3
    ctx.beginPath()
    ctx.arc(xPixel, chartArea.top + 6, handleRadius, 0, Math.PI * 2)
    ctx.fillStyle = color
    ctx.fill()

    ctx.restore()
  },

  beforeEvent(chart: Chart, args, options: CurrentPositionLineOptions) {
    if (!options?.visible || !options.draggable) return
    if (options.position === null || options.position === undefined) return

    const { chartArea, scales, canvas } = chart
    const xScale = scales['x']
    if (!xScale || !chartArea) return

    const event = args.event
    const state = getDragState(chart)

    // Get current line position in pixels
    const lineX = xScale.getPixelForValue(options.position)

    // Get mouse position relative to canvas
    const rect = canvas.getBoundingClientRect()
    const mouseX = (event.native as MouseEvent)?.clientX
      ? (event.native as MouseEvent).clientX - rect.left
      : event.x ?? 0
    const mouseY = (event.native as MouseEvent)?.clientY
      ? (event.native as MouseEvent).clientY - rect.top
      : event.y ?? 0

    // Check if mouse is within chart area vertically
    const inChartArea = mouseY >= chartArea.top && mouseY <= chartArea.bottom &&
                        mouseX >= chartArea.left && mouseX <= chartArea.right

    if (event.type === 'mousedown') {
      if (inChartArea && isNearLine(mouseX, lineX)) {
        state.isDragging = true
        state.isHovering = false
        canvas.style.cursor = 'grabbing'
        args.changed = true
      }
    } else if (event.type === 'mouseup') {
      if (state.isDragging) {
        state.isDragging = false
        canvas.style.cursor = isNearLine(mouseX, lineX) ? 'grab' : ''
        args.changed = true
      }
    } else if (event.type === 'mousemove') {
      if (state.isDragging) {
        // Calculate new position from mouse X
        const clampedX = Math.max(chartArea.left, Math.min(chartArea.right, mouseX))
        const newPosition = Math.round(xScale.getValueForPixel(clampedX) as number)

        // Only trigger callback if position actually changed
        if (newPosition !== options.position && options.onPositionChange) {
          options.onPositionChange(newPosition)
        }
        args.changed = true
      } else {
        // Update hover state for cursor
        const wasHovering = state.isHovering
        state.isHovering = inChartArea && isNearLine(mouseX, lineX)

        if (state.isHovering !== wasHovering) {
          canvas.style.cursor = state.isHovering ? 'grab' : ''
          args.changed = true
        }
      }
    } else if (event.type === 'mouseout') {
      // Reset state when mouse leaves canvas
      if (state.isHovering || state.isDragging) {
        state.isHovering = false
        state.isDragging = false
        canvas.style.cursor = ''
        args.changed = true
      }
    }
  },

  defaults: {
    position: null,
    color: 'rgba(148, 163, 184, 0.5)',
    lineWidth: 1.5,
    visible: true,
    lineDash: [],
    draggable: true,
  },
}

export default currentPositionLinePlugin

import type { Chart, Plugin } from 'chart.js'
import type {
  MilestonePluginOptions,
  ChartJSMarkerData,
  MarkerHitTestResult,
  PropertyMarkerData,
  PropertyMarkerHitTestResult,
} from './types'
import { MARKER_CONFIG, COMPOUND_MARKER_CONFIG } from './types'

/**
 * Cache for pre-loaded icon images
 * Key: icon name, Value: HTMLImageElement
 */
const iconImageCache = new Map<string, HTMLImageElement>()

/**
 * Convert a Lucide icon name to an SVG data URL
 * This creates a white icon suitable for dark backgrounds
 */
function createIconDataUrl(iconName: string): string {
  // Common Lucide icon paths - add more as needed
  const iconPaths: Record<string, string> = {
    heart: '<path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/>',
    home: '<path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>',
    car: '<path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2"/><circle cx="7" cy="17" r="2"/><circle cx="17" cy="17" r="2"/>',
    briefcase: '<rect width="20" height="14" x="2" y="7" rx="2" ry="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>',
    'graduation-cap': '<path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/>',
    baby: '<path d="M9 12h.01"/><path d="M15 12h.01"/><path d="M10 16c.5.3 1.2.5 2 .5s1.5-.2 2-.5"/><path d="M19 6.3a9 9 0 0 1 1.8 3.9 2 2 0 0 1 0 3.6 9 9 0 0 1-17.6 0 2 2 0 0 1 0-3.6A9 9 0 0 1 12 3c2 0 3.5 1.1 3.5 2.5s-.9 2.5-2 2.5c-.8 0-1.5-.4-1.5-1"/>',
    plane: '<path d="M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z"/>',
    gift: '<polyline points="20 12 20 22 4 22 4 12"/><rect width="20" height="5" x="2" y="7"/><line x1="12" x2="12" y1="22" y2="7"/><path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z"/><path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z"/>',
    'piggy-bank': '<path d="M19 5c-1.5 0-2.8 1.4-3 2-3.5-1.5-11-.3-11 5 0 1.8 0 3 2 4.5V20h4v-2h3v2h4v-4c1-.5 1.7-1 2-2h2v-4h-2c0-1-.5-1.5-1-2V5z"/><path d="M2 9v1c0 1.1.9 2 2 2h1"/>',
    'dollar-sign': '<line x1="12" x2="12" y1="2" y2="22"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>',
    trending_up: '<polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/>',
    star: '<polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>',
    flag: '<path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" x2="4" y1="22" y2="15"/>',
    calendar: '<rect width="18" height="18" x="3" y="4" rx="2" ry="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/>',
    'alert-triangle': '<path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/>',
    check: '<path d="M20 6 9 17l-5-5"/>',
    plus: '<path d="M5 12h14"/><path d="M12 5v14"/>',
    minus: '<path d="M5 12h14"/>',
    user: '<path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>',
    users: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
    building: '<rect width="16" height="20" x="4" y="2" rx="2" ry="2"/><path d="M9 22v-4h6v4"/><path d="M8 6h.01"/><path d="M16 6h.01"/><path d="M12 6h.01"/><path d="M12 10h.01"/><path d="M12 14h.01"/><path d="M16 10h.01"/><path d="M16 14h.01"/><path d="M8 10h.01"/><path d="M8 14h.01"/>',
    'credit-card': '<rect width="20" height="14" x="2" y="5" rx="2"/><line x1="2" x2="22" y1="10" y2="10"/>',
    wallet: '<path d="M21 12V7H5a2 2 0 0 1 0-4h14v4"/><path d="M3 5v14a2 2 0 0 0 2 2h16v-5"/><path d="M18 12a2 2 0 0 0 0 4h4v-4Z"/>',
    umbrella: '<path d="M22 12a10.06 10.06 0 0 0-20 0Z"/><path d="M12 12v8a2 2 0 0 0 4 0"/><path d="M12 2v1"/>',
    shield: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10"/>',
    lock: '<rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>',
    key: '<circle cx="7.5" cy="15.5" r="5.5"/><path d="m21 2-9.6 9.6"/><path d="m15.5 7.5 3 3L22 7l-3-3"/>',
    target: '<circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/>',
    zap: '<polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>',
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/>',
    moon: '<path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/>',
    activity: '<polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>',
    'heart-pulse': '<path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/><path d="M3.22 12H9.5l.5-1 2 4.5 2-7 1.5 3.5h5.27"/>',
    cake: '<path d="M20 21v-8a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8"/><path d="M4 16s.5-1 2-1 2.5 2 4 2 2.5-2 4-2 2.5 2 4 2 2-1 2-1"/><path d="M2 21h20"/><path d="M7 8v2"/><path d="M12 8v2"/><path d="M17 8v2"/><path d="M7 4h.01"/><path d="M12 4h.01"/><path d="M17 4h.01"/>',
    sparkles: '<path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/><path d="M5 3v4"/><path d="M19 17v4"/><path d="M3 5h4"/><path d="M17 19h4"/>',
  }

  const pathData = iconPaths[iconName.toLowerCase()] || iconPaths['star'] // Default to star

  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"
         fill="none" stroke="rgba(255,255,255,0.9)" stroke-width="1.5"
         stroke-linecap="round" stroke-linejoin="round">
      ${pathData}
    </svg>
  `

  return `data:image/svg+xml;base64,${btoa(svg)}`
}

/**
 * Pre-load an icon image for canvas drawing
 */
export function preloadIcon(iconName: string): Promise<HTMLImageElement> {
  const cached = iconImageCache.get(iconName)
  if (cached) {
    return Promise.resolve(cached)
  }

  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => {
      iconImageCache.set(iconName, img)
      resolve(img)
    }
    img.onerror = reject
    img.src = createIconDataUrl(iconName)
  })
}

/**
 * Pre-load multiple icons
 */
export async function preloadIcons(iconNames: string[]): Promise<void> {
  const uniqueNames = [...new Set(iconNames.filter(Boolean))]
  await Promise.all(uniqueNames.map(preloadIcon))
}

/**
 * Get a cached icon image
 */
export function getCachedIcon(iconName: string): HTMLImageElement | undefined {
  return iconImageCache.get(iconName)
}

/**
 * Draw a single marker on the canvas
 */
function drawMarker(
  ctx: CanvasRenderingContext2D,
  centerX: number,
  centerY: number,
  color: string,
  iconImage: HTMLImageElement | undefined,
  iconFallback: string,
  opacity: number
): void {
  const { radius, iconSize, strokeColor, strokeWidth } = MARKER_CONFIG

  ctx.save()
  ctx.globalAlpha = opacity

  // Draw circle background
  ctx.beginPath()
  ctx.arc(centerX, centerY, radius, 0, Math.PI * 2)
  ctx.fillStyle = color
  ctx.fill()

  // Draw border
  ctx.strokeStyle = strokeColor
  ctx.lineWidth = strokeWidth
  ctx.stroke()

  // Draw icon or fallback text
  if (iconImage) {
    ctx.drawImage(
      iconImage,
      centerX - iconSize / 2,
      centerY - iconSize / 2,
      iconSize,
      iconSize
    )
  } else {
    ctx.font = 'bold 11px sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillStyle = '#ffffff'
    ctx.fillText(iconFallback.slice(0, 1).toUpperCase(), centerX, centerY + 1)
  }

  ctx.restore()
}

/**
 * Draw a property marker (simplified - same style as regular markers, no outer rings)
 */
function drawCompoundMarker(
  ctx: CanvasRenderingContext2D,
  centerX: number,
  centerY: number,
  marker: PropertyMarkerData,
  opacity: number
): void {
  const { innerRadius } = COMPOUND_MARKER_CONFIG
  const { iconSize, strokeColor, strokeWidth, disabledOpacity } = MARKER_CONFIG

  ctx.save()
  const markerOpacity = opacity * (marker.isIncluded ? 1 : disabledOpacity)
  ctx.globalAlpha = markerOpacity

  // Draw circle background (same as regular marker)
  ctx.beginPath()
  ctx.arc(centerX, centerY, innerRadius, 0, Math.PI * 2)
  ctx.fillStyle = marker.iconColor
  ctx.fill()

  // Draw circle border
  ctx.strokeStyle = strokeColor
  ctx.lineWidth = strokeWidth
  ctx.stroke()

  // Draw icon
  const iconImage = marker.iconImage || getCachedIcon(marker.icon)
  if (iconImage) {
    ctx.drawImage(
      iconImage,
      centerX - iconSize / 2,
      centerY - iconSize / 2,
      iconSize,
      iconSize
    )
  } else {
    ctx.font = 'bold 11px sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillStyle = '#ffffff'
    ctx.fillText(marker.icon.slice(0, 1).toUpperCase(), centerX, centerY + 1)
  }

  ctx.restore()
}

/**
 * Draw a nested milestone marker (smaller than main markers)
 */
function drawNestedMilestone(
  ctx: CanvasRenderingContext2D,
  centerX: number,
  centerY: number,
  iconColor: string,
  iconName: string,
  opacity: number
): void {
  const { nestedRadius, nestedIconSize } = COMPOUND_MARKER_CONFIG
  const { strokeColor, strokeWidth } = MARKER_CONFIG

  ctx.save()
  ctx.globalAlpha = opacity

  // Draw circle background
  ctx.beginPath()
  ctx.arc(centerX, centerY, nestedRadius, 0, Math.PI * 2)
  ctx.fillStyle = iconColor
  ctx.fill()

  // Draw circle border
  ctx.strokeStyle = strokeColor
  ctx.lineWidth = strokeWidth
  ctx.stroke()

  // Draw icon
  const iconImage = getCachedIcon(iconName)
  if (iconImage) {
    ctx.drawImage(
      iconImage,
      centerX - nestedIconSize / 2,
      centerY - nestedIconSize / 2,
      nestedIconSize,
      nestedIconSize
    )
  } else {
    ctx.font = 'bold 9px sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillStyle = '#ffffff'
    ctx.fillText(iconName.slice(0, 1).toUpperCase(), centerX, centerY + 1)
  }

  ctx.restore()
}

/**
 * Hit test to check if a point is within a property marker
 * Uses interpolation to match actual drawn position during animation
 */
function hitTestPropertyMarkers(
  mouseX: number,
  mouseY: number,
  markers: PropertyMarkerData[],
  chart: Chart
): PropertyMarkerHitTestResult | null {
  const { hitRadius } = COMPOUND_MARKER_CONFIG
  const { baseLift, hitTolerance } = MARKER_CONFIG
  const xScale = chart.scales['x']
  const yScale = chart.scales['y']

  if (!xScale || !yScale) return null

  for (const marker of markers) {
    const baseX = xScale.getPixelForValue(marker.yearIndex)
    // Use interpolation to match actual drawn position during animation
    const interpolatedY = interpolateYOnLine(chart, baseX)
    const baseY = interpolatedY ?? yScale.getPixelForValue(marker.netWorth)
    const markerX = baseX
    const markerY = baseY - baseLift

    const distance = Math.sqrt(
      Math.pow(mouseX - markerX, 2) + Math.pow(mouseY - markerY, 2)
    )

    if (distance <= hitRadius + hitTolerance) {
      return { marker }
    }
  }

  return null
}

/**
 * Hit test to check if a point is within a marker
 */
function hitTestMarkers(
  mouseX: number,
  mouseY: number,
  markers: ChartJSMarkerData[],
  chart: Chart
): MarkerHitTestResult | null {
  const { radius, baseLift, stackSpacing, hitTolerance } = MARKER_CONFIG
  const xScale = chart.scales['x']
  const yScale = chart.scales['y']

  if (!xScale || !yScale) return null

  for (const marker of markers) {
    const baseX = xScale.getPixelForValue(marker.yearIndex)
    const baseY = yScale.getPixelForValue(marker.netWorth)

    for (let eventIndex = 0; eventIndex < marker.events.length; eventIndex++) {
      const offsetY = baseLift + eventIndex * stackSpacing
      const markerX = baseX
      const markerY = baseY - offsetY

      const distance = Math.sqrt(
        Math.pow(mouseX - markerX, 2) + Math.pow(mouseY - markerY, 2)
      )

      if (distance <= radius + hitTolerance) {
        return {
          marker,
          event: marker.events[eventIndex],
          eventIndex,
        }
      }
    }
  }

  return null
}

/**
 * Cubic bezier interpolation for a single dimension
 * P(t) = (1-t)³P0 + 3(1-t)²tP1 + 3(1-t)t²P2 + t³P3
 */
function cubicBezier(t: number, p0: number, p1: number, p2: number, p3: number): number {
  const oneMinusT = 1 - t
  const oneMinusT2 = oneMinusT * oneMinusT
  const oneMinusT3 = oneMinusT2 * oneMinusT
  const t2 = t * t
  const t3 = t2 * t
  return oneMinusT3 * p0 + 3 * oneMinusT2 * t * p1 + 3 * oneMinusT * t2 * p2 + t3 * p3
}

/**
 * Find t parameter for bezier curve given an x value using Newton-Raphson
 */
function findTForX(targetX: number, x0: number, x1: number, x2: number, x3: number): number {
  // Initial guess using linear interpolation
  let t = (targetX - x0) / (x3 - x0)
  t = Math.max(0, Math.min(1, t))

  // Newton-Raphson iterations to refine t
  for (let i = 0; i < 5; i++) {
    const x = cubicBezier(t, x0, x1, x2, x3)
    const dx = targetX - x
    if (Math.abs(dx) < 0.1) break

    // Derivative of cubic bezier
    const oneMinusT = 1 - t
    const derivative = 3 * oneMinusT * oneMinusT * (x1 - x0) +
                       6 * oneMinusT * t * (x2 - x1) +
                       3 * t * t * (x3 - x2)

    if (Math.abs(derivative) < 0.0001) break
    t = t + dx / derivative
    t = Math.max(0, Math.min(1, t))
  }

  return t
}

/**
 * Interpolate Y position along the bezier curve at a given X position.
 * Uses the animated point positions and control points from Chart.js.
 * This ensures markers follow the exact curve during animation.
 */
function interpolateYOnLine(
  chart: Chart,
  xPixel: number
): number | null {
  const meta = chart.getDatasetMeta(0)
  if (!meta?.data?.length || meta.data.length < 2) {
    return null
  }

  const points = meta.data

  // Find the segment that contains our x position
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i] as { x: number; y: number; cp1x?: number; cp1y?: number; cp2x?: number; cp2y?: number }
    const p1 = points[i + 1] as { x: number; y: number; cp1x?: number; cp1y?: number; cp2x?: number; cp2y?: number }

    // Check if xPixel is between these two points
    if (xPixel >= p0.x && xPixel <= p1.x) {
      // Get control points for bezier curve
      // Chart.js stores control points as cp1 (control point after p0) and cp2 (control point before p1)
      const cp1x = p0.cp1x ?? p0.x
      const cp1y = p0.cp1y ?? p0.y
      const cp2x = p1.cp2x ?? p1.x
      const cp2y = p1.cp2y ?? p1.y

      // Find t parameter for our x position
      const t = findTForX(xPixel, p0.x, cp1x, cp2x, p1.x)

      // Calculate y position on the bezier curve
      return cubicBezier(t, p0.y, cp1y, cp2y, p1.y)
    }
  }

  // If x is before first point, use first point's y
  if (xPixel < points[0].x) {
    return points[0].y
  }

  // If x is after last point, use last point's y
  if (xPixel > points[points.length - 1].x) {
    return points[points.length - 1].y
  }

  return null
}

/**
 * Chart.js plugin for rendering milestone markers on the canvas
 *
 * This plugin draws scenario event markers directly on the canvas,
 * which ensures they scale properly during zoom/pan operations.
 */
export const milestonePlugin: Plugin<'line'> = {
  id: 'milestoneMarkers',

  afterDatasetsDraw(chart, _args, options: MilestonePluginOptions) {
    const hasMarkers = (options?.markers?.length ?? 0) > 0
    const hasPropertyMarkers = (options?.propertyMarkers?.length ?? 0) > 0

    if (!hasMarkers && !hasPropertyMarkers) return

    const { ctx, scales } = chart
    const xScale = scales['x']
    const yScale = scales['y']

    if (!xScale || !yScale) return

    const { baseLift, stackSpacing, disabledOpacity } = MARKER_CONFIG
    // Use opacity for visibility - markers animate with the line
    const globalOpacity = options.opacity ?? 1

    // If opacity is 0, don't draw at all
    if (globalOpacity <= 0) return

    const chartArea = chart.chartArea

    // Draw regular scenario event markers
    if (hasMarkers) {
      for (const marker of options.markers) {
        const baseX = xScale.getPixelForValue(marker.yearIndex)

        // Interpolate Y position directly from the animated line points
        // This ensures markers move exactly with the line during animation
        const interpolatedY = interpolateYOnLine(chart, baseX)
        const baseY = interpolatedY ?? yScale.getPixelForValue(marker.netWorth)

        // Check if marker is within visible chart area
        if (baseX < chartArea.left || baseX > chartArea.right) continue

        // Draw each stacked event
        for (let eventIndex = 0; eventIndex < marker.events.length; eventIndex++) {
          const event = marker.events[eventIndex]
          const offsetY = baseLift + eventIndex * stackSpacing
          const markerX = baseX
          const markerY = baseY - offsetY

          // Skip if marker would be above chart area
          if (markerY < chartArea.top - 20) continue

          const color = event.displayColor || '#0ea5e9'
          const iconName = event.displayIcon ?? ''
          const iconImage = getCachedIcon(iconName)
          const isDisabled = event.isIncluded === false
          const opacity = globalOpacity * (isDisabled ? disabledOpacity : 1)

          drawMarker(ctx, markerX, markerY, color, iconImage, iconName || '✦', opacity)
        }
      }
    }

    // Draw property scenario markers
    if (hasPropertyMarkers) {
      const expandedPropertyIds = options.expandedPropertyIds ?? new Set<string>()

      for (const marker of options.propertyMarkers!) {
        const baseX = xScale.getPixelForValue(marker.yearIndex)

        // Interpolate Y position directly from the animated line points
        const interpolatedY = interpolateYOnLine(chart, baseX)
        const baseY = interpolatedY ?? yScale.getPixelForValue(marker.netWorth)

        // Check if marker is within visible chart area
        if (baseX < chartArea.left || baseX > chartArea.right) continue

        const markerX = baseX
        const markerY = baseY - baseLift

        // Skip if marker would be above chart area
        if (markerY < chartArea.top - 30) continue

        drawCompoundMarker(ctx, markerX, markerY, marker, globalOpacity)

        // Draw nested milestones if this property is expanded
        if (expandedPropertyIds.has(marker.propertyScenarioId)) {
          const nestedBaseLift = baseLift - 5 // Slightly lower than main markers

          for (const milestone of marker.nestedMilestones) {
            // Skip if no yearIndex (can't position on chart)
            if (milestone.yearIndex === undefined) continue

            const milestoneX = xScale.getPixelForValue(milestone.yearIndex)

            // Check if nested milestone is within visible chart area
            if (milestoneX < chartArea.left || milestoneX > chartArea.right) continue

            // Interpolate Y position for nested milestone
            const nestedInterpolatedY = interpolateYOnLine(chart, milestoneX)
            const nestedBaseY = nestedInterpolatedY ?? yScale.getPixelForValue(marker.netWorth)
            const milestoneY = nestedBaseY - nestedBaseLift

            // Skip if would be above chart area
            if (milestoneY < chartArea.top - 20) continue

            drawNestedMilestone(
              ctx,
              milestoneX,
              milestoneY,
              milestone.iconColor,
              milestone.icon,
              globalOpacity * (marker.isIncluded ? 1 : disabledOpacity)
            )
          }
        }
      }
    }
  },

  beforeEvent(chart, args, options: MilestonePluginOptions) {
    if (!options.visible) return

    const hasMarkers = (options?.markers?.length ?? 0) > 0
    const hasPropertyMarkers = (options?.propertyMarkers?.length ?? 0) > 0

    if (!hasMarkers && !hasPropertyMarkers) return

    const event = args.event
    const nativeEvent = event.native as MouseEvent | null
    if (!nativeEvent) return

    const rect = chart.canvas.getBoundingClientRect()
    const mouseX = nativeEvent.clientX - rect.left
    const mouseY = nativeEvent.clientY - rect.top

    // Handle mouseout to clear hover state when mouse leaves chart
    if (event.type === 'mouseout' && hasPropertyMarkers && options.onPropertyMarkerHover) {
      options.onPropertyMarkerHover(null, 0, 0)
      return
    }

    // Handle mousemove for hover detection on property markers
    if (event.type === 'mousemove' && hasPropertyMarkers && options.onPropertyMarkerHover) {
      const propertyHit = hitTestPropertyMarkers(mouseX, mouseY, options.propertyMarkers!, chart)
      if (propertyHit) {
        options.onPropertyMarkerHover(propertyHit.marker, mouseX, mouseY)
      } else {
        options.onPropertyMarkerHover(null, 0, 0)
      }
    }

    // Handle click events
    if (event.type !== 'click') return

    // Check property markers first
    if (hasPropertyMarkers && options.onPropertyMarkerClick) {
      const propertyHit = hitTestPropertyMarkers(mouseX, mouseY, options.propertyMarkers!, chart)
      if (propertyHit) {
        options.onPropertyMarkerClick(propertyHit.marker, mouseX, mouseY)
        args.changed = true
        return
      }
    }

    // Check regular markers
    if (hasMarkers && options.onMarkerClick) {
      const hitResult = hitTestMarkers(mouseX, mouseY, options.markers, chart)
      if (hitResult) {
        options.onMarkerClick(hitResult.event, hitResult.marker)
        args.changed = true
      }
    }
  },

  defaults: {
    markers: [],
    visible: true,
    animate: true,
    opacity: 1,
  },
}

export default milestonePlugin

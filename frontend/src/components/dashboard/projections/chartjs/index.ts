/**
 * Chart.js implementation components and utilities
 *
 * This module provides a Chart.js-based alternative to the Recharts
 * net worth projection chart. Key advantages:
 *
 * - Scenario markers drawn directly on canvas (scale properly during zoom)
 * - Better performance for large datasets
 * - Native zoom/pan support via chartjs-plugin-zoom
 *
 * Enable via feature flag: NEXT_PUBLIC_USE_CHARTJS=true
 */

export { ChartJSTooltip, useChartJSTooltip } from './ChartJSTooltip'
export { milestonePlugin, preloadIcons, preloadIcon, getCachedIcon } from './milestonePlugin'
export { useChartJSZoom } from './useChartJSZoom'
export type {
  ChartJSMarkerData,
  MilestonePluginOptions,
  MarkerHitTestResult,
  ChartJSTooltipProps,
  ExternalTooltipContext,
} from './types'
export { MARKER_CONFIG } from './types'

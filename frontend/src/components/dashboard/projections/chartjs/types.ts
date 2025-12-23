import type { Chart, ChartType } from 'chart.js'
import type { ScenarioEvent } from '@/types/scenario'

/**
 * Data structure for a scenario marker that will be drawn on the chart canvas
 */
export interface ChartJSMarkerData {
  /** X-axis value (yearIndex or month index) */
  yearIndex: number
  /** Y-axis value (net worth at this point) */
  netWorth: number
  /** Scenario events at this point */
  events: ScenarioEvent[]
  /** Pre-loaded icon images for canvas drawing */
  iconImages?: HTMLImageElement[]
}

/**
 * Options for the milestone marker plugin
 */
export interface MilestonePluginOptions {
  /** Array of markers to render */
  markers: ChartJSMarkerData[]
  /** Callback when a marker is clicked */
  onMarkerClick?: (event: ScenarioEvent, markerData: ChartJSMarkerData) => void
  /** Whether markers should be visible */
  visible: boolean
  /** Whether to animate marker opacity */
  animate: boolean
  /** Current opacity for animation (0-1) */
  opacity?: number
}

/**
 * Hit test result for marker click detection
 */
export interface MarkerHitTestResult {
  marker: ChartJSMarkerData
  event: ScenarioEvent
  eventIndex: number
}

/**
 * Configuration for marker rendering
 */
export const MARKER_CONFIG = {
  /** Radius of the marker circle */
  radius: 14,
  /** Base lift above the data point */
  baseLift: 31, // markerRadius * 1.5 + 10
  /** Spacing between stacked markers */
  stackSpacing: 36, // markerRadius * 2 + 8
  /** Size of the icon inside the marker */
  iconSize: 17, // markerRadius * 1.2
  /** Stroke color for marker border */
  strokeColor: 'rgba(255,255,255,0.3)',
  /** Stroke width for marker border */
  strokeWidth: 1,
  /** Opacity for disabled markers */
  disabledOpacity: 0.45,
  /** Hit test tolerance (pixels beyond marker radius) */
  hitTolerance: 4,
} as const

/**
 * Chart.js external tooltip context
 */
export interface ExternalTooltipContext {
  chart: Chart
  tooltip: {
    opacity: number
    x: number
    y: number
    caretX: number
    caretY: number
    dataPoints?: Array<{
      raw: unknown
      parsed: { x: number; y: number }
      dataIndex: number
      datasetIndex: number
    }>
  }
}

/**
 * Props for the external tooltip component
 */
export interface ChartJSTooltipProps {
  context: ExternalTooltipContext | null
  startingAge?: number
  resolution?: 'yearly' | 'monthly'
}

/**
 * Augment Chart.js plugin options to include our custom plugin
 */
declare module 'chart.js' {
  interface PluginOptionsByType<TType extends ChartType> {
    milestoneMarkers?: MilestonePluginOptions
  }
}

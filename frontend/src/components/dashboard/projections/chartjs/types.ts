import type { Chart, ChartType } from 'chart.js'
import type { ScenarioEvent } from '@/types/scenario'
import type { CurrentPositionLineOptions } from './currentPositionLinePlugin'

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
  /** Array of property scenario markers */
  propertyMarkers?: PropertyMarkerData[]
  /** Callback when a marker is clicked */
  onMarkerClick?: (event: ScenarioEvent, markerData: ChartJSMarkerData) => void
  /** Callback when a property marker is clicked - opens click menu */
  onPropertyMarkerClick?: (marker: PropertyMarkerData, x: number, y: number) => void
  /** Set of property scenario IDs that are expanded (showing nested milestones) */
  expandedPropertyIds?: Set<string>
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

// =============================================================================
// PROPERTY SCENARIO MARKER TYPES
// =============================================================================

/**
 * Nested milestone within a property scenario marker
 */
export interface PropertyMilestone {
  id: string
  type: 'purchase' | 'sale' | 'fee'
  date: string  // YYYY-MM format
  label: string
  icon: string
  iconColor: string
  /** Amount for fee milestones (optional, displayed in popover) */
  amount?: string
  /** X-axis position (yearIndex / month index from chart start) for rendering on timeline */
  yearIndex?: number
}

/**
 * Property scenario marker with compound visualization (double ring)
 */
export interface PropertyMarkerData {
  /** X-axis value (yearIndex or month index) */
  yearIndex: number
  /** Y-axis value (net worth at this point) */
  netWorth: number
  /** Marker type - property markers get compound ring rendering */
  type: 'property'
  /** Property scenario ID for navigation */
  propertyScenarioId: string
  /** Display name of the property scenario */
  name: string
  /** Icon name (lucide icon) */
  icon: string
  /** Icon/ring color */
  iconColor: string
  /** Whether the scenario is included in projections */
  isIncluded: boolean
  /** Nested milestones (purchase, sale, fees with icons) */
  nestedMilestones: PropertyMilestone[]
  /** Pre-loaded icon image for canvas drawing */
  iconImage?: HTMLImageElement
}

/**
 * Configuration for property marker rendering (simplified - no outer rings)
 */
export const COMPOUND_MARKER_CONFIG = {
  /** Marker radius (same as regular markers) */
  innerRadius: 14,
  /** Hit test radius (same as marker radius) */
  hitRadius: 14,
  /** Nested milestone marker radius (smaller) */
  nestedRadius: 10,
  /** Nested milestone icon size */
  nestedIconSize: 12,
} as const

/**
 * Hit test result for property marker click detection
 */
export interface PropertyMarkerHitTestResult {
  marker: PropertyMarkerData
}

/**
 * Augment Chart.js plugin options to include our custom plugins
 */
declare module 'chart.js' {
  interface PluginOptionsByType<TType extends ChartType> {
    milestoneMarkers?: MilestonePluginOptions
    currentPositionLine?: CurrentPositionLineOptions
  }
}

import type { ChartOptions, ChartData } from 'chart.js'
import type { CoverageProjectionYear } from '@/lib/coverage-journey-utils'
import { formatCoverageAmount } from '@/lib/coverage-journey-utils'

// =============================================================================
// Insurance Chart Configuration Builders
//
// Extracts chart dataset and options construction into reusable functions so
// both the dark and light/Monet chart components in JourneyTab can share the
// same logic with different color configs.
// =============================================================================

/** Describes the line + fill colors for a single coverage category. */
export interface CategoryColorConfig {
  chartLine: string
  chartFill: string
}

/** Full color config for all five coverage categories plus grid/axis colors. */
export interface CoverageChartColorConfig {
  lifeTpd: CategoryColorConfig
  criticalIllness: CategoryColorConfig
  earlyCi: CategoryColorConfig
  disability: CategoryColorConfig
  personalAccident: CategoryColorConfig
  /** Hover border color for data points (e.g. white or primary text) */
  pointHoverBorderColor: string
  /** Chart grid line color */
  gridColor: string
  /** Axis tick label color */
  axisColor: string
}

type IndividualCategory = 'lifeTpd' | 'criticalIllness' | 'earlyCi' | 'disability' | 'personalAccident'

/** Maps category keys to their projection data accessor and display metadata. */
const CATEGORY_META: Record<
  IndividualCategory,
  {
    label: string
    dataKey: keyof CoverageProjectionYear
    pointHoverRadius: number
    borderWidth: number
  }
> = {
  lifeTpd: {
    label: 'Life/TPD',
    dataKey: 'recommendedLifeTpd',
    pointHoverRadius: 6,
    borderWidth: 2,
  },
  criticalIllness: {
    label: 'Critical Illness',
    dataKey: 'recommendedCriticalIllness',
    pointHoverRadius: 5,
    borderWidth: 1.5,
  },
  earlyCi: {
    label: 'Early CI',
    dataKey: 'recommendedEarlyCi',
    pointHoverRadius: 4,
    borderWidth: 1.5,
  },
  disability: {
    label: 'Disability',
    dataKey: 'recommendedDisability',
    pointHoverRadius: 4,
    borderWidth: 1.5,
  },
  personalAccident: {
    label: 'Personal Accident',
    dataKey: 'recommendedPersonalAccident',
    pointHoverRadius: 4,
    borderWidth: 1,
  },
}

/**
 * Build Chart.js datasets for coverage projections.
 *
 * @param projections - Array of year-by-year coverage projection data
 * @param colorConfig - Colors for lines, fills, grid, and axis
 * @param activeCategories - Set of category keys to include (pass all 5 for light mode)
 * @param labelMapper - Optional function to transform age into label string
 * @returns ChartData<'line'> object ready for the Line component
 */
export function buildCoverageDatasets(
  projections: CoverageProjectionYear[],
  colorConfig: CoverageChartColorConfig,
  activeCategories: Set<IndividualCategory>,
  labelMapper?: (projection: CoverageProjectionYear) => string,
): ChartData<'line'> {
  const defaultLabelMapper = (projection: CoverageProjectionYear) => projection.age.toString()
  const mapLabel = labelMapper ?? defaultLabelMapper

  const labels = projections.map(mapLabel)
  const datasets: ChartData<'line'>['datasets'] = []

  const categoryOrder: IndividualCategory[] = [
    'lifeTpd',
    'criticalIllness',
    'earlyCi',
    'disability',
    'personalAccident',
  ]

  for (const categoryKey of categoryOrder) {
    if (!activeCategories.has(categoryKey)) continue

    const meta = CATEGORY_META[categoryKey]
    const colors = colorConfig[categoryKey]

    datasets.push({
      label: meta.label,
      data: projections.map((p) => p[meta.dataKey] as number),
      borderColor: colors.chartLine,
      backgroundColor: colors.chartFill,
      fill: true,
      tension: 0.4,
      pointRadius: 0,
      pointHoverRadius: meta.pointHoverRadius,
      pointHoverBackgroundColor: colors.chartLine,
      pointHoverBorderColor: colorConfig.pointHoverBorderColor,
      pointHoverBorderWidth: 2,
      borderWidth: meta.borderWidth,
    })
  }

  return { labels, datasets }
}

/**
 * Callback configuration for chart options that depend on component state.
 */
export interface ChartOptionCallbacks {
  /** Called when the chart animation completes (used to flag scales-ready) */
  onAnimationComplete?: () => void
  /** External tooltip handler (dark mode) or undefined for built-in tooltip */
  externalTooltipHandler?: (context: { chart: any; tooltip: any }) => void
  /** Whether the built-in tooltip is enabled (light mode) */
  tooltipEnabled?: boolean
  /** Tooltip style overrides for built-in tooltip (light mode) */
  tooltipStyle?: {
    backgroundColor: string
    titleColor: string
    bodyColor: string
    borderColor: string
  }
  /** Custom x-axis tick callback */
  xTickCallback?: (value: any, index: number) => string | number | undefined
  /** Custom tooltip title callback */
  tooltipTitleCallback?: (items: any[]) => string
  /** Custom tooltip label callback (light mode only) */
  tooltipLabelCallback?: (context: any) => string
}

/**
 * Build Chart.js options for the coverage chart.
 *
 * @param colorConfig - Colors for grid and axis ticks
 * @param callbacks - Component-specific callbacks (animation, tooltip, ticks)
 * @returns ChartOptions<'line'> object
 */
export function buildCoverageChartOptions(
  colorConfig: CoverageChartColorConfig,
  callbacks: ChartOptionCallbacks,
): ChartOptions<'line'> {
  const tooltipConfig = callbacks.externalTooltipHandler
    ? {
        enabled: false,
        external: callbacks.externalTooltipHandler,
        callbacks: {
          title: callbacks.tooltipTitleCallback
            ? callbacks.tooltipTitleCallback
            : undefined,
        },
      }
    : {
        enabled: callbacks.tooltipEnabled ?? true,
        backgroundColor: callbacks.tooltipStyle?.backgroundColor,
        titleColor: callbacks.tooltipStyle?.titleColor,
        bodyColor: callbacks.tooltipStyle?.bodyColor,
        borderColor: callbacks.tooltipStyle?.borderColor,
        borderWidth: callbacks.tooltipStyle ? 1 : undefined,
        padding: 12,
        cornerRadius: 8,
        displayColors: true,
        callbacks: {
          title: callbacks.tooltipTitleCallback
            ? callbacks.tooltipTitleCallback
            : undefined,
          label: callbacks.tooltipLabelCallback
            ? callbacks.tooltipLabelCallback
            : undefined,
        },
      }

  return {
    responsive: true,
    maintainAspectRatio: false,
    animation: {
      onComplete: callbacks.onAnimationComplete,
    },
    interaction: { mode: 'index', intersect: false },
    plugins: {
      legend: { display: false },
      tooltip: tooltipConfig as any,
    },
    scales: {
      x: {
        grid: { color: colorConfig.gridColor, drawTicks: false },
        ticks: {
          color: colorConfig.axisColor,
          font: { size: 11 },
          maxRotation: 0,
          callback: callbacks.xTickCallback as any,
        },
        border: { display: false },
      },
      y: {
        grid: { color: colorConfig.gridColor, drawTicks: false },
        ticks: {
          color: colorConfig.axisColor,
          font: { size: 11 },
          callback: (value: any) => formatCoverageAmount(value as number),
          maxTicksLimit: 5,
        },
        border: { display: false },
        beginAtZero: true,
      },
    },
  }
}

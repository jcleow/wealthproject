import clsx from 'clsx'
import { Plus } from 'lucide-react'

import { useColorScheme } from '@/stores'
import { ChartControls } from './ChartControls'
import type { ChartType, MetricId } from './chartOverlays'

export interface ChartHeaderProps {
  title: string
  subtitle: string
  onAddScenario?: () => void
  // Chart overlay controls (feature-flagged)
  enableChartOverlays?: boolean
  chartType?: ChartType
  onChartTypeChange?: (type: ChartType) => void
  selectedMetrics?: MetricId[]
  onMetricsChange?: (metrics: MetricId[]) => void
}

/**
 * Header component for the projection chart with title, subtitle, and action buttons.
 */
export function ChartHeader({
  title,
  subtitle,
  onAddScenario,
  enableChartOverlays = false,
  chartType = 'area',
  onChartTypeChange,
  selectedMetrics = ['netWorth'],
  onMetricsChange,
}: ChartHeaderProps) {
  const colorScheme = useColorScheme()
  const isMonet = colorScheme === 'monet'

  return (
    <div
      className={clsx(
        'flex flex-shrink-0 items-center justify-between',
        'mb-4 pb-4',
        'border-b',
        isMonet ? 'border-slate-200/60' : 'border-white/[0.04]'
      )}
    >
      <div>
        <h3 className={clsx(
          "text-lg font-medium",
          isMonet ? "text-slate-700" : "text-slate-200"
        )}>{title}</h3>
        <p className={clsx(
          "text-sm",
          isMonet ? "text-slate-500" : "text-slate-500"
        )}>{subtitle}</p>
      </div>
      <div className="flex items-center gap-4">
        {enableChartOverlays && onChartTypeChange && onMetricsChange && (
          <ChartControls
            chartType={chartType}
            onChartTypeChange={onChartTypeChange}
            selectedMetrics={selectedMetrics}
            onMetricsChange={onMetricsChange}
          />
        )}
        {onAddScenario && (
          <button
            onClick={onAddScenario}
            className={clsx(
              'flex items-center gap-1.5',
              'px-3 py-1.5',
              'rounded-lg',
              'font-medium text-xs',
              'transition-all',
              isMonet
                ? 'border border-blue-200 bg-blue-50 hover:bg-blue-100 text-blue-600'
                : 'border border-white/[0.08] hover:border-white/[0.12] bg-white/[0.02] hover:bg-white/[0.04] text-slate-400 hover:text-slate-200'
            )}
            type="button"
          >
            <Plus className="h-3.5 w-3.5" />
            Add Event
          </button>
        )}
      </div>
    </div>
  )
}

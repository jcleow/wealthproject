'use client'

import { useState, useCallback } from 'react'
import { AreaChart, LineChart, BarChart3 } from 'lucide-react'
import { clsx } from 'clsx'
import {
  type ChartType,
  type MetricId,
  OVERLAY_METRICS,
  MAX_OVERLAYS,
} from './chartOverlays'

interface ChartControlsProps {
  chartType: ChartType
  onChartTypeChange: (type: ChartType) => void
  selectedMetrics: MetricId[]
  onMetricsChange: (metrics: MetricId[]) => void
}

const CHART_TYPE_ICONS = {
  area: AreaChart,
  line: LineChart,
  bar: BarChart3,
} as const

export function ChartControls({
  chartType,
  onChartTypeChange,
  selectedMetrics,
  onMetricsChange,
}: ChartControlsProps) {
  const [shakeMetric, setShakeMetric] = useState<MetricId | null>(null)

  const handleMetricToggle = useCallback(
    (metricId: MetricId) => {
      if (selectedMetrics.includes(metricId)) {
        // Allow deselection if more than one selected
        if (selectedMetrics.length > 1) {
          onMetricsChange(selectedMetrics.filter((m) => m !== metricId))
        }
      } else if (selectedMetrics.length < MAX_OVERLAYS) {
        onMetricsChange([...selectedMetrics, metricId])
      } else {
        // At limit - trigger shake animation
        setShakeMetric(metricId)
        setTimeout(() => setShakeMetric(null), 300)
      }
    },
    [selectedMetrics, onMetricsChange]
  )

  const isAtLimit = selectedMetrics.length >= MAX_OVERLAYS

  return (
    <div className="flex items-center gap-4">
      {/* Chart Type Selector - Segmented Control */}
      <div className="inline-flex rounded-lg bg-white/[0.03] p-0.5 border border-white/[0.08]">
        {(['area', 'line', 'bar'] as const).map((type) => {
          const Icon = CHART_TYPE_ICONS[type]
          const isActive = chartType === type
          return (
            <button
              key={type}
              type="button"
              onClick={() => onChartTypeChange(type)}
              className={clsx(
                'flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-all duration-150',
                isActive
                  ? 'bg-white/[0.1] text-white shadow-sm'
                  : 'text-slate-500 hover:text-slate-300'
              )}
            >
              <Icon className="h-3.5 w-3.5" />
            </button>
          )
        })}
      </div>

      {/* Metric Chips */}
      <div className="flex items-center gap-1.5 flex-wrap">
        {OVERLAY_METRICS.map((metric) => {
          const isSelected = selectedMetrics.includes(metric.id)
          const isDisabled = !isSelected && isAtLimit
          const shouldShake = shakeMetric === metric.id

          return (
            <button
              key={metric.id}
              type="button"
              onClick={() => handleMetricToggle(metric.id)}
              disabled={isDisabled}
              className={clsx(
                'group relative inline-flex items-center gap-1.5',
                'px-2 py-1 rounded-full',
                'text-[11px] font-medium',
                'border transition-all duration-200',
                isSelected
                  ? 'bg-white/[0.08] border-white/[0.15] text-white scale-[1.02]'
                  : 'bg-transparent border-white/[0.06] text-slate-500 hover:text-slate-300 hover:border-white/[0.1]',
                isDisabled && 'opacity-40 cursor-not-allowed',
                shouldShake && 'animate-shake'
              )}
            >
              {/* Color indicator dot */}
              <span
                className={clsx(
                  'h-2 w-2 rounded-full transition-all duration-200',
                  isSelected && 'shadow-[0_0_6px_currentColor]'
                )}
                style={{
                  backgroundColor: metric.color,
                  color: metric.color,
                  opacity: isSelected ? 1 : 0.5,
                }}
              />
              <span>{metric.label}</span>
            </button>
          )
        })}
      </div>

      {/* Overlay Counter */}
      <div className="flex items-center gap-1 ml-1">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className={clsx(
              'h-1.5 w-1.5 rounded-full transition-colors duration-200',
              i < selectedMetrics.length ? 'bg-white/70' : 'bg-white/20'
            )}
          />
        ))}
      </div>
    </div>
  )
}

import { formatCurrency } from '@/lib/format'
import { DEFAULT_STARTING_AGE, type ProjectionPoint } from './types'
import { type MetricId, getMetricConfig } from './chartOverlays'

interface CustomTooltipProps {
  active?: boolean
  payload?: ReadonlyArray<{ payload: ProjectionPoint }>
  startingAge?: number
  resolution?: 'yearly' | 'monthly'
  selectedMetrics?: MetricId[]
}

export function CustomTooltip({
  active,
  payload,
  startingAge = DEFAULT_STARTING_AGE,
  resolution = 'yearly',
  selectedMetrics,
}: CustomTooltipProps) {
  if (!active || !payload || !payload.length) return null
  const data = payload[0].payload

  // Calculate age - yearIndex is month index in monthly mode, year index in yearly mode
  const yearsPassed = resolution === 'monthly' ? Math.floor(data.yearIndex / 12) : data.yearIndex
  const age = startingAge + yearsPassed

  // Original tooltip when no selectedMetrics (feature flag off)
  if (!selectedMetrics) {
    return (
      <div
        className={`min-w-[180px]
px-3 py-2
rounded-lg border border-white/10
bg-[#0f1728]/95
shadow-xl backdrop-blur-xl`}
      >
        <p
          className={`text-[10px] font-bold tracking-widest text-slate-400
uppercase`}
        >
          Year {data.calendarYear} (Age {age})
        </p>
        <p className="mt-0.5 text-xl font-light text-white">
          {formatCurrency(data.netWorth)}
        </p>
        <div className="mt-2 space-y-1">
          <div className="flex items-center justify-between text-xs">
            <span className="flex items-center gap-1.5 text-sky-300">
              <span className="h-1.5 w-1.5 rounded-full bg-sky-400" />
              Assets
            </span>
            <span className="font-mono text-slate-200">{formatCurrency(data.totalAssets)}</span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="flex items-center gap-1.5 text-rose-300">
              <span className="h-1.5 w-1.5 rounded-full bg-rose-400" />
              Liabilities
            </span>
            <span className="font-mono text-slate-200">{formatCurrency(data.totalLiabilities)}</span>
          </div>
        </div>
      </div>
    )
  }

  // Dynamic tooltip with selected metrics
  const primaryMetric = selectedMetrics[0]
  const primaryConfig = getMetricConfig(primaryMetric)
  const primaryValue = data[primaryMetric as keyof ProjectionPoint] as number | undefined

  return (
    <div
      className={`min-w-[180px]
px-3 py-2
rounded-lg border border-white/10
bg-[#0f1728]/95
shadow-xl backdrop-blur-xl`}
    >
      <p
        className={`text-[10px] font-bold tracking-widest text-slate-400
uppercase`}
      >
        Year {data.calendarYear} (Age {age})
      </p>

      {/* Primary metric headline */}
      {primaryConfig && primaryValue !== undefined && (
        <p className="mt-0.5 text-xl font-light" style={{ color: primaryConfig.color }}>
          {formatCurrency(primaryValue)}
        </p>
      )}

      {/* All selected metrics */}
      <div className="mt-2 space-y-1">
        {selectedMetrics.map((metricId) => {
          const config = getMetricConfig(metricId)
          if (!config) return null

          const value = data[metricId as keyof ProjectionPoint] as number | undefined
          if (value === undefined) return null

          return (
            <div key={metricId} className="flex items-center justify-between text-xs">
              <span className="flex items-center gap-1.5" style={{ color: config.color }}>
                <span
                  className="h-1.5 w-1.5 rounded-full"
                  style={{ backgroundColor: config.color }}
                />
                {config.label}
              </span>
              <span className="font-mono text-slate-200">{formatCurrency(value)}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

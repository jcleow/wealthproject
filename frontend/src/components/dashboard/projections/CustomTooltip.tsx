import { formatCurrency } from '@/lib/format'
import { DEFAULT_STARTING_AGE, type ProjectionPoint } from './types'

interface CustomTooltipProps {
  active?: boolean
  payload?: ReadonlyArray<{ payload: ProjectionPoint }>
  startingAge?: number
  resolution?: 'yearly' | 'monthly'
}

export function CustomTooltip({
  active,
  payload,
  startingAge = DEFAULT_STARTING_AGE,
  resolution = 'yearly',
}: CustomTooltipProps) {
  if (!active || !payload || !payload.length) return null
  const data = payload[0].payload

  // Calculate age - yearIndex is month index in monthly mode, year index in yearly mode
  const yearsPassed = resolution === 'monthly' ? Math.floor(data.yearIndex / 12) : data.yearIndex
  const age = startingAge + yearsPassed

  return (
    <div className="rounded-lg border border-white/10 bg-[#0f1728]/95 px-3 py-2 shadow-xl backdrop-blur-xl min-w-[180px]">
      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
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

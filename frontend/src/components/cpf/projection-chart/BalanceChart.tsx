import { useCallback, useRef } from 'react'
import {
  Area,
  ComposedChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts'
import type { ChartDataPoint, VisibleAccounts, ThresholdAges, Milestone } from './types'
import { ACCOUNT_COLORS } from './types'
import { BalanceTooltipContent } from './TooltipContent'
import { RetirementSavingsDot, MADot } from './MilestoneDots'
import { generateAgeTicks, type RetirementSumBase } from './utils'
import { useChartDrag } from './useChartDrag'

/** Chart layout configuration */
const CHART_LAYOUT = {
  margin: { top: 40, right: 30, left: 0, bottom: 0 },
  yAxisWidth: 50,
} as const

interface BalanceChartProps {
  data: ChartDataPoint[]
  visibleAccounts: VisibleAccounts
  thresholdAges: ThresholdAges
  milestones: Milestone[]
  selectedAge?: number
  onAgeSelect?: (age: number) => void
  /** FRS annual growth rate for threshold projections */
  frsGrowthRate?: number
  /** Base retirement sum values from API (optional, falls back to hardcoded constants) */
  retirementSumBase?: RetirementSumBase
}

export function BalanceChart({
  data,
  visibleAccounts,
  thresholdAges,
  milestones,
  selectedAge,
  onAgeSelect,
  frsGrowthRate = 0.035,
  retirementSumBase,
}: BalanceChartProps) {
  const startAge = data[0]?.age ?? 0
  const endAge = data[data.length - 1]?.age ?? 100
  const ticks = generateAgeTicks(startAge, endAge)

  const containerRef = useRef<HTMLDivElement>(null)

  const { isDragging, handleMouseDown, handleMouseMove, handleMouseUp } = useChartDrag({
    containerRef,
    rangeStart: startAge,
    rangeEnd: endAge,
    onValueChange: onAgeSelect,
    enabled: !!onAgeSelect,
    layout: CHART_LAYOUT,
  })

  // Click handler for Recharts (for tooltip interaction)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleChartClick = useCallback((chartData: any) => {
    if (chartData?.activePayload?.[0]?.payload && onAgeSelect) {
      onAgeSelect(chartData.activePayload[0].payload.age)
    }
  }, [onAgeSelect])

  return (
    <div
      ref={containerRef}
      className="h-full w-full"
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      style={{ cursor: isDragging ? 'grabbing' : 'crosshair' }}
    >
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart
          data={data}
          margin={CHART_LAYOUT.margin}
          onClick={handleChartClick}
        >
        <defs>
          <linearGradient id="oaGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={ACCOUNT_COLORS.oa} stopOpacity={0.3} />
            <stop offset="95%" stopColor={ACCOUNT_COLORS.oa} stopOpacity={0} />
          </linearGradient>
          <linearGradient id="saGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={ACCOUNT_COLORS.sa} stopOpacity={0.3} />
            <stop offset="95%" stopColor={ACCOUNT_COLORS.sa} stopOpacity={0} />
          </linearGradient>
          <linearGradient id="maGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={ACCOUNT_COLORS.ma} stopOpacity={0.3} />
            <stop offset="95%" stopColor={ACCOUNT_COLORS.ma} stopOpacity={0} />
          </linearGradient>
          <linearGradient id="raGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={ACCOUNT_COLORS.ra} stopOpacity={0.3} />
            <stop offset="95%" stopColor={ACCOUNT_COLORS.ra} stopOpacity={0} />
          </linearGradient>
        </defs>

        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />

        <XAxis
          dataKey="age"
          tick={{ fill: '#94a3b8', fontSize: 11 }}
          tickLine={false}
          axisLine={false}
          interval="preserveStartEnd"
          ticks={ticks}
        />

        <YAxis
          domain={['dataMin', 'dataMax']}
          tick={{ fill: '#94a3b8', fontSize: 11 }}
          tickLine={false}
          axisLine={false}
          tickFormatter={formatYAxis}
        />

        <Tooltip
          content={({ active, payload }) => {
            // Hide tooltip while dragging to avoid interference
            if (isDragging || !active || !payload?.[0]) return null
            return (
              <BalanceTooltipContent
                data={payload[0].payload}
                visibleAccounts={visibleAccounts}
                frsGrowthRate={frsGrowthRate}
                retirementSumBase={retirementSumBase}
              />
            )
          }}
        />

        {milestones.map((m) => (
          <ReferenceLine
            key={m.age}
            x={m.age}
            stroke={m.color}
            strokeDasharray="5 5"
            label={{
              value: m.label,
              fill: m.color,
              fontSize: 11,
              fontWeight: 600,
              position: 'insideTop',
            }}
          />
        ))}

        {/* Selected age indicator line */}
        {selectedAge !== undefined && (
          <ReferenceLine
            x={selectedAge}
            stroke="rgba(148, 163, 184, 0.6)"
            strokeWidth={1.5}
            label={{
              value: `Age ${selectedAge}`,
              fill: '#94a3b8',
              fontSize: 10,
              fontWeight: 500,
              position: 'top',
            }}
          />
        )}

        {visibleAccounts.oa && (
          <Area
            type="monotone"
            dataKey="oa"
            stackId="0"
            stroke={ACCOUNT_COLORS.oa}
            fill="url(#oaGradient)"
            strokeWidth={2}
          />
        )}

        {visibleAccounts.sa && (
          <Area
            type="monotone"
            dataKey="sa"
            stackId="1"
            stroke={ACCOUNT_COLORS.sa}
            fill="url(#saGradient)"
            strokeWidth={2}
          />
        )}

        {visibleAccounts.ma && (
          <Area
            type="monotone"
            dataKey="ma"
            stackId="2"
            stroke={ACCOUNT_COLORS.ma}
            fill="url(#maGradient)"
            strokeWidth={2}
            dot={(props) => <MADot {...props} thresholdAges={thresholdAges} />}
            activeDot={false}
          />
        )}

        {visibleAccounts.ra && (
          <Area
            type="monotone"
            dataKey="ra"
            stackId="3"
            stroke={ACCOUNT_COLORS.ra}
            fill="url(#raGradient)"
            strokeWidth={2}
          />
        )}

        {visibleAccounts.oaSa && (
          <Line
            type="monotone"
            dataKey="retirementSavings"
            stroke={ACCOUNT_COLORS.oaSa}
            strokeWidth={2}
            strokeDasharray="4 4"
            dot={(props) => <RetirementSavingsDot {...props} thresholdAges={thresholdAges} />}
            activeDot={false}
            connectNulls={false}
          />
        )}
      </ComposedChart>
    </ResponsiveContainer>
    </div>
  )
}

function formatYAxis(value: number): string {
  if (value >= 1000000) {
    return `$${(value / 1000000).toFixed(1)}M`
  }
  return `$${(value / 1000).toFixed(0)}K`
}

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
import { generateAgeTicks } from './utils'

interface BalanceChartProps {
  data: ChartDataPoint[]
  visibleAccounts: VisibleAccounts
  thresholdAges: ThresholdAges
  milestones: Milestone[]
}

export function BalanceChart({
  data,
  visibleAccounts,
  thresholdAges,
  milestones,
}: BalanceChartProps) {
  const startAge = data[0]?.age ?? 0
  const endAge = data[data.length - 1]?.age ?? 100
  const ticks = generateAgeTicks(startAge, endAge)

  return (
    <ResponsiveContainer width="100%" height="100%">
      <ComposedChart data={data} margin={{ top: 40, right: 30, left: 0, bottom: 0 }}>
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
            if (!active || !payload?.[0]) return null
            return <BalanceTooltipContent data={payload[0].payload} visibleAccounts={visibleAccounts} />
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
              position: 'insideTopRight',
            }}
          />
        ))}

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
  )
}

function formatYAxis(value: number): string {
  if (value >= 1000000) {
    return `$${(value / 1000000).toFixed(1)}M`
  }
  return `$${(value / 1000).toFixed(0)}K`
}

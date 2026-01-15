import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts'
import type { PayoutProjectionYear, PayoutPlan } from './types'
import { PayoutTooltipContent } from './TooltipContent'
import { generateAgeTicks } from './utils'

interface PayoutChartProps {
  data: PayoutProjectionYear[]
  payoutStartAge: number
  selectedPlan: PayoutPlan
}

export function PayoutChart({ data, payoutStartAge, selectedPlan }: PayoutChartProps) {
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-slate-500 text-sm">
        No payout data available
      </div>
    )
  }

  const startAge = data[0]?.age ?? 65
  const endAge = data[data.length - 1]?.age ?? 100
  const ticks = generateAgeTicks(startAge, endAge)

  return (
    <ResponsiveContainer width="100%" height="100%">
      <ComposedChart
        key={`payout-${selectedPlan}-${payoutStartAge}`}
        data={data}
        margin={{ top: 20, right: 60, left: 0, bottom: 0 }}
      >
        <defs>
          <linearGradient id="payoutGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
            <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="balanceGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.5} />
            <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0.1} />
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
          yAxisId="left"
          tick={{ fill: '#94a3b8', fontSize: 11 }}
          tickLine={false}
          axisLine={false}
          tickFormatter={(value) => `$${(value / 1000).toFixed(1)}K`}
        />

        <YAxis
          yAxisId="right"
          orientation="right"
          tick={{ fill: '#94a3b8', fontSize: 11 }}
          tickLine={false}
          axisLine={false}
          tickFormatter={(value) => `$${(value / 1000).toFixed(0)}K`}
        />

        <Tooltip
          content={({ active, payload }) => {
            if (!active || !payload?.[0]) return null
            return <PayoutTooltipContent data={payload[0].payload} selectedPlan={selectedPlan} />
          }}
        />

        <ReferenceLine
          yAxisId="left"
          x={payoutStartAge}
          stroke="#10b981"
          strokeDasharray="5 5"
          label={{
            value: 'Payout Start',
            fill: '#10b981',
            fontSize: 11,
            fontWeight: 600,
            position: 'insideTopRight',
          }}
        />

        <Bar
          yAxisId="right"
          dataKey="totalRemainingBalance"
          fill="url(#balanceGradient)"
          stroke="#8b5cf6"
          strokeWidth={1}
          radius={[2, 2, 0, 0]}
          name="Remaining Balance"
        />

        <Line
          yAxisId="left"
          type="monotone"
          dataKey="monthlyPayout"
          stroke="#10b981"
          strokeWidth={2}
          dot={false}
          activeDot={{ r: 4, fill: '#10b981' }}
        />
      </ComposedChart>
    </ResponsiveContainer>
  )
}

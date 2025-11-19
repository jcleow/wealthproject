import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

// Generate mock data for the next 20 years
const generateMockData = () => {
  const currentYear = new Date().getFullYear()
  const currentAge = 33 // Mock starting age
  const data = []

  for (let i = 0; i <= 20; i++) {
    const age = currentAge + i
    const year = currentYear + i

    // Mock financial growth calculations
    const baseAssets = 50000
    const baseLiabilities = 20000
    const growthRate = 1.08 // 8% annual growth
    const liabilityDecreaseRate = 0.95 // 5% annual decrease

    const totalAssets = Math.round(baseAssets * Math.pow(growthRate, i))
    const totalLiabilities = Math.round(baseLiabilities * Math.pow(liabilityDecreaseRate, i))
    const netWorth = totalAssets - totalLiabilities

    data.push({
      age,
      year,
      netWorth,
      totalAssets,
      totalLiabilities,
    })
  }

  return data
}

const CustomTooltip = ({ active, payload }: { active?: boolean; payload?: Array<{ payload: { age: number; year: number; netWorth: number; totalAssets: number; totalLiabilities: number } }> }) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload
    return (
      <div className="rounded-xl border border-white/10 bg-[#0f1728]/90 px-4 py-3 shadow-2xl backdrop-blur">
        <p className="text-xs uppercase tracking-wide text-slate-300">{`Age ${data.age} • ${data.year}`}</p>
        <p className="mt-1 font-semibold text-blue-300">
          Net Worth: ${data.netWorth.toLocaleString()}
        </p>
        <p className="text-emerald-300 text-sm">
          Assets ${data.totalAssets.toLocaleString()}
        </p>
        <p className="text-rose-300 text-sm">
          Liabilities ${data.totalLiabilities.toLocaleString()}
        </p>
      </div>
    )
  }
  return null
}

export function NetWorthProjection() {
  const data = generateMockData()

  return (
    <div className="flex h-full min-h-[40vh] flex-col">
      <div className="mb-4 flex flex-shrink-0 items-center justify-between">
        <div>
          <h3 className="mb-1 font-semibold text-lg text-white">
            Net Worth Projection
          </h3>
          <p className="text-gray-400 text-sm">Next 20 Years</p>
        </div>
      </div>

      <div className="relative min-h-0 flex-1 rounded-2xl border border-white/5 bg-gradient-to-b from-[#111832] via-[#0b1125] to-[#050914] p-4 shadow-inner">
        <div className="pointer-events-none absolute inset-6 rounded-2xl border border-white/5" />
        <ResponsiveContainer height="100%" width="100%">
          <AreaChart
            data={data}
            margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
          >
            <defs>
              <linearGradient id="netWorthGradient" x1="0" x2="0" y1="0" y2="1">
                <stop offset="5%" stopColor="#60A5FA" stopOpacity={0.8} />
                <stop offset="95%" stopColor="#60A5FA" stopOpacity={0.1} />
              </linearGradient>
            </defs>
            <CartesianGrid opacity={0.2} stroke="#24304d" strokeDasharray="3 3" />
            <XAxis
              axisLine={false}
              dataKey="age"
              fontSize={12}
              stroke="#7c8aa6"
              tickLine={false}
            />
            <YAxis
              axisLine={false}
              domain={[0, 'dataMax']}
              fontSize={12}
              stroke="#7c8aa6"
              tickFormatter={(value) => {
                if (value <= 0) return ''
                if (value >= 1_000_000)
                  return `$${(value / 1_000_000).toFixed(1)}M`
                if (value >= 1000) return `$${(value / 1000).toFixed(0)}K`
                return `$${value}`
              }}
              tickLine={false}
            />

            {/* Net Worth Area */}
            <Area
              activeDot={{ r: 6, fill: '#60A5FA', strokeWidth: 0 }}
              dataKey="netWorth"
              dot={false}
              fill="url(#netWorthGradient)"
              stroke="#60A5FA"
              strokeWidth={3}
              type="monotone"
            />

            {/* Custom Tooltip */}
            <Tooltip content={<CustomTooltip />} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

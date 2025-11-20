import { useEffect, useRef, useState } from 'react'
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

const chartColors = {
  axis: '#aeb6c9',
  grid: 'rgba(86, 91, 100, 0.6)',
  gradientStart: '#4f81ff',
  gradientEnd: 'rgba(59, 130, 246, 0.08)',
  stroke: '#7db0ff',
}

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
  const [hasSize, setHasSize] = useState(false)
  const chartContainerRef = useRef<HTMLDivElement>(null)
  const data = generateMockData()

  useEffect(() => {
    const element = chartContainerRef.current
    if (!element) return

    const observer = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect
      setHasSize(width > 0 && height > 0)
    })

    observer.observe(element)
    return () => observer.disconnect()
  }, [])

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

      <div
        ref={chartContainerRef}
        className="relative w-full flex-1 min-h-[320px] overflow-hidden"
      >
        <div className="pointer-events-none absolute inset-4 rounded-2xl border border-[#1d2b4a]" />
        {hasSize ? (
          <ResponsiveContainer width="100%" height="100%" minWidth={320} minHeight={280}>
            <AreaChart
              data={data}
              margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
              focusable="false"
              tabIndex={-1}
              role="presentation"
            >
              <defs>
                <linearGradient id="netWorthGradient" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0%" stopColor={chartColors.gradientStart} stopOpacity={0.8} />
                  <stop offset="90%" stopColor={chartColors.gradientEnd} stopOpacity={0.05} />
                </linearGradient>
              </defs>
              <CartesianGrid
                stroke={chartColors.grid}
                strokeDasharray="2 12"
                horizontal={false}
                fillOpacity={0}
              />
              <XAxis
                axisLine={false}
                dataKey="age"
                fontSize={12}
                stroke={chartColors.axis}
                tickLine={false}
              />
              <YAxis
                axisLine={false}
                domain={[0, 'dataMax']}
                fontSize={12}
                stroke={chartColors.axis}
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
                activeDot={{ r: 5, fill: chartColors.stroke, strokeWidth: 0 }}
                dataKey="netWorth"
                dot={false}
                fill="url(#netWorthGradient)"
                stroke={chartColors.stroke}
                strokeWidth={2.5}
                strokeOpacity={0.85}
                type="monotone"
              />

              {/* Custom Tooltip */}
              <Tooltip content={<CustomTooltip />} cursor={false} />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex h-full min-h-[320px] items-center justify-center text-sm text-slate-400">
            Loading projection...
          </div>
        )}
      </div>
    </div>
  )
}

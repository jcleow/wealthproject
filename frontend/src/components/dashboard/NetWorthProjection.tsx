import { useEffect, useMemo, useRef, useState } from 'react'
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { useFinancialData } from '@/hooks/useFinancialData'

const chartColors = {
  axis: '#aeb6c9',
  grid: 'rgba(86, 91, 100, 0.6)',
  gradientStart: '#4f81ff',
  gradientEnd: 'rgba(59, 130, 246, 0.08)',
  stroke: '#7db0ff',
}

const YEARS = 20
const DEFAULT_AGE = 33

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
  const {
    assets,
    liabilities,
    expenses,
    incomes,
    getMonthlySavings,
  } = useFinancialData()

  const [hasSize, setHasSize] = useState(false)
  const chartContainerRef = useRef<HTMLDivElement>(null)

  const projection = useMemo(() => {
    const totalAssets = assets.reduce((sum, a) => sum + a.currentValue, 0)
    const totalLiabilities = liabilities.reduce((sum, l) => sum + l.currentBalance, 0)
    const monthlySavings = getMonthlySavings()

    // If no data, return empty array so we render placeholder
    const hasAnyData =
      assets.length > 0 || liabilities.length > 0 || expenses.length > 0 || incomes.length > 0

    const currentYear = new Date().getFullYear()
    const data = []
    const annualSavings = Math.max(monthlySavings, 0) * 12
    const assetGrowthRate = 0.05 // conservative 5% annual
    const liabilityDecayRate = 0.94 // 6% annual paydown

    if (!hasAnyData) {
      for (let i = 0; i <= YEARS; i++) {
        const year = currentYear + i
        const age = DEFAULT_AGE + i
        data.push({
          age,
          year,
          netWorth: 0,
          totalAssets: 0,
          totalLiabilities: 0,
        })
      }
      return data
    }

    for (let i = 0; i <= YEARS; i++) {
      const year = currentYear + i
      const age = DEFAULT_AGE + i
      const projectedAssets = Math.round((totalAssets + annualSavings * i) * Math.pow(1 + assetGrowthRate, i))
      const projectedLiabilities = Math.max(
        0,
        Math.round(totalLiabilities * Math.pow(liabilityDecayRate, i))
      )
      const netWorth = projectedAssets - projectedLiabilities

      data.push({
        age,
        year,
        netWorth,
        totalAssets: projectedAssets,
        totalLiabilities: projectedLiabilities,
      })
    }

    return data
  }, [assets, liabilities, expenses, incomes, getMonthlySavings])

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
    <div className="flex h-full min-h-[320px] min-w-0 flex-col">
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
        className="relative w-full flex-none min-h-[220px] min-w-0 overflow-hidden aspect-[16/9]"
      >
        <div className="pointer-events-none absolute inset-[0.5rem] rounded-2xl border border-[#1d2b4a]" />
        {hasSize && projection.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%" minWidth={320} minHeight={200}>
            <AreaChart
              data={projection}
              margin={{ top: 6, right: 8, left: 8, bottom: 6 }}
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
                domain={[ (projection.at(-1)?.netWorth || 0) > 0 ? 0 : -500000, (projection.at(-1)?.netWorth || 0) > 0 ? 'dataMax' : 500000 ]}
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
          <div className="flex h-full min-h-[240px] items-center justify-center text-sm text-slate-400">
            Add assets or liabilities to view your net worth projection.
          </div>
        )}
      </div>
    </div>
  )
}

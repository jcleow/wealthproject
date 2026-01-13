'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  BarChart,
  Bar,
  Legend,
} from 'recharts'
import { cn } from '@/lib/utils'
import type { AmortizationYear, ChartView } from '../types'
import { formatCurrency, formatCompactCurrency } from '../hooks/useCalculations'

interface AmortizationChartProps {
  amortization: AmortizationYear[]
}

/**
 * AmortizationChart - A multi-view chart component for displaying loan amortization.
 * Supports balance view, composition breakdown, and schedule table views.
 */
export function AmortizationChart({
  amortization,
}: AmortizationChartProps) {
  const [chartView, setChartView] = useState<ChartView>('balance')
  const [showAllYears, setShowAllYears] = useState(false)

  if (amortization.length === 0) return null

  const displayYears = showAllYears ? amortization : amortization.slice(0, 5)
  const maxBalance = amortization[0]?.balance || 1
  const years = amortization.length

  // Prepare data for charts
  const balanceData = amortization.map(item => ({
    yearIndex: item.year,
    balance: item.balance,
  }))

  const compositionData = amortization.map(item => ({
    yearIndex: item.year,
    principal: item.principal,
    interest: item.interest,
  }))

  const yearTicks = amortization.map(item => item.year)
  const balanceDomain: [number, number] = [
    Math.max(0, (yearTicks[0] ?? 0) - 0.5),
    (yearTicks[yearTicks.length - 1] ?? 1) + 0.5,
  ]

  return (
    <div className="space-y-3">
      {/* Header with toggle */}
      <div className="flex items-center justify-between">
        <p className="text-[10px] font-medium text-slate-500">
          {chartView === 'balance' ? `Balance: ${formatCurrency(maxBalance)} → $0` : chartView === 'composition' ? 'Principal vs Interest' : 'Schedule'}
        </p>
        <div className="flex items-center gap-0.5 p-0.5 bg-white/[0.04] rounded-md">
          <button
            type="button"
            onClick={() => setChartView('balance')}
            className={cn(
              "px-2 py-0.5 text-[10px] font-medium rounded transition-colors",
              chartView === 'balance' ? "bg-white/10 text-white" : "text-slate-500 hover:text-slate-300"
            )}
          >
            Balance
          </button>
          <button
            type="button"
            onClick={() => setChartView('composition')}
            className={cn(
              "px-2 py-0.5 text-[10px] font-medium rounded transition-colors",
              chartView === 'composition' ? "bg-white/10 text-white" : "text-slate-500 hover:text-slate-300"
            )}
          >
            Breakdown
          </button>
          <button
            type="button"
            onClick={() => setChartView('schedule')}
            className={cn(
              "px-2 py-0.5 text-[10px] font-medium rounded transition-colors",
              chartView === 'schedule' ? "bg-white/10 text-white" : "text-slate-500 hover:text-slate-300"
            )}
          >
            Schedule
          </button>
        </div>
      </div>

      {/* Chart content */}
      <div style={{ minHeight: 180 }}>
        <AnimatePresence mode="wait">
          {chartView === 'balance' && (
            <motion.div
              key="balance"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
            >
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={balanceData} margin={{ bottom: 24, left: 8, right: 8, top: 8 }}>
                  <defs>
                    <linearGradient id="loanBalanceGradient" x1="0" x2="0" y1="0" y2="1">
                      <stop offset="5%" stopColor="#60A5FA" stopOpacity={0.5} />
                      <stop offset="95%" stopColor="#60A5FA" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="rgba(255,255,255,0.04)" strokeDasharray="3 3" />
                  <XAxis
                    dataKey="yearIndex"
                    type="number"
                    domain={balanceDomain}
                    ticks={yearTicks.filter((_, i) => i % Math.ceil(years / 6) === 0 || i === years - 1)}
                    allowDecimals={false}
                    stroke="#64748b"
                    fontSize={10}
                    tickMargin={8}
                    tickFormatter={(value) => `Y${value}`}
                  />
                  <YAxis
                    stroke="#64748b"
                    fontSize={10}
                    tickFormatter={(value) => formatCompactCurrency(value as number)}
                    width={50}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'rgba(15, 23, 40, 0.95)',
                      border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: '12px',
                      backdropFilter: 'blur(12px)',
                    }}
                    labelFormatter={(value) => `Year ${value}`}
                    formatter={(value) => [formatCurrency(Number(value) || 0), 'Balance']}
                  />
                  <Area
                    dataKey="balance"
                    type="monotone"
                    stroke="#3B82F6"
                    strokeWidth={2}
                    fill="url(#loanBalanceGradient)"
                    name="Remaining Balance"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </motion.div>
          )}

          {chartView === 'composition' && (
            <motion.div
              key="composition"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
            >
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={compositionData} barCategoryGap="20%" barGap={2} margin={{ bottom: 24, left: 8, right: 8, top: 8 }}>
                  <CartesianGrid stroke="rgba(255,255,255,0.04)" strokeDasharray="3 3" />
                  <XAxis
                    dataKey="yearIndex"
                    type="number"
                    domain={balanceDomain}
                    ticks={yearTicks.filter((_, i) => i % Math.ceil(years / 6) === 0 || i === years - 1)}
                    allowDecimals={false}
                    stroke="#64748b"
                    fontSize={10}
                    tickMargin={8}
                    tickFormatter={(value) => `Y${value}`}
                  />
                  <YAxis
                    stroke="#64748b"
                    fontSize={10}
                    tickFormatter={(value) => formatCompactCurrency(value as number)}
                    width={50}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'rgba(15, 23, 40, 0.95)',
                      border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: '12px',
                      backdropFilter: 'blur(12px)',
                    }}
                    labelFormatter={(value) => `Year ${value}`}
                    formatter={(value, name) => [
                      formatCurrency(Number(value) || 0),
                      name === 'interest' ? 'Interest' : 'Principal',
                    ]}
                  />
                  <Legend
                    wrapperStyle={{ paddingTop: 8, fontSize: '11px' }}
                    formatter={(value) => value === 'interest' ? 'Interest' : 'Principal'}
                  />
                  <Bar dataKey="interest" stackId="payments" fill="rgba(248, 113, 113, 0.7)" name="interest" radius={[2, 2, 0, 0]} />
                  <Bar dataKey="principal" stackId="payments" fill="rgba(59, 130, 246, 0.6)" name="principal" radius={[2, 2, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </motion.div>
          )}

          {chartView === 'schedule' && (
            <motion.div
              key="schedule"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="overflow-hidden"
            >
              <div className="overflow-x-auto max-h-[200px] overflow-y-auto">
                <table className="w-full text-xs">
                  <thead className="sticky top-0 bg-black/60 backdrop-blur-sm">
                    <tr className="text-slate-500 border-b border-white/[0.04]">
                      <th className="text-left px-4 py-2 font-medium">Year</th>
                      <th className="text-right px-4 py-2 font-medium">Principal</th>
                      <th className="text-right px-4 py-2 font-medium">Interest</th>
                      <th className="text-right px-4 py-2 font-medium">Balance</th>
                    </tr>
                  </thead>
                  <tbody>
                    {displayYears.map((year, index) => (
                      <tr
                        key={year.year}
                        className={cn(
                          "border-b border-white/[0.03] transition-colors hover:bg-white/[0.02]",
                          index === displayYears.length - 1 && "border-b-0"
                        )}
                      >
                        <td className="px-4 py-2 text-white font-medium">{year.year}</td>
                        <td className="px-4 py-2 text-right text-slate-300">
                          {formatCurrency(year.principal)}
                        </td>
                        <td className="px-4 py-2 text-right text-slate-400">
                          {formatCurrency(year.interest)}
                        </td>
                        <td className="px-4 py-2 text-right text-slate-500">
                          {formatCurrency(year.balance)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {amortization.length > 5 && (
                <button
                  type="button"
                  onClick={() => setShowAllYears(!showAllYears)}
                  className="w-full py-2 text-xs font-medium text-slate-500 hover:text-white transition-colors border-t border-white/[0.04] hover:bg-white/[0.02]"
                >
                  {showAllYears ? 'Show less' : `Show all ${amortization.length} years`}
                </button>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}

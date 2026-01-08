'use client'

import { useMemo, useState } from 'react'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts'
import { Info } from 'lucide-react'

import { formatCurrency } from '@/lib/format'

/**
 * CPF LIFE Payout Examples data from official CPF PDF
 * Source: CPF_LIFE_Payout_Examples.pdf
 * For Standard Plan members turning 65 in 2035
 * Interest rates: up to 6% p.a. (4% floor + extra interest)
 */
const CPF_LIFE_PAYOUT_DATA = [
  {
    payoutLow: 540,
    payoutHigh: 570,
    payoutMid: 555,
    savingsAt55: 60000,
    savingsAt60: 75900,
    savingsAt65: 97300,
  },
  {
    payoutLow: 860,
    payoutHigh: 930,
    payoutMid: 895,
    savingsAt55: 106500,
    savingsAt60: 131400,
    savingsAt65: 164800,
  },
  {
    payoutLow: 1170,
    payoutHigh: 1250,
    payoutMid: 1210,
    savingsAt55: 150000,
    savingsAt60: 183300,
    savingsAt65: 227900,
  },
  {
    payoutLow: 1610,
    payoutHigh: 1730,
    payoutMid: 1670,
    savingsAt55: 213000,
    savingsAt60: 258500,
    savingsAt65: 319400,
  },
  {
    payoutLow: 3100,
    payoutHigh: 3330,
    payoutMid: 3215,
    savingsAt55: 426000,
    savingsAt60: 512700,
    savingsAt65: 628600,
  },
]

type ViewMode = 'savings-vs-payout' | 'payout-vs-savings'

interface CPFLifePayoutExamplesChartProps {
  className?: string
}

export function CPFLifePayoutExamplesChart({ className }: CPFLifePayoutExamplesChartProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('savings-vs-payout')

  // Transform data based on view mode
  const chartData = useMemo(() => {
    if (viewMode === 'savings-vs-payout') {
      // X-axis: Monthly payout, Y-axis: Required savings
      return CPF_LIFE_PAYOUT_DATA.map((row) => ({
        payout: row.payoutMid,
        payoutLabel: `$${row.payoutLow.toLocaleString()} - $${row.payoutHigh.toLocaleString()}`,
        age55: row.savingsAt55,
        age60: row.savingsAt60,
        age65: row.savingsAt65,
      }))
    } else {
      // Alternate view: X-axis: Savings at 55, Y-axis: Monthly payout
      return CPF_LIFE_PAYOUT_DATA.map((row) => ({
        savings: row.savingsAt55,
        payoutLow: row.payoutLow,
        payoutHigh: row.payoutHigh,
        payoutMid: row.payoutMid,
      }))
    }
  }, [viewMode])

  // Calculate compound growth stats
  const growthStats = useMemo(() => {
    const lastRow = CPF_LIFE_PAYOUT_DATA[CPF_LIFE_PAYOUT_DATA.length - 1]
    const growth55to65 = ((lastRow.savingsAt65 - lastRow.savingsAt55) / lastRow.savingsAt55) * 100
    const avgAnnualGrowth = Math.pow(lastRow.savingsAt65 / lastRow.savingsAt55, 1 / 10) - 1

    return {
      growth55to65: growth55to65.toFixed(1),
      avgAnnualGrowth: (avgAnnualGrowth * 100).toFixed(1),
    }
  }, [])

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-sm font-medium text-slate-300">CPF LIFE Payout Examples</h3>
          <p className="mt-1 text-xs text-slate-500">
            Standard Plan · Members turning 65 in 2035 · Up to 6% p.a. interest
          </p>
        </div>

        {/* View Toggle */}
        <div className="inline-flex rounded-lg bg-white/[0.03] p-0.5 border border-white/[0.08]">
          <button
            type="button"
            onClick={() => setViewMode('savings-vs-payout')}
            className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all duration-150 ${
              viewMode === 'savings-vs-payout'
                ? 'bg-white/[0.1] text-white shadow-sm'
                : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            Savings Required
          </button>
          <button
            type="button"
            onClick={() => setViewMode('payout-vs-savings')}
            className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all duration-150 ${
              viewMode === 'payout-vs-savings'
                ? 'bg-white/[0.1] text-white shadow-sm'
                : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            Payout Range
          </button>
        </div>
      </div>

      {/* Key Insight Card */}
      <div className="flex items-start gap-3 rounded-xl border border-amber-500/20 bg-amber-500/5 p-3">
        <Info className="h-4 w-4 text-amber-400 mt-0.5 flex-shrink-0" />
        <div className="text-xs text-slate-400">
          <span className="font-medium text-amber-400">Compound Interest Effect:</span>{' '}
          Savings grow ~{growthStats.growth55to65}% from age 55 to 65
          ({growthStats.avgAnnualGrowth}% annual avg) due to extra interest rates on retirement savings.
        </div>
      </div>

      {/* Chart */}
      <div className="rounded-xl border border-white/[0.08] bg-[#0a0a0a] p-5">
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            {viewMode === 'savings-vs-payout' ? (
              <LineChart data={chartData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis
                  dataKey="payout"
                  tick={{ fill: '#94a3b8', fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(value) => `$${value.toLocaleString()}/mo`}
                  label={{
                    value: 'Monthly Payout',
                    position: 'insideBottom',
                    offset: -5,
                    fill: '#64748b',
                    fontSize: 10,
                  }}
                />
                <YAxis
                  tick={{ fill: '#94a3b8', fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(value) =>
                    value >= 1000000
                      ? `$${(value / 1000000).toFixed(1)}M`
                      : `$${(value / 1000).toFixed(0)}K`
                  }
                  label={{
                    value: 'Required Savings',
                    angle: -90,
                    position: 'insideLeft',
                    fill: '#64748b',
                    fontSize: 10,
                  }}
                />
                <Tooltip
                  content={({ active, payload }) => {
                    if (!active || !payload?.[0]) return null
                    const data = payload[0].payload
                    return (
                      <div className="min-w-[200px] px-3 py-2 rounded-lg border border-white/10 bg-[#0f1728]/95 shadow-xl backdrop-blur">
                        <p className="text-xs font-bold text-slate-400">
                          Target: {data.payoutLabel}/mo
                        </p>
                        <div className="mt-2 space-y-1.5">
                          <div className="flex items-center justify-between gap-4 text-xs">
                            <span className="flex items-center gap-1.5 text-emerald-400">
                              <span className="h-2 w-2 rounded-full bg-emerald-400" />
                              At Age 55
                            </span>
                            <span className="font-mono text-slate-200">
                              {formatCurrency(data.age55)}
                            </span>
                          </div>
                          <div className="flex items-center justify-between gap-4 text-xs">
                            <span className="flex items-center gap-1.5 text-blue-400">
                              <span className="h-2 w-2 rounded-full bg-blue-400" />
                              At Age 60
                            </span>
                            <span className="font-mono text-slate-200">
                              {formatCurrency(data.age60)}
                            </span>
                          </div>
                          <div className="flex items-center justify-between gap-4 text-xs">
                            <span className="flex items-center gap-1.5 text-violet-400">
                              <span className="h-2 w-2 rounded-full bg-violet-400" />
                              At Age 65
                            </span>
                            <span className="font-mono text-slate-200">
                              {formatCurrency(data.age65)}
                            </span>
                          </div>
                        </div>
                        <p className="mt-2 text-[10px] text-slate-500 border-t border-white/10 pt-2">
                          Less savings needed at younger ages
                        </p>
                      </div>
                    )
                  }}
                />
                <Legend
                  verticalAlign="top"
                  height={36}
                  formatter={(value) => (
                    <span className="text-xs text-slate-400">{value}</span>
                  )}
                />
                <Line
                  type="monotone"
                  dataKey="age55"
                  name="Savings at Age 55"
                  stroke="#10b981"
                  strokeWidth={2}
                  dot={{ fill: '#10b981', strokeWidth: 0, r: 4 }}
                  activeDot={{ r: 6, strokeWidth: 0 }}
                />
                <Line
                  type="monotone"
                  dataKey="age60"
                  name="Savings at Age 60"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  dot={{ fill: '#3b82f6', strokeWidth: 0, r: 4 }}
                  activeDot={{ r: 6, strokeWidth: 0 }}
                />
                <Line
                  type="monotone"
                  dataKey="age65"
                  name="Savings at Age 65"
                  stroke="#8b5cf6"
                  strokeWidth={2}
                  dot={{ fill: '#8b5cf6', strokeWidth: 0, r: 4 }}
                  activeDot={{ r: 6, strokeWidth: 0 }}
                />
              </LineChart>
            ) : (
              <LineChart data={chartData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis
                  dataKey="savings"
                  tick={{ fill: '#94a3b8', fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(value) =>
                    value >= 1000000
                      ? `$${(value / 1000000).toFixed(1)}M`
                      : `$${(value / 1000).toFixed(0)}K`
                  }
                  label={{
                    value: 'Savings at Age 55',
                    position: 'insideBottom',
                    offset: -5,
                    fill: '#64748b',
                    fontSize: 10,
                  }}
                />
                <YAxis
                  tick={{ fill: '#94a3b8', fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(value) => `$${value.toLocaleString()}`}
                  label={{
                    value: 'Monthly Payout',
                    angle: -90,
                    position: 'insideLeft',
                    fill: '#64748b',
                    fontSize: 10,
                  }}
                />
                <Tooltip
                  content={({ active, payload }) => {
                    if (!active || !payload?.[0]) return null
                    const data = payload[0].payload
                    return (
                      <div className="min-w-[180px] px-3 py-2 rounded-lg border border-white/10 bg-[#0f1728]/95 shadow-xl backdrop-blur">
                        <p className="text-xs font-bold text-slate-400">
                          Savings at 55: {formatCurrency(data.savings)}
                        </p>
                        <div className="mt-2 space-y-1">
                          <div className="flex items-center justify-between gap-4 text-xs">
                            <span className="text-slate-400">Monthly Payout</span>
                            <span className="font-mono font-medium text-emerald-400">
                              ${data.payoutLow.toLocaleString()} - ${data.payoutHigh.toLocaleString()}
                            </span>
                          </div>
                        </div>
                      </div>
                    )
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="payoutMid"
                  name="Monthly Payout (midpoint)"
                  stroke="#10b981"
                  strokeWidth={2}
                  dot={{ fill: '#10b981', strokeWidth: 0, r: 4 }}
                  activeDot={{ r: 6, strokeWidth: 0 }}
                />
              </LineChart>
            )}
          </ResponsiveContainer>
        </div>
      </div>

      {/* Data Table */}
      <div className="rounded-xl border border-white/[0.08] bg-[#0a0a0a] overflow-hidden">
        <div className="px-4 py-3 border-b border-white/[0.06]">
          <h4 className="text-xs font-medium text-slate-400">Reference Table</h4>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-white/[0.06] bg-white/[0.02]">
                <th className="px-4 py-2 text-left font-medium text-slate-400">Monthly Payout</th>
                <th className="px-4 py-2 text-right font-medium text-emerald-400">At Age 55</th>
                <th className="px-4 py-2 text-right font-medium text-blue-400">At Age 60</th>
                <th className="px-4 py-2 text-right font-medium text-violet-400">At Age 65</th>
              </tr>
            </thead>
            <tbody>
              {CPF_LIFE_PAYOUT_DATA.map((row, idx) => (
                <tr
                  key={idx}
                  className="border-b border-white/[0.04] last:border-b-0 hover:bg-white/[0.02] transition-colors"
                >
                  <td className="px-4 py-2.5 text-slate-300">
                    ${row.payoutLow.toLocaleString()} - ${row.payoutHigh.toLocaleString()}
                  </td>
                  <td className="px-4 py-2.5 text-right font-mono text-slate-300">
                    {formatCurrency(row.savingsAt55)}
                  </td>
                  <td className="px-4 py-2.5 text-right font-mono text-slate-300">
                    {formatCurrency(row.savingsAt60)}
                  </td>
                  <td className="px-4 py-2.5 text-right font-mono text-slate-300">
                    {formatCurrency(row.savingsAt65)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="px-4 py-2 border-t border-white/[0.06] bg-white/[0.01]">
          <p className="text-[10px] text-slate-500">
            Source: CPF LIFE Payout Examples (Standard Plan, members turning 65 in 2035)
          </p>
        </div>
      </div>
    </div>
  )
}

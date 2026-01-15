'use client'

import { useMemo } from 'react'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import { AlertTriangle } from 'lucide-react'
import { formatCurrency } from '@/lib/format'

interface AccruedInterestChartProps {
  totalPrincipal: number
  holdingYears: number
  interestRate?: number // Default 2.5%
}

interface YearlyData {
  year: number
  principal: number
  interestForYear: number
  cumulativeInterest: number
}

export function AccruedInterestChart({
  totalPrincipal,
  holdingYears,
  interestRate = 0.025,
}: AccruedInterestChartProps) {
  // Generate yearly breakdown data
  const yearlyData = useMemo(() => {
    const data: YearlyData[] = []
    let cumulativeInterest = 0

    for (let year = 1; year <= Math.max(holdingYears, 1); year++) {
      // Simple interest calculation for display
      // Actual CPF accrued interest is compound but simplified here
      const interestForYear = totalPrincipal * interestRate
      cumulativeInterest += interestForYear

      data.push({
        year,
        principal: totalPrincipal,
        interestForYear,
        cumulativeInterest,
      })
    }

    return data
  }, [totalPrincipal, holdingYears, interestRate])

  const totalAccrued = yearlyData[yearlyData.length - 1]?.cumulativeInterest || 0

  return (
    <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h4 className="text-sm font-medium text-slate-300">Accrued Interest Over Time</h4>
        <div className="text-right">
          <p className="text-xs text-slate-500">Total Accrued</p>
          <p className="text-lg font-semibold text-amber-400 font-mono tabular-nums">
            {formatCurrency(totalAccrued)}
          </p>
        </div>
      </div>

      {/* Rate Badge */}
      <div className="mb-4">
        <span className="px-2 py-1 rounded text-[10px] font-medium bg-amber-500/15 text-amber-400">
          {(interestRate * 100).toFixed(1)}% p.a.
        </span>
      </div>

      {/* Chart */}
      <div className="h-48">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={yearlyData}
            margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
          >
            <defs>
              <linearGradient id="accruedGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
            <XAxis
              dataKey="year"
              tick={{ fill: '#94a3b8', fontSize: 10 }}
              tickLine={false}
              axisLine={false}
              tickFormatter={(value) => `Y${value}`}
            />
            <YAxis
              tick={{ fill: '#94a3b8', fontSize: 10 }}
              tickLine={false}
              axisLine={false}
              tickFormatter={(value) => `$${(value / 1000).toFixed(0)}K`}
              width={45}
            />
            <Tooltip
              content={({ active, payload }) => {
                if (!active || !payload?.[0]) return null
                const data = payload[0].payload as YearlyData
                return (
                  <div className="px-3 py-2 rounded-lg border border-white/10 bg-[#0f1728]/95 shadow-xl backdrop-blur">
                    <p className="text-xs font-bold text-slate-400">Year {data.year}</p>
                    <div className="mt-2 space-y-1 text-xs">
                      <div className="flex justify-between gap-4">
                        <span className="text-slate-400">Principal:</span>
                        <span className="text-white font-mono">{formatCurrency(data.principal)}</span>
                      </div>
                      <div className="flex justify-between gap-4">
                        <span className="text-slate-400">Interest This Year:</span>
                        <span className="text-amber-400 font-mono">+{formatCurrency(data.interestForYear)}</span>
                      </div>
                      <div className="flex justify-between gap-4 border-t border-white/10 pt-1">
                        <span className="text-slate-400">Cumulative:</span>
                        <span className="font-medium text-white font-mono">{formatCurrency(data.cumulativeInterest)}</span>
                      </div>
                    </div>
                  </div>
                )
              }}
            />
            <Area
              type="monotone"
              dataKey="cumulativeInterest"
              stroke="#f59e0b"
              fill="url(#accruedGradient)"
              strokeWidth={2}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Warning */}
      <div className="flex items-start gap-3 p-3 mt-4 rounded-lg border border-amber-500/20 bg-amber-500/5">
        <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0 text-amber-400" />
        <p className="text-xs text-slate-300">
          When you sell your property, you must refund the principal used plus all accrued
          interest back to your CPF account.
        </p>
      </div>
    </div>
  )
}

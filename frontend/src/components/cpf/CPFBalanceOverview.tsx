'use client'

import { useMemo } from 'react'
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
} from 'recharts'
import { TrendingUp, Info } from 'lucide-react'

import { formatCurrency } from '@/lib/format'
import type { CPFProfile } from '@/types/cpf'

const COLORS = {
  oa: '#3b82f6', // blue
  sa: '#10b981', // emerald
  ma: '#f59e0b', // amber
  ra: '#8b5cf6', // violet
}

const ACCOUNT_INFO = {
  oa: {
    name: 'Ordinary Account',
    short: 'OA',
    rate: '2.5%',
    description: 'For housing, insurance, investment and education expenses',
  },
  sa: {
    name: 'Special Account',
    short: 'SA',
    rate: '4.0%',
    description: 'For retirement savings and approved investments',
  },
  ma: {
    name: 'MediSave Account',
    short: 'MA',
    rate: '4.0%',
    description: 'For healthcare expenses and approved medical insurance',
  },
  ra: {
    name: 'Retirement Account',
    short: 'RA',
    rate: '4.0%',
    description: 'Created at age 55 to receive CPF LIFE payouts',
  },
}

interface CPFBalanceOverviewProps {
  profile: CPFProfile
  className?: string
}

export function CPFBalanceOverview({ profile, className }: CPFBalanceOverviewProps) {
  const { balances, age } = profile

  const totalBalance = useMemo(
    () => balances.oa + balances.sa + balances.ma + balances.ra,
    [balances]
  )

  const pieData = useMemo(() => {
    const data = []
    if (balances.oa > 0) data.push({ name: 'OA', value: balances.oa, color: COLORS.oa })
    if (balances.sa > 0) data.push({ name: 'SA', value: balances.sa, color: COLORS.sa })
    if (balances.ma > 0) data.push({ name: 'MA', value: balances.ma, color: COLORS.ma })
    if (balances.ra > 0) data.push({ name: 'RA', value: balances.ra, color: COLORS.ra })
    return data
  }, [balances])

  // Calculate extra interest earned
  const extraInterest = useMemo(() => {
    const combinedFirst60k = Math.min(balances.oa, 20000) + balances.sa + balances.ma
    const eligible60k = Math.min(combinedFirst60k, 60000)
    const extra1Percent = eligible60k * 0.01

    if (age >= 55) {
      const next30k = Math.min(Math.max(0, combinedFirst60k - 60000), 30000)
      return extra1Percent + next30k * 0.01
    }
    return extra1Percent
  }, [balances, age])

  return (
    <div className={`rounded-xl border border-white/[0.08] bg-[#0a0a0a] ${className}`}>
      {/* Header */}
      <div className="border-b border-white/[0.04] p-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-wide text-blue-300">CPF Balances</p>
            <h2 className="mt-1 text-2xl font-semibold text-white">
              {formatCurrency(totalBalance)}
            </h2>
          </div>
          <div className={`flex items-center
gap-2 px-3 py-1.5
rounded-lg
bg-emerald-500/10`}>
            <TrendingUp className="h-4 w-4 text-emerald-400" />
            <span className="text-sm font-medium text-emerald-400">
              +{formatCurrency(extraInterest)}/yr extra
            </span>
          </div>
        </div>
        <p className="mt-1 text-sm text-slate-400">
          Age {age} · {profile.residencyStatus.replace('_', ' ')}
        </p>
      </div>

      {/* Chart and Breakdown */}
      <div className="grid grid-cols-1 gap-6 p-5 md:grid-cols-2">
        {/* Pie Chart */}
        <div className="flex items-center justify-center">
          <div className="relative h-48 w-48">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={80}
                  paddingAngle={2}
                  dataKey="value"
                  stroke="none"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  content={({ active, payload }) => {
                    if (!active || !payload?.[0]) return null
                    const data = payload[0].payload
                    return (
                      <div className={`px-3 py-2
rounded-lg border border-white/10
bg-[#0f1728]/95
shadow-xl backdrop-blur`}>
                        <p className="text-xs font-medium text-slate-300">{data.name}</p>
                        <p className="text-lg font-semibold text-white">
                          {formatCurrency(data.value)}
                        </p>
                      </div>
                    )
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
            {/* Center Label */}
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <p className="text-xs text-slate-400">Total</p>
              <p className="text-lg font-semibold text-white">{formatCurrency(totalBalance)}</p>
            </div>
          </div>
        </div>

        {/* Account Breakdown */}
        <div className="space-y-3">
          {(['oa', 'sa', 'ma', 'ra'] as const).map((account) => {
            const info = ACCOUNT_INFO[account]
            const value = balances[account]
            const percentage = totalBalance > 0 ? (value / totalBalance) * 100 : 0

            return (
              <div
                key={account}
                className={`p-3
rounded-lg border border-white/[0.06] hover:border-white/[0.1]
bg-white/[0.02] hover:bg-white/[0.04]
transition
group`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className="h-3 w-3 rounded-full"
                      style={{ backgroundColor: COLORS[account] }}
                    />
                    <div className="flex items-center gap-1.5">
                      <p className="text-sm font-medium text-white">
                        {info.name} ({info.short})
                      </p>
                      <div className="relative">
                        <Info className="h-3.5 w-3.5 cursor-help text-slate-500 hover:text-slate-400" />
                        {/* Tooltip */}
                        <div className={`absolute bottom-full left-1/2 z-50
pointer-events-none mb-2 group-hover:pointer-events-auto
opacity-0 group-hover:opacity-100
transition-opacity
-translate-x-1/2`}>
                          <div className={`px-3 py-2
rounded-lg border border-white/10
bg-[#0f1728]/95
whitespace-nowrap text-xs text-slate-300
shadow-xl backdrop-blur`}>
                            <p className="font-medium text-white">{info.rate} p.a.</p>
                            <p className="mt-0.5">{info.description}</p>
                          </div>
                          {/* Arrow */}
                          <div className={`absolute left-1/2 top-full
border-4 border-transparent border-t-[#0f1728]/95
-translate-x-1/2`} />
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-white">{formatCurrency(value)}</p>
                    <p className="text-xs text-slate-500">{percentage.toFixed(1)}% of total</p>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Extra Interest Info */}
      <div className="border-t border-white/[0.04] px-5 py-4">
        <div className="flex items-start gap-3 rounded-lg bg-blue-500/5 p-3">
          <Info className="mt-0.5 h-4 w-4 flex-shrink-0 text-blue-400" />
          <div className="text-xs text-slate-300">
            <p className="font-medium text-blue-300">Extra Interest Earned</p>
            <p className="mt-1">
              You earn an extra 1% p.a. on the first $60,000 of your combined balances (capped at
              $20,000 OA). {age >= 55 && 'Plus an additional 1% on the next $30,000 after age 55.'}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

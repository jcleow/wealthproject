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
  ReferenceLine,
} from 'recharts'

import { formatCurrency } from '@/lib/format'
import type { CPFProfile } from '@/types/cpf'
import { generateMockProjection, generateMockRetirementProjection } from '@/lib/cpf-mock-data'

interface CPFProjectionChartProps {
  profile: CPFProfile
  className?: string
}

export function CPFProjectionChart({ profile, className }: CPFProjectionChartProps) {
  const projection = useMemo(() => generateMockProjection(profile), [profile])
  const retirement = useMemo(
    () => generateMockRetirementProjection(projection),
    [projection]
  )

  const milestones = [
    { age: 55, label: 'RA Formation', color: '#f59e0b' },
    { age: 65, label: 'CPF LIFE Start', color: '#10b981' },
  ]

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Retirement Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <RetirementCard
          label="Projected at Age 55"
          value={
            retirement.age55Balances.oa +
            retirement.age55Balances.sa +
            retirement.age55Balances.ma +
            retirement.age55Balances.ra
          }
          target={retirement.frsTarget}
          targetLabel="FRS Target"
        />
        <RetirementCard
          label="Projected RA at 65"
          value={retirement.age65Balances.ra}
          target={retirement.ersTarget}
          targetLabel="ERS Target"
        />
        <div className="rounded-xl border border-white/[0.08] bg-[#0a0a0a] p-4">
          <p className="text-xs text-slate-400">Est. CPF LIFE (Standard)</p>
          <p className="mt-1 text-xl font-semibold text-emerald-400">
            {formatCurrency(retirement.cpfLifeEstimates.standard)}/mo
          </p>
          <p className="mt-1 text-xs text-slate-500">Starting at age 65</p>
        </div>
        <div className="rounded-xl border border-white/[0.08] bg-[#0a0a0a] p-4">
          <p className="text-xs text-slate-400">Current Age</p>
          <p className="mt-1 text-xl font-semibold text-white">{profile.age}</p>
          <p className="mt-1 text-xs text-slate-500">{55 - profile.age} years to RA formation</p>
        </div>
      </div>

      {/* Main Chart */}
      <div className="rounded-xl border border-white/[0.08] bg-[#0a0a0a] p-5">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-medium text-slate-300">30-Year CPF Projection</h3>
            <p className="text-xs text-slate-500">
              Age {profile.age} to {profile.age + 30}
            </p>
          </div>
          <div className="flex items-center gap-4">
            {[
              { label: 'OA', color: '#3b82f6' },
              { label: 'SA', color: '#10b981' },
              { label: 'MA', color: '#f59e0b' },
              { label: 'RA', color: '#8b5cf6' },
            ].map((item) => (
              <div key={item.label} className="flex items-center gap-1.5">
                <div className="h-2 w-2 rounded-full" style={{ backgroundColor: item.color }} />
                <span className="text-xs text-slate-400">{item.label}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={projection} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="oaChartGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="saChartGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="maChartGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="raChartGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis
                dataKey="age"
                tick={{ fill: '#94a3b8', fontSize: 11 }}
                tickLine={false}
                axisLine={false}
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
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (!active || !payload?.[0]) return null
                  const data = payload[0].payload
                  return (
                    <div className="rounded-lg border border-white/10 bg-[#0f1728]/95 px-3 py-2 shadow-xl backdrop-blur min-w-[200px]">
                      <p className="text-xs font-bold text-slate-400">
                        Age {data.age} ({data.year})
                      </p>
                      <div className="mt-2 space-y-1">
                        <TooltipRow label="OA" value={data.oa} color="#3b82f6" />
                        <TooltipRow label="SA" value={data.sa} color="#10b981" />
                        <TooltipRow label="MA" value={data.ma} color="#f59e0b" />
                        {data.ra > 0 && <TooltipRow label="RA" value={data.ra} color="#8b5cf6" />}
                        <div className="border-t border-white/10 pt-1">
                          <TooltipRow label="Total" value={data.total} color="#fff" bold />
                        </div>
                      </div>
                      <div className="mt-2 border-t border-white/10 pt-2 text-xs text-slate-500">
                        <p>Contributions: {formatCurrency(data.contributions)}</p>
                        <p>Interest: {formatCurrency(data.interest)}</p>
                      </div>
                    </div>
                  )
                }}
              />

              {/* Reference lines for milestones */}
              {milestones.map((m) => (
                <ReferenceLine
                  key={m.age}
                  x={m.age}
                  stroke={m.color}
                  strokeDasharray="5 5"
                  label={{
                    value: m.label,
                    fill: m.color,
                    fontSize: 10,
                    position: 'top',
                  }}
                />
              ))}

              <Area
                type="monotone"
                dataKey="oa"
                stackId="1"
                stroke="#3b82f6"
                fill="url(#oaChartGradient)"
                strokeWidth={2}
              />
              <Area
                type="monotone"
                dataKey="sa"
                stackId="1"
                stroke="#10b981"
                fill="url(#saChartGradient)"
                strokeWidth={2}
              />
              <Area
                type="monotone"
                dataKey="ma"
                stackId="1"
                stroke="#f59e0b"
                fill="url(#maChartGradient)"
                strokeWidth={2}
              />
              <Area
                type="monotone"
                dataKey="ra"
                stackId="1"
                stroke="#8b5cf6"
                fill="url(#raChartGradient)"
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* CPF LIFE Estimates */}
      <div className="rounded-xl border border-white/[0.08] bg-[#0a0a0a] p-5">
        <h3 className="mb-4 text-sm font-medium text-slate-300">CPF LIFE Monthly Payout Estimates</h3>
        <div className="grid gap-4 sm:grid-cols-3">
          <PayoutCard
            plan="Standard"
            amount={retirement.cpfLifeEstimates.standard}
            description="Higher payouts, lower bequest"
            color="emerald"
          />
          <PayoutCard
            plan="Basic"
            amount={retirement.cpfLifeEstimates.basic}
            description="Lower payouts, higher bequest"
            color="blue"
          />
          <PayoutCard
            plan="Escalating"
            amount={retirement.cpfLifeEstimates.escalating}
            description="2% annual increase"
            color="violet"
          />
        </div>
        <p className="mt-4 text-xs text-slate-500">
          * Estimates based on projected RA balance of {formatCurrency(retirement.age65Balances.ra)} at age 65.
          Actual payouts depend on CPF LIFE cohort rates.
        </p>
      </div>
    </div>
  )
}

function RetirementCard({
  label,
  value,
  target,
  targetLabel,
}: {
  label: string
  value: number
  target: number
  targetLabel: string
}) {
  const percentage = target > 0 ? Math.min(100, (value / target) * 100) : 0
  const isOnTrack = value >= target

  return (
    <div className="rounded-xl border border-white/[0.08] bg-[#0a0a0a] p-4">
      <p className="text-xs text-slate-400">{label}</p>
      <p className="mt-1 text-xl font-semibold text-white">{formatCurrency(value)}</p>
      <div className="mt-3">
        <div className="flex items-center justify-between text-xs">
          <span className="text-slate-500">{targetLabel}</span>
          <span className={isOnTrack ? 'text-emerald-400' : 'text-amber-400'}>
            {percentage.toFixed(0)}%
          </span>
        </div>
        <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-white/[0.06]">
          <div
            className={`h-full rounded-full transition-all ${
              isOnTrack ? 'bg-emerald-500' : 'bg-amber-500'
            }`}
            style={{ width: `${percentage}%` }}
          />
        </div>
        <p className="mt-1 text-xs text-slate-500">{formatCurrency(target)}</p>
      </div>
    </div>
  )
}

function TooltipRow({
  label,
  value,
  color,
  bold,
}: {
  label: string
  value: number
  color: string
  bold?: boolean
}) {
  return (
    <div className="flex items-center justify-between gap-4 text-xs">
      <span className="flex items-center gap-1.5" style={{ color }}>
        <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: color }} />
        {label}
      </span>
      <span className={`font-mono ${bold ? 'font-semibold text-white' : 'text-slate-200'}`}>
        {formatCurrency(value)}
      </span>
    </div>
  )
}

function PayoutCard({
  plan,
  amount,
  description,
  color,
}: {
  plan: string
  amount: number
  description: string
  color: 'emerald' | 'blue' | 'violet'
}) {
  const colorClasses = {
    emerald: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400',
    blue: 'border-blue-500/30 bg-blue-500/10 text-blue-400',
    violet: 'border-violet-500/30 bg-violet-500/10 text-violet-400',
  }

  return (
    <div className={`rounded-lg border p-4 ${colorClasses[color]}`}>
      <p className="text-xs opacity-80">{plan} Plan</p>
      <p className="mt-1 text-2xl font-semibold">{formatCurrency(amount)}/mo</p>
      <p className="mt-1 text-xs opacity-60">{description}</p>
    </div>
  )
}

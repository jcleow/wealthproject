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
import { Shield, TrendingUp, Calendar, Info, AlertTriangle } from 'lucide-react'

import { formatCurrency } from '@/lib/format'
import type { CPFProfile } from '@/types/cpf'
import { mockShieldingStrategy, CPF_LIMITS } from '@/lib/cpf-mock-data'

interface SAShieldingPlannerProps {
  profile: CPFProfile
  className?: string
}

export function SAShieldingPlanner({ profile, className }: SAShieldingPlannerProps) {
  const yearsTo55 = 55 - profile.age
  const isEligible = profile.age < 55

  // Generate timeline data
  const timelineData = useMemo(() => {
    const data = []
    const startSA = profile.balances.sa
    const startOA = profile.balances.oa

    // Project balances to age 55 (simplified)
    for (let i = 0; i <= yearsTo55 + 5; i++) {
      const age = profile.age + i
      const year = new Date().getFullYear() + i

      // Simplified growth projection
      const saGrowth = Math.pow(1.04, i)
      const oaGrowth = Math.pow(1.025, i)

      // Add contributions (simplified)
      const annualContrib = profile.monthlyIncome * 12 * 0.37
      const saContrib = age < 55 ? annualContrib * 0.16 : 0
      const oaContrib = annualContrib * 0.62

      let projectedSA = startSA * saGrowth + saContrib * i
      let projectedOA = startOA * oaGrowth + oaContrib * i

      // At age 55, RA formation
      let projectedRA = 0
      if (age >= 55) {
        const frs = CPF_LIMITS.frs2024 * Math.pow(1.03, yearsTo55)
        if (i === yearsTo55) {
          // RA formation year
          const saTransfer = Math.min(projectedSA, frs)
          const oaTransfer = Math.min(projectedOA, Math.max(0, frs - saTransfer))
          projectedRA = saTransfer + oaTransfer
          projectedSA = projectedSA - saTransfer
          projectedOA = projectedOA - oaTransfer
        } else if (age > 55) {
          projectedRA = (startSA + startOA) * Math.pow(1.04, i - yearsTo55 + 1)
        }
      }

      data.push({
        age,
        year,
        sa: Math.round(projectedSA),
        oa: Math.round(projectedOA),
        ra: Math.round(projectedRA),
        total: Math.round(projectedSA + projectedOA + projectedRA),
        isAge55: age === 55,
      })
    }

    return data
  }, [profile, yearsTo55])

  const strategy = mockShieldingStrategy

  if (!isEligible) {
    return (
      <div className={`rounded-xl border border-white/[0.08] bg-[#0a0a0a] p-8 text-center ${className}`}>
        <Shield className="mx-auto h-12 w-12 text-slate-500" />
        <h3 className="mt-4 text-lg font-medium text-white">SA Shielding Not Available</h3>
        <p className="mt-2 text-sm text-slate-400">
          SA shielding is only applicable for members below age 55. At age 55, your RA has already
          been formed.
        </p>
      </div>
    )
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Strategy Overview */}
      <div className="rounded-xl border border-white/[0.08] bg-[#0a0a0a] p-5">
        <div className="flex items-center gap-3 mb-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-violet-500/20">
            <Shield className="h-5 w-5 text-violet-400" />
          </div>
          <div>
            <h3 className="text-sm font-medium text-white">SA Shielding Strategy</h3>
            <p className="text-xs text-slate-400">
              Preserve SA balance from RA formation at age 55
            </p>
          </div>
        </div>

        {/* Info Banner */}
        <div className="rounded-lg bg-violet-500/5 border border-violet-500/20 p-4 mb-6">
          <div className="flex items-start gap-3">
            <Info className="mt-0.5 h-4 w-4 flex-shrink-0 text-violet-400" />
            <div className="text-xs text-slate-300">
              <p className="font-medium text-violet-300">How SA Shielding Works</p>
              <p className="mt-1">
                At age 55, your SA is transferred to RA before OA. SA earns 4% while OA earns 2.5%.
                By investing SA in T-Bills/SGS before turning 55, you can &quot;shield&quot; it from RA
                formation. After the bonds mature (post-55), funds return to SA, earning the higher
                interest rate.
              </p>
            </div>
          </div>
        </div>

        {/* Timeline Info */}
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-4">
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <Calendar className="h-3.5 w-3.5" />
              <span>Years to Age 55</span>
            </div>
            <p className="mt-2 text-2xl font-semibold text-white">{yearsTo55} years</p>
            <p className="mt-1 text-xs text-slate-500">
              Target: {new Date().getFullYear() + yearsTo55}
            </p>
          </div>

          <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-4">
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <Shield className="h-3.5 w-3.5" />
              <span>Recommended Shield</span>
            </div>
            <p className="mt-2 text-2xl font-semibold text-violet-400">
              {formatCurrency(strategy.shieldingAmount)}
            </p>
            <p className="mt-1 text-xs text-slate-500">Via 6-month T-Bills</p>
          </div>

          <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-4">
            <div className="flex items-center gap-2 text-xs text-emerald-300">
              <TrendingUp className="h-3.5 w-3.5" />
              <span>10-Year Benefit</span>
            </div>
            <p className="mt-2 text-2xl font-semibold text-emerald-400">
              +{formatCurrency(strategy.benefitAnalysis.netBenefit)}
            </p>
            <p className="mt-1 text-xs text-emerald-300/70">
              1.5% extra interest per year
            </p>
          </div>
        </div>
      </div>

      {/* Timeline Chart */}
      <div className="rounded-xl border border-white/[0.08] bg-[#0a0a0a] p-5">
        <h3 className="mb-4 text-sm font-medium text-slate-300">CPF Balance Projection</h3>

        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={timelineData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="saGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="oaGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="raGradient" x1="0" y1="0" x2="0" y2="1">
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
                    <div className="rounded-lg border border-white/10 bg-[#0f1728]/95 px-3 py-2 shadow-xl backdrop-blur">
                      <p className="text-xs font-bold text-slate-400">
                        Age {data.age} ({data.year})
                      </p>
                      <div className="mt-2 space-y-1">
                        <div className="flex justify-between gap-4 text-xs">
                          <span className="text-emerald-400">SA:</span>
                          <span className="font-mono text-white">{formatCurrency(data.sa)}</span>
                        </div>
                        <div className="flex justify-between gap-4 text-xs">
                          <span className="text-blue-400">OA:</span>
                          <span className="font-mono text-white">{formatCurrency(data.oa)}</span>
                        </div>
                        {data.ra > 0 && (
                          <div className="flex justify-between gap-4 text-xs">
                            <span className="text-violet-400">RA:</span>
                            <span className="font-mono text-white">{formatCurrency(data.ra)}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )
                }}
              />
              <ReferenceLine
                x={55}
                stroke="#f59e0b"
                strokeDasharray="5 5"
                label={{
                  value: 'Age 55',
                  fill: '#f59e0b',
                  fontSize: 10,
                  position: 'top',
                }}
              />
              <Area
                type="monotone"
                dataKey="sa"
                stackId="1"
                stroke="#10b981"
                fill="url(#saGradient)"
                strokeWidth={2}
              />
              <Area
                type="monotone"
                dataKey="oa"
                stackId="1"
                stroke="#3b82f6"
                fill="url(#oaGradient)"
                strokeWidth={2}
              />
              <Area
                type="monotone"
                dataKey="ra"
                stackId="1"
                stroke="#8b5cf6"
                fill="url(#raGradient)"
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Legend */}
        <div className="mt-4 flex items-center justify-center gap-6">
          {[
            { label: 'SA', color: '#10b981' },
            { label: 'OA', color: '#3b82f6' },
            { label: 'RA', color: '#8b5cf6' },
          ].map((item) => (
            <div key={item.label} className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full" style={{ backgroundColor: item.color }} />
              <span className="text-xs text-slate-400">{item.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Comparison: With vs Without Shielding */}
      <div className="rounded-xl border border-white/[0.08] bg-[#0a0a0a] p-5">
        <h3 className="mb-4 text-sm font-medium text-slate-300">
          RA Formation Comparison at Age 55
        </h3>

        <div className="grid gap-4 sm:grid-cols-2">
          {/* Without Shielding */}
          <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-4">
            <p className="text-xs font-medium text-rose-300">Without Shielding</p>
            <div className="mt-4 space-y-3">
              <ComparisonRow
                label="SA → RA"
                value={strategy.raFormationWithout.fromSA}
                color="text-rose-400"
              />
              <ComparisonRow
                label="OA → RA"
                value={strategy.raFormationWithout.fromOA}
                color="text-rose-400"
              />
              <div className="border-t border-white/[0.06] pt-3">
                <ComparisonRow
                  label="Total RA"
                  value={strategy.raFormationWithout.totalRA}
                  color="text-white"
                  bold
                />
              </div>
              <ComparisonRow
                label="Remaining SA"
                value={strategy.raFormationWithout.excessSA}
                color="text-emerald-400"
              />
              <ComparisonRow
                label="Remaining OA"
                value={strategy.raFormationWithout.excessOA}
                color="text-blue-400"
              />
            </div>
          </div>

          {/* With Shielding */}
          <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-4">
            <p className="text-xs font-medium text-emerald-300">With SA Shielding</p>
            <div className="mt-4 space-y-3">
              <ComparisonRow
                label="SA → RA"
                value={strategy.raFormationWith.fromSA}
                color="text-emerald-400"
                highlight
              />
              <ComparisonRow
                label="OA → RA"
                value={strategy.raFormationWith.fromOA}
                color="text-emerald-400"
              />
              <div className="border-t border-white/[0.06] pt-3">
                <ComparisonRow
                  label="Total RA"
                  value={strategy.raFormationWith.totalRA}
                  color="text-white"
                  bold
                />
              </div>
              <ComparisonRow
                label="Remaining SA"
                value={strategy.raFormationWith.excessSA}
                color="text-emerald-400"
                highlight
              />
              <ComparisonRow
                label="Remaining OA"
                value={strategy.raFormationWith.excessOA}
                color="text-blue-400"
              />
            </div>
          </div>
        </div>

        {/* Benefit Summary */}
        <div className="mt-4 rounded-lg bg-violet-500/10 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-violet-300">SA Preserved (earns 4% instead of 2.5%)</p>
              <p className="mt-1 text-xl font-semibold text-violet-400">
                {formatCurrency(strategy.benefitAnalysis.saPreserved)}
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs text-violet-300">Extra earnings over 10 years</p>
              <p className="mt-1 text-xl font-semibold text-emerald-400">
                +{formatCurrency(strategy.benefitAnalysis.interestDifferential)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Implementation Steps */}
      <div className="rounded-xl border border-white/[0.08] bg-[#0a0a0a] p-5">
        <h3 className="mb-4 text-sm font-medium text-slate-300">Implementation Steps</h3>

        <div className="space-y-4">
          <Step
            number={1}
            title="Day before 55th birthday"
            description={`Purchase ${formatCurrency(strategy.shieldingAmount)} of 6-month T-Bills from your SA via CPFIS`}
          />
          <Step
            number={2}
            title="On 55th birthday"
            description="RA is formed from remaining SA + OA (T-Bill funds are not included)"
          />
          <Step
            number={3}
            title="6 months later"
            description="T-Bills mature and funds return to your SA (now earning 4%)"
          />
        </div>

        {/* Warning */}
        <div className="mt-4 flex items-start gap-3 rounded-lg bg-amber-500/5 border border-amber-500/20 p-3">
          <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0 text-amber-400" />
          <p className="text-xs text-slate-300">
            <span className="font-medium text-amber-300">Important: </span>
            This strategy is most effective when your SA + OA exceeds the FRS. Consult the CPF
            website for the latest T-Bill and SGS bond offerings through CPFIS.
          </p>
        </div>
      </div>
    </div>
  )
}

function ComparisonRow({
  label,
  value,
  color,
  bold,
  highlight,
}: {
  label: string
  value: number
  color: string
  bold?: boolean
  highlight?: boolean
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-xs text-slate-400">{label}</span>
      <span
        className={`text-sm ${color} ${bold ? 'font-semibold' : 'font-medium'} ${
          highlight ? 'bg-emerald-500/20 px-2 py-0.5 rounded' : ''
        }`}
      >
        {formatCurrency(value)}
      </span>
    </div>
  )
}

function Step({
  number,
  title,
  description,
}: {
  number: number
  title: string
  description: string
}) {
  return (
    <div className="flex gap-4">
      <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-violet-500/20 text-sm font-semibold text-violet-400">
        {number}
      </div>
      <div>
        <p className="text-sm font-medium text-white">{title}</p>
        <p className="mt-0.5 text-xs text-slate-400">{description}</p>
      </div>
    </div>
  )
}

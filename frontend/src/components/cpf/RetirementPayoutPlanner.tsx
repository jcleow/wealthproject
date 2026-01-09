'use client'

import { useState, useMemo } from 'react'
import { Info, TrendingUp, Shield, ArrowUpRight, Banknote } from 'lucide-react'

import { formatCurrency } from '@/lib/format'
import { EXTERNAL_LINKS } from '@/lib/external-links'
import type { CPFProfile } from '@/types/cpf'

// CPF LIFE payout factors (approximate, per $1000 of RA balance)
// These are estimates and actual rates depend on cohort-specific factors
const PAYOUT_FACTORS = {
  standard: {
    65: { monthly: 5.5, bequestRatio: 0.55 },
    66: { monthly: 5.9, bequestRatio: 0.52 },
    67: { monthly: 6.3, bequestRatio: 0.48 },
    68: { monthly: 6.8, bequestRatio: 0.44 },
    69: { monthly: 7.3, bequestRatio: 0.40 },
    70: { monthly: 7.9, bequestRatio: 0.35 },
  },
  basic: {
    65: { monthly: 5.0, bequestRatio: 0.70 },
    66: { monthly: 5.4, bequestRatio: 0.67 },
    67: { monthly: 5.8, bequestRatio: 0.64 },
    68: { monthly: 6.2, bequestRatio: 0.60 },
    69: { monthly: 6.7, bequestRatio: 0.56 },
    70: { monthly: 7.2, bequestRatio: 0.52 },
  },
  escalating: {
    65: { monthly: 4.4, bequestRatio: 0.58, annualIncrease: 0.02 },
    66: { monthly: 4.7, bequestRatio: 0.55, annualIncrease: 0.02 },
    67: { monthly: 5.0, bequestRatio: 0.52, annualIncrease: 0.02 },
    68: { monthly: 5.4, bequestRatio: 0.48, annualIncrease: 0.02 },
    69: { monthly: 5.8, bequestRatio: 0.44, annualIncrease: 0.02 },
    70: { monthly: 6.3, bequestRatio: 0.40, annualIncrease: 0.02 },
  },
} as const

type PlanType = 'standard' | 'basic' | 'escalating'

const PLAN_INFO = {
  standard: {
    name: 'Standard',
    highlight: 'Highest monthly payout',
    description: 'Level payouts for life with decreasing bequest over time',
    color: 'blue',
  },
  basic: {
    name: 'Basic',
    highlight: 'Highest bequest',
    description: 'Lower payouts but more for your beneficiaries',
    color: 'emerald',
  },
  escalating: {
    name: 'Escalating',
    highlight: 'Inflation protection',
    description: 'Starts lower but increases 2% annually',
    color: 'violet',
  },
}

interface RetirementPayoutPlannerProps {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  profile?: CPFProfile // Reserved for future use (e.g., pre-fill projected RA)
  className?: string
}

export function RetirementPayoutPlanner({ className }: RetirementPayoutPlannerProps) {
  const [raBalance, setRaBalance] = useState<number>(0)
  const [payoutStartAge, setPayoutStartAge] = useState<number>(65)
  const [selectedPlan, setSelectedPlan] = useState<PlanType>('standard')

  const hasEnteredBalance = raBalance > 0

  // Calculate payouts for all plans
  const payouts = useMemo(() => {
    if (!hasEnteredBalance) return null

    const result: Record<PlanType, { monthly: number; bequest: number; annualIncrease?: number }> = {
      standard: { monthly: 0, bequest: 0 },
      basic: { monthly: 0, bequest: 0 },
      escalating: { monthly: 0, bequest: 0 },
    }

    for (const plan of ['standard', 'basic', 'escalating'] as const) {
      const factors = PAYOUT_FACTORS[plan][payoutStartAge as keyof typeof PAYOUT_FACTORS.standard]
      const monthly = (raBalance / 1000) * factors.monthly
      const bequest = raBalance * factors.bequestRatio
      result[plan] = {
        monthly,
        bequest,
        annualIncrease: 'annualIncrease' in factors ? factors.annualIncrease : undefined,
      }
    }

    return result
  }, [raBalance, payoutStartAge, hasEnteredBalance])

  // Generate projection table data
  const projectionData = useMemo(() => {
    if (!payouts) return []

    const data: { age: number; monthly: number; annual: number; cumulative: number }[] = []
    let cumulative = 0
    const basePayout = payouts[selectedPlan]

    for (let age = payoutStartAge; age <= 90; age++) {
      const yearsFromStart = age - payoutStartAge
      let monthly = basePayout.monthly

      // For escalating plan, increase by 2% each year
      if (selectedPlan === 'escalating' && basePayout.annualIncrease) {
        monthly = basePayout.monthly * Math.pow(1 + basePayout.annualIncrease, yearsFromStart)
      }

      const annual = monthly * 12
      cumulative += annual

      data.push({
        age,
        monthly,
        annual,
        cumulative,
      })
    }

    return data
  }, [payouts, selectedPlan, payoutStartAge])

  const handleBalanceChange = (value: string) => {
    const numValue = parseInt(value.replace(/[^0-9]/g, ''), 10)
    if (!isNaN(numValue)) {
      setRaBalance(Math.min(numValue, 1000000))
    } else {
      setRaBalance(0)
    }
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Input Section */}
      <div className="rounded-xl border border-white/[0.08] bg-[#0a0a0a] p-5">
        <h3 className={`flex items-center
mb-4 gap-2
text-sm font-medium text-white`}>
          <Banknote className="h-4 w-4 text-emerald-400" />
          CPF LIFE Payout Estimator
        </h3>

        <div className="grid gap-6 md:grid-cols-2">
          {/* RA Balance Input */}
          <div>
            <label className="mb-2 block text-xs font-medium text-slate-400">
              Retirement Account (RA) Balance
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">$</span>
              <input
                type="text"
                value={raBalance > 0 ? raBalance.toLocaleString() : ''}
                onChange={(e) => handleBalanceChange(e.target.value)}
                placeholder="Enter your RA balance"
                className={`w-full
py-2.5 pl-7 pr-3 placeholder-slate-500
rounded-lg border border-white/[0.08] focus:border-blue-500/50 focus:outline-none focus:ring-1 focus:ring-blue-500/50
bg-white/[0.02]
text-white
transition`}
              />
            </div>
            <input
              type="range"
              min={0}
              max={500000}
              step={1000}
              value={raBalance}
              onChange={(e) => setRaBalance(parseInt(e.target.value, 10))}
              className="mt-3 w-full accent-blue-500"
            />
            <div className="mt-1 flex justify-between text-xs text-slate-500">
              <span>$0</span>
              <span>$500,000</span>
            </div>
          </div>

          {/* Payout Start Age */}
          <div>
            <label className="mb-2 block text-xs font-medium text-slate-400">
              Payout Start Age
            </label>
            <div className="flex items-center gap-3">
              <span className="text-2xl font-semibold text-white">{payoutStartAge}</span>
              <span className="text-sm text-slate-400">years old</span>
            </div>
            <input
              type="range"
              min={65}
              max={70}
              step={1}
              value={payoutStartAge}
              onChange={(e) => setPayoutStartAge(parseInt(e.target.value, 10))}
              className="mt-3 w-full accent-blue-500"
            />
            <div className="mt-1 flex justify-between text-xs text-slate-500">
              <span>65</span>
              <span>70</span>
            </div>
            {payoutStartAge > 65 && (
              <p className="mt-2 flex items-center gap-1 text-xs text-emerald-400">
                <ArrowUpRight className="h-3 w-3" />
                Delaying increases your monthly payout
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Plan Comparison Cards */}
      {hasEnteredBalance && payouts && (
        <div className="grid gap-4 md:grid-cols-3">
          {(['standard', 'basic', 'escalating'] as const).map((plan) => {
            const info = PLAN_INFO[plan]
            const payout = payouts[plan]
            const isSelected = selectedPlan === plan
            const colorMap = {
              blue: {
                bg: 'bg-blue-500/10',
                border: 'border-blue-500/30',
                text: 'text-blue-400',
                highlight: 'bg-blue-500/20 text-blue-300',
              },
              emerald: {
                bg: 'bg-emerald-500/10',
                border: 'border-emerald-500/30',
                text: 'text-emerald-400',
                highlight: 'bg-emerald-500/20 text-emerald-300',
              },
              violet: {
                bg: 'bg-violet-500/10',
                border: 'border-violet-500/30',
                text: 'text-violet-400',
                highlight: 'bg-violet-500/20 text-violet-300',
              },
            } as const
            const colorClasses = colorMap[info.color as keyof typeof colorMap]

            return (
              <button
                key={plan}
                onClick={() => setSelectedPlan(plan)}
                className={`rounded-xl border p-4 text-left transition ${
                  isSelected
                    ? `${colorClasses.border} ${colorClasses.bg}`
                    : 'border-white/[0.08] bg-[#0a0a0a] hover:border-white/[0.12] hover:bg-white/[0.02]'
                }`}
              >
                <div className="flex items-center justify-between">
                  <h4 className="font-medium text-white">{info.name}</h4>
                  <span className={`rounded-full px-2 py-0.5 text-xs ${colorClasses.highlight}`}>
                    {info.highlight}
                  </span>
                </div>

                <div className="mt-3">
                  <p className="text-xs text-slate-400">Monthly Payout</p>
                  <p className={`text-xl font-semibold ${colorClasses.text}`}>
                    {formatCurrency(payout.monthly)}
                    {plan === 'escalating' && (
                      <span className="ml-1 text-xs font-normal text-slate-400">+2%/yr</span>
                    )}
                  </p>
                </div>

                <div className="mt-3">
                  <p className="text-xs text-slate-400">Estimated Bequest</p>
                  <p className="text-sm text-slate-300">{formatCurrency(payout.bequest)}</p>
                </div>

                <p className="mt-3 text-xs text-slate-500">{info.description}</p>
              </button>
            )
          })}
        </div>
      )}

      {/* Payout Projection Table */}
      {hasEnteredBalance && projectionData.length > 0 && (
        <div className="rounded-xl border border-white/[0.08] bg-[#0a0a0a] p-5">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="flex items-center gap-2 text-sm font-medium text-white">
              <TrendingUp className="h-4 w-4 text-blue-400" />
              Payout Projection - {PLAN_INFO[selectedPlan].name} Plan
            </h3>
            <div className="flex gap-1">
              {(['standard', 'basic', 'escalating'] as const).map((plan) => (
                <button
                  key={plan}
                  onClick={() => setSelectedPlan(plan)}
                  className={`rounded-lg px-2 py-1 text-xs transition ${
                    selectedPlan === plan
                      ? 'bg-white/[0.1] text-white'
                      : 'text-slate-400 hover:bg-white/[0.05] hover:text-white'
                  }`}
                >
                  {PLAN_INFO[plan].name}
                </button>
              ))}
            </div>
          </div>

          <div className={`overflow-y-auto
max-h-80
rounded-lg border border-white/[0.04]`}>
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-[#0a0a0a]">
                <tr className="border-b border-white/[0.06]">
                  <th className="px-4 py-2 text-left text-xs font-medium text-slate-400">Age</th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-slate-400">Monthly</th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-slate-400">Annual</th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-slate-400">Cumulative</th>
                </tr>
              </thead>
              <tbody>
                {projectionData.map((row, index) => (
                  <tr
                    key={row.age}
                    className={`border-b border-white/[0.04] ${
                      index % 5 === 0 ? 'bg-white/[0.02]' : ''
                    }`}
                  >
                    <td className="px-4 py-2 text-white">{row.age}</td>
                    <td className="px-4 py-2 text-right text-slate-300">
                      {formatCurrency(row.monthly)}
                    </td>
                    <td className="px-4 py-2 text-right text-slate-300">
                      {formatCurrency(row.annual)}
                    </td>
                    <td className="px-4 py-2 text-right text-emerald-400">
                      {formatCurrency(row.cumulative)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Empty State */}
      {!hasEnteredBalance && (
        <div className={`p-8
rounded-xl border border-dashed border-white/[0.1]
bg-white/[0.02]
text-center`}>
          <Shield className="mx-auto h-10 w-10 text-slate-500" />
          <p className="mt-3 text-sm text-slate-400">
            Enter your Retirement Account balance to see estimated CPF LIFE payouts
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Your RA is created at age 55 when your SA and OA are transferred
          </p>
        </div>
      )}

      {/* Disclaimer */}
      <div className="flex items-start gap-3 rounded-lg bg-amber-500/5 p-4">
        <Info className="mt-0.5 h-4 w-4 flex-shrink-0 text-amber-400" />
        <div className="text-xs text-slate-300">
          <p className="font-medium text-amber-300">Important Disclaimer</p>
          <p className="mt-1">
            These are estimates based on approximate CPF LIFE payout factors. Actual payouts depend
            on cohort-specific rates at time of enrollment, prevailing interest rates, and CPF
            Board policies. For accurate figures, use the{' '}
            <a
              href={EXTERNAL_LINKS.cpf.cpfLifeEstimator.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-amber-400 underline hover:no-underline"
            >
              official CPF LIFE Estimator
            </a>
            .
          </p>
        </div>
      </div>
    </div>
  )
}

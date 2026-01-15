import { Info } from 'lucide-react'
import { formatCurrency } from '@/lib/format'
import { CPF_CONSTANTS, CPF_POLICY_YEAR } from '@/lib/cpf-constants'
import type { CPFProjectionYear } from '@/types/cpf'
import type { PayoutPlan } from './types'
import { ACCOUNT_COLORS, THRESHOLD_COLORS } from './types'

interface BalanceAtAgeCardProps {
  displayAge: number
  projection: CPFProjectionYear[]
  currentAge?: number
  currentBalances?: { oa: number; sa: number; ma: number; ra: number }
}

export function BalanceAtAgeCard({
  displayAge,
  projection,
  currentAge,
  currentBalances,
}: BalanceAtAgeCardProps) {
  const isCurrentAge = currentAge !== undefined && displayAge === currentAge
  const selectedData = projection.find((p) => p.age === displayAge)

  const balances =
    isCurrentAge && currentBalances
      ? currentBalances
      : selectedData
        ? { oa: selectedData.oa, sa: selectedData.sa, ma: selectedData.ma, ra: selectedData.ra }
        : { oa: 0, sa: 0, ma: 0, ra: 0 }

  const total = balances.oa + balances.sa + balances.ma + balances.ra
  const year = selectedData?.year ?? new Date().getFullYear()

  const accounts = [
    { label: 'OA', value: balances.oa, color: ACCOUNT_COLORS.oa, show: true },
    { label: 'SA', value: balances.sa, color: ACCOUNT_COLORS.sa, show: displayAge <= 55 },
    { label: 'MA', value: balances.ma, color: ACCOUNT_COLORS.ma, show: true },
    { label: 'RA', value: balances.ra, color: ACCOUNT_COLORS.ra, show: displayAge >= 55 },
  ].filter((acc) => acc.show)

  return (
    <div className="rounded-xl border border-white/[0.08] bg-[#0a0a0a] p-4">
      <div className="flex items-center justify-between mb-1">
        <p className="text-xs text-slate-400">Total CPF Balance at Age {displayAge}</p>
        <p className="text-xs text-slate-500">{year}</p>
      </div>
      <p className="text-xl font-semibold text-white">{formatCurrency(total)}</p>

      <div className="mt-3 grid grid-cols-2 gap-x-3 gap-y-1">
        {accounts.map((acc) => (
          <div key={acc.label} className="flex items-center justify-between text-xs">
            <span className="flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: acc.color }} />
              <span className="text-slate-500">{acc.label}</span>
            </span>
            <span className="font-mono tabular-nums text-slate-400">{formatCurrency(acc.value)}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

interface CPFLifePayoutCardProps {
  estimates: { standard: number; basic: number; escalating: number }
  payoutStartAge: number
  selectedPlan: PayoutPlan
}

export function CPFLifePayoutCard({ estimates, payoutStartAge, selectedPlan }: CPFLifePayoutCardProps) {
  const amount = estimates[selectedPlan]
  const planLabel = selectedPlan.charAt(0).toUpperCase() + selectedPlan.slice(1)

  return (
    <div className="rounded-xl border border-white/[0.08] bg-[#0a0a0a] p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1">
          <p className="text-xs text-slate-400">Est. CPF LIFE Payout</p>
          <div className="group relative">
            <Info className="h-3.5 w-3.5 text-slate-500 cursor-help" />
            <div className="absolute bottom-full left-0 mb-2 hidden group-hover:block z-50">
              <div className="rounded-xl bg-[#1a1a2e] border border-white/10 px-4 py-3 text-sm text-slate-300 shadow-xl min-w-[280px]">
                <p className="font-semibold text-slate-100 mb-2">Disclaimer</p>
                <p className="leading-relaxed">
                  These are our own estimates based on current CPF rules. Please check the official CPF
                  website for accurate projections.
                </p>
              </div>
            </div>
          </div>
        </div>
        <p className="text-xs text-slate-500">Starting at age {payoutStartAge}</p>
      </div>
      <p className="mt-1 text-xl font-semibold text-white">{formatCurrency(amount)}/mo</p>

      <div className="mt-3 flex items-center gap-2">
        <span className="rounded-full bg-purple-500/20 px-2 py-0.5 text-[10px] font-medium text-purple-300">
          {planLabel} Plan
        </span>
        {selectedPlan === 'escalating' && <span className="text-[10px] text-slate-500">+2%/yr</span>}
      </div>
    </div>
  )
}

export function RetirementTargetsCard() {
  const targets = [
    { label: 'BRS', value: CPF_CONSTANTS.BRS, color: THRESHOLD_COLORS.brs },
    { label: 'FRS', value: CPF_CONSTANTS.FRS, color: THRESHOLD_COLORS.frs },
    { label: 'ERS', value: CPF_CONSTANTS.ERS, color: THRESHOLD_COLORS.ers },
    { label: 'BHS', value: CPF_CONSTANTS.BHS, color: THRESHOLD_COLORS.bhs },
  ]

  return (
    <div className="rounded-xl border border-white/[0.08] bg-[#0a0a0a] p-4">
      <p className="text-xs text-slate-400">{CPF_POLICY_YEAR} Retirement Targets</p>
      <div className="mt-3 space-y-2">
        {targets.map((target) => (
          <div key={target.label} className="flex items-center justify-between text-xs">
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full" style={{ backgroundColor: target.color }} />
              <span className="text-slate-400">{target.label}</span>
            </span>
            <span className="font-mono tabular-nums text-slate-300">{formatCurrency(target.value)}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

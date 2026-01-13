'use client'

import { formatCurrency } from '@/lib/format'
import type { PlanType, Payouts } from '../types'

interface SummaryFooterProps {
  raBalance: number
  selectedPlan: PlanType
  payouts: Payouts
  isLoading: boolean
}

export function SummaryFooter({ raBalance, selectedPlan, payouts, isLoading }: SummaryFooterProps) {
  return (
    <div className={`flex items-center justify-between
mt-3 px-4 py-3
rounded-xl border border-white/[0.06]
bg-white/[0.02]
text-sm`}>
      <div className="flex gap-6">
        <div>
          <span className="text-slate-400">RA Balance: </span>
          <span className="font-medium text-purple-400">{formatCurrency(raBalance)}</span>
        </div>
        <div>
          <span className="text-slate-400">Monthly ({selectedPlan}): </span>
          <span className="font-medium text-emerald-400">
            {isLoading ? '...' : formatCurrency(payouts[selectedPlan])}
          </span>
        </div>
        <div>
          <span className="text-slate-400">Yearly: </span>
          <span className="font-medium text-emerald-400">
            {isLoading ? '...' : formatCurrency(payouts[selectedPlan] * 12)}
          </span>
        </div>
      </div>
      <div className="text-xs text-slate-500">
        Click a plan to compare
      </div>
    </div>
  )
}

'use client'

import { formatCurrency } from '@/lib/format'

interface PersonCPFUsageCardProps {
  personName: string
  downpaymentCpfOa: number
  monthlyCpfOa: number
  holdingMonths: number
  totalCpfUsed: number
  accruedInterest: number
}

export function PersonCPFUsageCard({
  personName,
  downpaymentCpfOa,
  monthlyCpfOa,
  holdingMonths,
  totalCpfUsed,
  accruedInterest,
}: PersonCPFUsageCardProps) {
  const monthlyTotal = monthlyCpfOa * holdingMonths
  const mustRefund = totalCpfUsed + accruedInterest

  return (
    <div className="rounded-xl border border-white/[0.06] p-4">
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center">
          <span className="text-base">👤</span>
        </div>
        <h4 className="text-base font-medium text-white">{personName}</h4>
      </div>

      {/* Down Payment Section */}
      <div className="mb-4">
        <p className="text-sm font-medium uppercase tracking-wide text-gray-500 mb-2">Down Payment</p>
        <div className="flex justify-between text-sm">
          <span className="text-gray-400">CPF OA</span>
          <span className="text-white font-mono tabular-nums">{formatCurrency(downpaymentCpfOa)}</span>
        </div>
      </div>

      {/* Monthly Payments Section */}
      <div className="mb-4">
        <p className="text-sm font-medium uppercase tracking-wide text-gray-500 mb-2">
          Monthly ({holdingMonths} mo)
        </p>
        <div className="space-y-1.5">
          <div className="flex justify-between text-sm">
            <span className="text-gray-400">CPF OA</span>
            <span className="text-gray-300 font-mono tabular-nums">{formatCurrency(monthlyCpfOa)}/mo</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-400">Total</span>
            <span className="text-white font-mono tabular-nums">{formatCurrency(monthlyTotal)}</span>
          </div>
        </div>
      </div>

      {/* Divider */}
      <div className="border-t border-white/[0.06] my-3" />

      {/* Totals */}
      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-gray-300">Total CPF Used</span>
          <span className="text-white font-semibold font-mono tabular-nums">{formatCurrency(totalCpfUsed)}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-amber-400">+ Accrued Interest</span>
          <span className="text-amber-400 font-mono tabular-nums">{formatCurrency(accruedInterest)}</span>
        </div>
      </div>

      {/* Must Refund */}
      <div className="mt-4 pt-3 border-t border-white/[0.06]">
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-400">Must Refund</span>
          <span className="text-xl font-semibold text-white font-mono tabular-nums">
            {formatCurrency(mustRefund)}
          </span>
        </div>
      </div>
    </div>
  )
}

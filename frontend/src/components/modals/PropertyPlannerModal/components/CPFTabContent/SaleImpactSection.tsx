'use client'

import { ArrowRight } from 'lucide-react'
import { formatCurrency } from '@/lib/format'
import { cn } from '@/lib/utils'

interface BorrowerRefund {
  name: string
  principal: number
  interest: number
  total: number
}

interface SaleImpactSectionProps {
  expectedSaleDate?: string
  expectedSalePrice: number
  outstandingLoan: number
  sellingCosts: number
  cpfPrincipal: number
  cpfAccruedInterest: number
  netCashProceeds: number
  borrowerRefunds: BorrowerRefund[]
}

export function SaleImpactSection({
  expectedSaleDate,
  expectedSalePrice,
  outstandingLoan,
  sellingCosts,
  cpfPrincipal,
  cpfAccruedInterest,
  netCashProceeds,
  borrowerRefunds,
}: SaleImpactSectionProps) {
  const totalCpfRefund = cpfPrincipal + cpfAccruedInterest

  // Format date for display
  const formattedDate = expectedSaleDate
    ? new Date(expectedSaleDate).toLocaleDateString('en-SG', { month: 'short', year: 'numeric' })
    : 'Not set'

  return (
    <div className="rounded-xl border border-white/[0.06] p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h4 className="text-base font-medium text-gray-200">Upon Sale</h4>
        <div className="text-right">
          <p className="text-sm text-gray-500">Expected</p>
          <p className="text-sm font-medium text-gray-300">{formattedDate}</p>
        </div>
      </div>

      {/* Sale Price */}
      <div className="flex justify-between items-baseline mb-4">
        <p className="text-sm font-medium text-gray-400">Expected Sale Price</p>
        <p className="text-xl font-semibold text-white font-mono tabular-nums">
          {formatCurrency(expectedSalePrice)}
        </p>
      </div>

      {/* Proceeds Breakdown */}
      <div className="space-y-3 mb-4">
        <p className="text-sm font-medium text-gray-400 uppercase tracking-wide">Deductions</p>

        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-gray-400">Less: Outstanding Loan</span>
            <span className="text-gray-300 font-mono tabular-nums">({formatCurrency(outstandingLoan)})</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-400">Less: Selling Costs (~2%)</span>
            <span className="text-gray-300 font-mono tabular-nums">({formatCurrency(sellingCosts)})</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-400">Less: CPF Refund</span>
            <span className="text-gray-300 font-mono tabular-nums">({formatCurrency(totalCpfRefund)})</span>
          </div>
          <div className="pl-4 space-y-1.5 text-sm italic">
            <div className="flex justify-between">
              <span className="text-gray-500">├─ Principal</span>
              <span className="text-gray-300 font-mono tabular-nums">{formatCurrency(cpfPrincipal)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">└─ Interest</span>
              <span className="text-amber-400 font-mono tabular-nums">{formatCurrency(cpfAccruedInterest)}</span>
            </div>
          </div>
        </div>

        {/* Net Cash Proceeds */}
        <div className="flex justify-between items-center pt-3 mt-2 border-t border-white/[0.06]">
          <span className="text-sm font-medium text-gray-300">Net Cash Proceeds</span>
          <span className={cn(
            "text-xl font-semibold font-mono tabular-nums",
            netCashProceeds >= 0 ? "text-emerald-400" : "text-rose-400"
          )}>
            {netCashProceeds >= 0
              ? formatCurrency(netCashProceeds)
              : `(${formatCurrency(Math.abs(netCashProceeds))})`
            }
          </span>
        </div>
      </div>

      {/* CPF Refund Destinations */}
      {borrowerRefunds.length > 0 && (
        <div className="pt-4 border-t border-white/[0.06]">
          <p className="text-sm font-medium text-gray-400 uppercase tracking-wide mb-3">CPF Refund Destinations</p>

          <div className="rounded-lg border border-white/[0.06] p-3 space-y-2">
            {borrowerRefunds.map((refund, index) => (
              <div key={index} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <span className="text-gray-300">{refund.name}&apos;s OA</span>
                  <ArrowRight className="h-4 w-4 text-gray-500" />
                </div>
                <span className="text-emerald-400 font-medium font-mono tabular-nums">
                  {formatCurrency(refund.total)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Warning for negative proceeds */}
      {netCashProceeds < 0 && (
        <div className="flex items-start gap-3 p-3 mt-4 rounded-lg border border-rose-500/20 bg-rose-500/10">
          <span className="text-rose-400 text-base">⚠️</span>
          <p className="text-sm text-rose-300">
            Your sale proceeds are insufficient to cover the CPF refund. You will need
            to top up <strong>{formatCurrency(Math.abs(netCashProceeds))}</strong> in cash.
          </p>
        </div>
      )}
    </div>
  )
}

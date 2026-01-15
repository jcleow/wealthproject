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
    <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h4 className="text-sm font-medium text-slate-300">Upon Sale</h4>
        <div className="text-right">
          <p className="text-[10px] text-slate-500">Expected</p>
          <p className="text-xs font-medium text-slate-400">{formattedDate}</p>
        </div>
      </div>

      {/* Sale Price */}
      <div className="mb-4">
        <p className="text-[10px] text-slate-500 mb-1">Expected Sale Price</p>
        <p className="text-xl font-semibold text-white font-mono tabular-nums">
          {formatCurrency(expectedSalePrice)}
        </p>
      </div>

      {/* Proceeds Breakdown */}
      <div className="space-y-2 mb-4">
        <p className="text-[10px] uppercase tracking-wide text-slate-500">Proceeds Breakdown</p>

        <div className="space-y-1.5">
          <div className="flex justify-between text-xs">
            <span className="text-slate-400">Expected Sale Price</span>
            <span className="text-white font-mono tabular-nums">{formatCurrency(expectedSalePrice)}</span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-slate-400">Less: Outstanding Loan</span>
            <span className="text-slate-300 font-mono tabular-nums">({formatCurrency(outstandingLoan)})</span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-slate-400">Less: Selling Costs (~2%)</span>
            <span className="text-slate-300 font-mono tabular-nums">({formatCurrency(sellingCosts)})</span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-slate-400">Less: CPF Refund</span>
            <span className="text-slate-300 font-mono tabular-nums">({formatCurrency(totalCpfRefund)})</span>
          </div>
          <div className="pl-4 space-y-1 text-[10px]">
            <div className="flex justify-between">
              <span className="text-slate-500">├─ Principal</span>
              <span className="text-slate-400 font-mono tabular-nums">{formatCurrency(cpfPrincipal)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">└─ Interest</span>
              <span className="text-amber-400/70 font-mono tabular-nums">{formatCurrency(cpfAccruedInterest)}</span>
            </div>
          </div>
        </div>

        {/* Net Cash Proceeds */}
        <div className="flex justify-between items-center pt-3 mt-2 border-t border-white/[0.06]">
          <span className="text-xs font-medium text-slate-300">Net Cash Proceeds</span>
          <span className={cn(
            "text-lg font-semibold font-mono tabular-nums",
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
          <p className="text-[10px] uppercase tracking-wide text-slate-500 mb-3">CPF Refund Destinations</p>

          <div className="rounded-lg bg-blue-500/5 border border-blue-500/10 p-3 space-y-2">
            {borrowerRefunds.map((refund, index) => (
              <div key={index} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="text-slate-400">{refund.name}&apos;s OA</span>
                  <ArrowRight className="h-3 w-3 text-slate-600" />
                </div>
                <span className="text-blue-400 font-medium font-mono tabular-nums">
                  {formatCurrency(refund.total)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Warning for negative proceeds */}
      {netCashProceeds < 0 && (
        <div className="flex items-start gap-3 p-3 mt-4 rounded-lg border border-rose-500/20 bg-rose-500/5">
          <span className="text-rose-400 text-sm">⚠️</span>
          <p className="text-xs text-rose-300">
            Your sale proceeds are insufficient to cover the CPF refund. You will need
            to top up <strong>{formatCurrency(Math.abs(netCashProceeds))}</strong> in cash.
          </p>
        </div>
      )}
    </div>
  )
}

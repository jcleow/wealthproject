'use client'

import { cn } from '@/lib/utils'
import { formatCurrency } from '@/lib/format'
import type { PropertySGGrant } from '@/types/propertyPlannerV2'

interface BorrowerData {
  name: string
  downpaymentCpfOa: number
  monthlyCpfOa: number
  totalCpfUsed: number
  accruedInterest: number
}

interface CPFUsageByPersonTableProps {
  borrower1: BorrowerData
  borrower2?: BorrowerData | null
  holdingMonths: number
  grants?: PropertySGGrant[]
}

/**
 * CPFUsageByPersonTable - Reusable tabular display of CPF usage by person
 * Used in both PropertyCPFDetail and CPFTabContent for consistency
 */
export function CPFUsageByPersonTable({
  borrower1,
  borrower2,
  holdingMonths,
  grants = [],
}: CPFUsageByPersonTableProps) {
  const hasSecondBorrower = !!borrower2
  const gridCols = hasSecondBorrower ? 'grid-cols-[1fr_120px_120px]' : 'grid-cols-[1fr_120px]'

  // Calculate total grants
  const totalGrants = grants.reduce((sum, g) => sum + parseFloat(g.amount || '0'), 0)

  return (
    <div className="rounded-xl border border-white/[0.06] overflow-hidden">
      {/* Table Header - Names */}
      <div className={cn('grid', gridCols)}>
        <div className="p-3" /> {/* Empty label cell */}
        <div className="p-3 text-center">
          <span className="text-sm font-medium text-white">{borrower1.name}</span>
        </div>
        {hasSecondBorrower && (
          <div className="p-3 text-center">
            <span className="text-sm font-medium text-white">{borrower2.name}</span>
          </div>
        )}
      </div>

      {/* Down Payment Section */}
      <div>
        <div className={cn('grid', gridCols)}>
          <div className="p-3">
            <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Down Payment</p>
          </div>
          <div />
          {hasSecondBorrower && <div />}
        </div>
        <div className={cn('grid', gridCols)}>
          <div className="px-3 pb-3">
            <span className="text-sm text-gray-400 pl-3">CPF OA</span>
          </div>
          <div className="px-3 pb-3 text-right">
            <span className="text-sm text-white font-mono tabular-nums">
              {formatCurrency(borrower1.downpaymentCpfOa)}
            </span>
          </div>
          {hasSecondBorrower && (
            <div className="px-3 pb-3 text-right">
              <span className="text-sm text-white font-mono tabular-nums">
                {formatCurrency(borrower2.downpaymentCpfOa)}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Monthly Section */}
      <div>
        <div className={cn('grid', gridCols)}>
          <div className="p-3">
            <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
              Monthly ({holdingMonths} mo)
            </p>
          </div>
          <div />
          {hasSecondBorrower && <div />}
        </div>
        <div className={cn('grid', gridCols)}>
          <div className="px-3 pb-2">
            <span className="text-sm text-gray-400 pl-3">CPF OA</span>
          </div>
          <div className="px-3 pb-2 text-right">
            <span className="text-sm text-gray-300 font-mono tabular-nums">
              {formatCurrency(borrower1.monthlyCpfOa)}/mo
            </span>
          </div>
          {hasSecondBorrower && (
            <div className="px-3 pb-2 text-right">
              <span className="text-sm text-gray-300 font-mono tabular-nums">
                {formatCurrency(borrower2.monthlyCpfOa)}/mo
              </span>
            </div>
          )}
        </div>
        <div className={cn('grid', gridCols)}>
          <div className="px-3 pb-3">
            <span className="text-sm text-gray-400 pl-3">Total</span>
          </div>
          <div className="px-3 pb-3 text-right">
            <span className="text-sm text-white font-mono tabular-nums">
              {formatCurrency(borrower1.monthlyCpfOa * holdingMonths)}
            </span>
          </div>
          {hasSecondBorrower && (
            <div className="px-3 pb-3 text-right">
              <span className="text-sm text-white font-mono tabular-nums">
                {formatCurrency(borrower2.monthlyCpfOa * holdingMonths)}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Totals Section */}
      <div>
        <div className={cn('grid', gridCols)}>
          <div className="p-3">
            <span className="text-sm text-gray-300">Total CPF Used</span>
          </div>
          <div className="p-3 text-right">
            <span className="text-sm text-white font-semibold font-mono tabular-nums">
              {formatCurrency(borrower1.totalCpfUsed)}
            </span>
          </div>
          {hasSecondBorrower && (
            <div className="p-3 text-right">
              <span className="text-sm text-white font-semibold font-mono tabular-nums">
                {formatCurrency(borrower2.totalCpfUsed)}
              </span>
            </div>
          )}
        </div>
        <div className={cn('grid', gridCols)}>
          <div className="px-3 pb-3">
            <span className="text-sm text-amber-400">+ Accrued Interest</span>
          </div>
          <div className="px-3 pb-3 text-right">
            <span className="text-sm text-amber-400 font-mono tabular-nums">
              {formatCurrency(borrower1.accruedInterest)}
            </span>
          </div>
          {hasSecondBorrower && (
            <div className="px-3 pb-3 text-right">
              <span className="text-sm text-amber-400 font-mono tabular-nums">
                {formatCurrency(borrower2.accruedInterest)}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Refund upon sale Row */}
      <div className={cn('grid', gridCols)}>
        <div className="p-3">
          <span className="text-xs text-gray-400">Refund upon sale</span>
        </div>
        <div className="p-3 text-right">
          <span className="text-sm font-semibold text-white font-mono tabular-nums">
            {formatCurrency(borrower1.totalCpfUsed + borrower1.accruedInterest)}
          </span>
        </div>
        {hasSecondBorrower && (
          <div className="p-3 text-right">
            <span className="text-sm font-semibold text-white font-mono tabular-nums">
              {formatCurrency(borrower2.totalCpfUsed + borrower2.accruedInterest)}
            </span>
          </div>
        )}
      </div>

      {/* Housing Grants Section - Property level, not per person */}
      {totalGrants > 0 && (
        <div className="border-t border-white/[0.06]">
          <div className={cn('grid', gridCols)}>
            <div className="p-3">
              <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                Housing Grants
              </p>
            </div>
            <div className={cn('p-3 text-right', hasSecondBorrower && 'col-span-2')}>
              <span className="text-xs text-gray-500">(property level)</span>
            </div>
          </div>
          {grants.map((grant) => (
            <div key={grant.id} className={cn('grid', gridCols)}>
              <div className="px-3 pb-2">
                <span className="text-sm text-emerald-400 pl-3">{grant.name}</span>
              </div>
              <div className={cn('px-3 pb-2 text-right', hasSecondBorrower && 'col-span-2')}>
                <span className="text-sm text-emerald-400 font-mono tabular-nums">
                  {formatCurrency(parseFloat(grant.amount || '0'))}
                </span>
              </div>
            </div>
          ))}
          {grants.length > 1 && (
            <div className={cn('grid', gridCols)}>
              <div className="px-3 pb-3">
                <span className="text-sm text-gray-300 pl-3">Total Grants</span>
              </div>
              <div className={cn('px-3 pb-3 text-right', hasSecondBorrower && 'col-span-2')}>
                <span className="text-sm font-semibold text-emerald-400 font-mono tabular-nums">
                  {formatCurrency(totalGrants)}
                </span>
              </div>
            </div>
          )}
          <div className={cn('grid', gridCols)}>
            <div className="px-3 pb-3">
              <span className="text-xs text-gray-500 pl-3 italic">No accrued interest</span>
            </div>
            <div />
            {hasSecondBorrower && <div />}
          </div>
        </div>
      )}
    </div>
  )
}

'use client'

import { useMemo } from 'react'
import { Edit3 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatCurrency } from '@/lib/format'
import type { PropertyScenarioFull } from '@/types/propertyPlannerV2'
import type { CPFAccount } from '@/types/cpf'

interface PropertyCPFDetailProps {
  scenario: PropertyScenarioFull
  cpfAccounts: CPFAccount[]
  onEditInPropertyPlanner?: () => void
}

export function PropertyCPFDetail({
  scenario,
  cpfAccounts,
  onEditInPropertyPlanner,
}: PropertyCPFDetailProps) {
  const sg = scenario.propertySG
  if (!sg) {
    return (
      <div className="flex items-center justify-center h-full rounded-xl border border-gray-700 bg-gray-900/60">
        <p className="text-sm text-gray-400">No property details available.</p>
      </div>
    )
  }

  // Build CPF account lookup map
  const accountMap = useMemo(
    () => new Map(cpfAccounts.map(a => [a.id, a])),
    [cpfAccounts]
  )

  // Calculate holding period
  const purchaseDate = sg.btoKeyCollectionDate || scenario.scenario.createdAt
  const holdingMonths = useMemo(() => {
    const start = new Date(purchaseDate)
    const end = sg.saleExpectedDate ? new Date(sg.saleExpectedDate) : new Date()
    const months = (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth())
    return Math.max(months, 1)
  }, [purchaseDate, sg.saleExpectedDate])

  const holdingYears = Math.ceil(holdingMonths / 12)

  // Calculate per-borrower CPF usage
  const borrower1 = useMemo(() => {
    if (!sg.borrower1CpfAccountId) return null
    const account = accountMap.get(sg.borrower1CpfAccountId)
    const downpayment = parseFloat(sg.borrower1DownpaymentCpfOa || '0')
    const monthly = parseFloat(sg.borrower1MonthlyCpfOa || '0')
    const total = downpayment + (monthly * holdingMonths)
    const interest = total * 0.025 * (holdingMonths / 12)
    return {
      name: account?.personName || 'Borrower 1',
      downpaymentCpfOa: downpayment,
      monthlyCpfOa: monthly,
      totalCpfUsed: total,
      accruedInterest: interest,
    }
  }, [sg, accountMap, holdingMonths])

  const borrower2 = useMemo(() => {
    if (sg.borrowerType !== 'joint' || !sg.borrower2CpfAccountId) return null
    const account = accountMap.get(sg.borrower2CpfAccountId)
    const downpayment = parseFloat(sg.borrower2DownpaymentCpfOa || '0')
    const monthly = parseFloat(sg.borrower2MonthlyCpfOa || '0')
    const total = downpayment + (monthly * holdingMonths)
    const interest = total * 0.025 * (holdingMonths / 12)
    return {
      name: account?.personName || 'Borrower 2',
      downpaymentCpfOa: downpayment,
      monthlyCpfOa: monthly,
      totalCpfUsed: total,
      accruedInterest: interest,
    }
  }, [sg, accountMap, holdingMonths])

  return (
    <div className="rounded-xl border border-white/[0.06] overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-white/[0.06]">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-medium text-white">{sg.name}</h3>
              <button
                type="button"
                onClick={onEditInPropertyPlanner}
                className="p-1 rounded text-gray-500 hover:text-white transition"
              >
                <Edit3 className="h-3 w-3" />
              </button>
            </div>
            <p className="text-xs text-gray-400 mt-0.5">
              {formatCurrency(parseFloat(sg.propertyPrice))} • {holdingYears} year holding
            </p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 space-y-6">
        {/* Per-Person CPF Usage - Tabular Layout */}
        {borrower1 && (
          <div>
            <h4 className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-2">CPF Usage by Person</h4>

            <div className="rounded-xl border border-white/[0.06] overflow-hidden">
              {/* Table Header - Names */}
              <div className={cn(
                "grid",
                borrower2 ? "grid-cols-[1fr_120px_120px]" : "grid-cols-[1fr_120px]"
              )}>
                <div className="p-3" /> {/* Empty label cell */}
                <div className="p-3 text-center">
                  <span className="text-sm font-medium text-white">{borrower1.name}</span>
                </div>
                {borrower2 && (
                  <div className="p-3 text-center">
                    <span className="text-sm font-medium text-white">{borrower2.name}</span>
                  </div>
                )}
              </div>

              {/* Down Payment Section */}
              <div>
                <div className={cn(
                  "grid",
                  borrower2 ? "grid-cols-[1fr_120px_120px]" : "grid-cols-[1fr_120px]"
                )}>
                  <div className="p-3">
                    <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Down Payment</p>
                  </div>
                  <div />
                  {borrower2 && <div />}
                </div>
                <div className={cn(
                  "grid",
                  borrower2 ? "grid-cols-[1fr_120px_120px]" : "grid-cols-[1fr_120px]"
                )}>
                  <div className="px-3 pb-3">
                    <span className="text-sm text-gray-400 pl-3">CPF OA</span>
                  </div>
                  <div className="px-3 pb-3 text-right">
                    <span className="text-sm text-white font-mono tabular-nums">{formatCurrency(borrower1.downpaymentCpfOa)}</span>
                  </div>
                  {borrower2 && (
                    <div className="px-3 pb-3 text-right">
                      <span className="text-sm text-white font-mono tabular-nums">{formatCurrency(borrower2.downpaymentCpfOa)}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Monthly Section */}
              <div>
                <div className={cn(
                  "grid",
                  borrower2 ? "grid-cols-[1fr_120px_120px]" : "grid-cols-[1fr_120px]"
                )}>
                  <div className="p-3">
                    <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Monthly ({holdingMonths} mo)</p>
                  </div>
                  <div />
                  {borrower2 && <div />}
                </div>
                <div className={cn(
                  "grid",
                  borrower2 ? "grid-cols-[1fr_120px_120px]" : "grid-cols-[1fr_120px]"
                )}>
                  <div className="px-3 pb-2">
                    <span className="text-sm text-gray-400 pl-3">CPF OA</span>
                  </div>
                  <div className="px-3 pb-2 text-right">
                    <span className="text-sm text-gray-300 font-mono tabular-nums">{formatCurrency(borrower1.monthlyCpfOa)}/mo</span>
                  </div>
                  {borrower2 && (
                    <div className="px-3 pb-2 text-right">
                      <span className="text-sm text-gray-300 font-mono tabular-nums">{formatCurrency(borrower2.monthlyCpfOa)}/mo</span>
                    </div>
                  )}
                </div>
                <div className={cn(
                  "grid",
                  borrower2 ? "grid-cols-[1fr_120px_120px]" : "grid-cols-[1fr_120px]"
                )}>
                  <div className="px-3 pb-3">
                    <span className="text-sm text-gray-400 pl-3">Total</span>
                  </div>
                  <div className="px-3 pb-3 text-right">
                    <span className="text-sm text-white font-mono tabular-nums">{formatCurrency(borrower1.monthlyCpfOa * holdingMonths)}</span>
                  </div>
                  {borrower2 && (
                    <div className="px-3 pb-3 text-right">
                      <span className="text-sm text-white font-mono tabular-nums">{formatCurrency(borrower2.monthlyCpfOa * holdingMonths)}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Totals Section */}
              <div>
                <div className={cn(
                  "grid",
                  borrower2 ? "grid-cols-[1fr_120px_120px]" : "grid-cols-[1fr_120px]"
                )}>
                  <div className="p-3">
                    <span className="text-sm text-gray-300">Total CPF Used</span>
                  </div>
                  <div className="p-3 text-right">
                    <span className="text-sm text-white font-semibold font-mono tabular-nums">{formatCurrency(borrower1.totalCpfUsed)}</span>
                  </div>
                  {borrower2 && (
                    <div className="p-3 text-right">
                      <span className="text-sm text-white font-semibold font-mono tabular-nums">{formatCurrency(borrower2.totalCpfUsed)}</span>
                    </div>
                  )}
                </div>
                <div className={cn(
                  "grid",
                  borrower2 ? "grid-cols-[1fr_120px_120px]" : "grid-cols-[1fr_120px]"
                )}>
                  <div className="px-3 pb-3">
                    <span className="text-sm text-amber-400">+ Accrued Interest</span>
                  </div>
                  <div className="px-3 pb-3 text-right">
                    <span className="text-sm text-amber-400 font-mono tabular-nums">{formatCurrency(borrower1.accruedInterest)}</span>
                  </div>
                  {borrower2 && (
                    <div className="px-3 pb-3 text-right">
                      <span className="text-sm text-amber-400 font-mono tabular-nums">{formatCurrency(borrower2.accruedInterest)}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Refund upon sale Row */}
              <div className={cn(
                "grid",
                borrower2 ? "grid-cols-[1fr_120px_120px]" : "grid-cols-[1fr_120px]"
              )}>
                <div className="p-3">
                  <span className="text-xs text-gray-400">Refund upon sale</span>
                </div>
                <div className="p-3 text-right">
                  <span className="text-sm font-semibold text-white font-mono tabular-nums">
                    {formatCurrency(borrower1.totalCpfUsed + borrower1.accruedInterest)}
                  </span>
                </div>
                {borrower2 && (
                  <div className="p-3 text-right">
                    <span className="text-sm font-semibold text-white font-mono tabular-nums">
                      {formatCurrency(borrower2.totalCpfUsed + borrower2.accruedInterest)}
                    </span>
                  </div>
                )}
              </div>

              {/* TODO(human): Add Housing Grants row(s) here
                  - Grants are property-level (not per-person), so consider using a spanning row or full-width section
                  - Data: scenario.grants array with {name, amount}
                  - Total: scenario.grants.reduce((sum, g) => sum + parseFloat(g.amount || '0'), 0)
                  - Remember: grants are refunded WITHOUT accrued interest (unlike CPF contributions)
                  - Consider: Should this show individual grants or just the total? */}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

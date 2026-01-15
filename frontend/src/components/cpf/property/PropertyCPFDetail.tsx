'use client'

import { useState, useMemo } from 'react'
import { Edit3 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatCurrency } from '@/lib/format'
import type { PropertyScenarioFull } from '@/types/propertyPlannerV2'
import type { CPFAccount } from '@/types/cpf'

import { GrantsDisplay } from '@/components/modals/PropertyPlannerModal/components/CPFTabContent/GrantsDisplay'

type DetailTab = 'all' | 'cpf-usage' | 'grants'

const DETAIL_TABS: { id: DetailTab; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'cpf-usage', label: 'CPF' },
  { id: 'grants', label: 'Grants' },
]

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
  const [activeTab, setActiveTab] = useState<DetailTab>('all')
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

  const isPrivateProperty = sg.propertyType === 'private'

  return (
    <div className="rounded-xl border border-white/[0.06] overflow-hidden">
      {/* Header */}
      <div className="px-4 py-4 border-b border-white/[0.06]">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-medium text-white">{sg.name}</h3>
              <button
                type="button"
                onClick={onEditInPropertyPlanner}
                className="p-1 rounded text-gray-500 hover:text-white transition"
              >
                <Edit3 className="h-3.5 w-3.5" />
              </button>
            </div>
            <p className="text-sm text-gray-400 mt-0.5">
              {formatCurrency(parseFloat(sg.propertyPrice))} • {holdingYears} year holding
            </p>
          </div>

          {/* Section Tabs */}
          <div className="flex items-center gap-6">
            {DETAIL_TABS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "text-sm font-medium transition-colors pb-1",
                  activeTab === tab.id
                    ? "text-white border-b border-white"
                    : "text-gray-500 hover:text-gray-300"
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 space-y-6">
        {/* Per-Person CPF Usage - Tabular Layout */}
        {(activeTab === 'all' || activeTab === 'cpf-usage') && borrower1 && (
          <div>
            <h4 className="text-sm font-medium text-gray-300 uppercase tracking-wide mb-3">CPF Usage by Person</h4>

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
                  <span className="text-sm text-gray-400">Refund upon sale</span>
                </div>
                <div className="p-3 text-right">
                  <span className="text-lg font-semibold text-white font-mono tabular-nums">
                    {formatCurrency(borrower1.totalCpfUsed + borrower1.accruedInterest)}
                  </span>
                </div>
                {borrower2 && (
                  <div className="p-3 text-right">
                    <span className="text-lg font-semibold text-white font-mono tabular-nums">
                      {formatCurrency(borrower2.totalCpfUsed + borrower2.accruedInterest)}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Grants Display */}
        {(activeTab === 'all' || activeTab === 'grants') && (
          <GrantsDisplay
            grants={scenario.grants || []}
            isPrivateProperty={isPrivateProperty}
          />
        )}
      </div>
    </div>
  )
}

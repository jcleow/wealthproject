'use client'

import { useState, useMemo } from 'react'
import { Edit3, Banknote } from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatCurrency } from '@/lib/format'
import type { PropertyScenarioFull } from '@/types/propertyPlannerV2'
import type { CPFAccount } from '@/types/cpf'

// Reuse components from CPFTabContent
import { PersonCPFUsageCard } from '@/components/modals/PropertyPlannerModal/components/CPFTabContent/PersonCPFUsageCard'
import { AccruedInterestChart } from '@/components/modals/PropertyPlannerModal/components/CPFTabContent/AccruedInterestChart'
import { GrantsDisplay } from '@/components/modals/PropertyPlannerModal/components/CPFTabContent/GrantsDisplay'
import { SaleImpactSection } from '@/components/modals/PropertyPlannerModal/components/CPFTabContent/SaleImpactSection'

type DetailTab = 'all' | 'cpf-usage' | 'interest' | 'grants' | 'sale'

const DETAIL_TABS: { id: DetailTab; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'cpf-usage', label: 'CPF' },
  { id: 'interest', label: 'Interest' },
  { id: 'grants', label: 'Grants' },
  { id: 'sale', label: 'Sale' },
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

  // Combined totals
  const totalCpfUsed = (borrower1?.totalCpfUsed || 0) + (borrower2?.totalCpfUsed || 0)
  const totalAccruedInterest = (borrower1?.accruedInterest || 0) + (borrower2?.accruedInterest || 0)

  // Sale calculations
  const expectedSalePrice = parseFloat(sg.saleExpectedPrice || '0') || parseFloat(sg.propertyPrice) * 1.2
  const outstandingLoan = parseFloat(scenario.computed?.loanAmount || '0') * 0.7 // Rough estimate
  const sellingCosts = expectedSalePrice * 0.02
  const totalCpfRefund = totalCpfUsed + totalAccruedInterest
  const netCashProceeds = expectedSalePrice - outstandingLoan - sellingCosts - totalCpfRefund

  // Build borrower refunds for sale impact section
  const borrowerRefunds = useMemo(() => {
    const refunds = []
    if (borrower1) {
      refunds.push({
        name: borrower1.name,
        principal: borrower1.totalCpfUsed,
        interest: borrower1.accruedInterest,
        total: borrower1.totalCpfUsed + borrower1.accruedInterest,
      })
    }
    if (borrower2) {
      refunds.push({
        name: borrower2.name,
        principal: borrower2.totalCpfUsed,
        interest: borrower2.accruedInterest,
        total: borrower2.totalCpfUsed + borrower2.accruedInterest,
      })
    }
    return refunds
  }, [borrower1, borrower2])

  const isPrivateProperty = sg.propertyType === 'private'

  return (
    <div className="rounded-xl border border-white/[0.06] overflow-hidden">
      {/* Header */}
      <div className="px-4 py-4 border-b border-white/[0.06]">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-medium text-white">{sg.name}</h3>
            <p className="text-sm text-gray-400 mt-1">
              {formatCurrency(parseFloat(sg.propertyPrice))} • {holdingYears} year holding
            </p>
          </div>
          <button
            type="button"
            onClick={onEditInPropertyPlanner}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-gray-300 hover:text-white hover:bg-gray-700 transition"
          >
            <Edit3 className="h-4 w-4" />
            Edit
          </button>
        </div>

        {/* Segmented Control for Section Views */}
        <div className="inline-flex rounded-lg bg-white/[0.03] p-1 border border-white/[0.08]">
          {DETAIL_TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "px-4 py-2 rounded-lg text-sm font-medium transition-all duration-150",
                activeTab === tab.id
                  ? "bg-gray-700 text-white shadow-sm"
                  : "text-gray-400 hover:text-gray-200"
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="p-4 space-y-6">
        {/* Per-Person CPF Usage */}
        {(activeTab === 'all' || activeTab === 'cpf-usage') && (
          <div>
            <h4 className="text-sm font-medium text-gray-300 uppercase tracking-wide mb-3">CPF Usage by Person</h4>
            <div className={`grid gap-3 ${borrower2 ? 'grid-cols-1 md:grid-cols-2' : 'grid-cols-1'}`}>
              {borrower1 && (
                <PersonCPFUsageCard
                  personName={borrower1.name}
                  downpaymentCpfOa={borrower1.downpaymentCpfOa}
                  monthlyCpfOa={borrower1.monthlyCpfOa}
                  holdingMonths={holdingMonths}
                  totalCpfUsed={borrower1.totalCpfUsed}
                  accruedInterest={borrower1.accruedInterest}
                />
              )}
              {borrower2 && (
                <PersonCPFUsageCard
                  personName={borrower2.name}
                  downpaymentCpfOa={borrower2.downpaymentCpfOa}
                  monthlyCpfOa={borrower2.monthlyCpfOa}
                  holdingMonths={holdingMonths}
                  totalCpfUsed={borrower2.totalCpfUsed}
                  accruedInterest={borrower2.accruedInterest}
                />
              )}
            </div>

            {/* Combined Total (for joint) */}
            {borrower2 && (
              <div className="mt-3 p-3 rounded-lg border border-white/[0.06]">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-300">Combined Total</span>
                  <span className="text-white font-medium font-mono tabular-nums">
                    {formatCurrency(totalCpfUsed)} CPF + {formatCurrency(totalAccruedInterest)} interest = {formatCurrency(totalCpfUsed + totalAccruedInterest)}
                  </span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Accrued Interest Chart */}
        {(activeTab === 'all' || activeTab === 'interest') && (
          <AccruedInterestChart
            totalPrincipal={totalCpfUsed}
            holdingYears={holdingYears}
            interestRate={0.025}
          />
        )}

        {/* Grants Display */}
        {(activeTab === 'all' || activeTab === 'grants') && (
          <GrantsDisplay
            grants={scenario.grants || []}
            isPrivateProperty={isPrivateProperty}
          />
        )}

        {/* Sale Impact (only if sale date is set) */}
        {(activeTab === 'all' || activeTab === 'sale') && sg.saleExpectedDate && (
          <SaleImpactSection
            expectedSaleDate={sg.saleExpectedDate}
            expectedSalePrice={expectedSalePrice}
            outstandingLoan={outstandingLoan}
            sellingCosts={sellingCosts}
            cpfPrincipal={totalCpfUsed}
            cpfAccruedInterest={totalAccruedInterest}
            netCashProceeds={netCashProceeds}
            borrowerRefunds={borrowerRefunds}
          />
        )}

        {/* Empty state for Sale tab when no sale date */}
        {activeTab === 'sale' && !sg.saleExpectedDate && (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <Banknote className="h-8 w-8 text-gray-500 mb-3" />
            <p className="text-sm text-gray-300">No expected sale date set</p>
            <p className="text-sm text-gray-400 mt-1">
              Edit the property to add a sale date and see sale impact projections.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

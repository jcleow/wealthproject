'use client'

import { useMemo } from 'react'
import type { PropertyScenarioFull } from '@/types/propertyPlannerV2'
import type { CPFAccount } from '@/types/cpf'

import { CPFUsageByPersonTable } from '@/components/cpf/property'
import { SaleImpactSection } from './SaleImpactSection'

interface CPFTabContentProps {
  scenario: PropertyScenarioFull
  cpfAccounts: CPFAccount[]
}

/**
 * CPFTabContent - Displays CPF-specific information for a property scenario
 * within the Property Planner modal.
 */
export function CPFTabContent({ scenario, cpfAccounts }: CPFTabContentProps) {
  const sg = scenario.propertySG
  if (!sg) {
    return (
      <div className="text-center py-8">
        <p className="text-sm text-slate-500">No property details available.</p>
      </div>
    )
  }

  // Build CPF account lookup map
  const accountMap = useMemo(
    () => new Map(cpfAccounts.map(a => [a.id, a])),
    [cpfAccounts]
  )

  // Calculate holding period (simplified - from creation or key collection date)
  const purchaseDate = sg.btoKeyCollectionDate || scenario.scenario.createdAt
  const holdingMonths = useMemo(() => {
    const start = new Date(purchaseDate)
    const end = sg.saleExpectedDate ? new Date(sg.saleExpectedDate) : new Date()
    const months = (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth())
    return Math.max(months, 1)
  }, [purchaseDate, sg.saleExpectedDate])

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

  return (
    <div className="space-y-6">
      {/* Per-Person CPF Usage */}
      {borrower1 && (
        <div>
          <h3 className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-2">
            CPF Usage by Person
          </h3>
          <CPFUsageByPersonTable
            borrower1={borrower1}
            borrower2={borrower2}
            holdingMonths={holdingMonths}
            grants={scenario.grants}
          />
        </div>
      )}

      {/* Sale Impact (only if sale date is set) */}
      {sg.saleExpectedDate && (
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
    </div>
  )
}

export { SaleImpactSection } from './SaleImpactSection'

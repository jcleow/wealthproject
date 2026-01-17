'use client'

import { useMemo } from 'react'
import type { PropertyScenarioFull } from '@/types/propertyPlannerV2'
import type { CPFAccount } from '@/types/cpf'

import { CPFUsageByPersonTable } from '@/components/cpf/property'
import { SaleImpactSection } from './SaleImpactSection'
import { useCpfHousingUsageQuery } from '@/hooks/queries/useCpfQuery'

interface CPFTabContentProps {
  scenario: PropertyScenarioFull
  cpfAccounts: CPFAccount[]
}

/**
 * CPFTabContent - Displays CPF-specific information for a property scenario
 * within the Property Planner modal.
 *
 * Uses backend API for accurate compound interest calculations while
 * deriving per-borrower breakdowns from scenario data.
 */
export function CPFTabContent({ scenario, cpfAccounts }: CPFTabContentProps) {
  const sg = scenario.propertySG

  // Fetch CPF housing usage from backend (accurate compound interest + sale analysis)
  const { data: housingUsage } = useCpfHousingUsageQuery(scenario.scenario.id)

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

  // Calculate per-borrower CPF usage with accurate compound interest from backend
  const { borrower1, borrower2, totalCpfUsed, totalAccruedInterest } = useMemo(() => {
    // Get per-borrower raw data from scenario
    const b1DownpaymentOa = parseFloat(sg.borrower1DownpaymentCpfOa || '0')
    const b1MonthlyOa = parseFloat(sg.borrower1MonthlyCpfOa || '0')
    const b1TotalUsed = b1DownpaymentOa + (b1MonthlyOa * holdingMonths)

    const isJoint = sg.borrowerType === 'joint' && sg.borrower2CpfAccountId
    const b2DownpaymentOa = isJoint ? parseFloat(sg.borrower2DownpaymentCpfOa || '0') : 0
    const b2MonthlyOa = isJoint ? parseFloat(sg.borrower2MonthlyCpfOa || '0') : 0
    const b2TotalUsed = b2DownpaymentOa + (b2MonthlyOa * holdingMonths)

    // Get total accrued interest from backend (accurate compound interest)
    const backendTotalInterest = housingUsage?.usage?.accruedInterest?.totalAccrued
      ? parseFloat(housingUsage.usage.accruedInterest.totalAccrued)
      : null

    // Calculate proportional interest for each borrower
    const combinedTotal = b1TotalUsed + b2TotalUsed
    const b1Ratio = combinedTotal > 0 ? b1TotalUsed / combinedTotal : 1
    const b2Ratio = combinedTotal > 0 ? b2TotalUsed / combinedTotal : 0

    // Use backend interest if available, otherwise fall back to simple calculation
    const b1Interest = backendTotalInterest !== null
      ? backendTotalInterest * b1Ratio
      : b1TotalUsed * 0.025 * (holdingMonths / 12)
    const b2Interest = backendTotalInterest !== null
      ? backendTotalInterest * b2Ratio
      : b2TotalUsed * 0.025 * (holdingMonths / 12)

    const borrower1Data = sg.borrower1CpfAccountId ? {
      name: accountMap.get(sg.borrower1CpfAccountId)?.personName || 'Borrower 1',
      downpaymentCpfOa: b1DownpaymentOa,
      monthlyCpfOa: b1MonthlyOa,
      totalCpfUsed: b1TotalUsed,
      accruedInterest: b1Interest,
    } : null

    const borrower2Data = isJoint ? {
      name: accountMap.get(sg.borrower2CpfAccountId!)?.personName || 'Borrower 2',
      downpaymentCpfOa: b2DownpaymentOa,
      monthlyCpfOa: b2MonthlyOa,
      totalCpfUsed: b2TotalUsed,
      accruedInterest: b2Interest,
    } : null

    return {
      borrower1: borrower1Data,
      borrower2: borrower2Data,
      totalCpfUsed: b1TotalUsed + b2TotalUsed,
      totalAccruedInterest: b1Interest + b2Interest,
    }
  }, [sg, accountMap, holdingMonths, housingUsage])

  // Sale calculations - use backend data if available, otherwise fall back to estimates
  const saleData = useMemo(() => {
    const backendSale = housingUsage?.saleAnalysis

    if (backendSale) {
      // Use accurate backend calculations
      return {
        expectedSalePrice: parseFloat(backendSale.grossProceeds),
        outstandingLoan: parseFloat(backendSale.outstandingLoan),
        sellingCosts: parseFloat(backendSale.sellingCosts),
        cpfPrincipal: parseFloat(backendSale.cpfRefundRequired.principalUsed),
        cpfAccruedInterest: parseFloat(backendSale.cpfRefundRequired.accruedInterest),
        netCashProceeds: parseFloat(backendSale.netCashProceeds),
      }
    }

    // Fallback to frontend estimates
    const expectedSalePrice = parseFloat(sg.saleExpectedPrice || '0') || parseFloat(sg.propertyPrice) * 1.2
    const outstandingLoan = parseFloat(scenario.computed?.loanAmount || '0') * 0.7
    const sellingCosts = expectedSalePrice * 0.02
    const totalCpfRefund = totalCpfUsed + totalAccruedInterest
    const netCashProceeds = expectedSalePrice - outstandingLoan - sellingCosts - totalCpfRefund

    return {
      expectedSalePrice,
      outstandingLoan,
      sellingCosts,
      cpfPrincipal: totalCpfUsed,
      cpfAccruedInterest: totalAccruedInterest,
      netCashProceeds,
    }
  }, [housingUsage, sg, scenario.computed, totalCpfUsed, totalAccruedInterest])

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
          expectedSalePrice={saleData.expectedSalePrice}
          outstandingLoan={saleData.outstandingLoan}
          sellingCosts={saleData.sellingCosts}
          cpfPrincipal={saleData.cpfPrincipal}
          cpfAccruedInterest={saleData.cpfAccruedInterest}
          netCashProceeds={saleData.netCashProceeds}
          borrowerRefunds={borrowerRefunds}
        />
      )}
    </div>
  )
}

export { SaleImpactSection } from './SaleImpactSection'

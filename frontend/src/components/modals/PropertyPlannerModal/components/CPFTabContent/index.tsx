'use client'

import { useMemo } from 'react'
import type { PropertyScenarioFull } from '@/types/propertyPlannerV2'
import type { CPFAccount } from '@/types/cpf'

import {
  calculateBorrowerCPFUsage,
  calculateHoldingMonths,
  extractBackendTotalInterest,
} from '@/lib/cpf'
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
    return calculateHoldingMonths(start, end)
  }, [purchaseDate, sg.saleExpectedDate])

  // Calculate per-borrower CPF usage with accurate compound interest from backend
  const { borrower1, borrower2, totalCpfUsed, totalAccruedInterest } = useMemo(() => {
    const backendTotalInterest = extractBackendTotalInterest(housingUsage)

    return calculateBorrowerCPFUsage({
      borrower1CpfAccountId: sg.borrower1CpfAccountId,
      borrower1DownpaymentCpfOa: sg.borrower1DownpaymentCpfOa,
      borrower1MonthlyCpfOa: sg.borrower1MonthlyCpfOa,
      borrowerType: sg.borrowerType,
      borrower2CpfAccountId: sg.borrower2CpfAccountId,
      borrower2DownpaymentCpfOa: sg.borrower2DownpaymentCpfOa,
      borrower2MonthlyCpfOa: sg.borrower2MonthlyCpfOa,
      holdingMonths,
      accountMap,
      backendTotalInterest,
    })
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

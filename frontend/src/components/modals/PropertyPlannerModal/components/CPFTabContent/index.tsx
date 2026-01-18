'use client'

import { useMemo } from 'react'
import type { PropertyScenarioFull } from '@/types/propertyPlannerV2'
import type { CPFAccount } from '@/types/cpf'
import type { CPFBorrowerUsage } from '@/api/financial/cpf'

import { CPFPropertyContributionByPersonTable } from '@/components/cpf/property'
import { SaleImpactSection } from './SaleImpactSection'
import { useCpfHousingUsageQuery } from '@/hooks/queries/useCpfQuery'

interface CPFTabContentProps {
  scenario: PropertyScenarioFull
  cpfAccounts: CPFAccount[] // Required by parent but data comes from backend
}

/**
 * Transform backend CPFBorrowerUsage (string decimals) to UI format (numbers)
 */
function transformBorrowerUsage(backendData: CPFBorrowerUsage) {
  return {
    name: backendData.personName,
    downpaymentCpfOa: parseFloat(backendData.downpaymentOa),
    monthlyCpfOa: parseFloat(backendData.monthlyOa),
    totalCpfUsed: parseFloat(backendData.totalOaUsed),
    accruedInterest: parseFloat(backendData.accruedInterest),
  }
}

/**
 * CPFTabContent - Displays CPF-specific information for a property scenario
 * within the Property Planner modal.
 *
 * Pure display component - all calculations done by backend.
 */
export function CPFTabContent({ scenario, cpfAccounts: _cpfAccounts }: CPFTabContentProps) {
  const sg = scenario.propertySG

  // Fetch CPF housing usage from backend (all calculations done server-side)
  const { data: housingUsage } = useCpfHousingUsageQuery(scenario.scenario.id)

  if (!sg) {
    return (
      <div className="text-center py-8">
        <p className="text-sm text-slate-500">No property details available.</p>
      </div>
    )
  }

  // Get holding period from backend response
  const holdingMonths = housingUsage?.usage?.holdingMonths ?? 1

  // Transform backend borrower data to UI format (pure display - no calculations)
  const { borrower1, borrower2, totalCpfUsed, totalAccruedInterest } = useMemo(() => {
    const usage = housingUsage?.usage
    const b1 = usage?.borrower1 ? transformBorrowerUsage(usage.borrower1) : null
    const b2 = usage?.borrower2 ? transformBorrowerUsage(usage.borrower2) : null

    return {
      borrower1: b1,
      borrower2: b2,
      totalCpfUsed: (b1?.totalCpfUsed ?? 0) + (b2?.totalCpfUsed ?? 0),
      totalAccruedInterest: (b1?.accruedInterest ?? 0) + (b2?.accruedInterest ?? 0),
    }
  }, [housingUsage])

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
          <CPFPropertyContributionByPersonTable
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

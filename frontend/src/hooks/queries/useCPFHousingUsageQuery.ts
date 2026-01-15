/**
 * React Query hook for deriving CPF housing usage from property scenarios.
 *
 * CPF housing usage is now derived from property scenarios rather than stored
 * directly on CPF accounts. This hook transforms PropertyScenarioFull data
 * into the CPFHousingUsage format for display in the PropertyCPFUsage component.
 */

import { useMemo } from 'react'
import { usePropertyPlannerV2ScenarioQuery } from './usePropertyPlannerV2Query'
import type { PropertyScenarioFull } from '@/types/propertyPlannerV2'
import type {
  CPFHousingUsage,
  MonthlyPayment,
  YearlyAccrued,
  PropertySaleAnalysis,
} from '@/types/cpf'

const CPF_ACCRUED_INTEREST_RATE = 0.025 // 2.5% p.a.

/**
 * Parse a string amount to number, returning 0 for invalid values
 */
function parseAmount(value: string | null | undefined): number {
  if (!value) return 0
  const num = parseFloat(value)
  return Number.isNaN(num) ? 0 : num
}

/**
 * Calculate accrued interest on CPF used for housing.
 * Interest accrues at 2.5% p.a. compounded yearly on the principal used.
 */
function calculateAccruedInterest(
  totalOAUsed: number,
  startDate: Date,
  asOfDate: Date
): { totalAccrued: number; yearlyBreakdown: YearlyAccrued[] } {
  const yearlyBreakdown: YearlyAccrued[] = []
  const startYear = startDate.getFullYear()
  const endYear = asOfDate.getFullYear()

  let cumulativePrincipal = totalOAUsed
  let cumulativeInterest = 0

  // Calculate year by year
  for (let year = startYear; year <= endYear; year++) {
    const startingPrincipal = cumulativePrincipal
    const interestForYear = Math.round(startingPrincipal * CPF_ACCRUED_INTEREST_RATE)
    cumulativeInterest += interestForYear

    yearlyBreakdown.push({
      year,
      startingPrincipal,
      interestForYear,
      cumulativeInterest,
    })

    // Interest compounds (added to principal for next year's calculation)
    cumulativePrincipal = startingPrincipal + interestForYear
  }

  return {
    totalAccrued: cumulativeInterest,
    yearlyBreakdown,
  }
}

/**
 * Generate monthly payment records from scenario data.
 * This is a simplified approximation - for exact monthly breakdown,
 * backend would need to provide amortization schedule.
 */
function generateMonthlyPayments(
  scenario: PropertyScenarioFull,
  startDate: Date,
  monthlyOAUsed: number,
  monthlyCashUsed: number
): MonthlyPayment[] {
  const payments: MonthlyPayment[] = []
  const ratePeriods = scenario.ratePeriods || []

  // Use rate periods to determine duration and interest portions
  let totalMonths = 0
  for (const period of ratePeriods) {
    totalMonths += period.termYears * 12
  }

  // Limit to reasonable range (up to current date or 360 months max)
  const now = new Date()
  const monthsSinceStart = Math.max(0,
    (now.getFullYear() - startDate.getFullYear()) * 12 +
    (now.getMonth() - startDate.getMonth())
  )
  const monthsToGenerate = Math.min(monthsSinceStart, totalMonths, 360)

  // Calculate approximate principal/interest split based on loan amount
  const loanAmount = parseAmount(scenario.computed?.loanAmount)
  const monthlyPayment = parseAmount(scenario.computed?.monthlyPayment)

  for (let i = 0; i < monthsToGenerate; i++) {
    const paymentDate = new Date(startDate)
    paymentDate.setMonth(paymentDate.getMonth() + i)
    const month = paymentDate.toISOString().slice(0, 7)

    // Simple approximation: early payments have more interest
    const remainingMonths = totalMonths - i
    const interestPortion = loanAmount > 0
      ? Math.round((monthlyPayment * remainingMonths) / totalMonths * 0.4)
      : Math.round(monthlyPayment * 0.3)
    const principalPortion = monthlyPayment - interestPortion

    payments.push({
      month,
      oaUsed: monthlyOAUsed,
      cashUsed: monthlyCashUsed,
      principalPortion,
      interestPortion,
    })
  }

  return payments
}

/**
 * Transform PropertyScenarioFull into CPFHousingUsage format
 */
function transformToCPFHousingUsage(
  scenario: PropertyScenarioFull
): CPFHousingUsage | null {
  const propertySG = scenario.propertySG
  if (!propertySG) return null

  // Downpayment CPF OA (both borrowers)
  const borrower1DownpaymentOA = parseAmount(propertySG.borrower1DownpaymentCpfOa)
  const borrower2DownpaymentOA = parseAmount(propertySG.borrower2DownpaymentCpfOa)
  const oaForDownPayment = borrower1DownpaymentOA + borrower2DownpaymentOA

  // Downpayment cash (both borrowers)
  const borrower1DownpaymentCash = parseAmount(propertySG.borrower1DownpaymentCashAmount)
  const borrower2DownpaymentCash = parseAmount(propertySG.borrower2DownpaymentCashAmount)
  // Fall back to legacy field if per-borrower not set
  const downpaymentCash = borrower1DownpaymentCash + borrower2DownpaymentCash ||
    parseAmount(propertySG.downpaymentCash)

  // Grants
  const totalGrants = (scenario.grants || []).reduce(
    (sum, grant) => sum + parseAmount(grant.amount),
    0
  )
  // Determine primary grant type
  const primaryGrant = scenario.grants?.[0]
  const grantType = primaryGrant?.name?.toUpperCase().includes('EHG')
    ? 'EHG'
    : primaryGrant?.name?.toUpperCase().includes('FHG')
      ? 'FHG'
      : primaryGrant?.name?.toUpperCase().includes('PHG')
        ? 'PHG'
        : primaryGrant?.name?.toUpperCase().includes('STEP')
          ? 'STEP_UP'
          : null

  // Monthly CPF OA (both borrowers)
  const borrower1MonthlyCpfOa = parseAmount(propertySG.borrower1MonthlyCpfOa)
  const borrower2MonthlyCpfOa = parseAmount(propertySG.borrower2MonthlyCpfOa)
  const monthlyOAUsed = borrower1MonthlyCpfOa + borrower2MonthlyCpfOa

  // Monthly cash (both borrowers)
  const borrower1MonthlyCash = parseAmount(propertySG.borrower1MonthlyCashAmount)
  const borrower2MonthlyCash = parseAmount(propertySG.borrower2MonthlyCashAmount)
  // Fall back to legacy field if per-borrower not set
  const monthlyCashUsed = borrower1MonthlyCash + borrower2MonthlyCash ||
    parseAmount(propertySG.monthlyCashAmount)

  // Determine start date (BTO key collection or created date)
  const startDateStr = propertySG.btoKeyCollectionDate || propertySG.createdAt
  const startDate = startDateStr ? new Date(startDateStr) : new Date()
  const asOfDate = new Date()

  // Generate monthly payments
  const monthlyPayments = generateMonthlyPayments(
    scenario,
    startDate,
    monthlyOAUsed,
    monthlyCashUsed
  )

  // Calculate totals
  const oaForMonthlyPayments = monthlyPayments.reduce((sum, p) => sum + p.oaUsed, 0)
  const cashForMonthlyPayments = monthlyPayments.reduce((sum, p) => sum + p.cashUsed, 0)
  const totalOAUsed = oaForDownPayment + oaForMonthlyPayments
  const totalCashUsed = downpaymentCash + cashForMonthlyPayments

  // Calculate accrued interest
  const { totalAccrued, yearlyBreakdown } = calculateAccruedInterest(
    totalOAUsed,
    startDate,
    asOfDate
  )

  return {
    propertyScenarioId: scenario.scenario.id,
    downPayment: {
      oaUsed: oaForDownPayment,
      cashUsed: downpaymentCash,
      grantReceived: totalGrants,
      grantType,
    },
    monthlyPayments,
    totals: {
      totalOAUsed,
      totalCashUsed,
      oaForDownPayment,
      oaForMonthlyPayments,
    },
    accruedInterest: {
      asOfDate: asOfDate.toISOString(),
      totalAccrued,
      yearlyBreakdown,
    },
  }
}

/**
 * Transform PropertyScenarioFull into PropertySaleAnalysis format
 */
function transformToSaleAnalysis(
  scenario: PropertyScenarioFull,
  housingUsage: CPFHousingUsage | null
): PropertySaleAnalysis | null {
  const propertySG = scenario.propertySG
  if (!propertySG || !housingUsage) return null

  // Only generate sale analysis if sale date is set
  if (!propertySG.saleExpectedDate) return null

  const salePrice = parseAmount(propertySG.saleExpectedPrice)
  const outstandingLoan = parseAmount(scenario.computed?.loanAmount) * 0.7 // Rough estimate
  const sellingCosts = Math.round(salePrice * 0.02) // ~2% selling costs

  const principalUsed = housingUsage.totals.totalOAUsed
  const accruedInterest = housingUsage.accruedInterest.totalAccrued
  const totalRefund = principalUsed + accruedInterest

  const netCashProceeds = salePrice - outstandingLoan - sellingCosts - totalRefund

  return {
    saleDate: propertySG.saleExpectedDate,
    grossProceeds: salePrice,
    outstandingLoan,
    sellingCosts,
    cpfRefundRequired: {
      principalUsed,
      accruedInterest,
      totalRefund,
    },
    refundDestination: {
      toOA: totalRefund, // Simplified - actual destination depends on age
      toRA: 0,
      reason: 'Refund destination depends on member age at sale',
    },
    netCashProceeds,
    warnings: netCashProceeds < 0
      ? ['Sale proceeds may be insufficient to cover CPF refund']
      : [],
  }
}

/**
 * Hook to get CPF housing usage derived from a property scenario.
 *
 * @param scenarioId - The property scenario ID to derive usage from
 * @returns Query result with CPFHousingUsage and PropertySaleAnalysis
 */
export function useCPFHousingUsageQuery(scenarioId: string | undefined) {
  const scenarioQuery = usePropertyPlannerV2ScenarioQuery(scenarioId)

  const housingUsage = useMemo(() => {
    if (!scenarioQuery.data) return null
    return transformToCPFHousingUsage(scenarioQuery.data)
  }, [scenarioQuery.data])

  const saleAnalysis = useMemo(() => {
    if (!scenarioQuery.data || !housingUsage) return null
    return transformToSaleAnalysis(scenarioQuery.data, housingUsage)
  }, [scenarioQuery.data, housingUsage])

  return {
    data: housingUsage,
    saleAnalysis,
    isLoading: scenarioQuery.isLoading,
    isError: scenarioQuery.isError,
    error: scenarioQuery.error,
  }
}

/**
 * Hook to get CPF housing usage from a list of property scenarios.
 * Useful when displaying aggregated CPF usage across multiple properties.
 *
 * @param scenarios - Array of property scenarios
 * @returns Aggregated CPF housing usage data
 */
export function useCPFHousingUsageFromScenarios(scenarios: PropertyScenarioFull[] | undefined) {
  return useMemo(() => {
    if (!scenarios || scenarios.length === 0) return []
    return scenarios
      .filter((s) => s.propertySG?.isIncluded)
      .map((s) => ({
        scenario: s,
        usage: transformToCPFHousingUsage(s),
      }))
      .filter((item) => item.usage !== null)
  }, [scenarios])
}

/**
 * React Query hook for fetching CPF housing usage from backend.
 *
 * CPF housing usage is derived from property scenarios on the backend.
 * This hook fetches the pre-computed data for display in the PropertyCPFUsage component.
 */

import { useQuery } from '@tanstack/react-query'
import {
  getCPFHousingUsage,
  type CPFHousingUsageApiResponse,
  type CPFPropertySaleAnalysis as ApiSaleAnalysis,
} from '@/api/financial/cpf'
import type {
  CPFHousingUsage,
  MonthlyPayment,
  YearlyAccrued,
  PropertySaleAnalysis,
} from '@/types/cpf'
import { QUERY_KEYS } from '@/lib/queryKeys'

// Query key factory for CPF housing usage
export const cpfHousingUsageKeys = {
  all: [...QUERY_KEYS.financial.cpf, 'housing-usage'] as const,
  details: () => [...cpfHousingUsageKeys.all, 'detail'] as const,
  detail: (scenarioId: string) => [...cpfHousingUsageKeys.details(), scenarioId] as const,
}

/**
 * Parse a string amount to number, returning 0 for invalid values
 */
function parseAmount(value: string | null | undefined): number {
  if (!value) return 0
  const num = parseFloat(value)
  return Number.isNaN(num) ? 0 : num
}

/**
 * Transform API response to frontend CPFHousingUsage type
 */
function transformApiResponse(apiResponse: CPFHousingUsageApiResponse): CPFHousingUsage {
  const monthlyPayments: MonthlyPayment[] = (apiResponse.monthlyPayments || []).map((payment) => ({
    month: payment.month,
    oaUsed: parseAmount(payment.oaUsed),
    cashUsed: parseAmount(payment.cashUsed),
    principalPortion: parseAmount(payment.principalPortion),
    interestPortion: parseAmount(payment.interestPortion),
  }))

  const yearlyBreakdown: YearlyAccrued[] = (
    apiResponse.accruedInterest?.yearlyBreakdown || []
  ).map((yearly) => ({
    year: yearly.year,
    startingPrincipal: parseAmount(yearly.startingPrincipal),
    interestForYear: parseAmount(yearly.interestForYear),
    cumulativeInterest: parseAmount(yearly.cumulativeInterest),
  }))

  return {
    propertyScenarioId: apiResponse.propertyScenarioId,
    downPayment: {
      oaUsed: parseAmount(apiResponse.downPayment.oaUsed),
      cashUsed: parseAmount(apiResponse.downPayment.cashUsed),
      grantReceived: parseAmount(apiResponse.downPayment.grantReceived),
      grantType: apiResponse.downPayment.grantType as 'EHG' | 'FHG' | 'PHG' | 'STEP_UP' | null,
    },
    monthlyPayments,
    totals: {
      totalOAUsed: parseAmount(apiResponse.totals.totalOAUsed),
      totalCashUsed: parseAmount(apiResponse.totals.totalCashUsed),
      oaForDownPayment: parseAmount(apiResponse.totals.oaForDownPayment),
      oaForMonthlyPayments: parseAmount(apiResponse.totals.oaForMonthlyPayments),
    },
    accruedInterest: {
      asOfDate: apiResponse.accruedInterest?.asOfDate || new Date().toISOString(),
      totalAccrued: parseAmount(apiResponse.accruedInterest?.totalAccrued),
      yearlyBreakdown,
    },
  }
}

/**
 * Transform API sale analysis to frontend PropertySaleAnalysis type
 */
function transformSaleAnalysis(apiAnalysis: ApiSaleAnalysis): PropertySaleAnalysis {
  return {
    saleDate: apiAnalysis.saleDate,
    grossProceeds: parseAmount(apiAnalysis.grossProceeds),
    outstandingLoan: parseAmount(apiAnalysis.outstandingLoan),
    sellingCosts: parseAmount(apiAnalysis.sellingCosts),
    cpfRefundRequired: {
      principalUsed: parseAmount(apiAnalysis.cpfRefundRequired.principalUsed),
      accruedInterest: parseAmount(apiAnalysis.cpfRefundRequired.accruedInterest),
      totalRefund: parseAmount(apiAnalysis.cpfRefundRequired.totalRefund),
    },
    refundDestination: {
      toOA: parseAmount(apiAnalysis.refundDestination.toOA),
      toRA: parseAmount(apiAnalysis.refundDestination.toRA),
      reason: apiAnalysis.refundDestination.reason,
    },
    netCashProceeds: parseAmount(apiAnalysis.netCashProceeds),
    warnings: apiAnalysis.warnings || [],
  }
}

/**
 * Hook to get CPF housing usage derived from a property scenario.
 *
 * @param scenarioId - The property scenario ID to get usage for
 * @returns Query result with CPFHousingUsage and PropertySaleAnalysis
 */
export function useCPFHousingUsageQuery(scenarioId: string | undefined) {
  const query = useQuery({
    queryKey: cpfHousingUsageKeys.detail(scenarioId ?? ''),
    queryFn: () => getCPFHousingUsage(scenarioId!),
    enabled: !!scenarioId,
    staleTime: 30_000, // 30 seconds
  })

  // Transform API response to frontend types
  const housingUsage = query.data?.usage ? transformApiResponse(query.data.usage) : null
  const saleAnalysis = query.data?.saleAnalysis
    ? transformSaleAnalysis(query.data.saleAnalysis)
    : null

  return {
    data: housingUsage,
    saleAnalysis,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
  }
}

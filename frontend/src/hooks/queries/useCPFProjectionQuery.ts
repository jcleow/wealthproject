import { useQuery } from '@tanstack/react-query'
import { financialApi } from '@/services/financialApi'
import type { CPFProjectionRangeResponse } from '@/types/cpf'
import { QUERY_KEYS } from '@/lib/queryKeys'

export interface CPFProjectionParams {
  years?: number
  monthlySalary?: number
  annualBonus?: number
}

/**
 * Hook to fetch CPF projection range data.
 * Returns a 30-year (or custom range) projection based on current account and assumptions.
 */
export function useCPFProjectionRangeQuery(params?: CPFProjectionParams) {
  return useQuery({
    queryKey: [...QUERY_KEYS.cpf.projectionRange, params ?? {}],
    queryFn: () => financialApi.getCPFProjectionRange(params),
    staleTime: 5 * 60 * 1000, // 5 minutes - projections don't change frequently
    cacheTime: 10 * 60 * 1000, // Keep in cache for 10 minutes
  })
}

/**
 * Convenience hook that provides projection data with loading/error states.
 */
export function useCPFProjection(params?: CPFProjectionParams) {
  const query = useCPFProjectionRangeQuery(params)

  return {
    projection: query.data as CPFProjectionRangeResponse | null,
    projections: query.data?.projections ?? [],
    milestones: query.data?.milestones,
    retirement: query.data?.retirement,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
  }
}

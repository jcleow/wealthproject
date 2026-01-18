import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { cpfApi } from '@/api/financial/cpf'
import { QUERY_KEYS } from '@/lib/queryKeys'
import type {
  CPFAccountCreatePayload,
  CPFAccountUpdatePayload,
  CPFAssumptionsUpdateInput,
} from '@/types/cpf'

export const CPF_QUERY_KEY = ['cpf'] as const
export const CPF_ACCOUNTS_QUERY_KEY = ['cpf', 'accounts'] as const
export const CPF_CONFIG_QUERY_KEY = (year?: number) => ['cpf', 'config', year] as const
export const CPF_ASSUMPTIONS_QUERY_KEY = (cpfAccountId: string) => ['cpf', 'assumptions', cpfAccountId] as const
export const CPF_HOUSING_USAGE_QUERY_KEY = (scenarioId: string) => ['cpf', 'housing-usage', scenarioId] as const

export function useCpfAccountQuery() {
  return useQuery({
    queryKey: CPF_QUERY_KEY,
    queryFn: cpfApi.getCPFAccount,
  })
}

export function useCpfAccountsQuery() {
  return useQuery({
    queryKey: CPF_ACCOUNTS_QUERY_KEY,
    queryFn: cpfApi.listCPFAccounts,
  })
}

/**
 * Query hook for fetching CPF configuration (retirement sums, interest rates, etc.)
 * Can optionally specify a year to get historical configuration.
 * Defaults to current year if not specified.
 */
export function useCpfConfigQuery(year?: number) {
  return useQuery({
    queryKey: CPF_CONFIG_QUERY_KEY(year),
    queryFn: () => cpfApi.getCPFConfig(year ? { year } : undefined),
    staleTime: 24 * 60 * 60 * 1000, // 24 hours - config rarely changes
  })
}

export function useCreateCpfAccountMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: CPFAccountCreatePayload) => cpfApi.createCPFAccount(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CPF_QUERY_KEY })
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.financial.all })
    },
  })
}

export function useUpdateCpfAccountMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: CPFAccountUpdatePayload }) =>
      cpfApi.updateCPFAccount(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CPF_QUERY_KEY })
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.financial.all })
    },
  })
}

export function useStopCpfAccountMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, endDate }: { id: string; endDate: string }) =>
      cpfApi.stopCPFAccount(id, endDate),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CPF_QUERY_KEY })
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.financial.all })
    },
  })
}

export function useDeleteCpfAccountMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => cpfApi.deleteCPFAccount(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CPF_QUERY_KEY })
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.financial.all })
    },
  })
}

// ============================================================================
// CPF Assumptions Hooks
// ============================================================================

/**
 * Query hook for fetching CPF assumptions for a specific account.
 * The API will create default assumptions if none exist.
 */
export function useCpfAssumptionsQuery(cpfAccountId: string | undefined) {
  return useQuery({
    queryKey: CPF_ASSUMPTIONS_QUERY_KEY(cpfAccountId ?? ''),
    queryFn: () => cpfApi.getCPFAssumptions(cpfAccountId!),
    enabled: !!cpfAccountId,
    staleTime: 5 * 60 * 1000, // 5 minutes - assumptions don't change often
  })
}

/**
 * Mutation hook for updating CPF assumptions.
 * Supports partial updates - only provided fields are changed.
 */
export function useUpdateCpfAssumptionsMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      cpfAccountId,
      updates,
    }: {
      cpfAccountId: string
      updates: CPFAssumptionsUpdateInput
    }) => cpfApi.updateCPFAssumptions(cpfAccountId, updates),
    onSuccess: (_, { cpfAccountId }) => {
      // Invalidate the specific assumptions query
      queryClient.invalidateQueries({ queryKey: CPF_ASSUMPTIONS_QUERY_KEY(cpfAccountId) })
      // Also invalidate timeline queries since assumptions affect projections
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.financial.all })
    },
  })
}

/**
 * Mutation hook for resetting CPF assumptions to defaults.
 */
export function useResetCpfAssumptionsMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (cpfAccountId: string) => cpfApi.deleteCPFAssumptions(cpfAccountId),
    onSuccess: (_, cpfAccountId) => {
      queryClient.invalidateQueries({ queryKey: CPF_ASSUMPTIONS_QUERY_KEY(cpfAccountId) })
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.financial.all })
    },
  })
}

// ============================================================================
// CPF LIFE Estimate Hooks
// ============================================================================

/**
 * Mutation hook for calculating CPF LIFE payout estimates.
 * Returns estimates for all three plans (Standard, Basic, Escalating).
 *
 * Supports two modes:
 * 1. With cpfAccountId: fetches birth year and gender from linked Person
 * 2. Standalone: provide birthYear and gender directly
 */
export function useCpfLifeEstimateMutation() {
  return useMutation({
    mutationFn: ({
      cpfAccountId,
      birthYear,
      gender,
      raBalanceAt65,
      payoutStartAge,
    }: {
      cpfAccountId?: string
      birthYear?: number
      gender?: 'male' | 'female'
      raBalanceAt65: string
      payoutStartAge: number
    }) =>
      cpfApi.calculateCPFLifeEstimate({
        cpfAccountId,
        birthYear,
        gender,
        raBalanceAt65,
        payoutStartAge,
      }),
  })
}

/**
 * Combined hook that integrates the CPF LIFE estimate mutation with Zustand store.
 * Provides a convenient API for managing inputs and calculating estimates.
 *
 * Usage:
 * ```tsx
 * const {
 *   inputs,        // Current input values from store
 *   actions,       // Actions to update inputs
 *   isValid,       // Whether current inputs are valid
 *   result,        // Last successful result (cached in store)
 *   mutation,      // The underlying mutation for loading/error states
 *   calculate,     // Convenient function to trigger calculation
 * } = useCpfLifeEstimate()
 * ```
 */
export function useCpfLifeEstimate() {
  const {
    useCpfLifeEstimateInputs,
    useCpfLifeEstimateActions,
    useCpfLifeEstimateIsValid,
    useCpfLifeEstimateResult,
  } = require('@/stores/cpfLifeEstimateStore')

  const inputs = useCpfLifeEstimateInputs()
  const actions = useCpfLifeEstimateActions()
  const isValid = useCpfLifeEstimateIsValid()
  const result = useCpfLifeEstimateResult()

  const mutation = useMutation({
    mutationFn: () => {
      // Build the API payload based on mode
      const payload =
        inputs.mode === 'account'
          ? {
              cpfAccountId: inputs.cpfAccountId!,
              raBalanceAt65: inputs.raBalanceAt65,
              payoutStartAge: inputs.payoutStartAge,
            }
          : {
              birthYear: inputs.birthYear!,
              gender: inputs.gender!,
              raBalanceAt65: inputs.raBalanceAt65,
              payoutStartAge: inputs.payoutStartAge,
            }

      return cpfApi.calculateCPFLifeEstimate(payload)
    },
    onSuccess: (data) => {
      // Cache the result in the store
      actions.setLastResult(data)
    },
  })

  const calculate = () => {
    if (isValid) {
      mutation.mutate()
    }
  }

  return {
    inputs,
    actions,
    isValid,
    result,
    mutation,
    calculate,
  }
}

// ============================================================================
// CPF Projection Hooks
// ============================================================================

/**
 * Mutation hook for projecting CPF balances to age 65 with LIFE estimates.
 */
export function useCpfProjectionMutation() {
  return useMutation({
    mutationFn: ({
      cpfAccountId,
      payoutStartAge,
      includeIncomes,
    }: {
      cpfAccountId: string
      payoutStartAge: number
      includeIncomes?: boolean
    }) =>
      cpfApi.getCPFProjection(cpfAccountId, {
        payoutStartAge,
        includeIncomes,
      }),
  })
}

// UUID regex pattern for validation
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/**
 * Query hook for balance-projection CPF projection (for charts).
 * Includes real income data, RA formation at 55, and CPF LIFE estimates.
 */
export function useCpfBalanceProjectionQuery(
  cpfAccountId: string | undefined,
  options?: {
    retirementAge?: number
    payoutStartAge?: number
  }
) {
  // Only enable if we have a valid UUID (not a mock ID like "cpf-profile-1")
  const isValidUuid = cpfAccountId && UUID_REGEX.test(cpfAccountId)

  return useQuery({
    queryKey: ['cpf', 'projection', 'balance-projection', cpfAccountId, options],
    queryFn: () =>
      cpfApi.getCPFBalanceProjection(cpfAccountId!, {
        retirementAge: options?.retirementAge,
        payoutStartAge: options?.payoutStartAge,
      }),
    enabled: !!isValidUuid,
    staleTime: 0, // Force fresh fetch every time (was 5 minutes)
    // Keep previous data visible while fetching new data (prevents loading flash)
    keepPreviousData: true,
  })
}

// ============================================================================
// CPF Housing Usage Hooks
// ============================================================================

/**
 * Query hook for fetching CPF housing usage for a property scenario.
 * Returns computed CPF usage, accrued interest, and sale analysis from backend.
 */
export function useCpfHousingUsageQuery(scenarioId: string | undefined) {
  return useQuery({
    queryKey: CPF_HOUSING_USAGE_QUERY_KEY(scenarioId ?? ''),
    queryFn: () => cpfApi.getCPFHousingUsage(scenarioId!),
    enabled: !!scenarioId,
    staleTime: 30_000, // 30 seconds - housing usage doesn't change often
  })
}

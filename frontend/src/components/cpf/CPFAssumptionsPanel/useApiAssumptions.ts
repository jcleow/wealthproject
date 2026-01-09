'use client'

import { useState, useEffect, useCallback } from 'react'
import { useCpfAssumptionsQuery, useUpdateCpfAssumptionsMutation } from '@/hooks/queries'
import type {
  CPFAssumptions,
  CPFAssumptionsResponse,
  CPFAssumptionsUpdateInput,
  AssumptionPreset,
} from '@/types/cpf'
import { DEFAULT_CPF_ASSUMPTIONS } from '@/types/cpf'

/**
 * Convert API response (string decimals) to UI format (numbers)
 */
function apiToLocal(response: CPFAssumptionsResponse): CPFAssumptions {
  return {
    interestRates: {
      oa: parseFloat(response.interestRates.oa),
      sa: parseFloat(response.interestRates.sa),
      ma: parseFloat(response.interestRates.ma),
      ra: parseFloat(response.interestRates.ra),
      extraFirst60k: parseFloat(response.interestRates.extraFirst60K),
      extraFirst30kAbove55: parseFloat(response.interestRates.extraFirst30KAbove55),
    },
    // TODO: inflationRate should come from global assumptions endpoint when available
    inflationRate: 0.02, // Placeholder - not user-configurable for CPF projections
    frsGrowthRate: parseFloat(response.growthRates.frs),
    // salaryGrowthRate is not used for CPF projections (contributions come from income entries)
    salaryGrowthRate: 0.03, // Placeholder - kept for type compatibility
    // Note: Employment status is derived from income entries in the timeline
    retirementAge: response.employment.retirementAge,
    cpfLifePlan: response.cpfLife.plan,
    payoutStartAge: response.cpfLife.payoutStartAge as 65 | 66 | 67 | 68 | 69 | 70,
    escalatingPlanGrowth: parseFloat(response.cpfLife.escalatingGrowth),
  }
}

/**
 * Convert UI format (numbers) to API input format (strings)
 */
function localToApi(local: CPFAssumptions, presetName: AssumptionPreset): CPFAssumptionsUpdateInput {
  return {
    interestRates: {
      oa: local.interestRates.oa.toString(),
      sa: local.interestRates.sa.toString(),
      ma: local.interestRates.ma.toString(),
      ra: local.interestRates.ra.toString(),
      extraFirst60K: local.interestRates.extraFirst60k.toString(),
      extraFirst30KAbove55: local.interestRates.extraFirst30kAbove55.toString(),
    },
    growthRates: {
      // Note: inflationRate and salaryGrowthRate are not stored in CPF assumptions
      // inflationRate will come from global assumptions in the future
      // salaryGrowthRate is not used (contributions derived from income entries)
      frs: local.frsGrowthRate.toString(),
    },
    employment: {
      // Note: Employment status is derived from income entries in the timeline
      retirementAge: local.retirementAge,
    },
    cpfLife: {
      plan: local.cpfLifePlan,
      payoutStartAge: local.payoutStartAge,
      escalatingGrowth: local.escalatingPlanGrowth.toString(),
    },
    presetName,
  }
}

interface UseApiAssumptionsOptions {
  /** CPF account ID to fetch/update assumptions for */
  cpfAccountId: string | undefined
  /** Callback when assumptions change (for recalculating projections) */
  onAssumptionsChange?: (assumptions: CPFAssumptions) => void
  /** Debounce delay for saving changes (ms). Set to 0 for immediate save. */
  saveDebounceMs?: number
}

interface UseApiAssumptionsReturn {
  /** Current assumptions (local state, updated optimistically) */
  assumptions: CPFAssumptions
  /** Update assumptions locally (will auto-save to API) */
  setAssumptions: (assumptions: CPFAssumptions) => void
  /** Current active preset */
  presetName: AssumptionPreset
  /** Set the preset (will update assumptions) */
  setPresetName: (preset: AssumptionPreset) => void
  /** Whether initial data is loading */
  isLoading: boolean
  /** Whether a save is in progress */
  isSaving: boolean
  /** Error from fetch or save */
  error: Error | null
  /** Force refetch from server */
  refetch: () => void
}

/**
 * Hook that connects CPFAssumptionsPanel to the backend API.
 * Provides the same interface as local state management but persists to server.
 *
 * @example
 * ```tsx
 * const { assumptions, setAssumptions, isLoading } = useApiAssumptions({
 *   cpfAccountId: account?.id,
 * })
 *
 * if (isLoading) return <Skeleton />
 *
 * return (
 *   <CPFAssumptionsPanel
 *     assumptions={assumptions}
 *     onChange={setAssumptions}
 *   />
 * )
 * ```
 */
export function useApiAssumptions({
  cpfAccountId,
  onAssumptionsChange,
  saveDebounceMs = 500,
}: UseApiAssumptionsOptions): UseApiAssumptionsReturn {
  // Local state for optimistic updates
  const [localAssumptions, setLocalAssumptions] = useState<CPFAssumptions>(DEFAULT_CPF_ASSUMPTIONS)
  const [presetName, setPresetName] = useState<AssumptionPreset>('official')
  const [saveTimeoutId, setSaveTimeoutId] = useState<NodeJS.Timeout | null>(null)

  // Query for fetching assumptions
  const {
    data: apiData,
    isLoading,
    error: fetchError,
    refetch,
  } = useCpfAssumptionsQuery(cpfAccountId)

  // Mutation for saving assumptions
  const {
    mutate: saveAssumptions,
    isPending: isSaving,
    error: saveError,
  } = useUpdateCpfAssumptionsMutation()

  // Sync API data to local state when it arrives
  useEffect(() => {
    if (apiData) {
      const localData = apiToLocal(apiData)
      setLocalAssumptions(localData)
      setPresetName(apiData.presetName)
      onAssumptionsChange?.(localData)
    }
  }, [apiData, onAssumptionsChange])

  // Save to API with debounce
  const triggerSave = useCallback(
    (assumptions: CPFAssumptions, preset: AssumptionPreset) => {
      if (!cpfAccountId) return

      // Clear any pending save
      if (saveTimeoutId) {
        clearTimeout(saveTimeoutId)
      }

      if (saveDebounceMs === 0) {
        // Immediate save
        saveAssumptions({
          cpfAccountId,
          updates: localToApi(assumptions, preset),
        })
      } else {
        // Debounced save
        const timeoutId = setTimeout(() => {
          saveAssumptions({
            cpfAccountId,
            updates: localToApi(assumptions, preset),
          })
        }, saveDebounceMs)
        setSaveTimeoutId(timeoutId)
      }
    },
    [cpfAccountId, saveAssumptions, saveDebounceMs, saveTimeoutId]
  )

  // Handle assumption changes (optimistic update + trigger save)
  const handleSetAssumptions = useCallback(
    (newAssumptions: CPFAssumptions) => {
      setLocalAssumptions(newAssumptions)
      setPresetName('custom')
      onAssumptionsChange?.(newAssumptions)
      triggerSave(newAssumptions, 'custom')
    },
    [onAssumptionsChange, triggerSave]
  )

  // Handle preset changes
  const handleSetPreset = useCallback(
    (preset: AssumptionPreset) => {
      setPresetName(preset)
      // Note: The CPFAssumptionsPanel handles applying preset values to assumptions
      // and calls onChange, which will trigger handleSetAssumptions
    },
    []
  )

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutId) {
        clearTimeout(saveTimeoutId)
      }
    }
  }, [saveTimeoutId])

  return {
    assumptions: localAssumptions,
    setAssumptions: handleSetAssumptions,
    presetName,
    setPresetName: handleSetPreset,
    isLoading,
    isSaving,
    error: (fetchError as Error | null) ?? (saveError as Error | null) ?? null,
    refetch,
  }
}

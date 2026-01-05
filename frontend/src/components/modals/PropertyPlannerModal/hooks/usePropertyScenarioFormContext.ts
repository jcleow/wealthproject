"use client"

import { useCallback } from 'react'
import { useFormContext, type UseFormReturn } from 'react-hook-form'
import type { PropertyScenarioFormData } from '@/lib/validations/propertyScenario'
import type { MortgageInputs, SaleInputs, PropertyType } from '@/app/property-planner/types'

// ============================================
// RAW FORM CONTEXT HOOK
// ============================================

/**
 * Type-safe hook to access PropertyScenarioFormData context.
 * Must be used within a FormProvider wrapping PropertyPlannerView.
 *
 * @throws Error if used outside of FormProvider
 */
export function usePropertyScenarioFormContext(): UseFormReturn<PropertyScenarioFormData> {
  const context = useFormContext<PropertyScenarioFormData>()
  if (!context) {
    throw new Error(
      'usePropertyScenarioFormContext must be used within a FormProvider. ' +
      'Ensure this component is rendered inside PropertyPlannerView.'
    )
  }
  return context
}

// ============================================
// MORTGAGE INPUTS HOOK
// ============================================

export interface PropertyFormInputsReturn {
  /** Current mortgage inputs */
  inputs: MortgageInputs
  /** Current property type */
  propertyType: PropertyType | null
  /**
   * Update a field in inputs
   * @param field - The field to update
   * @param value - The new value
   * @param shouldDirty - Whether this update marks the form dirty (default: true)
   */
  onChange: <K extends keyof MortgageInputs>(
    field: K,
    value: MortgageInputs[K],
    shouldDirty?: boolean
  ) => void
}

/**
 * Hook to get mortgage inputs and a typed onChange handler.
 * Replaces props: { inputs, onChange, propertyType }
 *
 * @example
 * ```tsx
 * function MyStep() {
 *   const { inputs, onChange, propertyType } = usePropertyFormInputs()
 *
 *   return (
 *     <input
 *       value={inputs.propertyPrice}
 *       onChange={(e) => onChange('propertyPrice', Number(e.target.value))}
 *     />
 *   )
 * }
 * ```
 */
export function usePropertyFormInputs(): PropertyFormInputsReturn {
  const { watch, setValue, getValues } = usePropertyScenarioFormContext()

  const inputs = watch('inputs')
  const propertyType = watch('propertyType')

  const onChange = useCallback(<K extends keyof MortgageInputs>(
    field: K,
    value: MortgageInputs[K],
    shouldDirty = true
  ) => {
    const currentInputs = getValues('inputs')
    setValue('inputs', { ...currentInputs, [field]: value }, { shouldDirty })
  }, [setValue, getValues])

  return { inputs, onChange, propertyType }
}

// ============================================
// SALE INPUTS HOOK
// ============================================

export interface PropertyFormSaleInputsReturn {
  /** Current sale inputs */
  saleInputs: SaleInputs
  /**
   * Update a field in saleInputs
   * @param field - The field to update
   * @param value - The new value
   * @param shouldDirty - Whether this update marks the form dirty (default: true)
   */
  onSaleInputChange: <K extends keyof SaleInputs>(
    field: K,
    value: SaleInputs[K],
    shouldDirty?: boolean
  ) => void
}

/**
 * Hook to get sale inputs and a typed onChange handler.
 * Replaces props: { saleInputs, onSaleInputChange }
 *
 * @example
 * ```tsx
 * function SaleForm() {
 *   const { saleInputs, onSaleInputChange } = usePropertyFormSaleInputs()
 *
 *   return (
 *     <input
 *       value={saleInputs.expectedSalePrice}
 *       onChange={(e) => onSaleInputChange('expectedSalePrice', Number(e.target.value))}
 *     />
 *   )
 * }
 * ```
 */
export function usePropertyFormSaleInputs(): PropertyFormSaleInputsReturn {
  const { watch, setValue, getValues } = usePropertyScenarioFormContext()

  const saleInputs = watch('saleInputs')

  const onSaleInputChange = useCallback(<K extends keyof SaleInputs>(
    field: K,
    value: SaleInputs[K],
    shouldDirty = true
  ) => {
    const currentSaleInputs = getValues('saleInputs')
    setValue('saleInputs', { ...currentSaleInputs, [field]: value }, { shouldDirty })
  }, [setValue, getValues])

  return { saleInputs, onSaleInputChange }
}

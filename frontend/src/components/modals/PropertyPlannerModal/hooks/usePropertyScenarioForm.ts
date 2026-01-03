"use client"

import { useCallback } from 'react'
import { useForm, type UseFormReturn } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'

import type { PropertyScenario, MortgageInputs, SaleInputs, PropertyType } from '@/app/property-planner/types'
import { propertyScenarioFormSchema, type PropertyScenarioFormData } from '@/lib/validations/propertyScenario'
import { defaultInputsByType, DEFAULT_SALE_FEES } from '@/app/property-planner/hooks/constants'

// ============================================
// HELPER FUNCTIONS
// ============================================

function getDefaultSaleDate(loanStartMonth: string): string {
  const startDate = new Date(loanStartMonth + '-01')
  startDate.setFullYear(startDate.getFullYear() + 10)
  return startDate.toISOString().slice(0, 7)
}

function getDefaultSaleInputs(loanStartMonth: string, propertyPrice: number): SaleInputs {
  return {
    expectedSaleDate: getDefaultSaleDate(loanStartMonth),
    expectedSalePrice: Math.round(propertyPrice * 1.3),
    fees: DEFAULT_SALE_FEES.map(f => ({ ...f })),
  }
}

/**
 * Create default form values for a new scenario
 */
export function createDefaultFormValues(): PropertyScenarioFormData {
  const defaultInputs = defaultInputsByType['hdb-resale']
  return {
    name: '',
    propertyType: null,
    purchaseIcon: 'home',
    purchaseIconColor: '#6366f1',
    purchaseIconSearch: '',
    saleIcon: 'banknote',
    saleIconColor: '#10b981',
    saleIconSearch: '',
    inputs: defaultInputs,
    saleInputs: getDefaultSaleInputs(defaultInputs.loanStartMonth, defaultInputs.propertyPrice),
  }
}

/**
 * Map a PropertyScenario to form data
 */
export function mapScenarioToFormData(scenario: PropertyScenario): PropertyScenarioFormData {
  return {
    name: scenario.name,
    propertyType: scenario.propertyType,
    purchaseIcon: scenario.purchaseIcon || 'home',
    purchaseIconColor: scenario.purchaseIconColor || '#6366f1',
    purchaseIconSearch: '',
    saleIcon: scenario.saleIcon || 'banknote',
    saleIconColor: scenario.saleIconColor || '#10b981',
    saleIconSearch: '',
    inputs: scenario.inputs,
    saleInputs: scenario.saleInputs,
  }
}

// ============================================
// HOOK OPTIONS
// ============================================

export interface UsePropertyScenarioFormOptions {
  /** Optional scenario to initialize with (for edit mode) */
  scenario?: PropertyScenario
}

export interface UsePropertyScenarioFormReturn {
  /** The React Hook Form instance */
  form: UseFormReturn<PropertyScenarioFormData>

  /** Whether the form has unsaved changes */
  isDirty: boolean

  /** Whether the form is currently submitting */
  isSubmitting: boolean

  /** Current form values */
  values: PropertyScenarioFormData

  /** Initialize form with a scenario (entering edit mode) */
  initializeWithScenario: (scenario: PropertyScenario) => void

  /** Reset to new scenario defaults (exiting edit mode) */
  resetToDefaults: () => void

  /** Mark current values as saved (clears dirty state without resetting values) */
  markAsSaved: () => void

  /** Update a single field in inputs (shouldDirty defaults to true) */
  updateInput: <K extends keyof MortgageInputs>(field: K, value: MortgageInputs[K], shouldDirty?: boolean) => void

  /** Update a single field in saleInputs (shouldDirty defaults to true) */
  updateSaleInput: <K extends keyof SaleInputs>(field: K, value: SaleInputs[K], shouldDirty?: boolean) => void

  /** Update property type and reset inputs to type defaults */
  updatePropertyType: (type: PropertyType) => void
}

// ============================================
// MAIN HOOK
// ============================================

export function usePropertyScenarioForm(
  options: UsePropertyScenarioFormOptions = {}
): UsePropertyScenarioFormReturn {
  const { scenario } = options

  const form = useForm<PropertyScenarioFormData>({
    resolver: zodResolver(propertyScenarioFormSchema),
    defaultValues: scenario ? mapScenarioToFormData(scenario) : createDefaultFormValues(),
  })

  const { formState, setValue, getValues, reset, watch } = form
  const values = watch()

  /**
   * Initialize the form with an existing scenario.
   * Used when entering edit mode.
   */
  const initializeWithScenario = useCallback((scenarioToEdit: PropertyScenario) => {
    reset(mapScenarioToFormData(scenarioToEdit))
  }, [reset])

  /**
   * Reset form to default values.
   * Used when exiting edit mode or starting fresh.
   */
  const resetToDefaults = useCallback(() => {
    reset(createDefaultFormValues())
  }, [reset])

  /**
   * Mark current values as saved, clearing isDirty while preserving the form state.
   * Called after a successful save when the user wants to stay in edit mode.
   */
  const markAsSaved = useCallback(() => {
    const currentValues = getValues()
    // Reset with current values as the new baseline (defaultValues)
    // This clears isDirty while keeping all values intact
    reset(currentValues, {
      keepErrors: false,      // Clear any validation errors
      keepDirty: false,       // Clear dirty state (this is the goal)
      keepValues: true,       // Keep the current values visible
      keepDefaultValues: false, // Update defaultValues to current values
    })
  }, [getValues, reset])

  /**
   * Update a field in the inputs object
   * @param field - The field to update
   * @param value - The new value
   * @param shouldDirty - Whether this update should mark the form as dirty (default: true)
   *                      Set to false for derived/computed values that auto-update
   */
  const updateInput = useCallback(<K extends keyof MortgageInputs>(
    field: K,
    value: MortgageInputs[K],
    shouldDirty = true
  ) => {
    const currentInputs = getValues('inputs')
    setValue('inputs', { ...currentInputs, [field]: value }, { shouldDirty })
  }, [setValue, getValues])

  /**
   * Update a field in the saleInputs object
   * @param field - The field to update
   * @param value - The new value
   * @param shouldDirty - Whether this update should mark the form as dirty (default: true)
   */
  const updateSaleInput = useCallback(<K extends keyof SaleInputs>(
    field: K,
    value: SaleInputs[K],
    shouldDirty = true
  ) => {
    const currentSaleInputs = getValues('saleInputs')
    setValue('saleInputs', { ...currentSaleInputs, [field]: value }, { shouldDirty })
  }, [setValue, getValues])

  /**
   * Update property type and reset inputs to type-specific defaults
   */
  const updatePropertyType = useCallback((type: PropertyType) => {
    const typeDefaults = defaultInputsByType[type]
    const saleDefaults = getDefaultSaleInputs(typeDefaults.loanStartMonth, typeDefaults.propertyPrice)

    setValue('propertyType', type, { shouldDirty: true })
    setValue('inputs', typeDefaults, { shouldDirty: true })
    setValue('saleInputs', saleDefaults, { shouldDirty: true })
  }, [setValue])

  return {
    form,
    isDirty: formState.isDirty,
    isSubmitting: formState.isSubmitting,
    values,
    initializeWithScenario,
    resetToDefaults,
    markAsSaved,
    updateInput,
    updateSaleInput,
    updatePropertyType,
  }
}

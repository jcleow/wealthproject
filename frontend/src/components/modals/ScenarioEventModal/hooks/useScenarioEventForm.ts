import { useEffect, useRef, useCallback } from 'react'
import { useForm, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import type { ScenarioEvent, ScenarioImpact } from '@/types/scenario'
import {
  scenarioEventFormSchema,
  defaultScenarioEventFormValues,
  defaultScenarioImpact,
  type ScenarioEventFormData,
  type ScenarioImpactFormData,
} from '@/lib/validations/scenarioEvent'

const normalizeMonth = (value?: string | null) => (value ? value.slice(0, 7) : '')

interface UseScenarioEventFormOptions {
  hydratedEvent: ScenarioEvent | undefined
  isOpen: boolean
}

// Backward-compatible form state type (matches old interface)
export interface ScenarioEventFormState {
  name: string
  occursOn: string
  description: string
  displayIcon: string
  iconColor: string
  isIncluded: boolean
  impacts: ScenarioImpact[]
  iconSearch: string
}

export interface UseScenarioEventFormReturn {
  form: ScenarioEventFormState
  setForm: React.Dispatch<React.SetStateAction<ScenarioEventFormState>>
  updateImpact: (index: number, patch: Partial<ScenarioImpact>) => void
  addImpact: () => void
  removeImpact: (index: number) => void
}

// Map ScenarioImpact to form schema type
function mapImpactToFormData(impact: ScenarioImpact): ScenarioImpactFormData {
  return {
    id: impact.id,
    impactKind: impact.impactKind,
    targetType: impact.targetType,
    parentId: impact.parentId,
    amount: impact.amount,
    currency: impact.currency,
    cadence: impact.cadence,
    startMonth: impact.startMonth,
    endMonth: impact.endMonth,
    name: impact.name,
    frequency: impact.frequency,
    notes: impact.notes,
    category: impact.category,
    growthRate: impact.growthRate,
    growthStrategy: impact.growthStrategy,
    interestRate: impact.interestRate,
    minimumPayment: impact.minimumPayment,
    personId: impact.personId,
  }
}

// Map form data back to ScenarioImpact
function mapFormDataToImpact(formData: ScenarioImpactFormData): ScenarioImpact {
  return {
    id: formData.id,
    impactKind: formData.impactKind,
    targetType: formData.targetType,
    parentId: formData.parentId,
    amount: formData.amount,
    currency: formData.currency,
    cadence: formData.cadence,
    startMonth: formData.startMonth,
    endMonth: formData.endMonth,
    name: formData.name,
    frequency: formData.frequency,
    notes: formData.notes,
    category: formData.category,
    growthRate: formData.growthRate,
    growthStrategy: formData.growthStrategy,
    interestRate: formData.interestRate,
    minimumPayment: formData.minimumPayment,
    personId: formData.personId,
  }
}

export function useScenarioEventForm({
  hydratedEvent,
  isOpen,
}: UseScenarioEventFormOptions): UseScenarioEventFormReturn {
  const prevOccursOn = useRef<string>('')

  // React Hook Form setup
  const rhf = useForm<ScenarioEventFormData>({
    resolver: zodResolver(scenarioEventFormSchema),
    defaultValues: defaultScenarioEventFormValues,
  })

  const { append, remove, update } = useFieldArray({
    control: rhf.control,
    name: 'impacts',
  })

  // Hydrate form when event changes
  useEffect(() => {
    if (!isOpen) return

    if (hydratedEvent) {
      const normalizedImpacts =
        hydratedEvent.impacts && hydratedEvent.impacts.length > 0
          ? hydratedEvent.impacts.map((impact) => mapImpactToFormData({
              ...impact,
              startMonth: normalizeMonth(impact.startMonth) || normalizeMonth(hydratedEvent.occursOn),
              endMonth: normalizeMonth(impact.endMonth) || undefined,
            }))
          : [{ ...defaultScenarioImpact, startMonth: normalizeMonth(hydratedEvent.occursOn) }]

      rhf.reset({
        name: hydratedEvent.name ?? '',
        occursOn: normalizeMonth(hydratedEvent.occursOn),
        description: hydratedEvent.description ?? '',
        displayIcon: hydratedEvent.displayIcon ?? 'sparkles',
        iconColor: hydratedEvent.displayColor ?? '#0ea5e9',
        isIncluded: hydratedEvent.isIncluded ?? true,
        impacts: normalizedImpacts,
        iconSearch: hydratedEvent.displayIcon ?? '',
      })
      prevOccursOn.current = hydratedEvent.occursOn ?? ''
    } else {
      rhf.reset(defaultScenarioEventFormValues)
      prevOccursOn.current = ''
    }
  }, [hydratedEvent, isOpen, rhf])

  // Watch occursOn for syncing impact dates
  const occursOn = rhf.watch('occursOn')
  const impactsFormData = rhf.watch('impacts')

  // Keep impacts aligned to occurs_on unless user overrides
  // Also clamp any dates that are now before the new occursOn
  useEffect(() => {
    if (!occursOn) return
    const month = occursOn.slice(0, 7)

    impactsFormData.forEach((impact, index) => {
      let updatedStartMonth = impact.startMonth
      let updatedEndMonth = impact.endMonth

      // If startMonth is empty or matches the previous occursOn, sync it
      if (!impact.startMonth || impact.startMonth === prevOccursOn.current.slice(0, 7)) {
        updatedStartMonth = month
      }
      // If startMonth is before the new occursOn, clamp it
      else if (impact.startMonth < month) {
        updatedStartMonth = month
      }

      // If endMonth exists and is before the new startMonth, clamp it
      if (updatedEndMonth && updatedEndMonth < updatedStartMonth) {
        updatedEndMonth = updatedStartMonth
      }

      // Only update if something changed
      if (updatedStartMonth !== impact.startMonth || updatedEndMonth !== impact.endMonth) {
        update(index, { ...impact, startMonth: updatedStartMonth, endMonth: updatedEndMonth })
      }
    })

    prevOccursOn.current = occursOn
  }, [occursOn, impactsFormData, update])

  // Build backward-compatible form state from RHF
  const formValues = rhf.watch()
  const form: ScenarioEventFormState = {
    name: formValues.name,
    occursOn: formValues.occursOn,
    description: formValues.description,
    displayIcon: formValues.displayIcon,
    iconColor: formValues.iconColor,
    isIncluded: formValues.isIncluded,
    impacts: formValues.impacts.map(mapFormDataToImpact),
    iconSearch: formValues.iconSearch,
  }

  // Backward-compatible setForm that updates RHF state
  const setForm = useCallback((updater: React.SetStateAction<ScenarioEventFormState>) => {
    const currentValues = rhf.getValues()
    const currentFormState: ScenarioEventFormState = {
      name: currentValues.name,
      occursOn: currentValues.occursOn,
      description: currentValues.description,
      displayIcon: currentValues.displayIcon,
      iconColor: currentValues.iconColor,
      isIncluded: currentValues.isIncluded,
      impacts: currentValues.impacts.map(mapFormDataToImpact),
      iconSearch: currentValues.iconSearch,
    }

    const newState = typeof updater === 'function' ? updater(currentFormState) : updater

    // Update each field
    rhf.setValue('name', newState.name, { shouldDirty: true })
    rhf.setValue('occursOn', newState.occursOn, { shouldDirty: true })
    rhf.setValue('description', newState.description, { shouldDirty: true })
    rhf.setValue('displayIcon', newState.displayIcon, { shouldDirty: true })
    rhf.setValue('iconColor', newState.iconColor, { shouldDirty: true })
    rhf.setValue('isIncluded', newState.isIncluded, { shouldDirty: true })
    rhf.setValue('iconSearch', newState.iconSearch, { shouldDirty: true })
    rhf.setValue('impacts', newState.impacts.map(mapImpactToFormData), { shouldDirty: true })
  }, [rhf])

  const updateImpact = useCallback((index: number, patch: Partial<ScenarioImpact>) => {
    const current = rhf.getValues(`impacts.${index}`)
    if (current) {
      update(index, { ...current, ...patch } as ScenarioImpactFormData)
    }
  }, [rhf, update])

  const addImpact = useCallback(() => {
    const currentOccursOn = rhf.getValues('occursOn')
    append({
      ...defaultScenarioImpact,
      startMonth: currentOccursOn ? currentOccursOn.slice(0, 7) : defaultScenarioImpact.startMonth,
    })
  }, [rhf, append])

  const removeImpact = useCallback((index: number) => {
    remove(index)
  }, [remove])

  return {
    form,
    setForm,
    updateImpact,
    addImpact,
    removeImpact,
  }
}

export { defaultScenarioImpact as defaultImpact, normalizeMonth }

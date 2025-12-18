import { useState, useEffect, useRef, useCallback } from 'react'
import type { ScenarioEvent, ScenarioImpact } from '@/types/scenario'

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

const defaultImpact: ScenarioImpact = {
  targetType: 'asset',
  impactKind: 'delta',
  amount: 0,
  currency: 'SGD',
  cadence: 'monthly',
  startMonth: '',
  notes: '',
}

const initialFormState: ScenarioEventFormState = {
  name: '',
  occursOn: '',
  description: '',
  displayIcon: 'sparkles',
  iconColor: '#0ea5e9',
  isIncluded: true,
  impacts: [{ ...defaultImpact }],
  iconSearch: '',
}

const normalizeMonth = (value?: string | null) => (value ? value.slice(0, 7) : '')

interface UseScenarioEventFormOptions {
  hydratedEvent: ScenarioEvent | undefined
  isOpen: boolean
}

export interface UseScenarioEventFormReturn {
  form: ScenarioEventFormState
  setForm: React.Dispatch<React.SetStateAction<ScenarioEventFormState>>
  updateImpact: (index: number, patch: Partial<ScenarioImpact>) => void
  addImpact: () => void
  removeImpact: (index: number) => void
}

export function useScenarioEventForm({
  hydratedEvent,
  isOpen,
}: UseScenarioEventFormOptions): UseScenarioEventFormReturn {
  const [form, setForm] = useState<ScenarioEventFormState>(initialFormState)
  const prevOccursOn = useRef<string>('')

  // Hydrate form when event changes
  useEffect(() => {
    if (!isOpen) return

    if (hydratedEvent) {
      const normalizedImpacts =
        hydratedEvent.impacts && hydratedEvent.impacts.length > 0
          ? hydratedEvent.impacts.map((impact) => ({
              ...impact,
              startMonth: normalizeMonth(impact.startMonth) || normalizeMonth(hydratedEvent.occursOn),
              endMonth: normalizeMonth(impact.endMonth) || undefined,
            }))
          : [{ ...defaultImpact, startMonth: normalizeMonth(hydratedEvent.occursOn) }]

      setForm({
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
      setForm(initialFormState)
      prevOccursOn.current = ''
    }
  }, [hydratedEvent, isOpen])

  // Keep impacts aligned to occurs_on unless user overrides
  useEffect(() => {
    if (!form.occursOn) return
    const month = form.occursOn.slice(0, 7)
    setForm((prev) => ({
      ...prev,
      impacts: prev.impacts.map((impact) => {
        if (!impact.startMonth || impact.startMonth === prevOccursOn.current.slice(0, 7)) {
          return { ...impact, startMonth: month }
        }
        return impact
      }),
    }))
    prevOccursOn.current = form.occursOn
  }, [form.occursOn])

  const updateImpact = useCallback((index: number, patch: Partial<ScenarioImpact>) => {
    setForm((prev) => ({
      ...prev,
      impacts: prev.impacts.map((impact, idx) => (idx === index ? { ...impact, ...patch } : impact)),
    }))
  }, [])

  const addImpact = useCallback(() => {
    setForm((prev) => ({
      ...prev,
      impacts: [
        ...prev.impacts,
        { ...defaultImpact, startMonth: prev.occursOn ? prev.occursOn.slice(0, 7) : defaultImpact.startMonth },
      ],
    }))
  }, [])

  const removeImpact = useCallback((index: number) => {
    setForm((prev) => ({ ...prev, impacts: prev.impacts.filter((_, idx) => idx !== index) }))
  }, [])

  return {
    form,
    setForm,
    updateImpact,
    addImpact,
    removeImpact,
  }
}

export { defaultImpact, normalizeMonth }

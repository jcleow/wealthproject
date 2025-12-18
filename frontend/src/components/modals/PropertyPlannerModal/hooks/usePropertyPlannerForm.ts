"use client"

import { useEffect, useState, useCallback } from 'react'
import type { MortgageInputs, PropertyPlannerType, PropertyScenarioRecord } from '@/types/property'
import type { Asset, Liability } from '@/types/financial'
import { propertyApi } from '@/api/financial'

const DEFAULT_INPUTS: MortgageInputs = {
  propertyType: 'hdb',
  propertyPrice: 0,
  loanAmount: 0,
  loanTermYears: 25,
  borrowerType: 'single',
  loanStartMonth: '2024-06',
  fixedYears: 5,
  fixedRate: 2.5,
  floatingRate: 4.0,
  householdIncome: 10000,
  otherDebt: 500,
}

const STORAGE_KEY = 'property_planner_draft'
const SCENARIO_STORAGE_KEY = 'property_planner_scenario_id'

export const LOCATION_TAGS: Record<PropertyPlannerType, string> = {
  hdb: '4-Room BTO in Tampines North',
  condo: 'City-fringe condo, One-North',
  landed: 'Landed home in Serangoon',
}

export const areInputsValid = (inputs: MortgageInputs) =>
  inputs.loanAmount > 0 &&
  inputs.loanTermYears > 0 &&
  inputs.loanStartMonth.trim() !== '' &&
  inputs.fixedYears > 0 &&
  inputs.fixedRate > 0 &&
  inputs.floatingRate > 0 &&
  inputs.householdIncome > 0

export interface UsePropertyPlannerFormOptions {
  isOpen: boolean
  prefill?: { scenarioId?: string; assetId?: string; liabilityId?: string }
}

export interface UsePropertyPlannerFormReturn {
  // Form state
  inputs: MortgageInputs
  setInputs: React.Dispatch<React.SetStateAction<MortgageInputs>>
  selectedType: PropertyPlannerType
  setSelectedType: React.Dispatch<React.SetStateAction<PropertyPlannerType>>
  locationDraft: string
  setLocationDraft: React.Dispatch<React.SetStateAction<string>>

  // View state
  isComplete: boolean
  setIsComplete: React.Dispatch<React.SetStateAction<boolean>>

  // Save state
  isSavingDraft: boolean
  setIsSavingDraft: React.Dispatch<React.SetStateAction<boolean>>
  lastSavedAt: string | null
  setLastSavedAt: React.Dispatch<React.SetStateAction<string | null>>

  // Scenario state
  scenarioId: string | null
  setScenarioId: React.Dispatch<React.SetStateAction<string | null>>
  prefillScenario: PropertyScenarioRecord | null
  setPrefillScenario: React.Dispatch<React.SetStateAction<PropertyScenarioRecord | null>>

  // Override flags
  overrideFlags: OverrideFlags
  setOverrideFlags: React.Dispatch<React.SetStateAction<OverrideFlags>>

  // Helpers
  handleInputChange: (field: keyof MortgageInputs, value: string | number) => void
  hasValidInputs: boolean
}

export interface OverrideFlags {
  price?: boolean
  down?: boolean
  loan?: boolean
  rate?: boolean
  tenure?: boolean
}

export function usePropertyPlannerForm({ isOpen }: UsePropertyPlannerFormOptions): UsePropertyPlannerFormReturn {
  const [selectedType, setSelectedType] = useState<PropertyPlannerType>('hdb')
  const [inputs, setInputs] = useState<MortgageInputs>({ ...DEFAULT_INPUTS })
  const [isComplete, setIsComplete] = useState(false)
  const [isSavingDraft, setIsSavingDraft] = useState(false)
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null)
  const [, setSavedSnapshot] = useState<string | null>(null)
  const [locationDraft, setLocationDraft] = useState(LOCATION_TAGS.hdb)
  const [scenarioId, setScenarioId] = useState<string | null>(null)
  const [prefillScenario, setPrefillScenario] = useState<PropertyScenarioRecord | null>(null)
  const [overrideFlags, setOverrideFlags] = useState<OverrideFlags>({})

  // Load from localStorage on open
  useEffect(() => {
    if (!isOpen) return
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      const savedScenarioId = localStorage.getItem(SCENARIO_STORAGE_KEY)
      if (savedScenarioId) {
        setScenarioId(savedScenarioId)
        setIsComplete(true)
      }
      if (stored) {
        const parsed: MortgageInputs = JSON.parse(stored)
        setInputs(parsed)
        setSelectedType(parsed.propertyType)
        setSavedSnapshot(stored)
      } else {
        setInputs({ ...DEFAULT_INPUTS })
        setSavedSnapshot(JSON.stringify(DEFAULT_INPUTS))
        setLocationDraft(LOCATION_TAGS[DEFAULT_INPUTS.propertyType])
      }
    } catch {
      setInputs({ ...DEFAULT_INPUTS })
    }
  }, [isOpen])

  const hasValidInputs = areInputsValid(inputs)

  // Auto-show overview when required inputs are valid
  useEffect(() => {
    if (!isOpen) return
    if (hasValidInputs && !isComplete) {
      setIsComplete(true)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, hasValidInputs])

  // Sync propertyType with selectedType
  useEffect(() => {
    setInputs((prev) => ({ ...prev, propertyType: selectedType }))
  }, [selectedType])

  const handleInputChange = useCallback((field: keyof MortgageInputs, value: string | number) => {
    setInputs((prev) => ({ ...prev, [field]: value }))
    if (field === 'propertyType') {
      setSelectedType(value as PropertyPlannerType)
      setLocationDraft(LOCATION_TAGS[value as PropertyPlannerType])
    }
  }, [])

  return {
    inputs,
    setInputs,
    selectedType,
    setSelectedType,
    locationDraft,
    setLocationDraft,
    isComplete,
    setIsComplete,
    isSavingDraft,
    setIsSavingDraft,
    lastSavedAt,
    setLastSavedAt,
    scenarioId,
    setScenarioId,
    prefillScenario,
    setPrefillScenario,
    overrideFlags,
    setOverrideFlags,
    handleInputChange,
    hasValidInputs,
  }
}

export interface UsePropertyPrefillOptions {
  isOpen: boolean
  prefill?: { scenarioId?: string; assetId?: string; liabilityId?: string }
  assets: Asset[]
  liabilities: Liability[]
  setInputs: React.Dispatch<React.SetStateAction<MortgageInputs>>
  setScenarioId: React.Dispatch<React.SetStateAction<string | null>>
  setPrefillScenario: (scenario: PropertyScenarioRecord | null) => void
  setOverrideFlags: React.Dispatch<React.SetStateAction<OverrideFlags>>
  setLocationDraft: React.Dispatch<React.SetStateAction<string>>
  setSelectedAssetId: React.Dispatch<React.SetStateAction<string>>
  setAssetInput: React.Dispatch<React.SetStateAction<string>>
  setSelectedLiabilityId: React.Dispatch<React.SetStateAction<string>>
  setLiabilityInput: React.Dispatch<React.SetStateAction<string>>
  setHelperMessage: React.Dispatch<React.SetStateAction<string | null>>
}

export function usePropertyPrefill({
  isOpen,
  prefill,
  assets,
  liabilities,
  setInputs,
  setScenarioId,
  setPrefillScenario,
  setOverrideFlags,
  setLocationDraft,
  setSelectedAssetId,
  setAssetInput,
  setSelectedLiabilityId,
  setLiabilityInput,
  setHelperMessage,
}: UsePropertyPrefillOptions) {
  useEffect(() => {
    const hydratePrefill = async () => {
      if (!prefill?.scenarioId || !isOpen) return
      try {
        const scenario = await propertyApi.getPropertyScenario(prefill.scenarioId)
        setScenarioId(scenario.id)
        setPrefillScenario(scenario)
        setInputs((prev) => ({
          ...prev,
          propertyPrice: scenario.propertyPrice || prev.propertyPrice,
          loanAmount: scenario.loanAmount || prev.loanAmount,
          loanTermYears: scenario.loanTenure || prev.loanTermYears,
          floatingRate: scenario.interestRate || prev.floatingRate,
          propertyType: (scenario.propertyType as PropertyPlannerType) || prev.propertyType,
        }))
        setOverrideFlags({
          price: !scenario.propertyPrice,
          down: !scenario.downPayment,
          loan: !scenario.loanAmount,
          rate: !scenario.interestRate,
          tenure: !scenario.loanTenure,
        })
        if (scenario.headline) {
          setLocationDraft(scenario.headline)
        }
        if (prefill.assetId) {
          setSelectedAssetId(prefill.assetId)
          const asset = assets.find((a) => a.id === prefill.assetId)
          if (asset) {
            setAssetInput(asset.name)
          }
        }
        if (prefill.liabilityId) {
          setSelectedLiabilityId(prefill.liabilityId)
          const li = liabilities.find((l) => l.id === prefill.liabilityId)
          if (li) {
            setLiabilityInput(li.name)
          }
        }
      } catch (error) {
        console.error('Failed to prefill property scenario', error)
        setHelperMessage('Unable to load property scenario.')
      }
    }
    void hydratePrefill()
  }, [prefill, isOpen, assets, liabilities, setInputs, setScenarioId, setPrefillScenario, setOverrideFlags, setLocationDraft, setSelectedAssetId, setAssetInput, setSelectedLiabilityId, setLiabilityInput, setHelperMessage])
}

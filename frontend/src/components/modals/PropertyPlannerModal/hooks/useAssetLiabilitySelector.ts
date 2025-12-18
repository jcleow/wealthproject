"use client"

import { useEffect, useState, useCallback } from 'react'
import type { Asset, Liability } from '@/types/financial'
import type { MortgageInputs, PropertyPlannerType, PropertyScenarioRecord } from '@/types/property'
import { assetsApi, liabilitiesApi } from '@/api/financial'
import { LOCATION_TAGS, type OverrideFlags } from './usePropertyPlannerForm'

export interface UseAssetLiabilitySelectorOptions {
  isOpen: boolean
  selectedType: PropertyPlannerType
  prefillScenario: PropertyScenarioRecord | null
  setInputs: React.Dispatch<React.SetStateAction<MortgageInputs>>
  setOverrideFlags: React.Dispatch<React.SetStateAction<OverrideFlags>>
  setLocationDraft: React.Dispatch<React.SetStateAction<string>>
  setHelperMessage: React.Dispatch<React.SetStateAction<string | null>>
}

export interface UseAssetLiabilitySelectorReturn {
  // Data
  assets: Asset[]
  setAssets: React.Dispatch<React.SetStateAction<Asset[]>>
  liabilities: Liability[]
  setLiabilities: React.Dispatch<React.SetStateAction<Liability[]>>

  // Asset selection
  selectedAssetId: string
  setSelectedAssetId: React.Dispatch<React.SetStateAction<string>>
  assetInput: string
  setAssetInput: React.Dispatch<React.SetStateAction<string>>
  handleAssetInput: (value: string) => void
  handleAssetFocus: () => void
  handleAssetBlur: () => void

  // Liability selection
  selectedLiabilityId: string
  setSelectedLiabilityId: React.Dispatch<React.SetStateAction<string>>
  liabilityInput: string
  setLiabilityInput: React.Dispatch<React.SetStateAction<string>>
  handleLiabilityInput: (value: string) => void
  handleLiabilityFocus: () => void
  handleLiabilityBlur: () => void
}

export function useAssetLiabilitySelector({
  isOpen,
  selectedType,
  prefillScenario,
  setInputs,
  setOverrideFlags,
  setLocationDraft,
  setHelperMessage,
}: UseAssetLiabilitySelectorOptions): UseAssetLiabilitySelectorReturn {
  const [assets, setAssets] = useState<Asset[]>([])
  const [liabilities, setLiabilities] = useState<Liability[]>([])
  const [selectedAssetId, setSelectedAssetId] = useState<string>('')
  const [assetInput, setAssetInput] = useState<string>('')
  const [assetInputCache, setAssetInputCache] = useState<string>('')
  const [selectedLiabilityId, setSelectedLiabilityId] = useState<string>('')
  const [liabilityInput, setLiabilityInput] = useState<string>('')
  const [liabilityInputCache, setLiabilityInputCache] = useState<string>('')

  // Load financial data on open
  useEffect(() => {
    if (!isOpen) return
    const loadFinancial = async () => {
      try {
        const [assetsResult, liabilitiesResult] = await Promise.all([
          assetsApi.listAssets({ limit: -1 }),
          liabilitiesApi.listLiabilities({ limit: -1 })
        ])
        const assetList = assetsResult.data
        const liabilityList = liabilitiesResult.data
        setAssets(assetList)
        setLiabilities(liabilityList)
        // preselect property asset if exists
        const propertyAsset = assetList.find((a) => a.category === 'property')
        if (propertyAsset) {
          setSelectedAssetId(propertyAsset.id)
          setAssetInput(propertyAsset.name)
          setLocationDraft(propertyAsset.name)
          setInputs((prev) => ({ ...prev, propertyPrice: propertyAsset.currentValue }))
          setOverrideFlags((prev) => ({ ...prev, price: false }))
        }
        const propertyLiability = liabilityList.find((l) => l.category === 'property')
        if (propertyLiability) {
          setSelectedLiabilityId(propertyLiability.id)
          setLiabilityInput(propertyLiability.name)
          setInputs((prev) => ({
            ...prev,
            loanAmount: propertyLiability.currentBalance,
            floatingRate: propertyLiability.interestRateApr || prev.floatingRate,
          }))
          setOverrideFlags((prev) => ({ ...prev, loan: false }))
        }
      } catch (error) {
        console.error('Failed to load financial items', error)
        setHelperMessage('Unable to load assets or liabilities right now.')
      }
    }
    void loadFinancial()
  }, [isOpen, setInputs, setOverrideFlags, setLocationDraft, setHelperMessage])

  const handleAssetInput = useCallback((value: string) => {
    setAssetInput(value)
    const match = assets.find((a) => a.name === value)
    if (match) {
      setSelectedAssetId(match.id)
      setLocationDraft(match.name)
      setInputs((prev) => {
        if (!prefillScenario?.propertyPrice || prev.propertyPrice <= 0) {
          return { ...prev, propertyPrice: match.currentValue }
        }
        return prev
      })
      setOverrideFlags((prev) => ({ ...prev, price: false }))
    } else {
      setSelectedAssetId('')
      setLocationDraft(value || LOCATION_TAGS[selectedType])
    }
  }, [assets, prefillScenario, selectedType, setInputs, setOverrideFlags, setLocationDraft])

  const handleAssetFocus = useCallback(() => {
    setAssetInputCache(assetInput)
    setAssetInput('')
  }, [assetInput])

  const handleAssetBlur = useCallback(() => {
    if (!assetInput && assetInputCache) {
      setAssetInput(assetInputCache)
    }
  }, [assetInput, assetInputCache])

  const handleLiabilityInput = useCallback((value: string) => {
    setLiabilityInput(value)
    const match = liabilities.find((l) => l.name === value)
    if (match) {
      setSelectedLiabilityId(match.id)
    } else {
      setSelectedLiabilityId('')
    }
  }, [liabilities])

  const handleLiabilityFocus = useCallback(() => {
    setLiabilityInputCache(liabilityInput)
    setLiabilityInput('')
  }, [liabilityInput])

  const handleLiabilityBlur = useCallback(() => {
    if (!liabilityInput && liabilityInputCache) {
      setLiabilityInput(liabilityInputCache)
    }
  }, [liabilityInput, liabilityInputCache])

  return {
    assets,
    setAssets,
    liabilities,
    setLiabilities,
    selectedAssetId,
    setSelectedAssetId,
    assetInput,
    setAssetInput,
    handleAssetInput,
    handleAssetFocus,
    handleAssetBlur,
    selectedLiabilityId,
    setSelectedLiabilityId,
    liabilityInput,
    setLiabilityInput,
    handleLiabilityInput,
    handleLiabilityFocus,
    handleLiabilityBlur,
  }
}

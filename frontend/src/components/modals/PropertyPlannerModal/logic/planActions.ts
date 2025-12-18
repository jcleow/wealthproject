import type { MortgageInputs, PropertyPlannerType } from '@/types/property'
import type { Asset, Liability } from '@/types/financial'
import { assetsApi, liabilitiesApi, expensesApi, propertyApi } from '@/api/financial'
import { calculateMortgage } from '@/utils/mortgage-calculations'

const STORAGE_KEY = 'property_planner_draft'
const SCENARIO_STORAGE_KEY = 'property_planner_scenario_id'

export interface SaveLinkParams {
  assetInput: string
  liabilityInput: string
  inputs: MortgageInputs
  selectedAssetId: string
  selectedLiabilityId: string
  assets: Asset[]
  liabilities: Liability[]
  selectedType: PropertyPlannerType
  locationDraft: string
  calculation: ReturnType<typeof calculateMortgage>
  setAssets: React.Dispatch<React.SetStateAction<Asset[]>>
  setLiabilities: React.Dispatch<React.SetStateAction<Liability[]>>
  setSelectedAssetId: React.Dispatch<React.SetStateAction<string>>
  setSelectedLiabilityId: React.Dispatch<React.SetStateAction<string>>
  setScenarioId: React.Dispatch<React.SetStateAction<string | null>>
  setHelperMessage: React.Dispatch<React.SetStateAction<string | null>>
}

export async function handleSaveLink({
  assetInput,
  liabilityInput,
  inputs,
  selectedAssetId,
  selectedLiabilityId,
  assets,
  liabilities,
  selectedType,
  locationDraft,
  calculation,
  setAssets,
  setLiabilities,
  setSelectedAssetId,
  setSelectedLiabilityId,
  setScenarioId,
  setHelperMessage,
}: SaveLinkParams): Promise<boolean> {
  if (!assetInput) {
    setHelperMessage('Enter or pick a property asset.')
    return false
  }
  if (!liabilityInput) {
    setHelperMessage('Enter or pick a property loan.')
    return false
  }
  if (inputs.loanAmount <= 0 || inputs.floatingRate <= 0 || inputs.loanTermYears <= 0) {
    setHelperMessage('Enter loan amount, rate, and tenure before generating.')
    return false
  }

  try {
    let assetId = selectedAssetId
    let liabilityId = selectedLiabilityId

    if (!assetId) {
      const created = await assetsApi.createAsset({
        name: assetInput.trim(),
        category: 'property',
        currentValue: inputs.loanAmount || 0,
        annualGrowthRate: 0,
        notes: '',
      })
      setAssets((prev) => [...prev, created])
      assetId = created.id
      setSelectedAssetId(assetId)
    }
    if (!liabilityId) {
      const createdLoan = await liabilitiesApi.createLiability({
        name: liabilityInput.trim(),
        category: 'property',
        currentBalance: inputs.loanAmount || 0,
        interestRateApr: inputs.floatingRate,
        minimumPayment: calculation.monthlyPayment || 0,
        notes: '',
      })
      setLiabilities((prev) => [...prev, createdLoan])
      liabilityId = createdLoan.id
      setSelectedLiabilityId(liabilityId)
    }

    const assetRecord = assets.find((a) => a.id === assetId)
    const liabilityRecord = liabilities.find((l) => l.id === liabilityId)
    const needsConvert =
      (assetRecord && assetRecord.category !== 'property') || (liabilityRecord && liabilityRecord.category !== 'property')
    if (needsConvert) {
      const confirmConvert = window.confirm('We will change the selected asset and loan category to property. Continue?')
      if (!confirmConvert) {
        setHelperMessage('Conversion cancelled by user.')
        return false
      }
    }
    if (assetRecord && assetRecord.category !== 'property') {
      const updated = await assetsApi.convertAssetToProperty(assetId)
      setAssets((prev) => prev.map((a) => (a.id === assetId ? updated : a)))
    }
    if (liabilityRecord && liabilityRecord.category !== 'property') {
      const updatedLi = await liabilitiesApi.convertLiabilityToProperty(liabilityId)
      setLiabilities((prev) => prev.map((l) => (l.id === liabilityId ? updatedLi : l)))
    }

    const headline = locationDraft || assetInput || 'Property scenario'
    const downPayment =
      inputs.propertyPrice > inputs.loanAmount && inputs.loanAmount > 0
        ? inputs.propertyPrice - inputs.loanAmount
        : Math.max(0, inputs.propertyPrice * 0.2)

    const scenario = await propertyApi.createPropertyScenario({
      propertyType: selectedType,
      headline,
      subheadline: '',
      propertyPrice: Math.max(1, inputs.propertyPrice),
      downPayment: Math.max(1, downPayment),
      loanAmount: Math.max(1, inputs.loanAmount),
      interestRate: Math.max(0.01, inputs.floatingRate),
      loanTenure: Math.max(1, inputs.loanTermYears),
      notes: '',
      assetId,
      liabilityId,
    })
    setScenarioId(scenario.id)
    try {
      localStorage.setItem(SCENARIO_STORAGE_KEY, scenario.id)
    } catch (storageError) {
      console.warn('Unable to persist property scenario id', storageError)
    }
    setHelperMessage('Linked asset and loan to property scenario.')
    return true
  } catch (error) {
    console.error('Failed to link property items', error)
    setHelperMessage('Unable to link property items right now.')
    return false
  }
}

export interface ApplyPlanParams {
  selectedAssetId: string
  selectedLiabilityId: string
  inputs: MortgageInputs
  assets: Asset[]
  liabilities: Liability[]
  calculation: ReturnType<typeof calculateMortgage>
  setHelperMessage: React.Dispatch<React.SetStateAction<string | null>>
  onClose: () => void
}

export async function handleApplyPlan({
  selectedAssetId,
  selectedLiabilityId,
  inputs,
  assets,
  liabilities,
  calculation,
  setHelperMessage,
  onClose,
}: ApplyPlanParams): Promise<boolean> {
  if (!selectedAssetId || !selectedLiabilityId) {
    setHelperMessage('Select both asset and loan before applying to plan.')
    return false
  }
  if (inputs.propertyPrice <= 0 || inputs.loanAmount <= 0) {
    setHelperMessage('Enter property price and loan amount before applying.')
    return false
  }

  try {
    await assetsApi.convertAssetToProperty(selectedAssetId)
    await liabilitiesApi.convertLiabilityToProperty(selectedLiabilityId)

    const assetRef = assets.find((a) => a.id === selectedAssetId)
    const liabilityRef = liabilities.find((l) => l.id === selectedLiabilityId)

    if (assetRef) {
      await assetsApi.updateAsset(selectedAssetId, {
        name: assetRef.name,
        category: 'property',
        currentValue: inputs.propertyPrice,
        annualGrowthRate: assetRef.annualGrowthRate,
        notes: assetRef.notes,
      } as any)
    }
    if (liabilityRef) {
      await liabilitiesApi.updateLiability(selectedLiabilityId, {
        name: liabilityRef.name,
        category: 'property',
        currentBalance: inputs.loanAmount,
        interestRateApr: inputs.floatingRate,
        minimumPayment: calculation.monthlyPayment,
        notes: liabilityRef.notes,
      } as any)
    }

    // Upsert mortgage expense tied to liability
    try {
      const expensesResult = await expensesApi.listExpenses({ limit: -1 })
      const existing = expensesResult.data.find(
        (ex) => ex.category === 'housing_mortgage' && ex.notes?.includes(selectedLiabilityId)
      )
      const payload = {
        payee: 'Mortgage Payment',
        amount: calculation.monthlyPayment,
        frequency: 'monthly' as const,
        category: 'housing_mortgage',
        notes: `liability:${selectedLiabilityId}`,
      }
      if (existing?.id) {
        await expensesApi.updateExpense(existing.id, payload)
      } else {
        await expensesApi.createExpense(payload)
      }
    } catch (expenseError) {
      console.warn('Unable to upsert mortgage expense', expenseError)
    }

    setHelperMessage('Plan applied to financial data.')
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('financial-data-refresh'))
    }
    onClose()
    return true
  } catch (error) {
    console.error('Failed to apply plan', error)
    setHelperMessage('Unable to apply plan right now.')
    return false
  }
}

export function saveDraft(inputs: MortgageInputs): string {
  const snapshot = JSON.stringify(inputs)
  localStorage.setItem(STORAGE_KEY, snapshot)
  return new Date().toISOString()
}

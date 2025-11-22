"use client"

import { useEffect, useMemo, useState } from 'react'
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  BarChart,
  Bar,
} from 'recharts'
import { Calendar, Loader2, Percent, PiggyBank, TrendingDown, X } from 'lucide-react'
import type { MortgageInputs, PropertyPlannerType } from '@/types/property'
import { PROPERTY_TYPES } from '@/types/property'
import type { Asset, Liability } from '@/types/financial'
import { financialApi } from '@/services/financialApi'
import { Input } from '@/components/ui/input'
import { calculateMortgage, formatCurrency, formatPercentage } from '@/utils/mortgage-calculations'
import type { PropertyScenarioRecord } from '@/types/property'

interface PropertyPlannerModalProps {
  isOpen: boolean
  onClose: () => void
  prefill?: { scenarioId?: string; assetId?: string; liabilityId?: string }
}

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
const LOCATION_TAGS: Record<PropertyPlannerType, string> = {
  hdb: '4-Room BTO in Tampines North',
  condo: 'City-fringe condo, One-North',
  landed: 'Landed home in Serangoon',
}
const LOCATION_PLACEHOLDER = 'e.g. 4-Room BTO in Tampines North'

const areInputsValid = (inputs: MortgageInputs) =>
  inputs.loanAmount > 0 &&
  inputs.loanTermYears > 0 &&
  inputs.loanStartMonth.trim() !== '' &&
  inputs.fixedYears > 0 &&
  inputs.fixedRate > 0 &&
  inputs.floatingRate > 0 &&
  inputs.householdIncome > 0

const formatCompactCurrency = (value: number) =>
  new Intl.NumberFormat('en-SG', {
    style: 'currency',
    currency: 'SGD',
    notation: 'compact',
    maximumFractionDigits: 1,
    minimumFractionDigits: 0,
  }).format(value)

export function PropertyPlannerModal({ isOpen, onClose, prefill }: PropertyPlannerModalProps) {
  const [selectedType, setSelectedType] = useState<PropertyPlannerType>('hdb')
  const [inputs, setInputs] = useState<MortgageInputs>({ ...DEFAULT_INPUTS })
  const [isComplete, setIsComplete] = useState(false)
  const [isSavingDraft, setIsSavingDraft] = useState(false)
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null)
  const [savedSnapshot, setSavedSnapshot] = useState<string | null>(null)
  const [locationDraft, setLocationDraft] = useState(LOCATION_TAGS.hdb)
  const [assets, setAssets] = useState<Asset[]>([])
  const [liabilities, setLiabilities] = useState<Liability[]>([])
  const [selectedAssetId, setSelectedAssetId] = useState<string>('')
  const [assetInput, setAssetInput] = useState<string>('')
  const [assetInputCache, setAssetInputCache] = useState<string>('')
  const [selectedLiabilityId, setSelectedLiabilityId] = useState<string>('')
  const [liabilityInput, setLiabilityInput] = useState<string>('')
  const [liabilityInputCache, setLiabilityInputCache] = useState<string>('')
  const [isLinking, setIsLinking] = useState(false)
  const [scenarioId, setScenarioId] = useState<string | null>(null)
  const [helperMessage, setHelperMessage] = useState<string | null>(null)
  const [isPrefilling, setIsPrefilling] = useState(false)
  const [prefillScenario, setPrefillScenario] = useState<PropertyScenarioRecord | null>(null)
  const [overrideFlags, setOverrideFlags] = useState<{
    price?: boolean
    down?: boolean
    loan?: boolean
    rate?: boolean
    tenure?: boolean
  }>({})

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

  useEffect(() => {
    const hydratePrefill = async () => {
      if (!prefill?.scenarioId || !isOpen) return
      setIsPrefilling(true)
      try {
        const scenario = await financialApi.getPropertyScenario(prefill.scenarioId)
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
      } finally {
        setIsPrefilling(false)
      }
    }
    void hydratePrefill()
  }, [prefill, isOpen, assets, liabilities])

  useEffect(() => {
    if (!isOpen) return
    const loadFinancial = async () => {
      try {
        const [assetList, liabilityList] = await Promise.all([financialApi.listAssets(), financialApi.listLiabilities()])
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
  }, [isOpen])

  useEffect(() => {
    setInputs((prev) => ({ ...prev, propertyType: selectedType }))
  }, [selectedType])

  const calculation = useMemo(() => calculateMortgage(inputs), [inputs])
  const selectedAsset = useMemo(() => assets.find((a) => a.id === selectedAssetId), [assets, selectedAssetId])
  const selectedLiability = useMemo(
    () => liabilities.find((l) => l.id === selectedLiabilityId),
    [liabilities, selectedLiabilityId],
  )

  const hasUnsavedChanges = useMemo(() => {
    if (!savedSnapshot) return true
    return savedSnapshot !== JSON.stringify(inputs)
  }, [inputs, savedSnapshot])

  const handleInputChange = (field: keyof MortgageInputs, value: string | number) => {
    setInputs((prev) => ({ ...prev, [field]: value }))
    if (field === 'propertyType') {
      setSelectedType(value as PropertyPlannerType)
      setLocationDraft(LOCATION_TAGS[value as PropertyPlannerType])
    }
  }

  const handleAssetInput = (value: string) => {
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
  }
  const handleAssetFocus = () => {
    setAssetInputCache(assetInput)
    setAssetInput('')
  }
  const handleAssetBlur = () => {
    if (!assetInput && assetInputCache) {
      setAssetInput(assetInputCache)
    }
  }

  const handleLiabilityInput = (value: string) => {
    setLiabilityInput(value)
    const match = liabilities.find((l) => l.name === value)
    if (match) {
      setSelectedLiabilityId(match.id)
    } else {
      setSelectedLiabilityId('')
    }
  }
  const handleLiabilityFocus = () => {
    setLiabilityInputCache(liabilityInput)
    setLiabilityInput('')
  }
  const handleLiabilityBlur = () => {
    if (!liabilityInput && liabilityInputCache) {
      setLiabilityInput(liabilityInputCache)
    }
  }

  const handleSaveLink = async () => {
    if (!assetInput) {
      setHelperMessage('Enter or pick a property asset.')
      return
    }
    if (!liabilityInput) {
      setHelperMessage('Enter or pick a property loan.')
      return
    }
    if (inputs.loanAmount <= 0 || inputs.floatingRate <= 0 || inputs.loanTermYears <= 0) {
      setHelperMessage('Enter loan amount, rate, and tenure before generating.')
      return
    }
    setIsLinking(true)
    setHelperMessage(null)
    try {
      let assetId = selectedAssetId
      let liabilityId = selectedLiabilityId

      if (!assetId) {
        const created = await financialApi.createAsset({
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
        const createdLoan = await financialApi.createLiability({
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
          return
        }
      }
      if (assetRecord && assetRecord.category !== 'property') {
        const updated = await financialApi.convertAssetToProperty(assetId)
        setAssets((prev) => prev.map((a) => (a.id === assetId ? updated : a)))
      }
      if (liabilityRecord && liabilityRecord.category !== 'property') {
        const updatedLi = await financialApi.convertLiabilityToProperty(liabilityId)
        setLiabilities((prev) => prev.map((l) => (l.id === liabilityId ? updatedLi : l)))
      }
      const headline = locationDraft || assetInput || 'Property scenario'
      const downPayment =
        inputs.propertyPrice > inputs.loanAmount && inputs.loanAmount > 0
          ? inputs.propertyPrice - inputs.loanAmount
          : Math.max(0, inputs.propertyPrice * 0.2)
      const scenario = await financialApi.createPropertyScenario({
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
    } catch (error) {
      console.error('Failed to link property items', error)
      setHelperMessage('Unable to link property items right now.')
    } finally {
      setIsLinking(false)
    }
  }

  const handleGenerate = () => {
    if (!areInputsValid(inputs)) return
    setIsComplete(true)
  }

  const handleEdit = () => setIsComplete(false)

  const handleSavePlan = async () => {
    try {
      setIsSavingDraft(true)
      await handleSaveLink()
      const snapshot = JSON.stringify(inputs)
      localStorage.setItem(STORAGE_KEY, snapshot)
      setSavedSnapshot(snapshot)
      setLastSavedAt(new Date().toISOString())
    } finally {
      setIsSavingDraft(false)
    }
  }

  const handleApplyPlan = async () => {
    if (!selectedAssetId || !selectedLiabilityId) {
      setHelperMessage('Select both asset and loan before applying to plan.')
      return
    }
    // Prevent negative or zero values
    if (inputs.propertyPrice <= 0 || inputs.loanAmount <= 0) {
      setHelperMessage('Enter property price and loan amount before applying.')
      return
    }
    try {
      setIsLinking(true)
      // Update asset and liability with current inputs
      await financialApi.convertAssetToProperty(selectedAssetId)
      await financialApi.convertLiabilityToProperty(selectedLiabilityId)
      const assetRef = assets.find((a) => a.id === selectedAssetId)
      const liabilityRef = liabilities.find((l) => l.id === selectedLiabilityId)
      if (assetRef) {
        await financialApi.updateAsset(selectedAssetId, {
          name: assetRef.name,
          category: 'property',
          currentValue: inputs.propertyPrice,
          annualGrowthRate: assetRef.annualGrowthRate,
          notes: assetRef.notes,
        } as any)
      }
      if (liabilityRef) {
        await financialApi.updateLiability(selectedLiabilityId, {
          name: liabilityRef.name,
          category: 'property',
          currentBalance: inputs.loanAmount,
          interestRateApr: inputs.floatingRate,
          minimumPayment: calculation.monthlyPayment,
          notes: liabilityRef.notes,
        } as any)
      }

      // Upsert mortgage expense tied to liability (by category + liability id in notes)
      try {
        const expenses = await financialApi.listExpenses()
        const existing = expenses.find(
          (ex) => ex.category === 'housing_mortgage' && ex.notes?.includes(selectedLiabilityId)
        )
        const payload = {
          payee: 'Mortgage Payment',
          amount: calculation.monthlyPayment,
          frequency: 'monthly',
          category: 'housing_mortgage',
          notes: `liability:${selectedLiabilityId}`,
        }
        if (existing?.id) {
          await financialApi.updateExpense(existing.id, payload)
        } else {
          await financialApi.createExpense(payload as any)
        }
      } catch (expenseError) {
        console.warn('Unable to upsert mortgage expense', expenseError)
      }
      setHelperMessage('Plan applied to financial data.')
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('financial-data-refresh'))
      }
      onClose()
    } catch (error) {
      console.error('Failed to apply plan', error)
      setHelperMessage('Unable to apply plan right now.')
    } finally {
      setIsLinking(false)
    }
  }

  const handleClose = () => {
    setIsComplete(false)
    onClose()
  }

  const msrPercent = formatPercentage(calculation.msrRatio)
  const msrWithinLimit = calculation.msrRatio <= 0.3

  const formattedLoanEnd = useMemo(() => {
    if (!calculation.loanEndDate) return ''
    const [year, month] = calculation.loanEndDate.split('-').map(Number)
    if (!year || !month) return calculation.loanEndDate
    return new Date(year, month - 1).toLocaleDateString('en-SG', {
      year: 'numeric',
      month: 'short',
    })
  }, [calculation.loanEndDate])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur">
      <div className="relative mx-4 h-[96vh] w-full max-w-6xl overflow-hidden rounded-3xl border border-white/10 bg-gray-950 shadow-[0_25px_80px_rgba(0,0,0,0.6)]">
        <div className="flex items-center justify-between border-b border-white/10 bg-gradient-to-br from-gray-900 via-gray-950 to-black px-8 py-6">
          <div className="space-y-2">            
            <h2 className="text-2xl font-semibold text-white">Property Planner</h2>
            <p className="text-sm text-gray-300">
              Model how your housing loan impacts cash, CPF, and MSR in three guided steps.
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-2 text-[12px]">
              <span className="text-sm font-medium uppercase tracking-[0.14em] text-gray-300">
                Currently modeling:
              </span>
              <div className="flex items-center gap-2">
                <Input
                  list="property-assets"
                  value={assetInput}
                  onChange={(event) => handleAssetInput(event.target.value)}
                  onFocus={handleAssetFocus}
                  onBlur={handleAssetBlur}
                  placeholder="Select or type a property asset"
                  className="h-10 min-w-[260px] rounded-full border border-white/20 bg-white/5 px-4 text-sm font-semibold text-white focus:border-white/10 focus:outline-none focus:ring-0 focus:ring-offset-0 focus-visible:ring-0 focus-visible:ring-offset-0 focus:shadow-none"
                />
                <datalist id="property-assets">
                  {assets.map((asset) => (
                    <option key={asset.id} value={asset.name} />
                  ))}
                </datalist>
                {selectedAssetId && (
                  <span className="text-sm text-gray-300">
                    {formatCurrency(assets.find((a) => a.id === selectedAssetId)?.currentValue ?? 0)}
                  </span>
                )}
              </div>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="rounded-full p-2 text-gray-400 transition hover:bg-white/10 hover:text-white"
            type="button"
            aria-label="Close mortgage planner"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

       <div className="flex h-full overflow-hidden">
          <div
            className="flex-1 overflow-auto px-6 py-6 sm:px-8 bg-gradient-to-b from-[#0f1a2f] via-[#0c1528] to-[#0a1122]"
            style={{ paddingBottom: '10rem' }}
          >
            {!isComplete ? (
              <div className="space-y-6">
                <section className="rounded-3xl border border-white/10 bg-[#030712] p-6 shadow-xl">
                  <StepForm
                    inputs={inputs}
                    onChange={handleInputChange}
                    calculation={calculation}
                    selectedAssetId={selectedAssetId}
                    assets={assets}
                    selectedLiabilityId={selectedLiabilityId}
                    liabilities={liabilities}
                    liabilityInput={liabilityInput}
                    onChangeLiabilityInput={handleLiabilityInput}
                    onLiabilityFocus={handleLiabilityFocus}
                    onLiabilityBlur={handleLiabilityBlur}
                    overrideFlags={overrideFlags}
                  />
                  <div className="mt-3 flex flex-wrap gap-3 text-xs text-gray-300">
                    {assetInput && <span className="rounded-full bg-white/5 px-3 py-1">Asset: {assetInput}</span>}
                    {liabilityInput && <span className="rounded-full bg-white/5 px-3 py-1">Loan: {liabilityInput}</span>}
                    {scenarioId && <span className="rounded-full bg-white/5 px-3 py-1">Scenario ID: {scenarioId}</span>}
                    {helperMessage && <span className="text-blue-200">{helperMessage}</span>}
                  </div>

                  <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-4">
                    <div className="text-xs text-gray-400">
                      {lastSavedAt
                        ? `Last saved ${new Date(lastSavedAt).toLocaleTimeString()}`
                        : 'Draft not saved yet'}
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        className="rounded-full border border-white/15 bg-[#030712] px-4 py-2 text-sm text-gray-200 transition hover:border-white/30 disabled:opacity-50"
                        type="button"
                        onClick={handleSavePlan}
                        disabled={isSavingDraft}
                      >
                        {isSavingDraft ? (
                          <span className="flex items-center gap-2">
                            <Loader2 className="h-4 w-4 animate-spin" /> Saving...
                          </span>
                        ) : (
                          'Save Plan'
                        )}
                      </button>
                      <button
          className="rounded-full bg-emerald-500 px-5 py-2 text-sm font-semibold text-white shadow-[0_10px_30px_rgba(16,185,129,0.35)] transition hover:bg-emerald-400 disabled:opacity-50"
                        type="button"
                        onClick={handleGenerate}
                        disabled={!areInputsValid(inputs)}
                      >
                        Generate Overview
                      </button>
                    </div>
                  </div>
                </section>
              </div>
            ) : (
              <MortgageOverview
                calculation={calculation}
                onEdit={handleEdit}
                loanAmount={inputs.loanAmount}
                formattedLoanEnd={formattedLoanEnd}
                msrWithinLimit={msrWithinLimit}
                handleApplyPlan={handleApplyPlan}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

interface StepFormProps {
  inputs: MortgageInputs
  onChange: (field: keyof MortgageInputs, value: string | number) => void
  calculation: ReturnType<typeof calculateMortgage>
  selectedAssetId: string
  assets: Asset[]
  selectedLiabilityId: string
  liabilities: Liability[]
  liabilityInput: string
  onChangeLiabilityInput: (value: string) => void
  onLiabilityFocus: () => void
  onLiabilityBlur: () => void
  overrideFlags?: {
    price?: boolean
    down?: boolean
    loan?: boolean
    rate?: boolean
    tenure?: boolean
  }
}

function StepForm({
  inputs,
  onChange,
  calculation,
  selectedAssetId,
  assets,
  selectedLiabilityId,
  liabilities,
  liabilityInput,
  onChangeLiabilityInput,
  onLiabilityFocus,
  onLiabilityBlur,
  overrideFlags,
}: StepFormProps) {
  return (
    <div className="space-y-6">
      <StepOne
        inputs={inputs}
        onChange={onChange}
        selectedAssetId={selectedAssetId}
        assets={assets}
        selectedLiabilityId={selectedLiabilityId}
        liabilities={liabilities}
        liabilityInput={liabilityInput}
        onChangeLiabilityInput={onChangeLiabilityInput}
        onLiabilityFocus={onLiabilityFocus}
        onLiabilityBlur={onLiabilityBlur}
        overrideFlags={overrideFlags}
      />
      <div className="border-t border-white/10" />
      <InterestSection inputs={inputs} onChange={onChange} />
      <div className="border-t border-white/10" />
      <IncomeSection inputs={inputs} calculation={calculation} onChange={onChange} />
    </div>
  )
}

interface StepOneProps {
  inputs: MortgageInputs
  onChange: (field: keyof MortgageInputs, value: string | number) => void
  selectedAssetId: string
  assets: Asset[]
  selectedLiabilityId: string
  liabilities: Liability[]
  liabilityInput: string
  onChangeLiabilityInput: (value: string) => void
  onLiabilityFocus: () => void
  onLiabilityBlur: () => void
  overrideFlags?: {
    price?: boolean
    down?: boolean
    loan?: boolean
    rate?: boolean
    tenure?: boolean
  }
}

function StepOne({
  inputs,
  onChange,
  selectedAssetId,
  assets,
  selectedLiabilityId,
  liabilities,
  liabilityInput,
  onChangeLiabilityInput,
  onLiabilityFocus,
  onLiabilityBlur,
  overrideFlags,
}: StepOneProps) {
  const monthOptions = useMemo(() => {
    const options: Array<{ value: string; label: string }> = []
    const currentYear = new Date().getFullYear()
    for (let year = currentYear; year <= currentYear + 11; year++) {
      for (let month = 1; month <= 12; month++) {
        const value = `${year}-${month.toString().padStart(2, '0')}`
        const label = new Date(year, month - 1).toLocaleDateString('en-SG', {
          year: 'numeric',
          month: 'long',
        })
        options.push({ value, label })
      }
    }
    return options
  }, [])

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h4 className="text-lg font-semibold text-white">Loan Basics</h4>
        <p className="text-sm text-gray-400">Tell us about your mortgage requirements.</p>
      </header>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="text-sm font-medium text-gray-300">
          Property Type
          <select
            className="mt-1 w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-white focus:border-blue-400 focus:outline-none"
            onChange={(event) => onChange('propertyType', event.target.value as PropertyPlannerType)}
            value={inputs.propertyType}
          >
            <option value="hdb">HDB (BTO / Resale)</option>
            <option value="condo">Condo</option>
            <option value="landed">Landed</option>
          </select>
        </label>
        <label className="text-sm font-medium text-gray-300">
          Property Loan (select or add)
          <Input
            list="property-loans"
            className="mt-1 w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white focus:border-white/10 focus:outline-none focus:ring-0 focus:ring-offset-0 focus-visible:ring-0 focus-visible:ring-offset-0 focus:shadow-none"
            value={liabilityInput}
            onChange={(event) => onChangeLiabilityInput(event.target.value)}
            onFocus={onLiabilityFocus}
            onBlur={onLiabilityBlur}
            placeholder="Select or type a property loan"
          />
          <datalist id="property-loans">
            {liabilities.map((liability) => (
              <option key={liability.id} value={liability.name} />
            ))}
          </datalist>
        </label>
      </div>

      <div className="space-y-2">
        <label className="flex items-center justify-between text-sm font-medium text-gray-300">
          <span>Property Price</span>
        </label>
        <div className="relative">
          <input
            type="text"
            inputMode="numeric"
            value={inputs.propertyPrice ? inputs.propertyPrice.toLocaleString() : ''}
            onChange={(event) => {
              const raw = event.target.value.replace(/[^0-9.]/g, '')
              onChange('propertyPrice', Number(raw) || 0)
            }}
            className={`mt-1 w-full rounded-2xl border ${
              overrideFlags?.price ? 'border-amber-400 text-amber-200' : 'border-white/10 text-white'
            } bg-white/5 px-4 py-2 text-lg font-semibold placeholder:text-gray-500 focus:border-blue-400 focus:outline-none`}
            min={10000}
            max={5000000}
            placeholder="600,000"
          />
          {selectedAssetId && (() => {
            const asset = assets.find((a) => a.id === selectedAssetId)
            if (!asset) return null
            const assetVal = asset.currentValue ?? 0
            if (inputs.propertyPrice > 0 && Math.abs(assetVal - inputs.propertyPrice) >= 1) {
              return (
                <p className="mt-1 text-xs text-gray-200">
                  Value differs from asset of ${assetVal.toLocaleString()}
                </p>
              )
            }
            return null
          })()}
        </div>
      </div>

      <div className="space-y-2">
        <label className="flex items-center justify-between text-sm font-medium text-gray-300">
          <span>Loan Amount</span>
        </label>
        <div className="relative">
          <input
            type="text"
            inputMode="numeric"
            value={inputs.loanAmount ? inputs.loanAmount.toLocaleString() : ''}
            onChange={(event) => {
              const raw = event.target.value.replace(/[^0-9.]/g, '')
              onChange('loanAmount', Number(raw) || 0)
            }}
            className={`mt-1 w-full rounded-2xl border ${
              overrideFlags?.loan ? 'border-amber-400 text-amber-200' : 'border-white/10 text-white'
            } bg-white/5 px-4 py-2 text-lg font-semibold placeholder:text-gray-500 focus:border-blue-400 focus:outline-none`}
            min={50000}
            max={1500000}
            placeholder="500,000"
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="text-sm font-medium text-gray-300">
          Loan Start Date
          <div className="relative">
            <Calendar className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white" color="white" />
            <input
              className="mt-1 w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-2 pl-9 text-white placeholder:text-gray-500 focus:border-blue-400 focus:outline-none"
              max="2035-12"
              min="2024-01"
              onChange={(event) => onChange('loanStartMonth', event.target.value)}
              type="month"
              value={inputs.loanStartMonth}
              placeholder="----"
            />
          </div>
        </label>

        <label className="text-sm font-medium text-gray-300">
          Loan Term (years)
          <input
            className="mt-1 w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-white placeholder:text-gray-500 focus:border-blue-400 focus:outline-none"
            min={5}
            max={35}
            onChange={(event) => onChange('loanTermYears', Number(event.target.value) || inputs.loanTermYears)}
            type="number"
            value={inputs.loanTermYears === 0 ? '' : inputs.loanTermYears}
            placeholder="25"
          />
        </label>
      </div>

      <div>
        <p className="text-sm font-medium text-gray-300">Borrowers</p>
        <div className="mt-3 grid gap-4 sm:grid-cols-2">
          {[
            {
              id: 'single',
              label: 'Single Borrower',
              helper: 'I am servicing the mortgage alone',
            },
            {
              id: 'couple',
              label: 'Couple',
              helper: 'I am servicing the loan with a partner or spouse',
            },
          ].map((option) => (
            <button
              className={`rounded-2xl border px-4 py-3 text-left transition ${
                inputs.borrowerType === option.id
                  ? 'border-blue-500 bg-blue-500/10 shadow-[0_0_0_1px_rgba(59,130,246,0.35)]'
                  : 'border-white/15 bg-white/5 hover:border-white/30'
              }`}
              key={option.id}
              onClick={() => onChange('borrowerType', option.id)}
              type="button"
            >
              <div className="flex items-center justify-between">
                <p className="font-semibold text-white">{option.label}</p>
              <span
                className={`h-4 w-4 rounded-full border ${
                  inputs.borrowerType === option.id ? 'border-blue-400 bg-blue-400' : 'border-white/20'
                }`}
              />
              </div>
              <p className="mt-1 text-sm text-gray-400">{option.helper}</p>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

interface InterestSectionProps {
  inputs: MortgageInputs
  onChange: (field: keyof MortgageInputs, value: string | number) => void
}

function InterestSection({ inputs, onChange }: InterestSectionProps) {
  const cards = [
    {
      label: 'Fixed Window',
      helper: 'Bank committed period',
      field: 'fixedYears' as const,
      value: inputs.fixedYears,
      min: 1,
      max: 10,
      step: 1,
      suffix: 'years',
      placeholder: '5',
    },
    {
      label: 'Current Rate',
      helper: 'Applied to amortisation',
      field: 'fixedRate' as const,
      value: inputs.fixedRate,
      min: 0,
      max: 6,
      step: 0.1,
      suffix: '%',
      placeholder: '2.5',
    },
    {
      label: 'Next Expected Rate',
      helper: 'Post lock-in assumption',
      field: 'floatingRate' as const,
      value: inputs.floatingRate,
      min: 0,
      max: 7,
      step: 0.1,
      suffix: '%',
      placeholder: '4.0',
    },
  ]

  return (
    <div className="space-y-4">
      <header>
        <h4 className="text-lg font-semibold text-white">Interest Rates</h4>
        <p className="text-sm text-gray-400">Outline your lock-in period and expected floating rate.</p>
      </header>

      <div className="grid gap-4 sm:grid-cols-3">
        {cards.map((card) => (
          <div className="space-y-2 rounded-2xl border border-white/10 bg-white/5 p-4" key={card.label}>
            <p className="text-xs uppercase text-gray-400">{card.label}</p>
            <div className="flex items-baseline gap-2">
              <input
                className="w-full bg-transparent text-2xl font-semibold text-white focus:outline-none"
                type="number"
                value={card.value === 0 ? '' : card.value}
                min={card.min}
                max={card.max}
                step={card.step}
                onChange={(event) => onChange(card.field, Number(event.target.value) || 0)}
                placeholder={card.placeholder}
              />
              <span className="text-sm text-gray-400">{card.suffix}</span>
            </div>
            <p className="text-xs text-gray-400">{card.helper}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

interface IncomeSectionProps {
  inputs: MortgageInputs
  calculation: ReturnType<typeof calculateMortgage>
  onChange: (field: keyof MortgageInputs, value: string | number) => void
}

function IncomeSection({ inputs, calculation, onChange }: IncomeSectionProps) {
  const withinLimit = calculation.msrRatio <= 0.3
  const msrPercent = formatPercentage(calculation.msrRatio)

  return (
    <div className="space-y-4">
      <header>
        <h4 className="text-lg font-semibold text-white">Income & MSR</h4>
        <p className="text-sm text-gray-400">Stress-test your loan against the 30% MSR guideline.</p>
      </header>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="text-sm font-medium text-gray-300">
          Monthly Household Income
          <input
            className="mt-1 w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-lg font-semibold text-white placeholder:text-gray-500 focus:border-blue-400 focus:outline-none"
            inputMode="numeric"
            onChange={(event) => {
              const raw = event.target.value.replace(/[^0-9]/g, '')
              onChange('householdIncome', Number(raw) || 0)
            }}
            type="text"
            value={inputs.householdIncome ? inputs.householdIncome.toLocaleString() : ''}
            placeholder="10,000"
          />
          <p className="mt-1 text-xs text-gray-500">Include both borrowers for couples.</p>
        </label>
        <label className="text-sm font-medium text-gray-300">
          Other Monthly Debt Obligations
          <input
            className="mt-1 w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-lg font-semibold text-white placeholder:text-gray-500 focus:border-blue-400 focus:outline-none"
            inputMode="numeric"
            onChange={(event) => {
              const raw = event.target.value.replace(/[^0-9]/g, '')
              onChange('otherDebt', Number(raw) || 0)
            }}
            type="text"
            value={inputs.otherDebt ? inputs.otherDebt.toLocaleString() : ''}
            placeholder="500"
          />
        </label>
      </div>

      <div
        className={`rounded-2xl border px-4 py-4 ${
          withinLimit ? 'border-emerald-400/40 bg-[#0b2419]' : 'border-amber-400/40 bg-[#26160b]'
        }`}
      >
        <div className="flex items-center gap-3 pl-1">
          <div>
            <p className="text-xs uppercase tracking-wide text-white/70">Estimated MSR</p>
            <p className="text-2xl font-semibold text-white">{msrPercent}</p>
            <p className="text-xs text-white/70">
              {withinLimit ? 'Below 30% threshold' : 'Above 30% MSR — consider tweaking loan'}
            </p>
          </div>
        </div>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl border border-[#24324d] bg-black/30 p-3 text-sm">
            <p className="text-gray-400">Estimated Monthly Payment</p>
            <p className="text-lg font-semibold text-white">{formatCurrency(calculation.monthlyPayment)}</p>
          </div>
          <div className="rounded-xl border border-[#24324d] bg-black/30 p-3 text-sm">
            <p className="text-gray-400">Household Income</p>
            <p className="text-lg font-semibold text-white">{formatCurrency(inputs.householdIncome)}</p>
          </div>
        </div>
      </div>
    </div>
  )
}

interface MortgageOverviewProps {
  calculation: ReturnType<typeof calculateMortgage>
  onEdit: () => void
  loanAmount: number
  formattedLoanEnd: string
  msrWithinLimit: boolean
  handleApplyPlan: () => void
}

function MortgageOverview({ calculation, onEdit, loanAmount, formattedLoanEnd, msrWithinLimit, handleApplyPlan }: MortgageOverviewProps) {
  const { monthlyPayment, totalInterest, msrRatio, amortization } = calculation
  const balanceYearTicks = amortization.balancePoints.map((point) => point.yearIndex)
  const compositionYearTicks = amortization.composition.map((point) => point.yearIndex)
  const balanceDomain: [number, number] = [
    Math.max(0, (balanceYearTicks[0] ?? 0) - 0.5),
    (balanceYearTicks[balanceYearTicks.length - 1] ?? 1) + 0.5,
  ]
  const compositionDomain: [number, number] = [
    Math.max(0, (compositionYearTicks[0] ?? 0) - 0.5),
    (compositionYearTicks[compositionYearTicks.length - 1] ?? 1) + 0.5,
  ]

  return (
    <section className="space-y-6 rounded-3xl border border-white/10 bg-[#030712] p-6 text-white shadow-[0_15px_40px_rgba(0,0,0,0.45)]">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <p className="text-xs uppercase tracking-[0.18em] text-gray-500">Mortgage Overview</p>
          <h3 className="text-2xl font-semibold text-white">Mortgage Overview</h3>
          <p className="text-sm text-gray-400">Your complete mortgage summary and projections.</p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        {[
          { label: 'Monthly Payment', value: formatCurrency(monthlyPayment), icon: PiggyBank },
          { label: 'Total Interest', value: formatCurrency(totalInterest), icon: TrendingDown },
          {
            label: 'MSR %',
            value: formatPercentage(msrRatio),
            helper: msrWithinLimit ? 'Below 30% threshold' : 'Exceeds 30% threshold',
            icon: Percent,
          },
          { label: 'Loan End Date', value: formattedLoanEnd, icon: Calendar },
        ].map((card) => (
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4" key={card.label}>
            <div className="flex items-center gap-2 text-sm text-gray-400">
              <card.icon className="h-4 w-4" />
              {card.label}
            </div>
            <p className="mt-2 text-2xl font-semibold text-white">{card.value}</p>
            {card.helper ? (
              <p className={`text-xs ${msrWithinLimit ? 'text-emerald-300' : 'text-amber-300'}`}>{card.helper}</p>
            ) : null}
          </div>
        ))}
      </div>

      <div className="space-y-4">
        {[
          {
            title: 'Loan Balance Over Time',
            helper: `Loan balance chart: ${formatCurrency(loanAmount)} → $0`,
            hasData: amortization.balancePoints.length > 0,
            render: (height: number) => (
              <ResponsiveContainer width="100%" height={height}>
                <AreaChart data={amortization.balancePoints} margin={{ bottom: 32, left: 16, right: 0 }}>
                  <defs>
                    <linearGradient id="loanBalanceGradient" x1="0" x2="0" y1="0" y2="1">
                      <stop offset="5%" stopColor="#60A5FA" stopOpacity={0.6} />
                      <stop offset="95%" stopColor="#60A5FA" stopOpacity={0.05} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="#1f2937" strokeDasharray="3 3" />
                  <XAxis
                    dataKey="yearIndex"
                    type="number"
                    domain={balanceDomain}
                    ticks={balanceYearTicks}
                    allowDecimals={false}
                    stroke="#9CA3AF"
                    fontSize={12}
                    tickMargin={10}
                    tickFormatter={(value) => `${value}`}
                    label={{ value: 'Year', position: 'bottom', offset: 0, fill: '#9CA3AF' }}
                  />
                  <YAxis
                    stroke="#9CA3AF"
                    fontSize={12}
                    tickFormatter={(value) => formatCompactCurrency(value as number)}
                  />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#111827', border: '1px solid rgba(255,255,255,0.1)' }}
                    labelFormatter={(value) => `Year ${value}`}
                    formatter={(value: number) => formatCurrency(value)}
                  />
                  <Area
                    dataKey="balance"
                    type="monotone"
                    stroke="#3B82F6"
                    strokeWidth={3}
                    fill="url(#loanBalanceGradient)"
                    name="Remaining Balance"
                  />
                </AreaChart>
              </ResponsiveContainer>
            ),
          },
          {
            title: 'Interest vs Principal Payments',
            helper: 'See how your payment composition changes each year.',
            hasData: amortization.composition.length > 0,
            render: (height: number) => (
              <ResponsiveContainer width="100%" height={height}>
                <BarChart data={amortization.composition} barCategoryGap="20%" barGap={4} margin={{ bottom: 36, left: 16, right: 0 }}>
                  <CartesianGrid stroke="#1f2937" strokeDasharray="3 3" />
                  <XAxis
                    dataKey="yearIndex"
                    type="number"
                    domain={compositionDomain}
                    ticks={compositionYearTicks}
                    allowDecimals={false}
                    stroke="#9CA3AF"
                    fontSize={11}
                    tickMargin={14}
                    tickFormatter={(value) => `${value}`}
                    label={{ value: 'Year', position: 'bottom', offset: 0, fill: '#9CA3AF' }}
                  />
                  <YAxis
                    stroke="#9CA3AF"
                    fontSize={12}
                    tickFormatter={(value) => formatCompactCurrency(value as number)}
                  />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#111827', border: '1px solid rgba(255,255,255,0.1)' }}
                    labelFormatter={(value) => `Year ${value}`}
                    formatter={(value: number, name) => [
                      formatCurrency(value),
                      name === 'interest' ? 'Interest' : 'Principal',
                    ]}
                  />
                  <Legend wrapperStyle={{ paddingTop: 12 }} />
                  <Bar dataKey="interest" stackId="payments" fill="rgba(248, 113, 113, 0.8)" stroke="#F87171" />
                  <Bar dataKey="principal" stackId="payments" fill="rgba(59, 130, 246, 0.7)" stroke="#3B82F6" />
                </BarChart>
              </ResponsiveContainer>
            ),
          },
        ].map((section) => (
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4" key={section.title}>
            <p className="text-sm font-semibold text-white">{section.title}</p>
            <p className="text-xs text-gray-400">{section.helper}</p>
            <div className="mt-3 rounded-xl border border-white/10 bg-gray-950 p-3" style={{ minHeight: 320 }}>
              {section.hasData ? (
                section.render(300)
              ) : (
                <div className="flex items-center justify-center text-xs text-gray-500" style={{ minHeight: 300 }}>
                  Not enough payment history yet.
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6 flex justify-end gap-3">
        <button
          className="rounded-full border border-white/15 bg-[#030712] px-4 py-2 text-sm text-gray-200 transition hover:border-white/30"
          onClick={onEdit}
          type="button"
        >
          Adjust inputs
        </button>
        <button
          className="rounded-full bg-[#2d76f8] px-5 py-2 text-sm font-semibold text-white shadow-[0_8px_20px_rgba(45,118,248,0.35)] transition hover:bg-[#3d84ff] disabled:opacity-50"
          type="button"
          onClick={handleApplyPlan}
        >
          Apply to Plan
        </button>
      </div>
    </section>
  )
}

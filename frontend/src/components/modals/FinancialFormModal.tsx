import { useEffect, useState } from 'react'
import { Trash2 } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'

import type { Asset, Expense, Frequency, Income, Liability, GrowthConfig } from '../../types/financial'
import { formatCurrency } from '@/lib/format'
import { financialApi } from '@/services/financialApi'

const PROPERTY_CATEGORY = 'property_real_estate'
const MORTGAGE_CATEGORY = 'mortgage_home'
const MORTGAGE_EXPENSE_CATEGORY = 'housing_mortgage'

// Map form categories to growth config categories
const categoryToGrowthConfigCategory = (type: FinancialDataType, category: string): string => {
  if (type === 'income') return 'income'
  if (type === 'expense') return 'expense'
  if (type === 'liability') return 'liability_debt'

  // Asset categories
  if (category.includes('property') || category.includes('real_estate')) return 'asset_property'
  if (category.includes('cash') || category.includes('savings') || category.includes('bank') || category.includes('cpf')) return 'asset_cash'
  // Default to equity for stocks, crypto, bonds, etc.
  return 'asset_equity'
}

const assetCategoryOptions = [
  { value: PROPERTY_CATEGORY, label: 'Property (real estate)' },
  { value: 'cash_savings', label: 'Cash / savings' },
  { value: 'bank_account', label: 'Bank account' },
  { value: 'cpf_account', label: 'CPF account' },
  { value: 'stocks_portfolio', label: 'Stocks / ETFs' },
  { value: 'bonds_investment', label: 'Bonds / fixed income' },
  { value: 'cryptocurrency', label: 'Crypto' },
  { value: 'other_asset', label: 'Other asset' },
]

const liabilityCategoryOptions = [
  { value: MORTGAGE_CATEGORY, label: 'Mortgage (home)' },
  { value: 'personal_loan', label: 'Personal loan' },
  { value: 'car_loan', label: 'Car loan' },
  { value: 'education_loan', label: 'Education loan' },
  { value: 'credit_card', label: 'Credit card' },
  { value: 'business_loan', label: 'Business loan' },
  { value: 'overdraft', label: 'Overdraft' },
  { value: 'other_debt', label: 'Other debt' },
]

const expenseCategoryOptions = [
  { value: MORTGAGE_EXPENSE_CATEGORY, label: 'Housing: Mortgage' },
  { value: 'housing_rent', label: 'Housing: Rent' },
  { value: 'utilities', label: 'Utilities' },
  { value: 'food_groceries', label: 'Food & groceries' },
  { value: 'transport_car', label: 'Transport: Car/public' },
  { value: 'insurance', label: 'Insurance' },
  { value: 'other_expense', label: 'Other expense' },
]

const incomeCategoryOptions = [
  { value: 'employment_income', label: 'Employment income' },
  { value: 'rental_income', label: 'Rental income' },
  { value: 'business_income', label: 'Business income' },
  { value: 'investment_income', label: 'Investment income' },
  { value: 'other_income', label: 'Other income' },
]

export type FinancialDataType = 'asset' | 'income' | 'liability' | 'expense'

type FormState = {
  name: string
  amount: string
  frequency: Frequency
  category: string
  annualGrowthRate: string
  interestRateApr: string
  minimumPayment: string
  growthRate: string
  notes: string
}

type AssetFormValues = {
  type: 'asset'
  id?: string
  name: string
  category: string
  currentValue: number
  annualGrowthRate: number
  notes?: string | null
  updatedAt?: string
}

type LiabilityFormValues = {
  type: 'liability'
  id?: string
  name: string
  category: string
  currentBalance: number
  interestRateApr: number
  minimumPayment: number
  notes?: string | null
  updatedAt?: string
}

type IncomeFormValues = {
  type: 'income'
  id?: string
  source: string
  amount: number
  frequency: Frequency
  category: string
  startDate: string
  growthRate?: number
  notes?: string | null
  updatedAt?: string
}

type ExpenseFormValues = {
  type: 'expense'
  id?: string
  payee: string
  amount: number
  frequency: Frequency
  category: string
  growthRate?: number
  notes?: string | null
  updatedAt?: string
}

type CpfAssetEntry = {
  name: string
  category: string
  currentValue: number
  annualGrowthRate: number
  notes?: string | null
}

export type CpfFormValues = {
  type: 'cpf'
  accounts: CpfAssetEntry[]
}

export type FinancialFormValues =
  | AssetFormValues
  | LiabilityFormValues
  | IncomeFormValues
  | ExpenseFormValues
  | CpfFormValues

/** Timeline item shape for when editing from timeline view */
interface TimelineItemData {
  itemId?: string
  id?: string
  name?: string
  category?: string
  amountAnnual?: number
  adjAnnualAmt?: number
  sourceAmount?: number
  sourceFrequency?: string
}

export interface FinancialFormModalProps {
  type: FinancialDataType
  mode: 'create' | 'edit'
  data?: Asset | Income | Liability | Expense | TimelineItemData
  isOpen: boolean
  onClose: () => void
  onSave: (payload: FinancialFormValues, mode: 'create' | 'edit') => Promise<void>
  onDelete?: (id: string) => Promise<void>
  selectedYear?: number
  selectedYearLabel?: string
}

// Helper to get growth rate from user configs
const getGrowthRateFromConfigs = (
  configs: GrowthConfig[] | undefined,
  category: string,
  fallback: number
): number => {
  if (!configs) return fallback
  const cfg = configs.find(c => c.category === category)
  return cfg?.annualRatePct ?? fallback
}

const buildDefaultFormState = (type: FinancialDataType, growthConfigs?: GrowthConfig[]): FormState => {
  const defaults: Record<FinancialDataType, string> = {
    asset: PROPERTY_CATEGORY,
    liability: MORTGAGE_CATEGORY,
    expense: MORTGAGE_EXPENSE_CATEGORY,
    income: incomeCategoryOptions[0]?.value ?? '',
  }

  const defaultCategory = defaults[type] ?? ''

  // Get the appropriate growth config category for the default form category
  const growthConfigCategory = categoryToGrowthConfigCategory(type, defaultCategory)

  // Get rate from user's growth configs with fallbacks
  const fallbackRates: Record<string, number> = {
    asset_property: 3.0,
    asset_cash: 1.5,
    asset_equity: 6.0,
    liability_debt: -3.0,
    income: 3.0,
    expense: 2.0,
  }
  const rate = getGrowthRateFromConfigs(growthConfigs, growthConfigCategory, fallbackRates[growthConfigCategory] ?? 3.0)

  // For liabilities, use absolute value for APR display
  const liabilityRate = getGrowthRateFromConfigs(growthConfigs, 'liability_debt', -3.0)

  return {
    name: '',
    amount: '',
    frequency: 'monthly',
    category: defaultCategory,
    annualGrowthRate: rate.toString(),
    interestRateApr: Math.abs(liabilityRate).toString(),
    minimumPayment: '',
    growthRate: rate.toString(),
    notes: '',
  }
}

// Helper to get rate for a specific category
const getRateForCategory = (
  type: FinancialDataType,
  category: string,
  growthConfigs?: GrowthConfig[]
): number => {
  const growthConfigCategory = categoryToGrowthConfigCategory(type, category)
  const fallbackRates: Record<string, number> = {
    asset_property: 3.0,
    asset_cash: 1.5,
    asset_equity: 6.0,
    liability_debt: -3.0,
    income: 3.0,
    expense: 2.0,
  }
  return getGrowthRateFromConfigs(growthConfigs, growthConfigCategory, fallbackRates[growthConfigCategory] ?? 3.0)
}

export function FinancialFormModal({
  type,
  mode,
  data,
  isOpen,
  onClose,
  onSave,
  onDelete,
  selectedYear,
  selectedYearLabel,
}: FinancialFormModalProps) {
  const roundToDollar = (value: number | string) => Math.round(Number(value) || 0)
  const toNumeric = (value: string) => Number.parseFloat(value.replace(/,/g, '')) || 0
  const formatNumberInput = (value: string | number) => {
    const raw = typeof value === 'number' ? value.toString() : value
    const cleaned = raw.replace(/[^0-9.]/g, '')
    if (!cleaned) return ''
    const [integer, decimal] = cleaned.split('.')
    const formattedInt = new Intl.NumberFormat('en-US').format(Number(integer || 0))
    return decimal !== undefined ? `${formattedInt}.${decimal}` : formattedInt
  }
  const toSafeText = (value: string | null | undefined) => value ?? ''

  // Fetch user's growth configs for default rates
  const { data: growthConfigs } = useQuery({
    queryKey: ['growth-configs'],
    queryFn: () => financialApi.getGrowthConfigs(),
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  })

  const [formData, setFormData] = useState<FormState>(buildDefaultFormState(type, growthConfigs))
  const [isSaving, setIsSaving] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isCpfMode, setIsCpfMode] = useState(false)
  const [cpfFields, setCpfFields] = useState({
    ordinaryAccount: '',
    specialAccount: '',
    medisaveAccount: '',
  })
  const [cpfErrors, setCpfErrors] = useState<Partial<typeof cpfFields>>({})

  const normalizedCategory = (() => {
    switch (type) {
      case 'income':
        return 'incomes'
      case 'expense':
        return 'expenses'
      case 'asset':
        return 'assets'
      case 'liability':
        return 'liabilities'
      default:
        return type
    }
  })()

  // Handle escape key to close modal
  useEffect(() => {
    if (!isOpen) return

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !isSaving && !isDeleting) {
        onClose()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, isSaving, isDeleting, onClose])

  useEffect(() => {
    if (!isOpen) return
    setIsCpfMode(false)
    setCpfFields({
      ordinaryAccount: '',
      specialAccount: '',
      medisaveAccount: '',
    })
    setCpfErrors({})

    if (!data) {
      setFormData(buildDefaultFormState(type, growthConfigs))
      return
    }

    switch (type) {
      case 'asset': {
        const asset = data as Asset
        const amt = (asset as any).amountAnnual ?? (asset as any).amount_annual ?? asset.currentValue ?? 0
        const freq = (asset as any).sourceFrequency ?? (asset as any).source_frequency ?? 'annual'
        // Use item's growth rate if set, otherwise fall back to user's growth config for this category
        const itemRate = asset.annualGrowthRate
        const effectiveRate = itemRate && itemRate !== 0
          ? itemRate
          : getRateForCategory(type, asset.category, growthConfigs)
        setFormData({
          name: toSafeText(asset.name),
          amount: formatNumberInput(roundToDollar(amt)),
          frequency: freq,
          category: asset.category,
          annualGrowthRate: effectiveRate.toString(),
          interestRateApr: '4.5',
          minimumPayment: '',
          growthRate: '3.0',
          notes: asset.notes ?? '',
        })
        break
      }
      case 'liability': {
        const liability = data as Liability
        const amt = (liability as any).amountAnnual ?? (liability as any).amount_annual ?? liability.currentBalance ?? 0
        const freq = (liability as any).sourceFrequency ?? (liability as any).source_frequency ?? 'annual'
        // Liabilities use interestRateApr, fall back to absolute value of liability_debt config
        const itemRate = liability.interestRateApr
        const effectiveRate = itemRate && itemRate !== 0
          ? itemRate
          : Math.abs(getRateForCategory(type, liability.category, growthConfigs))
        setFormData({
          name: toSafeText(liability.name),
          amount: formatNumberInput(roundToDollar(amt)),
          frequency: freq,
          category: liability.category,
          annualGrowthRate: '7.0',
          interestRateApr: effectiveRate.toString(),
          minimumPayment: roundToDollar(liability.minimumPayment ?? 0).toString(),
          growthRate: '2.0',
          notes: liability.notes ?? '',
        })
        break
      }
      case 'income': {
        const income = data as Income
        const amt = (income as any).amountAnnual ?? (income as any).amount_annual ?? income.amount ?? 0
        const freq = (income as any).sourceFrequency ?? (income as any).source_frequency ?? income.frequency ?? 'annual'
        // Handle both Income (source) and TimelineItem (name) data shapes
        const itemName = income.source ?? (income as any).name ?? ''
        // Use item's growth rate if set, otherwise fall back to user's growth config
        const itemRate = (income as any).growthRate
        const effectiveRate = itemRate && itemRate !== 0
          ? itemRate
          : getRateForCategory(type, income.category, growthConfigs)
        setFormData({
          name: toSafeText(itemName),
          amount: formatNumberInput(roundToDollar(amt)),
          frequency: freq,
          category: income.category,
          annualGrowthRate: '7.0',
          interestRateApr: '4.5',
          minimumPayment: '',
          growthRate: effectiveRate.toString(),
          notes: income.notes ?? '',
        })
        break
      }
      case 'expense': {
        const expense = data as Expense
        const amt = (expense as any).amountAnnual ?? (expense as any).amount_annual ?? expense.amount ?? 0
        const freq = (expense as any).sourceFrequency ?? (expense as any).source_frequency ?? expense.frequency ?? 'annual'
        // Handle both Expense (payee) and TimelineItem (name) data shapes
        const itemName = expense.payee ?? (expense as any).name ?? ''
        // Use item's growth rate if set, otherwise fall back to user's growth config
        const itemRate = (expense as any).growthRate
        const effectiveRate = itemRate && itemRate !== 0
          ? itemRate
          : getRateForCategory(type, expense.category, growthConfigs)
        setFormData({
          name: toSafeText(itemName),
          amount: formatNumberInput(roundToDollar(amt)),
          frequency: freq,
          category: expense.category,
          annualGrowthRate: '7.0',
          interestRateApr: '4.5',
          minimumPayment: '',
          growthRate: effectiveRate.toString(),
          notes: expense.notes ?? '',
        })
        break
      }
    }
  }, [data, isOpen, type, growthConfigs])

  const categoryOptions = (() => {
    switch (type) {
      case 'asset':
        return assetCategoryOptions
      case 'liability':
        return liabilityCategoryOptions
      case 'expense':
        return expenseCategoryOptions
      case 'income':
        return incomeCategoryOptions
      default:
        return []
    }
  })()

  const categorySelectOptions =
    categoryOptions.some((option) => option.value === formData.category) || !formData.category
      ? categoryOptions
      : [...categoryOptions, { value: formData.category, label: formData.category }]

  if (!isOpen) return null

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (isCpfMode && type === 'asset' && mode === 'create') {
      if (!validateCpfFields()) return
    }
    setIsSaving(true)

    try {
      const payload = isCpfMode && type === 'asset' && mode === 'create' ? buildCpfPayload() : buildPayload()
      await onSave(payload, mode)
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!data || !('id' in data) || !data.id || !onDelete) return
    if (!confirm('Are you sure you want to delete this item?')) return

    setIsDeleting(true)
    try {
      await onDelete(data.id)
    } finally {
      setIsDeleting(false)
    }
  }

  const validateCpfFields = () => {
    const nextErrors: Partial<typeof cpfFields> = {}
    const validate = (key: keyof typeof cpfFields, label: string) => {
      const raw = cpfFields[key].trim()
      if (!raw) {
        nextErrors[key] = `${label} is required`
        return
      }
      const numeric = Number.parseFloat(raw)
      if (Number.isNaN(numeric)) {
        nextErrors[key] = 'Enter a valid number'
      } else if (numeric < 0) {
        nextErrors[key] = 'Value cannot be negative'
      }
    }

    validate('ordinaryAccount', 'Ordinary Account')
    validate('specialAccount', 'Special Account')
    validate('medisaveAccount', 'Medisave Account')

    setCpfErrors(nextErrors)
    return Object.keys(nextErrors).length === 0
  }

  const buildCpfPayload = (): FinancialFormValues => {
    const accounts: CpfAssetEntry[] = [
      {
        name: 'CPF Ordinary Account',
        category: 'retirement',
        currentValue: Number.parseFloat(cpfFields.ordinaryAccount),
        annualGrowthRate: 0.025,
        notes: 'CPF OA - Can be used for housing, insurance, investments',
      },
      {
        name: 'CPF Special Account',
        category: 'retirement',
        currentValue: Number.parseFloat(cpfFields.specialAccount),
        annualGrowthRate: 0.04,
        notes: 'CPF SA - For retirement and approved investments only',
      },
      {
        name: 'CPF Medisave Account',
        category: 'retirement',
        currentValue: Number.parseFloat(cpfFields.medisaveAccount),
        annualGrowthRate: 0.04,
        notes: 'CPF MA - For healthcare expenses and approved insurance',
      },
    ]

    return { type: 'cpf', accounts }
  }

  const buildPayload = (): FinancialFormValues => {
    const notes = formData.notes.trim()
    const shared = {
      updatedAt: (data as Asset | Income | Liability | Expense | undefined)?.updatedAt ?? new Date().toISOString(),
      notes: notes || undefined,
    }

    switch (type) {
      case 'asset': {
        const asset = data as Asset | undefined
        return {
          type,
          id: asset?.id,
          name: formData.name.trim(),
          category: formData.category.trim() || 'other',
          currentValue: toNumeric(formData.amount),
          annualGrowthRate: Number.parseFloat(formData.annualGrowthRate) || 0,
          ...shared,
        }
      }
      case 'liability': {
        const liability = data as Liability | undefined
        return {
          type,
          id: liability?.id,
          name: formData.name.trim(),
          category: formData.category.trim() || 'other',
          currentBalance: toNumeric(formData.amount),
          interestRateApr: Number.parseFloat(formData.interestRateApr) || 0,
          minimumPayment: roundToDollar(formData.minimumPayment),
          ...shared,
        }
      }
      case 'income': {
        const income = data as Income | undefined
        return {
          type,
          id: income?.id,
          source: formData.name.trim(),
          amount: toNumeric(formData.amount),
          frequency: formData.frequency,
          category: formData.category.trim() || 'other',
          startDate: income?.startDate ?? new Date().toISOString(),
          growthRate: Number.parseFloat(formData.growthRate) || 3.0,
          ...shared,
        }
      }
      case 'expense': {
        const expense = data as Expense | undefined
        return {
          type,
          id: expense?.id,
          payee: formData.name.trim(),
          amount: toNumeric(formData.amount),
          frequency: formData.frequency,
          category: formData.category.trim() || 'other',
          growthRate: Number.parseFloat(formData.growthRate) || 2.0,
          ...shared,
        }
      }
    }
  }

  const getModalTitle = () => {
    const action = mode === 'edit' ? 'Edit' : 'Add'
    const categoryTitle =
      normalizedCategory === 'incomes'
        ? 'Income'
        : normalizedCategory === 'expenses'
          ? 'Expense'
          : normalizedCategory === 'assets'
            ? 'Asset'
            : 'Liability'
    return `${action} ${categoryTitle}`
  }

  const getModalIcon = () => {
    return normalizedCategory === 'incomes'
      ? '💼'
      : normalizedCategory === 'expenses'
        ? '💰'
        : normalizedCategory === 'assets'
          ? '📈'
          : '💳'
  }

  const nameLabel =
    normalizedCategory === 'incomes'
      ? 'Source'
      : normalizedCategory === 'expenses'
        ? 'Payee'
        : 'Name'

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="mx-4 w-full max-w-md rounded-lg border border-gray-700 bg-gray-800">
        <div className="flex items-center justify-between border-b border-gray-700 p-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500">
              <span className="text-lg text-white">{getModalIcon()}</span>
            </div>
            <h2 className="text-lg font-semibold text-white">{getModalTitle()}</h2>
            <span className="rounded-full bg-gray-700 px-2 py-1 text-xs font-medium text-gray-200">
              {selectedYearLabel ?? (selectedYear === 0 ? 'BASE' : `Year ${selectedYear ?? 0}`)}
            </span>
          </div>
          <div className="flex items-center gap-3">
            {mode === 'edit' && data && 'id' in data && data.id && onDelete && (
              <button
                className="flex h-8 w-8 items-center justify-center rounded-full text-gray-400 transition-colors hover:bg-red-600/20 hover:text-red-400"
                disabled={isSaving || isDeleting}
                onClick={handleDelete}
                title="Delete item"
                type="button"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            )}

            <button
              className="flex h-8 w-8 items-center justify-center rounded-full text-gray-400 transition-colors hover:bg-gray-700 hover:text-white"
              disabled={isSaving || isDeleting}
              onClick={onClose}
              title="Close"
              type="button"
            >
              ✕
            </button>
          </div>
        </div>

        <form className="space-y-4 p-6" onSubmit={handleSubmit}>
          {type === 'asset' && mode === 'create' && (
            <div className="flex items-center gap-2 rounded-lg bg-gray-800/60 p-2">
              <button
                type="button"
                className={`flex-1 rounded-md px-3 py-2 text-sm transition ${!isCpfMode ? 'bg-emerald-500 text-white' : 'bg-gray-700 text-gray-200 hover:bg-gray-700/80'}`}
                onClick={() => setIsCpfMode(false)}
              >
                Standard asset
              </button>
              <button
                type="button"
                className={`flex-1 rounded-md px-3 py-2 text-sm transition ${isCpfMode ? 'bg-emerald-500 text-white' : 'bg-gray-700 text-gray-200 hover:bg-gray-700/80'}`}
                onClick={() => setIsCpfMode(true)}
              >
                CPF balances
              </button>
            </div>
          )}

          {!isCpfMode && (
            <>
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-300">{nameLabel}</label>
                <input
                  className="w-full rounded-lg border border-gray-600 bg-gray-700 px-3 py-2 text-white placeholder-gray-400 focus:border-emerald-500 focus:outline-none"
                  onChange={(event) => setFormData((prev) => ({ ...prev, name: event.target.value }))}
                  placeholder="Enter name"
                  required
                  type="text"
                  value={formData.name}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-300">
                    {normalizedCategory === 'assets'
                      ? 'Current Value'
                      : normalizedCategory === 'liabilities'
                        ? 'Balance'
                        : 'Amount'}
                  </label>
                  <input
                    className="w-full rounded-lg border border-gray-600 bg-gray-700 px-3 py-2 text-white placeholder-gray-400 focus:border-emerald-500 focus:outline-none"
                    inputMode="decimal"
                    onChange={(event) =>
                      setFormData((prev) => ({
                        ...prev,
                        amount: formatNumberInput(event.target.value),
                      }))
                    }
                    onBlur={() =>
                      setFormData((prev) => ({
                        ...prev,
                        amount: formatNumberInput(prev.amount),
                      }))
                    }
                    placeholder={`e.g., ${formatCurrency(100000)}`}
                    required
                    value={formData.amount}
                  />                
                </div>
                {(normalizedCategory === 'incomes' || normalizedCategory === 'expenses') && (
                  <div>
                    <label className="mb-2 block text-sm font-medium text-gray-300">Frequency</label>
                    <select
                      className="w-full rounded-lg border border-gray-600 bg-gray-700 px-3 py-2 text-white focus:border-emerald-500 focus:outline-none"
                      onChange={(event) =>
                        setFormData((prev) => ({
                          ...prev,
                          frequency: event.target.value as Frequency,
                        }))
                      }
                      value={formData.frequency}
                    >
                      <option value="weekly">Weekly</option>
                      <option value="biweekly">Bi-weekly</option>
                      <option value="monthly">Monthly</option>
                      <option value="quarterly">Quarterly</option>
                      <option value="yearly">Yearly</option>
                    </select>
                  </div>
                )}

                {normalizedCategory === 'assets' && (
                  <div>
                    <label className="mb-2 block text-sm font-medium text-gray-300">
                      Annual Growth Rate (%)
                    </label>
                    <input
                      className="w-full rounded-lg border border-gray-600 bg-gray-700 px-3 py-2 text-white placeholder-gray-400 focus:border-emerald-500 focus:outline-none"
                      onChange={(event) =>
                        setFormData((prev) => ({
                          ...prev,
                          annualGrowthRate: event.target.value,
                        }))
                      }
                      placeholder="7.0"
                      step="0.1"
                      type="number"
                      value={formData.annualGrowthRate}
                    />
                  </div>
                )}
              </div>

              {normalizedCategory === 'liabilities' && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="mb-2 block text-sm font-medium text-gray-300">Interest Rate APR (%)</label>
                    <input
                      className="w-full rounded-lg border border-gray-600 bg-gray-700 px-3 py-2 text-white placeholder-gray-400 focus:border-emerald-500 focus:outline-none"
                      onChange={(event) =>
                        setFormData((prev) => ({
                          ...prev,
                          interestRateApr: event.target.value,
                        }))
                      }
                      placeholder="4.5"
                      step="0.1"
                      type="number"
                      value={formData.interestRateApr}
                    />
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-medium text-gray-300">Min Payment</label>
                    <input
                      className="w-full rounded-lg border border-gray-600 bg-gray-700 px-3 py-2 text-white placeholder-gray-400 focus:border-emerald-500 focus:outline-none"
                      min="0"
                      onChange={(event) =>
                        setFormData((prev) => ({
                          ...prev,
                          minimumPayment: event.target.value,
                        }))
                      }
                      placeholder="100"
                      step="0.01"
                      type="number"
                      value={formData.minimumPayment}
                    />
                  </div>
                </div>
              )}

              {(normalizedCategory === 'incomes' || normalizedCategory === 'expenses') && (
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-300">
                    Annual Growth Rate (%)
                  </label>
                  <input
                    className="w-full rounded-lg border border-gray-600 bg-gray-700 px-3 py-2 text-white placeholder-gray-400 focus:border-emerald-500 focus:outline-none"
                    onChange={(event) =>
                      setFormData((prev) => ({
                        ...prev,
                        growthRate: event.target.value,
                      }))
                    }
                    placeholder={normalizedCategory === 'incomes' ? '3.0' : '2.0'}
                    step="0.1"
                    type="number"
                    value={formData.growthRate}
                  />
                  <p className="mt-1 text-xs text-gray-400">
                    {normalizedCategory === 'incomes'
                      ? 'Expected annual increase in income (e.g., salary raises)'
                      : 'Expected annual increase in expenses (e.g., inflation)'}
                  </p>
                </div>
              )}

              <div>
                <label className="mb-2 block text-sm font-medium text-gray-300">Category</label>
                <select
                  className="w-full rounded-lg border border-gray-600 bg-gray-700 px-3 py-2 text-white focus:border-emerald-500 focus:outline-none"
                  onChange={(event) => {
                    const newCategory = event.target.value
                    const newRate = getRateForCategory(type, newCategory, growthConfigs)
                    setFormData((prev) => ({
                      ...prev,
                      category: newCategory,
                      // Update rate fields based on type
                      ...(type === 'asset' && { annualGrowthRate: newRate.toString() }),
                      ...(type === 'liability' && { interestRateApr: Math.abs(newRate).toString() }),
                      ...((type === 'income' || type === 'expense') && { growthRate: newRate.toString() }),
                    }))
                  }}
                  value={formData.category}
                >
                  {categorySelectOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>

                {type === 'liability' && formData.category === '' && (
                  <button
                    className="mt-2 w-full rounded-lg border border-blue-400/70 bg-blue-500/10 px-3 py-2 text-sm text-blue-100 transition hover:bg-blue-500/20 sm:w-auto"
                    onClick={() => {
                      const newRate = getRateForCategory(type, MORTGAGE_CATEGORY, growthConfigs)
                      setFormData((prev) => ({
                        ...prev,
                        category: MORTGAGE_CATEGORY,
                        interestRateApr: Math.abs(newRate).toString(),
                      }))
                    }}
                    type="button"
                  >
                    Default to mortgage
                  </button>
                )}
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-gray-300">Notes (optional)</label>
                <textarea
                  className="w-full rounded-lg border border-gray-600 bg-gray-700 px-3 py-2 text-white placeholder-gray-400 focus:border-emerald-500 focus:outline-none"
                  onChange={(event) =>
                    setFormData((prev) => ({ ...prev, notes: event.target.value }))
                  }
                  placeholder="Add additional details"
                  rows={3}
                  value={formData.notes}
                />
              </div>
            </>
          )}

          {isCpfMode && (
            <div className="space-y-3 rounded-lg border border-gray-700 bg-gray-800 p-4">
              <div>
                <p className="text-sm font-semibold text-white">CPF balances</p>
                <p className="text-xs text-gray-400">
                  We will create OA, SA, and MA as retirement assets with CPF growth assumptions.
                </p>
              </div>
              <CpfField
                label="Ordinary Account (OA)"
                placeholder="45000.00"
                value={cpfFields.ordinaryAccount}
                onChange={(value) =>
                  setCpfFields((prev) => ({ ...prev, ordinaryAccount: value }))
                }
                error={cpfErrors.ordinaryAccount}
              />
              <CpfField
                label="Special Account (SA)"
                placeholder="25000.00"
                value={cpfFields.specialAccount}
                onChange={(value) =>
                  setCpfFields((prev) => ({ ...prev, specialAccount: value }))
                }
                error={cpfErrors.specialAccount}
              />
              <CpfField
                label="Medisave Account (MA)"
                placeholder="15000.00"
                value={cpfFields.medisaveAccount}
                onChange={(value) =>
                  setCpfFields((prev) => ({ ...prev, medisaveAccount: value }))
                }
                error={cpfErrors.medisaveAccount}
              />
            </div>
          )}

          <div className="flex justify-between border-t border-gray-700 pt-4">
            <button
              className="px-4 py-2 text-gray-400 transition-colors hover:text-white"
              disabled={isSaving || isDeleting}
              onClick={onClose}
              type="button"
            >
              Cancel
            </button>
            <button
              className="rounded-lg bg-emerald-500 px-6 py-2 text-white transition-colors hover:bg-emerald-600 disabled:bg-gray-600"
              disabled={isSaving || isDeleting}
              type="submit"
            >
              {isSaving ? 'Saving...' : mode === 'edit' ? 'Update' : 'Add'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

type CpfFieldProps = {
  label: string
  placeholder: string
  value: string
  onChange: (value: string) => void
  error?: string
}

function CpfField({ label, placeholder, value, onChange, error }: CpfFieldProps) {
  return (
    <div className="space-y-1.5">
      <label className="block text-sm font-medium text-gray-200">{label}</label>
      <input
        type="number"
        step="0.01"
        placeholder={placeholder}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-lg border border-gray-600 bg-gray-700 px-3 py-2 text-white placeholder-gray-500 focus:border-emerald-500 focus:outline-none"
      />
      {error && <p className="text-xs text-rose-300">{error}</p>}
    </div>
  )
}

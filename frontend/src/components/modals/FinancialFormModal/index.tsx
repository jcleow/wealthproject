import { useEffect, useState } from 'react'
import { Trash2 } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'

import { Modal } from '@/components/ui/Modal'
import type { Asset, Expense, Frequency, Income, Liability } from '@/types/financial'
import { formatCurrency } from '@/lib/format'
import { growthApi } from '@/api/financial'
import { QUERY_KEYS } from '@/lib/queryKeys'

import {
  UPDATE_MODE_IN_PLACE,
  UPDATE_MODE_VERSIONED,
  type FormState,
  type FinancialFormValues,
  type FinancialFormModalProps,
  type CpfFields,
  type CpfAssetEntry,
} from './types'
import {
  MORTGAGE_CATEGORY,
  getCategoryOptions,
  getNormalizedCategory,
  getModalTitle,
  getModalIcon,
  getNameLabel,
  getAmountLabel,
} from './config'
import {
  roundToDollar,
  toNumeric,
  formatNumberInput,
  toSafeText,
  getRateForCategory,
  buildDefaultFormState,
  calculateVersionStartDate,
  calculateStopEndDate,
} from './helpers'
import { MinPaymentWarningModal } from './MinPaymentWarningModal'
import { DeleteConfirmationModal } from './DeleteConfirmationModal'
import { CpfForm } from './CpfForm'

// Re-export types for consumers
export type { FinancialDataType, FinancialFormValues, FinancialFormModalProps, CpfFormValues } from './types'

export function FinancialFormModal({
  type,
  mode,
  data,
  isOpen,
  onClose,
  onSave,
  onDelete,
  onStop,
  selectedYear,
  selectedMonth,
  selectedYearLabel,
  anchorYear,
}: FinancialFormModalProps) {
  // Fetch user's growth configs for default rates
  const { data: growthConfigs } = useQuery({
    queryKey: QUERY_KEYS.financial.growth,
    queryFn: () => growthApi.getGrowthConfigs(),
    staleTime: 5 * 60 * 1000,
  })

  // Form state
  const [formData, setFormData] = useState<FormState>(buildDefaultFormState(type, growthConfigs))
  const [isSaving, setIsSaving] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isCpfMode, setIsCpfMode] = useState(false)
  const [cpfFields, setCpfFields] = useState<CpfFields>({
    ordinaryAccount: '',
    specialAccount: '',
    medisaveAccount: '',
  })
  const [cpfErrors, setCpfErrors] = useState<Partial<CpfFields>>({})

  // Dialog state
  const [showMinPaymentWarning, setShowMinPaymentWarning] = useState(false)
  const [pendingPayload, setPendingPayload] = useState<FinancialFormValues | null>(null)
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false)
  const [deleteMode, setDeleteMode] = useState<'stop' | 'delete'>('stop')
  const [applyFromThisMonthOnly, setApplyFromThisMonthOnly] = useState(true)

  // Derived values
  const isFutureMonth = (selectedYear ?? 0) > 0 || (selectedMonth ?? 1) > 1
  const normalizedCategory = getNormalizedCategory(type)
  const categoryOptions = getCategoryOptions(type)
  const isBusy = isSaving || isDeleting

  // Fetch liabilities for debt repayment minimum payment check
  const isDebtRepayment = type === 'expense' && !!(data as any)?.sourceLiabilityId
  const { data: liabilitiesData } = useQuery({
    queryKey: ['liabilities-for-min-payment'],
    queryFn: async () => {
      const result = await import('@/api/financial').then((m) =>
        m.liabilitiesApi.listLiabilities({ limit: -1 })
      )
      return result.data
    },
    enabled: isDebtRepayment,
    staleTime: 30_000,
  })

  // Category select options (include current category if not in list)
  const categorySelectOptions =
    categoryOptions.some((opt) => opt.value === formData.category) || !formData.category
      ? categoryOptions
      : [...categoryOptions, { value: formData.category, label: formData.category }]

  // Reset form when modal opens
  useEffect(() => {
    if (!isOpen) return

    // Reset all state
    setIsCpfMode(false)
    setCpfFields({ ordinaryAccount: '', specialAccount: '', medisaveAccount: '' })
    setCpfErrors({})
    setShowMinPaymentWarning(false)
    setPendingPayload(null)
    setApplyFromThisMonthOnly(true) // Default to "this month onwards" for versioned updates
    setShowDeleteConfirmation(false)
    setDeleteMode('stop')

    if (!data) {
      setFormData(buildDefaultFormState(type, growthConfigs))
      return
    }

    // Populate form based on type
    populateFormFromData(data)
  }, [data, isOpen, type, growthConfigs])

  // Handle escape key
  useEffect(() => {
    if (!isOpen) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isBusy) onClose()
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, isBusy, onClose])

  function populateFormFromData(itemData: NonNullable<typeof data>) {
    switch (type) {
      case 'asset': {
        const asset = itemData as Asset
        const amt = (asset as any).amountAnnual ?? asset.currentValue ?? 0
        const itemRate = asset.annualGrowthRate
        const effectiveRate =
          itemRate && itemRate !== 0
            ? itemRate
            : getRateForCategory(type, asset.category, growthConfigs)
        setFormData({
          name: toSafeText(asset.name),
          amount: formatNumberInput(roundToDollar(amt)),
          frequency: 'monthly',
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
        const liability = itemData as Liability
        const amt = (liability as any).amountAnnual ?? liability.currentBalance ?? 0
        const itemRate = liability.interestRateApr
        const effectiveRate =
          itemRate && itemRate !== 0
            ? itemRate
            : Math.abs(getRateForCategory(type, liability.category, growthConfigs))
        setFormData({
          name: toSafeText(liability.name),
          amount: formatNumberInput(roundToDollar(amt)),
          frequency: 'monthly',
          category: liability.category,
          annualGrowthRate: '7.0',
          interestRateApr: effectiveRate.toString(),
          minimumPayment: roundToDollar(liability.minimumPayment ?? 0).toString(),
          growthRate: '2.0',
          notes: liability.notes ?? '',
        })
        break
      }
      case 'income':
      case 'expense': {
        const item = itemData as Income | Expense
        const sourceAmt = (item as any).sourceAmount
        const freq = (item as any).sourceFrequency ?? (item as any).frequency ?? 'annual'

        let amt: number
        if (sourceAmt !== undefined && sourceAmt !== null) {
          amt = sourceAmt
        } else {
          const annualAmt = (item as any).amountAnnual ?? (item as any).amount ?? 0
          const monthlyAmt = (item as any).amountMonthly
          if (freq === 'monthly' && monthlyAmt !== undefined) {
            amt = monthlyAmt
          } else if (freq === 'monthly' && annualAmt) {
            amt = annualAmt / 12
          } else {
            amt = annualAmt
          }
        }

        const itemName =
          type === 'income'
            ? (item as Income).source ?? (item as any).name ?? ''
            : (item as Expense).payee ?? (item as any).name ?? ''
        const itemRate = (item as any).growthRate
        const effectiveRate =
          itemRate && itemRate !== 0
            ? itemRate
            : getRateForCategory(type, item.category, growthConfigs)

        setFormData({
          name: toSafeText(itemName),
          amount: formatNumberInput(roundToDollar(amt)),
          frequency: freq,
          category: item.category,
          annualGrowthRate: '7.0',
          interestRateApr: '4.5',
          minimumPayment: '',
          growthRate: effectiveRate.toString(),
          notes: item.notes ?? '',
        })
        break
      }
      case 'investment': {
        const investment = itemData as Asset
        const amt = (investment as any).amountAnnual ?? investment.currentValue ?? 0
        const itemRate = investment.annualGrowthRate
        const effectiveRate =
          itemRate !== undefined && itemRate !== null
            ? itemRate
            : getRateForCategory('asset', investment.category, growthConfigs)
        setFormData({
          name: toSafeText(investment.name),
          amount: formatNumberInput(roundToDollar(amt)),
          frequency: 'monthly',
          category: investment.category,
          annualGrowthRate: effectiveRate.toString(),
          interestRateApr: '4.5',
          minimumPayment: '',
          growthRate: effectiveRate.toString(),
          notes: investment.notes ?? '',
        })
        break
      }
    }
  }

  function getLinkedLiabilityMinPayment(): number | null {
    if (type !== 'expense' || !data) return null
    const sourceLiabilityId = (data as any).sourceLiabilityId
    if (!sourceLiabilityId || !liabilitiesData) return null
    const liability = liabilitiesData.find((l: Liability) => l.id === sourceLiabilityId)
    return liability?.minimumPayment ?? null
  }

  function validateCpfFields(): boolean {
    const errors: Partial<CpfFields> = {}
    const validate = (key: keyof CpfFields, label: string) => {
      const raw = cpfFields[key].trim()
      if (!raw) {
        errors[key] = `${label} is required`
        return
      }
      const numeric = Number.parseFloat(raw)
      if (Number.isNaN(numeric)) {
        errors[key] = 'Enter a valid number'
      } else if (numeric < 0) {
        errors[key] = 'Value cannot be negative'
      }
    }
    validate('ordinaryAccount', 'Ordinary Account')
    validate('specialAccount', 'Special Account')
    validate('medisaveAccount', 'Medisave Account')
    setCpfErrors(errors)
    return Object.keys(errors).length === 0
  }

  function buildCpfPayload(): FinancialFormValues {
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

  function buildPayload(): FinancialFormValues {
    const notes = formData.notes.trim()
    const shared = {
      updatedAt: (data as any)?.updatedAt ?? new Date().toISOString(),
      notes: notes || undefined,
    }

    switch (type) {
      case 'asset':
        return {
          type,
          id: (data as Asset | undefined)?.id,
          name: formData.name.trim(),
          category: formData.category.trim() || 'other',
          currentValue: toNumeric(formData.amount),
          annualGrowthRate: Number.parseFloat(formData.annualGrowthRate) || 0,
          ...shared,
        }
      case 'liability':
        return {
          type,
          id: (data as Liability | undefined)?.id,
          name: formData.name.trim(),
          category: formData.category.trim() || 'other',
          currentBalance: toNumeric(formData.amount),
          interestRateApr: Number.parseFloat(formData.interestRateApr) || 0,
          minimumPayment: roundToDollar(formData.minimumPayment),
          ...shared,
        }
      case 'income':
        return {
          type,
          id: (data as Income | undefined)?.id,
          source: formData.name.trim(),
          amount: toNumeric(formData.amount),
          frequency: formData.frequency,
          category: formData.category.trim() || 'other',
          startDate: (data as Income | undefined)?.startDate ?? new Date().toISOString(),
          growthRate: Number.parseFloat(formData.growthRate) || 3.0,
          ...shared,
        }
      case 'expense': {
        const sourceLiabilityId = (data as any)?.sourceLiabilityId
        const updateMode = applyFromThisMonthOnly ? UPDATE_MODE_VERSIONED : UPDATE_MODE_IN_PLACE
        const versionStartDate =
          applyFromThisMonthOnly &&
          anchorYear &&
          selectedYear !== undefined &&
          selectedMonth !== undefined
            ? calculateVersionStartDate(anchorYear, selectedYear, selectedMonth)
            : undefined

        return {
          type,
          id: (data as Expense | undefined)?.id,
          payee: formData.name.trim(),
          amount: toNumeric(formData.amount),
          frequency: formData.frequency,
          category: formData.category.trim() || 'other',
          growthRate: Number.parseFloat(formData.growthRate) || 2.0,
          ...(sourceLiabilityId && { sourceLiabilityId }),
          ...(mode === 'edit' && isFutureMonth && { updateMode }),
          ...(versionStartDate && { startDate: versionStartDate }),
          ...shared,
        }
      }
      case 'investment': {
        const parsedRate = Number.parseFloat(formData.annualGrowthRate)
        return {
          type,
          id: (data as Asset | undefined)?.id,
          name: formData.name.trim(),
          category: formData.category.trim() || 'other_investment',
          currentValue: toNumeric(formData.amount),
          annualGrowthRate: Number.isNaN(parsedRate) ? 6.0 : parsedRate,
          ...shared,
        }
      }
    }
  }

  async function performSave(payload: FinancialFormValues) {
    setIsSaving(true)
    try {
      await onSave(payload, mode)
    } finally {
      setIsSaving(false)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (isCpfMode && type === 'asset' && mode === 'create') {
      if (!validateCpfFields()) return
    }

    const payload = isCpfMode && type === 'asset' && mode === 'create' ? buildCpfPayload() : buildPayload()

    // Check for minimum payment warning
    const minPayment = getLinkedLiabilityMinPayment()
    if (minPayment !== null && type === 'expense' && payload.type === 'expense') {
      if (payload.amount < minPayment) {
        setPendingPayload(payload)
        setShowMinPaymentWarning(true)
        return
      }
    }

    await performSave(payload)
  }

  async function handleDelete() {
    if (!data || !('id' in data) || !data.id || !onDelete) return

    // For expenses at future months, show confirmation modal
    if (type === 'expense' && isFutureMonth && onStop) {
      setShowDeleteConfirmation(true)
      return
    }

    if (!confirm('Are you sure you want to delete this item?')) return

    setIsDeleting(true)
    try {
      await onDelete(data.id)
    } finally {
      setIsDeleting(false)
    }
  }

  async function handleConfirmDelete() {
    if (!data || !('id' in data) || !data.id) return

    setIsDeleting(true)
    try {
      if (
        deleteMode === 'stop' &&
        onStop &&
        anchorYear &&
        selectedYear !== undefined &&
        selectedMonth !== undefined
      ) {
        const endDate = calculateStopEndDate(anchorYear, selectedYear, selectedMonth)
        await onStop(data.id, endDate)
      } else if (onDelete) {
        await onDelete(data.id)
      }
      setShowDeleteConfirmation(false)
    } finally {
      setIsDeleting(false)
    }
  }

  function updateFormField<K extends keyof FormState>(field: K, value: FormState[K]) {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  function handleCategoryChange(newCategory: string) {
    const newRate = getRateForCategory(type, newCategory, growthConfigs)
    setFormData((prev) => ({
      ...prev,
      category: newCategory,
      ...(type === 'asset' && { annualGrowthRate: newRate.toString() }),
      ...(type === 'liability' && { interestRateApr: Math.abs(newRate).toString() }),
      ...((type === 'income' || type === 'expense') && { growthRate: newRate.toString() }),
    }))
  }

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={isBusy ? undefined : onClose}
        overlayClassName="bg-black/60"
        className="mx-4 w-full max-w-md overflow-hidden rounded-2xl border border-white/[0.08] bg-gradient-to-br from-[#0a0a0a] to-[#0f0f0f] shadow-xl"
      >
        {/* Header */}
        <div className="border-b border-white/[0.06] bg-gradient-to-r from-[#0a0a0a] to-[#0f0f0f] p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 to-emerald-600 shadow-lg shadow-emerald-500/20">
                <span className="text-lg text-white">{getModalIcon(normalizedCategory)}</span>
              </div>
              <div className="flex flex-col gap-1">
                <h2 className="text-lg font-semibold text-white">
                  {getModalTitle(mode, normalizedCategory)}
                </h2>
                <span className="text-xs font-medium text-emerald-400">
                  {selectedYearLabel ?? (selectedYear === 0 ? 'BASE' : `Year ${selectedYear ?? 0}`)}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {mode === 'edit' && data && 'id' in data && data.id && onDelete && (
                <button
                  type="button"
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 transition-all hover:bg-red-600/20 hover:text-red-400"
                  disabled={isBusy}
                  onClick={handleDelete}
                  title="Delete item"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
              <button
                type="button"
                className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 transition-all hover:bg-white/10 hover:text-white"
                disabled={isBusy}
                onClick={onClose}
                title="Close"
              >
                ✕
              </button>
            </div>
          </div>
        </div>

        {/* Form */}
        <form className="space-y-5 p-6" onSubmit={handleSubmit}>
          {/* CPF mode toggle for assets */}
          {type === 'asset' && mode === 'create' && (
            <div className="flex items-center gap-2 rounded-lg bg-white/[0.02] p-1">
              <button
                type="button"
                className={`flex-1 rounded-md px-3 py-2 text-sm font-medium transition-all ${
                  !isCpfMode
                    ? 'bg-gradient-to-r from-emerald-500 to-emerald-600 text-white shadow-lg shadow-emerald-500/20'
                    : 'text-gray-300 hover:text-white'
                }`}
                onClick={() => setIsCpfMode(false)}
              >
                Standard asset
              </button>
              <button
                type="button"
                className={`flex-1 rounded-md px-3 py-2 text-sm font-medium transition-all ${
                  isCpfMode
                    ? 'bg-gradient-to-r from-emerald-500 to-emerald-600 text-white shadow-lg shadow-emerald-500/20'
                    : 'text-gray-300 hover:text-white'
                }`}
                onClick={() => setIsCpfMode(true)}
              >
                CPF balances
              </button>
            </div>
          )}

          {/* Standard form fields */}
          {!isCpfMode && (
            <>
              {/* Name field */}
              <div>
                <label className="mb-2.5 block text-sm font-medium text-gray-200">
                  {getNameLabel(normalizedCategory)}
                </label>
                <input
                  type="text"
                  required
                  className="w-full rounded-lg border border-white/[0.08] bg-white/[0.03] px-3.5 py-2.5 text-white placeholder-gray-500 transition-all focus:border-emerald-500 focus:bg-white/[0.05] focus:outline-none focus:ring-1 focus:ring-emerald-500/20"
                  placeholder="Enter name"
                  value={formData.name}
                  onChange={(e) => updateFormField('name', e.target.value)}
                />
              </div>

              {/* Amount and frequency row */}
              <div className="grid grid-cols-2 gap-3.5">
                <div>
                  <label className="mb-2.5 block text-sm font-medium text-gray-200">
                    {getAmountLabel(normalizedCategory)}
                  </label>
                  <input
                    inputMode="decimal"
                    required
                    className="w-full rounded-lg border border-white/[0.08] bg-white/[0.03] px-3.5 py-2.5 text-white placeholder-gray-500 transition-all focus:border-emerald-500 focus:bg-white/[0.05] focus:outline-none focus:ring-1 focus:ring-emerald-500/20"
                    placeholder={`e.g., ${formatCurrency(100000)}`}
                    value={formData.amount}
                    onChange={(e) => updateFormField('amount', formatNumberInput(e.target.value))}
                    onBlur={() => updateFormField('amount', formatNumberInput(formData.amount))}
                  />
                </div>

                {/* Frequency for income/expense */}
                {(normalizedCategory === 'incomes' || normalizedCategory === 'expenses') && (
                  <div>
                    <label className="mb-2.5 block text-sm font-medium text-gray-200">Frequency</label>
                    <select
                      className="w-full rounded-lg border border-white/[0.08] bg-white/[0.03] px-3.5 py-2.5 text-white transition-all focus:border-emerald-500 focus:bg-white/[0.05] focus:outline-none focus:ring-1 focus:ring-emerald-500/20"
                      value={formData.frequency}
                      onChange={(e) => updateFormField('frequency', e.target.value as Frequency)}
                    >
                      <option value="weekly">Weekly</option>
                      <option value="biweekly">Bi-weekly</option>
                      <option value="monthly">Monthly</option>
                      <option value="quarterly">Quarterly</option>
                      <option value="annual">Annual</option>
                    </select>
                  </div>
                )}

                {/* Growth rate for assets/investments */}
                {(normalizedCategory === 'assets' || normalizedCategory === 'investments') && (
                  <div>
                    <label className="mb-2.5 block text-sm font-medium text-gray-200">
                      Annual Growth Rate (%)
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      className="w-full rounded-lg border border-white/[0.08] bg-white/[0.03] px-3.5 py-2.5 text-white placeholder-gray-500 transition-all focus:border-emerald-500 focus:bg-white/[0.05] focus:outline-none focus:ring-1 focus:ring-emerald-500/20"
                      placeholder="7.0"
                      value={formData.annualGrowthRate}
                      onChange={(e) => updateFormField('annualGrowthRate', e.target.value)}
                    />
                  </div>
                )}
              </div>

              {/* Liability specific fields */}
              {normalizedCategory === 'liabilities' && (
                <div className="grid grid-cols-2 gap-3.5">
                  <div>
                    <label className="mb-2.5 block text-sm font-medium text-gray-200">
                      Interest Rate APR (%)
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      className="w-full rounded-lg border border-white/[0.08] bg-white/[0.03] px-3.5 py-2.5 text-white placeholder-gray-500 transition-all focus:border-emerald-500 focus:bg-white/[0.05] focus:outline-none focus:ring-1 focus:ring-emerald-500/20"
                      placeholder="4.5"
                      value={formData.interestRateApr}
                      onChange={(e) => updateFormField('interestRateApr', e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="mb-2.5 block text-sm font-medium text-gray-200">
                      Min Payment
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      className="w-full rounded-lg border border-white/[0.08] bg-white/[0.03] px-3.5 py-2.5 text-white placeholder-gray-500 transition-all focus:border-emerald-500 focus:bg-white/[0.05] focus:outline-none focus:ring-1 focus:ring-emerald-500/20"
                      placeholder="100"
                      value={formData.minimumPayment}
                      onChange={(e) => updateFormField('minimumPayment', e.target.value)}
                    />
                  </div>
                </div>
              )}

              {/* Growth rate for income/expense */}
              {(normalizedCategory === 'incomes' || normalizedCategory === 'expenses') && (
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-300">
                    Annual Growth Rate (%)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    className="w-full rounded-lg border border-gray-600 bg-gray-700 px-3 py-2 text-white placeholder-gray-400 focus:border-emerald-500 focus:outline-none"
                    placeholder={normalizedCategory === 'incomes' ? '3.0' : '2.0'}
                    value={formData.growthRate}
                    onChange={(e) => updateFormField('growthRate', e.target.value)}
                  />
                  <p className="mt-1 text-xs text-gray-400">
                    {normalizedCategory === 'incomes'
                      ? 'Expected annual increase in income (e.g., salary raises)'
                      : 'Expected annual increase in expenses (e.g., inflation)'}
                  </p>
                </div>
              )}

              {/* Category selector */}
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-300">Category</label>
                <select
                  className="w-full rounded-lg border border-gray-600 bg-gray-700 px-3 py-2 text-white focus:border-emerald-500 focus:outline-none"
                  value={formData.category}
                  onChange={(e) => handleCategoryChange(e.target.value)}
                >
                  {categorySelectOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>

                {type === 'liability' && formData.category === '' && (
                  <button
                    type="button"
                    className="mt-2 w-full rounded-lg border border-blue-400/70 bg-blue-500/10 px-3 py-2 text-sm text-blue-100 transition hover:bg-blue-500/20 sm:w-auto"
                    onClick={() => handleCategoryChange(MORTGAGE_CATEGORY)}
                  >
                    Default to mortgage
                  </button>
                )}
              </div>

              {/* Notes */}
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-300">
                  Notes (optional)
                </label>
                <textarea
                  rows={3}
                  className="w-full rounded-lg border border-gray-600 bg-gray-700 px-3 py-2 text-white placeholder-gray-400 focus:border-emerald-500 focus:outline-none"
                  placeholder="Add additional details"
                  value={formData.notes}
                  onChange={(e) => updateFormField('notes', e.target.value)}
                />
              </div>

              {/* Update scope selector for expenses at future months */}
              {type === 'expense' && mode === 'edit' && isFutureMonth && (
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-200">Apply changes to</label>
                  <div className="flex rounded-lg bg-white/[0.03] p-1">
                    <button
                      type="button"
                      onClick={() => setApplyFromThisMonthOnly(true)}
                      className={`flex-1 rounded-md px-3 py-2 text-sm font-medium transition-all ${
                        applyFromThisMonthOnly
                          ? 'bg-white/10 text-white shadow-sm'
                          : 'text-gray-500 hover:text-gray-300'
                      }`}
                    >
                      This month onwards
                    </button>
                    <button
                      type="button"
                      onClick={() => setApplyFromThisMonthOnly(false)}
                      className={`flex-1 rounded-md px-3 py-2 text-sm font-medium transition-all ${
                        !applyFromThisMonthOnly
                          ? 'bg-white/10 text-white shadow-sm'
                          : 'text-gray-500 hover:text-gray-300'
                      }`}
                    >
                      From the start
                    </button>
                  </div>
                </div>
              )}
            </>
          )}

          {/* CPF form */}
          {isCpfMode && <CpfForm fields={cpfFields} errors={cpfErrors} onChange={setCpfFields} />}

          {/* Footer buttons */}
          <div className="flex justify-between border-t border-gray-700 pt-4">
            <button
              type="button"
              className="px-4 py-2 text-gray-400 transition-colors hover:text-white"
              disabled={isBusy}
              onClick={onClose}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="rounded-lg bg-emerald-500 px-6 py-2 text-white transition-colors hover:bg-emerald-600 disabled:bg-gray-600"
              disabled={isBusy}
            >
              {isSaving ? 'Saving...' : mode === 'edit' ? 'Update' : 'Add'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Min payment warning modal */}
      <MinPaymentWarningModal
        isOpen={showMinPaymentWarning}
        onCancel={() => {
          setShowMinPaymentWarning(false)
          setPendingPayload(null)
        }}
        onConfirm={async () => {
          if (pendingPayload) {
            setShowMinPaymentWarning(false)
            await performSave(pendingPayload)
            setPendingPayload(null)
          }
        }}
        isSaving={isSaving}
        newAmount={pendingPayload?.type === 'expense' ? pendingPayload.amount : 0}
        minPayment={getLinkedLiabilityMinPayment() ?? 0}
      />

      {/* Delete confirmation modal */}
      <DeleteConfirmationModal
        isOpen={showDeleteConfirmation}
        onCancel={() => {
          setShowDeleteConfirmation(false)
          setDeleteMode('stop')
        }}
        onConfirm={handleConfirmDelete}
        isDeleting={isDeleting}
        deleteMode={deleteMode}
        onDeleteModeChange={setDeleteMode}
        selectedYearLabel={selectedYearLabel}
        selectedYear={selectedYear}
      />
    </>
  )
}

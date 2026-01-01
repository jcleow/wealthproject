import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'

import type { Asset, Expense, Income, Liability, Frequency } from '@/types/financial'
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
} from '../types'
import {
  roundToDollar,
  toNumeric,
  formatNumberInput,
  toSafeText,
  getRateForCategory,
  buildDefaultFormState,
  calculateVersionStartDate,
  calculateStopEndDate,
  calculateLeaseEndDate,
} from '../helpers'

/** Combined data type for all possible properties from union */
type FormData = NonNullable<FinancialFormModalProps['data']>

/** Type guard to safely access optional properties from data union */
function getDataProp<T>(data: FormData | undefined | null, key: string): T | undefined {
  if (!data) return undefined
  return (data as Record<string, unknown>)[key] as T | undefined
}

interface UseFinancialFormParams {
  type: FinancialFormModalProps['type']
  mode: FinancialFormModalProps['mode']
  data: FinancialFormModalProps['data']
  isOpen: boolean
  onSave: FinancialFormModalProps['onSave']
  onDelete?: FinancialFormModalProps['onDelete']
  onStop?: FinancialFormModalProps['onStop']
  onClose: () => void
  selectedYear?: number
  selectedMonth?: number
  anchorYear?: number
}

export function useFinancialForm({
  type,
  mode,
  data,
  isOpen,
  onSave,
  onDelete,
  onStop,
  onClose,
  selectedYear,
  selectedMonth,
  anchorYear,
}: UseFinancialFormParams) {
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
  const [formErrors, setFormErrors] = useState<{ personId?: boolean }>({})
  const [hasAttemptedSubmit, setHasAttemptedSubmit] = useState(false)

  // Derived values
  const isFutureMonth = (selectedYear ?? 0) > 0 || (selectedMonth ?? 1) > 1
  const isBusy = isSaving || isDeleting
  const isDebtRepayment = type === 'expense' && !!getDataProp<string>(data, 'sourceLiabilityId')

  // Fetch liabilities for debt repayment minimum payment check
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

  // Reset form when modal opens
  useEffect(() => {
    if (!isOpen) return

    // Reset all state
    setIsCpfMode(false)
    setCpfFields({ ordinaryAccount: '', specialAccount: '', medisaveAccount: '' })
    setCpfErrors({})
    setShowMinPaymentWarning(false)
    setPendingPayload(null)
    setApplyFromThisMonthOnly(true)
    setShowDeleteConfirmation(false)
    setDeleteMode('stop')
    setFormErrors({})
    setHasAttemptedSubmit(false)

    if (!data) {
      setFormData(buildDefaultFormState(type, growthConfigs))
      return
    }

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
        const amt = getDataProp<number>(itemData, 'amountAnnual') ?? asset.currentValue ?? 0
        const itemRate = asset.annualGrowthRate
        const effectiveRate =
          itemRate && itemRate !== 0
            ? itemRate
            : getRateForCategory(type, asset.category, growthConfigs)

        setFormData({
          name: toSafeText(asset.name),
          personId: null,
          amount: formatNumberInput(roundToDollar(amt)),
          frequency: 'monthly',
          category: asset.category,
          annualGrowthRate: effectiveRate.toString(),
          interestRateApr: '4.5',
          minimumPayment: '',
          growthRate: '3.0',
          notes: asset.notes ?? '',
          // Useful life fields
          terminalValue: asset.terminalValue !== null && asset.terminalValue !== undefined
            ? formatNumberInput(asset.terminalValue.toString())
            : '',
          leaseStartYear: '',
          usefulLifeYears: '',
        })
        break
      }
      case 'liability': {
        const liability = itemData as Liability
        const amt = getDataProp<number>(itemData, 'amountAnnual') ?? liability.currentBalance ?? 0
        const itemRate = liability.interestRateApr
        const effectiveRate =
          itemRate && itemRate !== 0
            ? itemRate
            : Math.abs(getRateForCategory(type, liability.category, growthConfigs))
        setFormData({
          name: toSafeText(liability.name),
          personId: null,
          amount: formatNumberInput(roundToDollar(amt)),
          frequency: 'monthly',
          category: liability.category,
          annualGrowthRate: '7.0',
          interestRateApr: effectiveRate.toString(),
          minimumPayment: roundToDollar(liability.minimumPayment ?? 0).toString(),
          growthRate: '2.0',
          notes: liability.notes ?? '',
          terminalValue: '',
          leaseStartYear: '',
          usefulLifeYears: '',
        })
        break
      }
      case 'income':
      case 'expense': {
        const item = itemData as Income | Expense
        const sourceAmt = getDataProp<number>(itemData, 'sourceAmount')
        const freq: Frequency = (getDataProp<Frequency>(itemData, 'sourceFrequency') ?? item.frequency) || 'annual'

        let amt: number
        if (sourceAmt !== undefined && sourceAmt !== null) {
          amt = sourceAmt
        } else {
          const annualAmt = getDataProp<number>(itemData, 'amountAnnual') ?? item.amount ?? 0
          const monthlyAmt = getDataProp<number>(itemData, 'amountMonthly')
          if (freq === 'monthly' && monthlyAmt !== undefined) {
            amt = monthlyAmt
          } else if (freq === 'monthly' && annualAmt) {
            amt = annualAmt / 12
          } else {
            amt = annualAmt
          }
        }

        const itemName = item.name ?? ''
        const itemRate = item.growthRate
        const effectiveRate =
          itemRate && itemRate !== 0
            ? itemRate
            : getRateForCategory(type, item.category, growthConfigs)

        const itemPersonId = type === 'income' ? ((item as Income & { personId?: string | null }).personId ?? null) : null

        setFormData({
          name: toSafeText(itemName),
          personId: itemPersonId,
          amount: formatNumberInput(roundToDollar(amt)),
          frequency: freq,
          category: item.category,
          annualGrowthRate: '7.0',
          interestRateApr: '4.5',
          minimumPayment: '',
          growthRate: effectiveRate.toString(),
          notes: item.notes ?? '',
          terminalValue: '',
          leaseStartYear: '',
          usefulLifeYears: '',
        })
        break
      }
      case 'investment': {
        const investment = itemData as Asset
        const amt = getDataProp<number>(itemData, 'amountAnnual') ?? investment.currentValue ?? 0
        const itemRate = investment.annualGrowthRate
        const effectiveRate =
          itemRate !== undefined && itemRate !== null
            ? itemRate
            : getRateForCategory('asset', investment.category, growthConfigs)
        setFormData({
          name: toSafeText(investment.name),
          personId: null,
          amount: formatNumberInput(roundToDollar(amt)),
          frequency: 'monthly',
          category: investment.category,
          annualGrowthRate: effectiveRate.toString(),
          interestRateApr: '4.5',
          minimumPayment: '',
          growthRate: effectiveRate.toString(),
          notes: investment.notes ?? '',
          terminalValue: '',
          leaseStartYear: '',
          usefulLifeYears: '',
        })
        break
      }
    }
  }

  function getLinkedLiabilityMinPayment(): number | null {
    if (type !== 'expense' || !data) return null
    const sourceLiabilityId = getDataProp<string>(data, 'sourceLiabilityId')
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
      updatedAt: getDataProp<string>(data, 'updatedAt') ?? new Date().toISOString(),
      notes: notes || undefined,
    }

    switch (type) {
      case 'asset': {
        // Calculate end date if lease start year and useful life are provided
        let endDate: string | undefined
        const leaseStartYear = formData.leaseStartYear ? Number.parseInt(formData.leaseStartYear, 10) : null
        const usefulLifeYears = formData.usefulLifeYears ? Number.parseInt(formData.usefulLifeYears, 10) : null
        if (leaseStartYear && usefulLifeYears) {
          endDate = calculateLeaseEndDate(leaseStartYear, usefulLifeYears)
        }

        // Parse terminal value
        const terminalValue = formData.terminalValue
          ? Number.parseFloat(formData.terminalValue)
          : null

        return {
          type,
          id: (data as Asset | undefined)?.id,
          name: formData.name.trim(),
          category: formData.category.trim() || 'other',
          currentValue: toNumeric(formData.amount),
          annualGrowthRate: Number.parseFloat(formData.annualGrowthRate) || 0,
          ...(endDate && { endDate }),
          ...(terminalValue !== null && { terminalValue }),
          ...shared,
        }
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
          name: formData.name.trim(),
          personId: formData.personId || undefined,
          amount: toNumeric(formData.amount),
          frequency: formData.frequency,
          category: formData.category.trim() || 'other',
          startDate: (data as Income | undefined)?.startDate ?? new Date().toISOString(),
          growthRate: Number.parseFloat(formData.growthRate) || 3.0,
          ...shared,
        }
      case 'expense': {
        const sourceLiabilityId = getDataProp<string>(data, 'sourceLiabilityId')
        const isDebtRepaymentExpense = !!sourceLiabilityId
        const shouldUseVersioning = mode === 'edit' && isFutureMonth && !isDebtRepaymentExpense && applyFromThisMonthOnly
        const updateMode = shouldUseVersioning ? UPDATE_MODE_VERSIONED : UPDATE_MODE_IN_PLACE
        const versionStartDate =
          shouldUseVersioning &&
          anchorYear &&
          selectedYear !== undefined &&
          selectedMonth !== undefined
            ? calculateVersionStartDate(anchorYear, selectedYear, selectedMonth)
            : undefined

        return {
          type,
          id: (data as Expense | undefined)?.id,
          name: formData.name.trim(),
          amount: toNumeric(formData.amount),
          frequency: formData.frequency,
          category: formData.category.trim() || 'other',
          growthRate: Number.parseFloat(formData.growthRate) || 2.0,
          ...(sourceLiabilityId && { sourceLiabilityId }),
          ...(mode === 'edit' && isFutureMonth && !isDebtRepaymentExpense && { updateMode }),
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
    setHasAttemptedSubmit(true)

    if (isCpfMode && type === 'asset' && mode === 'create') {
      if (!validateCpfFields()) return
    }

    // Validate personId is required for income
    if (type === 'income' && !formData.personId) {
      setFormErrors({ personId: true })
      return
    }
    setFormErrors({})

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

  function getDataId(): string | undefined {
    if (!data) return undefined
    if ('id' in data && data.id) return data.id
    const itemId = getDataProp<string>(data, 'itemId')
    if (itemId) return itemId
    return undefined
  }

  async function handleDelete() {
    const id = getDataId()
    if (!id || !onDelete) return

    // For future months with stop support, show confirmation modal
    if (
      (type === 'expense' || type === 'asset' || type === 'liability' || type === 'income' || type === 'investment') &&
      isFutureMonth &&
      onStop
    ) {
      setShowDeleteConfirmation(true)
      return
    }

    if (!confirm('Are you sure you want to delete this item?')) return

    setIsDeleting(true)
    try {
      await onDelete(id)
    } finally {
      setIsDeleting(false)
    }
  }

  async function handleConfirmDelete() {
    const id = getDataId()
    if (!id) return

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
        await onStop(id, endDate)
      } else if (onDelete) {
        await onDelete(id)
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

  function handleMinPaymentWarningCancel() {
    setShowMinPaymentWarning(false)
    setPendingPayload(null)
  }

  async function handleMinPaymentWarningConfirm() {
    if (pendingPayload) {
      setShowMinPaymentWarning(false)
      await performSave(pendingPayload)
      setPendingPayload(null)
    }
  }

  function handleDeleteConfirmationCancel() {
    setShowDeleteConfirmation(false)
    setDeleteMode('stop')
  }

  return {
    formData,
    setFormData,
    isSaving,
    isDeleting,
    isBusy,
    isCpfMode,
    setIsCpfMode,
    cpfFields,
    setCpfFields,
    cpfErrors,
    showMinPaymentWarning,
    pendingPayload,
    showDeleteConfirmation,
    deleteMode,
    setDeleteMode,
    applyFromThisMonthOnly,
    setApplyFromThisMonthOnly,
    isFutureMonth,
    isDebtRepayment,
    growthConfigs,
    formErrors,
    hasAttemptedSubmit,
    handleSubmit,
    handleDelete,
    handleConfirmDelete,
    updateFormField,
    handleCategoryChange,
    formatNumberInput,
    getLinkedLiabilityMinPayment,
    getDataId,
    handleMinPaymentWarningCancel,
    handleMinPaymentWarningConfirm,
    handleDeleteConfirmationCancel,
  }
}

import { useEffect, useMemo, useState } from 'react'
import { Trash2 } from 'lucide-react'

import type { Asset, Expense, Frequency, Income, Liability } from '../../types/financial'

export type FinancialDataType = 'asset' | 'income' | 'liability' | 'expense'

type FormState = {
  name: string
  amount: string
  frequency: Frequency
  category: string
  annualGrowthRate: string
  interestRateApr: string
  minimumPayment: string
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
  notes?: string | null
  updatedAt?: string
}

export type FinancialFormValues =
  | AssetFormValues
  | LiabilityFormValues
  | IncomeFormValues
  | ExpenseFormValues

export interface FinancialFormModalProps {
  type: FinancialDataType
  mode: 'create' | 'edit'
  data?: Asset | Income | Liability | Expense
  isOpen: boolean
  onClose: () => void
  onSave: (payload: FinancialFormValues, mode: 'create' | 'edit') => Promise<void>
  onDelete?: (id: string) => Promise<void>
}

const defaultFormState: FormState = {
  name: '',
  amount: '',
  frequency: 'monthly',
  category: '',
  annualGrowthRate: '7.0',
  interestRateApr: '4.5',
  minimumPayment: '',
  notes: '',
}

export function FinancialFormModal({
  type,
  mode,
  data,
  isOpen,
  onClose,
  onSave,
  onDelete,
}: FinancialFormModalProps) {
  const [formData, setFormData] = useState<FormState>(defaultFormState)
  const [isSaving, setIsSaving] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  const normalizedCategory = useMemo(() => {
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
  }, [type])

  useEffect(() => {
    if (!isOpen) return

    if (!data) {
      setFormData(defaultFormState)
      return
    }

    switch (type) {
      case 'asset': {
        const asset = data as Asset
        setFormData({
          name: asset.name,
          amount: asset.currentValue.toString(),
          frequency: 'monthly',
          category: asset.category,
          annualGrowthRate: asset.annualGrowthRate.toString(),
          interestRateApr: '4.5',
          minimumPayment: '',
          notes: asset.notes ?? '',
        })
        break
      }
      case 'liability': {
        const liability = data as Liability
        setFormData({
          name: liability.name,
          amount: liability.currentBalance.toString(),
          frequency: 'monthly',
          category: liability.category,
          annualGrowthRate: '7.0',
          interestRateApr: liability.interestRateApr.toString(),
          minimumPayment: liability.minimumPayment.toString(),
          notes: liability.notes ?? '',
        })
        break
      }
      case 'income': {
        const income = data as Income
        setFormData({
          name: income.source,
          amount: income.amount.toString(),
          frequency: income.frequency,
          category: income.category,
          annualGrowthRate: '7.0',
          interestRateApr: '4.5',
          minimumPayment: '',
          notes: income.notes ?? '',
        })
        break
      }
      case 'expense': {
        const expense = data as Expense
        setFormData({
          name: expense.payee,
          amount: expense.amount.toString(),
          frequency: expense.frequency,
          category: expense.category,
          annualGrowthRate: '7.0',
          interestRateApr: '4.5',
          minimumPayment: '',
          notes: expense.notes ?? '',
        })
        break
      }
    }
  }, [data, isOpen, type])

  if (!isOpen) return null

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setIsSaving(true)

    try {
      await onSave(buildPayload(), mode)
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
          currentValue: Number.parseFloat(formData.amount) || 0,
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
          currentBalance: Number.parseFloat(formData.amount) || 0,
          interestRateApr: Number.parseFloat(formData.interestRateApr) || 0,
          minimumPayment: Number.parseFloat(formData.minimumPayment) || 0,
          ...shared,
        }
      }
      case 'income': {
        const income = data as Income | undefined
        return {
          type,
          id: income?.id,
          source: formData.name.trim(),
          amount: Number.parseFloat(formData.amount) || 0,
          frequency: formData.frequency,
          category: formData.category.trim() || 'other',
          startDate: income?.startDate ?? new Date().toISOString(),
          ...shared,
        }
      }
      case 'expense': {
        const expense = data as Expense | undefined
        return {
          type,
          id: expense?.id,
          payee: formData.name.trim(),
          amount: Number.parseFloat(formData.amount) || 0,
          frequency: formData.frequency,
          category: formData.category.trim() || 'other',
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
                min="0"
                onChange={(event) =>
                  setFormData((prev) => ({ ...prev, amount: event.target.value }))
                }
                placeholder="0"
                required
                step="0.01"
                type="number"
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

          <div>
            <label className="mb-2 block text-sm font-medium text-gray-300">Category</label>
            <input
              className="w-full rounded-lg border border-gray-600 bg-gray-700 px-3 py-2 text-white placeholder-gray-400 focus:border-emerald-500 focus:outline-none"
              onChange={(event) =>
                setFormData((prev) => ({ ...prev, category: event.target.value }))
              }
              placeholder="e.g., salary, retirement, mortgage"
              type="text"
              value={formData.category}
            />
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

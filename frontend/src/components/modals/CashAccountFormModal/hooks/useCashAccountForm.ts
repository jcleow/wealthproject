"use client"

import { useEffect, useState, useCallback } from 'react'
import type { CashAccount } from '@/types/financial'

export type FormState = {
  name: string
  balance: string
  interestRate: string
  bankName: string
  accountType: string
  notes: string
}

export const accountTypeOptions = [
  { value: 'checking', label: 'Checking' },
  { value: 'savings', label: 'Savings' },
  { value: 'money_market', label: 'Money Market' },
  { value: 'other', label: 'Other' },
]

const buildDefaultFormState = (): FormState => ({
  name: '',
  balance: '',
  interestRate: '1.5',
  bankName: '',
  accountType: 'savings',
  notes: '',
})

const toNumeric = (value: string) => Number.parseFloat(value.replace(/,/g, '')) || 0

export const formatNumberInput = (value: string | number) => {
  const raw = typeof value === 'number' ? value.toString() : value
  const cleaned = raw.replace(/[^0-9.]/g, '')
  if (!cleaned) return ''
  const [integer, decimal] = cleaned.split('.')
  const formattedInt = new Intl.NumberFormat('en-US').format(Number(integer || 0))
  return decimal !== undefined ? `${formattedInt}.${decimal}` : formattedInt
}

export interface UseCashAccountFormOptions {
  mode: 'create' | 'edit'
  data?: CashAccount
  isOpen: boolean
  onSave: (payload: Omit<CashAccount, 'id' | 'createdAt' | 'updatedAt'>, mode: 'create' | 'edit') => Promise<void>
  onDelete?: (id: string) => Promise<void>
  onClose: () => void
}

export interface UseCashAccountFormReturn {
  formData: FormState
  setFormData: React.Dispatch<React.SetStateAction<FormState>>
  isSaving: boolean
  isDeleting: boolean
  isBusy: boolean
  handleSubmit: (event: React.FormEvent) => Promise<void>
  handleDelete: () => Promise<void>
  formatNumberInput: (value: string | number) => string
}

export function useCashAccountForm({
  mode,
  data,
  isOpen,
  onSave,
  onDelete,
  onClose,
}: UseCashAccountFormOptions): UseCashAccountFormReturn {
  const [formData, setFormData] = useState<FormState>(buildDefaultFormState())
  const [isSaving, setIsSaving] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  useEffect(() => {
    if (!isOpen) return
    if (!data) {
      setFormData(buildDefaultFormState())
      return
    }

    setFormData({
      name: data.name ?? '',
      balance: formatNumberInput(data.balance ?? 0),
      interestRate: (data.interestRate ?? 1.5).toString(),
      bankName: data.bankName ?? '',
      accountType: data.accountType ?? 'savings',
      notes: data.notes ?? '',
    })
  }, [data, isOpen])

  const handleSubmit = useCallback(async (event: React.FormEvent) => {
    event.preventDefault()
    setIsSaving(true)

    try {
      const payload = {
        name: formData.name.trim(),
        balance: toNumeric(formData.balance),
        interestRate: Number.parseFloat(formData.interestRate) || 1.5,
        bankName: formData.bankName.trim() || null,
        accountType: formData.accountType || null,
        isAccumulator: data?.isAccumulator ?? false,
        startYear: data?.startYear,
        endYear: data?.endYear ?? null,
        notes: formData.notes.trim() || null,
      }
      await onSave(payload, mode)
      onClose()
    } finally {
      setIsSaving(false)
    }
  }, [formData, data, onSave, mode, onClose])

  const handleDelete = useCallback(async () => {
    if (!data?.id || !onDelete) return
    if (!confirm('Are you sure you want to delete this cash account?')) return

    setIsDeleting(true)
    try {
      await onDelete(data.id)
      onClose()
    } finally {
      setIsDeleting(false)
    }
  }, [data, onDelete, onClose])

  return {
    formData,
    setFormData,
    isSaving,
    isDeleting,
    isBusy: isSaving || isDeleting,
    handleSubmit,
    handleDelete,
    formatNumberInput,
  }
}

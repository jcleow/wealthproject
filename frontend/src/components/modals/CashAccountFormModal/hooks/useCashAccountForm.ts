"use client"

import { useEffect, useState, useCallback } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'

import type { CashAccount } from '@/types/financial'
import {
  cashAccountFormSchema,
  defaultCashAccountFormValues,
  type CashAccountFormData,
} from '@/lib/validations/cashAccount'

// Re-export for backward compatibility
export { accountTypeOptions } from '@/lib/validations/cashAccount'

export const formatNumberInput = (value: string | number) => {
  const raw = typeof value === 'number' ? value.toString() : value
  const cleaned = raw.replace(/[^0-9.]/g, '')
  if (!cleaned) return ''
  const [integer, decimal] = cleaned.split('.')
  const formattedInt = new Intl.NumberFormat('en-US').format(Number(integer || 0))
  return decimal !== undefined ? `${formattedInt}.${decimal}` : formattedInt
}

export const parseFormattedNumber = (value: string): number => {
  return Number.parseFloat(value.replace(/,/g, '')) || 0
}

export interface UseCashAccountFormOptions {
  mode: 'create' | 'edit'
  data?: CashAccount
  isOpen: boolean
  onSave: (payload: Omit<CashAccount, 'id' | 'createdAt' | 'updatedAt'>, mode: 'create' | 'edit') => Promise<void>
  onDelete?: (id: string) => Promise<void>
  onClose: () => void
}

function mapDataToFormValues(data: CashAccount): CashAccountFormData {
  return {
    name: data.name ?? '',
    balance: data.balance ?? 0,
    interestRate: data.interestRate ?? 1.5,
    bankName: data.bankName ?? '',
    accountType: data.accountType ?? 'savings',
    notes: data.notes ?? '',
  }
}

export function useCashAccountForm({
  mode,
  data,
  isOpen,
  onSave,
  onDelete,
  onClose,
}: UseCashAccountFormOptions) {
  const [isDeleting, setIsDeleting] = useState(false)

  const form = useForm<CashAccountFormData>({
    resolver: zodResolver(cashAccountFormSchema),
    defaultValues: defaultCashAccountFormValues,
  })

  // Reset form when modal opens with new data
  useEffect(() => {
    if (!isOpen) return

    if (data) {
      form.reset(mapDataToFormValues(data))
    } else {
      form.reset(defaultCashAccountFormValues)
    }
  }, [data, isOpen, form])

  const onSubmit = async (formData: CashAccountFormData) => {
    const payload = {
      name: formData.name.trim(),
      balance: formData.balance,
      interestRate: formData.interestRate,
      bankName: formData.bankName.trim() || null,
      accountType: formData.accountType || null,
      isAccumulator: data?.isAccumulator ?? false,
      startYear: data?.startYear,
      endYear: data?.endYear ?? null,
      notes: formData.notes.trim() || null,
    }
    await onSave(payload, mode)
    onClose()
  }

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
    form,
    handleSubmit: form.handleSubmit(onSubmit),
    isSubmitting: form.formState.isSubmitting,
    isDirty: form.formState.isDirty,
    errors: form.formState.errors,
    isDeleting,
    isBusy: form.formState.isSubmitting || isDeleting,
    handleDelete,
    formatNumberInput,
    parseFormattedNumber,
  }
}

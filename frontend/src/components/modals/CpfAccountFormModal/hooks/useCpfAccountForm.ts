"use client"

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'

import type { CPFAccount, CPFAccountCreatePayload, CPFAccountUpdatePayload } from '@/types/cpf'
import {
  cpfAccountFormSchema,
  defaultCpfAccountFormValues,
  type CpfAccountFormData,
} from '@/lib/validations/cpfAccount'

function toDisplayString(value: number | string | undefined): string {
  if (value === undefined || value === null) return ''
  const num = typeof value === 'string' ? Number.parseFloat(value) : value
  if (Number.isNaN(num)) return ''
  return num.toFixed(2)
}

function parseDisplayValue(displayValue: string): number {
  const num = Number.parseFloat(displayValue)
  if (Number.isNaN(num)) return 0
  return num
}

// Note: Person-related fields (dateOfBirth, residencyStatus, prGrantDate) are now
// managed through the Person entity, not through CPF accounts.
// Note: CPF housing usage is derived from property scenarios - see GetCPFOAUsageByAccount().
function mapCpfAccountToFormData(cpfAccount: CPFAccount): CpfAccountFormData {
  return {
    personId: cpfAccount.personId ?? '',
    oaBalance: toDisplayString(cpfAccount.oaBalance),
    saBalance: toDisplayString(cpfAccount.saBalance),
    maBalance: toDisplayString(cpfAccount.maBalance),
    raBalance: toDisplayString(cpfAccount.raBalance),
  }
}

function mapFormDataToCreatePayload(data: CpfAccountFormData): CPFAccountCreatePayload {
  return {
    personId: data.personId,
    oaBalance: parseDisplayValue(data.oaBalance),
    saBalance: parseDisplayValue(data.saBalance),
    maBalance: parseDisplayValue(data.maBalance),
    raBalance: parseDisplayValue(data.raBalance),
  }
}

function mapFormDataToUpdatePayload(data: CpfAccountFormData): CPFAccountUpdatePayload {
  return {
    personId: data.personId || undefined,
    oaBalance: parseDisplayValue(data.oaBalance),
    saBalance: parseDisplayValue(data.saBalance),
    maBalance: parseDisplayValue(data.maBalance),
    raBalance: parseDisplayValue(data.raBalance),
  }
}

export interface UseCpfAccountFormOptions {
  cpfAccount: CPFAccount | null | undefined
  mode: 'create' | 'edit'
  onSave?: (id: string, updates: CPFAccountUpdatePayload) => Promise<void>
  onCreate?: (payload: CPFAccountCreatePayload) => Promise<void>
  onClose: () => void
}

export function useCpfAccountForm({
  cpfAccount,
  mode,
  onSave,
  onCreate,
  onClose,
}: UseCpfAccountFormOptions) {
  const [submitError, setSubmitError] = useState<string | null>(null)

  const form = useForm<CpfAccountFormData>({
    resolver: zodResolver(cpfAccountFormSchema),
    defaultValues: defaultCpfAccountFormValues,
  })

  // Reset form when modal opens with new data
  useEffect(() => {
    if (mode === 'create') {
      form.reset(defaultCpfAccountFormValues)
    } else if (cpfAccount) {
      form.reset(mapCpfAccountToFormData(cpfAccount))
    } else {
      form.reset(defaultCpfAccountFormValues)
    }
  }, [cpfAccount, mode, form])

  const onSubmit = async (data: CpfAccountFormData) => {
    setSubmitError(null)

    try {
      if (mode === 'create') {
        if (!onCreate) {
          setSubmitError('Creation is currently unavailable')
          return
        }
        await onCreate(mapFormDataToCreatePayload(data))
      } else {
        if (!cpfAccount?.id) {
          setSubmitError('No CPF account to update')
          return
        }
        if (!onSave) {
          setSubmitError('Saving is currently unavailable')
          return
        }
        await onSave(cpfAccount.id, mapFormDataToUpdatePayload(data))
      }
      onClose()
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to save CPF account'
      setSubmitError(message)
    }
  }

  return {
    form,
    handleSubmit: form.handleSubmit(onSubmit),
    isSubmitting: form.formState.isSubmitting,
    errors: form.formState.errors,
    submitError,
  }
}

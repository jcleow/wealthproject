"use client"

import { useState, useEffect, useCallback } from 'react'
import type { CPFAccount, CPFAccountCreatePayload, CPFAccountUpdatePayload, ResidencyStatus } from '@/types/cpf'

export interface FormFields {
  personId: string | null
  oaBalance: string
  saBalance: string
  maBalance: string
  raBalance: string
  oaUsedForHousing: string
  dateOfBirth: string
  residencyStatus: ResidencyStatus
  housingStartDate: string
  prGrantDate: string
}

export type FormErrors = Partial<Record<keyof FormFields, string>>

export const RESIDENCY_OPTIONS: { value: ResidencyStatus; label: string }[] = [
  { value: 'citizen', label: 'Singapore Citizen' },
  { value: 'pr_year_1', label: 'PR Year 1' },
  { value: 'pr_year_2', label: 'PR Year 2' },
  { value: 'pr_year_3_plus', label: 'PR Year 3+' },
]

const EMPTY_FIELDS: FormFields = {
  personId: null,
  oaBalance: '',
  saBalance: '',
  maBalance: '',
  raBalance: '',
  oaUsedForHousing: '',
  dateOfBirth: '',
  residencyStatus: 'citizen',
  housingStartDate: '',
  prGrantDate: '',
}

function formatDateForInput(isoDate: string | undefined): string {
  if (!isoDate) return ''
  const date = new Date(isoDate)
  if (Number.isNaN(date.getTime())) return ''
  return date.toISOString().split('T')[0]
}

function toDisplayString(value: number | string | undefined): string {
  if (value === undefined || value === null) return '0'
  const num = typeof value === 'string' ? Number.parseFloat(value) : value
  if (Number.isNaN(num)) return '0'
  return num.toFixed(2)
}

function parseDisplayValue(displayValue: string): number {
  const num = Number.parseFloat(displayValue)
  if (Number.isNaN(num)) return 0
  return num
}

export interface UseCpfAccountFormOptions {
  cpfAccount: CPFAccount | null | undefined
  mode: 'create' | 'edit'
  onSave?: (id: string, updates: CPFAccountUpdatePayload) => Promise<void>
  onCreate?: (payload: CPFAccountCreatePayload) => Promise<void>
  onClose: () => void
}

export interface UseCpfAccountFormReturn {
  fields: FormFields
  errors: FormErrors
  submitting: boolean
  submitError: string | null
  handleFieldChange: (key: keyof FormFields, value: string) => void
  handlePersonChange: (personId: string | null) => void
  handleSubmit: (event: React.FormEvent) => Promise<void>
}

export function useCpfAccountForm({
  cpfAccount,
  mode,
  onSave,
  onCreate,
  onClose,
}: UseCpfAccountFormOptions): UseCpfAccountFormReturn {
  const [fields, setFields] = useState<FormFields>({ ...EMPTY_FIELDS })
  const [errors, setErrors] = useState<FormErrors>({})
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  useEffect(() => {
    if (mode === 'create') {
      setFields({ ...EMPTY_FIELDS })
      setErrors({})
      return
    }

    if (cpfAccount) {
      setFields({
        personId: cpfAccount.personId ?? null,
        oaBalance: toDisplayString(cpfAccount.oaBalance),
        saBalance: toDisplayString(cpfAccount.saBalance),
        maBalance: toDisplayString(cpfAccount.maBalance),
        raBalance: toDisplayString(cpfAccount.raBalance),
        oaUsedForHousing: toDisplayString(cpfAccount.oaUsedForHousing),
        dateOfBirth: formatDateForInput(cpfAccount.dateOfBirth),
        residencyStatus: cpfAccount.residencyStatus,
        housingStartDate: formatDateForInput(cpfAccount.housingStartDate),
        prGrantDate: formatDateForInput(cpfAccount.prGrantDate),
      })
    } else {
      setFields({ ...EMPTY_FIELDS })
    }
  }, [cpfAccount, mode])

  const validate = useCallback((): boolean => {
    const nextErrors: FormErrors = {}

    if (!fields.dateOfBirth) {
      nextErrors.dateOfBirth = 'Date of birth is required'
    }

    const numericFields: (keyof FormFields)[] = [
      'oaBalance',
      'saBalance',
      'maBalance',
      'raBalance',
      'oaUsedForHousing',
    ]

    for (const key of numericFields) {
      const value = fields[key] as string
      if (value && Number.isNaN(Number.parseFloat(value))) {
        nextErrors[key] = 'Enter a valid number'
      } else if (Number.parseFloat(value) < 0) {
        nextErrors[key] = 'Value cannot be negative'
      }
    }

    setErrors(nextErrors)
    return Object.keys(nextErrors).length === 0
  }, [fields])

  const handleSubmit = useCallback(async (event: React.FormEvent) => {
    event.preventDefault()
    setSubmitError(null)

    if (!validate()) return
    try {
      setSubmitting(true)

      if (mode === 'create') {
        if (!onCreate) {
          setSubmitError('Creation is currently unavailable')
          return
        }
        const payload: CPFAccountCreatePayload = {
          personId: fields.personId || undefined,
          oaBalance: parseDisplayValue(fields.oaBalance),
          saBalance: parseDisplayValue(fields.saBalance),
          maBalance: parseDisplayValue(fields.maBalance),
          raBalance: parseDisplayValue(fields.raBalance),
          oaUsedForHousing: parseDisplayValue(fields.oaUsedForHousing),
          dateOfBirth: fields.dateOfBirth,
          residencyStatus: fields.residencyStatus,
          housingStartDate: fields.housingStartDate || undefined,
          prGrantDate: fields.prGrantDate || undefined,
        }
        await onCreate(payload)
      } else {
        if (!cpfAccount?.id) {
          setSubmitError('No CPF account to update')
          return
        }

        const updates: CPFAccountUpdatePayload = {
          personId: fields.personId || undefined,
          oaBalance: parseDisplayValue(fields.oaBalance),
          saBalance: parseDisplayValue(fields.saBalance),
          maBalance: parseDisplayValue(fields.maBalance),
          raBalance: parseDisplayValue(fields.raBalance),
          oaUsedForHousing: parseDisplayValue(fields.oaUsedForHousing),
          dateOfBirth: fields.dateOfBirth,
          residencyStatus: fields.residencyStatus,
          housingStartDate: fields.housingStartDate || undefined,
          prGrantDate: fields.prGrantDate || undefined,
        }

        if (!onSave) {
          setSubmitError('Saving is currently unavailable')
          return
        }

        await onSave(cpfAccount.id, updates)
      }

      onClose()
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to save CPF account'
      setSubmitError(message)
    } finally {
      setSubmitting(false)
    }
  }, [validate, mode, onCreate, fields, cpfAccount, onSave, onClose])

  const handleFieldChange = useCallback((key: keyof FormFields, value: string) => {
    setFields((prev) => ({ ...prev, [key]: value }))
    if (errors[key]) {
      setErrors((prev) => ({ ...prev, [key]: undefined }))
    }
  }, [errors])

  const handlePersonChange = useCallback((personId: string | null) => {
    setFields((prev) => ({ ...prev, personId }))
  }, [])

  return {
    fields,
    errors,
    submitting,
    submitError,
    handleFieldChange,
    handlePersonChange,
    handleSubmit,
  }
}

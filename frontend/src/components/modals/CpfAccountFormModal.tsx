'use client'

import { useState, useEffect } from 'react'
import { Modal } from '@/components/ui/Modal'
import type { CPFAccount, CPFAccountCreatePayload, CPFAccountUpdatePayload, ResidencyStatus } from '@/types/cpf'

interface CpfAccountFormModalProps {
  isOpen: boolean
  onClose: () => void
  cpfAccount: CPFAccount | null | undefined
  mode: 'create' | 'edit'
  onSave?: (id: string, updates: CPFAccountUpdatePayload) => Promise<void>
  onCreate?: (payload: CPFAccountCreatePayload) => Promise<void>
}

interface FormFields {
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

type FormErrors = Partial<Record<keyof FormFields, string>>

const RESIDENCY_OPTIONS: { value: ResidencyStatus; label: string }[] = [
  { value: 'citizen', label: 'Singapore Citizen' },
  { value: 'pr_year_1', label: 'PR Year 1' },
  { value: 'pr_year_2', label: 'PR Year 2' },
  { value: 'pr_year_3_plus', label: 'PR Year 3+' },
]

const EMPTY_FIELDS: FormFields = {
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
  // Backend returns decimal values as strings (e.g., "85000.0000") or numbers
  const num = typeof value === 'string' ? Number.parseFloat(value) : value
  if (Number.isNaN(num)) return '0'
  return num.toFixed(2)
}

function parseDisplayValue(displayValue: string): number {
  const num = Number.parseFloat(displayValue)
  if (Number.isNaN(num)) return 0
  return num
}

export function CpfAccountFormModal({
  isOpen,
  onClose,
  cpfAccount,
  mode,
  onSave,
  onCreate,
}: CpfAccountFormModalProps) {
  const [fields, setFields] = useState<FormFields>({ ...EMPTY_FIELDS })
  const [errors, setErrors] = useState<FormErrors>({})
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  // Populate form when cpfAccount changes or when switching modes
  useEffect(() => {
    if (mode === 'create') {
      setFields({ ...EMPTY_FIELDS })
      setErrors({})
      return
    }

    if (cpfAccount) {
      setFields({
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

  const validate = (): boolean => {
    const nextErrors: FormErrors = {}

    // Required: dateOfBirth
    if (!fields.dateOfBirth) {
      nextErrors.dateOfBirth = 'Date of birth is required'
    }

    // Validate numeric fields
    const numericFields: (keyof FormFields)[] = [
      'oaBalance',
      'saBalance',
      'maBalance',
      'raBalance',
      'oaUsedForHousing',
    ]

    for (const key of numericFields) {
      const value = fields[key]
      if (value && Number.isNaN(Number.parseFloat(value))) {
        nextErrors[key] = 'Enter a valid number'
      } else if (Number.parseFloat(value) < 0) {
        nextErrors[key] = 'Value cannot be negative'
      }
    }

    setErrors(nextErrors)
    return Object.keys(nextErrors).length === 0
  }

  const handleSubmit = async (event: React.FormEvent) => {
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
  }

  const handleFieldChange = (key: keyof FormFields, value: string) => {
    setFields((prev) => ({ ...prev, [key]: value }))
    if (errors[key]) {
      setErrors((prev) => ({ ...prev, [key]: undefined }))
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={submitting ? undefined : onClose}
      overlayClassName="bg-black/60"
      className="w-full max-w-lg rounded-xl border border-white/[0.08] bg-[#0a0a0a] p-6 shadow-2xl"
    >
      <div className="mb-6 flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-wide text-blue-300">CPF Account</p>
          <h2 className="text-lg font-semibold text-white">
            {mode === 'create' ? 'Add CPF Account' : 'Edit CPF Balances'}
          </h2>
        </div>
        <button
          type="button"
          onClick={onClose}
          disabled={submitting}
          className="flex h-8 w-8 items-center justify-center rounded-full bg-white/5 text-gray-300 transition hover:bg-white/10 disabled:opacity-50"
        >
          &times;
        </button>
      </div>

      <form className="space-y-4" onSubmit={handleSubmit}>
        {/* Account Balances */}
        <div className="grid grid-cols-2 gap-4">
          <Field
            label="Ordinary Account (OA)"
            type="number"
            step="0.01"
            placeholder="45000.00"
            value={fields.oaBalance}
            onChange={(v) => handleFieldChange('oaBalance', v)}
            error={errors.oaBalance}
          />
          <Field
            label="Special Account (SA)"
            type="number"
            step="0.01"
            placeholder="25000.00"
            value={fields.saBalance}
            onChange={(v) => handleFieldChange('saBalance', v)}
            error={errors.saBalance}
          />
          <Field
            label="MediSave Account (MA)"
            type="number"
            step="0.01"
            placeholder="15000.00"
            value={fields.maBalance}
            onChange={(v) => handleFieldChange('maBalance', v)}
            error={errors.maBalance}
          />
          <Field
            label="Retirement Account (RA)"
            type="number"
            step="0.01"
            placeholder="0.00"
            value={fields.raBalance}
            onChange={(v) => handleFieldChange('raBalance', v)}
            error={errors.raBalance}
          />
        </div>

        {/* Housing Usage */}
        <Field
          label="OA Used for Housing"
          type="number"
          step="0.01"
          placeholder="0.00"
          value={fields.oaUsedForHousing}
          onChange={(v) => handleFieldChange('oaUsedForHousing', v)}
          error={errors.oaUsedForHousing}
        />

        {/* Personal Info */}
        <div className="grid grid-cols-2 gap-4">
          <Field
            label="Date of Birth"
            type="date"
            value={fields.dateOfBirth}
            onChange={(v) => handleFieldChange('dateOfBirth', v)}
            error={errors.dateOfBirth}
            required
          />
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-gray-200">Residency Status</label>
            <select
              value={fields.residencyStatus}
              onChange={(e) => handleFieldChange('residencyStatus', e.target.value)}
              className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white focus:border-emerald-400 focus:outline-none"
            >
              {RESIDENCY_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value} className="bg-[#0a0a0a]">
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Optional Dates */}
        <div className="grid grid-cols-2 gap-4">
          <Field
            label="Housing Start Date"
            type="date"
            value={fields.housingStartDate}
            onChange={(v) => handleFieldChange('housingStartDate', v)}
            hint="When you started using OA for housing"
          />
          {fields.residencyStatus !== 'citizen' && (
            <Field
              label="PR Grant Date"
              type="date"
              value={fields.prGrantDate}
              onChange={(v) => handleFieldChange('prGrantDate', v)}
              hint="Date PR status was granted"
            />
          )}
        </div>

        {submitError && <p className="text-sm text-rose-300">{submitError}</p>}

        <div className="flex gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm text-gray-200 transition hover:bg-white/10"
            disabled={submitting}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="flex-1 rounded-lg bg-emerald-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-emerald-600 disabled:opacity-70"
            disabled={submitting}
          >
            {submitting ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </form>
    </Modal>
  )
}

interface FieldProps {
  label: string
  type: 'text' | 'number' | 'date'
  step?: string
  placeholder?: string
  value: string
  onChange: (value: string) => void
  error?: string
  hint?: string
  required?: boolean
}

function Field({ label, type, step, placeholder, value, onChange, error, hint, required }: FieldProps) {
  return (
    <div className="space-y-1.5">
      <label className="block text-sm font-medium text-gray-200">
        {label}
        {required && <span className="ml-1 text-rose-400">*</span>}
      </label>
      <input
        type={type}
        step={step}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-gray-500 focus:border-emerald-400 focus:outline-none"
      />
      {hint && !error && <p className="text-xs text-slate-500">{hint}</p>}
      {error && <p className="text-xs text-rose-300">{error}</p>}
    </div>
  )
}

import { useState } from 'react'

import { Modal } from '@/components/ui/Modal'
import { financialApi } from '@/services/financialApi'

type CPFFields = {
  ordinaryAccount: string
  specialAccount: string
  medisaveAccount: string
}

type CPFErrors = Partial<CPFFields>

interface CpfBalanceModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => Promise<void> | void
}

export function CpfBalanceModal({ isOpen, onClose, onSuccess }: CpfBalanceModalProps) {
  const [values, setValues] = useState<CPFFields>({
    ordinaryAccount: '',
    specialAccount: '',
    medisaveAccount: '',
  })
  const [errors, setErrors] = useState<CPFErrors>({})
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  const validate = () => {
    const nextErrors: CPFErrors = {}
    const validateField = (key: keyof CPFFields, label: string) => {
      const raw = values[key].trim()
      if (!raw) {
        nextErrors[key] = `${label} is required`
      } else if (Number.isNaN(Number.parseFloat(raw))) {
        nextErrors[key] = 'Enter a valid number'
      } else if (Number.parseFloat(raw) < 0) {
        nextErrors[key] = 'Value cannot be negative'
      }
    }

    validateField('ordinaryAccount', 'Ordinary Account')
    validateField('specialAccount', 'Special Account')
    validateField('medisaveAccount', 'Medisave Account')

    setErrors(nextErrors)
    return Object.keys(nextErrors).length === 0
  }

  const createCpfAssets = async () => {
    await Promise.all([
      financialApi.createAsset({
        name: 'CPF Ordinary Account',
        category: 'retirement',
        currentValue: Number.parseFloat(values.ordinaryAccount),
        annualGrowthRate: 0.025,
        notes: 'CPF OA - Can be used for housing, insurance, investments',
      }),
      financialApi.createAsset({
        name: 'CPF Special Account',
        category: 'retirement',
        currentValue: Number.parseFloat(values.specialAccount),
        annualGrowthRate: 0.04,
        notes: 'CPF SA - For retirement and approved investments only',
      }),
      financialApi.createAsset({
        name: 'CPF Medisave Account',
        category: 'retirement',
        currentValue: Number.parseFloat(values.medisaveAccount),
        annualGrowthRate: 0.04,
        notes: 'CPF MA - For healthcare expenses and approved insurance',
      }),
    ])
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setSubmitError(null)
    if (!validate()) return

    try {
      setSubmitting(true)
      await createCpfAssets()
      await onSuccess()
      onClose()
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to save CPF balances'
      setSubmitError(message)
      console.error(message)
    } finally {
      setSubmitting(false)
    }
  }

  const handleChange = (key: keyof CPFFields) => (event: React.ChangeEvent<HTMLInputElement>) => {
    const { value } = event.target
    setValues((prev) => ({ ...prev, [key]: value }))
    if (errors[key]) {
      setErrors((prev) => ({ ...prev, [key]: undefined }))
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={submitting ? undefined : onClose}
      overlayClassName="bg-black/60"
      className="w-full max-w-md rounded-xl border border-white/[0.08] bg-[#0a0a0a] p-6 shadow-2xl"
    >
        <div className="mb-6 flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-wide text-blue-200">CPF Accounts</p>
            <h2 className="text-lg font-semibold text-white">Add CPF Balances</h2>
            <p className="text-sm text-gray-400">We will create OA, SA, and MA as retirement assets.</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-white/5 text-gray-300 transition hover:bg-white/10"
          >
            ✕
          </button>
        </div>

        <form className="space-y-4" onSubmit={handleSubmit}>
          <Field
            label="Ordinary Account (OA)"
            placeholder="45000.00"
            value={values.ordinaryAccount}
            onChange={handleChange('ordinaryAccount')}
            error={errors.ordinaryAccount}
          />
          <Field
            label="Special Account (SA)"
            placeholder="25000.00"
            value={values.specialAccount}
            onChange={handleChange('specialAccount')}
            error={errors.specialAccount}
          />
          <Field
            label="Medisave Account (MA)"
            placeholder="15000.00"
            value={values.medisaveAccount}
            onChange={handleChange('medisaveAccount')}
            error={errors.medisaveAccount}
          />

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
              {submitting ? 'Saving…' : 'Add CPF balances'}
            </button>
          </div>
        </form>
    </Modal>
  )
}

type FieldProps = {
  label: string
  placeholder: string
  value: string
  onChange: (event: React.ChangeEvent<HTMLInputElement>) => void
  error?: string
}

function Field({ label, placeholder, value, onChange, error }: FieldProps) {
  return (
    <div className="space-y-1.5">
      <label className="block text-sm font-medium text-gray-200">{label}</label>
      <input
        type="number"
        step="0.01"
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-gray-500 focus:border-emerald-400 focus:outline-none"
      />
      {error && <p className="text-xs text-rose-300">{error}</p>}
    </div>
  )
}

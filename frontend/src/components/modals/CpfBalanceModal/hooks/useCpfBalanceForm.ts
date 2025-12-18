import { useState } from 'react'
import { assetsApi } from '@/api/financial'

type CPFFields = {
  ordinaryAccount: string
  specialAccount: string
  medisaveAccount: string
}

type CPFErrors = Partial<CPFFields>

interface UseCpfBalanceFormParams {
  onSuccess: () => Promise<void> | void
  onClose: () => void
}

export function useCpfBalanceForm({ onSuccess, onClose }: UseCpfBalanceFormParams) {
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
      assetsApi.createAsset({
        name: 'CPF Ordinary Account',
        category: 'retirement',
        currentValue: Number.parseFloat(values.ordinaryAccount),
        annualGrowthRate: 0.025,
        notes: 'CPF OA - Can be used for housing, insurance, investments',
      }),
      assetsApi.createAsset({
        name: 'CPF Special Account',
        category: 'retirement',
        currentValue: Number.parseFloat(values.specialAccount),
        annualGrowthRate: 0.04,
        notes: 'CPF SA - For retirement and approved investments only',
      }),
      assetsApi.createAsset({
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

  return {
    values,
    errors,
    submitting,
    submitError,
    handleSubmit,
    handleChange,
  }
}

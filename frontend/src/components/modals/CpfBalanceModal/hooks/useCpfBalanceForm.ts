import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'

import { assetsApi } from '@/api/financial'
import { cpfBalanceSchema, type CpfBalanceFormData } from '@/lib/validations/cpfBalance'

interface UseCpfBalanceFormParams {
  onSuccess: () => Promise<void> | void
  onClose: () => void
}

const defaultValues: CpfBalanceFormData = {
  ordinaryAccount: '',
  specialAccount: '',
  medisaveAccount: '',
}

export function useCpfBalanceForm({ onSuccess, onClose }: UseCpfBalanceFormParams) {
  const [submitError, setSubmitError] = useState<string | null>(null)

  const form = useForm<CpfBalanceFormData>({
    resolver: zodResolver(cpfBalanceSchema),
    defaultValues,
  })

  const createCpfAssets = async (data: CpfBalanceFormData) => {
    await Promise.all([
      assetsApi.createAsset({
        name: 'CPF Ordinary Account',
        category: 'retirement',
        currentValue: Number.parseFloat(data.ordinaryAccount),
        annualGrowthRate: 0.025,
        notes: 'CPF OA - Can be used for housing, insurance, investments',
      }),
      assetsApi.createAsset({
        name: 'CPF Special Account',
        category: 'retirement',
        currentValue: Number.parseFloat(data.specialAccount),
        annualGrowthRate: 0.04,
        notes: 'CPF SA - For retirement and approved investments only',
      }),
      assetsApi.createAsset({
        name: 'CPF Medisave Account',
        category: 'retirement',
        currentValue: Number.parseFloat(data.medisaveAccount),
        annualGrowthRate: 0.04,
        notes: 'CPF MA - For healthcare expenses and approved insurance',
      }),
    ])
  }

  const onSubmit = async (data: CpfBalanceFormData) => {
    setSubmitError(null)
    try {
      await createCpfAssets(data)
      await onSuccess()
      onClose()
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to save CPF balances'
      setSubmitError(message)
      console.error(message)
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

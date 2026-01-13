'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useCpfLifeEstimateMutation } from '@/hooks/queries/useCpfQuery'
import type { CPFLifeEstimateResponse } from '@/api/financial/cpf'
import type { StartAge, Gender, PlanType, Payouts } from '../types'

interface UseCPFLifeEstimatesParams {
  cpfAccountId?: string
  initialRaBalance?: number
  initialStartAge?: StartAge
  initialBirthYear?: number
  initialGender?: Gender
}

interface UseCPFLifeEstimatesReturn {
  raBalance: number
  setRaBalance: (value: number) => void
  startAge: StartAge
  setStartAge: (value: StartAge) => void
  birthYear: number
  setBirthYear: (value: number) => void
  gender: Gender
  setGender: (value: Gender) => void
  selectedPlan: PlanType
  setSelectedPlan: (value: PlanType) => void
  estimates: CPFLifeEstimateResponse | null
  payouts: Payouts
  isLoading: boolean
  handleChange: (field: string, value: number | string) => void
}

export function useCPFLifeEstimates({
  cpfAccountId,
  initialRaBalance = 200000,
  initialStartAge = 65,
  initialBirthYear = 1985,
  initialGender = 'male',
}: UseCPFLifeEstimatesParams = {}): UseCPFLifeEstimatesReturn {
  const [raBalance, setRaBalance] = useState(initialRaBalance)
  const [startAge, setStartAge] = useState<StartAge>(initialStartAge)
  const [birthYear, setBirthYear] = useState(initialBirthYear)
  const [gender, setGender] = useState<Gender>(initialGender)
  const [selectedPlan, setSelectedPlan] = useState<PlanType>('standard')

  const [estimates, setEstimates] = useState<CPFLifeEstimateResponse | null>(null)
  const estimateMutation = useCpfLifeEstimateMutation()

  const fetchEstimates = useCallback(async () => {
    if (raBalance <= 0) return

    try {
      const result = await estimateMutation.mutateAsync({
        cpfAccountId,
        birthYear: cpfAccountId ? undefined : birthYear,
        gender: cpfAccountId ? undefined : gender,
        raBalanceAt65: raBalance.toString(),
        payoutStartAge: startAge,
      })
      setEstimates(result)
    } catch (error) {
      console.error('Failed to fetch CPF LIFE estimates:', error)
    }
  }, [raBalance, startAge, birthYear, gender, cpfAccountId, estimateMutation])

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      fetchEstimates()
    }, 500)

    return () => clearTimeout(timeoutId)
  }, [raBalance, startAge, birthYear, gender])

  const handleChange = useCallback((field: string, value: number | string) => {
    if (field === 'raBalance') setRaBalance(value as number)
    if (field === 'startAge') setStartAge(value as StartAge)
    if (field === 'birthYear') setBirthYear(value as number)
    if (field === 'gender') setGender(value as Gender)
  }, [])

  const payouts = useMemo<Payouts>(() => {
    if (estimates) {
      return {
        standard: parseFloat(estimates.estimates.standard.monthlyPayout),
        basic: parseFloat(estimates.estimates.basic.monthlyPayout),
        escalating: parseFloat(estimates.estimates.escalating.monthlyPayout),
        escalatingAt75: parseFloat(estimates.estimates.escalating.payoutAt75),
        escalatingAt85: parseFloat(estimates.estimates.escalating.payoutAt85),
      }
    }
    return {
      standard: 0,
      basic: 0,
      escalating: 0,
      escalatingAt75: 0,
      escalatingAt85: 0,
    }
  }, [estimates])

  const isLoading = estimateMutation.isPending

  return {
    raBalance,
    setRaBalance,
    startAge,
    setStartAge,
    birthYear,
    setBirthYear,
    gender,
    setGender,
    selectedPlan,
    setSelectedPlan,
    estimates,
    payouts,
    isLoading,
    handleChange,
  }
}

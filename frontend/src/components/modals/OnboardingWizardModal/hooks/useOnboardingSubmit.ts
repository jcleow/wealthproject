import { useState, useRef, useCallback } from 'react'
import type { UseFormReturn } from 'react-hook-form'
import { useQueryClient } from '@tanstack/react-query'
import { personsApi } from '@/api/financial/persons'
import { createIncome } from '@/api/financial/incomes'
import { createExpense } from '@/api/financial/expenses'
import { createAsset } from '@/api/financial/assets'
import { createLiability } from '@/api/financial/liabilities'
import { createCPFAccount } from '@/api/financial/cpf'
import { settingsApi } from '@/api/financial/settings'
import { QUERY_KEYS } from '@/lib/queryKeys'
import type { OnboardingFormData } from '../types'

/**
 * Maps tempId → serverId for persons created in Step 1.
 * Used by Steps 2 and 4 to resolve person foreign keys.
 */
type PersonIdMap = Map<string, string>

export function useOnboardingSubmit(form: UseFormReturn<OnboardingFormData>) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submissionError, setSubmissionError] = useState<string | null>(null)
  const queryClient = useQueryClient()

  // Persistent map across steps: tempId → serverId
  const personIdMapRef = useRef<PersonIdMap>(new Map())

  // ─── Step 1: Create persons + update planning horizon ─────────────────────

  const submitStep1 = useCallback(async (): Promise<boolean> => {
    const { persons, planningHorizonAge } = form.getValues()

    // Validate at least one person with a name
    const validPersons = persons.filter(p => p.name.trim())
    if (validPersons.length === 0) {
      setSubmissionError('Please add at least one person with a name.')
      return false
    }

    for (const person of validPersons) {
      // Skip if already saved
      if (person.serverId) {
        personIdMapRef.current.set(person.tempId, person.serverId)
        continue
      }

      const created = await personsApi.createPerson({
        name: person.name.trim(),
        dateOfBirth: person.dateOfBirth,
        gender: person.gender,
        residencyStatus: person.residencyStatus,
        prGrantDate: person.residencyStatus === 'pr' ? (person.prGrantDate ?? undefined) : undefined,
        displayColor: person.displayColor,
        relationship: (person.relationship?.toLowerCase() ?? 'self') as 'self' | 'spouse' | 'child' | 'parent' | 'sibling' | 'other',
      })

      // Store mapping and update form
      personIdMapRef.current.set(person.tempId, created.id)
      const personIndex = persons.findIndex(p => p.tempId === person.tempId)
      if (personIndex >= 0) {
        form.setValue(`persons.${personIndex}.serverId`, created.id)
      }
    }

    // Update terminal age setting
    try {
      const currentSettings = await settingsApi.getUserSettings()
      await settingsApi.updateUserSettings({
        ...currentSettings,
        terminalAge: planningHorizonAge,
      })
    } catch {
      // Non-critical — don't block step progression
    }

    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.financial.persons })
    return true
  }, [form, queryClient])

  // ─── Step 2: Create incomes + expenses ────────────────────────────────────

  const submitStep2 = useCallback(async (): Promise<boolean> => {
    const { incomes, expenses } = form.getValues()

    // Create incomes
    for (let i = 0; i < incomes.length; i++) {
      const income = incomes[i]
      if (income.serverId || income.amount <= 0) continue

      const personServerId = personIdMapRef.current.get(income.personTempId)

      const created = await createIncome({
        name: income.name.trim() || 'Salary',
        personId: personServerId ?? null,
        amount: income.amount,
        frequency: income.frequency,
        startDate: new Date().toISOString(),
        category: income.category,
        growthRate: income.growthRate,
        cpfWageType: income.cpfWageType,
      })

      form.setValue(`incomes.${i}.serverId`, created.id)
    }

    // Create expenses
    for (let i = 0; i < expenses.length; i++) {
      const expense = expenses[i]
      if (expense.serverId || expense.amount <= 0) continue

      const created = await createExpense({
        name: expense.name.trim() || 'Expense',
        amount: expense.amount,
        frequency: expense.frequency,
        category: expense.category,
        growthRate: expense.growthRate,
      })

      form.setValue(`expenses.${i}.serverId`, created.id)
    }

    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.financial.incomes })
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.financial.expenses })
    return true
  }, [form, queryClient])

  // ─── Step 3: Create assets + liabilities ──────────────────────────────────

  const submitStep3 = useCallback(async (): Promise<boolean> => {
    const { assets, liabilities } = form.getValues()

    for (let i = 0; i < assets.length; i++) {
      const asset = assets[i]
      if (asset.serverId || asset.currentValue <= 0) continue

      const created = await createAsset({
        name: asset.name.trim() || 'Asset',
        category: asset.category,
        currentValue: asset.currentValue,
        annualGrowthRate: asset.growthRate,
      })

      form.setValue(`assets.${i}.serverId`, created.id)
    }

    for (let i = 0; i < liabilities.length; i++) {
      const liability = liabilities[i]
      if (liability.serverId || liability.currentBalance <= 0) continue

      const created = await createLiability({
        name: liability.name.trim() || 'Liability',
        category: liability.category,
        currentBalance: liability.currentBalance,
        interestRateApr: liability.interestRateApr,
        minimumPayment: liability.minimumPayment,
      })

      form.setValue(`liabilities.${i}.serverId`, created.id)
    }

    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.financial.assets })
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.financial.liabilities })
    return true
  }, [form, queryClient])

  // ─── Step 4: Create CPF accounts ──────────────────────────────────────────
  // TODO(human): Implement the CPF account creation logic
  const submitStep4 = useCallback(async (): Promise<boolean> => {
    const { cpfAccounts } = form.getValues()

    for (let i = 0; i < cpfAccounts.length; i++) {
      const cpf = cpfAccounts[i]
      if (cpf.serverId) continue

      const personServerId = personIdMapRef.current.get(cpf.personTempId)
      if (!personServerId) continue // Person wasn't created (Step 1 was skipped)

      // Only create if at least one balance is > 0
      const hasBalance = cpf.oaBalance > 0 || cpf.saBalance > 0 || cpf.maBalance > 0 || cpf.raBalance > 0
      if (!hasBalance) continue

      const created = await createCPFAccount({
        personId: personServerId,
        oaBalance: cpf.oaBalance,
        saBalance: cpf.saBalance,
        maBalance: cpf.maBalance,
        raBalance: cpf.raBalance,
      })

      form.setValue(`cpfAccounts.${i}.serverId`, created.id)
    }

    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.financial.cpf })
    return true
  }, [form, queryClient])

  // ─── Step dispatcher ──────────────────────────────────────────────────────

  const stepSubmitters = [submitStep1, submitStep2, submitStep3, submitStep4]

  // Fields to validate per step (triggers formState.errors for red borders)
  const stepFieldNames: Record<number, string[]> = {
    0: ['persons', 'planningHorizonAge'],
    1: ['incomes', 'expenses'],
    2: ['assets', 'liabilities'],
    3: ['cpfAccounts'],
  }

  const submitStep = useCallback(async (stepIndex: number): Promise<boolean> => {
    setIsSubmitting(true)
    setSubmissionError(null)

    // Trigger field-level validation so formState.errors populates (red borders)
    const fieldsToValidate = stepFieldNames[stepIndex]
    if (fieldsToValidate) {
      const isValid = await form.trigger(fieldsToValidate as any)
      if (!isValid) {
        setIsSubmitting(false)
        return false
      }
    }

    try {
      const submitter = stepSubmitters[stepIndex]
      if (!submitter) return true
      return await submitter()
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to save. Please try again.'
      setSubmissionError(message)
      return false
    } finally {
      setIsSubmitting(false)
    }
  }, [stepSubmitters, form])

  return { submitStep, isSubmitting, submissionError }
}

import { useState, useRef, useCallback } from 'react'
import type { UseFormReturn } from 'react-hook-form'
import { useQueryClient } from '@tanstack/react-query'
import { personsApi } from '@/api/financial/persons'
import { createIncome } from '@/api/financial/incomes'
import { createExpense } from '@/api/financial/expenses'
import { createAsset } from '@/api/financial/assets'
import { createLiability } from '@/api/financial/liabilities'
import { createCPFAccount } from '@/api/financial/cpf'
import { createScenario } from '@/api/financial/propertyPlannerV2'
import { settingsApi } from '@/api/financial/settings'
import { QUERY_KEYS } from '@/lib/queryKeys'
import { defaultInputsByType, DEFAULT_SALE_FEES, DEFAULT_PURCHASE_FEES, DEFAULT_APPRECIATION_PERIODS } from '@/app/property-planner/hooks/constants'
import type { PropertyType as FrontendPropertyType } from '@/app/property-planner/types'
import type { CreateScenarioInput, PropertyType as ApiPropertyType, PropertySubtype } from '@/types/propertyPlannerV2'
import type { OnboardingFormData, OnboardingAsset, OnboardingLiability } from '../types'
import type { FieldErrors } from 'react-hook-form'

// ─── Property type decomposition ──────────────────────────────────────────────

/** Convert flat frontend property type to API's two-level type + subtype */
function decomposePropertyType(frontendType: FrontendPropertyType): { propertyType: ApiPropertyType; propertySubtype: PropertySubtype } {
  const mapping: Record<FrontendPropertyType, { propertyType: ApiPropertyType; propertySubtype: PropertySubtype }> = {
    'hdb-resale': { propertyType: 'hdb', propertySubtype: 'resale' },
    'hdb-bto': { propertyType: 'hdb', propertySubtype: 'bto' },
    'ec': { propertyType: 'private', propertySubtype: 'ec' },
    'private-resale': { propertyType: 'private', propertySubtype: 'resale' },
    'private-new': { propertyType: 'private', propertySubtype: 'new' },
  }
  return mapping[frontendType]
}

/** Get current month in YYYY-MM format */
function getCurrentMonth(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

/**
 * Build a skeleton CreateScenarioInput from an onboarding property asset.
 * Uses default property planner values as a base, overridden with user's actual
 * property value, mortgage balance, and interest rate from the wizard.
 */
function buildSkeletonScenario(
  asset: OnboardingAsset,
  matchingMortgage: OnboardingLiability | undefined,
): CreateScenarioInput | null {
  const frontendPropertyType = asset.propertyType as FrontendPropertyType
  if (!frontendPropertyType) return null

  const defaults = defaultInputsByType[frontendPropertyType]
  const { propertyType, propertySubtype } = decomposePropertyType(frontendPropertyType)
  const currentMonth = getCurrentMonth()

  // Use the user's property value, falling back to the defaults
  const propertyPrice = asset.currentValue
  const valuationPrice = propertyPrice

  // Determine loan amount: use mortgage balance if available, else derive from default LTV ratio
  const defaultLtvRatio = defaults.loanAmount / defaults.propertyPrice
  const loanAmount = matchingMortgage
    ? matchingMortgage.currentBalance
    : Math.round(propertyPrice * defaultLtvRatio)

  // Downpayment = price - loanAmount (simplified: all cash for skeleton)
  const totalDownpayment = propertyPrice - loanAmount
  const downpaymentCpfOa = Math.min(totalDownpayment, Math.round(totalDownpayment * 0.6))
  const downpaymentCash = totalDownpayment - downpaymentCpfOa

  // Interest rate: use mortgage APR if available, else default
  const fixedRate = matchingMortgage ? matchingMortgage.interestRateApr : defaults.fixedRate

  // Sale date: 10 years from now
  const saleDate = new Date()
  saleDate.setFullYear(saleDate.getFullYear() + 10)
  const saleMonth = `${saleDate.getFullYear()}-${String(saleDate.getMonth() + 1).padStart(2, '0')}`
  const salePrice = Math.round(propertyPrice * 1.3)

  return {
    country: 'SG',
    propertySG: {
      name: asset.name || `${propertySubtype.toUpperCase()} Property`,
      propertyType,
      propertySubtype,
      purchaseIcon: 'home',
      purchaseIconColor: '#6366f1',
      saleIcon: 'banknote',
      saleIconColor: '#10b981',
      isIncluded: true,
      propertyPrice: String(propertyPrice),
      valuationPrice: String(valuationPrice),
      loanType: defaults.loanType,
      downpaymentCpfOa: String(downpaymentCpfOa),
      downpaymentCash: String(downpaymentCash),
      borrowerType: 'single',
      otherDebt: '0',
      leaseRemainingYears: defaults.leaseRemainingYears,
      saleExpectedDate: saleMonth,
      saleExpectedPrice: String(salePrice),
      // Per-borrower defaults (skeleton — user refines later)
      borrower1DownpaymentCpfOaAmountType: 'fixed',
      borrower1DownpaymentCpfOa: String(downpaymentCpfOa),
      borrower2DownpaymentCpfOaAmountType: 'fixed',
      borrower2DownpaymentCpfOa: '0',
      borrower1DownpaymentCashAmountType: 'remainder',
      borrower1DownpaymentCashAmount: String(downpaymentCash),
      borrower2DownpaymentCashAmountType: 'remainder',
      borrower2DownpaymentCashAmount: '0',
      borrower1MonthlyCashAmountType: 'remainder',
      borrower1MonthlyCashAmount: '0',
      borrower2MonthlyCashAmountType: 'remainder',
      borrower2MonthlyCashAmount: '0',
    },
    fees: [
      ...DEFAULT_PURCHASE_FEES.filter(f => f.enabled).map(f => ({
        feeContext: 'purchase' as const,
        feeType: f.id,
        description: f.name,
        amount: String(f.value),
        isPercentage: f.type === 'percentage',
        icon: f.icon ?? 'file-text',
        iconColor: f.iconColor ?? '#6366f1',
      })),
      ...DEFAULT_SALE_FEES.filter(f => f.enabled).map(f => ({
        feeContext: 'sale' as const,
        feeType: f.id,
        description: f.name,
        amount: String(f.value),
        isPercentage: f.type === 'percentage',
        icon: f.icon ?? 'file-text',
        iconColor: f.iconColor ?? '#6366f1',
      })),
    ],
    growthPeriods: DEFAULT_APPRECIATION_PERIODS.map(p => ({
      startYear: p.startYear,
      endYear: p.endYear ?? undefined,
      growthRate: String(p.rate),
    })),
    ratePeriods: [{
      startMonth: currentMonth,
      termYears: defaults.loanTermYears,
      rate: String(fixedRate),
      rateType: 'fixed' as const,
    }],
    grants: defaults.grants.map(g => ({
      name: g.name,
      amount: String(g.amount),
    })),
  }
}

/** Recursively extract the first human-readable error message from nested FieldErrors. */
function extractFirstErrorMessage(errors: FieldErrors): string | null {
  for (const value of Object.values(errors)) {
    if (!value) continue
    if (typeof value.message === 'string' && value.message) return value.message
    // Nested (e.g. array fields like persons.0.dateOfBirth)
    if (typeof value === 'object') {
      const nested = extractFirstErrorMessage(value as FieldErrors)
      if (nested) return nested
    }
  }
  return null
}

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
    const { persons, projectionYears } = form.getValues()

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

    // Compute terminal age from oldest person's current age + projection years
    const oldestPersonAge = validPersons.reduce((maxAge, person) => {
      const birthDate = new Date(person.dateOfBirth)
      const today = new Date()
      const age = today.getFullYear() - birthDate.getFullYear()
      return Math.max(maxAge, age)
    }, 0)
    const terminalAge = oldestPersonAge + projectionYears

    // Update terminal age setting
    try {
      const currentSettings = await settingsApi.getUserSettings()
      await settingsApi.updateUserSettings({
        ...currentSettings,
        terminalAge,
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
    // cash_savings assets are routed to cash accounts table on the backend
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.financial.cashAccounts })

    // Auto-create skeleton property planner scenarios for property assets
    const propertyAssets = assets.filter(
      (a) => a.category === 'property' && a.currentValue > 0 && a.propertyType
    )

    if (propertyAssets.length > 0) {
      for (const propertyAsset of propertyAssets) {
        // Find the mortgage linked to this property (liability → asset link)
        const linkedMortgage = liabilities.find(
          (l) => l.linkedAssetTempId === propertyAsset.tempId && l.category === 'mortgage'
        ) ?? liabilities.find((l) => l.category === 'mortgage' && l.currentBalance > 0)

        const scenarioInput = buildSkeletonScenario(propertyAsset, linkedMortgage)
        if (scenarioInput) {
          try {
            await createScenario(scenarioInput)
          } catch (scenarioError) {
            // Non-critical — don't block wizard progression, but log for debugging
            console.warn('[Wizard] Failed to auto-create property scenario:', scenarioError)
          }
        }
      }

      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.financial.propertyPlannerV2 })
    }

    return true
  }, [form, queryClient])

  // ─── Step 4: Create CPF accounts ──────────────────────────────────────────
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
    0: ['persons', 'projectionYears'],
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
        // Surface the first validation error so the user knows what's missing
        const errors = form.formState.errors
        const firstErrorMessage = extractFirstErrorMessage(errors)
        if (firstErrorMessage) {
          setSubmissionError(firstErrorMessage)
        }
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

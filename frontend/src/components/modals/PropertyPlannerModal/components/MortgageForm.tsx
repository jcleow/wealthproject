"use client"

import { useState, useMemo, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'
import { MonthPicker } from '@/components/ui/MonthPicker'
import { ChevronRight } from 'lucide-react'

import type { FormStep } from '@/app/property-planner/types'
import { FORM_STEPS } from '@/app/property-planner/hooks/constants'

import { useQueryClient } from '@tanstack/react-query'
import { useIncomesQuery } from '@/hooks/queries/useIncomesQuery'
import { useCpfAccountsQuery } from '@/hooks/queries/useCpfQuery'
import type { TimelineV2Response } from '@/types/timeline'

import { PropertyAndFinancingStep } from './MortgageForm/PropertyAndFinancingStep'
import { BorrowersStep } from './MortgageForm/BorrowersStep'
import { TermsStep } from './MortgageForm/TermsStep'
import { getProjectedOaByPersonId, getHouseholdIncome } from './MortgageForm/utils'
import type { MortgageFormProps, IncomeOption } from './MortgageForm/types'

export function MortgageForm({ inputs, onChange, propertyType, scenarioId }: MortgageFormProps) {
  const [currentStep, setCurrentStep] = useState<FormStep>('property')
  const isHDB = propertyType.includes('hdb')

  // Fetch real incomes and CPF accounts from API
  const { data: rawIncomes = [] } = useIncomesQuery()
  const { data: cpfAccounts = [] } = useCpfAccountsQuery()

  // Access React Query cache to reuse existing timeline data instead of making a new API call.
  // The dashboard already fetches the full timeline (2026-2061), so we search the cache for the target month.
  const queryClient = useQueryClient()

  // Parse the target purchase date
  const targetDate = useMemo(() => {
    const [year, month] = inputs.loanStartMonth.split('-').map(Number)
    return { year, month }
  }, [inputs.loanStartMonth])

  // Get projected CPF assets at purchase date from cached timeline data
  // TODO: This is O(n) search. See GitHub issue #61 for backend optimization to indexed keys for O(1) lookup.
  const projectedCpfAssets = useMemo(() => {
    // Search all cached timeline V2 queries for the target month
    const allTimelineQueries = queryClient.getQueriesData<TimelineV2Response>({
      queryKey: ['financial', 'timeline', 'v2'],
      exact: false, // Match any timeline query with this prefix
    })

    for (const [, data] of allTimelineQueries) {
      if (!data?.months) continue
      // O(n) linear search through months array
      const targetMonth = data.months.find(
        (m) => m.year === targetDate.year && m.month === targetDate.month
      )
      if (targetMonth?.cpfAssets?.length) {
        return targetMonth.cpfAssets
      }
    }

    return []
  }, [queryClient, targetDate])

  // Create CPF accounts with projected OA balances at purchase date
  const projectedCpfAccounts = useMemo(() => {
    return cpfAccounts.map((account) => {
      const projectedOa = account.personId
        ? getProjectedOaByPersonId(projectedCpfAssets, account.personId)
        : null
      return {
        id: account.id,
        personId: account.personId,
        personName: account.personName,
        // Use projected OA if available, otherwise fall back to current balance
        oaBalance: projectedOa ?? account.oaBalance,
      }
    })
  }, [cpfAccounts, projectedCpfAssets])

  // Track previous loanStartMonth to detect date changes
  // Initialize to null so the first update runs when projected data arrives
  const prevLoanStartMonth = useRef<string | null>(null)

  // Update borrower OA balances when projected data changes (e.g., purchase date changed or initial load)
  useEffect(() => {
    // Only update if we have projected data
    if (projectedCpfAssets.length === 0) return

    // Skip if the date hasn't changed (but always run on first data arrival when ref is null)
    if (prevLoanStartMonth.current !== null && prevLoanStartMonth.current === inputs.loanStartMonth) return

    prevLoanStartMonth.current = inputs.loanStartMonth

    // Update borrower 1 OA balance if they have an income selected
    // Pass shouldDirty=false since these are derived values, not user edits
    if (inputs.borrower1IncomeId) {
      const income = rawIncomes.find((i) => i.id === inputs.borrower1IncomeId)
      if (income?.personId) {
        const projectedOa = getProjectedOaByPersonId(projectedCpfAssets, income.personId)
        if (projectedOa !== null) {
          onChange('borrower1OaBalance', projectedOa, false)
          // Update total CPF OA balance
          if (inputs.borrowerType === 'joint') {
            onChange('cpfOaBalance', projectedOa + inputs.borrower2OaBalance, false)
          } else {
            onChange('cpfOaBalance', projectedOa, false)
          }
        }
      }
    }

    // Update borrower 2 OA balance if in joint mode
    if (inputs.borrowerType === 'joint' && inputs.borrower2IncomeId) {
      const income = rawIncomes.find((i) => i.id === inputs.borrower2IncomeId)
      if (income?.personId) {
        const projectedOa = getProjectedOaByPersonId(projectedCpfAssets, income.personId)
        if (projectedOa !== null) {
          onChange('borrower2OaBalance', projectedOa, false)
          onChange('cpfOaBalance', inputs.borrower1OaBalance + projectedOa, false)
        }
      }
    }
  }, [projectedCpfAssets, inputs.loanStartMonth, inputs.borrower1IncomeId, inputs.borrower2IncomeId, inputs.borrowerType, inputs.borrower1OaBalance, inputs.borrower2OaBalance, rawIncomes, onChange])


  // Transform incomes into the dropdown format
  const incomes: IncomeOption[] = useMemo(() => {
    return rawIncomes.map(income => {
      // Ensure amount is a number (API might return string with decimals)
      const amount = typeof income.amount === 'string' ? parseFloat(income.amount) : income.amount
      return {
        id: income.id,
        name: income.name,
        personId: income.personId,
        personName: income.personName,
        monthlyAmount: income.frequency === 'monthly' ? amount : Math.round(amount / 12),
      }
    })
  }, [rawIncomes])

  // Derive household income from borrower selections (computed inline, not stored in state)
  const householdIncome = getHouseholdIncome(
    rawIncomes,
    inputs.borrower1IncomeId,
    inputs.borrower2IncomeId,
    inputs.borrowerType
  )

  const isBTO = propertyType === 'hdb-bto'
  const isEC = propertyType === 'ec'
  const isResale = propertyType === 'hdb-resale' || propertyType === 'private-resale'

  // Calculate Cash Over Valuation (COV) - only applies to resale properties
  const cashOverValuation = isResale ? Math.max(0, inputs.propertyPrice - inputs.valuationPrice) : 0

  // Downpayment is calculated on valuation price, not purchase price
  const effectivePrice = isResale ? inputs.valuationPrice : inputs.propertyPrice
  const downpaymentOnValuation = effectivePrice - inputs.loanAmount

  // Calculate max LTV based on loan type
  const maxLtv = inputs.loanType === 'hdb' ? 0.80 : 0.75

  // Eligibility warnings (informational only - policies may change)
  const hdbIncomeCeiling = 14000
  const ecIncomeCeiling = 16000
  const exceedsHdbIncomeCeiling = isHDB && householdIncome > hdbIncomeCeiling
  const exceedsEcIncomeCeiling = isEC && householdIncome > ecIncomeCeiling

  const currentStepIndex = FORM_STEPS.findIndex(s => s.id === currentStep)

  // Step validation
  // Step 1 (Property & Financing): price, loan amount, term, and rate
  const isStep1Valid = inputs.propertyPrice > 0 && inputs.loanAmount > 0 && inputs.loanTermYears > 0 && (inputs.fixedRate > 0 || inputs.floatingRate > 0)
  // Step 2 (Borrowers): at least one income selected
  const isStep2Valid = householdIncome > 0

  const getStepValidation = (stepIndex: number): boolean => {
    switch (stepIndex) {
      case 0: return true
      case 1: return isStep1Valid
      case 2: return isStep1Valid && isStep2Valid
      default: return false
    }
  }

  const isCurrentStepValid = (): boolean => {
    switch (currentStep) {
      case 'property': return isStep1Valid
      case 'borrowers': return isStep2Valid
      case 'terms': return true
      default: return false
    }
  }

  const goToNextStep = () => {
    const nextIndex = currentStepIndex + 1
    if (nextIndex < FORM_STEPS.length) {
      setCurrentStep(FORM_STEPS[nextIndex].id)
    }
  }

  const goToPrevStep = () => {
    const prevIndex = currentStepIndex - 1
    if (prevIndex >= 0) {
      setCurrentStep(FORM_STEPS[prevIndex].id)
    }
  }

  const getNextStepLabel = (): string => {
    if (currentStepIndex >= FORM_STEPS.length - 1) return ''
    return FORM_STEPS[currentStepIndex + 1].label
  }

  // Format purchase date for display (e.g., "Dec 2029")
  const formatPurchaseDate = (dateStr: string) => {
    const [year, month] = dateStr.split('-')
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
    return `${monthNames[parseInt(month, 10) - 1]} ${year}`
  }

  return (
    <div className="space-y-4">
      {/* Persistent Purchase Date */}
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-slate-400">Purchase Date</span>
        <MonthPicker
          value={inputs.loanStartMonth}
          onChange={(value) => onChange('loanStartMonth', value)}
          compact
        />
      </div>

      {/* Progress Tabs */}
      <div className="flex items-center gap-1 p-1.5 bg-white/[0.02] border border-white/[0.08] rounded-xl">
        {FORM_STEPS.map((step, index) => {
          const isActive = step.id === currentStep
          const isPast = index < currentStepIndex
          const isAccessible = getStepValidation(index)
          const isLocked = !isAccessible && index > currentStepIndex
          return (
            <button
              key={step.id}
              type="button"
              onClick={() => isAccessible && setCurrentStep(step.id)}
              disabled={isLocked}
              className={cn(
                "flex-1 flex items-center justify-center gap-1.5 py-2.5 px-2 rounded-lg text-xs font-medium transition-all duration-200",
                isActive
                  ? "bg-white/[0.12] text-white shadow-sm"
                  : isPast
                    ? "text-white/80 hover:bg-white/[0.05]"
                    : isLocked
                      ? "text-slate-600 cursor-not-allowed opacity-50"
                      : "text-slate-400 hover:text-slate-300 hover:bg-white/[0.03]"
              )}
            >
              <span className={cn(
                "w-5 h-5 rounded-full flex items-center justify-center text-xs font-semibold",
                isActive
                  ? "bg-white/20 text-white"
                  : isPast
                    ? "bg-white/15 text-white"
                    : isLocked
                      ? "bg-white/[0.02] text-slate-600"
                      : "bg-white/[0.06] text-slate-400"
              )}>
                {isPast ? '✓' : index + 1}
              </span>
              <span className="hidden sm:inline">{step.label}</span>
            </button>
          )
        })}
      </div>

      {/* Step Content */}
      <div className="min-h-[300px]">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
          >
            {/* ========== STEP 1: PROPERTY & FINANCING ========== */}
            {currentStep === 'property' && (
              <PropertyAndFinancingStep
                inputs={inputs}
                onChange={onChange}
                isResale={isResale}
                isBTO={isBTO}
                isHDB={isHDB}
                effectivePrice={effectivePrice}
                downpaymentOnValuation={downpaymentOnValuation}
                maxLtv={maxLtv}
                cashOverValuation={cashOverValuation}
              />
            )}

            {/* ========== STEP 2: BORROWERS ========== */}
            {currentStep === 'borrowers' && (
              <BorrowersStep
                inputs={inputs}
                onChange={onChange}
                incomes={incomes}
                cpfAccounts={projectedCpfAccounts}
                exceedsHdbIncomeCeiling={exceedsHdbIncomeCeiling}
                exceedsEcIncomeCeiling={exceedsEcIncomeCeiling}
                purchaseDateFormatted={formatPurchaseDate(inputs.loanStartMonth)}
                householdIncome={householdIncome}
                scenarioId={scenarioId}
              />
            )}

            {/* ========== STEP 3: OTHERS ========== */}
            {currentStep === 'terms' && (
              <TermsStep
                inputs={inputs}
                onChange={onChange}
                propertyType={propertyType}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Navigation */}
      <div className="flex justify-between items-center pt-2">
        {currentStepIndex > 0 ? (
          <button
            type="button"
            onClick={goToPrevStep}
            className="text-xs text-slate-500 hover:text-slate-300 transition-colors"
          >
            ← Back
          </button>
        ) : (
          <div />
        )}
        {currentStepIndex < FORM_STEPS.length - 1 && (
          <button
            type="button"
            onClick={goToNextStep}
            disabled={!isCurrentStepValid()}
            className={cn(
              "flex items-center gap-1 text-xs font-medium px-4 py-2 rounded-lg transition-all",
              isCurrentStepValid()
                ? "bg-white/10 text-white hover:bg-white/15"
                : "bg-white/5 text-slate-600 cursor-not-allowed"
            )}
          >
            {getNextStepLabel()} <ChevronRight className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
  )
}

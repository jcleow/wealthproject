"use client"

import { useState, useMemo, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'
import { Input } from '@/components/ui/input'
import { MonthPicker } from '@/components/ui/MonthPicker'
import { CustomSelect } from '@/components/ui/CustomSelect'
import { Building2, ChevronRight, ChevronDown, HelpCircle, ExternalLink } from 'lucide-react'

import type {
  PropertyType,
  MortgageInputs,
  FeeItem,
  AppreciationPeriod,
  LoanSegment,
  FormStep,
  StaggeredDownpayment,
  GrantItem,
} from '@/app/property-planner/types'

import {
  FormInput,
  FeeEditor,
  InfoTooltip,
  GrantsEditor,
} from '@/app/property-planner/components'

import {
  calculateMonthlyOaInflow,
  formatCurrency,
} from '@/app/property-planner/hooks'

import {
  FORM_STEPS,
  createDefaultStaggeredDownpayment,
} from '@/app/property-planner/hooks/constants'

import { useQueryClient } from '@tanstack/react-query'
import { useIncomesQuery } from '@/hooks/queries/useIncomesQuery'
import { useCpfAccountsQuery } from '@/hooks/queries/useCpfQuery'
import type { CPFAssetResponseV2, TimelineV2Response } from '@/types/timeline'

// Income option type for dropdowns
type IncomeOption = {
  id: string
  name: string
  earner?: string
  monthlyAmount: number
}

interface MortgageFormProps {
  inputs: MortgageInputs
  onChange: (field: keyof MortgageInputs, value: number | string | string[] | FeeItem[] | AppreciationPeriod[] | LoanSegment[] | StaggeredDownpayment | GrantItem[] | null) => void
  propertyType: PropertyType
}

// Extract projected OA balance from timeline CPF assets by earner name
// Matches by ID pattern (cpf-oa-{earner}) since the backend uses this consistent format
function getProjectedOaByEarner(
  cpfAssets: CPFAssetResponseV2[],
  earner: string
): number | null {
  const earnerLower = earner.toLowerCase()
  const oaAsset = cpfAssets.find(
    (a) => a.earner?.toLowerCase() === earnerLower && a.id.startsWith('cpf-oa')
  )
  if (!oaAsset) return null
  return parseFloat(oaAsset.balance) || 0
}

// Helper to get monthly amount from an income record
function getMonthlyAmount(income: { amount: string | number; frequency: string }): number {
  const amount = typeof income.amount === 'string' ? parseFloat(income.amount) : income.amount
  return income.frequency === 'monthly' ? amount : Math.round(amount / 12)
}

// Derive household income from borrower income IDs - computed inline, not stored in state
function getHouseholdIncome(
  incomes: { id: string; amount: string | number; frequency: string }[],
  borrower1IncomeId: string,
  borrower2IncomeId: string | null,
  borrowerType: string
): number {
  if (!borrower1IncomeId || incomes.length === 0) return 0

  const b1 = incomes.find(i => i.id === borrower1IncomeId)
  if (!b1) return 0

  let total = getMonthlyAmount(b1)

  if (borrowerType === 'joint' && borrower2IncomeId) {
    const b2 = incomes.find(i => i.id === borrower2IncomeId)
    if (b2) total += getMonthlyAmount(b2)
  }

  return total
}

export function MortgageForm({ inputs, onChange, propertyType }: MortgageFormProps) {
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
      const projectedOa = account.earner
        ? getProjectedOaByEarner(projectedCpfAssets, account.earner)
        : null
      return {
        id: account.id,
        earner: account.earner,
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
    if (inputs.borrower1IncomeId) {
      const income = rawIncomes.find((i) => i.id === inputs.borrower1IncomeId)
      if (income?.earner) {
        const projectedOa = getProjectedOaByEarner(projectedCpfAssets, income.earner)
        if (projectedOa !== null) {
          onChange('borrower1OaBalance', projectedOa)
          // Update total CPF OA balance
          if (inputs.borrowerType === 'joint') {
            onChange('cpfOaBalance', projectedOa + inputs.borrower2OaBalance)
          } else {
            onChange('cpfOaBalance', projectedOa)
          }
        }
      }
    }

    // Update borrower 2 OA balance if in joint mode
    if (inputs.borrowerType === 'joint' && inputs.borrower2IncomeId) {
      const income = rawIncomes.find((i) => i.id === inputs.borrower2IncomeId)
      if (income?.earner) {
        const projectedOa = getProjectedOaByEarner(projectedCpfAssets, income.earner)
        if (projectedOa !== null) {
          onChange('borrower2OaBalance', projectedOa)
          onChange('cpfOaBalance', inputs.borrower1OaBalance + projectedOa)
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
        earner: income.earner || '',
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
  const maxLoanAmount = Math.floor(effectivePrice * maxLtv)

  // Eligibility warnings (informational only - policies may change)
  const hdbIncomeCeiling = 14000
  const ecIncomeCeiling = 16000
  const exceedsHdbIncomeCeiling = isHDB && householdIncome > hdbIncomeCeiling
  const exceedsEcIncomeCeiling = isEC && householdIncome > ecIncomeCeiling

  const currentStepIndex = FORM_STEPS.findIndex(s => s.id === currentStep)

  // Step validation
  const isStep1Valid = inputs.propertyPrice > 0 && inputs.loanAmount > 0
  const isStep2Valid = householdIncome > 0
  const isStep3Valid = inputs.loanTermYears > 0 && (inputs.fixedRate > 0 || inputs.floatingRate > 0)

  const getStepValidation = (stepIndex: number): boolean => {
    switch (stepIndex) {
      case 0: return true
      case 1: return isStep1Valid
      case 2: return isStep1Valid && isStep2Valid
      case 3: return isStep1Valid && isStep2Valid && isStep3Valid
      default: return false
    }
  }

  const isCurrentStepValid = (): boolean => {
    switch (currentStep) {
      case 'property': return isStep1Valid
      case 'borrowers': return isStep2Valid
      case 'financing': return isStep3Valid
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
            {/* ========== STEP 1: PROPERTY ========== */}
            {currentStep === 'property' && (
              <PropertyStep
                inputs={inputs}
                onChange={onChange}
                isResale={isResale}
                isBTO={isBTO}
                effectivePrice={effectivePrice}
                downpaymentOnValuation={downpaymentOnValuation}
                maxLtv={maxLtv}
                maxLoanAmount={maxLoanAmount}
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
              />
            )}

            {/* ========== STEP 3: FINANCING ========== */}
            {currentStep === 'financing' && (
              <FinancingStep
                inputs={inputs}
                onChange={onChange}
                isHDB={isHDB}
                effectivePrice={effectivePrice}
                downpaymentOnValuation={downpaymentOnValuation}
              />
            )}

            {/* ========== STEP 4: TERMS ========== */}
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

// Sub-components for each step
function PropertyStep({
  inputs,
  onChange,
  isResale,
  isBTO,
  effectivePrice,
  downpaymentOnValuation,
  maxLtv,
  maxLoanAmount,
  cashOverValuation,
}: {
  inputs: MortgageInputs
  onChange: MortgageFormProps['onChange']
  isResale: boolean
  isBTO: boolean
  effectivePrice: number
  downpaymentOnValuation: number
  maxLtv: number
  maxLoanAmount: number
  cashOverValuation: number
}) {
  // Local state for downpayment input
  const [localDownpayment, setLocalDownpayment] = useState(downpaymentOnValuation.toString())
  const [localPercent, setLocalPercent] = useState(((downpaymentOnValuation / effectivePrice) * 100).toFixed(1))
  const [isEditing, setIsEditing] = useState(false)
  const [inputMode, setInputMode] = useState<'$' | '%'>('$')

  // Check if staggered downpayment is active
  const isStaggeredActive = isBTO && inputs.staggeredDownpayment?.enabled

  // Calculate staggered total when active
  const staggeredTotalPercent = isStaggeredActive
    ? (inputs.staggeredDownpayment!.firstInstalmentPercent + inputs.staggeredDownpayment!.secondInstalmentPercent)
    : 0
  const staggeredTotalAmount = Math.round(inputs.propertyPrice * staggeredTotalPercent / 100)

  // Sync local state with parent when not editing
  useEffect(() => {
    if (!isEditing) {
      setLocalDownpayment(downpaymentOnValuation.toLocaleString())
      setLocalPercent(((downpaymentOnValuation / effectivePrice) * 100).toFixed(1))
    }
  }, [downpaymentOnValuation, effectivePrice, isEditing])

  // Calculate minimum downpayment
  const minDownpayment = Math.ceil(effectivePrice * (1 - maxLtv))
  const downpaymentPercent = effectivePrice > 0 ? (downpaymentOnValuation / effectivePrice) * 100 : 0
  const isBelowMinimum = isStaggeredActive
    ? staggeredTotalPercent < (1 - maxLtv) * 100
    : downpaymentOnValuation < minDownpayment

  const handleDownpaymentChange = (value: string) => {
    const cleanValue = value.replace(/[^0-9]/g, '')
    setLocalDownpayment(cleanValue)
  }

  const handlePercentChange = (value: string) => {
    // Allow decimal input
    const cleanValue = value.replace(/[^0-9.]/g, '')
    setLocalPercent(cleanValue)
  }

  const handleDownpaymentBlur = () => {
    setIsEditing(false)
    if (inputMode === '$') {
      const newDownpayment = Number(localDownpayment.replace(/[^0-9]/g, '')) || 0
      const newLoanAmount = Math.max(0, effectivePrice - newDownpayment)
      onChange('loanAmount', newLoanAmount)
    } else {
      const percent = parseFloat(localPercent) || 0
      const newDownpayment = Math.round(effectivePrice * percent / 100)
      const newLoanAmount = Math.max(0, effectivePrice - newDownpayment)
      onChange('loanAmount', newLoanAmount)
    }
  }

  const handleDownpaymentFocus = () => {
    setIsEditing(true)
    setLocalDownpayment(downpaymentOnValuation.toString())
    setLocalPercent(((downpaymentOnValuation / effectivePrice) * 100).toFixed(1))
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <div className="h-4 flex items-center">
            <label className="text-xs font-medium text-slate-400">Property Price</label>
          </div>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm font-medium">$</span>
            <Input
              type="text"
              inputMode="numeric"
              value={inputs.propertyPrice.toLocaleString()}
              onChange={(e) => {
                const newPrice = Number(e.target.value.replace(/[^0-9]/g, '')) || 0
                onChange('propertyPrice', newPrice)
                if (!isResale) {
                  onChange('valuationPrice', newPrice)
                }
              }}
              className="w-full rounded-xl bg-white/[0.05] border-white/[0.10] text-white text-sm py-2.5 pl-7 pr-3 hover:border-white/[0.15] focus:border-white/30 focus:bg-white/[0.08] focus:ring-1 focus:ring-white/10"
            />
          </div>
        </div>
        <div className="space-y-1.5">
          <div className="h-4 flex items-center justify-between">
            <label className="text-xs font-medium text-slate-400">Downpayment</label>
            {!isStaggeredActive && (
              <div className="flex items-center gap-0.5 p-0.5 bg-white/[0.03] border border-white/[0.06] rounded-md">
                <button
                  type="button"
                  onClick={() => setInputMode('$')}
                  className={cn(
                    "px-1.5 py-0.5 rounded text-[10px] font-medium transition-all leading-none",
                    inputMode === '$' ? "bg-white/[0.1] text-white" : "text-slate-500 hover:text-slate-300"
                  )}
                >
                  $
                </button>
                <button
                  type="button"
                  onClick={() => setInputMode('%')}
                  className={cn(
                    "px-1.5 py-0.5 rounded text-[10px] font-medium transition-all leading-none",
                    inputMode === '%' ? "bg-white/[0.1] text-white" : "text-slate-500 hover:text-slate-300"
                  )}
                >
                  %
                </button>
              </div>
            )}
          </div>
          {isStaggeredActive ? (
            // Read-only display when staggered is active - shows total from staggered instalments
            <div className={cn(
              "rounded-xl bg-white/[0.02] border py-2.5 px-3",
              isBelowMinimum ? "border-red-500/30" : "border-white/[0.06]"
            )}>
              <span className={cn(
                "text-sm font-mono tabular-nums",
                isBelowMinimum ? "text-red-400" : "text-white"
              )}>
                ${staggeredTotalAmount.toLocaleString()}
              </span>
              <span className="text-slate-500 text-xs ml-2">({staggeredTotalPercent.toFixed(1)}% from staggered)</span>
            </div>
          ) : inputMode === '$' ? (
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm font-medium">$</span>
              <Input
                type="text"
                inputMode="numeric"
                value={isEditing ? localDownpayment : downpaymentOnValuation.toLocaleString()}
                onChange={(e) => handleDownpaymentChange(e.target.value)}
                onFocus={handleDownpaymentFocus}
                onBlur={handleDownpaymentBlur}
                className={cn(
                  "w-full rounded-xl bg-white/[0.05] text-white text-sm py-2.5 pl-7 pr-3 hover:border-white/[0.15] focus:border-white/30 focus:bg-white/[0.08] focus:ring-1 focus:ring-white/10",
                  isBelowMinimum ? "border-red-500/50" : "border-white/[0.10]"
                )}
              />
            </div>
          ) : (
            <div className="relative">
              <Input
                type="text"
                inputMode="decimal"
                value={isEditing ? localPercent : downpaymentPercent.toFixed(1)}
                onChange={(e) => handlePercentChange(e.target.value)}
                onFocus={handleDownpaymentFocus}
                onBlur={handleDownpaymentBlur}
                className={cn(
                  "w-full rounded-xl bg-white/[0.05] text-white text-sm py-2.5 pl-3 pr-7 hover:border-white/[0.15] focus:border-white/30 focus:bg-white/[0.08] focus:ring-1 focus:ring-white/10",
                  isBelowMinimum ? "border-red-500/50" : "border-white/[0.10]"
                )}
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm font-medium">%</span>
            </div>
          )}
          {isBelowMinimum ? (
            <p className="text-xs text-red-400">
              Insufficient downpayment. Min {((1 - maxLtv) * 100).toFixed(0)}% = ${minDownpayment.toLocaleString()}
            </p>
          ) : (
            <p className="text-xs text-slate-500">
              {isStaggeredActive
                ? `Loan: $${(inputs.propertyPrice - staggeredTotalAmount).toLocaleString()} (${(100 - staggeredTotalPercent).toFixed(1)}% LTV)`
                : inputMode === '$'
                  ? `${downpaymentPercent.toFixed(1)}% of price • Min ${((1 - maxLtv) * 100).toFixed(0)}%`
                  : `$${downpaymentOnValuation.toLocaleString()} • Min ${((1 - maxLtv) * 100).toFixed(0)}%`
              }
            </p>
          )}
        </div>
      </div>

      {/* Valuation & COV - Only for resale */}
      {isResale && (
        <div className="grid grid-cols-2 gap-4">
          <FormInput
            label="Valuation"
            prefix="$"
            value={inputs.valuationPrice.toLocaleString()}
            onChange={(v) => onChange('valuationPrice', Number(v.replace(/[^0-9]/g, '')) || 0)}
          />
          <div className="space-y-1.5">
            <div className="flex items-center gap-1.5">
              <label className="text-xs font-medium text-slate-400">Cash Over Valuation</label>
              <InfoTooltip
                title="Cash Over Valuation (COV)"
                description="The amount above the bank/HDB valuation that you pay to the seller. COV must be paid in cash and cannot be financed through a loan or CPF."
              />
            </div>
            <FormInput
              label=""
              prefix="$"
              value={cashOverValuation.toLocaleString()}
              onChange={() => {}}
              readOnly
              className="[&>label]:hidden"
            />
            {cashOverValuation > 0 && (
              <p className="text-xs text-amber-500">Must be paid in cash</p>
            )}
          </div>
        </div>
      )}

      {/* Staggered Downpayment Scheme (SDS) - Only for BTO */}
      {isBTO && (
        <StaggeredDownpaymentSection inputs={inputs} onChange={onChange} />
      )}

      {/* Loan Amount Summary */}
      <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.04]">
        <div className="flex items-center justify-between">
          <span className="text-xs text-slate-500">Loan Amount</span>
          <span className="text-sm font-medium text-white">${inputs.loanAmount.toLocaleString()}</span>
        </div>
        <div className="flex items-center justify-between mt-1">
          <span className="text-xs text-slate-500">LTV Ratio</span>
          <span className={cn(
            "text-xs font-medium",
            inputs.loanAmount / effectivePrice <= maxLtv ? "text-emerald-400" : "text-red-400"
          )}>
            {((inputs.loanAmount / effectivePrice) * 100).toFixed(1)}% / {(maxLtv * 100).toFixed(0)}% max
          </span>
        </div>
      </div>
    </div>
  )
}

// Portal-based tooltip to escape overflow:hidden containers
function HDBEligibilityTooltip() {
  const [isOpen, setIsOpen] = useState(false)
  const [position, setPosition] = useState({ top: 0, left: 0 })
  const triggerRef = useRef<HTMLButtonElement>(null)

  const updatePosition = () => {
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect()
      setPosition({
        top: rect.bottom + 8,
        left: rect.left,
      })
    }
  }

  const handleMouseEnter = () => {
    updatePosition()
    setIsOpen(true)
  }

  const handleMouseLeave = () => {
    setIsOpen(false)
  }

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        className="inline-flex items-center"
      >
        <HelpCircle className="w-3.5 h-3.5 text-slate-500 cursor-help" />
      </button>
      {isOpen && typeof document !== 'undefined' && createPortal(
        <div
          className="fixed w-64 p-3 rounded-lg bg-slate-900 border border-white/[0.1] shadow-xl z-[9999]"
          style={{ top: position.top, left: position.left }}
          onMouseEnter={() => setIsOpen(true)}
          onMouseLeave={() => setIsOpen(false)}
        >
          <p className="text-xs text-slate-300 mb-2">
            Check your eligibility for the Staggered Downpayment Scheme on the HDB website.
          </p>
          <a
            href="https://www.hdb.gov.sg/cs/infoweb/residential/buying-a-flat/buying-procedure-for-new-flats/modes-of-payment"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300"
          >
            HDB Payment Options <ExternalLink className="w-3 h-3" />
          </a>
        </div>,
        document.body
      )}
    </>
  )
}

// Staggered downpayment form with $ / % toggle and validation
function StaggeredDownpaymentForm({
  inputs,
  onChange,
}: {
  inputs: MortgageInputs
  onChange: MortgageFormProps['onChange']
}) {
  const [inputMode, setInputMode] = useState<'$' | '%'>('$')
  const staggered = inputs.staggeredDownpayment!

  // Calculate totals
  const totalPercent = staggered.firstInstalmentPercent + staggered.secondInstalmentPercent
  const totalAmount = Math.round(inputs.propertyPrice * totalPercent / 100)
  const isBelowMinimum = totalPercent < 25

  // Amount calculations
  const firstAmount = Math.round(inputs.propertyPrice * staggered.firstInstalmentPercent / 100)
  const secondAmount = Math.round(inputs.propertyPrice * staggered.secondInstalmentPercent / 100)

  // Helper to update staggered and sync loan amount
  const updateStaggered = (updates: Partial<typeof staggered>) => {
    const newStaggered = { ...staggered, ...updates }
    const newTotalPercent = newStaggered.firstInstalmentPercent + newStaggered.secondInstalmentPercent
    const newLoanAmount = Math.round(inputs.propertyPrice * (1 - newTotalPercent / 100))
    onChange('staggeredDownpayment', newStaggered)
    onChange('loanAmount', Math.max(0, newLoanAmount))
  }

  return (
    <div className="mt-4 space-y-3">
      {/* Input mode toggle and 25% info tooltip */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400">Enter as</span>
          <div className="flex items-center gap-0.5 p-0.5 bg-white/[0.03] border border-white/[0.06] rounded-lg">
            <button
              type="button"
              onClick={() => setInputMode('$')}
              className={cn(
                "px-2 py-1 rounded text-xs font-medium transition-all",
                inputMode === '$' ? "bg-white/[0.1] text-white" : "text-slate-500 hover:text-slate-300"
              )}
            >
              $
            </button>
            <button
              type="button"
              onClick={() => setInputMode('%')}
              className={cn(
                "px-2 py-1 rounded text-xs font-medium transition-all",
                inputMode === '%' ? "bg-white/[0.1] text-white" : "text-slate-500 hover:text-slate-300"
              )}
            >
              %
            </button>
          </div>
        </div>
        {/* 25% minimum tooltip */}
        <div className="relative group">
          <span className="text-xs text-slate-500 cursor-help flex items-center gap-1">
            Min 25% required <HelpCircle className="w-3 h-3" />
          </span>
          <div className="absolute right-0 top-full mt-2 w-64 p-3 rounded-lg bg-slate-900 border border-white/[0.1] shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
            <p className="text-xs text-slate-300 mb-2">
              As of Aug 2024, HDB requires a minimum 25% downpayment for BTO flats (max 75% LTV).
            </p>
            <a
              href="https://www.hdb.gov.sg/cs/infoweb/residential/financing-a-flat-purchase/housing-loan-from-hdb"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300"
            >
              HDB Financing Info <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>
      </div>

      {/* 1st Instalment */}
      <div className="p-3 rounded-lg bg-white/[0.02] border border-white/[0.04]">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-2.5 h-2.5 rounded-full bg-blue-400" />
          <span className="text-xs font-medium text-white">1st Instalment (Lease Signing)</span>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-xs text-slate-400 block mb-1">When</label>
            <MonthPicker
              value={staggered.firstInstalmentMonth}
              onChange={(value) => updateStaggered({ firstInstalmentMonth: value })}
              className="w-full text-xs"
            />
          </div>
          <div>
            <label className="text-xs text-slate-400 block mb-1">
              {inputMode === '$' ? 'Amount' : 'Percentage'}
            </label>
            {inputMode === '$' ? (
              <FormInput
                label=""
                prefix="$"
                value={firstAmount.toLocaleString()}
                onChange={(v) => {
                  const amount = Number(v.replace(/[^0-9]/g, '')) || 0
                  const percent = inputs.propertyPrice > 0 ? (amount / inputs.propertyPrice) * 100 : 0
                  updateStaggered({ firstInstalmentPercent: percent })
                }}
                className="[&>label]:hidden"
              />
            ) : (
              <FormInput
                label=""
                suffix="%"
                value={staggered.firstInstalmentPercent.toFixed(1)}
                onChange={(v) => {
                  const percent = parseFloat(v) || 0
                  updateStaggered({ firstInstalmentPercent: percent })
                }}
                type="number"
                step={0.5}
                min={0}
                className="[&>label]:hidden"
              />
            )}
          </div>
        </div>
        <p className="text-xs text-slate-500 mt-2">
          {inputMode === '$'
            ? `${staggered.firstInstalmentPercent.toFixed(1)}% of property price`
            : `$${firstAmount.toLocaleString()}`
          }
        </p>
      </div>

      {/* 2nd Instalment */}
      <div className="p-3 rounded-lg bg-white/[0.02] border border-white/[0.04]">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
          <span className="text-xs font-medium text-white">2nd Instalment (Key Collection)</span>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-xs text-slate-400 block mb-1">When</label>
            <MonthPicker
              value={staggered.secondInstalmentMonth}
              onChange={(value) => {
                updateStaggered({ secondInstalmentMonth: value })
                onChange('loanStartMonth', value)
              }}
              className="w-full text-xs"
            />
          </div>
          <div>
            <label className="text-xs text-slate-400 block mb-1">
              {inputMode === '$' ? 'Amount' : 'Percentage'}
            </label>
            {inputMode === '$' ? (
              <FormInput
                label=""
                prefix="$"
                value={secondAmount.toLocaleString()}
                onChange={(v) => {
                  const amount = Number(v.replace(/[^0-9]/g, '')) || 0
                  const percent = inputs.propertyPrice > 0 ? (amount / inputs.propertyPrice) * 100 : 0
                  updateStaggered({ secondInstalmentPercent: percent })
                }}
                className="[&>label]:hidden"
              />
            ) : (
              <FormInput
                label=""
                suffix="%"
                value={staggered.secondInstalmentPercent.toFixed(1)}
                onChange={(v) => {
                  const percent = parseFloat(v) || 0
                  updateStaggered({ secondInstalmentPercent: percent })
                }}
                type="number"
                step={0.5}
                min={0}
                className="[&>label]:hidden"
              />
            )}
          </div>
        </div>
        <p className="text-xs text-slate-500 mt-2">
          {inputMode === '$'
            ? `${staggered.secondInstalmentPercent.toFixed(1)}% of property price`
            : `$${secondAmount.toLocaleString()}`
          }
        </p>
      </div>

      {/* Total with validation */}
      <div className={cn(
        "pt-3 border-t flex items-center justify-between",
        isBelowMinimum ? "border-red-500/30" : "border-white/[0.06]"
      )}>
        <span className="text-xs text-slate-500">Total Downpayment</span>
        <span className={cn(
          "text-xs font-medium",
          isBelowMinimum ? "text-red-400" : totalPercent > 25 ? "text-emerald-400" : "text-white"
        )}>
          ${totalAmount.toLocaleString()} ({totalPercent.toFixed(1)}%)
        </span>
      </div>
      {isBelowMinimum && (
        <p className="text-xs text-red-400">
          Total downpayment must be at least 25% (${Math.round(inputs.propertyPrice * 0.25).toLocaleString()})
        </p>
      )}
      {totalPercent > 25 && (
        <p className="text-xs text-emerald-400/70">
          Paying above minimum — loan amount will be ${Math.round(inputs.propertyPrice * (1 - totalPercent / 100)).toLocaleString()} ({(100 - totalPercent).toFixed(1)}% LTV)
        </p>
      )}
    </div>
  )
}

function StaggeredDownpaymentSection({
  inputs,
  onChange,
}: {
  inputs: MortgageInputs
  onChange: MortgageFormProps['onChange']
}) {
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(inputs.staggeredDownpayment?.enabled ?? false)

  return (
    <div className="rounded-xl border border-white/[0.06] overflow-hidden">
      {/* Advanced Section Header */}
      <button
        type="button"
        onClick={() => setIsAdvancedOpen(!isAdvancedOpen)}
        className="w-full flex items-center justify-between px-4 py-3 bg-white/[0.02] hover:bg-white/[0.04] transition-colors"
      >
        <span className="text-xs font-medium text-slate-400">Advanced Options</span>
        <ChevronDown className={cn(
          "w-4 h-4 text-slate-500 transition-transform duration-200",
          isAdvancedOpen && "rotate-180"
        )} />
      </button>

      {/* Collapsible Content */}
      <AnimatePresence>
        {isAdvancedOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="p-4 border-t border-white/[0.06] bg-blue-500/5">
              {/* Staggered Downpayment Toggle */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-lg bg-blue-500/20 flex items-center justify-center">
                    <Building2 className="w-3.5 h-3.5 text-blue-400" />
                  </div>
                  <span className="text-xs font-medium text-blue-300">Staggered Downpayment</span>
                  {/* Tooltip with HDB eligibility info - using Portal */}
                  <HDBEligibilityTooltip />
                </div>
                <button
                  type="button"
                  onClick={() => {
                    if (inputs.staggeredDownpayment?.enabled) {
                      onChange('staggeredDownpayment', { ...inputs.staggeredDownpayment, enabled: false })
                    } else {
                      onChange('staggeredDownpayment', createDefaultStaggeredDownpayment('2025-06', inputs.loanStartMonth))
                    }
                  }}
                  className={cn(
                    "relative w-10 h-5 rounded-full transition-colors duration-200",
                    inputs.staggeredDownpayment?.enabled ? "bg-blue-500" : "bg-white/[0.1]"
                  )}
                >
                  <div className={cn(
                    "absolute top-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-transform duration-200",
                    inputs.staggeredDownpayment?.enabled ? "translate-x-5" : "translate-x-0.5"
                  )} />
                </button>
              </div>

              {inputs.staggeredDownpayment?.enabled && (
                <StaggeredDownpaymentForm
                  inputs={inputs}
                  onChange={onChange}
                />
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function BorrowersStep({
  inputs,
  onChange,
  incomes,
  cpfAccounts,
  exceedsHdbIncomeCeiling,
  exceedsEcIncomeCeiling,
  purchaseDateFormatted,
}: {
  inputs: MortgageInputs
  onChange: MortgageFormProps['onChange']
  incomes: IncomeOption[]
  cpfAccounts: { id: string; earner?: string; oaBalance: number }[]
  exceedsHdbIncomeCeiling: boolean
  exceedsEcIncomeCeiling: boolean
  purchaseDateFormatted: string
}) {
  // Helper to format income label - earner name if present, else salary name
  const formatIncomeLabel = (income: IncomeOption) => {
    const displayName = income.earner || income.name
    return `${displayName} - $${income.monthlyAmount.toLocaleString()}/mo`
  }

  // Find matching CPF account by earner name (case-insensitive)
  const findCpfAccountForIncome = (income: IncomeOption) => {
    if (!income.earner) return null
    const earnerLower = income.earner.toLowerCase()
    return cpfAccounts.find(acc => acc.earner?.toLowerCase() === earnerLower)
  }
  return (
    <div className="space-y-4">
      {/* Eligibility Warning */}
      {(exceedsHdbIncomeCeiling || exceedsEcIncomeCeiling) && (
        <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20">
          <p className="text-xs font-medium text-amber-400">
            {exceedsHdbIncomeCeiling ? 'HDB Income Ceiling Notice' : 'EC Income Ceiling Notice'}
          </p>
          <p className="text-xs text-amber-300/70 mt-1">
            Income exceeds typical ceiling. Please verify eligibility.
          </p>
        </div>
      )}

      {/* Borrower 1 */}
      <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06]">
        <span className="text-xs font-medium text-slate-300 mb-3 block">
          {inputs.borrowerType === 'joint' ? 'Borrower 1' : 'Primary Borrower'}
        </span>

        <CustomSelect
          value={inputs.borrower1IncomeId}
          onChange={(value) => {
            onChange('borrower1IncomeId', value as string)
            const selectedIncome = incomes.find(i => i.id === value)
            if (selectedIncome) {
              const oaInflow = calculateMonthlyOaInflow(selectedIncome.monthlyAmount)
              onChange('householdIncome', inputs.borrowerType === 'joint'
                ? selectedIncome.monthlyAmount + (incomes.find(i => i.id === inputs.borrower2IncomeId)?.monthlyAmount || 0)
                : selectedIncome.monthlyAmount)
              onChange('monthlyCpfOa', inputs.borrowerType === 'joint'
                ? oaInflow + calculateMonthlyOaInflow(incomes.find(i => i.id === inputs.borrower2IncomeId)?.monthlyAmount || 0)
                : oaInflow)
              // Auto-populate OA balance from matching CPF account
              const matchingCpf = findCpfAccountForIncome(selectedIncome)
              if (matchingCpf) {
                const oaBalance = matchingCpf.oaBalance
                onChange('borrower1OaBalance', oaBalance)
                onChange('cpfOaBalance', inputs.borrowerType === 'joint'
                  ? oaBalance + inputs.borrower2OaBalance
                  : oaBalance)
              }
            }
          }}
          options={incomes.map(income => ({
            value: income.id,
            label: formatIncomeLabel(income),
          }))}
          className="w-full"
        />

        {/* OA Balance - Read-only, projected to purchase date */}
        {inputs.borrower1IncomeId && (
          <div className="mt-3 flex items-center justify-between px-3 py-2 rounded-lg bg-white/[0.02] border border-white/[0.04]">
            <span className="text-slate-500 text-xs">Projected OA at {purchaseDateFormatted}</span>
            <span className="text-white text-sm font-mono tabular-nums">${inputs.borrower1OaBalance.toLocaleString()}</span>
          </div>
        )}
      </div>

      {/* Add Joint Borrower */}
      {inputs.borrowerType === 'single' && incomes.length > 1 && (
        <button
          type="button"
          onClick={() => {
            onChange('borrowerType', 'joint')
            const availableIncome = incomes.find(i => i.id !== inputs.borrower1IncomeId)
            if (availableIncome) {
              onChange('borrower2IncomeId', availableIncome.id)
              // Auto-populate OA balance from matching CPF account, fallback to default
              const matchingCpf = findCpfAccountForIncome(availableIncome)
              const borrower2OaBalance = matchingCpf?.oaBalance ?? 62400
              onChange('borrower2OaBalance', borrower2OaBalance)
              const borrower1Income = incomes.find(i => i.id === inputs.borrower1IncomeId)
              if (borrower1Income) {
                onChange('householdIncome', borrower1Income.monthlyAmount + availableIncome.monthlyAmount)
                onChange('monthlyCpfOa', calculateMonthlyOaInflow(borrower1Income.monthlyAmount) + calculateMonthlyOaInflow(availableIncome.monthlyAmount))
                onChange('cpfOaBalance', inputs.borrower1OaBalance + borrower2OaBalance)
              }
            }
          }}
          className="w-full py-2 rounded-xl border border-dashed border-white/[0.08] hover:border-white/[0.15] text-slate-500 hover:text-slate-300 text-xs font-medium transition-all"
        >
          + Add joint borrower
        </button>
      )}

      {/* Borrower 2 */}
      {inputs.borrowerType === 'joint' && (
        <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06]">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-medium text-slate-300">Borrower 2</span>
            <button
              type="button"
              onClick={() => {
                onChange('borrowerType', 'single')
                onChange('borrower2IncomeId', '')
                onChange('borrower2OaBalance', 0)
                const borrower1Income = incomes.find(i => i.id === inputs.borrower1IncomeId)
                if (borrower1Income) {
                  onChange('householdIncome', borrower1Income.monthlyAmount)
                  onChange('cpfOaBalance', inputs.borrower1OaBalance)
                }
              }}
              className="text-xs text-slate-500 hover:text-red-400 transition-colors"
            >
              Remove
            </button>
          </div>
          <CustomSelect
            value={inputs.borrower2IncomeId || ''}
            onChange={(value) => {
              onChange('borrower2IncomeId', value as string)
              const selectedIncome = incomes.find(i => i.id === value)
              const borrower1Income = incomes.find(i => i.id === inputs.borrower1IncomeId)
              if (selectedIncome && borrower1Income) {
                onChange('householdIncome', borrower1Income.monthlyAmount + selectedIncome.monthlyAmount)
                // Auto-populate OA balance from matching CPF account
                const matchingCpf = findCpfAccountForIncome(selectedIncome)
                if (matchingCpf) {
                  const oaBalance = matchingCpf.oaBalance
                  onChange('borrower2OaBalance', oaBalance)
                  onChange('cpfOaBalance', inputs.borrower1OaBalance + oaBalance)
                }
              }
            }}
            options={incomes.filter(i => i.id !== inputs.borrower1IncomeId).map(income => ({
              value: income.id,
              label: formatIncomeLabel(income),
            }))}
            className="w-full"
          />

          {/* OA Balance - Read-only, projected to purchase date */}
          {inputs.borrower2IncomeId && (
            <div className="mt-3 flex items-center justify-between px-3 py-2 rounded-lg bg-white/[0.02] border border-white/[0.04]">
              <span className="text-slate-500 text-xs">Projected OA at {purchaseDateFormatted}</span>
              <span className="text-white text-sm font-mono tabular-nums">${inputs.borrower2OaBalance.toLocaleString()}</span>
            </div>
          )}
        </div>
      )}

      {/* Summary */}
      <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.04]">
        <div className="flex justify-between text-xs">
          <span className="text-slate-500">Combined Income</span>
          <span className="text-white font-medium">${inputs.householdIncome.toLocaleString()}/mo</span>
        </div>
        <div className="flex justify-between text-xs mt-1">
          <span className="text-slate-500">Combined CPF OA</span>
          <span className="text-white">${inputs.cpfOaBalance.toLocaleString()}</span>
        </div>
      </div>
    </div>
  )
}

function FinancingStep({
  inputs,
  onChange,
  isHDB,
  effectivePrice,
  downpaymentOnValuation,
}: {
  inputs: MortgageInputs
  onChange: MortgageFormProps['onChange']
  isHDB: boolean
  effectivePrice: number
  downpaymentOnValuation: number
}) {
  return (
    <div className="space-y-4">
      {/* Loan Term & Interest Rate - side by side for HDB */}
      {isHDB ? (
        <div className="grid grid-cols-2 gap-4">
          <FormInput
            label="Loan Term"
            value={inputs.loanTermYears}
            onChange={(v) => onChange('loanTermYears', Number(v))}
            type="number"
            min={1}
            max={35}
            suffix="yrs"
          />
          <FormInput
            label="Interest Rate"
            value={inputs.fixedRate}
            onChange={(v) => {
              const rate = Number(v)
              onChange('fixedRate', rate)
              onChange('floatingRate', rate)
            }}
            type="number"
            step={0.1}
            min={0}
            max={10}
            suffix="%"
          />
        </div>
      ) : (
        <>
          {/* Loan Term */}
          <FormInput
            label="Loan Term"
            value={inputs.loanTermYears}
            onChange={(v) => onChange('loanTermYears', Number(v))}
            type="number"
            min={1}
            max={35}
            suffix="yrs"
          />

          {/* Interest Rates - Fixed & Floating side by side */}
          <div className="grid grid-cols-2 gap-4">
            <FormInput
              label="Fixed Rate"
              value={inputs.fixedRate}
              onChange={(v) => onChange('fixedRate', Number(v))}
              type="number"
              step={0.1}
              min={0}
              max={10}
              suffix="%"
            />
            <FormInput
              label="Floating Rate"
              value={inputs.floatingRate}
              onChange={(v) => onChange('floatingRate', Number(v))}
              type="number"
              step={0.1}
              min={0}
              max={10}
              suffix="%"
            />
          </div>
        </>
      )}

      {/* Grants */}
      <GrantsEditor
        grants={inputs.grants}
        onGrantsChange={(grants) => onChange('grants', grants)}
      />

      {/* Loan Type Toggle */}
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-slate-400 block">Loan Type</label>
        <div className="flex items-center gap-1 p-1 bg-white/[0.02] border border-white/[0.06] rounded-xl">
          <button
            type="button"
            onClick={() => {
              if (!isHDB) return
              onChange('loanType', 'hdb')
              const cpfOa = Math.min(downpaymentOnValuation, inputs.cpfOaBalance)
              onChange('downpaymentCpfOa', cpfOa)
              onChange('downpaymentCash', downpaymentOnValuation - cpfOa)
            }}
            disabled={!isHDB}
            className={cn(
              "flex-1 py-2.5 px-4 rounded-lg text-sm font-medium transition-all",
              inputs.loanType === 'hdb'
                ? "bg-white/10 text-white"
                : !isHDB ? "text-slate-700 cursor-not-allowed" : "text-slate-400 hover:text-slate-200"
            )}
          >
            HDB Loan
          </button>
          <button
            type="button"
            onClick={() => {
              onChange('loanType', 'bank')
              const minCash = Math.round(effectivePrice * 0.05)
              const maxCpf = Math.max(0, downpaymentOnValuation - minCash)
              const cpfOa = Math.min(maxCpf, inputs.cpfOaBalance)
              onChange('downpaymentCpfOa', cpfOa)
              onChange('downpaymentCash', downpaymentOnValuation - cpfOa)
            }}
            className={cn(
              "flex-1 py-2.5 px-4 rounded-lg text-sm font-medium transition-all",
              inputs.loanType === 'bank'
                ? "bg-white/10 text-white"
                : "text-slate-400 hover:text-slate-200"
            )}
          >
            Bank Loan
          </button>
        </div>
        {inputs.loanType === 'bank' && (
          <p className="text-xs text-slate-500 mt-1">Requires 5% min cash for downpayment</p>
        )}
      </div>
    </div>
  )
}

function TermsStep({
  inputs,
  onChange,
  propertyType,
}: {
  inputs: MortgageInputs
  onChange: MortgageFormProps['onChange']
  propertyType: PropertyType
}) {
  const isHDB = propertyType.includes('hdb')

  return (
    <div className="space-y-4">
      {/* ABSD - Only for non-HDB */}
      {!isHDB && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-medium text-slate-400">ABSD Rate</label>
            <a
              href="https://www.iras.gov.sg/taxes/stamp-duty/for-property/buying-or-acquiring-property/additional-buyer's-stamp-duty-(absd)"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-indigo-400 hover:text-indigo-300"
            >
              Check rates →
            </a>
          </div>
          <FormInput
            label=""
            value={inputs.absdRate}
            onChange={(v) => onChange('absdRate', Number(v) || 0)}
            type="number"
            min={0}
            max={65}
            suffix="%"
            className="[&>label]:hidden"
          />
          {inputs.absdRate > 0 && (
            <div className="p-2 rounded-lg bg-rose-500/10 border border-rose-500/20">
              <div className="flex justify-between items-center">
                <span className="text-xs text-rose-400">ABSD Amount</span>
                <span className="text-sm text-rose-300 font-medium">
                  {formatCurrency(Math.round(inputs.propertyPrice * (inputs.absdRate / 100)))}
                </span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Additional Expenses */}
      <div className="pt-2 border-t border-white/[0.04]">
        <FeeEditor
          fees={inputs.purchaseFees}
          onFeesChange={(fees) => onChange('purchaseFees', fees)}
          basePrice={inputs.propertyPrice}
          title="Additional Expenses"
          purchaseDate={inputs.loanStartMonth}
        />
      </div>
    </div>
  )
}

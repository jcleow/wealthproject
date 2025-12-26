"use client"

import { useState, useMemo, useCallback, useEffect } from 'react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'
import { IconPicker } from '@/components/modals/ScenarioEventModal/components/IconPicker'
import { Input } from '@/components/ui/input'
import { MonthPicker } from '@/components/ui/MonthPicker'
import { CustomSelect } from '@/components/ui/CustomSelect'
import {
  Building2,
  Home,
  Landmark,
  ArrowLeft,
  Banknote,
  Hammer,
  CheckCircle2,
  AlertTriangle,
  Check,
  Plus,
  X,
  ChevronRight,
  Trash2,
  Pencil,
  TrendingUp,
} from 'lucide-react'

// Import types
import type {
  PropertyType,
  PropertyScenario,
  MortgageInputs,
  SaleInputs,
  SaleResult,
  FeeItem,
  AppreciationPeriod,
  LoanSegment,
  PropertyOption,
  FormStep,
  SaleFormStep,
  StaggeredDownpayment,
} from './types'

// Import components
import {
  FormInput,
  FeeEditor,
  AppreciationEditor,
  LoanSegmentEditor,
  AmortizationChart,
  LucideIcon,
  InfoTooltip,
  PropertyAppreciationPanel,
} from './components'

// Import hooks and constants
import {
  formatCurrency,
  formatMonthYear,
  calculateMortgage,
  calculateSaleProceeds,
  calculateMonthlyOaInflow,
} from './hooks'

import {
  DEFAULT_SALE_FEES,
  FORM_STEPS,
  SALE_FORM_STEPS,
  defaultInputsByType,
  mockIncomes,
  createDefaultStaggeredDownpayment,
} from './hooks/constants'

// ============================================
// PROPERTY OPTIONS DATA
// ============================================

const propertyOptions: PropertyOption[] = [
  {
    id: 'hdb-resale',
    title: 'HDB Resale',
    subtitle: 'Immediate move-in',
    description: 'Purchase an existing HDB flat on the resale market with established amenities.',
    icon: <Home className="w-6 h-6" />,
    color: 'from-emerald-500/20 to-emerald-600/5',
    accentColor: 'text-emerald-400',
    priceRange: '$300K - $800K',
    highlights: ['No wait time', 'CPF eligible', 'Grants available'],
  },
  {
    id: 'hdb-bto',
    title: 'HDB BTO',
    subtitle: 'Build-to-Order',
    description: 'Apply for a new HDB flat with 3-5 year waiting period and government subsidies.',
    icon: <Building2 className="w-6 h-6" />,
    color: 'from-blue-500/20 to-blue-600/5',
    accentColor: 'text-blue-400',
    priceRange: '$200K - $600K',
    highlights: ['Subsidized pricing', 'New condition', '3-5 year wait'],
  },
  {
    id: 'ec',
    title: 'Executive Condo',
    subtitle: 'Hybrid property',
    description: 'Private condo with HDB-like subsidies. Privatizes after 10 years.',
    icon: <Landmark className="w-6 h-6" />,
    color: 'from-violet-500/20 to-violet-600/5',
    accentColor: 'text-violet-400',
    priceRange: '$1M - $1.8M',
    highlights: ['Condo facilities', 'EC grants', '5yr MOP'],
  },
  {
    id: 'private-resale',
    title: 'Private Resale',
    subtitle: 'Secondary market',
    description: 'Existing private apartment or condo with immediate availability.',
    icon: <Building2 className="w-6 h-6" />,
    color: 'from-amber-500/20 to-amber-600/5',
    accentColor: 'text-amber-400',
    priceRange: '$1M - $3M+',
    highlights: ['Immediate', 'No restrictions', 'Negotiable'],
  },
  {
    id: 'private-new',
    title: 'New Launch',
    subtitle: 'Developer sale',
    description: 'Brand new private condo directly from developers with latest designs.',
    icon: <Hammer className="w-6 h-6" />,
    color: 'from-rose-500/20 to-rose-600/5',
    accentColor: 'text-rose-400',
    priceRange: '$1.5M - $5M+',
    highlights: ['New warranty', 'Modern design', '1-4yr wait'],
  },
]

// ============================================
// MORTGAGE FORM COMPONENT
// ============================================

function MortgageForm({
  inputs,
  onChange,
  propertyType,
}: {
  inputs: MortgageInputs
  onChange: (field: keyof MortgageInputs, value: number | string | string[] | FeeItem[] | AppreciationPeriod[] | LoanSegment[] | StaggeredDownpayment | null) => void
  propertyType: PropertyType
}) {
  const [currentStep, setCurrentStep] = useState<FormStep>('property')
  const isHDB = propertyType.includes('hdb')
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
  const exceedsHdbIncomeCeiling = isHDB && inputs.householdIncome > hdbIncomeCeiling
  const exceedsEcIncomeCeiling = isEC && inputs.householdIncome > ecIncomeCeiling

  const currentStepIndex = FORM_STEPS.findIndex(s => s.id === currentStep)

  // Step validation
  const isStep1Valid = inputs.propertyPrice > 0 && inputs.loanAmount > 0
  const isStep2Valid = inputs.householdIncome > 0
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

  return (
    <div className="space-y-4">
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
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormInput
                    label="Property Price"
                    prefix="$"
                    value={inputs.propertyPrice.toLocaleString()}
                    onChange={(v) => {
                      const newPrice = Number(v.replace(/[^0-9]/g, '')) || 0
                      onChange('propertyPrice', newPrice)
                      if (!isResale) {
                        onChange('valuationPrice', newPrice)
                      }
                    }}
                  />
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-slate-400 block">Downpayment</label>
                    {isBTO && inputs.staggeredDownpayment?.enabled ? (
                      /* Read-only total when SDS is enabled */
                      <div className="rounded-xl bg-white/[0.02] border border-white/[0.06] py-2.5 px-3">
                        <span className="text-white text-sm font-mono tabular-nums">${downpaymentOnValuation.toLocaleString()}</span>
                        <span className="text-slate-500 text-xs ml-2">(25% total)</span>
                      </div>
                    ) : (
                      /* Editable input when SDS is disabled */
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm font-medium">$</span>
                        <Input
                          type="text"
                          inputMode="numeric"
                          value={downpaymentOnValuation.toLocaleString()}
                          onChange={(e) => {
                            const newDownpayment = Number(e.target.value.replace(/[^0-9]/g, '')) || 0
                            const newLoanAmount = Math.max(0, effectivePrice - newDownpayment)
                            const clampedLoanAmount = Math.min(newLoanAmount, maxLoanAmount)
                            onChange('loanAmount', clampedLoanAmount)
                          }}
                          className="w-full rounded-xl bg-white/[0.05] border-white/[0.10] text-white text-sm py-2.5 pl-7 pr-3 hover:border-white/[0.15] focus:border-white/30 focus:bg-white/[0.08] focus:ring-1 focus:ring-white/10"
                        />
                      </div>
                    )}
                    <p className="text-xs text-slate-500">
                      Min {((1 - maxLtv) * 100).toFixed(0)}% = ${Math.ceil(effectivePrice * (1 - maxLtv)).toLocaleString()}
                    </p>
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
                  <div className="p-4 rounded-xl bg-blue-500/5 border border-blue-500/20">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-lg bg-blue-500/20 flex items-center justify-center">
                          <Building2 className="w-3.5 h-3.5 text-blue-400" />
                        </div>
                        <span className="text-xs font-medium text-blue-300">Staggered Downpayment</span>
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

                    <p className="text-xs text-slate-500 mb-3">
                      Split your downpayment: pay a smaller amount at lease signing (~9 months after booking), then the rest at key collection.
                    </p>

                    {inputs.staggeredDownpayment?.enabled && (
                      <>
                        {/* First Instalment Rate Input */}
                        <FormInput
                          label="First Instalment Rate"
                          value={inputs.staggeredDownpayment.firstInstalmentPercent}
                          onChange={(v) => {
                            const value = parseFloat(v) || 0
                            const clamped = Math.min(Math.max(0, value), 25)
                            onChange('staggeredDownpayment', { ...inputs.staggeredDownpayment!, firstInstalmentPercent: clamped })
                          }}
                          type="number"
                          step={0.5}
                          min={0}
                          max={25}
                          suffix="%"
                          helperText="Common rates: 5% (standard) or 2.5% (NSFs, students)"
                          className="mb-3"
                        />

                        {/* Payment Timeline */}
                        <div className="space-y-3">
                          {/* First Instalment */}
                          <div className="p-3 rounded-lg bg-white/[0.02] border border-white/[0.04]">
                            <div className="flex items-center gap-2 mb-2">
                              <div className="w-2.5 h-2.5 rounded-full bg-blue-400" />
                              <span className="text-xs font-medium text-white">1st Instalment (Lease Signing)</span>
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <label className="text-xs text-slate-400 block mb-1">When</label>
                                <MonthPicker
                                  value={inputs.staggeredDownpayment.firstInstalmentMonth}
                                  onChange={(value) => onChange('staggeredDownpayment', { ...inputs.staggeredDownpayment!, firstInstalmentMonth: value })}
                                  className="w-full text-xs"
                                />
                              </div>
                              <div>
                                <label className="text-xs text-slate-400 block mb-1">Amount ({inputs.staggeredDownpayment.firstInstalmentPercent}%)</label>
                                <div className="h-[38px] flex items-center px-3 rounded-xl bg-white/[0.03] border border-white/[0.06] text-sm text-white">
                                  ${Math.round(inputs.propertyPrice * inputs.staggeredDownpayment.firstInstalmentPercent / 100).toLocaleString()}
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Second Instalment */}
                          <div className="p-3 rounded-lg bg-white/[0.02] border border-white/[0.04]">
                            <div className="flex items-center gap-2 mb-2">
                              <div className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                              <span className="text-xs font-medium text-white">2nd Instalment (Key Collection)</span>
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <label className="text-xs text-slate-400 block mb-1">When</label>
                                <MonthPicker
                                  value={inputs.staggeredDownpayment.secondInstalmentMonth}
                                  onChange={(value) => {
                                    onChange('staggeredDownpayment', { ...inputs.staggeredDownpayment!, secondInstalmentMonth: value })
                                    onChange('loanStartMonth', value) // Sync loan start with key collection
                                  }}
                                  className="w-full text-xs"
                                />
                              </div>
                              <div>
                                <label className="text-xs text-slate-400 block mb-1">Amount ({25 - inputs.staggeredDownpayment.firstInstalmentPercent}%)</label>
                                <div className="h-[38px] flex items-center px-3 rounded-xl bg-white/[0.03] border border-white/[0.06] text-sm text-white">
                                  ${Math.round(inputs.propertyPrice * (25 - inputs.staggeredDownpayment.firstInstalmentPercent) / 100).toLocaleString()}
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Total */}
                        <div className="mt-3 pt-3 border-t border-white/[0.06] flex items-center justify-between">
                          <span className="text-xs text-slate-500">Total Downpayment (25%)</span>
                          <span className="text-xs font-medium text-white">
                            ${Math.round(inputs.propertyPrice * 0.25).toLocaleString()}
                          </span>
                        </div>
                      </>
                    )}
                  </div>
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
            )}

            {/* ========== STEP 2: BORROWERS ========== */}
            {currentStep === 'borrowers' && (
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
                      const selectedIncome = mockIncomes.find(i => i.id === value)
                      if (selectedIncome) {
                        const oaInflow = calculateMonthlyOaInflow(selectedIncome.monthlyAmount)
                        onChange('householdIncome', inputs.borrowerType === 'joint'
                          ? selectedIncome.monthlyAmount + (mockIncomes.find(i => i.id === inputs.borrower2IncomeId)?.monthlyAmount || 0)
                          : selectedIncome.monthlyAmount)
                        onChange('monthlyCpfOa', inputs.borrowerType === 'joint'
                          ? oaInflow + calculateMonthlyOaInflow(mockIncomes.find(i => i.id === inputs.borrower2IncomeId)?.monthlyAmount || 0)
                          : oaInflow)
                      }
                    }}
                    options={mockIncomes.map(income => ({
                      value: income.id,
                      label: `${income.name} - $${income.monthlyAmount.toLocaleString()}/mo`,
                    }))}
                    className="w-full"
                  />

                  <div className="grid grid-cols-2 gap-3 mt-3">
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-xs font-medium">OA</span>
                      <Input
                        type="text"
                        inputMode="numeric"
                        value={inputs.borrower1OaBalance.toLocaleString()}
                        onChange={(e) => {
                          const newBalance = Number(e.target.value.replace(/[^0-9]/g, '')) || 0
                          onChange('borrower1OaBalance', newBalance)
                          onChange('cpfOaBalance', inputs.borrowerType === 'joint'
                            ? newBalance + inputs.borrower2OaBalance
                            : newBalance)
                        }}
                        className="w-full rounded-lg bg-white/[0.02] border-white/[0.06] text-white text-sm py-2 pl-10 pr-3 focus:border-white/20"
                      />
                    </div>
                    <div className="rounded-lg bg-white/[0.02] border border-white/[0.04] text-slate-500 text-xs py-2 px-3 flex items-center">
                      +${calculateMonthlyOaInflow(mockIncomes.find(i => i.id === inputs.borrower1IncomeId)?.monthlyAmount || 0).toLocaleString()}/mo
                    </div>
                  </div>
                </div>

                {/* Add Joint Borrower */}
                {inputs.borrowerType === 'single' && mockIncomes.length > 1 && (
                  <button
                    type="button"
                    onClick={() => {
                      onChange('borrowerType', 'joint')
                      const availableIncome = mockIncomes.find(i => i.id !== inputs.borrower1IncomeId)
                      if (availableIncome) {
                        onChange('borrower2IncomeId', availableIncome.id)
                        onChange('borrower2OaBalance', 62400)
                        const borrower1Income = mockIncomes.find(i => i.id === inputs.borrower1IncomeId)
                        if (borrower1Income) {
                          onChange('householdIncome', borrower1Income.monthlyAmount + availableIncome.monthlyAmount)
                          onChange('monthlyCpfOa', calculateMonthlyOaInflow(borrower1Income.monthlyAmount) + calculateMonthlyOaInflow(availableIncome.monthlyAmount))
                          onChange('cpfOaBalance', inputs.borrower1OaBalance + 62400)
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
                          const borrower1Income = mockIncomes.find(i => i.id === inputs.borrower1IncomeId)
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
                        const selectedIncome = mockIncomes.find(i => i.id === value)
                        const borrower1Income = mockIncomes.find(i => i.id === inputs.borrower1IncomeId)
                        if (selectedIncome && borrower1Income) {
                          onChange('householdIncome', borrower1Income.monthlyAmount + selectedIncome.monthlyAmount)
                        }
                      }}
                      options={mockIncomes.filter(i => i.id !== inputs.borrower1IncomeId).map(income => ({
                        value: income.id,
                        label: `${income.name} - $${income.monthlyAmount.toLocaleString()}/mo`,
                      }))}
                      className="w-full"
                    />
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
            )}

            {/* ========== STEP 3: FINANCING ========== */}
            {currentStep === 'financing' && (
              <div className="space-y-4">
                {/* Start Date & Term */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-slate-400 block">Start Date</label>
                    <MonthPicker
                      value={inputs.loanStartMonth}
                      onChange={(value) => onChange('loanStartMonth', value)}
                      className="w-full"
                    />
                  </div>
                  <FormInput
                    label="Term"
                    value={inputs.loanTermYears}
                    onChange={(v) => onChange('loanTermYears', Number(v))}
                    type="number"
                    min={1}
                    max={35}
                    suffix="yrs"
                  />
                </div>

                {/* Interest Rates */}
                <div className={cn("grid gap-4", isHDB ? "grid-cols-1" : "grid-cols-2")}>
                  <FormInput
                    label={isHDB ? 'Interest Rate' : 'Fixed Rate'}
                    value={inputs.fixedRate}
                    onChange={(v) => onChange('fixedRate', Number(v))}
                    type="number"
                    step={0.1}
                    min={0}
                    max={10}
                    suffix="%"
                  />
                  {!isHDB && (
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
                  )}
                </div>

                {/* Grants */}
                <FormInput
                  label="Housing Grants"
                  prefix="$"
                  value={inputs.grants.toLocaleString()}
                  onChange={(v) => onChange('grants', Number(v.replace(/[^0-9]/g, '')) || 0)}
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
                        const maxCpf = Math.round(effectivePrice * 0.20)
                        const cpfOa = Math.min(maxCpf, inputs.cpfOaBalance, downpaymentOnValuation - minCash)
                        onChange('downpaymentCpfOa', Math.max(0, cpfOa))
                        onChange('downpaymentCash', downpaymentOnValuation - Math.max(0, cpfOa))
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
                </div>

                {/* Downpayment Summary */}
                <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06]">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-slate-500">Downpayment</span>
                    <span className="text-sm font-medium text-white">
                      ${(downpaymentOnValuation + cashOverValuation).toLocaleString()}
                    </span>
                  </div>

                  {/* Visual bar */}
                  <div className="h-2 rounded-full overflow-hidden bg-white/[0.04] flex mb-3">
                    {inputs.downpaymentCpfOa > 0 && (
                      <div
                        className="h-full bg-slate-400"
                        style={{ width: `${(inputs.downpaymentCpfOa / (downpaymentOnValuation + cashOverValuation)) * 100}%` }}
                      />
                    )}
                    {inputs.downpaymentCash > 0 && (
                      <div
                        className="h-full bg-slate-600"
                        style={{ width: `${(inputs.downpaymentCash / (downpaymentOnValuation + cashOverValuation)) * 100}%` }}
                      />
                    )}
                  </div>

                  {/* Editable CPF/Cash */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-xs font-medium">CPF</span>
                      <Input
                        type="text"
                        inputMode="numeric"
                        value={inputs.downpaymentCpfOa.toLocaleString()}
                        onChange={(e) => {
                          const newCpfOa = Number(e.target.value.replace(/[^0-9]/g, '')) || 0
                          const minCash = inputs.loanType === 'hdb' ? 0 : Math.round(effectivePrice * 0.05)
                          const maxCpf = inputs.loanType === 'hdb' ? downpaymentOnValuation : Math.round(effectivePrice * 0.20)
                          const clampedCpfOa = Math.min(newCpfOa, maxCpf, inputs.cpfOaBalance, downpaymentOnValuation - minCash)
                          onChange('downpaymentCpfOa', Math.max(0, clampedCpfOa))
                          onChange('downpaymentCash', Math.max(0, downpaymentOnValuation - clampedCpfOa))
                        }}
                        className="w-full rounded-lg bg-white/[0.02] border-white/[0.06] text-white text-sm py-2 pl-11 pr-3 focus:border-white/20"
                      />
                    </div>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-xs font-medium">Cash</span>
                      <Input
                        type="text"
                        inputMode="numeric"
                        value={inputs.downpaymentCash.toLocaleString()}
                        onChange={(e) => {
                          const newCash = Number(e.target.value.replace(/[^0-9]/g, '')) || 0
                          const minCash = inputs.loanType === 'hdb' ? 0 : Math.round(effectivePrice * 0.05)
                          const clampedCash = Math.max(newCash, minCash)
                          onChange('downpaymentCash', clampedCash)
                          onChange('downpaymentCpfOa', Math.max(0, downpaymentOnValuation - clampedCash))
                        }}
                        className="w-full rounded-lg bg-white/[0.02] border-white/[0.06] text-white text-sm py-2 pl-12 pr-3 focus:border-white/20"
                      />
                    </div>
                  </div>
                </div>

                {/* Loan Schedule / Refinancing - Only for bank loans */}
                {!isHDB && (
                  <div className="pt-4 border-t border-white/[0.04]">
                    <LoanSegmentEditor
                      segments={inputs.loanSegments}
                      onSegmentsChange={(segments) => onChange('loanSegments', segments)}
                      initialStartMonth={inputs.loanStartMonth}
                    />
                  </div>
                )}
              </div>
            )}

            {/* ========== STEP 4: OTHERS ========== */}
            {currentStep === 'terms' && (
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

                {/* Property Appreciation */}
                <div className="pt-4 border-t border-white/[0.04]">
                  <AppreciationEditor
                    periods={inputs.appreciationPeriods}
                    onPeriodsChange={(periods) => onChange('appreciationPeriods', periods)}
                  />
                </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Navigation Buttons */}
      <div className="flex items-center justify-between pt-4 border-t border-white/[0.04]">
        <button
          type="button"
          onClick={goToPrevStep}
          disabled={currentStepIndex === 0}
          className={cn(
            "px-4 py-2.5 rounded-xl text-sm font-medium transition-all flex items-center gap-2",
            currentStepIndex === 0
              ? "text-slate-700 cursor-not-allowed"
              : "text-slate-400 hover:text-white hover:bg-white/[0.05] border border-white/[0.06]"
          )}
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>
        {currentStepIndex < FORM_STEPS.length - 1 ? (
          <button
            type="button"
            onClick={goToNextStep}
            disabled={!isCurrentStepValid()}
            className={cn(
              "px-5 py-2.5 rounded-xl text-sm font-semibold transition-all flex items-center gap-2",
              isCurrentStepValid()
                ? "bg-white/[0.12] text-white hover:bg-white/[0.18] border border-white/[0.1]"
                : "bg-white/[0.04] text-slate-500 cursor-not-allowed border border-white/[0.04]"
            )}
          >
            Next: {getNextStepLabel()}
            <ChevronRight className="w-4 h-4" />
          </button>
        ) : (
          <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.06]">
            <CheckCircle2 className="w-4 h-4 text-white/70" />
            <span className="text-sm text-white/70">Ready to save</span>
          </div>
        )}
      </div>
    </div>
  )
}

// ============================================
// SALE PARAMETERS FORM
// ============================================

function SaleParametersForm({
  saleInputs,
  onSaleInputChange,
  saleResult,
  propertyPrice,
  propertyType,
}: {
  saleInputs: SaleInputs
  onSaleInputChange: (field: keyof SaleInputs, value: string | number | boolean | FeeItem[]) => void
  saleResult: SaleResult
  propertyPrice: number
  propertyType: PropertyType
}) {
  const [currentStep, setCurrentStep] = useState<SaleFormStep>('timing')
  const isHDB = propertyType.includes('hdb')
  const displaySalePrice = saleInputs.expectedSalePrice || Math.round(propertyPrice * 1.2)

  const currentStepIndex = SALE_FORM_STEPS.findIndex(s => s.id === currentStep)

  const hasWarnings = saleResult.ssd.applicable ||
    (saleResult.holdingPeriodMonths < 60 && (isHDB || propertyType === 'ec')) ||
    (saleResult.holdingPeriodMonths < 120 && propertyType === 'ec')

  return (
    <div className="space-y-4">
      {/* Progress Tabs */}
      <div className="flex items-center gap-1 p-1.5 bg-white/[0.02] border border-white/[0.08] rounded-xl">
        {SALE_FORM_STEPS.map((step, index) => {
          const isActive = step.id === currentStep
          const isPast = index < currentStepIndex
          return (
            <button
              key={step.id}
              type="button"
              onClick={() => setCurrentStep(step.id)}
              className={cn(
                "flex-1 flex items-center justify-center gap-1.5 py-2.5 px-2 rounded-lg text-xs font-medium transition-all duration-200",
                isActive
                  ? "bg-white/[0.12] text-white shadow-sm"
                  : isPast
                    ? "text-white/80 hover:bg-white/[0.05]"
                    : "text-slate-400 hover:text-slate-300 hover:bg-white/[0.03]"
              )}
            >
              <span className={cn(
                "w-5 h-5 rounded-full flex items-center justify-center text-xs font-semibold",
                isActive ? "bg-white/20 text-white" : isPast ? "bg-white/15 text-white" : "bg-white/[0.06] text-slate-400"
              )}>
                {isPast ? '✓' : index + 1}
              </span>
              <span className="hidden sm:inline">{step.label}</span>
            </button>
          )
        })}
      </div>

      {/* Step Content */}
      <div className="min-h-[250px]">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
          >
            {currentStep === 'timing' && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-slate-400 block">Expected Sale Date</label>
                    <MonthPicker
                      value={saleInputs.expectedSaleDate}
                      onChange={(value) => onSaleInputChange('expectedSaleDate', value)}
                      className="w-full"
                    />
                  </div>
                  <FormInput
                    label="Expected Sale Price"
                    prefix="$"
                    value={displaySalePrice.toLocaleString()}
                    onChange={(v) => onSaleInputChange('expectedSalePrice', Number(v.replace(/[^0-9]/g, '')) || 0)}
                  />
                </div>

                <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.06]">
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-slate-500">Holding Period</span>
                    <span className="text-sm text-white font-medium">
                      {saleResult.holdingPeriodYears.toFixed(1)} years ({saleResult.holdingPeriodMonths} months)
                    </span>
                  </div>
                </div>

                {hasWarnings && (
                  <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.06]">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-amber-500" />
                      <span className="text-xs text-slate-400">
                        {saleResult.ssd.applicable && `SSD applies (${saleResult.ssd.rate}%)`}
                        {saleResult.holdingPeriodMonths < 60 && isHDB && 'MOP not met'}
                        {saleResult.holdingPeriodMonths < 60 && propertyType === 'ec' && 'EC MOP not met'}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            )}

            {currentStep === 'fees' && (
              <div className="space-y-4">
                <FeeEditor
                  fees={saleInputs.fees}
                  onFeesChange={(fees) => onSaleInputChange('fees', fees)}
                  basePrice={displaySalePrice}
                  title="Sale Fees"
                  purchaseDate={saleInputs.expectedSaleDate}
                />

                {hasWarnings && (
                  <div className="space-y-3 pt-4 border-t border-white/[0.04]">
                    <span className="text-xs font-medium text-slate-500 block">Important Notices</span>

                    {saleResult.ssd.applicable && (
                      <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.06]">
                        <div className="flex items-center gap-2 text-slate-300 mb-1">
                          <div className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                          <span className="text-xs font-medium">Seller&apos;s Stamp Duty</span>
                        </div>
                        <p className="text-xs text-slate-500 pl-3.5">
                          {saleResult.ssd.rate}% SSD = {formatCurrency(saleResult.ssd.amount)}
                        </p>
                      </div>
                    )}

                    {saleResult.holdingPeriodMonths < 60 && isHDB && (
                      <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.06]">
                        <div className="flex items-center gap-2 text-slate-300 mb-1">
                          <div className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                          <span className="text-xs font-medium">MOP Not Met (HDB)</span>
                        </div>
                        <p className="text-xs text-slate-500 pl-3.5">
                          {60 - saleResult.holdingPeriodMonths} months remaining before you can sell.
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  )
}

// ============================================
// RESULTS PANEL
// ============================================

type ResultsTab = 'purchase' | 'sale' | 'appreciation'
type PurchaseDetailTab = 'breakdown' | 'chart'

function TabbedResultsPanel({
  calculation,
  propertyType,
  saleInputs,
  saleResult,
  propertyPrice,
  activeTab,
  absdRate,
  appreciationPeriods,
  onPeriodsChange,
  purchaseDate,
}: {
  calculation: ReturnType<typeof calculateMortgage>
  propertyType: PropertyType
  saleInputs: SaleInputs
  saleResult: SaleResult
  propertyPrice: number
  activeTab: ResultsTab
  absdRate: number
  appreciationPeriods: AppreciationPeriod[]
  onPeriodsChange: (periods: AppreciationPeriod[]) => void
  purchaseDate: string
}) {
  const [purchaseDetailTab, setPurchaseDetailTab] = useState<PurchaseDetailTab>('breakdown')
  const isHDB = propertyType.includes('hdb')
  const msrLimit = isHDB ? 0.30 : 0.55
  const tdsrLimit = 0.55
  const msrWithinLimit = calculation.msrRatio <= msrLimit
  const tdsrWithinLimit = calculation.tdsrRatio <= tdsrLimit
  const bothWithinLimit = msrWithinLimit && tdsrWithinLimit

  const displaySalePrice = saleInputs.expectedSalePrice || Math.round(propertyPrice * 1.2)

  return (
    <div className="space-y-4">
      <AnimatePresence mode="wait">
        {activeTab === 'purchase' ? (
          <motion.div
            key="purchase"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
            className="rounded-2xl border border-white/[0.06] bg-white/[0.02] backdrop-blur-xl overflow-hidden"
          >
            {/* Cash Needed Summary */}
            <div className="p-5 border-b border-white/[0.06]">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="text-xs font-medium text-slate-500 mb-0.5">Total Cash Needed</p>
                  <p className="text-2xl font-bold tracking-tight text-white">
                    {formatCurrency(calculation.totalUpfrontCash)}
                  </p>
                </div>
                <div className={cn(
                  "px-2.5 py-1 rounded-full text-xs font-semibold flex items-center gap-1",
                  bothWithinLimit
                    ? "bg-emerald-500/15 text-emerald-400"
                    : "bg-amber-500/15 text-amber-400"
                )}>
                  {bothWithinLimit ? (
                    <>
                      <CheckCircle2 className="w-3 h-3" />
                      Eligible
                    </>
                  ) : (
                    <>
                      <AlertTriangle className="w-3 h-3" />
                      Over Limit
                    </>
                  )}
                </div>
              </div>

              {/* Metrics Row */}
              <div className="grid grid-cols-4 gap-3">
                <div>
                  <p className="text-xs text-slate-500">CPF OA</p>
                  <p className="text-xs font-medium text-white">{formatCurrency(calculation.downpaymentBreakdown.cpfOa)}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Monthly</p>
                  <p className="text-xs font-medium text-white">{formatCurrency(calculation.monthlyPayment)}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">MSR</p>
                  <div className="flex items-center gap-1.5">
                    <div className="flex-1 h-1 rounded-full bg-white/[0.06] overflow-hidden">
                      <div
                        className={cn("h-full rounded-full", msrWithinLimit ? "bg-emerald-400" : "bg-amber-400")}
                        style={{ width: `${Math.min((calculation.msrRatio / msrLimit) * 100, 100)}%` }}
                      />
                    </div>
                    <span className={cn("text-xs font-medium", msrWithinLimit ? "text-emerald-400" : "text-amber-400")}>
                      {(calculation.msrRatio * 100).toFixed(0)}%
                    </span>
                  </div>
                </div>
                <div>
                  <p className="text-xs text-slate-500">TDSR</p>
                  <div className="flex items-center gap-1.5">
                    <div className="flex-1 h-1 rounded-full bg-white/[0.06] overflow-hidden">
                      <div
                        className={cn("h-full rounded-full", tdsrWithinLimit ? "bg-emerald-400" : "bg-amber-400")}
                        style={{ width: `${Math.min((calculation.tdsrRatio / tdsrLimit) * 100, 100)}%` }}
                      />
                    </div>
                    <span className={cn("text-xs font-medium", tdsrWithinLimit ? "text-emerald-400" : "text-amber-400")}>
                      {(calculation.tdsrRatio * 100).toFixed(0)}%
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Tab Header */}
            <div className="px-4 py-2 border-b border-white/[0.04] flex items-center gap-1">
              <button
                type="button"
                onClick={() => setPurchaseDetailTab('breakdown')}
                className={cn(
                  "px-3 py-1.5 rounded-md text-xs font-medium transition-all",
                  purchaseDetailTab === 'breakdown' ? "bg-white/[0.08] text-white" : "text-slate-500 hover:text-slate-300"
                )}
              >
                Breakdown
              </button>
              <button
                type="button"
                onClick={() => setPurchaseDetailTab('chart')}
                className={cn(
                  "px-3 py-1.5 rounded-md text-xs font-medium transition-all",
                  purchaseDetailTab === 'chart' ? "bg-white/[0.08] text-white" : "text-slate-500 hover:text-slate-300"
                )}
              >
                Amortization
              </button>
            </div>

            {/* Tab Content */}
            <AnimatePresence mode="wait">
              {purchaseDetailTab === 'breakdown' ? (
                <motion.div
                  key="breakdown"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.1 }}
                  className="p-4"
                >
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <p className="text-xs font-medium text-slate-500 mb-2">Upfront Costs</p>
                      <div className="flex justify-between text-xs">
                        <span className="text-slate-400">CPF OA</span>
                        <span className="text-white">{formatCurrency(calculation.downpaymentBreakdown.cpfOa)}</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-slate-400">Cash</span>
                        <span className="text-white">{formatCurrency(calculation.downpaymentBreakdown.cash)}</span>
                      </div>
                      {calculation.cov > 0 && (
                        <div className="flex justify-between text-xs">
                          <span className="text-slate-400">COV</span>
                          <span className="text-slate-300">{formatCurrency(calculation.cov)}</span>
                        </div>
                      )}
                      <div className="flex justify-between text-xs">
                        <span className="text-slate-400">BSD</span>
                        <span className="text-slate-300">{formatCurrency(calculation.bsdAmount)}</span>
                      </div>
                      {calculation.absdAmount > 0 && (
                        <div className="flex justify-between text-xs">
                          <span className="text-slate-400">ABSD ({absdRate}%)</span>
                          <span className="text-slate-300">{formatCurrency(calculation.absdAmount)}</span>
                        </div>
                      )}
                      {calculation.calculatedPurchaseFees.map(({ item, amount }) => (
                        <div key={item.id} className="flex justify-between text-xs">
                          <span className="text-slate-400">{item.name}</span>
                          <span className="text-slate-300">{formatCurrency(amount)}</span>
                        </div>
                      ))}
                    </div>

                    <div className="space-y-1.5">
                      <p className="text-xs font-medium text-slate-500 mb-2">Loan Details</p>
                      <div className="flex justify-between text-xs">
                        <span className="text-slate-400">Amount</span>
                        <span className="text-white">{formatCurrency(propertyPrice - calculation.downpayment)}</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-slate-400">Tenure</span>
                        <span className="text-slate-300">{calculation.loanTermYears} yrs</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-slate-400">Period</span>
                        <span className="text-slate-300">
                          {formatMonthYear(calculation.loanStartDate)} - {formatMonthYear(calculation.loanEndDate)}
                        </span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-slate-400">Interest</span>
                        <span className="text-slate-300">{formatCurrency(calculation.totalInterest)}</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-slate-400">Total</span>
                        <span className="text-slate-300">{formatCurrency(calculation.monthlyPayment * calculation.loanTermYears * 12)}</span>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  key="chart"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.1 }}
                  className="p-4"
                >
                  <AmortizationChart amortization={calculation.amortization} />
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        ) : activeTab === 'sale' ? (
          <motion.div
            key="sale"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ duration: 0.2 }}
            className="rounded-2xl border border-white/[0.06] bg-white/[0.02] backdrop-blur-xl overflow-hidden"
          >
            <div className="p-5 border-b border-white/[0.06]">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="text-xs font-medium text-slate-500 mb-0.5">Net Cash Proceeds</p>
                  <p className="text-2xl font-bold tracking-tight text-white">
                    {formatCurrency(saleResult.netCashProceeds)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs font-medium text-slate-500 mb-0.5">CPF Refund</p>
                  <p className="text-lg font-semibold text-white">
                    {formatCurrency(saleResult.cpfRefundedToOa)}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <p className="text-xs text-slate-500">Holding</p>
                  <p className="text-xs font-medium text-white">{saleResult.holdingPeriodYears.toFixed(1)} yrs</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Outstanding</p>
                  <p className="text-xs font-medium text-slate-300">{formatCurrency(saleResult.outstandingLoanAtSale)}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Sale Price</p>
                  <p className="text-xs font-medium text-white">{formatCurrency(displaySalePrice)}</p>
                </div>
              </div>
            </div>

            <div className="p-4 space-y-3">
              <p className="text-xs font-medium text-slate-500">Proceeds Breakdown</p>

              <div className="space-y-1.5">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-400">Sale Price</span>
                  <span className="text-white">{formatCurrency(displaySalePrice)}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-slate-400">Outstanding Loan</span>
                  <span className="text-slate-300">-{formatCurrency(saleResult.outstandingLoanAtSale)}</span>
                </div>
                <div className="flex justify-between text-xs pt-1 border-t border-white/[0.04]">
                  <span className="text-slate-300">Gross Proceeds</span>
                  <span className="text-white">{formatCurrency(saleResult.grossProceeds)}</span>
                </div>
              </div>

              <div className="space-y-1.5 pt-2">
                <p className="text-xs text-slate-500">Deductions</p>
                <div className="flex justify-between text-xs">
                  <span className="text-slate-400">CPF Principal</span>
                  <span className="text-slate-300">-{formatCurrency(saleResult.cpfRefund.principalUsed)}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-slate-500">+ Accrued Interest</span>
                  <span className="text-slate-400">-{formatCurrency(saleResult.cpfRefund.accruedInterest)}</span>
                </div>
                {saleResult.ssd.applicable && (
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-400">SSD ({saleResult.ssd.rate}%)</span>
                    <span className="text-slate-300">-{formatCurrency(saleResult.ssd.amount)}</span>
                  </div>
                )}
                {saleResult.calculatedFees.filter(f => f.amount > 0).map(({ item, amount }) => (
                  <div key={item.id} className="flex justify-between text-xs">
                    <span className="text-slate-400">{item.name}</span>
                    <span className="text-slate-300">-{formatCurrency(amount)}</span>
                  </div>
                ))}
              </div>

              <div className="pt-2 border-t border-white/[0.06] space-y-1">
                <div className="flex justify-between items-center">
                  <span className="text-xs text-slate-400">Net Cash</span>
                  <span className="text-sm font-semibold text-white">{formatCurrency(saleResult.netCashProceeds)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-slate-400">CPF Refund</span>
                  <span className="text-sm font-semibold text-white">{formatCurrency(saleResult.cpfRefundedToOa)}</span>
                </div>
              </div>
            </div>
          </motion.div>
        ) : activeTab === 'appreciation' ? (
          <motion.div
            key="appreciation"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ duration: 0.2 }}
          >
            <PropertyAppreciationPanel
              propertyPrice={propertyPrice}
              purchaseDate={purchaseDate}
              saleDate={saleInputs.expectedSaleDate}
              appreciationPeriods={appreciationPeriods}
              onPeriodsChange={onPeriodsChange}
            />
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  )
}

// ============================================
// MAIN PAGE COMPONENT
// ============================================

function getDefaultSaleInputs(loanStartMonth: string, propertyPrice: number): SaleInputs {
  const startDate = new Date(loanStartMonth + '-01')
  startDate.setFullYear(startDate.getFullYear() + 10)
  return {
    expectedSaleDate: startDate.toISOString().slice(0, 7),
    expectedSalePrice: Math.round(propertyPrice * 1.3),
    fees: DEFAULT_SALE_FEES.map(f => ({ ...f })),
  }
}

export function PropertyPlannerV2View({ onClose }: { onClose?: () => void }) {
  const [scenarios, setScenarios] = useState<PropertyScenario[]>([])
  const [editingScenarioId, setEditingScenarioId] = useState<string | null>(null)

  const [isCreatingNew, setIsCreatingNew] = useState(false)
  const [newRowName, setNewRowName] = useState('')
  const [newRowType, setNewRowType] = useState<PropertyType>('hdb-resale')
  const [newRowPrice, setNewRowPrice] = useState('')
  const [newRowIcon, setNewRowIcon] = useState('home')
  const [newRowIconColor, setNewRowIconColor] = useState('#6366f1')
  const [newRowIconSearch, setNewRowIconSearch] = useState('')

  const [selectedType, setSelectedType] = useState<PropertyType | null>(null)
  const [inputs, setInputs] = useState<MortgageInputs>(defaultInputsByType['hdb-resale'])
  const [saleInputs, setSaleInputs] = useState<SaleInputs>(() =>
    getDefaultSaleInputs(defaultInputsByType['hdb-resale'].loanStartMonth, defaultInputsByType['hdb-resale'].propertyPrice)
  )
  const [activeResultsTab, setActiveResultsTab] = useState<ResultsTab>('purchase')
  const [editingScenarioName, setEditingScenarioName] = useState('')

  const editingScenario = editingScenarioId ? scenarios.find(s => s.id === editingScenarioId) : null

  const handleStartNewRow = useCallback(() => {
    const defaultType: PropertyType = 'hdb-resale'
    const defaults = defaultInputsByType[defaultType]
    setNewRowName(`Property ${scenarios.length + 1}`)
    setNewRowType(defaultType)
    setNewRowPrice(defaults.propertyPrice.toString())
    setNewRowIcon('home')
    setNewRowIconColor('#6366f1')
    setNewRowIconSearch('')
    setIsCreatingNew(true)
  }, [scenarios.length])

  const handleConfirmNewRow = useCallback(() => {
    const price = parseInt(newRowPrice.replace(/[^0-9]/g, '')) || defaultInputsByType[newRowType].propertyPrice
    const defaults = defaultInputsByType[newRowType]
    const originalLtv = defaults.loanAmount / defaults.propertyPrice
    const newLoanAmount = Math.floor(price * originalLtv)

    const newScenario: PropertyScenario = {
      id: `scenario-${Date.now()}`,
      name: newRowName || `Property ${scenarios.length + 1}`,
      propertyType: newRowType,
      inputs: { ...defaults, propertyPrice: price, valuationPrice: price, loanAmount: newLoanAmount },
      saleInputs: getDefaultSaleInputs(defaults.loanStartMonth, price),
      isIncluded: true,
      createdAt: Date.now(),
      icon: newRowIcon,
      iconColor: newRowIconColor,
    }
    setScenarios(prev => [...prev, newScenario])
    setIsCreatingNew(false)
    setNewRowName('')
    setNewRowPrice('')
  }, [newRowName, newRowType, newRowPrice, newRowIcon, newRowIconColor, scenarios.length])

  const handleCancelNewRow = useCallback(() => {
    setIsCreatingNew(false)
    setNewRowName('')
    setNewRowPrice('')
  }, [])

  const handleEditScenario = useCallback((scenario: PropertyScenario) => {
    setEditingScenarioId(scenario.id)
    setEditingScenarioName(scenario.name)
    setSelectedType(scenario.propertyType)
    setInputs(scenario.inputs)
    setSaleInputs(scenario.saleInputs)
  }, [])

  const handleSaveAndClose = useCallback(() => {
    if (editingScenarioId) {
      setScenarios(prev => prev.map(s =>
        s.id === editingScenarioId ? { ...s, name: editingScenarioName, inputs, saleInputs, propertyType: selectedType! } : s
      ))
    }
    setEditingScenarioId(null)
    setEditingScenarioName('')
    setSelectedType(null)
  }, [editingScenarioId, editingScenarioName, inputs, saleInputs, selectedType])

  const handleDeleteScenario = useCallback((id: string) => {
    setScenarios(prev => prev.filter(s => s.id !== id))
  }, [])

  const handleToggleInclude = useCallback((id: string) => {
    setScenarios(prev => prev.map(s => s.id === id ? { ...s, isIncluded: !s.isIncluded } : s))
  }, [])

  useEffect(() => {
    if (editingScenarioId && selectedType) {
      setScenarios(prev => prev.map(s =>
        s.id === editingScenarioId ? { ...s, name: editingScenarioName, inputs, saleInputs, propertyType: selectedType } : s
      ))
    }
  }, [editingScenarioId, editingScenarioName, inputs, saleInputs, selectedType])

  const handleInputChange = useCallback((field: keyof MortgageInputs, value: number | string | string[] | FeeItem[] | AppreciationPeriod[] | LoanSegment[] | StaggeredDownpayment | null) => {
    setInputs(prev => ({ ...prev, [field]: value }))
  }, [])

  const handleSaleInputChange = useCallback((field: keyof SaleInputs, value: string | number | boolean | FeeItem[]) => {
    setSaleInputs(prev => ({ ...prev, [field]: value }))
  }, [])

  const selectedOption = selectedType ? propertyOptions.find(o => o.id === selectedType) : null
  const calculation = useMemo(() => calculateMortgage(inputs), [inputs])
  const saleResult = useMemo(() =>
    calculateSaleProceeds(saleInputs, inputs, calculation.amortization, calculation.monthlyPayment),
    [saleInputs, inputs, calculation.amortization, calculation.monthlyPayment]
  )

  const isEmbedded = !!onClose

  return (
    <div className={cn("flex flex-col", isEmbedded ? "h-full" : "min-h-screen bg-gray-950")}>
      {!isEmbedded && (
        <>
          <div className="fixed inset-0 bg-gradient-to-br from-gray-950 via-gray-950 to-gray-900" />
          <div className="fixed inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(59,130,246,0.08),transparent)]" />
        </>
      )}

      {isEmbedded && (
        <div className="flex items-center justify-between px-6 py-4 shrink-0">
          <h2 className="text-lg font-semibold text-white">Property Scenarios</h2>
          <button
            onClick={onClose}
            className="flex items-center justify-center h-8 w-8 rounded-lg hover:bg-white/5 text-slate-400 hover:text-white transition"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      <div className={cn("relative", isEmbedded ? "flex-1 overflow-y-auto" : "z-10")}>
        <AnimatePresence mode="wait">
          {!selectedType ? (
            <motion.div
              key="selection"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, y: -20 }}
              className={cn("mx-auto px-6", isEmbedded ? "max-w-5xl py-8" : "max-w-6xl py-16")}
            >
              {!isEmbedded && (
                <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.05 }} className="mb-12">
                  <Link href="/dashboard" className="inline-flex items-center gap-2 text-slate-500 hover:text-slate-300 transition-colors text-sm font-medium">
                    <ArrowLeft className="w-4 h-4" />
                    Back to Dashboard
                  </Link>
                </motion.div>
              )}

              {!isEmbedded && (
                <div className="mb-8">
                  <motion.h1 className="text-3xl md:text-4xl font-semibold text-white mb-2 tracking-tight" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
                    Property Scenarios
                  </motion.h1>
                  <motion.p className="text-sm text-slate-500" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
                    Create and compare different property purchase scenarios
                  </motion.p>
                </div>
              )}

              <motion.div className="space-y-2" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
                {scenarios.map((scenario, index) => {
                  const option = propertyOptions.find(o => o.id === scenario.propertyType)
                  return (
                    <motion.div
                      key={scenario.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.05 * index }}
                      className={cn(
                        "group flex items-center gap-4 p-4 rounded-xl border transition-all cursor-pointer",
                        scenario.isIncluded ? "bg-white/[0.03] border-white/[0.08] hover:bg-white/[0.05]" : "bg-white/[0.01] border-white/[0.04] opacity-60 hover:opacity-80"
                      )}
                      onClick={() => handleEditScenario(scenario)}
                    >
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); handleToggleInclude(scenario.id) }}
                        className={cn(
                          "w-5 h-5 rounded border-2 flex items-center justify-center transition-colors shrink-0",
                          scenario.isIncluded ? "bg-emerald-500 border-emerald-500" : "bg-transparent border-slate-600 hover:border-slate-500"
                        )}
                      >
                        {scenario.isIncluded && <Check className="w-3 h-3 text-white" />}
                      </button>

                      {scenario.icon ? (
                        <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: scenario.iconColor || '#6366f1' }}>
                          <LucideIcon name={scenario.icon} className="w-5 h-5 text-white" />
                        </div>
                      ) : (
                        <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center shrink-0 bg-gradient-to-br", option?.color || 'from-slate-500/20 to-slate-600/5')}>
                          <span className={option?.accentColor || 'text-slate-400'}>{option?.icon || <Home className="w-5 h-5" />}</span>
                        </div>
                      )}

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="text-sm font-medium text-white truncate">{scenario.name}</span>
                          <span className={cn("text-xs px-2 py-0.5 rounded-md", option?.accentColor || 'text-slate-400', "bg-white/[0.04]")}>{option?.title}</span>
                        </div>
                        <div className="text-xs text-slate-500">
                          {formatCurrency(scenario.inputs.propertyPrice)} · {scenario.inputs.loanTermYears}yr loan
                        </div>
                      </div>

                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button type="button" onClick={(e) => { e.stopPropagation(); handleEditScenario(scenario) }} className="p-2 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-colors">
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button type="button" onClick={(e) => { e.stopPropagation(); handleDeleteScenario(scenario.id) }} className="p-2 rounded-lg hover:bg-red-500/20 text-slate-400 hover:text-red-400 transition-colors">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </motion.div>
                  )
                })}

                <AnimatePresence>
                  {isCreatingNew && (
                    <motion.div
                      initial={{ opacity: 0, height: 0, overflow: 'hidden' }}
                      animate={{ opacity: 1, height: 'auto', overflow: 'visible' }}
                      exit={{ opacity: 0, height: 0, overflow: 'hidden' }}
                      transition={{ overflow: { delay: 0.15 } }}
                    >
                      <div className="flex items-center gap-3 p-4 rounded-xl border border-emerald-500/30 bg-emerald-500/5">
                        <IconPicker
                          iconName={newRowIcon}
                          iconColor={newRowIconColor}
                          searchQuery={newRowIconSearch}
                          onIconChange={setNewRowIcon}
                          onColorChange={setNewRowIconColor}
                          onSearchChange={setNewRowIconSearch}
                        />
                        <Input
                          type="text"
                          value={newRowName}
                          onChange={(e) => setNewRowName(e.target.value)}
                          placeholder="Scenario name"
                          className="w-40 rounded-lg bg-white/[0.05] border-white/[0.1] text-white text-sm py-2 px-3 focus:border-emerald-500/50 placeholder:text-slate-500"
                          autoFocus
                        />
                        <CustomSelect
                          value={newRowType}
                          onChange={(value) => {
                            const type = value as PropertyType
                            setNewRowType(type)
                            setNewRowPrice(defaultInputsByType[type].propertyPrice.toString())
                          }}
                          options={propertyOptions.map(option => ({ value: option.id, label: option.title }))}
                          className="w-44"
                        />
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm">$</span>
                          <Input
                            type="text"
                            value={newRowPrice}
                            onChange={(e) => setNewRowPrice(e.target.value.replace(/[^0-9]/g, ''))}
                            placeholder="Price"
                            className="w-32 rounded-lg bg-white/[0.05] border-white/[0.1] text-white text-sm py-2 pl-7 pr-3 focus:border-emerald-500/50 placeholder:text-slate-500"
                          />
                        </div>
                        <div className="flex items-center gap-1 ml-auto">
                          <button type="button" onClick={handleConfirmNewRow} className="p-2 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 transition-colors">
                            <Check className="w-4 h-4" />
                          </button>
                          <button type="button" onClick={handleCancelNewRow} className="p-2 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-colors">
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {!isCreatingNew && (
                  <motion.button
                    type="button"
                    onClick={handleStartNewRow}
                    className="w-full flex items-center justify-center gap-2 p-4 rounded-xl border border-dashed border-white/[0.08] text-slate-500 hover:text-slate-300 hover:border-white/[0.15] hover:bg-white/[0.02] transition-all"
                    whileHover={{ scale: 1.005 }}
                    whileTap={{ scale: 0.995 }}
                  >
                    <Plus className="w-4 h-4" />
                    <span className="text-sm font-medium">Add Property Scenario</span>
                  </motion.button>
                )}
              </motion.div>
            </motion.div>
          ) : (
            <motion.div
              key="detail"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className={cn("mx-auto px-6 py-8", isEmbedded ? "max-w-6xl" : "max-w-7xl")}
            >
              <div className="mb-8">
                {!isEmbedded && (
                  <div className="flex items-center gap-2 text-sm mb-6">
                    <Link href="/dashboard" className="text-slate-500 hover:text-slate-300 transition-colors font-medium">Dashboard</Link>
                    <span className="text-slate-700">/</span>
                    <button type="button" onClick={handleSaveAndClose} className="text-slate-500 hover:text-slate-300 transition-colors font-medium">Property Scenarios</button>
                    <span className="text-slate-700">/</span>
                    <span className="text-slate-300 font-medium">{editingScenario?.name || selectedOption?.title}</span>
                  </div>
                )}

                <div className="flex items-center gap-4">
                  <button type="button" onClick={handleSaveAndClose} className="p-2 rounded-xl bg-white/[0.03] border border-white/[0.06] text-slate-400 hover:text-white hover:bg-white/[0.06] transition-all">
                    <ArrowLeft className="w-5 h-5" />
                  </button>
                  <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center bg-gradient-to-br shadow-lg", selectedOption?.color)}>
                    <span className={selectedOption?.accentColor}>{selectedOption?.icon}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <input
                      type="text"
                      value={editingScenarioName}
                      onChange={(e) => setEditingScenarioName(e.target.value)}
                      className="w-full text-2xl font-semibold text-white tracking-tight bg-transparent border-none outline-none focus:ring-0 placeholder:text-slate-600 hover:bg-white/[0.03] focus:bg-white/[0.05] rounded-lg px-2 py-1 -ml-2 transition-colors"
                      placeholder="Scenario name"
                    />
                    <p className="text-sm text-slate-500 px-2">{selectedOption?.title} · {selectedOption?.priceRange}</p>
                  </div>
                </div>
              </div>

              <div className="flex items-center mb-6">
                <div className="inline-flex items-center gap-1 p-1 bg-white/[0.03] border border-white/[0.06] rounded-lg">
                  <button
                    type="button"
                    onClick={() => setActiveResultsTab('purchase')}
                    className={cn(
                      "px-4 py-1.5 rounded-md text-sm font-medium transition-all duration-200 flex items-center gap-2",
                      activeResultsTab === 'purchase' ? "bg-white/10 text-white" : "text-slate-500 hover:text-slate-300"
                    )}
                  >
                    <Home className="w-3.5 h-3.5" />
                    Purchase
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveResultsTab('sale')}
                    className={cn(
                      "px-4 py-1.5 rounded-md text-sm font-medium transition-all duration-200 flex items-center gap-2",
                      activeResultsTab === 'sale' ? "bg-white/10 text-white" : "text-slate-500 hover:text-slate-300"
                    )}
                  >
                    <Banknote className="w-3.5 h-3.5" />
                    Sale
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveResultsTab('appreciation')}
                    className={cn(
                      "px-4 py-1.5 rounded-md text-sm font-medium transition-all duration-200 flex items-center gap-2",
                      activeResultsTab === 'appreciation' ? "bg-white/10 text-white" : "text-slate-500 hover:text-slate-300"
                    )}
                  >
                    <TrendingUp className="w-3.5 h-3.5" />
                    Projection
                  </button>
                </div>
              </div>

              <div className={cn(
                "grid gap-6",
                activeResultsTab === 'appreciation' ? "grid-cols-1" : "grid-cols-1 lg:grid-cols-2"
              )}>
                {activeResultsTab !== 'appreciation' && (
                  <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] backdrop-blur-xl p-6">
                    <AnimatePresence mode="wait">
                      {activeResultsTab === 'purchase' ? (
                        <motion.div key="mortgage-form" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }} transition={{ duration: 0.2 }}>
                          <MortgageForm inputs={inputs} onChange={handleInputChange} propertyType={selectedType} />
                        </motion.div>
                      ) : activeResultsTab === 'sale' ? (
                        <motion.div key="sale-form" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }} transition={{ duration: 0.2 }}>
                          <SaleParametersForm saleInputs={saleInputs} onSaleInputChange={handleSaleInputChange} saleResult={saleResult} propertyPrice={inputs.propertyPrice} propertyType={selectedType} />
                        </motion.div>
                      ) : null}
                    </AnimatePresence>
                  </div>
                )}

                <TabbedResultsPanel
                  calculation={calculation}
                  propertyType={selectedType}
                  saleInputs={saleInputs}
                  saleResult={saleResult}
                  propertyPrice={inputs.propertyPrice}
                  activeTab={activeResultsTab}
                  absdRate={inputs.absdRate}
                  appreciationPeriods={inputs.appreciationPeriods}
                  onPeriodsChange={(periods) => handleInputChange('appreciationPeriods', periods)}
                  purchaseDate={inputs.loanStartMonth}
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}

export default function PropertyPlannerPage() {
  return <PropertyPlannerV2View />
}

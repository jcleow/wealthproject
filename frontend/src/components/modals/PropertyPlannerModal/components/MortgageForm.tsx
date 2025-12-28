"use client"

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'
import { Input } from '@/components/ui/input'
import { MonthPicker } from '@/components/ui/MonthPicker'
import { CustomSelect } from '@/components/ui/CustomSelect'
import { Building2, ChevronRight } from 'lucide-react'

import type {
  PropertyType,
  MortgageInputs,
  FeeItem,
  AppreciationPeriod,
  LoanSegment,
  FormStep,
  StaggeredDownpayment,
} from '@/app/property-planner/types'

import {
  FormInput,
  FeeEditor,
  InfoTooltip,
  AppreciationEditor,
} from '@/app/property-planner/components'

import {
  calculateMonthlyOaInflow,
  formatCurrency,
} from '@/app/property-planner/hooks'

import {
  FORM_STEPS,
  mockIncomes,
  createDefaultStaggeredDownpayment,
} from '@/app/property-planner/hooks/constants'

interface MortgageFormProps {
  inputs: MortgageInputs
  onChange: (field: keyof MortgageInputs, value: number | string | string[] | FeeItem[] | AppreciationPeriod[] | LoanSegment[] | StaggeredDownpayment | null) => void
  propertyType: PropertyType
}

export function MortgageForm({ inputs, onChange, propertyType }: MortgageFormProps) {
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
                exceedsHdbIncomeCeiling={exceedsHdbIncomeCeiling}
                exceedsEcIncomeCeiling={exceedsEcIncomeCeiling}
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
  return (
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
            <div className="rounded-xl bg-white/[0.02] border border-white/[0.06] py-2.5 px-3">
              <span className="text-white text-sm font-mono tabular-nums">${downpaymentOnValuation.toLocaleString()}</span>
              <span className="text-slate-500 text-xs ml-2">(25% total)</span>
            </div>
          ) : (
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

function StaggeredDownpaymentSection({
  inputs,
  onChange,
}: {
  inputs: MortgageInputs
  onChange: MortgageFormProps['onChange']
}) {
  return (
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

          <div className="space-y-3">
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
                      onChange('loanStartMonth', value)
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

          <div className="mt-3 pt-3 border-t border-white/[0.06] flex items-center justify-between">
            <span className="text-xs text-slate-500">Total Downpayment (25%)</span>
            <span className="text-xs font-medium text-white">
              ${Math.round(inputs.propertyPrice * 0.25).toLocaleString()}
            </span>
          </div>
        </>
      )}
    </div>
  )
}

function BorrowersStep({
  inputs,
  onChange,
  exceedsHdbIncomeCeiling,
  exceedsEcIncomeCeiling,
}: {
  inputs: MortgageInputs
  onChange: MortgageFormProps['onChange']
  exceedsHdbIncomeCeiling: boolean
  exceedsEcIncomeCeiling: boolean
}) {
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

      {/* Property Appreciation */}
      <div className="pt-4 border-t border-white/[0.04]">
        <AppreciationEditor
          periods={inputs.appreciationPeriods}
          onPeriodsChange={(periods) => onChange('appreciationPeriods', periods)}
        />
      </div>
    </div>
  )
}

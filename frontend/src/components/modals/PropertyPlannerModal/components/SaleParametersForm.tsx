"use client"

import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'
import { Landmark, Wallet } from 'lucide-react'
import { MonthPicker } from '@/components/ui/MonthPicker'
import { IconPicker } from '@/components/modals/ScenarioEventModal/components/IconPicker'
import { CustomDropdown } from '@/components/modals/ScenarioEventModal/components/CustomDropdown'
import { InfoTooltip } from '@/app/property-planner/components/InfoTooltip'

import type {
  SaleResult,
  SaleFormStep,
} from '@/app/property-planner/types'
import type { ProjectedCpfAccount } from './MortgageForm/types'
import type { CashAccount } from '@/types/financial'

import {
  FormInput,
  FeeEditor,
} from '@/app/property-planner/components'

import { formatCurrency } from '@/app/property-planner/hooks'
import { SALE_FORM_STEPS } from '@/app/property-planner/hooks/constants'
import { usePropertyFormInputs, usePropertyFormSaleInputs } from '../hooks'

interface SaleParametersFormProps {
  saleResult: SaleResult
  /** CPF accounts for refund destination selection */
  cpfAccounts: ProjectedCpfAccount[]
  /** Cash accounts for proceeds destination selection */
  cashAccounts: CashAccount[]
  /** Sale milestone icon name */
  saleIcon?: string
  /** Sale milestone icon color */
  saleIconColor?: string
  /** Sale milestone icon search query */
  saleIconSearch?: string
  /** Callback to update sale icon */
  onSaleIconChange?: (icon: string) => void
  /** Callback to update sale icon color */
  onSaleIconColorChange?: (color: string) => void
  /** Callback to update sale icon search query */
  onSaleIconSearchChange?: (search: string) => void
}

/**
 * Sale parameters form - handles sale date, price, fees, and proceeds distribution.
 * Uses form context for inputs - no prop drilling needed.
 */
export function SaleParametersForm({
  saleResult,
  cpfAccounts,
  cashAccounts,
  saleIcon = 'banknote',
  saleIconColor = '#10b981',
  saleIconSearch = '',
  onSaleIconChange,
  onSaleIconColorChange,
  onSaleIconSearchChange,
}: SaleParametersFormProps) {
  const { inputs, propertyType } = usePropertyFormInputs()
  const { saleInputs, onSaleInputChange } = usePropertyFormSaleInputs()

  const [currentStep, setCurrentStep] = useState<SaleFormStep>('timing')
  const propertyPrice = inputs.propertyPrice
  const borrowerType = inputs.borrowerType
  const isHDB = propertyType?.includes('hdb') ?? false
  const displaySalePrice = saleInputs.expectedSalePrice || Math.round(propertyPrice * 1.2)

  const currentStepIndex = SALE_FORM_STEPS.findIndex(s => s.id === currentStep)

  const hasWarnings = saleResult.ssd.applicable ||
    (saleResult.holdingPeriodMonths < 60 && (isHDB || propertyType === 'ec')) ||
    (saleResult.holdingPeriodMonths < 120 && propertyType === 'ec')

  // Build dropdown options for CPF accounts
  const cpfAccountOptions = useMemo(() => {
    return [
      { value: '', label: 'Select CPF account...' },
      ...cpfAccounts.map(acc => ({
        value: acc.id,
        label: acc.personName || 'CPF Account',
        icon: <Landmark className="h-4 w-4 text-blue-400" />,
      }))
    ]
  }, [cpfAccounts])

  // Build dropdown options for cash accounts
  const cashAccountOptions = useMemo(() => {
    return [
      { value: '', label: 'Select cash account...' },
      ...cashAccounts.map(acc => ({
        value: acc.id,
        label: acc.name,
        icon: <Wallet className="h-4 w-4 text-emerald-400" />,
      }))
    ]
  }, [cashAccounts])

  const { perBorrowerCpfRefund } = saleResult

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
                <div className="flex items-end gap-3">
                  {/* Sale milestone icon */}
                  {onSaleIconChange && onSaleIconColorChange && onSaleIconSearchChange && (
                    <div className="flex-shrink-0">
                      <IconPicker
                        iconName={saleIcon}
                        iconColor={saleIconColor}
                        searchQuery={saleIconSearch}
                        onIconChange={onSaleIconChange}
                        onColorChange={onSaleIconColorChange}
                        onSearchChange={onSaleIconSearchChange}
                      />
                    </div>
                  )}
                  <div className="flex-1 space-y-1.5">
                    <label className="text-xs font-medium text-slate-400 block">Expected Sale Date</label>
                    <MonthPicker
                      value={saleInputs.expectedSaleDate}
                      onChange={(value) => onSaleInputChange('expectedSaleDate', value)}
                      className="w-full"
                    />
                  </div>
                  <div className="flex-1">
                    <FormInput
                      label="Expected Sale Price"
                      prefix="$"
                      value={displaySalePrice.toLocaleString()}
                      onChange={(v) => onSaleInputChange('expectedSalePrice', Number(v.replace(/[^0-9]/g, '')) || 0)}
                    />
                  </div>
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

            {currentStep === 'proceeds' && (
              <div className="space-y-4">
                {/* CPF Refund Destination Section */}
                <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.06] space-y-3">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-medium text-slate-400 uppercase tracking-wide">
                      CPF Refund Destinations
                    </span>
                    <InfoTooltip
                      title="CPF Refund"
                      description="When you sell a property, the CPF used (principal + 2.5% accrued interest) must be refunded to your CPF OA account."
                    />
                  </div>

                  {/* Borrower 1 CPF Refund */}
                  <div className="flex items-center gap-3">
                    <div className="w-6 h-6 rounded-full bg-blue-500/20 flex items-center justify-center shrink-0">
                      <Landmark className="h-3.5 w-3.5 text-blue-400" />
                    </div>
                    <span className="text-xs text-slate-300 w-24 shrink-0">
                      {borrowerType === 'joint' ? 'Borrower 1' : 'CPF OA'}
                    </span>
                    <div className="flex-1 min-w-0">
                      <CustomDropdown
                        value={saleInputs.borrower1CpfRefundAccountId ?? ''}
                        onChange={(value) => onSaleInputChange('borrower1CpfRefundAccountId', value || null)}
                        options={cpfAccountOptions}
                        minWidth="100%"
                        className="[&_button]:py-1.5 [&_button]:text-xs"
                      />
                    </div>
                    <div className="w-24 text-right shrink-0">
                      <span className="text-xs font-mono tabular-nums text-white">
                        {formatCurrency(perBorrowerCpfRefund.borrower1?.total ?? 0)}
                      </span>
                    </div>
                  </div>

                  {/* Borrower 2 CPF Refund (joint only) */}
                  {borrowerType === 'joint' && perBorrowerCpfRefund.borrower2 && (
                    <div className="flex items-center gap-3">
                      <div className="w-6 h-6 rounded-full bg-blue-500/20 flex items-center justify-center shrink-0">
                        <Landmark className="h-3.5 w-3.5 text-blue-400" />
                      </div>
                      <span className="text-xs text-slate-300 w-24 shrink-0">Borrower 2</span>
                      <div className="flex-1 min-w-0">
                        <CustomDropdown
                          value={saleInputs.borrower2CpfRefundAccountId ?? ''}
                          onChange={(value) => onSaleInputChange('borrower2CpfRefundAccountId', value || null)}
                          options={cpfAccountOptions}
                          minWidth="100%"
                          className="[&_button]:py-1.5 [&_button]:text-xs"
                        />
                      </div>
                      <div className="w-24 text-right shrink-0">
                        <span className="text-xs font-mono tabular-nums text-white">
                          {formatCurrency(perBorrowerCpfRefund.borrower2.total)}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* CPF Refund Total */}
                  <div className="pt-2 border-t border-white/[0.04] flex items-center justify-between">
                    <span className="text-xs text-slate-500">Total CPF Refund</span>
                    <span className="text-xs font-medium text-blue-400 font-mono tabular-nums">
                      {formatCurrency(saleResult.cpfRefundedToOa)}
                    </span>
                  </div>
                </div>

                {/* Net Cash Proceeds Destination */}
                <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.06] space-y-3">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-medium text-slate-400 uppercase tracking-wide">
                      Net Cash Proceeds
                    </span>
                    <InfoTooltip
                      title="Net Cash Proceeds"
                      description="The remaining cash after paying off the mortgage, CPF refund, stamp duties, and sale fees."
                    />
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="w-6 h-6 rounded-full bg-emerald-500/20 flex items-center justify-center shrink-0">
                      <Wallet className="h-3.5 w-3.5 text-emerald-400" />
                    </div>
                    <span className="text-xs text-slate-300 w-24 shrink-0">Destination</span>
                    <div className="flex-1 min-w-0">
                      <CustomDropdown
                        value={saleInputs.netCashProceedsAccountId ?? ''}
                        onChange={(value) => onSaleInputChange('netCashProceedsAccountId', value || null)}
                        options={cashAccountOptions}
                        minWidth="100%"
                        className="[&_button]:py-1.5 [&_button]:text-xs"
                      />
                    </div>
                    <div className="w-24 text-right shrink-0">
                      <span className={cn(
                        "text-xs font-mono tabular-nums",
                        saleResult.netCashProceeds >= 0 ? "text-emerald-400" : "text-rose-400"
                      )}>
                        {saleResult.netCashProceeds >= 0
                          ? formatCurrency(saleResult.netCashProceeds)
                          : `(${formatCurrency(Math.abs(saleResult.netCashProceeds))})`
                        }
                      </span>
                    </div>
                  </div>
                </div>

                {/* Summary */}
                <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.04] space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500">Sale Price</span>
                    <span className="text-white font-mono tabular-nums">{formatCurrency(displaySalePrice)}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500">Outstanding Loan</span>
                    <span className="text-slate-300 font-mono tabular-nums">({formatCurrency(saleResult.outstandingLoanAtSale)})</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500">CPF Refund</span>
                    <span className="text-slate-300 font-mono tabular-nums">({formatCurrency(saleResult.cpfRefundedToOa)})</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500">Fees & SSD</span>
                    <span className="text-slate-300 font-mono tabular-nums">({formatCurrency(saleResult.totalFees + saleResult.ssd.amount)})</span>
                  </div>
                  <div className="pt-2 border-t border-white/[0.06] flex items-center justify-between">
                    <span className="text-xs font-medium text-slate-300">Total Value to You</span>
                    <span className="text-sm font-semibold text-white font-mono tabular-nums">
                      {formatCurrency(saleResult.cpfRefundedToOa + saleResult.netCashProceeds)}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  )
}

"use client"

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'
import { MonthPicker } from '@/components/ui/MonthPicker'
import { IconPicker } from '@/components/modals/ScenarioEventModal/components/IconPicker'

import type {
  PropertyType,
  SaleInputs,
  SaleResult,
  FeeItem,
  SaleFormStep,
} from '@/app/property-planner/types'

import {
  FormInput,
  FeeEditor,
} from '@/app/property-planner/components'

import { formatCurrency } from '@/app/property-planner/hooks'
import { SALE_FORM_STEPS } from '@/app/property-planner/hooks/constants'

interface SaleParametersFormProps {
  saleInputs: SaleInputs
  onSaleInputChange: (field: keyof SaleInputs, value: string | number | boolean | FeeItem[]) => void
  saleResult: SaleResult
  propertyPrice: number
  propertyType: PropertyType
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

export function SaleParametersForm({
  saleInputs,
  onSaleInputChange,
  saleResult,
  propertyPrice,
  propertyType,
  saleIcon = 'banknote',
  saleIconColor = '#10b981',
  saleIconSearch = '',
  onSaleIconChange,
  onSaleIconColorChange,
  onSaleIconSearchChange,
}: SaleParametersFormProps) {
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
                    <div className="flex items-center gap-2">
                      {/* Sale milestone icon - inline with label */}
                      {onSaleIconChange && onSaleIconColorChange && onSaleIconSearchChange && (
                        <IconPicker
                          iconName={saleIcon}
                          iconColor={saleIconColor}
                          searchQuery={saleIconSearch}
                          onIconChange={onSaleIconChange}
                          onColorChange={onSaleIconColorChange}
                          onSearchChange={onSaleIconSearchChange}
                          compact
                        />
                      )}
                      <label className="text-xs font-medium text-slate-400">Expected Sale Date</label>
                    </div>
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

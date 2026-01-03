"use client"

import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'
import { Input } from '@/components/ui/input'
import { MonthPicker } from '@/components/ui/MonthPicker'
import { Building2, ChevronDown, HelpCircle, ExternalLink } from 'lucide-react'

import type { MortgageInputs } from '@/app/property-planner/types'
import { FormInput, InfoTooltip, GrantsEditor } from '@/app/property-planner/components'
import { createDefaultStaggeredDownpayment } from '@/app/property-planner/hooks/constants'
import { CustomDropdown } from '@/components/modals/ScenarioEventModal/components/CustomDropdown'

import type { PropertyAndFinancingStepProps, LoanTypeToggleProps, OnChangeHandler } from './types'

// Reusable section header for consistent styling
function SectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <div className="pt-4 border-t border-white/[0.06]">
      <span className="text-xs font-medium text-slate-400 uppercase tracking-wide">
        {children}
      </span>
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
  onChange: OnChangeHandler
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
  onChange: OnChangeHandler
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

function LoanTypeToggle({ isHDB, inputs, onChange, effectivePrice, downpaymentOnValuation }: LoanTypeToggleProps) {
  return (
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
  )
}

export function PropertyAndFinancingStep({
  inputs,
  onChange,
  isResale,
  isBTO,
  isHDB,
  effectivePrice,
  downpaymentOnValuation,
  maxLtv,
  cashOverValuation,
}: PropertyAndFinancingStepProps) {
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

      {/* Lease Tenure */}
      <div className="space-y-1.5">
        <div className="flex items-center gap-1.5">
          <label className="text-xs font-medium text-slate-400">Lease Tenure</label>
          <InfoTooltip
            title="Lease Tenure"
            description="HDB flats have 99-year leases. Private properties can be 99-year, 999-year, or freehold. Banks may restrict loans for properties with less than 30 years remaining lease."
          />
        </div>
        <div className="flex items-center gap-2">
          <CustomDropdown
            value={inputs.leaseRemainingYears === null ? 'freehold' : 'leasehold'}
            onChange={(value) => {
              if (value === 'freehold') {
                onChange('leaseRemainingYears', null)
              } else {
                // Default to 99 years when switching to leasehold
                onChange('leaseRemainingYears', 99)
              }
            }}
            options={[
              { value: 'freehold', label: 'Freehold' },
              { value: 'leasehold', label: 'Leasehold' },
            ]}
            minWidth="120px"
            className="shrink-0"
          />
          {inputs.leaseRemainingYears !== null && (
            <div className="flex-1 relative">
              <Input
                type="number"
                inputMode="numeric"
                value={inputs.leaseRemainingYears === 0 ? '' : inputs.leaseRemainingYears}
                onChange={(e) => {
                  // Allow empty during typing, store as 0 temporarily
                  const rawValue = e.target.value
                  if (rawValue === '') {
                    onChange('leaseRemainingYears', 0)
                  } else {
                    onChange('leaseRemainingYears', parseInt(rawValue, 10) || 0)
                  }
                }}
                onBlur={(e) => {
                  // Validate on blur: clamp to 1-999, default to 99 if empty
                  const rawValue = e.target.value
                  if (rawValue === '' || parseInt(rawValue, 10) < 1) {
                    onChange('leaseRemainingYears', 99)
                  } else {
                    onChange('leaseRemainingYears', Math.min(999, parseInt(rawValue, 10)))
                  }
                }}
                min={1}
                max={999}
                placeholder="99"
                className="w-full rounded-xl bg-white/[0.05] border-white/[0.10] text-white text-sm py-2.5 px-3 pr-14 hover:border-white/[0.15] focus:border-white/30 focus:bg-white/[0.08] focus:ring-1 focus:ring-white/10"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs">
                years
              </span>
            </div>
          )}
        </div>
        {inputs.leaseRemainingYears !== null && inputs.leaseRemainingYears > 0 && inputs.leaseRemainingYears < 30 && (
          <p className="text-xs text-amber-500">Low remaining lease may affect financing options</p>
        )}
      </div>

      {/* Staggered Downpayment Scheme (SDS) - Only for BTO */}
      {isBTO && (
        <StaggeredDownpaymentSection inputs={inputs} onChange={onChange} />
      )}

      {/* ═══════ LOAN DETAILS SECTION ═══════ */}
      <SectionHeader>Loan Details</SectionHeader>

      {/* Loan Amount - Editable */}
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-slate-400">Loan Amount</label>
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm font-medium">$</span>
          <Input
            type="text"
            inputMode="numeric"
            value={inputs.loanAmount.toLocaleString()}
            onChange={(e) => {
              const amount = Number(e.target.value.replace(/[^0-9]/g, '')) || 0
              onChange('loanAmount', amount)
            }}
            className="w-full rounded-xl bg-white/[0.05] border-white/[0.10] text-white text-sm py-2.5 pl-7 pr-3 hover:border-white/[0.15] focus:border-white/30 focus:bg-white/[0.08] focus:ring-1 focus:ring-white/10"
          />
        </div>
        <div className="flex items-center justify-between">
          <span className="text-xs text-slate-500">
            Max {(maxLtv * 100).toFixed(0)}% LTV = ${Math.round(effectivePrice * maxLtv).toLocaleString()}
          </span>
          <span className={cn(
            "text-xs font-medium",
            inputs.loanAmount / effectivePrice <= maxLtv ? "text-emerald-400" : "text-red-400"
          )}>
            {((inputs.loanAmount / effectivePrice) * 100).toFixed(1)}% LTV
          </span>
        </div>
      </div>

      {isHDB ? (
        <>
          {/* Loan Type Toggle - HDB can choose between HDB Loan or Bank Loan */}
          <LoanTypeToggle
            isHDB={isHDB}
            inputs={inputs}
            onChange={onChange}
            effectivePrice={effectivePrice}
            downpaymentOnValuation={downpaymentOnValuation}
          />

          {/* Loan Term & Interest Rate - side by side */}
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
        </>
      ) : (
        <>
          {/* Private properties - Bank loan only, with fixed/floating rates */}
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
    </div>
  )
}

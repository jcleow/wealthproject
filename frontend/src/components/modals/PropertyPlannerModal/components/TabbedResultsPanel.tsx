"use client"

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'
import { CheckCircle2, AlertTriangle } from 'lucide-react'

import type {
  PropertyType,
  SaleInputs,
  SaleResult,
  AppreciationPeriod,
} from '@/app/property-planner/types'

import type { ComputedValues } from '@/types/propertyPlannerV2'

import {
  AmortizationChart,
  PropertyAppreciationPanel,
} from '@/app/property-planner/components'

import {
  formatCurrency,
  formatMonthYear,
  calculateMortgage,
} from '@/app/property-planner/hooks'

export type ResultsTab = 'purchase' | 'sale' | 'appreciation'
type PurchaseDetailTab = 'breakdown' | 'chart'

interface TabbedResultsPanelProps {
  /** Local calculation (always used - API computed values are for display validation only) */
  calculation: ReturnType<typeof calculateMortgage>
  propertyType: PropertyType
  saleInputs: SaleInputs
  /** Local sale result */
  saleResult: SaleResult
  propertyPrice: number
  activeTab: ResultsTab
  absdRate: number
  appreciationPeriods: AppreciationPeriod[]
  onPeriodsChange: (periods: AppreciationPeriod[]) => void
  purchaseDate: string
  /**
   * Computed values from API (flat structure).
   * Currently not used for display - local calculation is always used.
   * This prop is reserved for future use when we want to display API-computed values.
   */
  computedValues?: ComputedValues | null
}

export function TabbedResultsPanel({
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
  // Reserved for future use when backend returns full nested ComputedValuesFull structure
  computedValues: _computedValues = null,
}: TabbedResultsPanelProps) {
  const [purchaseDetailTab, setPurchaseDetailTab] = useState<PurchaseDetailTab>('breakdown')

  // Currently we always use local calculation for display.
  // The API returns a flat ComputedValues structure which we store but don't display yet.
  // When backend is updated to return full nested structure (ComputedValuesFull),
  // we can switch to using API values for mortgage/sale displays.

  // Mortgage values - always use local calculation
  const totalUpfrontCash = calculation.totalUpfrontCash
  const monthlyPayment = calculation.monthlyPayment
  const cpfOaUsed = calculation.downpaymentBreakdown.cpfOa
  const cashUsed = calculation.downpaymentBreakdown.cash
  const bsdAmount = calculation.bsdAmount
  const absdAmount = calculation.absdAmount
  const cov = calculation.cov
  const loanAmount = propertyPrice - calculation.downpayment
  const totalInterest = calculation.totalInterest
  const loanStartDate = calculation.loanStartDate
  const loanEndDate = calculation.loanEndDate
  const msrRatio = calculation.msrRatio
  const tdsrRatio = calculation.tdsrRatio
  const isHDB = propertyType.includes('hdb')
  const msrLimit = isHDB ? 0.30 : 0.55
  const msrPasses = msrRatio <= msrLimit
  const tdsrPasses = tdsrRatio <= 0.55

  // Purchase fees - use local calculation
  const purchaseFees: Array<{ name: string; amount: number }> =
    calculation.calculatedPurchaseFees.map(f => ({ name: f.item.name, amount: f.amount }))

  // Amortization - use local calculation
  const amortization = calculation.amortization

  // Sale values - use local calculation
  const netCashProceeds = saleResult.netCashProceeds
  const cpfRefundedToOa = saleResult.cpfRefundedToOa
  const holdingPeriodYears = saleResult.holdingPeriodYears
  const outstandingLoanAtSale = saleResult.outstandingLoanAtSale
  const grossProceeds = saleResult.grossProceeds
  const cpfPrincipalUsed = saleResult.cpfRefund.principalUsed
  const cpfAccruedInterest = saleResult.cpfRefund.accruedInterest
  const ssdApplicable = saleResult.ssd.applicable
  const ssdRate = String(saleResult.ssd.rate)
  const ssdAmount = saleResult.ssd.amount

  // Sale fees - use local calculation
  const saleFees: Array<{ name: string; amount: number }> =
    saleResult.calculatedFees.filter(f => f.amount > 0).map(f => ({ name: f.item.name, amount: f.amount }))

  const tdsrLimit = 0.55
  const bothWithinLimit = msrPasses && tdsrPasses

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
                    {formatCurrency(totalUpfrontCash)}
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
                  <p className="text-xs font-medium text-white">{formatCurrency(cpfOaUsed)}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Monthly</p>
                  <p className="text-xs font-medium text-white">{formatCurrency(monthlyPayment)}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">MSR</p>
                  <div className="flex items-center gap-1.5">
                    <div className="flex-1 h-1 rounded-full bg-white/[0.06] overflow-hidden">
                      <div
                        className={cn("h-full rounded-full", msrPasses ? "bg-emerald-400" : "bg-amber-400")}
                        style={{ width: `${Math.min((msrRatio / msrLimit) * 100, 100)}%` }}
                      />
                    </div>
                    <span className={cn("text-xs font-medium", msrPasses ? "text-emerald-400" : "text-amber-400")}>
                      {(msrRatio * 100).toFixed(0)}%
                    </span>
                  </div>
                </div>
                <div>
                  <p className="text-xs text-slate-500">TDSR</p>
                  <div className="flex items-center gap-1.5">
                    <div className="flex-1 h-1 rounded-full bg-white/[0.06] overflow-hidden">
                      <div
                        className={cn("h-full rounded-full", tdsrPasses ? "bg-emerald-400" : "bg-amber-400")}
                        style={{ width: `${Math.min((tdsrRatio / tdsrLimit) * 100, 100)}%` }}
                      />
                    </div>
                    <span className={cn("text-xs font-medium", tdsrPasses ? "text-emerald-400" : "text-amber-400")}>
                      {(tdsrRatio * 100).toFixed(0)}%
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
                  <div className="space-y-4">
                    {/* Upfront Costs Section */}
                    <div className="space-y-1.5">
                      <p className="text-xs font-medium text-slate-500 mb-2">Upfront Costs</p>
                      <div className="flex justify-between text-xs">
                        <span className="text-slate-400">CPF OA</span>
                        <span className="text-white">{formatCurrency(cpfOaUsed)}</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-slate-400">Cash</span>
                        <span className="text-white">{formatCurrency(cashUsed)}</span>
                      </div>
                      {cov > 0 && (
                        <div className="flex justify-between text-xs">
                          <span className="text-slate-400">COV</span>
                          <span className="text-slate-300">{formatCurrency(cov)}</span>
                        </div>
                      )}
                      <div className="flex justify-between text-xs">
                        <span className="text-slate-400">BSD</span>
                        <span className="text-slate-300">{formatCurrency(bsdAmount)}</span>
                      </div>
                      {absdAmount > 0 && (
                        <div className="flex justify-between text-xs">
                          <span className="text-slate-400">ABSD ({absdRate}%)</span>
                          <span className="text-slate-300">{formatCurrency(absdAmount)}</span>
                        </div>
                      )}
                      {purchaseFees.map((fee) => (
                        <div key={fee.name} className="flex justify-between text-xs">
                          <span className="text-slate-400">{fee.name}</span>
                          <span className="text-slate-300">{formatCurrency(fee.amount)}</span>
                        </div>
                      ))}
                    </div>

                    {/* Loan Details Section */}
                    <div className="space-y-1.5 pt-3 border-t border-white/[0.06]">
                      <p className="text-xs font-medium text-slate-500 mb-2">Loan Details</p>
                      <div className="flex justify-between text-xs">
                        <span className="text-slate-400">Amount</span>
                        <span className="text-white">{formatCurrency(loanAmount)}</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-slate-400">Tenure</span>
                        <span className="text-slate-300">{calculation.loanTermYears} yrs</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-slate-400">Period</span>
                        <span className="text-slate-300">
                          {formatMonthYear(loanStartDate)} - {formatMonthYear(loanEndDate)}
                        </span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-slate-400">Interest</span>
                        <span className="text-slate-300">{formatCurrency(totalInterest)}</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-slate-400">Total</span>
                        <span className="text-slate-300">{formatCurrency(monthlyPayment * calculation.loanTermYears * 12)}</span>
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
                  <AmortizationChart amortization={amortization} />
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
                    {formatCurrency(netCashProceeds)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs font-medium text-slate-500 mb-0.5">CPF Refund</p>
                  <p className="text-lg font-semibold text-white">
                    {formatCurrency(cpfRefundedToOa)}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <p className="text-xs text-slate-500">Holding</p>
                  <p className="text-xs font-medium text-white">{holdingPeriodYears.toFixed(1)} yrs</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Outstanding</p>
                  <p className="text-xs font-medium text-slate-300">{formatCurrency(outstandingLoanAtSale)}</p>
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
                  <span className="text-slate-300">-{formatCurrency(outstandingLoanAtSale)}</span>
                </div>
                <div className="flex justify-between text-xs pt-1 border-t border-white/[0.04]">
                  <span className="text-slate-300">Gross Proceeds</span>
                  <span className="text-white">{formatCurrency(grossProceeds)}</span>
                </div>
              </div>

              <div className="space-y-1.5 pt-2">
                <p className="text-xs text-slate-500">Deductions</p>
                <div className="flex justify-between text-xs">
                  <span className="text-slate-400">CPF Principal</span>
                  <span className="text-slate-300">-{formatCurrency(cpfPrincipalUsed)}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-slate-500">+ Accrued Interest</span>
                  <span className="text-slate-400">-{formatCurrency(cpfAccruedInterest)}</span>
                </div>
                {ssdApplicable && (
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-400">SSD ({ssdRate}%)</span>
                    <span className="text-slate-300">-{formatCurrency(ssdAmount)}</span>
                  </div>
                )}
                {saleFees.map((fee) => (
                  <div key={fee.name} className="flex justify-between text-xs">
                    <span className="text-slate-400">{fee.name}</span>
                    <span className="text-slate-300">-{formatCurrency(fee.amount)}</span>
                  </div>
                ))}
              </div>

              <div className="pt-2 border-t border-white/[0.06] space-y-1">
                <div className="flex justify-between items-center">
                  <span className="text-xs text-slate-400">Net Cash</span>
                  <span className="text-sm font-semibold text-white">{formatCurrency(netCashProceeds)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-slate-400">CPF Refund</span>
                  <span className="text-sm font-semibold text-white">{formatCurrency(cpfRefundedToOa)}</span>
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

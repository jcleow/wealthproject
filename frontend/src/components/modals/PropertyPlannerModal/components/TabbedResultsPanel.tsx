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
}: TabbedResultsPanelProps) {
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

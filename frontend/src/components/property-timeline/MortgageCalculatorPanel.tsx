"use client"

import { useState, useMemo } from 'react'
import { cn } from '@/lib/utils'
import {
  Calculator,
  PiggyBank,
  Wallet,
  TrendingDown,
  AlertTriangle,
  ChevronDown,
  ChevronUp
} from 'lucide-react'

// ============================================
// TYPES
// ============================================

export type ScenarioType =
  | 'hdb-resale'
  | 'hdb-bto'
  | 'ec'
  | 'hdb-sale'
  | 'private-sale'
  | 'upgrade'

interface PurchaseInputs {
  propertyPrice: number
  loanAmount: number
  loanTenureYears: number
  interestRate: number
  monthlyCpfContribution: number
  currentCpfOaBalance: number
  grantsReceived: number
}

interface SaleInputs {
  salePrice: number
  outstandingMortgage: number
  cpfUsedPrincipal: number
  yearsOfCpfUsage: number
  grantsReceived: number
  yearsOwned: number
}

interface RepaymentMonth {
  month: number
  cpfPayment: number
  cashPayment: number
  cpfBalance: number
  loanBalance: number
}

interface PurchaseResult {
  monthlyPayment: number
  totalInterest: number
  totalCpfUsed: number
  totalCashRequired: number
  cpfRunsOutMonth: number | null
  cpfAccruedInterest: number
  schedule: RepaymentMonth[]
}

interface SaleResult {
  grossProceeds: number
  lessMortgage: number
  cpfRefundPrincipal: number
  cpfRefundInterest: number
  cpfRefundTotal: number
  grantClawback: number
  netCashProceeds: number
}

// ============================================
// CALCULATION FUNCTIONS
// ============================================

function calculateMonthlyPayment(principal: number, annualRate: number, years: number): number {
  if (principal <= 0 || annualRate <= 0 || years <= 0) return 0
  const monthlyRate = annualRate / 100 / 12
  const numPayments = years * 12
  return principal * (monthlyRate * Math.pow(1 + monthlyRate, numPayments)) /
    (Math.pow(1 + monthlyRate, numPayments) - 1)
}

function calculatePurchaseSchedule(inputs: PurchaseInputs): PurchaseResult {
  const {
    loanAmount,
    loanTenureYears,
    interestRate,
    monthlyCpfContribution,
    currentCpfOaBalance
  } = inputs

  const monthlyPayment = calculateMonthlyPayment(loanAmount, interestRate, loanTenureYears)
  const totalMonths = loanTenureYears * 12
  const monthlyRate = interestRate / 100 / 12

  let cpfBalance = currentCpfOaBalance
  let loanBalance = loanAmount
  let totalCpfUsed = 0
  let totalCashUsed = 0
  let cpfRunsOutMonth: number | null = null

  const schedule: RepaymentMonth[] = []

  for (let month = 1; month <= totalMonths && loanBalance > 0; month++) {
    // Add monthly CPF contribution
    cpfBalance += monthlyCpfContribution

    // Calculate interest and principal portions
    const interestPortion = loanBalance * monthlyRate
    const principalPortion = Math.min(monthlyPayment - interestPortion, loanBalance)
    const actualPayment = interestPortion + principalPortion

    // Determine CPF vs Cash split
    let cpfPayment = 0
    let cashPayment = 0

    if (cpfBalance >= actualPayment) {
      // Full CPF payment
      cpfPayment = actualPayment
      cpfBalance -= actualPayment
    } else if (cpfBalance > 0) {
      // Partial CPF, rest cash
      cpfPayment = cpfBalance
      cashPayment = actualPayment - cpfBalance
      cpfBalance = 0
      if (cpfRunsOutMonth === null) {
        cpfRunsOutMonth = month
      }
    } else {
      // Full cash payment
      cashPayment = actualPayment
      if (cpfRunsOutMonth === null) {
        cpfRunsOutMonth = month
      }
    }

    totalCpfUsed += cpfPayment
    totalCashUsed += cashPayment
    loanBalance -= principalPortion

    schedule.push({
      month,
      cpfPayment,
      cashPayment,
      cpfBalance,
      loanBalance: Math.max(0, loanBalance),
    })
  }

  // Calculate CPF accrued interest (2.5% p.a. compounded)
  const cpfAccruedInterest = totalCpfUsed * (Math.pow(1.025, loanTenureYears) - 1)

  return {
    monthlyPayment,
    totalInterest: (monthlyPayment * totalMonths) - loanAmount,
    totalCpfUsed,
    totalCashRequired: totalCashUsed,
    cpfRunsOutMonth,
    cpfAccruedInterest,
    schedule,
  }
}

function calculateSaleProceeds(inputs: SaleInputs): SaleResult {
  const {
    salePrice,
    outstandingMortgage,
    cpfUsedPrincipal,
    yearsOfCpfUsage,
    grantsReceived,
    yearsOwned
  } = inputs

  const grossProceeds = salePrice - outstandingMortgage

  // CPF refund: principal + 2.5% accrued interest
  const cpfRefundInterest = cpfUsedPrincipal * (Math.pow(1.025, yearsOfCpfUsage) - 1)
  const cpfRefundTotal = cpfUsedPrincipal + cpfRefundInterest

  // Grant clawback: only if sold within 5 years
  let grantClawback = 0
  if (yearsOwned < 5 && grantsReceived > 0) {
    grantClawback = grantsReceived * Math.pow(1.025, yearsOwned)
  }

  const netCashProceeds = grossProceeds - cpfRefundTotal - grantClawback

  return {
    grossProceeds,
    lessMortgage: outstandingMortgage,
    cpfRefundPrincipal: cpfUsedPrincipal,
    cpfRefundInterest,
    cpfRefundTotal,
    grantClawback,
    netCashProceeds,
  }
}

// ============================================
// FORMATTING HELPERS
// ============================================

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-SG', {
    style: 'currency',
    currency: 'SGD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

function formatMonths(months: number): string {
  if (months < 12) return `${months} months`
  const years = Math.floor(months / 12)
  const remainingMonths = months % 12
  if (remainingMonths === 0) return `${years} years`
  return `${years}y ${remainingMonths}m`
}

// ============================================
// SCENARIO CONFIGS
// ============================================

const scenarioConfigs: Record<ScenarioType, {
  title: string
  subtitle: string
  isPurchase: boolean
  defaultPurchase?: Partial<PurchaseInputs>
  defaultSale?: Partial<SaleInputs>
  color: string
}> = {
  'hdb-resale': {
    title: 'HDB Resale',
    subtitle: 'Purchase Calculator',
    isPurchase: true,
    defaultPurchase: {
      propertyPrice: 800000,
      loanAmount: 600000,
      loanTenureYears: 25,
      interestRate: 2.6,
      monthlyCpfContribution: 2000,
      currentCpfOaBalance: 50000,
      grantsReceived: 80000,
    },
    color: 'bg-pink-600',
  },
  'hdb-bto': {
    title: 'HDB BTO',
    subtitle: 'Purchase Calculator',
    isPurchase: true,
    defaultPurchase: {
      propertyPrice: 600000,
      loanAmount: 480000,
      loanTenureYears: 25,
      interestRate: 2.6,
      monthlyCpfContribution: 2000,
      currentCpfOaBalance: 50000,
      grantsReceived: 80000,
    },
    color: 'bg-purple-700',
  },
  'ec': {
    title: 'Executive Condo',
    subtitle: 'Purchase Calculator',
    isPurchase: true,
    defaultPurchase: {
      propertyPrice: 1200000,
      loanAmount: 960000,
      loanTenureYears: 30,
      interestRate: 3.5,
      monthlyCpfContribution: 3000,
      currentCpfOaBalance: 100000,
      grantsReceived: 30000,
    },
    color: 'bg-teal-700',
  },
  'hdb-sale': {
    title: 'HDB Sale',
    subtitle: 'Proceeds Calculator',
    isPurchase: false,
    defaultSale: {
      salePrice: 900000,
      outstandingMortgage: 400000,
      cpfUsedPrincipal: 200000,
      yearsOfCpfUsage: 10,
      grantsReceived: 80000,
      yearsOwned: 10,
    },
    color: 'bg-orange-700',
  },
  'private-sale': {
    title: 'Private Sale',
    subtitle: 'Proceeds Calculator',
    isPurchase: false,
    defaultSale: {
      salePrice: 1500000,
      outstandingMortgage: 800000,
      cpfUsedPrincipal: 300000,
      yearsOfCpfUsage: 15,
      grantsReceived: 0,
      yearsOwned: 8,
    },
    color: 'bg-red-800',
  },
  'upgrade': {
    title: 'Upgrade Path',
    subtitle: 'Sell HDB → Buy Private',
    isPurchase: false,
    defaultSale: {
      salePrice: 900000,
      outstandingMortgage: 300000,
      cpfUsedPrincipal: 250000,
      yearsOfCpfUsage: 8,
      grantsReceived: 80000,
      yearsOwned: 8,
    },
    color: 'bg-indigo-700',
  },
}

// ============================================
// INPUT COMPONENT
// ============================================

interface InputFieldProps {
  label: string
  value: number
  onChange: (value: number) => void
  prefix?: string
  suffix?: string
  step?: number
  min?: number
  max?: number
}

function InputField({ label, value, onChange, prefix = '$', suffix, step = 1000, min = 0, max }: InputFieldProps) {
  return (
    <div>
      <label className="block text-xs text-slate-400 mb-1">{label}</label>
      <div className="relative">
        {prefix && (
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm">
            {prefix}
          </span>
        )}
        <input
          type="number"
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          step={step}
          min={min}
          max={max}
          className={cn(
            "w-full rounded-lg border border-white/10 bg-white/5",
            "text-white text-sm font-medium",
            "focus:border-blue-500/50 focus:outline-none focus:ring-1 focus:ring-blue-500/30",
            "transition-colors",
            prefix ? "pl-7 pr-3 py-2" : "px-3 py-2",
            suffix && "pr-10"
          )}
        />
        {suffix && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm">
            {suffix}
          </span>
        )}
      </div>
    </div>
  )
}

// ============================================
// RESULT CARD COMPONENT
// ============================================

interface ResultCardProps {
  icon: React.ReactNode
  label: string
  value: string
  subValue?: string
  color?: 'default' | 'green' | 'blue' | 'red' | 'amber'
}

function ResultCard({ icon, label, value, subValue, color = 'default' }: ResultCardProps) {
  const colorClasses = {
    default: 'text-white',
    green: 'text-emerald-400',
    blue: 'text-blue-400',
    red: 'text-red-400',
    amber: 'text-amber-400',
  }

  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-3">
      <div className="flex items-center gap-2 text-xs text-slate-400">
        {icon}
        {label}
      </div>
      <p className={cn("mt-1 text-lg font-semibold", colorClasses[color])}>
        {value}
      </p>
      {subValue && (
        <p className="text-xs text-slate-500 mt-0.5">{subValue}</p>
      )}
    </div>
  )
}

// ============================================
// MAIN COMPONENT
// ============================================

interface MortgageCalculatorPanelProps {
  selectedScenario: ScenarioType
  className?: string
}

export function MortgageCalculatorPanel({ selectedScenario, className }: MortgageCalculatorPanelProps) {
  const config = scenarioConfigs[selectedScenario]
  const [showDetails, setShowDetails] = useState(false)

  // Purchase inputs state
  const [purchaseInputs, setPurchaseInputs] = useState<PurchaseInputs>({
    propertyPrice: config.defaultPurchase?.propertyPrice ?? 800000,
    loanAmount: config.defaultPurchase?.loanAmount ?? 600000,
    loanTenureYears: config.defaultPurchase?.loanTenureYears ?? 25,
    interestRate: config.defaultPurchase?.interestRate ?? 2.6,
    monthlyCpfContribution: config.defaultPurchase?.monthlyCpfContribution ?? 2000,
    currentCpfOaBalance: config.defaultPurchase?.currentCpfOaBalance ?? 50000,
    grantsReceived: config.defaultPurchase?.grantsReceived ?? 0,
  })

  // Sale inputs state
  const [saleInputs, setSaleInputs] = useState<SaleInputs>({
    salePrice: config.defaultSale?.salePrice ?? 900000,
    outstandingMortgage: config.defaultSale?.outstandingMortgage ?? 400000,
    cpfUsedPrincipal: config.defaultSale?.cpfUsedPrincipal ?? 200000,
    yearsOfCpfUsage: config.defaultSale?.yearsOfCpfUsage ?? 10,
    grantsReceived: config.defaultSale?.grantsReceived ?? 0,
    yearsOwned: config.defaultSale?.yearsOwned ?? 10,
  })

  // Calculate results
  const purchaseResult = useMemo(() =>
    config.isPurchase ? calculatePurchaseSchedule(purchaseInputs) : null,
    [config.isPurchase, purchaseInputs]
  )

  const saleResult = useMemo(() =>
    !config.isPurchase ? calculateSaleProceeds(saleInputs) : null,
    [config.isPurchase, saleInputs]
  )

  // Update inputs when scenario changes
  const updatePurchaseInput = (key: keyof PurchaseInputs, value: number) => {
    setPurchaseInputs(prev => ({ ...prev, [key]: value }))
  }

  const updateSaleInput = (key: keyof SaleInputs, value: number) => {
    setSaleInputs(prev => ({ ...prev, [key]: value }))
  }

  return (
    <div className={cn("rounded-2xl border border-white/10 bg-[#0a0a0a] overflow-hidden", className)}>
      {/* Header */}
      <div className={cn("px-4 py-3", config.color)}>
        <div className="flex items-center gap-2">
          <Calculator className="h-4 w-4" />
          <div>
            <div className="text-xs text-white/70 uppercase tracking-wider">{config.subtitle}</div>
            <div className="text-lg font-bold text-white">{config.title}</div>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Purchase Calculator */}
        {config.isPurchase && purchaseResult && (
          <>
            {/* Inputs */}
            <div className="grid grid-cols-2 gap-3">
              <InputField
                label="Property Price"
                value={purchaseInputs.propertyPrice}
                onChange={(v) => updatePurchaseInput('propertyPrice', v)}
              />
              <InputField
                label="Loan Amount"
                value={purchaseInputs.loanAmount}
                onChange={(v) => updatePurchaseInput('loanAmount', v)}
              />
              <InputField
                label="Tenure (Years)"
                value={purchaseInputs.loanTenureYears}
                onChange={(v) => updatePurchaseInput('loanTenureYears', v)}
                prefix=""
                suffix="yrs"
                step={1}
                min={1}
                max={35}
              />
              <InputField
                label="Interest Rate"
                value={purchaseInputs.interestRate}
                onChange={(v) => updatePurchaseInput('interestRate', v)}
                prefix=""
                suffix="%"
                step={0.1}
                min={0.1}
                max={10}
              />
              <InputField
                label="Monthly CPF Contribution"
                value={purchaseInputs.monthlyCpfContribution}
                onChange={(v) => updatePurchaseInput('monthlyCpfContribution', v)}
                step={100}
              />
              <InputField
                label="Current CPF OA Balance"
                value={purchaseInputs.currentCpfOaBalance}
                onChange={(v) => updatePurchaseInput('currentCpfOaBalance', v)}
              />
              <div className="col-span-2">
                <InputField
                  label="Grants Received (EHG/PHG)"
                  value={purchaseInputs.grantsReceived}
                  onChange={(v) => updatePurchaseInput('grantsReceived', v)}
                />
              </div>
            </div>

            {/* Results Summary */}
            <div className="border-t border-white/10 pt-4">
              <div className="text-xs text-slate-400 uppercase tracking-wider mb-3">Monthly Repayment</div>
              <div className="grid grid-cols-2 gap-2">
                <ResultCard
                  icon={<Wallet className="h-3.5 w-3.5" />}
                  label="Monthly Payment"
                  value={formatCurrency(purchaseResult.monthlyPayment)}
                  color="default"
                />
                <ResultCard
                  icon={<TrendingDown className="h-3.5 w-3.5" />}
                  label="Total Interest"
                  value={formatCurrency(purchaseResult.totalInterest)}
                  color="red"
                />
                <ResultCard
                  icon={<PiggyBank className="h-3.5 w-3.5" />}
                  label="Total CPF Used"
                  value={formatCurrency(purchaseResult.totalCpfUsed)}
                  subValue={`+ ${formatCurrency(purchaseResult.cpfAccruedInterest)} interest`}
                  color="green"
                />
                <ResultCard
                  icon={<Wallet className="h-3.5 w-3.5" />}
                  label="Total Cash Needed"
                  value={formatCurrency(purchaseResult.totalCashRequired)}
                  color="blue"
                />
              </div>

              {/* CPF runs out warning */}
              {purchaseResult.cpfRunsOutMonth && (
                <div className="mt-3 flex items-start gap-2 rounded-lg bg-amber-500/10 border border-amber-500/30 p-3">
                  <AlertTriangle className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
                  <div className="text-sm">
                    <span className="text-amber-400 font-medium">CPF runs out at </span>
                    <span className="text-white">{formatMonths(purchaseResult.cpfRunsOutMonth)}</span>
                    <p className="text-xs text-slate-400 mt-1">
                      After this, you&apos;ll need to pay {formatCurrency(purchaseResult.monthlyPayment)}/month in cash
                    </p>
                  </div>
                </div>
              )}

              {!purchaseResult.cpfRunsOutMonth && (
                <div className="mt-3 flex items-start gap-2 rounded-lg bg-emerald-500/10 border border-emerald-500/30 p-3">
                  <PiggyBank className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                  <div className="text-sm">
                    <span className="text-emerald-400 font-medium">CPF covers full loan!</span>
                    <p className="text-xs text-slate-400 mt-1">
                      Your CPF OA can fully service this mortgage
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Detailed Schedule Toggle */}
            <button
              onClick={() => setShowDetails(!showDetails)}
              className="w-full flex items-center justify-center gap-1 text-xs text-slate-400 hover:text-white transition-colors py-2"
            >
              {showDetails ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
              {showDetails ? 'Hide' : 'Show'} yearly breakdown
            </button>

            {/* Detailed Schedule */}
            {showDetails && (
              <div className="max-h-60 overflow-y-auto rounded-lg border border-white/10 bg-black/30">
                <table className="w-full text-xs">
                  <thead className="sticky top-0 bg-slate-900">
                    <tr className="text-slate-400">
                      <th className="text-left p-2">Year</th>
                      <th className="text-right p-2">CPF</th>
                      <th className="text-right p-2">Cash</th>
                      <th className="text-right p-2">Balance</th>
                    </tr>
                  </thead>
                  <tbody>
                    {purchaseResult.schedule
                      .filter((_, i) => i % 12 === 11) // Show yearly
                      .map((row, i) => (
                        <tr key={i} className="border-t border-white/5">
                          <td className="p-2 text-slate-300">Year {i + 1}</td>
                          <td className="p-2 text-right text-emerald-400">
                            {formatCurrency(
                              purchaseResult.schedule
                                .slice(i * 12, (i + 1) * 12)
                                .reduce((sum, m) => sum + m.cpfPayment, 0)
                            )}
                          </td>
                          <td className="p-2 text-right text-blue-400">
                            {formatCurrency(
                              purchaseResult.schedule
                                .slice(i * 12, (i + 1) * 12)
                                .reduce((sum, m) => sum + m.cashPayment, 0)
                            )}
                          </td>
                          <td className="p-2 text-right text-slate-300">
                            {formatCurrency(row.loanBalance)}
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}

        {/* Sale Calculator */}
        {!config.isPurchase && saleResult && (
          <>
            {/* Inputs */}
            <div className="grid grid-cols-2 gap-3">
              <InputField
                label="Sale Price"
                value={saleInputs.salePrice}
                onChange={(v) => updateSaleInput('salePrice', v)}
              />
              <InputField
                label="Outstanding Mortgage"
                value={saleInputs.outstandingMortgage}
                onChange={(v) => updateSaleInput('outstandingMortgage', v)}
              />
              <InputField
                label="CPF Used (Principal)"
                value={saleInputs.cpfUsedPrincipal}
                onChange={(v) => updateSaleInput('cpfUsedPrincipal', v)}
              />
              <InputField
                label="Years of CPF Usage"
                value={saleInputs.yearsOfCpfUsage}
                onChange={(v) => updateSaleInput('yearsOfCpfUsage', v)}
                prefix=""
                suffix="yrs"
                step={1}
                min={1}
                max={35}
              />
              <InputField
                label="Grants Received"
                value={saleInputs.grantsReceived}
                onChange={(v) => updateSaleInput('grantsReceived', v)}
              />
              <InputField
                label="Years Owned"
                value={saleInputs.yearsOwned}
                onChange={(v) => updateSaleInput('yearsOwned', v)}
                prefix=""
                suffix="yrs"
                step={1}
                min={0}
                max={99}
              />
            </div>

            {/* Sale Proceeds Breakdown */}
            <div className="border-t border-white/10 pt-4">
              <div className="text-xs text-slate-400 uppercase tracking-wider mb-3">Proceeds Breakdown</div>

              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-400">Sale Price</span>
                  <span className="text-white font-medium">{formatCurrency(saleInputs.salePrice)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Less: Outstanding Mortgage</span>
                  <span className="text-red-400">- {formatCurrency(saleResult.lessMortgage)}</span>
                </div>
                <div className="border-t border-white/10 pt-2 flex justify-between">
                  <span className="text-slate-300">Gross Proceeds</span>
                  <span className="text-white font-medium">{formatCurrency(saleResult.grossProceeds)}</span>
                </div>
              </div>

              {/* CPF Refund Box */}
              <div className="mt-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3">
                <div className="flex items-center gap-2 text-emerald-400 text-sm font-medium">
                  <PiggyBank className="h-4 w-4" />
                  CPF Refund (Returns to OA)
                </div>
                <div className="mt-2 space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Principal Used</span>
                    <span className="text-white">{formatCurrency(saleResult.cpfRefundPrincipal)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Accrued Interest (2.5% p.a.)</span>
                    <span className="text-emerald-400">+ {formatCurrency(saleResult.cpfRefundInterest)}</span>
                  </div>
                  <div className="border-t border-emerald-500/30 pt-1 flex justify-between font-medium">
                    <span className="text-emerald-300">Total to CPF OA</span>
                    <span className="text-emerald-400">{formatCurrency(saleResult.cpfRefundTotal)}</span>
                  </div>
                </div>
              </div>

              {/* Grant Clawback Box (if applicable) */}
              {saleResult.grantClawback > 0 && (
                <div className="mt-3 rounded-xl border border-red-500/30 bg-red-500/10 p-3">
                  <div className="flex items-center gap-2 text-red-400 text-sm font-medium">
                    <AlertTriangle className="h-4 w-4" />
                    Grant Clawback (Sold within 5 years)
                  </div>
                  <div className="mt-2 flex justify-between text-sm">
                    <span className="text-slate-400">Grant + Interest returned to CPF</span>
                    <span className="text-red-400">- {formatCurrency(saleResult.grantClawback)}</span>
                  </div>
                </div>
              )}

              {saleInputs.yearsOwned >= 5 && saleInputs.grantsReceived > 0 && (
                <div className="mt-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3">
                  <div className="flex items-center gap-2 text-emerald-400 text-sm">
                    <PiggyBank className="h-4 w-4" />
                    <span>No grant clawback (owned &gt; 5 years)</span>
                  </div>
                </div>
              )}

              {/* Net Cash Proceeds */}
              <div className="mt-4 rounded-xl border border-blue-500/30 bg-blue-500/10 p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-blue-400 font-medium">
                    <Wallet className="h-5 w-5" />
                    Net Cash Proceeds
                  </div>
                  <div className="text-2xl font-bold text-white">
                    {formatCurrency(saleResult.netCashProceeds)}
                  </div>
                </div>
                <p className="text-xs text-slate-400 mt-2">
                  This is the cash you receive after mortgage payoff and CPF refunds
                </p>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

export default MortgageCalculatorPanel

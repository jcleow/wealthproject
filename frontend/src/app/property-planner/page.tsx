"use client"

import { useState, useMemo, useCallback, useEffect } from 'react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  BarChart,
  Bar,
  Legend,
} from 'recharts'
import {
  Building2,
  Home,
  Landmark,
  ArrowLeft,
  Banknote,
  Percent,
  Hammer,
  TrendingDown,
  CheckCircle2,
  HelpCircle,
  Check,
  Plus,
  X,
  ChevronDown,
  ChevronRight,
  Trash2,
  Pencil,
} from 'lucide-react'

// ============================================
// TYPES
// ============================================

type PropertyType = 'hdb-resale' | 'hdb-bto' | 'ec' | 'private-resale' | 'private-new'
type BorrowerType = 'single' | 'joint'

// Mock income data for visual mockup (will be replaced with real data later)
interface MockIncome {
  id: string
  name: string
  monthlyAmount: number
}

interface PropertyOption {
  id: PropertyType
  title: string
  subtitle: string
  description: string
  icon: React.ReactNode
  color: string
  accentColor: string
  priceRange: string
  highlights: string[]
}

type LoanType = 'bank' | 'hdb'

interface MortgageInputs {
  propertyPrice: number
  valuationPrice: number // Bank/HDB valuation (for resale properties)
  loanAmount: number
  loanType: LoanType // Bank loan vs HDB loan - affects downpayment CPF/cash split
  // Downpayment breakdown
  downpaymentCpfOa: number // Amount to pay from CPF OA
  downpaymentCash: number // Amount to pay in cash (excluding COV)
  loanTermYears: number
  loanStartMonth: string
  fixedYears: number
  fixedRate: number
  floatingRate: number
  householdIncome: number
  otherDebt: number // Computed from selected liabilities
  borrowerType: BorrowerType
  cpfOaBalance: number
  monthlyCpfOa: number
  grants: number
  // Borrower selection fields
  borrower1IncomeId: string
  borrower1OaBalance: number
  borrower1LiabilityIds: string[] // IDs of liabilities assigned to borrower 1
  borrower2IncomeId: string | null
  borrower2OaBalance: number
  borrower2LiabilityIds: string[] // IDs of liabilities assigned to borrower 2
  // Purchase fees/expenses
  purchaseFees: FeeItem[]
  // ABSD (Additional Buyer's Stamp Duty) - user-entered percentage
  absdRate: number // e.g., 0 for SC 1st property, 20 for SC 2nd, 60 for foreigner
}

interface AmortizationYear {
  year: number
  principal: number
  interest: number
  balance: number
  totalPaid: number
}

// Fee item for flexible expense tracking
export interface FeeItem {
  id: string
  name: string
  type: 'percentage' | 'fixed'
  value: number  // percentage (e.g., 2 for 2%) or fixed amount
  enabled: boolean
  dueOffset?: number  // Months relative to purchase (0 = at purchase, -1 = 1 month before, 1 = 1 month after)
}

// Sale planning types
interface SaleInputs {
  expectedSaleDate: string  // YYYY-MM format
  expectedSalePrice: number
  fees: FeeItem[]  // Flexible fees list
}

interface SaleResult {
  holdingPeriodMonths: number
  holdingPeriodYears: number
  outstandingLoanAtSale: number

  // CPF Refund calculation
  cpfRefund: {
    principalUsed: number      // downpaymentCpfOa + cumulative monthly CPF payments
    accruedInterest: number    // 2.5% compound interest
    total: number
  }

  // Seller's Stamp Duty (only if < 4 years)
  ssd: {
    applicable: boolean
    rate: number               // 0-16%
    amount: number
  }

  // Calculated fees from the fees array
  calculatedFees: {
    item: FeeItem
    amount: number
  }[]
  totalFees: number

  // Final proceeds
  grossProceeds: number        // Sale price - outstanding loan
  netCashProceeds: number      // After all deductions
  cpfRefundedToOa: number      // Amount going back to CPF
}

// Property scenario for the list view
interface PropertyScenario {
  id: string
  name: string
  propertyType: PropertyType
  inputs: MortgageInputs
  saleInputs: SaleInputs
  isIncluded: boolean  // Whether to include in financial planning
  createdAt: number
}

// Default sale fees
export const DEFAULT_SALE_FEES: FeeItem[] = [
  { id: 'agent-commission', name: 'Agent Commission', type: 'percentage', value: 2, enabled: true },
  { id: 'legal-fees', name: 'Legal/Conveyancing', type: 'fixed', value: 3000, enabled: true },
  { id: 'discharge-fee', name: 'Mortgage Discharge', type: 'fixed', value: 500, enabled: true },
]

// Default purchase fees (buyer's expenses)
// dueOffset: months relative to purchase date (0 = at completion, negative = before)
export const DEFAULT_PURCHASE_FEES: FeeItem[] = [
  { id: 'legal-fees', name: 'Legal/Conveyancing', type: 'fixed', value: 3000, enabled: true, dueOffset: 0 },
  { id: 'valuation-fee', name: 'Valuation Fee', type: 'fixed', value: 500, enabled: true, dueOffset: -2 },
  { id: 'agent-fee', name: 'Agent Fee (if any)', type: 'percentage', value: 1, enabled: false, dueOffset: 0 },
  { id: 'renovation', name: 'Renovation/Repairs', type: 'fixed', value: 30000, enabled: false, dueOffset: 1 },
  { id: 'moving-costs', name: 'Moving Costs', type: 'fixed', value: 2000, enabled: false, dueOffset: 1 },
]

// ============================================
// MOCK INCOME DATA (for visual mockup)
// ============================================

const mockIncomes: MockIncome[] = [
  { id: 'income-1', name: "John's Salary", monthlyAmount: 8500 },
  { id: 'income-2', name: "Sarah's Salary", monthlyAmount: 6200 },
]

// Helper to calculate monthly OA inflow from salary (simplified ~21% of income for <35 y/o)
function calculateMonthlyOaInflow(monthlyIncome: number): number {
  return Math.round(monthlyIncome * 0.23 * 0.9216)
}

// ============================================
// PROPERTY OPTIONS DATA
// ============================================

const propertyOptions: PropertyOption[] = [
  {
    id: 'hdb-resale',
    title: 'HDB Resale',
    subtitle: 'Ready to move in',
    description: 'Purchase an existing HDB flat from current owners. Immediate availability, established neighborhoods.',
    icon: <Home className="w-8 h-8" />,
    color: 'from-rose-500/20 to-rose-600/5',
    accentColor: 'text-rose-400',
    priceRange: '$400K - $900K',
    highlights: ['Immediate move-in', 'Mature estates', 'CPF + Grants eligible']
  },
  {
    id: 'hdb-bto',
    title: 'HDB BTO',
    subtitle: 'Build-To-Order',
    description: 'Apply for a new HDB flat. Lower prices but requires waiting for construction completion.',
    icon: <Hammer className="w-8 h-8" />,
    color: 'from-violet-500/20 to-violet-600/5',
    accentColor: 'text-violet-400',
    priceRange: '$300K - $700K',
    highlights: ['Lowest prices', 'New flat', 'Higher grants', 'Long wait time']
  },
  {
    id: 'ec',
    title: 'Executive Condo',
    subtitle: 'Hybrid Property',
    description: 'Private condo with HDB-like subsidies. Income ceiling applies. Privatizes after 10 years.',
    icon: <Building2 className="w-8 h-8" />,
    color: 'from-teal-500/20 to-teal-600/5',
    accentColor: 'text-teal-400',
    priceRange: '$1.0M - $1.5M',
    highlights: ['Condo facilities', 'Grant eligible', 'Bank loan only', 'Privatizes Y10']
  },
  {
    id: 'private-resale',
    title: 'Private Resale',
    subtitle: 'Condo / Landed',
    description: 'Purchase from current owners. No income ceiling, no grants. Immediate availability.',
    icon: <Landmark className="w-8 h-8" />,
    color: 'from-amber-500/20 to-amber-600/5',
    accentColor: 'text-amber-400',
    priceRange: '$1.2M - $3M+',
    highlights: ['No income ceiling', 'No MOP to buy', 'Full condo facilities']
  },
  {
    id: 'private-new',
    title: 'New Launch',
    subtitle: 'Private Development',
    description: 'Purchase directly from developer. Progressive payment during construction.',
    icon: <Building2 className="w-8 h-8" />,
    color: 'from-sky-500/20 to-sky-600/5',
    accentColor: 'text-sky-400',
    priceRange: '$1.5M - $4M+',
    highlights: ['Brand new', 'Progressive payment', 'Developer warranty']
  }
]

// ============================================
// DEFAULT VALUES BY PROPERTY TYPE
// ============================================

const defaultInputsByType: Record<PropertyType, MortgageInputs> = {
  'hdb-resale': {
    // $600K price, $580K valuation ($20K COV), 80% loan on valuation ($464K)
    // Downpayment on valuation: $116K, COV: $20K (cash only)
    propertyPrice: 600000,
    valuationPrice: 580000, // COV of $20K
    loanAmount: 464000, // 80% of valuation
    loanType: 'hdb',
    downpaymentCpfOa: 85000, // Use all available CPF OA for downpayment (not COV)
    downpaymentCash: 31000, // Remaining downpayment after CPF ($116K - $85K)
    loanTermYears: 25,
    loanStartMonth: '2025-06',
    fixedYears: 0,
    fixedRate: 2.6,
    floatingRate: 2.6,
    householdIncome: 8500,
    otherDebt: 0,
    borrowerType: 'single',
    cpfOaBalance: 85000,
    monthlyCpfOa: 1785,
    grants: 50000,
    borrower1IncomeId: 'income-1',
    borrower1OaBalance: 85000,
    borrower1LiabilityIds: [],
    borrower2IncomeId: null,
    borrower2OaBalance: 0,
    borrower2LiabilityIds: [],
    purchaseFees: DEFAULT_PURCHASE_FEES.map(f => ({ ...f })),
    absdRate: 0,
  },
  'hdb-bto': {
    // BTO: No COV (valuation = price)
    // $450K property, 80% loan ($360K), 20% downpayment ($90K)
    propertyPrice: 450000,
    valuationPrice: 450000, // No COV for new properties
    loanAmount: 360000,
    loanType: 'hdb',
    downpaymentCpfOa: 85000, // Use all available CPF OA
    downpaymentCash: 5000, // Minimal cash needed
    loanTermYears: 25,
    loanStartMonth: '2029-06',
    fixedYears: 0,
    fixedRate: 2.6,
    floatingRate: 2.6,
    householdIncome: 8500,
    otherDebt: 0,
    borrowerType: 'single',
    cpfOaBalance: 85000,
    monthlyCpfOa: 1785,
    grants: 80000,
    borrower1IncomeId: 'income-1',
    borrower1OaBalance: 85000,
    borrower1LiabilityIds: [],
    borrower2IncomeId: null,
    borrower2OaBalance: 0,
    borrower2LiabilityIds: [],
    purchaseFees: DEFAULT_PURCHASE_FEES.map(f => ({ ...f })),
    absdRate: 0,
  },
  'ec': {
    // EC (new): No COV (valuation = price)
    // $1.2M property, 75% loan ($900K), 25% downpayment ($300K)
    propertyPrice: 1200000,
    valuationPrice: 1200000, // No COV for new properties
    loanAmount: 900000,
    loanType: 'bank',
    downpaymentCpfOa: 147400, // Use all available CPF OA (below 20% limit)
    downpaymentCash: 152600, // Remaining: $300K - $147.4K
    loanTermYears: 30,
    loanStartMonth: '2028-06',
    fixedYears: 3,
    fixedRate: 3.0,
    floatingRate: 4.0,
    householdIncome: 14700,
    otherDebt: 1400,
    borrowerType: 'joint',
    cpfOaBalance: 147400,
    monthlyCpfOa: 3087,
    grants: 30000,
    borrower1IncomeId: 'income-1',
    borrower1OaBalance: 85000,
    borrower1LiabilityIds: ['liability-2', 'liability-3'],
    borrower2IncomeId: 'income-2',
    borrower2OaBalance: 62400,
    borrower2LiabilityIds: ['liability-4'],
    purchaseFees: DEFAULT_PURCHASE_FEES.map(f => ({ ...f })),
    absdRate: 0,
  },
  'private-resale': {
    // $1.8M price, $1.75M valuation ($50K COV)
    // 75% loan on valuation ($1.3125M), downpayment: $437.5K + COV $50K
    propertyPrice: 1800000,
    valuationPrice: 1750000, // COV of $50K
    loanAmount: 1312500, // 75% of valuation
    loanType: 'bank',
    downpaymentCpfOa: 147400, // Use all available CPF OA
    downpaymentCash: 290100, // Remaining downpayment ($437.5K - $147.4K)
    loanTermYears: 30,
    loanStartMonth: '2025-06',
    fixedYears: 3,
    fixedRate: 3.2,
    floatingRate: 4.0,
    householdIncome: 14700,
    otherDebt: 1400,
    borrowerType: 'joint',
    cpfOaBalance: 147400,
    monthlyCpfOa: 3087,
    grants: 0,
    borrower1IncomeId: 'income-1',
    borrower1OaBalance: 85000,
    borrower1LiabilityIds: ['liability-2', 'liability-3'],
    borrower2IncomeId: 'income-2',
    borrower2OaBalance: 62400,
    borrower2LiabilityIds: ['liability-4'],
    purchaseFees: DEFAULT_PURCHASE_FEES.map(f => ({ ...f })),
    absdRate: 0,
  },
  'private-new': {
    // New launch: No COV (valuation = price)
    // $2M property, 75% loan ($1.5M), 25% downpayment ($500K)
    propertyPrice: 2000000,
    valuationPrice: 2000000, // No COV for new properties
    loanAmount: 1500000,
    loanType: 'bank',
    downpaymentCpfOa: 147400, // Use all available CPF OA
    downpaymentCash: 352600, // Remaining: $500K - $147.4K
    loanTermYears: 30,
    loanStartMonth: '2028-06',
    fixedYears: 3,
    fixedRate: 3.2,
    floatingRate: 4.0,
    householdIncome: 14700,
    otherDebt: 1400,
    borrowerType: 'joint',
    cpfOaBalance: 147400,
    monthlyCpfOa: 3087,
    grants: 0,
    borrower1IncomeId: 'income-1',
    borrower1OaBalance: 85000,
    borrower1LiabilityIds: ['liability-2', 'liability-3'],
    borrower2IncomeId: 'income-2',
    borrower2OaBalance: 62400,
    borrower2LiabilityIds: ['liability-4'],
    purchaseFees: DEFAULT_PURCHASE_FEES.map(f => ({ ...f })),
    absdRate: 0,
  },
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

function formatCurrency(amount: number): string {
  if (amount >= 1000000) {
    return `$${(amount / 1000000).toFixed(2)}M`
  }
  return new Intl.NumberFormat('en-SG', {
    style: 'currency',
    currency: 'SGD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

function formatMonthYear(dateString: string): string {
  // Input: "YYYY-MM" format, Output: "MMM YYYY" format (e.g., "Jun 2025")
  const [year, month] = dateString.split('-')
  const date = new Date(parseInt(year), parseInt(month) - 1)
  return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
}

function calculateMortgage(inputs: MortgageInputs) {
  const {
    loanAmount,
    loanTermYears,
    fixedYears,
    fixedRate,
    floatingRate,
    householdIncome,
    otherDebt,
    loanStartMonth,
    cpfOaBalance,
    monthlyCpfOa,
    grants,
    propertyPrice,
    valuationPrice,
    downpaymentCpfOa,
    downpaymentCash,
    loanType,
  } = inputs

  // Cash Over Valuation (only for resale properties where price > valuation)
  const cov = Math.max(0, propertyPrice - valuationPrice)

  const totalMonths = loanTermYears * 12
  const fixedMonths = Math.min(fixedYears * 12, totalMonths)
  const floatingMonths = totalMonths - fixedMonths

  // Calculate weighted average rate
  const weightedRate = fixedMonths > 0
    ? ((fixedRate * fixedMonths + floatingRate * floatingMonths) / totalMonths) / 100 / 12
    : floatingRate / 100 / 12

  // Calculate monthly payment
  const monthlyPayment = weightedRate > 0
    ? loanAmount * (weightedRate * Math.pow(1 + weightedRate, totalMonths)) /
      (Math.pow(1 + weightedRate, totalMonths) - 1)
    : loanAmount / totalMonths

  const totalInterest = monthlyPayment * totalMonths - loanAmount
  // MSR: Only property loan repayments / gross income (capped at 30% for HDB/EC)
  const msrRatio = householdIncome > 0
    ? Math.min(monthlyPayment / householdIncome, 1.5)
    : 0
  // TDSR: All debt obligations (property + other debt) / gross income (capped at 55%)
  const tdsrRatio = householdIncome > 0
    ? Math.min((monthlyPayment + otherDebt) / householdIncome, 1.5)
    : 0

  const downpayment = propertyPrice - loanAmount

  // Calculate loan start and end dates
  const startDate = new Date(loanStartMonth + '-01')
  const endDate = new Date(startDate)
  endDate.setMonth(endDate.getMonth() + totalMonths)
  const loanStartDate = loanStartMonth // Already in YYYY-MM format
  const loanEndDate = endDate.toISOString().slice(0, 7)

  // Generate amortization schedule
  const amortization: AmortizationYear[] = []
  let remainingBalance = loanAmount
  let totalPaid = 0
  const monthlyRate = weightedRate

  for (let year = 1; year <= loanTermYears; year++) {
    let yearlyInterest = 0
    let yearlyPrincipal = 0

    for (let month = 1; month <= 12; month++) {
      if ((year - 1) * 12 + month > totalMonths) break

      const interestPayment = remainingBalance * monthlyRate
      const principalPayment = monthlyPayment - interestPayment

      yearlyInterest += interestPayment
      yearlyPrincipal += principalPayment
      remainingBalance = Math.max(0, remainingBalance - principalPayment)
      totalPaid += monthlyPayment
    }

    amortization.push({
      year,
      principal: yearlyPrincipal,
      interest: yearlyInterest,
      balance: Math.max(0, remainingBalance),
      totalPaid,
    })
  }

  // Estimate CPF depletion
  let cpfBalance = cpfOaBalance + grants
  let cpfRunsOutMonth: number | null = null

  for (let month = 1; month <= totalMonths; month++) {
    cpfBalance += monthlyCpfOa
    cpfBalance -= monthlyPayment
    if (cpfBalance < 0 && cpfRunsOutMonth === null) {
      cpfRunsOutMonth = month
      break
    }
  }

  // Calculate minimum cash requirement based on loan type
  const minCashRequired = loanType === 'hdb' ? 0 : Math.round(propertyPrice * 0.05)
  const maxCpfAllowed = loanType === 'hdb' ? downpayment : Math.round(propertyPrice * 0.20)

  // Calculate purchase fees
  const calculatedPurchaseFees = inputs.purchaseFees
    .filter(fee => fee.enabled)
    .map(fee => ({
      item: fee,
      amount: fee.type === 'percentage'
        ? Math.round(propertyPrice * (fee.value / 100))
        : fee.value,
    }))
  const totalPurchaseFees = calculatedPurchaseFees.reduce((sum, f) => sum + f.amount, 0)

  // Calculate BSD (Buyer's Stamp Duty) - progressive rates for residential
  const calculateBsd = (price: number): number => {
    let bsd = 0
    if (price > 0) bsd += Math.min(price, 180000) * 0.01          // 1% on first $180K
    if (price > 180000) bsd += Math.min(price - 180000, 180000) * 0.02  // 2% on next $180K
    if (price > 360000) bsd += Math.min(price - 360000, 640000) * 0.03  // 3% on next $640K
    if (price > 1000000) bsd += Math.min(price - 1000000, 500000) * 0.04 // 4% on next $500K
    if (price > 1500000) bsd += Math.min(price - 1500000, 1500000) * 0.05 // 5% on next $1.5M
    if (price > 3000000) bsd += (price - 3000000) * 0.06           // 6% on remainder
    return Math.round(bsd)
  }
  const bsdAmount = calculateBsd(propertyPrice)

  // Calculate ABSD (Additional Buyer's Stamp Duty) - user-entered rate
  const absdAmount = Math.round(propertyPrice * (inputs.absdRate / 100))

  // Total upfront cash needed (includes ABSD)
  const totalUpfrontCash = downpaymentCash + bsdAmount + absdAmount + totalPurchaseFees + cov

  return {
    monthlyPayment,
    totalInterest,
    msrRatio,
    tdsrRatio,
    loanStartDate,
    loanEndDate,
    loanTermYears,
    amortization,
    downpayment,
    downpaymentBreakdown: {
      cpfOa: downpaymentCpfOa,
      cash: downpaymentCash,
      minCashRequired,
      maxCpfAllowed,
    },
    cpfRunsOutMonth,
    // Purchase costs
    bsdAmount,
    absdAmount,
    calculatedPurchaseFees,
    totalPurchaseFees,
    cov,
    totalUpfrontCash,
  }
}

/**
 * Calculate Seller's Stamp Duty rate based on holding period
 * SSD applies only if selling within 4 years of purchase
 */
function calculateSsdRate(holdingPeriodMonths: number): number {
  const years = holdingPeriodMonths / 12
  if (years < 1) return 0.16      // 16% within 1 year
  if (years < 2) return 0.12      // 12% within 2 years
  if (years < 3) return 0.08      // 8% within 3 years
  if (years < 4) return 0.04      // 4% within 4 years
  return 0                         // 0% after 4 years
}

/**
 * Calculate CPF accrued interest at 2.5% p.a. compound
 */
function calculateCpfAccruedInterest(principal: number, months: number): number {
  const years = months / 12
  const rate = 0.025  // 2.5% per annum
  return principal * (Math.pow(1 + rate, years) - 1)
}

/**
 * Calculate fee amount based on type and base price
 */
function calculateFeeAmount(fee: FeeItem, basePrice: number): number {
  if (!fee.enabled) return 0
  if (fee.type === 'percentage') {
    return basePrice * (fee.value / 100)
  }
  return fee.value
}

/**
 * Calculate sale proceeds based on sale inputs and mortgage state
 */
function calculateSaleProceeds(
  saleInputs: SaleInputs,
  mortgageInputs: MortgageInputs,
  amortization: AmortizationYear[],
  monthlyPayment: number
): SaleResult {
  const { expectedSaleDate, expectedSalePrice, fees } = saleInputs
  const { loanStartMonth, downpaymentCpfOa, monthlyCpfOa, loanAmount } = mortgageInputs

  // Calculate holding period
  const startDate = new Date(loanStartMonth + '-01')
  const saleDate = new Date(expectedSaleDate + '-01')
  const holdingPeriodMonths = Math.max(0,
    (saleDate.getFullYear() - startDate.getFullYear()) * 12 +
    (saleDate.getMonth() - startDate.getMonth())
  )
  const holdingPeriodYears = holdingPeriodMonths / 12

  // Find outstanding loan at sale date from amortization schedule
  const saleYear = Math.ceil(holdingPeriodMonths / 12)
  let outstandingLoanAtSale = loanAmount

  if (saleYear > 0 && saleYear <= amortization.length) {
    outstandingLoanAtSale = amortization[saleYear - 1]?.balance ?? 0
  } else if (saleYear > amortization.length) {
    outstandingLoanAtSale = 0  // Loan fully paid
  }

  // Calculate cumulative CPF used for mortgage payments
  // CPF used = downpayment CPF + monthly CPF payments (up to monthly payment amount)
  const monthsOfPayments = Math.min(holdingPeriodMonths, amortization.length * 12)

  // Estimate monthly CPF used for mortgage (min of monthly CPF inflow and monthly payment)
  const monthlyMortgageCpfUsed = Math.min(monthlyCpfOa, monthlyPayment)
  const cumulativeCpfForPayments = monthlyMortgageCpfUsed * monthsOfPayments

  const totalCpfPrincipalUsed = downpaymentCpfOa + cumulativeCpfForPayments
  const cpfAccruedInterest = calculateCpfAccruedInterest(totalCpfPrincipalUsed, holdingPeriodMonths)
  const totalCpfRefund = totalCpfPrincipalUsed + cpfAccruedInterest

  // Calculate SSD
  const ssdRate = calculateSsdRate(holdingPeriodMonths)
  const ssdAmount = expectedSalePrice * ssdRate

  // Calculate all fees from the fees array
  const calculatedFees = fees.map(fee => ({
    item: fee,
    amount: calculateFeeAmount(fee, expectedSalePrice),
  }))
  const totalFees = calculatedFees.reduce((sum, f) => sum + f.amount, 0)

  // Calculate proceeds
  const grossProceeds = expectedSalePrice - outstandingLoanAtSale
  const netCashProceeds = grossProceeds - totalCpfRefund - ssdAmount - totalFees

  return {
    holdingPeriodMonths,
    holdingPeriodYears,
    outstandingLoanAtSale,
    cpfRefund: {
      principalUsed: totalCpfPrincipalUsed,
      accruedInterest: cpfAccruedInterest,
      total: totalCpfRefund,
    },
    ssd: {
      applicable: ssdRate > 0,
      rate: ssdRate * 100,  // Convert to percentage
      amount: ssdAmount,
    },
    calculatedFees,
    totalFees,
    grossProceeds,
    netCashProceeds,
    cpfRefundedToOa: totalCpfRefund,
  }
}

// ============================================
// COMPONENTS
// ============================================

function FeeEditor({
  fees,
  onFeesChange,
  basePrice,
  title = "Fees & Expenses"
}: {
  fees: FeeItem[]
  onFeesChange: (fees: FeeItem[]) => void
  basePrice: number
  title?: string
}) {
  const [newFeeName, setNewFeeName] = useState('')
  const [newFeeType, setNewFeeType] = useState<'percentage' | 'fixed'>('fixed')
  const [newFeeValue, setNewFeeValue] = useState('')

  const handleToggleFee = (id: string) => {
    onFeesChange(fees.map(fee =>
      fee.id === id ? { ...fee, enabled: !fee.enabled } : fee
    ))
  }

  const handleUpdateFee = (id: string, updates: Partial<FeeItem>) => {
    onFeesChange(fees.map(fee =>
      fee.id === id ? { ...fee, ...updates } : fee
    ))
  }

  const handleDeleteFee = (id: string) => {
    onFeesChange(fees.filter(fee => fee.id !== id))
  }

  const handleAddFee = () => {
    if (!newFeeName.trim() || !newFeeValue) return

    const newFee: FeeItem = {
      id: `custom-${Date.now()}`,
      name: newFeeName.trim(),
      type: newFeeType,
      value: parseFloat(newFeeValue),
      enabled: true
    }
    onFeesChange([...fees, newFee])
    setNewFeeName('')
    setNewFeeValue('')
  }

  const totalFees = fees.reduce((sum, fee) => {
    return sum + calculateFeeAmount(fee, basePrice)
  }, 0)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium text-white/80">{title}</h4>
        <span className="text-sm text-white/60">
          Total: ${totalFees.toLocaleString()}
        </span>
      </div>

      {/* Existing fees */}
      <div className="space-y-2">
        {fees.map((fee) => {
          const amount = calculateFeeAmount(fee, basePrice)
          return (
            <div
              key={fee.id}
              className={cn(
                "p-3 rounded-lg border transition-all",
                fee.enabled
                  ? "bg-white/5 border-white/10"
                  : "bg-white/[0.02] border-white/5"
              )}
            >
              {/* Top row: toggle, name, delete */}
              <div className="flex items-center gap-3 mb-2">
                {/* Toggle - always clickable */}
                <button
                  type="button"
                  onClick={() => handleToggleFee(fee.id)}
                  className={cn(
                    "w-5 h-5 rounded border-2 flex items-center justify-center transition-colors shrink-0",
                    fee.enabled
                      ? "bg-indigo-500 border-indigo-500"
                      : "bg-transparent border-white/30 hover:border-white/50"
                  )}
                >
                  {fee.enabled && <Check className="w-3 h-3 text-white" />}
                </button>

                {/* Fee name - editable */}
                <input
                  type="text"
                  value={fee.name}
                  onChange={(e) => handleUpdateFee(fee.id, { name: e.target.value })}
                  disabled={!fee.enabled}
                  className={cn(
                    "flex-1 min-w-0 bg-transparent text-sm focus:outline-none",
                    fee.enabled ? "text-white/90" : "text-white/40"
                  )}
                />

                {/* Delete button */}
                <button
                  type="button"
                  onClick={() => handleDeleteFee(fee.id)}
                  className="p-1 hover:bg-white/10 rounded transition-colors shrink-0"
                >
                  <X className="w-4 h-4 text-white/40 hover:text-red-400" />
                </button>
              </div>

              {/* Bottom row: type, value, calculated amount */}
              {fee.enabled && (
                <div className="flex items-center gap-2 pl-8">
                  {/* Type selector */}
                  <select
                    value={fee.type}
                    onChange={(e) => handleUpdateFee(fee.id, { type: e.target.value as 'percentage' | 'fixed' })}
                    className="bg-white/10 text-xs text-white/70 rounded px-2 py-1 border border-white/10"
                  >
                    <option value="percentage">%</option>
                    <option value="fixed">Fixed</option>
                  </select>

                  {/* Value input */}
                  <div className="flex items-center gap-1">
                    {fee.type === 'fixed' && <span className="text-white/50 text-xs">$</span>}
                    <input
                      type="number"
                      value={fee.value}
                      onChange={(e) => handleUpdateFee(fee.id, { value: parseFloat(e.target.value) || 0 })}
                      className="w-16 bg-white/10 text-sm text-white text-right rounded px-2 py-1 border border-white/10"
                    />
                    {fee.type === 'percentage' && <span className="text-white/50 text-xs">%</span>}
                  </div>

                  {/* Calculated amount */}
                  <span className="text-xs text-white/50 ml-auto">
                    = ${amount.toLocaleString()}
                  </span>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Add new fee */}
      <div className="space-y-2 pt-2 border-t border-white/10">
        <input
          type="text"
          value={newFeeName}
          onChange={(e) => setNewFeeName(e.target.value)}
          placeholder="New fee name..."
          className="w-full bg-white/5 text-sm text-white placeholder:text-white/30 rounded-lg px-3 py-2 border border-white/10"
        />
        <div className="flex items-center gap-2">
          <select
            value={newFeeType}
            onChange={(e) => setNewFeeType(e.target.value as 'percentage' | 'fixed')}
            className="bg-white/10 text-xs text-white/70 rounded px-2 py-2 border border-white/10"
          >
            <option value="percentage">%</option>
            <option value="fixed">Fixed</option>
          </select>
          <div className="flex items-center gap-1 flex-1">
            {newFeeType === 'fixed' && <span className="text-white/50 text-sm">$</span>}
            <input
              type="number"
              value={newFeeValue}
              onChange={(e) => setNewFeeValue(e.target.value)}
              placeholder="0"
              className="w-full bg-white/5 text-sm text-white text-right rounded-lg px-2 py-2 border border-white/10"
            />
            {newFeeType === 'percentage' && <span className="text-white/50 text-sm">%</span>}
          </div>
          <button
            type="button"
            onClick={handleAddFee}
            disabled={!newFeeName.trim() || !newFeeValue}
            className={cn(
              "p-2 rounded-lg transition-colors shrink-0",
              newFeeName.trim() && newFeeValue
                ? "bg-indigo-500 hover:bg-indigo-600 text-white"
                : "bg-white/5 text-white/30 cursor-not-allowed"
            )}
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  )
}

// Waterfall chart for upfront costs
interface WaterfallItem {
  name: string
  amount: number
  color: string
  isTotal?: boolean
}

function UpfrontCostsWaterfall({ items }: { items: WaterfallItem[] }) {
  // Calculate cumulative values for vertical waterfall positioning
  let cumulative = 0
  const waterfallData = items.map((item, index) => {
    const start = item.isTotal ? 0 : cumulative
    const end = item.isTotal ? item.amount : cumulative + item.amount
    if (!item.isTotal) cumulative += item.amount
    return {
      ...item,
      start,
      end,
      index,
    }
  })

  const maxValue = Math.max(...waterfallData.map(d => Math.max(d.start, d.end)))
  const chartHeight = 180

  return (
    <div className="space-y-3">
      {/* Vertical waterfall chart */}
      <div className="flex items-end gap-1 justify-between" style={{ height: chartHeight }}>
        {waterfallData.map((item) => {
          const bottomPercent = (item.start / maxValue) * 100
          const heightPercent = (Math.abs(item.end - item.start) / maxValue) * 100

          return (
            <div key={item.name} className="flex-1 flex flex-col items-center relative h-full">
              {/* Bar container */}
              <div className="relative w-full h-full">
                {/* The floating bar */}
                <div
                  className={cn(
                    "absolute left-1 right-1 rounded-t transition-all",
                    item.color,
                    item.isTotal && "rounded-b"
                  )}
                  style={{
                    bottom: `${bottomPercent}%`,
                    height: `${Math.max(heightPercent, 2)}%`,
                  }}
                />
                {/* Connector line from previous bar's top to this bar's bottom */}
                {!item.isTotal && item.index > 0 && (
                  <div
                    className="absolute left-0 right-1/2 border-t border-dashed border-white/20"
                    style={{ bottom: `${bottomPercent}%` }}
                  />
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* X-axis labels */}
      <div className="flex gap-1 justify-between">
        {waterfallData.map((item) => (
          <div key={item.name} className="flex-1 text-center">
            <p className={cn(
              "text-[10px] truncate px-0.5",
              item.isTotal ? "font-medium text-white" : "text-slate-500"
            )}>
              {item.name}
            </p>
            <p className={cn(
              "text-xs tabular-nums",
              item.isTotal ? "font-semibold text-white" : "text-slate-300"
            )}>
              ${item.amount.toLocaleString()}
            </p>
          </div>
        ))}
      </div>
    </div>
  )
}

type AccordionColor = 'rose' | 'violet' | 'emerald' | 'amber'

const accordionColors: Record<AccordionColor, { border: string; indicator: string; hover: string }> = {
  rose: {
    border: 'border-l-rose-500/50',
    indicator: 'bg-rose-500',
    hover: 'hover:bg-rose-500/5',
  },
  violet: {
    border: 'border-l-violet-500/50',
    indicator: 'bg-violet-500',
    hover: 'hover:bg-violet-500/5',
  },
  emerald: {
    border: 'border-l-emerald-500/50',
    indicator: 'bg-emerald-500',
    hover: 'hover:bg-emerald-500/5',
  },
  amber: {
    border: 'border-l-amber-500/50',
    indicator: 'bg-amber-500',
    hover: 'hover:bg-amber-500/5',
  },
}

function FormAccordion({
  title,
  subtitle,
  children,
  defaultOpen = true,
  badge,
  color = 'violet',
}: {
  title: string
  subtitle?: string
  children: React.ReactNode
  defaultOpen?: boolean
  badge?: React.ReactNode
  color?: AccordionColor
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen)
  const colorStyles = accordionColors[color]

  return (
    <div className={cn(
      "rounded-xl border border-white/[0.06] bg-white/[0.02] overflow-hidden",
      "border-l-2",
      colorStyles.border
    )}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "w-full px-4 py-3 flex items-center justify-between transition-colors",
          colorStyles.hover
        )}
      >
        <div className="flex items-center gap-3">
          <div className={cn("w-1.5 h-1.5 rounded-full", colorStyles.indicator)} />
          <div className="text-left">
            <span className="text-sm font-medium text-white">{title}</span>
            {subtitle && (
              <span className="text-xs text-slate-500 ml-2">{subtitle}</span>
            )}
          </div>
          {badge}
        </div>
        <motion.div
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.2 }}
        >
          <ChevronDown className="w-4 h-4 text-slate-500" />
        </motion.div>
      </button>
      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 pt-1 border-t border-white/[0.04]">
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function PropertyCard({
  option,
  isSelected,
  onClick
}: {
  option: PropertyOption
  isSelected: boolean
  onClick: () => void
}) {
  return (
    <motion.button
      onClick={onClick}
      className={cn(
        "relative group text-left w-full rounded-2xl border transition-all duration-200",
        "bg-white/[0.02] backdrop-blur-xl p-6",
        isSelected
          ? "border-white/20 bg-white/[0.05] shadow-lg shadow-black/40"
          : "border-white/[0.06] hover:border-white/[0.12] hover:bg-white/[0.04]"
      )}
      whileHover={{ y: -4, transition: { duration: 0.2 } }}
      whileTap={{ scale: 0.98 }}
    >
      {/* Icon with gradient background */}
      <div className={cn(
        "w-12 h-12 rounded-xl flex items-center justify-center mb-4",
        "bg-gradient-to-br shadow-lg",
        option.color
      )}>
        <span className={option.accentColor}>
          {option.icon}
        </span>
      </div>

      <h3 className="text-lg font-semibold text-white mb-1 tracking-tight">
        {option.title}
      </h3>
      <p className={cn("text-sm font-medium mb-3", option.accentColor)}>
        {option.subtitle}
      </p>
      <p className="text-sm text-slate-400 mb-4 leading-relaxed line-clamp-2">
        {option.description}
      </p>

      {/* Price range badge */}
      <div className="flex items-center gap-2 mb-4">
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/[0.04] text-xs font-medium text-slate-300">
          <Banknote className="w-3.5 h-3.5 text-slate-500" />
          {option.priceRange}
        </span>
      </div>

      {/* Highlights */}
      <div className="flex flex-wrap gap-1.5">
        {option.highlights.map((h, i) => (
          <span
            key={i}
            className="text-xs px-2 py-0.5 rounded-md bg-white/[0.03] text-slate-500 border border-white/[0.04]"
          >
            {h}
          </span>
        ))}
      </div>

      {/* Selected indicator */}
      <AnimatePresence>
        {isSelected && (
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            className="absolute top-4 right-4"
          >
            <div className={cn(
              "w-6 h-6 rounded-full flex items-center justify-center",
              "bg-gradient-to-br shadow-lg",
              option.color
            )}>
              <CheckCircle2 className="w-4 h-4 text-white" />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.button>
  )
}

const formatCompactCurrency = (value: number) =>
  new Intl.NumberFormat('en-SG', {
    style: 'currency',
    currency: 'SGD',
    notation: 'compact',
    maximumFractionDigits: 1,
    minimumFractionDigits: 0,
  }).format(value)

type ChartView = 'balance' | 'composition' | 'schedule'

function AmortizationChart({
  amortization,
}: {
  amortization: AmortizationYear[]
  accentColor: string
}) {
  const [chartView, setChartView] = useState<ChartView>('balance')
  const [showAllYears, setShowAllYears] = useState(false)

  if (amortization.length === 0) return null

  const displayYears = showAllYears ? amortization : amortization.slice(0, 5)

  const maxBalance = amortization[0]?.balance || 1
  const years = amortization.length

  // Prepare data for charts
  const balanceData = amortization.map(item => ({
    yearIndex: item.year,
    balance: item.balance,
  }))

  const compositionData = amortization.map(item => ({
    yearIndex: item.year,
    principal: item.principal,
    interest: item.interest,
  }))

  const yearTicks = amortization.map(item => item.year)
  const balanceDomain: [number, number] = [
    Math.max(0, (yearTicks[0] ?? 0) - 0.5),
    (yearTicks[yearTicks.length - 1] ?? 1) + 0.5,
  ]

  return (
    <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] backdrop-blur-xl overflow-hidden">
      <div className="px-6 py-4 border-b border-white/[0.04]">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              {chartView === 'balance' ? (
                <TrendingDown className="w-4 h-4 text-slate-500" />
              ) : (
                <Percent className="w-4 h-4 text-slate-500" />
              )}
              <h4 className="text-sm font-medium text-white">
                {chartView === 'balance' ? 'Loan Balance Over Time' : 'Interest vs Principal'}
              </h4>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              {chartView === 'balance'
                ? `${formatCurrency(maxBalance)} → $0`
                : 'Annual payment composition breakdown'
              }
            </p>
          </div>

          {/* Toggle */}
          <div className="flex items-center gap-1 p-0.5 bg-white/[0.04] rounded-lg">
            <button
              onClick={() => setChartView('balance')}
              className={cn(
                "px-2.5 py-1 text-xs font-medium rounded-md transition-colors",
                chartView === 'balance'
                  ? "bg-white/10 text-white"
                  : "text-slate-500 hover:text-slate-300"
              )}
            >
              Balance
            </button>
            <button
              onClick={() => setChartView('composition')}
              className={cn(
                "px-2.5 py-1 text-xs font-medium rounded-md transition-colors",
                chartView === 'composition'
                  ? "bg-white/10 text-white"
                  : "text-slate-500 hover:text-slate-300"
              )}
            >
              Breakdown
            </button>
            <button
              onClick={() => setChartView('schedule')}
              className={cn(
                "px-2.5 py-1 text-xs font-medium rounded-md transition-colors",
                chartView === 'schedule'
                  ? "bg-white/10 text-white"
                  : "text-slate-500 hover:text-slate-300"
              )}
            >
              Schedule
            </button>
          </div>
        </div>
      </div>

      <div className="p-4">
        <div className="rounded-xl bg-black/20 p-3" style={{ minHeight: 220 }}>
          <AnimatePresence mode="wait">
            {chartView === 'balance' && (
              <motion.div
                key="balance"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
              >
                <ResponsiveContainer width="100%" height={200}>
                  <AreaChart data={balanceData} margin={{ bottom: 24, left: 8, right: 8, top: 8 }}>
                    <defs>
                      <linearGradient id="loanBalanceGradient" x1="0" x2="0" y1="0" y2="1">
                        <stop offset="5%" stopColor="#60A5FA" stopOpacity={0.5} />
                        <stop offset="95%" stopColor="#60A5FA" stopOpacity={0.02} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid stroke="rgba(255,255,255,0.04)" strokeDasharray="3 3" />
                    <XAxis
                      dataKey="yearIndex"
                      type="number"
                      domain={balanceDomain}
                      ticks={yearTicks.filter((_, i) => i % Math.ceil(years / 6) === 0 || i === years - 1)}
                      allowDecimals={false}
                      stroke="#64748b"
                      fontSize={10}
                      tickMargin={8}
                      tickFormatter={(value) => `Y${value}`}
                    />
                    <YAxis
                      stroke="#64748b"
                      fontSize={10}
                      tickFormatter={(value) => formatCompactCurrency(value as number)}
                      width={50}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'rgba(15, 23, 40, 0.95)',
                        border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: '12px',
                        backdropFilter: 'blur(12px)',
                      }}
                      labelFormatter={(value) => `Year ${value}`}
                      formatter={(value: number) => [formatCurrency(value), 'Balance']}
                    />
                    <Area
                      dataKey="balance"
                      type="monotone"
                      stroke="#3B82F6"
                      strokeWidth={2}
                      fill="url(#loanBalanceGradient)"
                      name="Remaining Balance"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </motion.div>
            )}
            {chartView === 'composition' && (
              <motion.div
                key="composition"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
              >
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={compositionData} barCategoryGap="20%" barGap={2} margin={{ bottom: 24, left: 8, right: 8, top: 8 }}>
                    <CartesianGrid stroke="rgba(255,255,255,0.04)" strokeDasharray="3 3" />
                    <XAxis
                      dataKey="yearIndex"
                      type="number"
                      domain={balanceDomain}
                      ticks={yearTicks.filter((_, i) => i % Math.ceil(years / 6) === 0 || i === years - 1)}
                      allowDecimals={false}
                      stroke="#64748b"
                      fontSize={10}
                      tickMargin={8}
                      tickFormatter={(value) => `Y${value}`}
                    />
                    <YAxis
                      stroke="#64748b"
                      fontSize={10}
                      tickFormatter={(value) => formatCompactCurrency(value as number)}
                      width={50}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'rgba(15, 23, 40, 0.95)',
                        border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: '12px',
                        backdropFilter: 'blur(12px)',
                      }}
                      labelFormatter={(value) => `Year ${value}`}
                      formatter={(value: number, name) => [
                        formatCurrency(value),
                        name === 'interest' ? 'Interest' : 'Principal',
                      ]}
                    />
                    <Legend
                      wrapperStyle={{ paddingTop: 8, fontSize: '11px' }}
                      formatter={(value) => value === 'interest' ? 'Interest' : 'Principal'}
                    />
                    <Bar dataKey="interest" stackId="payments" fill="rgba(248, 113, 113, 0.7)" name="interest" radius={[2, 2, 0, 0]} />
                    <Bar dataKey="principal" stackId="payments" fill="rgba(59, 130, 246, 0.6)" name="principal" radius={[2, 2, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </motion.div>
            )}
            {chartView === 'schedule' && (
              <motion.div
                key="schedule"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
                className="overflow-hidden"
              >
                <div className="overflow-x-auto max-h-[200px] overflow-y-auto">
                  <table className="w-full text-xs">
                    <thead className="sticky top-0 bg-black/60 backdrop-blur-sm">
                      <tr className="text-slate-500 border-b border-white/[0.04]">
                        <th className="text-left px-4 py-2 font-medium">Year</th>
                        <th className="text-right px-4 py-2 font-medium">Principal</th>
                        <th className="text-right px-4 py-2 font-medium">Interest</th>
                        <th className="text-right px-4 py-2 font-medium">Balance</th>
                      </tr>
                    </thead>
                    <tbody>
                      {displayYears.map((year, index) => (
                        <tr
                          key={year.year}
                          className={cn(
                            "border-b border-white/[0.03] transition-colors hover:bg-white/[0.02]",
                            index === displayYears.length - 1 && "border-b-0"
                          )}
                        >
                          <td className="px-4 py-2 text-white font-medium">{year.year}</td>
                          <td className="px-4 py-2 text-right text-blue-400">
                            {formatCurrency(year.principal)}
                          </td>
                          <td className="px-4 py-2 text-right text-red-400">
                            {formatCurrency(year.interest)}
                          </td>
                          <td className="px-4 py-2 text-right text-slate-400">
                            {formatCurrency(year.balance)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {amortization.length > 5 && (
                  <button
                    onClick={() => setShowAllYears(!showAllYears)}
                    className="w-full py-2 text-xs font-medium text-slate-500 hover:text-white transition-colors border-t border-white/[0.04] hover:bg-white/[0.02]"
                  >
                    {showAllYears ? 'Show less' : `Show all ${amortization.length} years`}
                  </button>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  )
}

// Reusable input component for consistent styling
function FormInput({
  label,
  value,
  onChange,
  prefix,
  suffix,
  type = 'text',
  inputMode = 'numeric',
  min,
  max,
  step,
  helperText,
}: {
  label: string
  value: string | number
  onChange: (value: string) => void
  prefix?: string
  suffix?: string
  type?: 'text' | 'number' | 'month'
  inputMode?: 'numeric' | 'text'
  min?: number
  max?: number
  step?: number
  helperText?: string
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-medium text-slate-400 block">{label}</label>
      <div className="relative">
        {prefix && (
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-medium">
            {prefix}
          </span>
        )}
        <input
          type={type}
          inputMode={type === 'text' ? inputMode : undefined}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          min={min}
          max={max}
          step={step}
          className={cn(
            "w-full rounded-xl bg-white/[0.05] border border-white/[0.10] text-white text-sm",
            "py-2.5 transition-all duration-200",
            "hover:border-white/[0.15] hover:bg-white/[0.06]",
            "focus:outline-none focus:border-white/30 focus:bg-white/[0.08] focus:ring-1 focus:ring-white/10",
            "placeholder:text-slate-500",
            prefix ? "pl-7" : "px-3",
            suffix ? "pr-10" : "pr-3"
          )}
        />
        {suffix && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs">
            {suffix}
          </span>
        )}
      </div>
      {helperText && (
        <p className="text-[10px] text-slate-500">{helperText}</p>
      )}
    </div>
  )
}

type FormStep = 'property' | 'borrowers' | 'financing' | 'terms'

const FORM_STEPS: { id: FormStep; label: string; icon: string }[] = [
  { id: 'property', label: 'Property', icon: '🏠' },
  { id: 'borrowers', label: 'Borrowers', icon: '👥' },
  { id: 'financing', label: 'Financing', icon: '💰' },
  { id: 'terms', label: 'Others', icon: '📋' },
]

function MortgageForm({
  inputs,
  onChange,
  propertyType,
}: {
  inputs: MortgageInputs
  onChange: (field: keyof MortgageInputs, value: number | string | string[] | FeeItem[] | null) => void
  propertyType: PropertyType
  accentColor: string
}) {
  const [currentStep, setCurrentStep] = useState<FormStep>('property')
  const isHDB = propertyType.includes('hdb')
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
  const hdbIncomeCeiling = 14000  // HDB BTO/resale income ceiling
  const ecIncomeCeiling = 16000   // EC income ceiling
  const exceedsHdbIncomeCeiling = isHDB && inputs.householdIncome > hdbIncomeCeiling
  const exceedsEcIncomeCeiling = isEC && inputs.householdIncome > ecIncomeCeiling

  const currentStepIndex = FORM_STEPS.findIndex(s => s.id === currentStep)

  // Step validation - check if each step has required fields filled
  const isStep1Valid = inputs.propertyPrice > 0 && inputs.loanAmount > 0
  const isStep2Valid = inputs.householdIncome > 0
  const isStep3Valid = inputs.loanTermYears > 0 && (inputs.fixedRate > 0 || inputs.floatingRate > 0)
  const isStep4Valid = true // Others step is always valid (optional fields only)

  const getStepValidation = (stepIndex: number): boolean => {
    switch (stepIndex) {
      case 0: return true // Property step is always accessible
      case 1: return isStep1Valid // Need property filled to access borrowers
      case 2: return isStep1Valid && isStep2Valid // Need property + borrowers to access financing
      case 3: return isStep1Valid && isStep2Valid && isStep3Valid // Need all previous to access terms
      default: return false
    }
  }

  const isCurrentStepValid = (): boolean => {
    switch (currentStep) {
      case 'property': return isStep1Valid
      case 'borrowers': return isStep2Valid
      case 'financing': return isStep3Valid
      case 'terms': return isStep4Valid
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
                "w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-semibold",
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
                {/* Property Price & Downpayment */}
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
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm font-medium">$</span>
                      <input
                        type="text"
                        inputMode="numeric"
                        value={downpaymentOnValuation.toLocaleString()}
                        onChange={(e) => {
                          const newDownpayment = Number(e.target.value.replace(/[^0-9]/g, '')) || 0
                          const newLoanAmount = Math.max(0, effectivePrice - newDownpayment)
                          const clampedLoanAmount = Math.min(newLoanAmount, maxLoanAmount)
                          onChange('loanAmount', clampedLoanAmount)
                        }}
                        className={cn(
                          "w-full rounded-xl bg-white/[0.05] border border-white/[0.10] text-white text-sm",
                          "py-2.5 pl-7 pr-3 transition-all duration-200",
                          "hover:border-white/[0.15] hover:bg-white/[0.06]",
                          "focus:outline-none focus:border-white/30 focus:bg-white/[0.08] focus:ring-1 focus:ring-white/10"
                        )}
                      />
                    </div>
                    <p className="text-[10px] text-slate-600">
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
                        <div className="group relative">
                          <HelpCircle className="w-3.5 h-3.5 text-slate-600 cursor-help" />
                          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 p-3 rounded-xl bg-gray-900/95 border border-white/10 text-xs text-slate-300 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50 shadow-xl backdrop-blur-xl">
                            <p className="font-medium text-white mb-1">Cash Over Valuation (COV)</p>
                            <p className="leading-relaxed">The amount above the bank/HDB valuation that you pay to the seller. COV must be paid in cash and cannot be financed through a loan or CPF.</p>
                            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 rotate-45 w-2 h-2 bg-gray-900/95 border-r border-b border-white/10" />
                          </div>
                        </div>
                      </div>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm font-medium">$</span>
                        <input
                          type="text"
                          readOnly
                          value={cashOverValuation.toLocaleString()}
                          className={cn(
                            "w-full rounded-xl bg-white/[0.02] border border-white/[0.04] text-slate-400 text-sm",
                            "py-2.5 pl-7 pr-3 cursor-not-allowed"
                          )}
                        />
                      </div>
                      {cashOverValuation > 0 && (
                        <p className="text-[10px] text-amber-500">Must be paid in cash</p>
                      )}
                    </div>
                  </div>
                )}

                {/* Loan Amount Summary */}
                <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.04]">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-500">Loan Amount</span>
                    <span className="text-sm font-medium text-white">${inputs.loanAmount.toLocaleString()}</span>
                  </div>
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-[10px] text-slate-600">LTV Ratio</span>
                    <span className={cn(
                      "text-[10px] font-medium",
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
                    <p className="text-[10px] text-amber-300/70 mt-1">
                      Income exceeds typical ceiling. Please verify eligibility.
                    </p>
                  </div>
                )}

                {/* Borrower 1 */}
                <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06]">
                  <span className="text-xs font-medium text-slate-300 mb-3 block">
                    {inputs.borrowerType === 'joint' ? 'Borrower 1' : 'Primary Borrower'}
                  </span>

                  <select
                    value={inputs.borrower1IncomeId}
                    onChange={(e) => {
                      onChange('borrower1IncomeId', e.target.value)
                      const selectedIncome = mockIncomes.find(i => i.id === e.target.value)
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
                    className="w-full rounded-xl bg-white/[0.03] border border-white/[0.06] text-white text-sm py-2.5 px-3 focus:outline-none focus:border-white/20 appearance-none cursor-pointer transition-colors"
                    style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%2394a3b8'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 0.75rem center', backgroundSize: '1rem' }}
                  >
                    {mockIncomes.map(income => (
                      <option key={income.id} value={income.id}>
                        {income.name} - ${income.monthlyAmount.toLocaleString()}/mo
                      </option>
                    ))}
                  </select>

                  <div className="grid grid-cols-2 gap-3 mt-3">
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-emerald-500/60 text-xs font-medium">OA</span>
                      <input
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
                        className="w-full rounded-lg bg-white/[0.02] border border-white/[0.06] text-white text-sm py-2 pl-10 pr-3 focus:outline-none focus:border-emerald-500/30 transition-colors"
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
                        className="text-xs text-slate-600 hover:text-red-400 transition-colors"
                      >
                        Remove
                      </button>
                    </div>
                    <select
                      value={inputs.borrower2IncomeId || ''}
                      onChange={(e) => {
                        onChange('borrower2IncomeId', e.target.value)
                        const selectedIncome = mockIncomes.find(i => i.id === e.target.value)
                        const borrower1Income = mockIncomes.find(i => i.id === inputs.borrower1IncomeId)
                        if (selectedIncome && borrower1Income) {
                          onChange('householdIncome', borrower1Income.monthlyAmount + selectedIncome.monthlyAmount)
                        }
                      }}
                      className="w-full rounded-xl bg-white/[0.03] border border-white/[0.06] text-white text-sm py-2.5 px-3 focus:outline-none focus:border-white/20 appearance-none cursor-pointer transition-colors"
                      style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%2394a3b8'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 0.75rem center', backgroundSize: '1rem' }}
                    >
                      {mockIncomes.filter(i => i.id !== inputs.borrower1IncomeId).map(income => (
                        <option key={income.id} value={income.id}>
                          {income.name} - ${income.monthlyAmount.toLocaleString()}/mo
                        </option>
                      ))}
                    </select>
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
                    <span className="text-emerald-400">${inputs.cpfOaBalance.toLocaleString()}</span>
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
                    <input
                      type="month"
                      value={inputs.loanStartMonth}
                      onChange={(e) => onChange('loanStartMonth', e.target.value)}
                      className="w-full rounded-xl bg-white/[0.05] border border-white/[0.10] text-white text-sm py-2.5 px-3 hover:border-white/[0.15] focus:outline-none focus:border-white/30 focus:ring-1 focus:ring-white/10 transition-all"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-slate-400 block">Term</label>
                    <div className="relative">
                      <input
                        type="number"
                        value={inputs.loanTermYears}
                        onChange={(e) => onChange('loanTermYears', Number(e.target.value))}
                        min={1}
                        max={35}
                        className="w-full rounded-xl bg-white/[0.05] border border-white/[0.10] text-white text-sm py-2.5 px-3 pr-10 hover:border-white/[0.15] focus:outline-none focus:border-white/30 focus:ring-1 focus:ring-white/10 transition-all"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs">yrs</span>
                    </div>
                  </div>
                </div>

                {/* Interest Rates */}
                <div className={cn("grid gap-4", isHDB ? "grid-cols-1" : "grid-cols-2")}>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-slate-400 block">
                      {isHDB ? 'Interest Rate' : 'Fixed Rate'}
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        value={inputs.fixedRate}
                        onChange={(e) => onChange('fixedRate', Number(e.target.value))}
                        step={0.1}
                        min={0}
                        max={10}
                        className="w-full rounded-xl bg-white/[0.05] border border-white/[0.10] text-white text-sm py-2.5 px-3 pr-8 hover:border-white/[0.15] focus:outline-none focus:border-white/30 focus:ring-1 focus:ring-white/10 transition-all"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs">%</span>
                    </div>
                  </div>
                  {!isHDB && (
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-slate-400 block">Floating Rate</label>
                      <div className="relative">
                        <input
                          type="number"
                          value={inputs.floatingRate}
                          onChange={(e) => onChange('floatingRate', Number(e.target.value))}
                          step={0.1}
                          min={0}
                          max={10}
                          className="w-full rounded-xl bg-white/[0.05] border border-white/[0.10] text-white text-sm py-2.5 px-3 pr-8 hover:border-white/[0.15] focus:outline-none focus:border-white/30 focus:ring-1 focus:ring-white/10 transition-all"
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs">%</span>
                      </div>
                    </div>
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
                          ? "bg-emerald-500/15 text-emerald-400"
                          : !isHDB ? "text-slate-700 cursor-not-allowed" : "text-slate-400 hover:text-slate-200"
                      )}
                    >
                      HDB Loan
                    </button>
                    <button
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
                          ? "bg-blue-500/15 text-blue-400"
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
                  <div className="h-2.5 rounded-full overflow-hidden bg-white/[0.04] flex mb-3">
                    {inputs.downpaymentCpfOa > 0 && (
                      <div
                        className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400"
                        style={{ width: `${(inputs.downpaymentCpfOa / (downpaymentOnValuation + cashOverValuation)) * 100}%` }}
                      />
                    )}
                    {inputs.downpaymentCash > 0 && (
                      <div
                        className="h-full bg-gradient-to-r from-amber-500 to-amber-400"
                        style={{ width: `${(inputs.downpaymentCash / (downpaymentOnValuation + cashOverValuation)) * 100}%` }}
                      />
                    )}
                  </div>

                  {/* Legend */}
                  <div className="flex items-center gap-4 text-xs mb-3">
                    <div className="flex items-center gap-1.5">
                      <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                      <span className="text-slate-400">${inputs.downpaymentCpfOa.toLocaleString()} CPF</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                      <span className="text-slate-400">${inputs.downpaymentCash.toLocaleString()} Cash</span>
                    </div>
                  </div>

                  {/* Editable CPF/Cash */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-emerald-500/60 text-xs font-medium">CPF</span>
                      <input
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
                        className="w-full rounded-lg bg-white/[0.02] border border-white/[0.06] text-white text-sm py-2 pl-11 pr-3 focus:outline-none focus:border-emerald-500/30 transition-colors"
                      />
                    </div>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-amber-500/60 text-xs font-medium">Cash</span>
                      <input
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
                        className="w-full rounded-lg bg-white/[0.02] border border-white/[0.06] text-white text-sm py-2 pl-12 pr-3 focus:outline-none focus:border-amber-500/30 transition-colors"
                      />
                    </div>
                  </div>
                </div>
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
                        className="text-[10px] text-indigo-400 hover:text-indigo-300"
                      >
                        Check rates →
                      </a>
                    </div>
                    <div className="relative">
                      <input
                        type="number"
                        min="0"
                        max="65"
                        step="1"
                        value={inputs.absdRate}
                        onChange={(e) => onChange('absdRate', Number(e.target.value) || 0)}
                        className="w-full rounded-xl bg-white/[0.03] border border-white/[0.06] text-white text-sm py-2.5 px-3 pr-8 focus:outline-none focus:border-rose-500/30 transition-colors"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm">%</span>
                    </div>
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

type SaleFormStep = 'timing' | 'fees'

const SALE_FORM_STEPS: { id: SaleFormStep; label: string }[] = [
  { id: 'timing', label: 'Sale Details' },
  { id: 'fees', label: 'Fees & Notices' },
]

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

  // Step validation
  const isStep1Valid = saleInputs.expectedSaleDate.length > 0
  const isStep2Valid = true // Fees are optional

  const getStepValidation = (stepIndex: number): boolean => {
    switch (stepIndex) {
      case 0: return true
      case 1: return isStep1Valid
      default: return false
    }
  }

  const isCurrentStepValid = (): boolean => {
    switch (currentStep) {
      case 'timing': return isStep1Valid
      case 'fees': return isStep2Valid
      default: return false
    }
  }

  const goToNextStep = () => {
    const nextIndex = currentStepIndex + 1
    if (nextIndex < SALE_FORM_STEPS.length) {
      setCurrentStep(SALE_FORM_STEPS[nextIndex].id)
    }
  }

  const goToPrevStep = () => {
    const prevIndex = currentStepIndex - 1
    if (prevIndex >= 0) {
      setCurrentStep(SALE_FORM_STEPS[prevIndex].id)
    }
  }

  const getNextStepLabel = (): string => {
    if (currentStepIndex >= SALE_FORM_STEPS.length - 1) return ''
    return SALE_FORM_STEPS[currentStepIndex + 1].label
  }

  // Check if there are any warnings to show
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
          const isAccessible = getStepValidation(index)
          const isLocked = !isAccessible && index > currentStepIndex
          return (
            <button
              key={step.id}
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
                "w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-semibold",
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
      <div className="min-h-[250px]">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
          >
            {/* ========== STEP 1: TIMING ========== */}
            {currentStep === 'timing' && (
              <div className="space-y-4">
                {/* Sale Date & Price */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-slate-400 block">Expected Sale Date</label>
                    <input
                      type="month"
                      value={saleInputs.expectedSaleDate}
                      onChange={(e) => onSaleInputChange('expectedSaleDate', e.target.value)}
                      className="w-full rounded-xl bg-white/[0.05] border border-white/[0.10] text-white text-sm py-2.5 px-3 hover:border-white/[0.15] focus:outline-none focus:border-white/30 focus:ring-1 focus:ring-white/10 transition-all"
                    />
                  </div>
                  <FormInput
                    label="Expected Sale Price"
                    prefix="$"
                    value={displaySalePrice.toLocaleString()}
                    onChange={(v) => onSaleInputChange('expectedSalePrice', Number(v.replace(/[^0-9]/g, '')) || 0)}
                  />
                </div>

                {/* Holding period info */}
                <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.06]">
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-slate-500">Holding Period</span>
                    <span className="text-sm text-white font-medium">
                      {saleResult.holdingPeriodYears.toFixed(1)} years ({saleResult.holdingPeriodMonths} months)
                    </span>
                  </div>
                </div>

                {/* Quick warnings preview */}
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

            {/* ========== STEP 2: FEES & NOTICES ========== */}
            {currentStep === 'fees' && (
              <div className="space-y-4">
                {/* Sale Fees */}
                <FeeEditor
                  fees={saleInputs.fees}
                  onFeesChange={(fees) => onSaleInputChange('fees', fees)}
                  basePrice={displaySalePrice}
                  title="Sale Fees"
                />

                {/* Warnings - muted styling */}
                {hasWarnings && (
                  <div className="space-y-3 pt-4 border-t border-white/[0.04]">
                    <span className="text-xs font-medium text-slate-500 block">Important Notices</span>

                    {/* SSD Warning */}
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

                    {/* MOP Warning for HDB */}
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

                    {/* MOP Warning for EC (5 years) */}
                    {saleResult.holdingPeriodMonths < 60 && propertyType === 'ec' && (
                      <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.06]">
                        <div className="flex items-center gap-2 text-slate-300 mb-1">
                          <div className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                          <span className="text-xs font-medium">MOP Not Met (EC)</span>
                        </div>
                        <p className="text-xs text-slate-500 pl-3.5">
                          {60 - saleResult.holdingPeriodMonths} months remaining. Can only sell to SC/PR.
                        </p>
                      </div>
                    )}

                    {/* EC Privatization Info (5-10 years) */}
                    {saleResult.holdingPeriodMonths >= 60 && saleResult.holdingPeriodMonths < 120 && propertyType === 'ec' && (
                      <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.06]">
                        <div className="flex items-center gap-2 text-slate-300 mb-1">
                          <div className="w-1.5 h-1.5 rounded-full bg-slate-500" />
                          <span className="text-xs font-medium">EC Not Privatized</span>
                        </div>
                        <p className="text-xs text-slate-500 pl-3.5">
                          {120 - saleResult.holdingPeriodMonths} months until privatization. Can only sell to SC/PR.
                        </p>
                      </div>
                    )}

                    {/* EC Privatization Complete (10+ years) */}
                    {saleResult.holdingPeriodMonths >= 120 && propertyType === 'ec' && (
                      <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.06]">
                        <div className="flex items-center gap-2 text-slate-300 mb-1">
                          <div className="w-1.5 h-1.5 rounded-full bg-white/50" />
                          <span className="text-xs font-medium">EC Privatized</span>
                        </div>
                        <p className="text-xs text-slate-500 pl-3.5">
                          Can be sold to anyone including foreigners.
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

      {/* Navigation Buttons */}
      <div className="flex items-center justify-between pt-4 border-t border-white/[0.04]">
        <button
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
        {currentStepIndex < SALE_FORM_STEPS.length - 1 ? (
          <button
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

type ResultsTab = 'purchase' | 'sale'

function TabbedResultsPanel({
  calculation,
  accentColor,
  propertyType,
  saleInputs,
  saleResult,
  propertyPrice,
  activeTab,
  absdRate,
}: {
  calculation: ReturnType<typeof calculateMortgage>
  accentColor: string
  propertyType: PropertyType
  saleInputs: SaleInputs
  saleResult: SaleResult
  propertyPrice: number
  activeTab: ResultsTab
  absdRate: number
}) {
  const isHDB = propertyType.includes('hdb')
  const msrLimit = isHDB ? 0.30 : 0.55
  const tdsrLimit = 0.55
  const msrWithinLimit = calculation.msrRatio <= msrLimit
  const tdsrWithinLimit = calculation.tdsrRatio <= tdsrLimit

  // Default sale price to property price + 20% appreciation if not set
  const displaySalePrice = saleInputs.expectedSalePrice || Math.round(propertyPrice * 1.2)

  return (
    <div className="space-y-6">
      <AnimatePresence mode="wait">
        {activeTab === 'purchase' ? (
          <motion.div
            key="purchase"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
          >
            {/* 2x2 Grid Layout */}
            <div className="grid grid-cols-2 gap-4">
              {/* Top Left: Loan Summary */}
              <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] backdrop-blur-xl overflow-hidden">
                <div className="p-5">
                  <div className="flex items-baseline justify-between mb-4">
                    <div>
                      <p className="text-xs font-medium text-slate-500 mb-1">Monthly Payment</p>
                      <p className="text-2xl font-semibold tracking-tight text-white">
                        {formatCurrency(calculation.monthlyPayment)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-medium text-slate-500 mb-1">Tenure</p>
                      <p className="text-lg font-semibold text-white">
                        {calculation.loanTermYears} yrs
                      </p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4 pt-4 border-t border-white/[0.04]">
                    <div>
                      <p className="text-[10px] font-medium text-slate-500 mb-0.5">Total Interest</p>
                      <p className="text-sm font-medium text-slate-300">
                        {formatCurrency(calculation.totalInterest)}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] font-medium text-slate-500 mb-0.5">Loan Period</p>
                      <p className="text-sm font-medium text-slate-300">
                        {formatMonthYear(calculation.loanStartDate)} - {formatMonthYear(calculation.loanEndDate)}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Top Right: MSR/TDSR Ratios */}
              <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] backdrop-blur-xl overflow-hidden">
                <div className="p-5 space-y-4">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-medium text-slate-500">MSR Ratio</span>
                      <span className={cn(
                        "text-xs font-semibold",
                        msrWithinLimit ? "text-emerald-400" : "text-amber-400"
                      )}>
                        {(calculation.msrRatio * 100).toFixed(1)}%
                      </span>
                    </div>
                    <div className="h-2 rounded-full bg-white/[0.04] overflow-hidden">
                      <div
                        className={cn(
                          "h-full rounded-full transition-all duration-500",
                          msrWithinLimit
                            ? "bg-gradient-to-r from-emerald-500 to-emerald-400"
                            : "bg-gradient-to-r from-amber-500 to-amber-400"
                        )}
                        style={{ width: `${Math.min((calculation.msrRatio / msrLimit) * 100, 100)}%` }}
                      />
                    </div>
                    <p className="text-[10px] text-slate-600 mt-1">Limit: {(msrLimit * 100).toFixed(0)}%</p>
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-medium text-slate-500">TDSR Ratio</span>
                      <span className={cn(
                        "text-xs font-semibold",
                        tdsrWithinLimit ? "text-emerald-400" : "text-amber-400"
                      )}>
                        {(calculation.tdsrRatio * 100).toFixed(1)}%
                      </span>
                    </div>
                    <div className="h-2 rounded-full bg-white/[0.04] overflow-hidden">
                      <div
                        className={cn(
                          "h-full rounded-full transition-all duration-500",
                          tdsrWithinLimit
                            ? "bg-gradient-to-r from-emerald-500 to-emerald-400"
                            : "bg-gradient-to-r from-amber-500 to-amber-400"
                        )}
                        style={{ width: `${Math.min((calculation.tdsrRatio / tdsrLimit) * 100, 100)}%` }}
                      />
                    </div>
                    <p className="text-[10px] text-slate-600 mt-1">Limit: {(tdsrLimit * 100).toFixed(0)}%</p>
                  </div>
                </div>
              </div>

              {/* Bottom Left: Upfront Costs Breakdown */}
              <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] backdrop-blur-xl overflow-hidden">
                <div className="px-5 py-3 border-b border-white/[0.04]">
                  <h3 className="text-sm font-medium text-white">Upfront Costs</h3>
                </div>

                <div className="p-5">
                  <div className="space-y-2">
                    {/* CPF-funded items - use blue for CPF category */}
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-400">Downpayment (CPF OA)</span>
                      <span className="text-blue-400">{formatCurrency(calculation.downpaymentBreakdown.cpfOa)}</span>
                    </div>
                    {/* Cash items - use white/neutral for standard costs */}
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-400">Downpayment (Cash)</span>
                      <span className="text-white">{formatCurrency(calculation.downpaymentBreakdown.cash)}</span>
                    </div>
                    {/* COV - use amber as warning (must be cash) */}
                    {calculation.cov > 0 && (
                      <div className="flex justify-between text-xs">
                        <span className="text-slate-400 flex items-center gap-1">
                          Cash Over Valuation
                          <span className="text-[9px] text-amber-500 font-medium">(cash only)</span>
                        </span>
                        <span className="text-amber-400">{formatCurrency(calculation.cov)}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-400">BSD</span>
                      <span className="text-slate-300">{formatCurrency(calculation.bsdAmount)}</span>
                    </div>
                    {/* ABSD - use rose/red as it's an additional cost constraint */}
                    {calculation.absdAmount > 0 && (
                      <div className="flex justify-between text-xs">
                        <span className="text-slate-400">ABSD ({absdRate}%)</span>
                        <span className="text-rose-400">{formatCurrency(calculation.absdAmount)}</span>
                      </div>
                    )}
                    {calculation.calculatedPurchaseFees.map(({ item, amount }) => (
                      <div key={item.id} className="flex justify-between text-xs">
                        <span className="text-slate-400">{item.name}</span>
                        <span className="text-slate-300">{formatCurrency(amount)}</span>
                      </div>
                    ))}
                    <div className="h-px bg-white/[0.06] my-2" />
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-slate-300 font-medium">Total Cash Needed</span>
                      <span className="text-lg font-semibold text-white">
                        {formatCurrency(calculation.totalUpfrontCash)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Bottom Right: Amortization Chart */}
              <AmortizationChart
                amortization={calculation.amortization}
                accentColor={accentColor}
              />
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="sale"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ duration: 0.2 }}
            className="space-y-6"
          >
            {/* Sale Hero Metrics */}
            <div className="rounded-2xl border border-orange-500/20 bg-gradient-to-br from-orange-500/5 to-orange-600/[0.02] backdrop-blur-xl overflow-hidden">
              <div className="p-6">
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <p className="text-xs font-medium text-slate-500 mb-2">Net Cash Proceeds</p>
                    <p className={cn(
                      "text-3xl font-semibold tracking-tight",
                      saleResult.netCashProceeds >= 0 ? "text-orange-400" : "text-red-400"
                    )}>
                      {formatCurrency(saleResult.netCashProceeds)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-slate-500 mb-2">CPF Refunded</p>
                    <p className="text-3xl font-semibold text-blue-400 tracking-tight">
                      {formatCurrency(saleResult.cpfRefundedToOa)}
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4 px-6 py-4 bg-white/[0.02] border-t border-white/[0.04]">
                <div>
                  <p className="text-xs font-medium text-slate-500 mb-1">Holding Period</p>
                  <p className="text-lg font-semibold text-white">
                    {saleResult.holdingPeriodYears.toFixed(1)} yrs
                  </p>
                </div>
                <div>
                  <p className="text-xs font-medium text-slate-500 mb-1">Outstanding Loan</p>
                  <p className="text-lg font-semibold text-slate-300">
                    {formatCurrency(saleResult.outstandingLoanAtSale)}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-medium text-slate-500 mb-1">Sale Price</p>
                  <p className="text-lg font-semibold text-white">
                    {formatCurrency(displaySalePrice)}
                  </p>
                </div>
              </div>
            </div>

            {/* Proceeds Breakdown */}
            <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] backdrop-blur-xl overflow-hidden">
              <div className="px-6 py-4 border-b border-white/[0.04]">
                <h3 className="text-sm font-medium text-white">Proceeds Breakdown</h3>
              </div>

              <div className="p-6 space-y-4">
                {/* Gross calculation */}
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400">Sale Price</span>
                    <span className="text-white font-medium">{formatCurrency(displaySalePrice)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400">Outstanding Loan</span>
                    <span className="text-red-400">-{formatCurrency(saleResult.outstandingLoanAtSale)}</span>
                  </div>
                  <div className="h-px bg-white/[0.06]" />
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-300 font-medium">Gross Proceeds</span>
                    <span className="text-white font-medium">{formatCurrency(saleResult.grossProceeds)}</span>
                  </div>
                </div>

                {/* Deductions */}
                <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.04] space-y-3">
                  <span className="text-xs text-slate-500 font-medium block">Deductions</span>

                  {/* CPF Refund - use blue for CPF category */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-400">CPF Principal Used</span>
                      <span className="text-blue-400">-{formatCurrency(saleResult.cpfRefund.principalUsed)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-500 pl-3 text-xs">+ Accrued Interest (2.5% p.a.)</span>
                      <span className="text-blue-400">-{formatCurrency(saleResult.cpfRefund.accruedInterest)}</span>
                    </div>
                  </div>

                  {/* SSD */}
                  {saleResult.ssd.applicable && (
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-400">Seller&apos;s Stamp Duty ({saleResult.ssd.rate}%)</span>
                      <span className="text-red-400">-{formatCurrency(saleResult.ssd.amount)}</span>
                    </div>
                  )}

                  {/* Custom Fees */}
                  {saleResult.calculatedFees.filter(f => f.amount > 0).map(({ item, amount }) => (
                    <div key={item.id} className="flex justify-between text-sm">
                      <span className="text-slate-400">
                        {item.name}
                        {item.type === 'percentage' && ` (${item.value}%)`}
                      </span>
                      <span className="text-orange-400">-{formatCurrency(amount)}</span>
                    </div>
                  ))}
                </div>

                {/* Final summary */}
                <div className="h-px bg-white/[0.06]" />
                <div className="flex justify-between items-center">
                  <span className="text-sm text-slate-300">Net Cash to Bank</span>
                  <span className={cn(
                    "text-xl font-semibold",
                    saleResult.netCashProceeds >= 0 ? "text-orange-400" : "text-red-400"
                  )}>
                    {formatCurrency(saleResult.netCashProceeds)}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-slate-300">CPF Refunded to OA</span>
                  <span className="text-xl font-semibold text-blue-400">
                    {formatCurrency(saleResult.cpfRefundedToOa)}
                  </span>
                </div>
              </div>
            </div>

            {/* Explanation */}
            <p className="text-xs text-slate-600 leading-relaxed px-1">
              Net cash proceeds is what you receive in your bank account. CPF refund goes back to your
              CPF OA account (available for next property or retirement).
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ============================================
// MAIN PAGE
// ============================================

// Default sale inputs - sale date 10 years after loan start
function getDefaultSaleInputs(loanStartMonth: string, propertyPrice: number): SaleInputs {
  const startDate = new Date(loanStartMonth + '-01')
  startDate.setFullYear(startDate.getFullYear() + 10)
  return {
    expectedSaleDate: startDate.toISOString().slice(0, 7),
    expectedSalePrice: Math.round(propertyPrice * 1.3), // 30% appreciation over 10 years
    fees: DEFAULT_SALE_FEES.map(f => ({ ...f })),  // Deep copy default fees
  }
}

// Embeddable Property Planner V2 View Component
export function PropertyPlannerV2View({ onClose }: { onClose?: () => void }) {
  // Scenario list state
  const [scenarios, setScenarios] = useState<PropertyScenario[]>([])
  const [editingScenarioId, setEditingScenarioId] = useState<string | null>(null)

  // Inline new row state
  const [isCreatingNew, setIsCreatingNew] = useState(false)
  const [newRowName, setNewRowName] = useState('')
  const [newRowType, setNewRowType] = useState<PropertyType>('hdb-resale')
  const [newRowPrice, setNewRowPrice] = useState('')

  // Current editing state (for detail view)
  const [selectedType, setSelectedType] = useState<PropertyType | null>(null)
  const [inputs, setInputs] = useState<MortgageInputs>(defaultInputsByType['hdb-resale'])
  const [saleInputs, setSaleInputs] = useState<SaleInputs>(() =>
    getDefaultSaleInputs(defaultInputsByType['hdb-resale'].loanStartMonth, defaultInputsByType['hdb-resale'].propertyPrice)
  )
  const [activeResultsTab, setActiveResultsTab] = useState<ResultsTab>('purchase')

  // Get current editing scenario
  const editingScenario = editingScenarioId
    ? scenarios.find(s => s.id === editingScenarioId)
    : null

  // Start creating a new row
  const handleStartNewRow = useCallback(() => {
    const defaultType: PropertyType = 'hdb-resale'
    const defaults = defaultInputsByType[defaultType]
    setNewRowName(`Property ${scenarios.length + 1}`)
    setNewRowType(defaultType)
    setNewRowPrice(defaults.propertyPrice.toString())
    setIsCreatingNew(true)
  }, [scenarios.length])

  // Confirm and save the new row
  const handleConfirmNewRow = useCallback(() => {
    const price = parseInt(newRowPrice.replace(/[^0-9]/g, '')) || defaultInputsByType[newRowType].propertyPrice
    const defaults = defaultInputsByType[newRowType]

    // Calculate loan amount based on price (maintaining same LTV ratio)
    const originalLtv = defaults.loanAmount / defaults.propertyPrice
    const newLoanAmount = Math.floor(price * originalLtv)

    const newScenario: PropertyScenario = {
      id: `scenario-${Date.now()}`,
      name: newRowName || `Property ${scenarios.length + 1}`,
      propertyType: newRowType,
      inputs: {
        ...defaults,
        propertyPrice: price,
        valuationPrice: price, // Simplified: assume valuation = price
        loanAmount: newLoanAmount,
      },
      saleInputs: getDefaultSaleInputs(defaults.loanStartMonth, price),
      isIncluded: true,
      createdAt: Date.now(),
    }
    setScenarios(prev => [...prev, newScenario])
    setIsCreatingNew(false)
    setNewRowName('')
    setNewRowPrice('')
  }, [newRowName, newRowType, newRowPrice, scenarios.length])

  // Cancel new row creation
  const handleCancelNewRow = useCallback(() => {
    setIsCreatingNew(false)
    setNewRowName('')
    setNewRowPrice('')
  }, [])

  // Edit an existing scenario
  const handleEditScenario = useCallback((scenario: PropertyScenario) => {
    setEditingScenarioId(scenario.id)
    setSelectedType(scenario.propertyType)
    setInputs(scenario.inputs)
    setSaleInputs(scenario.saleInputs)
  }, [])

  // Save current changes back to scenario
  const handleSaveAndClose = useCallback(() => {
    if (editingScenarioId) {
      setScenarios(prev => prev.map(s =>
        s.id === editingScenarioId
          ? { ...s, inputs, saleInputs, propertyType: selectedType! }
          : s
      ))
    }
    setEditingScenarioId(null)
    setSelectedType(null)
  }, [editingScenarioId, inputs, saleInputs, selectedType])

  // Delete a scenario
  const handleDeleteScenario = useCallback((id: string) => {
    setScenarios(prev => prev.filter(s => s.id !== id))
  }, [])

  // Toggle include in planning
  const handleToggleInclude = useCallback((id: string) => {
    setScenarios(prev => prev.map(s =>
      s.id === id ? { ...s, isIncluded: !s.isIncluded } : s
    ))
  }, [])

  // Update scenario name
  const handleUpdateName = useCallback((id: string, name: string) => {
    setScenarios(prev => prev.map(s =>
      s.id === id ? { ...s, name } : s
    ))
  }, [])

  // Sync changes to editing scenario in real-time
  useEffect(() => {
    if (editingScenarioId && selectedType) {
      setScenarios(prev => prev.map(s =>
        s.id === editingScenarioId
          ? { ...s, inputs, saleInputs, propertyType: selectedType }
          : s
      ))
    }
  }, [editingScenarioId, inputs, saleInputs, selectedType])

  const handleInputChange = useCallback((field: keyof MortgageInputs, value: number | string | string[] | FeeItem[] | null) => {
    setInputs(prev => ({ ...prev, [field]: value }))
  }, [])

  const handleSaleInputChange = useCallback((field: keyof SaleInputs, value: string | number | boolean | FeeItem[]) => {
    setSaleInputs(prev => ({ ...prev, [field]: value }))
  }, [])

  const selectedOption = selectedType
    ? propertyOptions.find(o => o.id === selectedType)
    : null

  const calculation = useMemo(() => calculateMortgage(inputs), [inputs])

  const saleResult = useMemo(() =>
    calculateSaleProceeds(saleInputs, inputs, calculation.amortization, calculation.monthlyPayment),
    [saleInputs, inputs, calculation.amortization, calculation.monthlyPayment]
  )

  // Embedded mode (with onClose) vs standalone page mode
  const isEmbedded = !!onClose

  return (
    <div className={cn("flex flex-col", isEmbedded ? "h-full" : "min-h-screen bg-gray-950")}>
      {/* Background gradients - only for standalone mode */}
      {!isEmbedded && (
        <>
          <div className="fixed inset-0 bg-gradient-to-br from-gray-950 via-gray-950 to-gray-900" />
          <div className="fixed inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(59,130,246,0.08),transparent)]" />
        </>
      )}

      {/* Simple header for embedded mode */}
      {isEmbedded && (
        <div className="flex items-center justify-between px-6 py-4 shrink-0">
          <h2 className="text-lg font-semibold text-white">Property Scenarios</h2>
          <button
            onClick={onClose}
            className="flex items-center justify-center h-8 w-8 rounded-lg hover:bg-white/5 text-slate-400 hover:text-white transition"
            title="Close"
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
              className={cn(
                "mx-auto px-6",
                isEmbedded ? "max-w-5xl py-8" : "max-w-6xl py-16"
              )}
            >
              {/* Back to Dashboard - only for standalone mode */}
              {!isEmbedded && (
                <motion.div
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.05 }}
                  className="mb-12"
                >
                  <Link
                    href="/dashboard"
                    className="inline-flex items-center gap-2 text-slate-500 hover:text-slate-300 transition-colors text-sm font-medium"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    Back to Dashboard
                  </Link>
                </motion.div>
              )}

              {/* Header - only for standalone mode */}
              {!isEmbedded && (
                <div className="mb-8">
                  <motion.h1
                    className="text-3xl md:text-4xl font-semibold text-white mb-2 tracking-tight"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                  >
                    Property Scenarios
                  </motion.h1>
                  <motion.p
                    className="text-sm text-slate-500"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.15 }}
                  >
                    Create and compare different property purchase scenarios
                  </motion.p>
                </div>
              )}

              {/* Scenario List */}
              <motion.div
                className="space-y-2"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
              >
                {/* Existing Scenarios */}
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
                        scenario.isIncluded
                          ? "bg-white/[0.03] border-white/[0.08] hover:bg-white/[0.05]"
                          : "bg-white/[0.01] border-white/[0.04] opacity-60 hover:opacity-80"
                      )}
                      onClick={() => handleEditScenario(scenario)}
                    >
                      {/* Include Toggle */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleToggleInclude(scenario.id)
                        }}
                        className={cn(
                          "w-5 h-5 rounded border-2 flex items-center justify-center transition-colors shrink-0",
                          scenario.isIncluded
                            ? "bg-emerald-500 border-emerald-500"
                            : "bg-transparent border-slate-600 hover:border-slate-500"
                        )}
                      >
                        {scenario.isIncluded && <Check className="w-3 h-3 text-white" />}
                      </button>

                      {/* Icon */}
                      <div className={cn(
                        "w-10 h-10 rounded-lg flex items-center justify-center shrink-0",
                        "bg-gradient-to-br",
                        option?.color || 'from-slate-500/20 to-slate-600/5'
                      )}>
                        <span className={option?.accentColor || 'text-slate-400'}>
                          {option?.icon || <Home className="w-5 h-5" />}
                        </span>
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="text-sm font-medium text-white truncate">
                            {scenario.name}
                          </span>
                          <span className={cn(
                            "text-xs px-2 py-0.5 rounded-md",
                            option?.accentColor || 'text-slate-400',
                            "bg-white/[0.04]"
                          )}>
                            {option?.title}
                          </span>
                        </div>
                        <div className="text-xs text-slate-500">
                          {formatCurrency(scenario.inputs.propertyPrice)} · {scenario.inputs.loanTermYears}yr loan
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            handleEditScenario(scenario)
                          }}
                          className="p-2 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
                          title="Edit details"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            handleDeleteScenario(scenario.id)
                          }}
                          className="p-2 rounded-lg hover:bg-red-500/20 text-slate-400 hover:text-red-400 transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </motion.div>
                  )
                })}

                {/* Inline New Row */}
                <AnimatePresence>
                  {isCreatingNew && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="flex items-center gap-3 p-4 rounded-xl border border-emerald-500/30 bg-emerald-500/5">
                        {/* Placeholder checkbox */}
                        <div className="w-5 h-5 rounded border-2 border-emerald-500/50 bg-emerald-500/20 flex items-center justify-center shrink-0">
                          <Check className="w-3 h-3 text-emerald-400" />
                        </div>

                        {/* Name input */}
                        <input
                          type="text"
                          value={newRowName}
                          onChange={(e) => setNewRowName(e.target.value)}
                          placeholder="Scenario name"
                          className="w-40 rounded-lg bg-white/[0.05] border border-white/[0.1] text-white text-sm py-2 px-3 focus:outline-none focus:border-emerald-500/50 placeholder:text-slate-500"
                          autoFocus
                        />

                        {/* Type select */}
                        <select
                          value={newRowType}
                          onChange={(e) => {
                            const type = e.target.value as PropertyType
                            setNewRowType(type)
                            setNewRowPrice(defaultInputsByType[type].propertyPrice.toString())
                          }}
                          className="w-44 rounded-lg bg-white/[0.05] border border-white/[0.1] text-white text-sm py-2 px-3 focus:outline-none focus:border-emerald-500/50"
                        >
                          {propertyOptions.map(option => (
                            <option key={option.id} value={option.id} className="bg-gray-900">
                              {option.title}
                            </option>
                          ))}
                        </select>

                        {/* Price input */}
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm">$</span>
                          <input
                            type="text"
                            value={newRowPrice}
                            onChange={(e) => setNewRowPrice(e.target.value.replace(/[^0-9]/g, ''))}
                            placeholder="Price"
                            className="w-32 rounded-lg bg-white/[0.05] border border-white/[0.1] text-white text-sm py-2 pl-7 pr-3 focus:outline-none focus:border-emerald-500/50 placeholder:text-slate-500"
                          />
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-1 ml-auto">
                          <button
                            onClick={handleConfirmNewRow}
                            className="p-2 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 transition-colors"
                            title="Save"
                          >
                            <Check className="w-4 h-4" />
                          </button>
                          <button
                            onClick={handleCancelNewRow}
                            className="p-2 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
                            title="Cancel"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Add New Button */}
                {!isCreatingNew && (
                  <motion.button
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
              className={cn(
                "mx-auto px-6 py-8",
                isEmbedded ? "max-w-6xl" : "max-w-7xl"
              )}
            >
              {/* Breadcrumb Header */}
              <div className="mb-8">
                {/* Breadcrumbs - only for standalone mode */}
                {!isEmbedded && (
                  <div className="flex items-center gap-2 text-sm mb-6">
                    <Link
                      href="/dashboard"
                      className="text-slate-500 hover:text-slate-300 transition-colors font-medium"
                    >
                      Dashboard
                    </Link>
                    <span className="text-slate-700">/</span>
                    <button
                      onClick={handleSaveAndClose}
                      className="text-slate-500 hover:text-slate-300 transition-colors font-medium"
                    >
                      Property Scenarios
                    </button>
                    <span className="text-slate-700">/</span>
                    <span className="text-slate-300 font-medium">
                      {editingScenario?.name || selectedOption?.title}
                    </span>
                  </div>
                )}

                <div className="flex items-center gap-4">
                  <button
                    onClick={handleSaveAndClose}
                    className="p-2 rounded-xl bg-white/[0.03] border border-white/[0.06] text-slate-400 hover:text-white hover:bg-white/[0.06] transition-all"
                  >
                    <ArrowLeft className="w-5 h-5" />
                  </button>
                  <div className={cn(
                    "w-12 h-12 rounded-xl flex items-center justify-center",
                    "bg-gradient-to-br shadow-lg",
                    selectedOption?.color
                  )}>
                    <span className={selectedOption?.accentColor}>
                      {selectedOption?.icon}
                    </span>
                  </div>
                  <div>
                    <h1 className="text-2xl font-semibold text-white tracking-tight">
                      {editingScenario?.name || selectedOption?.title}
                    </h1>
                    <p className="text-sm text-slate-500">
                      {selectedOption?.title} · {selectedOption?.priceRange}
                    </p>
                  </div>
                </div>
              </div>

              {/* Prominent Purchase/Sale Segmented Control */}
              <div className="flex items-center justify-center mb-8">
                <div className="flex items-center gap-2 p-2 bg-white/[0.03] border border-white/[0.08] rounded-2xl">
                  <button
                    onClick={() => setActiveResultsTab('purchase')}
                    className={cn(
                      "py-3.5 px-8 rounded-xl text-base font-semibold transition-all duration-200 flex items-center gap-3",
                      activeResultsTab === 'purchase'
                        ? "bg-white/[0.12] text-white shadow-lg border border-white/[0.1]"
                        : "text-slate-400 hover:text-slate-200 hover:bg-white/[0.04]"
                    )}
                  >
                    <Home className="w-5 h-5" />
                    Purchase Planning
                  </button>
                  <button
                    onClick={() => setActiveResultsTab('sale')}
                    className={cn(
                      "py-3.5 px-8 rounded-xl text-base font-semibold transition-all duration-200 flex items-center gap-3",
                      activeResultsTab === 'sale'
                        ? "bg-orange-500/20 text-orange-400 shadow-lg border border-orange-500/20"
                        : "text-slate-400 hover:text-slate-200 hover:bg-white/[0.04]"
                    )}
                  >
                    <Banknote className="w-5 h-5" />
                    Sale Planning
                  </button>
                </div>
              </div>

              {/* 2-Column Layout: Form on LEFT, Results on RIGHT */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* LEFT Column: Form Panel */}
                <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] backdrop-blur-xl p-6">
                  {/* Form Content */}
                  <AnimatePresence mode="wait">
                    {activeResultsTab === 'purchase' ? (
                      <motion.div
                        key="mortgage-form"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 10 }}
                        transition={{ duration: 0.2 }}
                      >
                        <MortgageForm
                          inputs={inputs}
                          onChange={handleInputChange}
                          propertyType={selectedType}
                          accentColor={selectedOption?.accentColor || 'text-white'}
                        />
                      </motion.div>
                    ) : (
                      <motion.div
                        key="sale-form"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 10 }}
                        transition={{ duration: 0.2 }}
                      >
                        <h2 className="text-lg font-semibold text-white mb-6">Sale Parameters</h2>
                        <SaleParametersForm
                          saleInputs={saleInputs}
                          onSaleInputChange={handleSaleInputChange}
                          saleResult={saleResult}
                          propertyPrice={inputs.propertyPrice}
                          propertyType={selectedType}
                        />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* RIGHT Column: Results Panel */}
                <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] backdrop-blur-xl p-6">
                  <TabbedResultsPanel
                    calculation={calculation}
                    accentColor={selectedOption?.accentColor || 'text-white'}
                    propertyType={selectedType}
                    saleInputs={saleInputs}
                    saleResult={saleResult}
                    propertyPrice={inputs.propertyPrice}
                    activeTab={activeResultsTab}
                    absdRate={inputs.absdRate}
                  />
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}

// Default page export - uses the view without onClose (standalone mode)
export default function PropertyPlannerPage() {
  return <PropertyPlannerV2View />
}

/**
 * Property Planner Local Calculations
 *
 * These calculations provide real-time preview while editing scenarios.
 * When scenarios are saved, the backend computes definitive values.
 *
 * Usage:
 * - Use these for immediate feedback during form editing
 * - Use API computed values (scenario.computed) for saved scenarios
 * - TabbedResultsPanel falls back to these when API data isn't available
 */

import type {
  MortgageInputs,
  MortgageCalculationResult,
  SaleInputs,
  SaleResult,
  AmortizationYear,
  FeeItem,
} from '../types'

// ============================================
// FORMATTING UTILITIES
// ============================================

export function formatCurrency(amount: number): string {
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

export function formatCompactCurrency(value: number): string {
  return new Intl.NumberFormat('en-SG', {
    style: 'currency',
    currency: 'SGD',
    notation: 'compact',
    maximumFractionDigits: 1,
    minimumFractionDigits: 0,
  }).format(value)
}

export function formatMonthYear(dateString: string): string {
  // Input: "YYYY-MM" format, Output: "MMM YYYY" format (e.g., "Jun 2025")
  const [year, month] = dateString.split('-')
  const date = new Date(parseInt(year), parseInt(month) - 1)
  return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
}

// ============================================
// MORTGAGE CALCULATIONS
// ============================================

export function calculateMortgage(inputs: MortgageInputs): MortgageCalculationResult {
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
    bsdAmount,
    absdAmount,
    calculatedPurchaseFees,
    totalPurchaseFees,
    cov,
    totalUpfrontCash,
  }
}

// ============================================
// SALE CALCULATIONS
// ============================================

/**
 * Calculate Seller's Stamp Duty rate based on holding period
 * SSD applies only if selling within 4 years of purchase
 */
export function calculateSsdRate(holdingPeriodMonths: number): number {
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
export function calculateCpfAccruedInterest(principal: number, months: number): number {
  const years = months / 12
  const rate = 0.025  // 2.5% per annum
  return principal * (Math.pow(1 + rate, years) - 1)
}

/**
 * Calculate fee amount based on type and base price
 */
export function calculateFeeAmount(fee: FeeItem, basePrice: number): number {
  if (!fee.enabled) return 0
  if (fee.type === 'percentage') {
    return basePrice * (fee.value / 100)
  }
  return fee.value
}

/**
 * Calculate sale proceeds based on sale inputs and mortgage state
 */
export function calculateSaleProceeds(
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

/**
 * Helper to calculate monthly OA inflow from salary (simplified ~21% of income for <35 y/o)
 */
export function calculateMonthlyOaInflow(monthlyIncome: number): number {
  return Math.round(monthlyIncome * 0.23 * 0.9216)
}

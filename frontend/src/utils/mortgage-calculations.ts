import type { MortgageInputs, MortgageCalculationResult } from '../types/property'

export function calculateMortgage(inputs: MortgageInputs): MortgageCalculationResult {
  const {
    loanAmount,
    loanTermYears,
    fixedYears,
    fixedRate,
    floatingRate,
    householdIncome,
    otherDebt,
    loanStartMonth
  } = inputs

  const totalMonths = loanTermYears * 12
  const fixedMonths = fixedYears * 12
  const floatingMonths = totalMonths - fixedMonths

  // Calculate monthly payment using weighted average rate
  const weightedRate = (
    (fixedRate * fixedMonths + floatingRate * floatingMonths) / totalMonths
  ) / 100 / 12

  const monthlyPayment = weightedRate > 0
    ? loanAmount * (weightedRate * Math.pow(1 + weightedRate, totalMonths)) /
      (Math.pow(1 + weightedRate, totalMonths) - 1)
    : loanAmount / totalMonths

  const totalInterest = monthlyPayment * totalMonths - loanAmount
  const msrRatio = Math.min((monthlyPayment + otherDebt) / householdIncome, 1.5)

  // Calculate loan end date
  const startDate = new Date(loanStartMonth + '-01')
  const endDate = new Date(startDate)
  endDate.setMonth(endDate.getMonth() + totalMonths)
  const loanEndDate = endDate.toISOString().slice(0, 7)

  // Generate amortization schedule
  const amortization = generateAmortizationSchedule(
    loanAmount,
    monthlyPayment,
    weightedRate,
    totalMonths,
    loanTermYears
  )

  return {
    monthlyPayment,
    totalInterest,
    msrRatio,
    loanEndDate,
    amortization
  }
}

function generateAmortizationSchedule(
  loanAmount: number,
  monthlyPayment: number,
  monthlyRate: number,
  totalMonths: number,
  loanTermYears: number
) {
  const balancePoints = []
  const composition = []
  let remainingBalance = loanAmount

  for (let year = 1; year <= loanTermYears; year++) {
    let yearlyInterest = 0
    let yearlyPrincipal = 0

    // Calculate 12 months for this year
    for (let month = 1; month <= 12; month++) {
      if ((year - 1) * 12 + month > totalMonths) break

      const interestPayment = remainingBalance * monthlyRate
      const principalPayment = monthlyPayment - interestPayment

      yearlyInterest += interestPayment
      yearlyPrincipal += principalPayment
      remainingBalance -= principalPayment
    }

    balancePoints.push({
      label: `Year ${year}`,
      balance: Math.max(0, remainingBalance),
      year,
      yearIndex: year - 1
    })

    composition.push({
      label: `Year ${year}`,
      interest: yearlyInterest,
      principal: yearlyPrincipal,
      year,
      yearIndex: year - 1
    })
  }

  return {
    balancePoints,
    composition
  }
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-SG', {
    style: 'currency',
    currency: 'SGD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

export function formatPercentage(ratio: number): string {
  return (ratio * 100).toFixed(1) + '%'
}

export function getMSRStatus(msrRatio: number) {
  if (msrRatio <= 0.30) {
    return { status: 'good', color: 'text-emerald-400', message: 'Within MSR guideline' }
  } else {
    return { status: 'warning', color: 'text-amber-400', message: 'Exceeds 30% MSR limit' }
  }
}
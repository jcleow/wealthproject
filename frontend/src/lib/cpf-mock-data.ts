// Mock data for CPF simulation frontend
import type {
  CPFProfile,
  CPFISInvestment,
  InvestibleBalance,
  RSTUResult,
  CPFHousingUsage,
  PropertySaleAnalysis,
  CPFProjectionYear,
  RetirementProjection,
  EducationLoan,
  GrantCalculationResult,
  CPFAssumptions,
} from '@/types/cpf'
import { DEFAULT_CPF_ASSUMPTIONS } from '@/types/cpf'

// Current year constants
const CURRENT_YEAR = new Date().getFullYear()
const FRS_2024 = 205800
const BRS_2024 = 102900
const ERS_2024 = 308700
const BHS_2024 = 68500

// Mock CPF Profile
export const mockCPFProfile: CPFProfile = {
  id: 'cpf-profile-1',
  dateOfBirth: '1990-05-15',
  age: 34,
  residencyStatus: 'CITIZEN',
  balances: {
    oa: 85000,
    sa: 45000,
    ma: 32000,
    ra: 0,
  },
  monthlyIncome: 8500,
  annualBonus: 25500,
}

// Mock CPFIS Data
export const mockInvestibleBalance: InvestibleBalance = {
  oaInvestible: 65000, // 85000 - 20000 reserve
  saInvestible: 5000, // 45000 - 40000 reserve
  totalInvestible: 70000,
  stocksAllocated: 15000,
  goldAllocated: 3000,
  otherAllocated: 12000,
  stocksAvailable: 7750, // 35% of 65000 - 15000
  goldAvailable: 3500, // 10% of 65000 - 3000
  otherAvailable: 35000,
}

export const mockCPFISInvestments: CPFISInvestment[] = [
  {
    id: 'inv-1',
    account: 'OA',
    productType: 'etf',
    productName: 'Nikko AM STI ETF',
    units: 500,
    purchasePrice: 15000,
    purchaseDate: '2023-06-15',
    currentValue: 16200,
    ter: 0.003,
    status: 'active',
  },
  {
    id: 'inv-2',
    account: 'OA',
    productType: 'tbill',
    productName: '6-Month T-Bill (Oct 2024)',
    units: 1,
    purchasePrice: 10000,
    purchaseDate: '2024-04-15',
    currentValue: 10180,
    ter: 0,
    status: 'active',
  },
  {
    id: 'inv-3',
    account: 'OA',
    productType: 'gold',
    productName: 'SPDR Gold Shares',
    units: 15,
    purchasePrice: 3000,
    purchaseDate: '2024-01-10',
    currentValue: 3250,
    ter: 0.004,
    status: 'active',
  },
  {
    id: 'inv-4',
    account: 'SA',
    productType: 'sgs',
    productName: 'SGS Bond (2029)',
    units: 1,
    purchasePrice: 5000,
    purchaseDate: '2024-02-20',
    currentValue: 5100,
    ter: 0,
    status: 'active',
  },
]

// Mock RSTU Tax Relief Calculation
export function calculateMockRSTU(
  selfTopUp: number,
  familyTopUp: number,
  taxableIncome: number
): RSTUResult {
  const SELF_CAP = 8000
  const FAMILY_CAP = 8000

  const selfRelief = Math.min(selfTopUp, SELF_CAP)
  const familyRelief = Math.min(familyTopUp, FAMILY_CAP)
  const totalRelief = selfRelief + familyRelief

  // Singapore tax brackets (simplified)
  let marginalRate = 0
  if (taxableIncome > 320000) marginalRate = 0.22
  else if (taxableIncome > 160000) marginalRate = 0.18
  else if (taxableIncome > 120000) marginalRate = 0.15
  else if (taxableIncome > 80000) marginalRate = 0.115
  else if (taxableIncome > 40000) marginalRate = 0.07
  else if (taxableIncome > 30000) marginalRate = 0.035
  else if (taxableIncome > 20000) marginalRate = 0.02
  else marginalRate = 0

  return {
    selfRelief,
    familyRelief,
    totalRelief,
    selfReliefRemaining: SELF_CAP - selfRelief,
    familyReliefRemaining: FAMILY_CAP - familyRelief,
    taxSavings: Math.round(totalRelief * marginalRate),
    marginalTaxRate: marginalRate,
  }
}

// Mock OA to SA Transfer
export function calculateMockOAtoSATransfer(
  currentOA: number,
  currentSA: number,
  age: number,
  transferAmount: number
) {
  const FRS = FRS_2024
  const maxTransferable = Math.max(0, FRS - currentSA)

  if (age >= 55) {
    return {
      maxTransferable: 0,
      actualTransfer: 0,
      newOABalance: currentOA,
      newSABalance: currentSA,
      taxReliefEligible: 0,
      allowed: false,
      blockedReason: 'OA to SA transfers are not allowed after age 55',
      warnings: [],
    }
  }

  const actualTransfer = Math.min(transferAmount, maxTransferable, currentOA)

  return {
    maxTransferable,
    actualTransfer,
    newOABalance: currentOA - actualTransfer,
    newSABalance: currentSA + actualTransfer,
    taxReliefEligible: actualTransfer,
    allowed: true,
    warnings:
      actualTransfer > 0
        ? ['This transfer is one-way and cannot be reversed']
        : [],
  }
}

// Mock CPF Housing Usage
export const mockCPFHousingUsage: CPFHousingUsage = {
  propertyScenarioId: 'prop-1',
  downPayment: {
    oaUsed: 80000,
    cashUsed: 20000,
    grantReceived: 50000,
    grantType: 'EHG',
  },
  monthlyPayments: Array.from({ length: 60 }, (_, i) => ({
    month: new Date(2020, i, 1).toISOString().slice(0, 7),
    oaUsed: 1200,
    cashUsed: 800,
    principalPortion: 1400,
    interestPortion: 600,
  })),
  totals: {
    totalOAUsed: 152000, // 80000 + (1200 * 60)
    totalCashUsed: 68000, // 20000 + (800 * 60)
    oaForDownPayment: 80000,
    oaForMonthlyPayments: 72000,
  },
  accruedInterest: {
    asOfDate: new Date().toISOString(),
    totalAccrued: 19760,
    yearlyBreakdown: [
      { year: 2020, startingPrincipal: 80000, interestForYear: 2000, cumulativeInterest: 2000 },
      { year: 2021, startingPrincipal: 94400, interestForYear: 2360, cumulativeInterest: 4360 },
      { year: 2022, startingPrincipal: 108800, interestForYear: 2720, cumulativeInterest: 7080 },
      { year: 2023, startingPrincipal: 123200, interestForYear: 3080, cumulativeInterest: 10160 },
      { year: 2024, startingPrincipal: 137600, interestForYear: 3440, cumulativeInterest: 13600 },
      { year: 2025, startingPrincipal: 152000, interestForYear: 3800, cumulativeInterest: 17400 },
    ],
  },
}

// Mock Property Sale Analysis
export const mockPropertySaleAnalysis: PropertySaleAnalysis = {
  saleDate: '2030-06-15',
  grossProceeds: 650000,
  outstandingLoan: 280000,
  sellingCosts: 15000,
  cpfRefundRequired: {
    principalUsed: 152000,
    accruedInterest: 38000,
    totalRefund: 190000,
  },
  refundDestination: {
    toOA: 190000,
    toRA: 0,
    reason: 'Member is below age 55, all refunds go to OA',
  },
  netCashProceeds: 165000,
  warnings: [],
}

// Mock CPF Projection (30 years)
// Now accepts optional assumptions parameter for user-adjustable projections
export function generateMockProjection(
  profile: CPFProfile,
  assumptions: CPFAssumptions = DEFAULT_CPF_ASSUMPTIONS
): CPFProjectionYear[] {
  const years: CPFProjectionYear[] = []
  let { oa, sa, ma } = profile.balances
  let ra = 0

  // Use assumptions for growth rates
  // Note: In production, employment status is derived from income entries in the timeline
  const { interestRates, frsGrowthRate, salaryGrowthRate, retirementAge } = assumptions

  // Initial salary (will grow each year)
  let currentMonthlyIncome = profile.monthlyIncome
  let currentAnnualBonus = profile.annualBonus

  for (let i = 0; i <= 30; i++) {
    const age = profile.age + i
    const year = CURRENT_YEAR + i

    // Apply salary growth at year end (except first year)
    if (i > 0) {
      currentMonthlyIncome *= (1 + salaryGrowthRate)
      currentAnnualBonus *= (1 + salaryGrowthRate)
    }

    const monthlyContribution = currentMonthlyIncome * 0.37 // Total CPF contribution ~37%
    const annualContribution = monthlyContribution * 12 + currentAnnualBonus * 0.37

    // Age 55: RA formation
    if (age === 55 && ra === 0) {
      const frs = FRS_2024 * Math.pow(1 + frsGrowthRate, i) // FRS grows per assumption
      const saTransfer = Math.min(sa, frs)
      const oaTransfer = Math.min(oa, Math.max(0, frs - saTransfer))
      ra = saTransfer + oaTransfer
      sa = sa - saTransfer
      oa = oa - oaTransfer
    }

    // Calculate contributions by age band
    let oaRate = 0.23, saRate = 0.06, maRate = 0.08
    if (age > 55 && age <= 60) {
      oaRate = 0.15; saRate = 0.035; maRate = 0.095
    } else if (age > 60 && age <= 65) {
      oaRate = 0.105; saRate = 0.025; maRate = 0.095
    } else if (age > 65) {
      oaRate = 0.05; saRate = 0.01; maRate = 0.0825
    }

    // Contributions stop at retirement age
    // Note: In production, this is derived from income entries in the timeline
    const isEmployed = age <= retirementAge
    const contributions = isEmployed ? annualContribution : 0
    const oaContrib = contributions * (oaRate / 0.37)
    const saContrib = age < 55 ? contributions * (saRate / 0.37) : 0
    const maContrib = contributions * (maRate / 0.37)
    const raContrib = age >= 55 ? contributions * (saRate / 0.37) : 0

    // Interest using assumptions
    const oaInterest = oa * interestRates.oa
    const saInterest = sa * interestRates.sa
    const maInterest = ma * interestRates.ma
    const raInterest = ra * interestRates.ra

    // Extra interest calculation
    // First $60k of combined balances (OA capped at $20k for this calculation)
    const oaForExtra = Math.min(oa, 20000)
    const combinedForExtra = oaForExtra + sa + ma + ra
    const extraFirst60k = Math.min(combinedForExtra, 60000) * interestRates.extraFirst60k

    // Additional extra for 55+ on first $30k
    let extraAbove55 = 0
    if (age >= 55) {
      const combinedFirst30k = Math.min(combinedForExtra, 30000)
      extraAbove55 = combinedFirst30k * interestRates.extraFirst30kAbove55
    }

    const totalExtraInterest = extraFirst60k + extraAbove55

    oa = oa + oaContrib + oaInterest
    sa = sa + saContrib + saInterest + (age < 55 ? totalExtraInterest : 0)
    ma = Math.min(ma + maContrib + maInterest, BHS_2024 * Math.pow(1 + frsGrowthRate, i))
    ra = ra + raContrib + raInterest + (age >= 55 ? totalExtraInterest : 0)

    years.push({
      year,
      age,
      oa: Math.round(oa),
      sa: Math.round(sa),
      ma: Math.round(ma),
      ra: Math.round(ra),
      total: Math.round(oa + sa + ma + ra),
      contributions: Math.round(contributions),
      interest: Math.round(oaInterest + saInterest + maInterest + raInterest + totalExtraInterest),
    })
  }

  return years
}

// Mock Retirement Projection
export function generateMockRetirementProjection(
  projection: CPFProjectionYear[]
): RetirementProjection {
  const age55 = projection.find((p) => p.age === 55)
  const age65 = projection.find((p) => p.age === 65)

  return {
    age55Balances: {
      oa: age55?.oa ?? 0,
      sa: age55?.sa ?? 0,
      ma: age55?.ma ?? 0,
      ra: age55?.ra ?? 0,
    },
    age65Balances: {
      oa: age65?.oa ?? 0,
      sa: age65?.sa ?? 0,
      ma: age65?.ma ?? 0,
      ra: age65?.ra ?? 0,
    },
    frsTarget: FRS_2024 * Math.pow(1.03, 21), // FRS at age 55 (21 years from now)
    brsTarget: BRS_2024 * Math.pow(1.03, 21),
    ersTarget: ERS_2024 * Math.pow(1.03, 21),
    cpfLifeEstimates: {
      standard: Math.round((age65?.ra ?? 0) / 200), // Rough estimate
      basic: Math.round((age65?.ra ?? 0) / 230),
      escalating: Math.round((age65?.ra ?? 0) / 250),
    },
  }
}

// Mock Education Loan
export const mockEducationLoan: EducationLoan = {
  id: 'edu-1',
  borrower: 'self',
  institution: 'National University of Singapore',
  course: 'Bachelor of Computing',
  principal: 32000,
  interestRate: 0.025,
  withdrawalDate: '2022-08-01',
  repaymentStartDate: '2026-08-01',
  repaymentEndDate: '2038-08-01',
  monthlyRepayment: 280,
  totalRepayment: 40320,
  totalInterest: 8320,
  status: 'active',
}

// Mock Housing Grants
export const mockGrantCalculation: GrantCalculationResult = {
  ehg: {
    eligible: true,
    amount: 50000,
    reason: 'Household income below $9,000/month',
  },
  fhg: {
    eligible: true,
    amount: 25000,
    reason: 'First-time applicant with family nucleus',
  },
  phg: {
    eligible: true,
    amount: 30000,
    reason: 'Living within 4km of parents',
  },
  stepUp: {
    eligible: false,
    amount: 0,
    reason: 'Only for 2-room flat buyers moving to 3-room or larger',
  },
  totalGrants: 105000,
  warnings: [],
}

// CPF Interest Rates
export const CPF_RATES = {
  oa: 0.025,
  sa: 0.04,
  ma: 0.04,
  ra: 0.04,
  extraFirst60k: 0.01,
  extraNext30k55Plus: 0.01,
  housingAccrued: 0.025,
}

// CPF Limits
export const CPF_LIMITS = {
  owCeiling: 6800,
  annualCeiling: 102000,
  frs2024: FRS_2024,
  brs2024: BRS_2024,
  ers2024: ERS_2024,
  bhs2024: BHS_2024,
  cpfisOAReserve: 20000,
  cpfisSAReserve: 40000,
  cpfisStocksLimit: 0.35,
  cpfisGoldLimit: 0.10,
  rstuSelfCap: 8000,
  rstuFamilyCap: 8000,
}

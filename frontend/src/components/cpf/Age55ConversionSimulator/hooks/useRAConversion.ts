import { useMemo } from 'react'
import { CPF_CONSTANTS, type TargetSum } from '@/lib/cpf-constants'
import type { CPFAssumptions } from '@/types/cpf'

export interface ConversionResult {
  saToRa: number
  oaToRa: number
  maOverflow: number
  cashTopUp: number
  raTotal: number
  oaRemaining: number
  saRemaining: number
  withdrawable: number
  maRemaining: number
  raAt65: number
  qualifiesForCPFLife: boolean
  shortfall: number
  // RSS at 65 calculations
  rssMonthlyPayout: number
  rssYearsOfPayout: number
  rssDepletionAge: number
}

interface CalculateRAConversionInputs {
  oaBalance: number
  saBalance: number
  maBalance: number
  targetSum: TargetSum
  hasPropertyPledge: boolean
  cashBalance: number
  assumptions: CPFAssumptions
}

export function calculateRAConversion(
  inputs: CalculateRAConversionInputs
): ConversionResult {
  const { oaBalance, saBalance, maBalance, targetSum, cashBalance, assumptions } =
    inputs

  // Determine target amount based on selection
  const target = CPF_CONSTANTS[targetSum]

  // Auto-transfer cap: For ERS, only FRS amount is auto-transferred
  const autoTransferCap = targetSum === 'ERS' ? CPF_CONSTANTS.FRS : target

  // Step 1: SA transfers first (all of it, up to cap)
  const saToRa = Math.min(saBalance, autoTransferCap)
  const saRemaining = Math.max(0, saBalance - saToRa)

  // Step 2: OA fills gap
  const remainingNeeded = Math.max(0, autoTransferCap - saToRa)
  const oaToRa = Math.min(oaBalance, remainingNeeded)
  const oaRemaining = oaBalance - oaToRa

  // Step 3: MA overflow (if MA > BHS, excess goes to RA)
  const maOverflow = Math.max(0, maBalance - CPF_CONSTANTS.BHS)
  const maRemaining = Math.min(maBalance, CPF_CONSTANTS.BHS)

  // Step 4: Calculate RA total (auto-transfer portion)
  let raTotal = saToRa + oaToRa + maOverflow

  // Step 5: ERS cash top-up (if applicable)
  let cashTopUp = 0
  let shortfall = 0
  if (targetSum === 'ERS') {
    const ersGap = CPF_CONSTANTS.ERS - raTotal
    if (ersGap > 0) {
      cashTopUp = Math.min(cashBalance, ersGap)
      raTotal += cashTopUp
      shortfall = Math.max(0, ersGap - cashTopUp)
    }
  }

  // Step 6: Calculate withdrawable amount
  const withdrawable = oaRemaining + saRemaining

  // Step 7: Project to age 65 (using RA interest rate from assumptions for 10 years)
  const raAt65 = raTotal * Math.pow(1 + assumptions.interestRates.ra, 10)
  const qualifiesForCPFLife = raAt65 >= CPF_CONSTANTS.MRS

  // Step 8: Calculate RSS payout details (for those below MRS)
  const rssTargetYears = 25 // Target: payouts until age 90
  const rssMonthlyPayout = raAt65 / (rssTargetYears * 12)

  // Calculate how long the RSS will actually last at this payout rate
  let rssYearsOfPayout = 0
  if (rssMonthlyPayout > 0) {
    const monthlyRate = 0.04 / 12
    const pvRatio = (raAt65 * monthlyRate) / rssMonthlyPayout
    if (pvRatio < 1) {
      rssYearsOfPayout =
        -Math.log(1 - pvRatio) / (12 * Math.log(1 + monthlyRate))
    } else {
      rssYearsOfPayout = 30 // Effectively perpetual with interest
    }
  }
  const rssDepletionAge = 65 + rssYearsOfPayout

  return {
    saToRa,
    oaToRa,
    maOverflow,
    cashTopUp,
    raTotal,
    oaRemaining,
    saRemaining,
    withdrawable,
    maRemaining,
    raAt65,
    qualifiesForCPFLife,
    shortfall,
    rssMonthlyPayout,
    rssYearsOfPayout,
    rssDepletionAge,
  }
}

export function projectBalancesToAge55(
  currentAge: number,
  oaBalance: number,
  saBalance: number,
  maBalance: number,
  assumptions: CPFAssumptions
): { oa: number; sa: number; ma: number } {
  const yearsToAge55 = Math.max(0, 55 - currentAge)
  const { interestRates } = assumptions

  return {
    oa: oaBalance * Math.pow(1 + interestRates.oa, yearsToAge55),
    sa: saBalance * Math.pow(1 + interestRates.sa, yearsToAge55),
    ma: maBalance * Math.pow(1 + interestRates.ma, yearsToAge55),
  }
}

interface UseRAConversionOptions {
  inputMode: 'current' | 'manual'
  currentAge: number
  currentOA: number
  currentSA: number
  currentMA: number
  manualOA: number
  manualSA: number
  manualMA: number
  targetSum: TargetSum
  hasPropertyPledge: boolean
  cashBalance: number
  assumptions: CPFAssumptions
}

export function useRAConversion(options: UseRAConversionOptions) {
  const {
    inputMode,
    currentAge,
    currentOA,
    currentSA,
    currentMA,
    manualOA,
    manualSA,
    manualMA,
    targetSum,
    hasPropertyPledge,
    cashBalance,
    assumptions,
  } = options

  // Calculate projected or manual balances
  const balancesAt55 = useMemo(() => {
    if (inputMode === 'current') {
      return projectBalancesToAge55(
        currentAge,
        currentOA,
        currentSA,
        currentMA,
        assumptions
      )
    }
    return { oa: manualOA, sa: manualSA, ma: manualMA }
  }, [
    inputMode,
    currentAge,
    currentOA,
    currentSA,
    currentMA,
    manualOA,
    manualSA,
    manualMA,
    assumptions,
  ])

  // Calculate conversion results
  const result = useMemo(() => {
    return calculateRAConversion({
      oaBalance: balancesAt55.oa,
      saBalance: balancesAt55.sa,
      maBalance: balancesAt55.ma,
      targetSum,
      hasPropertyPledge,
      cashBalance: targetSum === 'ERS' ? cashBalance : 0,
      assumptions,
    })
  }, [balancesAt55, targetSum, hasPropertyPledge, cashBalance, assumptions])

  return { balancesAt55, result }
}

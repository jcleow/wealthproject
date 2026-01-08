/**
 * Stress Test Calculator for Singapore Insurance Planning
 *
 * This calculates how a user's financial protection holds up against
 * specific life events (cancer, accident, stroke, death, severe disability)
 * across different time horizons (6 months, 2 years, 5 years, lifetime).
 *
 * Key design decisions:
 * - Uses Singapore-specific medical cost assumptions
 * - Considers government schemes (DPS, CareShield, MediShield)
 * - Returns event-based risk statements, not just dollar gaps
 */

import type {
  StressEvent,
  StressTimeframe,
  StressTestMatrix,
  StressTestCell,
  FinancialImpact,
  ResourcesAvailable,
  CoverageStatus,
  SGMedicalCostAssumptions,
} from '@/types/insurance'
import {
  defaultSGAssumptions,
  stressTimeframeConfig,
} from '@/types/insurance'

// User financial profile for stress test calculation
export interface UserFinancialProfile {
  // Income
  monthlyIncome: number
  annualBonus?: number

  // Expenses
  monthlyExpenses: number

  // Savings
  emergencyFund: number
  liquidAssets: number

  // Liabilities
  outstandingMortgage: number
  otherDebts: number

  // Dependents
  hasDependents: boolean
  numberOfDependents: number
  youngestDependentAge?: number

  // CPF
  cpfMABalance: number

  // Insurance coverage
  insurance: {
    life: number
    criticalIllness: number
    hospitalisation: {
      hasISP: boolean
      wardClass: 'A' | 'B1' | 'B2' | 'C' | 'none'
    }
    disability: {
      tpd: number
      idiiMonthly: number
    }
    accident: number
  }

  // Government schemes
  governmentSchemes: {
    dps: { active: boolean; amount: number }
    careshield: { active: boolean; monthlyPayout: number }
    medishieldLife: boolean
  }
}

/**
 * Main stress test calculation function
 */
export function calculateStressTest(
  profile: UserFinancialProfile,
  assumptions: SGMedicalCostAssumptions = defaultSGAssumptions
): StressTestMatrix {
  const events: StressEvent[] = [
    'cancer',
    'accident',
    'stroke',
    'death',
    'severe_disability',
  ]
  const timeframes: StressTimeframe[] = [
    '6_months',
    '2_years',
    '5_years',
    'lifetime',
  ]

  const results: StressTestMatrix['results'] = {} as StressTestMatrix['results']
  let coveredCount = 0
  let partialCount = 0
  let exposedCount = 0
  let worstExposure: StressTestCell | null = null

  for (const event of events) {
    results[event] = {} as Record<StressTimeframe, StressTestCell>

    for (const timeframe of timeframes) {
      const cell = calculateCell(event, timeframe, profile, assumptions)
      results[event][timeframe] = cell

      // Track summary stats
      if (cell.status === 'covered') coveredCount++
      else if (cell.status === 'partial') partialCount++
      else {
        exposedCount++
        if (!worstExposure || cell.shortfall > worstExposure.shortfall) {
          worstExposure = cell
        }
      }
    }
  }

  return {
    results,
    summary: {
      coveredCount,
      partialCount,
      exposedCount,
      worstExposure,
      mostUrgentGap: worstExposure
        ? getUrgentGapDescription(worstExposure)
        : undefined,
    },
    calculatedAt: new Date().toISOString(),
  }
}

function calculateCell(
  event: StressEvent,
  timeframe: StressTimeframe,
  profile: UserFinancialProfile,
  assumptions: SGMedicalCostAssumptions
): StressTestCell {
  const months = stressTimeframeConfig[timeframe].months

  // Calculate financial impact
  const impact = calculateImpact(event, months, profile, assumptions)

  // Calculate available resources
  const resources = calculateResources(event, months, profile)

  // Determine coverage status
  const coveragePercentage =
    impact.totalNeed > 0
      ? Math.min((resources.totalResources / impact.totalNeed) * 100, 100)
      : 100

  const status: CoverageStatus =
    coveragePercentage >= 90
      ? 'covered'
      : coveragePercentage >= 50
      ? 'partial'
      : 'exposed'

  const shortfall = Math.max(0, impact.totalNeed - resources.totalResources)

  // Generate risk statement (event-based, not dollar-based)
  const riskStatement = generateRiskStatement(
    event,
    timeframe,
    status,
    profile,
    impact,
    resources
  )

  const keyInsight = generateKeyInsight(event, timeframe, status, impact, resources)

  return {
    event,
    timeframe,
    impact,
    resources,
    coveragePercentage,
    status,
    shortfall,
    riskStatement,
    keyInsight,
  }
}

function calculateImpact(
  event: StressEvent,
  months: number,
  profile: UserFinancialProfile,
  assumptions: SGMedicalCostAssumptions
): FinancialImpact {
  switch (event) {
    case 'cancer':
      return calculateCancerImpact(months, profile, assumptions)
    case 'accident':
      return calculateAccidentImpact(months, profile, assumptions)
    case 'stroke':
      return calculateStrokeImpact(months, profile, assumptions)
    case 'death':
      return calculateDeathImpact(months, profile, assumptions)
    case 'severe_disability':
      return calculateDisabilityImpact(months, profile, assumptions)
  }
}

function calculateCancerImpact(
  months: number,
  profile: UserFinancialProfile,
  assumptions: SGMedicalCostAssumptions
): FinancialImpact {
  const { cancer } = assumptions

  // Use mid-stage as moderate assumption
  const medicalCosts =
    (cancer.midStage.min + cancer.midStage.max) / 2 +
    Math.max(0, months - 12) * cancer.ongoingMonthly

  // Income loss: acute phase (100%) + recovery phase (50%)
  const acuteMonths = Math.min(months, cancer.incomeLossMonths.acute)
  const recoveryMonths = Math.min(
    Math.max(0, months - cancer.incomeLossMonths.acute),
    cancer.incomeLossMonths.recovery
  )
  const incomeLoss =
    acuteMonths * profile.monthlyIncome +
    recoveryMonths * profile.monthlyIncome * 0.5

  return {
    medicalCosts,
    careCosts: 0,
    otherCosts: 0,
    incomeLoss,
    debtSettlement: 0,
    totalNeed: medicalCosts + incomeLoss,
  }
}

function calculateAccidentImpact(
  months: number,
  profile: UserFinancialProfile,
  assumptions: SGMedicalCostAssumptions
): FinancialImpact {
  const { accident } = assumptions

  // Use moderate severity
  const medicalCosts = accident.moderate.medical
  const incomeLossMonths = Math.min(months, accident.moderate.incomeLossMonths)
  const incomeLoss = incomeLossMonths * profile.monthlyIncome

  return {
    medicalCosts,
    careCosts: 0,
    otherCosts: 0,
    incomeLoss,
    debtSettlement: 0,
    totalNeed: medicalCosts + incomeLoss,
  }
}

function calculateStrokeImpact(
  months: number,
  profile: UserFinancialProfile,
  assumptions: SGMedicalCostAssumptions
): FinancialImpact {
  const { stroke } = assumptions

  // Use moderate severity
  const medicalCosts = stroke.moderate.medical
  const rehabCosts = Math.min(months, 24) * stroke.moderate.rehabMonthly
  const incomeLossMonths = Math.min(months, stroke.moderate.incomeLossMonths)
  const incomeLoss = incomeLossMonths * profile.monthlyIncome

  return {
    medicalCosts,
    careCosts: rehabCosts,
    otherCosts: 0,
    incomeLoss,
    debtSettlement: 0,
    totalNeed: medicalCosts + rehabCosts + incomeLoss,
  }
}

function calculateDeathImpact(
  months: number,
  profile: UserFinancialProfile,
  assumptions: SGMedicalCostAssumptions
): FinancialImpact {
  const { death } = assumptions

  const finalExpenses = death.funeral + death.estateSettlement
  const debtSettlement = profile.outstandingMortgage + profile.otherDebts

  // Income replacement for dependents
  let incomeReplacement = 0
  if (profile.hasDependents) {
    const yearsOfSupport =
      months >= 360 // lifetime
        ? Math.max(0, 22 - (profile.youngestDependentAge ?? 0))
        : months / 12
    incomeReplacement = profile.monthlyIncome * 12 * yearsOfSupport
  }

  // Education fund (simplified: $100k per child)
  const educationFund = profile.hasDependents
    ? profile.numberOfDependents * 100000
    : 0

  return {
    medicalCosts: finalExpenses,
    careCosts: 0,
    otherCosts: educationFund,
    incomeLoss: incomeReplacement,
    debtSettlement,
    totalNeed: finalExpenses + debtSettlement + incomeReplacement + educationFund,
  }
}

function calculateDisabilityImpact(
  months: number,
  profile: UserFinancialProfile,
  assumptions: SGMedicalCostAssumptions
): FinancialImpact {
  const { severeDisability } = assumptions

  const homeModification = severeDisability.homeModification
  const caregivingMonthly =
    (severeDisability.caregivingMonthly.min +
      severeDisability.caregivingMonthly.max) /
    2
  const careCosts = caregivingMonthly * months
  const medicalCosts = severeDisability.medicalMonthly * months
  const incomeLoss = profile.monthlyIncome * months // 100% permanent loss

  return {
    medicalCosts,
    careCosts,
    otherCosts: homeModification,
    incomeLoss,
    debtSettlement: 0,
    totalNeed: medicalCosts + careCosts + homeModification + incomeLoss,
  }
}

function calculateResources(
  event: StressEvent,
  months: number,
  profile: UserFinancialProfile
): ResourcesAvailable {
  const { insurance, governmentSchemes } = profile

  const insuranceBreakdown = {
    life: 0,
    criticalIllness: 0,
    disability: 0,
    hospitalisation: 0,
    accident: 0,
  }

  // Insurance payouts depend on event type
  switch (event) {
    case 'cancer':
    case 'stroke':
      insuranceBreakdown.criticalIllness = insurance.criticalIllness
      if (insurance.hospitalisation.hasISP) {
        insuranceBreakdown.hospitalisation =
          insurance.hospitalisation.wardClass === 'A'
            ? 150000
            : insurance.hospitalisation.wardClass === 'B1'
            ? 100000
            : 50000
      }
      break
    case 'accident':
      insuranceBreakdown.accident = insurance.accident
      if (insurance.hospitalisation.hasISP) {
        insuranceBreakdown.hospitalisation = 50000
      }
      break
    case 'death':
      insuranceBreakdown.life = insurance.life
      break
    case 'severe_disability':
      insuranceBreakdown.disability =
        insurance.disability.tpd +
        insurance.disability.idiiMonthly * months
      break
  }

  const insurancePayout = Object.values(insuranceBreakdown).reduce(
    (a, b) => a + b,
    0
  )

  // Government scheme payouts
  const governmentBreakdown = {
    dps: 0,
    careshield: 0,
    medishield: 0,
  }

  if (event === 'death' && governmentSchemes.dps.active) {
    governmentBreakdown.dps = governmentSchemes.dps.amount
  }

  if (event === 'severe_disability' && governmentSchemes.careshield.active) {
    governmentBreakdown.careshield =
      governmentSchemes.careshield.monthlyPayout * months
  }

  if (
    governmentSchemes.medishieldLife &&
    ['cancer', 'accident', 'stroke'].includes(event)
  ) {
    // MediShield Life has limits - rough estimate
    governmentBreakdown.medishield = Math.min(100000, months > 12 ? 100000 : 50000)
  }

  const governmentPayouts = Object.values(governmentBreakdown).reduce(
    (a, b) => a + b,
    0
  )

  // Personal resources
  const savingsAvailable = profile.emergencyFund + profile.liquidAssets

  // CPF MediSave for medical expenses (limited)
  const cpfWithdrawable =
    event !== 'death'
      ? Math.min(profile.cpfMABalance, 15000 * Math.ceil(months / 12))
      : 0

  return {
    insurancePayout,
    insuranceBreakdown,
    governmentPayouts,
    governmentBreakdown,
    savingsAvailable,
    cpfWithdrawable,
    totalResources:
      insurancePayout + governmentPayouts + savingsAvailable + cpfWithdrawable,
  }
}

function generateRiskStatement(
  event: StressEvent,
  timeframe: StressTimeframe,
  status: CoverageStatus,
  profile: UserFinancialProfile,
  impact: FinancialImpact,
  resources: ResourcesAvailable
): string {
  const timeLabel = stressTimeframeConfig[timeframe].label.toLowerCase()

  if (status === 'covered') {
    switch (event) {
      case 'cancer':
        return `Coverage adequate for ${timeLabel} of cancer treatment and recovery`
      case 'accident':
        return `Protected against ${timeLabel} of accident-related expenses`
      case 'stroke':
        return `Rehabilitation and income covered for ${timeLabel}`
      case 'death':
        return profile.hasDependents
          ? `Family protected for ${timeLabel}`
          : `Final expenses and debts covered`
      case 'severe_disability':
        return `Care costs covered for ${timeLabel}`
    }
  }

  if (status === 'partial') {
    const coverageMonths = Math.round(
      (resources.totalResources / impact.totalNeed) *
        stressTimeframeConfig[timeframe].months
    )
    switch (event) {
      case 'cancer':
        return `Coverage supports ~${coverageMonths} months, then income at risk`
      case 'accident':
        return `Partial coverage - may need savings for full recovery`
      case 'stroke':
        return `Rehab covered partially - long-term income at risk`
      case 'death':
        return profile.hasDependents
          ? `Family has ~${Math.round(coverageMonths / 12)} years of support`
          : `Most expenses covered, some debt may remain`
      case 'severe_disability':
        return `Care covered for ~${coverageMonths} months, then exposed`
    }
  }

  // Exposed status
  switch (event) {
    case 'cancer':
      return `Family at risk if illness lasts beyond ${Math.round(
        (resources.totalResources / impact.totalNeed) *
          stressTimeframeConfig[timeframe].months
      )} months`
    case 'accident':
      return `Savings would deplete during extended recovery`
    case 'stroke':
      return `Long-term rehabilitation costs would exceed coverage`
    case 'death':
      return profile.hasDependents
        ? `Family would need alternative income source`
        : `Debts may not be fully settled`
    case 'severe_disability':
      return `Caregiving costs would exceed available resources`
  }
}

function generateKeyInsight(
  event: StressEvent,
  _timeframe: StressTimeframe,
  status: CoverageStatus,
  impact: FinancialImpact,
  resources: ResourcesAvailable
): string {
  if (status === 'covered') {
    return 'Your current coverage is adequate for this scenario'
  }

  // Identify the main gap
  const { insuranceBreakdown } = resources

  switch (event) {
    case 'cancer':
    case 'stroke':
      if (insuranceBreakdown.criticalIllness < impact.incomeLoss) {
        return 'CI coverage insufficient for extended income replacement'
      }
      return 'Medical costs exceed hospitalisation coverage'
    case 'accident':
      return 'Personal accident coverage below typical costs'
    case 'death':
      if (insuranceBreakdown.life < impact.debtSettlement) {
        return 'Life coverage insufficient to clear debts'
      }
      return 'Life coverage below dependent needs'
    case 'severe_disability':
      return 'Disability coverage below long-term care costs'
  }
}

function getUrgentGapDescription(cell: StressTestCell): string {
  const eventLabel =
    cell.event === 'severe_disability'
      ? 'severe disability'
      : cell.event === 'cancer'
      ? 'critical illness'
      : cell.event
  return `${eventLabel.charAt(0).toUpperCase() + eventLabel.slice(1)} coverage`
}

// Helper to create mock data for UI development
export function createMockStressTestMatrix(): StressTestMatrix {
  const mockProfile: UserFinancialProfile = {
    monthlyIncome: 8000,
    monthlyExpenses: 5000,
    emergencyFund: 50000,
    liquidAssets: 20000,
    outstandingMortgage: 350000,
    otherDebts: 10000,
    hasDependents: true,
    numberOfDependents: 2,
    youngestDependentAge: 8,
    cpfMABalance: 30000,
    insurance: {
      life: 350000,
      criticalIllness: 100000,
      hospitalisation: { hasISP: true, wardClass: 'B1' },
      disability: { tpd: 70000, idiiMonthly: 0 },
      accident: 100000,
    },
    governmentSchemes: {
      dps: { active: true, amount: 70000 },
      careshield: { active: true, monthlyPayout: 662 },
      medishieldLife: true,
    },
  }

  return calculateStressTest(mockProfile)
}

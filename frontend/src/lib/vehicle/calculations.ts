import type {
  VehicleInputs,
  VehicleRecurringCosts,
  VehicleCalculationResult,
  VehicleCategory,
  FuelType,
  VesPeriod,
  DepreciationPeriod,
  YearlyDepreciation,
  TotalCostOfOwnership,
} from '@/types/vehicle'
import {
  ARF_TIERS,
  ROAD_TAX_ICE_TIERS,
  ROAD_TAX_EV_TIERS,
  ROAD_TAX_MOTORCYCLE_TIERS,
  VES_BANDS,
  EEAI_SCHEDULE,
  PARF_REBATE_SCHEDULE,
  LTV_LIMITS,
  REGISTRATION_FEE,
  EXCISE_DUTY_RATE,
  GST_RATE,
  ROAD_TAX_REBATE_FACTOR,
  EV_AFC_SIX_MONTHLY,
  PARF_CAP,
  COE_DURATION_MONTHS,
} from './constants'

// ─── ARF (Additional Registration Fee) ──────────────────

export function calculateARF(omv: number): number {
  let arf = 0
  let remaining = omv
  let previousLimit = 0

  for (const tier of ARF_TIERS) {
    const taxable = Math.min(remaining, tier.limit - previousLimit)
    arf += taxable * tier.rate
    remaining -= taxable
    previousLimit = tier.limit
    if (remaining <= 0) break
  }

  return Math.round(arf)
}

// ─── VES (Vehicular Emissions Scheme) ───────────────────

export function calculateVES(
  co2: number | null,
  fuelType: FuelType,
  period: VesPeriod
): number {
  if (co2 === null) return 0
  const isEv = fuelType === 'electric'
  const bands = VES_BANDS[period]

  for (const band of bands) {
    const bandEntry = band as { maxCo2: number; amount: number; evOnly?: boolean }
    if (bandEntry.evOnly && !isEv) continue
    if (co2 <= bandEntry.maxCo2) return bandEntry.amount
  }

  return 0
}

// ─── EEAI (EV Early Adoption Incentive) ─────────────────

export function calculateEEAI(
  arf: number,
  fuelType: FuelType,
  period: VesPeriod
): number {
  if (fuelType !== 'electric') return 0
  const schedule = EEAI_SCHEDULE[period]
  if (schedule.rate === 0) return 0
  const rebate = arf * schedule.rate
  return -Math.min(rebate, schedule.cap)
}

// ─── Registration Cost ──────────────────────────────────

export function calculateRegistrationCost(inputs: VehicleInputs) {
  const exciseDuty = Math.round(inputs.omv * EXCISE_DUTY_RATE)
  const gst = Math.round((inputs.omv + exciseDuty) * GST_RATE)
  const arf = calculateARF(inputs.omv)
  const vesAmount = calculateVES(inputs.co2EmissionsGkm, inputs.fuelType, inputs.vesPeriod)
  const eeaiRebate = calculateEEAI(arf, inputs.fuelType, inputs.vesPeriod)

  const totalRegistrationCost =
    inputs.omv + exciseDuty + gst + arf + inputs.coePrice +
    REGISTRATION_FEE + vesAmount + eeaiRebate

  return {
    exciseDuty,
    gst,
    arf,
    registrationFee: REGISTRATION_FEE,
    vesAmount,
    eeaiRebate,
    totalRegistrationCost,
  }
}

// ─── Road Tax ───────────────────────────────────────────

function calculateTieredRoadTax(
  value: number,
  tiers: readonly { limit: number; base: number; rate: number }[]
): number {
  for (let i = 0; i < tiers.length; i++) {
    if (value <= tiers[i].limit) {
      const prevLimit = i === 0 ? 0 : tiers[i - 1].limit
      return tiers[i].base + tiers[i].rate * (value - prevLimit)
    }
  }
  return 0
}

export function calculateRoadTax(
  category: VehicleCategory,
  fuelType: FuelType,
  engineCapacityCc: number | null,
  powerKw: number | null
): { sixMonthly: number; annual: number } {
  const isEv = fuelType === 'electric'
  const isMotorcycle = category === 'motorcycle_cat_d'

  let baseSixMonthly: number
  if (isMotorcycle) {
    baseSixMonthly = calculateTieredRoadTax(engineCapacityCc ?? 0, ROAD_TAX_MOTORCYCLE_TIERS)
  } else if (isEv) {
    baseSixMonthly = calculateTieredRoadTax(powerKw ?? 0, ROAD_TAX_EV_TIERS)
  } else {
    baseSixMonthly = calculateTieredRoadTax(engineCapacityCc ?? 0, ROAD_TAX_ICE_TIERS)
  }

  let sixMonthly = baseSixMonthly * ROAD_TAX_REBATE_FACTOR
  if (isEv && !isMotorcycle) sixMonthly += EV_AFC_SIX_MONTHLY

  return {
    sixMonthly: Math.round(sixMonthly * 100) / 100,
    annual: Math.round(sixMonthly * 2 * 100) / 100,
  }
}

// ─── Financing ──────────────────────────────────────────

export function calculateFinancing(inputs: VehicleInputs, totalRegistrationCost: number) {
  const isMotorcycle = inputs.vehicleCategory === 'motorcycle_cat_d'

  let maxLtvPercent: number
  if (isMotorcycle) maxLtvPercent = 1.0
  else if (inputs.omv <= LTV_LIMITS.lowOmv.threshold) maxLtvPercent = LTV_LIMITS.lowOmv.maxLtv
  else maxLtvPercent = LTV_LIMITS.highOmv.maxLtv

  const purchasePrice = inputs.condition === 'used' ? inputs.listPrice : totalRegistrationCost
  const maxLoanAllowed = Math.round(purchasePrice * maxLtvPercent)

  if (!inputs.useFinancing || inputs.loanAmount <= 0) {
    return {
      effectiveInterestRate: 0,
      monthlyInstallment: 0,
      totalInterestPaid: 0,
      totalLoanRepayment: 0,
      downpayment: purchasePrice,
      maxLtvPercent,
      maxLoanAllowed,
    }
  }

  const loanAmount = Math.min(inputs.loanAmount, maxLoanAllowed)
  const downpayment = purchasePrice - loanAmount
  const monthlyPayments = inputs.loanTenureYears * 12
  const flatRate = inputs.interestRateFlat / 100
  const effectiveInterestRate = (2 * monthlyPayments * flatRate) / (monthlyPayments + 1)
  const monthlyRate = effectiveInterestRate / 12

  let monthlyInstallment: number
  if (monthlyRate === 0) {
    monthlyInstallment = loanAmount / monthlyPayments
  } else {
    monthlyInstallment =
      (loanAmount * monthlyRate) / (1 - Math.pow(1 + monthlyRate, -monthlyPayments))
  }

  const totalLoanRepayment = monthlyInstallment * monthlyPayments
  const totalInterestPaid = totalLoanRepayment - loanAmount

  return {
    effectiveInterestRate: Math.round(effectiveInterestRate * 10000) / 10000,
    monthlyInstallment: Math.round(monthlyInstallment),
    totalInterestPaid: Math.round(totalInterestPaid),
    totalLoanRepayment: Math.round(totalLoanRepayment),
    downpayment: Math.round(downpayment),
    maxLtvPercent,
    maxLoanAllowed,
  }
}

// ─── Depreciation ───────────────────────────────────────

function getDepreciationRateForYear(year: number, periods: DepreciationPeriod[]): number {
  for (const period of periods) {
    if (year >= period.startYear && (period.endYear === null || year <= period.endYear)) {
      return period.annualRate / 100
    }
  }
  return 0.05
}

function getPARFRebatePercent(ageAtDereg: number): number {
  for (const entry of PARF_REBATE_SCHEDULE) {
    if (ageAtDereg <= entry.maxAge) return entry.rebatePercent
  }
  return 0
}

export function calculateDepreciation(
  registrationCost: number,
  arf: number,
  coePrice: number,
  periods: DepreciationPeriod[],
  vehicleAge: number,
  remainingCoeMonths: number,
  isPARFEligible: boolean
): YearlyDepreciation[] {
  const schedule: YearlyDepreciation[] = []
  let currentMarketValue = registrationCost

  for (let year = 1; year <= 10; year++) {
    const rate = getDepreciationRateForYear(year, periods)
    const annualDep = Math.round(currentMarketValue * rate)
    currentMarketValue = Math.max(0, currentMarketValue - annualDep)

    const ageAtDereg = vehicleAge + year
    let parfRebate = 0
    if (isPARFEligible && ageAtDereg <= 10) {
      parfRebate = Math.min(
        Math.round(arf * getPARFRebatePercent(ageAtDereg)),
        PARF_CAP
      )
    }

    const monthsUsed = year * 12
    const monthsRemaining = Math.max(0, remainingCoeMonths - monthsUsed)
    const coeRebate = Math.round(coePrice * (monthsRemaining / COE_DURATION_MONTHS))

    const scrapValue = parfRebate + coeRebate
    const cumulativeDepreciation = registrationCost - currentMarketValue

    schedule.push({
      year,
      marketValue: currentMarketValue,
      scrapValue,
      parfRebate,
      coeRebate,
      annualDepreciation: annualDep,
      cumulativeDepreciation,
    })
  }

  return schedule
}

// ─── Total Cost of Ownership ────────────────────────────

export function calculateTCO(
  inputs: VehicleInputs,
  recurringCosts: VehicleRecurringCosts,
  calculationResult: {
    totalRegistrationCost: number
    totalInterestPaid: number
    annualRoadTax: number
    depreciationSchedule: YearlyDepreciation[]
  },
  ownershipYears: number
): TotalCostOfOwnership {
  const upfrontCosts = inputs.condition === 'used'
    ? inputs.listPrice
    : calculationResult.totalRegistrationCost

  const totalRoadTax = calculationResult.annualRoadTax * ownershipYears
  const totalInsurance = recurringCosts.insuranceAnnual * ownershipYears
  const totalFuel = recurringCosts.fuelMonthly * 12 * ownershipYears
  const totalMaintenance = recurringCosts.maintenanceAnnual * ownershipYears
  const totalParking = recurringCosts.parkingMonthly * 12 * ownershipYears
  const totalErp = recurringCosts.erpMonthly * 12 * ownershipYears
  const totalOther = recurringCosts.otherMonthly * 12 * ownershipYears

  const yearIndex = Math.min(ownershipYears, calculationResult.depreciationSchedule.length) - 1
  const residualValue = yearIndex >= 0
    ? calculationResult.depreciationSchedule[yearIndex].scrapValue
    : 0

  const totalLoanInterest = inputs.useFinancing ? calculationResult.totalInterestPaid : 0

  const netTotalCost =
    upfrontCosts + totalLoanInterest + totalRoadTax + totalInsurance +
    totalFuel + totalMaintenance + totalParking + totalErp + totalOther - residualValue

  const totalMonths = ownershipYears * 12

  return {
    years: ownershipYears,
    upfrontCosts,
    totalLoanInterest,
    totalRoadTax,
    totalInsurance,
    totalFuel,
    totalMaintenance,
    totalParking,
    totalErp,
    totalOther,
    residualValue,
    netTotalCost: Math.round(netTotalCost),
    costPerMonth: Math.round(netTotalCost / totalMonths),
    costPerYear: Math.round(netTotalCost / ownershipYears),
  }
}

// ─── Master Calculation ─────────────────────────────────

export function calculateVehicle(
  inputs: VehicleInputs,
  recurringCosts: VehicleRecurringCosts,
  ownershipYears: number = 10
): VehicleCalculationResult {
  const registration = calculateRegistrationCost(inputs)
  const financing = calculateFinancing(inputs, registration.totalRegistrationCost)
  const roadTax = calculateRoadTax(
    inputs.vehicleCategory,
    inputs.fuelType,
    inputs.engineCapacityCc,
    inputs.powerKw
  )

  const depreciationBase = inputs.condition === 'used'
    ? inputs.listPrice
    : registration.totalRegistrationCost

  const depreciationSchedule = calculateDepreciation(
    depreciationBase,
    registration.arf,
    inputs.coePrice,
    inputs.depreciationPeriods,
    inputs.vehicleAge,
    inputs.remainingCoeMonths,
    inputs.isPafrEligible
  )

  const totalCostOfOwnership = calculateTCO(
    inputs,
    recurringCosts,
    {
      totalRegistrationCost: registration.totalRegistrationCost,
      totalInterestPaid: financing.totalInterestPaid,
      annualRoadTax: roadTax.annual,
      depreciationSchedule,
    },
    ownershipYears
  )

  return {
    ...registration,
    ...financing,
    sixMonthlyRoadTax: roadTax.sixMonthly,
    annualRoadTax: roadTax.annual,
    depreciationSchedule,
    totalCostOfOwnership,
  }
}

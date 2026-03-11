// ─── Enums ───────────────────────────────────────────

export type VehicleCategory = 'car_cat_a' | 'car_cat_b' | 'motorcycle_cat_d'
export type FuelType = 'petrol' | 'diesel' | 'electric' | 'hybrid_petrol' | 'hybrid_diesel'
export type VehicleCondition = 'new' | 'used'
export type VesPeriod = '2024_2025' | '2026' | '2027'
export type VehicleTabId = 'vehicle' | 'costs' | 'depreciation' | 'tco' | 'scenarios'

// ─── Main Scenario ───────────────────────────────────

export interface VehicleScenario {
  id: string
  name: string
  inputs: VehicleInputs
  recurringCosts: VehicleRecurringCosts
  isIncluded: boolean
  createdAt: number
  updatedAt: number
}

// ─── User Inputs ─────────────────────────────────────

export interface VehicleInputs {
  vehicleCategory: VehicleCategory
  fuelType: FuelType
  condition: VehicleCondition
  engineCapacityCc: number | null
  powerKw: number | null
  co2EmissionsGkm: number | null

  vehicleAge: number
  remainingCoeMonths: number
  isPafrEligible: boolean

  omv: number
  listPrice: number
  coePrice: number
  vesPeriod: VesPeriod

  useFinancing: boolean
  loanAmount: number
  loanTenureYears: number
  interestRateFlat: number

  purchaseMonth: string
  depreciationPeriods: DepreciationPeriod[]
  downpaymentCashAccountId: string | null
}

export interface DepreciationPeriod {
  id: string
  startYear: number
  endYear: number | null
  annualRate: number
}

// ─── Recurring Costs ─────────────────────────────────

export interface VehicleRecurringCosts {
  insuranceAnnual: number
  fuelMonthly: number
  maintenanceAnnual: number
  parkingMonthly: number
  erpMonthly: number
  otherMonthly: number
}

// ─── Calculation Results ─────────────────────────────

export interface VehicleCalculationResult {
  exciseDuty: number
  gst: number
  arf: number
  registrationFee: number
  vesAmount: number
  eeaiRebate: number
  totalRegistrationCost: number

  effectiveInterestRate: number
  monthlyInstallment: number
  totalInterestPaid: number
  totalLoanRepayment: number
  downpayment: number
  maxLtvPercent: number
  maxLoanAllowed: number

  sixMonthlyRoadTax: number
  annualRoadTax: number

  depreciationSchedule: YearlyDepreciation[]
  totalCostOfOwnership: TotalCostOfOwnership
}

export interface YearlyDepreciation {
  year: number
  marketValue: number
  scrapValue: number
  parfRebate: number
  coeRebate: number
  annualDepreciation: number
  cumulativeDepreciation: number
}

export interface TotalCostOfOwnership {
  years: number
  upfrontCosts: number
  totalLoanInterest: number
  totalRoadTax: number
  totalInsurance: number
  totalFuel: number
  totalMaintenance: number
  totalParking: number
  totalErp: number
  totalOther: number
  residualValue: number
  netTotalCost: number
  costPerMonth: number
  costPerYear: number
}

import type { DepreciationPeriod } from '@/types/vehicle'

// ─── ARF Tiers (revised Feb 2023) ─────────────────────

export const ARF_TIERS = [
  { limit: 20000, rate: 1.00 },
  { limit: 40000, rate: 1.40 },
  { limit: 60000, rate: 1.90 },
  { limit: 80000, rate: 2.50 },
  { limit: Infinity, rate: 3.20 },
] as const

// ─── Road Tax Tiers (6-monthly base formulas) ────────

export const ROAD_TAX_ICE_TIERS = [
  { limit: 600, base: 200, rate: 0 },
  { limit: 1000, base: 200, rate: 0.125 },
  { limit: 1600, base: 250, rate: 0.375 },
  { limit: 3000, base: 475, rate: 0.75 },
  { limit: Infinity, base: 1525, rate: 1.0 },
] as const

export const ROAD_TAX_EV_TIERS = [
  { limit: 7.5, base: 200, rate: 0 },
  { limit: 30, base: 200, rate: 2.0 },
  { limit: 230, base: 250, rate: 3.75 },
  { limit: Infinity, base: 1525, rate: 10.0 },
] as const

export const ROAD_TAX_MOTORCYCLE_TIERS = [
  { limit: 200, base: 40, rate: 0 },
  { limit: 1000, base: 40, rate: 0.15 },
  { limit: Infinity, base: 160, rate: 0.30 },
] as const

// ─── VES Bands ─────────────────────────────────────────

export const VES_BANDS = {
  '2024_2025': [
    { maxCo2: 90, amount: -25000 },
    { maxCo2: 120, amount: -5000 },
    { maxCo2: 159, amount: 0 },
    { maxCo2: 182, amount: 15000 },
    { maxCo2: Infinity, amount: 25000 },
  ],
  '2026': [
    { maxCo2: 0, amount: -22500, evOnly: true },
    { maxCo2: 159, amount: 0 },
    { maxCo2: 182, amount: 7500 },
    { maxCo2: 210, amount: 22500 },
    { maxCo2: Infinity, amount: 35000 },
  ],
  '2027': [
    { maxCo2: 0, amount: -20000, evOnly: true },
    { maxCo2: 159, amount: 0 },
    { maxCo2: 182, amount: 15000 },
    { maxCo2: 210, amount: 30000 },
    { maxCo2: Infinity, amount: 45000 },
  ],
} as const

// ─── EEAI (EV Early Adoption Incentive) ──────────────

export const EEAI_SCHEDULE = {
  '2024_2025': { rate: 0.45, cap: 15000 },
  '2026': { rate: 0.45, cap: 7500 },
  '2027': { rate: 0, cap: 0 },
} as const

// ─── PARF Rebate Schedule ─────────────────────────────

export const PARF_REBATE_SCHEDULE = [
  { maxAge: 5, rebatePercent: 0.75 },
  { maxAge: 6, rebatePercent: 0.70 },
  { maxAge: 7, rebatePercent: 0.65 },
  { maxAge: 8, rebatePercent: 0.60 },
  { maxAge: 9, rebatePercent: 0.55 },
  { maxAge: 10, rebatePercent: 0.50 },
] as const

// ─── LTV Limits (MAS Regulation) ─────────────────────

export const LTV_LIMITS = {
  lowOmv: { threshold: 20000, maxLtv: 0.70 },
  highOmv: { maxLtv: 0.60 },
} as const

// ─── Fixed Constants ──────────────────────────────────

export const MAX_LOAN_TENURE_YEARS = 7
export const REGISTRATION_FEE = 220
export const EXCISE_DUTY_RATE = 0.20
export const GST_RATE = 0.09
export const ROAD_TAX_REBATE_FACTOR = 0.782
export const EV_AFC_SIX_MONTHLY = 350
export const PARF_CAP = 60000
export const COE_DURATION_MONTHS = 120

// ─── Default Depreciation Periods ─────────────────────

export const DEFAULT_DEPRECIATION_PERIODS: DepreciationPeriod[] = [
  { id: 'yr1', startYear: 1, endYear: 1, annualRate: 15 },
  { id: 'yr2-3', startYear: 2, endYear: 3, annualRate: 10 },
  { id: 'yr4-5', startYear: 4, endYear: 5, annualRate: 8 },
  { id: 'yr6+', startYear: 6, endYear: null, annualRate: 5 },
]

// ─── Default Recurring Costs ──────────────────────────

export const DEFAULT_RECURRING_COSTS = {
  car: {
    maintenanceAnnual: 1500,
    insuranceAnnual: 1200,
    fuelMonthly: 200,
    parkingMonthly: 0,
    erpMonthly: 0,
    otherMonthly: 0,
  },
  motorcycle: {
    maintenanceAnnual: 500,
    insuranceAnnual: 300,
    fuelMonthly: 80,
    parkingMonthly: 0,
    erpMonthly: 0,
    otherMonthly: 0,
  },
} as const

import { z } from 'zod'

// Insurance Category Enum
export const insuranceCategoryEnum = z.enum([
  'life',
  'critical_illness',
  'hospitalization',
  'disability',
  'accident',
  'custom',
])

export type InsuranceCategory = z.infer<typeof insuranceCategoryEnum>

// Insurance Subcategory Labels
export const insuranceSubcategories: Record<InsuranceCategory, string[]> = {
  life: ['term', 'whole_life', 'universal', 'variable'],
  critical_illness: ['early_stage', 'multi_pay', 'standalone', 'rider'],
  hospitalization: ['isp', 'hospital_cash', 'surgical'],
  disability: ['income_protection', 'tpd_rider', 'long_term_care'],
  accident: ['personal_accident', 'group_accident'],
  custom: [],
}

// Singapore Government Schemes
export const governmentSchemeEnum = z.enum([
  'medishield_life',
  'careshield_life',
  'eldershield',
  'dps', // Dependant's Protection Scheme
])

export type GovernmentScheme = z.infer<typeof governmentSchemeEnum>

// Government Scheme Metadata
export const governmentSchemeInfo: Record<
  GovernmentScheme,
  {
    name: string
    description: string
    coverageType: InsuranceCategory
    defaultCoverage?: number
  }
> = {
  medishield_life: {
    name: 'MediShield Life',
    description: 'Basic health insurance for all Singapore Citizens and PRs',
    coverageType: 'hospitalization',
  },
  careshield_life: {
    name: 'CareShield Life',
    description: 'Long-term care insurance for severe disability (born 1980+)',
    coverageType: 'disability',
    defaultCoverage: 662, // Monthly payout in 2025
  },
  eldershield: {
    name: 'ElderShield',
    description: 'Legacy long-term care scheme (enrolled before 2020)',
    coverageType: 'disability',
    defaultCoverage: 400, // Monthly payout
  },
  dps: {
    name: "Dependant's Protection Scheme",
    description: 'Death and TPD coverage via CPF',
    coverageType: 'life',
    defaultCoverage: 70000, // $70k for age 59 and below
  },
}

// Premium Frequency
export const premiumFrequencyEnum = z.enum(['monthly', 'quarterly', 'annually'])

export type PremiumFrequency = z.infer<typeof premiumFrequencyEnum>

// ISO DateTime validator
const isoDateTime = z
  .string()
  .refine(
    (value) => !Number.isNaN(Date.parse(value)),
    'Expected an ISO-8601 timestamp'
  )

// Insurance Policy Schema
export const insurancePolicySchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  category: insuranceCategoryEnum,
  subcategory: z.string().optional(),

  // Government scheme (if applicable)
  governmentScheme: governmentSchemeEnum.optional(),
  isGovernmentScheme: z.boolean().default(false),

  // Coverage amounts
  coverageAmount: z.number().nonnegative(),
  deathBenefit: z.number().nonnegative().optional(),
  criticalIllnessBenefit: z.number().nonnegative().optional(),
  tpdBenefit: z.number().nonnegative().optional(),
  dailyHospitalCash: z.number().nonnegative().optional(),
  monthlyPayout: z.number().nonnegative().optional(), // For disability/LTC

  // Premium details
  premiumAmount: z.number().nonnegative(),
  premiumFrequency: premiumFrequencyEnum,

  // Policy dates
  startDate: isoDateTime,
  endDate: isoDateTime.optional(), // null for whole life
  renewalDate: isoDateTime.optional(),

  // Provider info
  insurerName: z.string().optional(),
  policyNumber: z.string().optional(),

  // Linking to expense
  linkedExpenseId: z.string().optional(),

  // Status
  isActive: z.boolean().default(true),

  notes: z.string().optional(),
  createdAt: isoDateTime,
  updatedAt: isoDateTime,
})

export type InsurancePolicy = z.infer<typeof insurancePolicySchema>

// Create/Update payloads
export type InsurancePolicyCreatePayload = Omit<
  InsurancePolicy,
  'id' | 'createdAt' | 'updatedAt'
> & { id?: string }

export type InsurancePolicyUpdatePayload = Partial<
  Omit<InsurancePolicy, 'id' | 'createdAt' | 'updatedAt'>
>

// Coverage Needs - calculated based on user's financial profile
export interface CoverageNeeds {
  life: {
    total: number
    components: {
      incomeReplacement: number // 9-10x annual income
      outstandingDebts: number // Mortgage + other loans
      childrenEducation: number // Education fund per child
      finalExpenses: number // Funeral, estate settlement
      emergencyFund: number // 6-12 months expenses
    }
  }
  criticalIllness: {
    total: number
    components: {
      incomeReplacement: number // 3.4x annual income (LIA)
      medicalCosts: number // Estimated treatment costs
      recoveryMonths: number // Months of income replacement
    }
  }
  hospitalization: {
    wardClass: 'A' | 'B1' | 'B2' | 'C'
    ispRecommended: boolean
    estimatedAnnualPremium: number
  }
  disability: {
    monthlyBenefit: number
    coveragePeriodYears: number
    total: number
  }
}

// Gap Analysis Result
export interface CoverageGap {
  category: InsuranceCategory
  categoryLabel: string
  needed: number
  current: number
  gap: number // needed - current (positive = shortfall)
  coveragePercentage: number // (current / needed) * 100, capped at 100
  priority: 'critical' | 'high' | 'medium' | 'low'
  recommendation: string
}

// Protection Score
export interface ProtectionScore {
  overall: number // 0-100
  byCategory: Record<InsuranceCategory, number>
  lastCalculated: string
}

// Recommendation for closing gaps
export interface InsuranceRecommendation {
  id: string
  category: InsuranceCategory
  type: string // e.g., 'term_life', 'early_ci'
  priority: 1 | 2 | 3 | 4 | 5 // 1 = highest priority
  suggestedCoverage: number
  estimatedMonthlyPremium: { min: number; max: number }
  rationale: string
  actionItems: string[]
}

// Government Coverage Status
export interface GovernmentCoverageStatus {
  scheme: GovernmentScheme
  isActive: boolean
  coverageAmount?: number
  monthlyPayout?: number
  notes?: string
}

// Category display configuration
export const insuranceCategoryConfig: Record<
  InsuranceCategory,
  {
    label: string
    shortLabel: string
    icon: string // Lucide icon name
    color: string // Tailwind color
    description: string
  }
> = {
  life: {
    label: 'Life Insurance',
    shortLabel: 'Life',
    icon: 'Shield',
    color: 'blue',
    description: 'Death and TPD coverage for dependents',
  },
  critical_illness: {
    label: 'Critical Illness',
    shortLabel: 'CI',
    icon: 'Heart',
    color: 'purple',
    description: 'Lump-sum payout upon diagnosis of severe illness',
  },
  hospitalization: {
    label: 'Hospitalization',
    shortLabel: 'Health',
    icon: 'Building2',
    color: 'emerald',
    description: 'Hospital and surgical expenses coverage',
  },
  disability: {
    label: 'Disability',
    shortLabel: 'Disability',
    icon: 'Accessibility',
    color: 'amber',
    description: 'Income protection and long-term care',
  },
  accident: {
    label: 'Accident',
    shortLabel: 'Accident',
    icon: 'AlertTriangle',
    color: 'rose',
    description: 'Personal accident and injury coverage',
  },
  custom: {
    label: 'Other Insurance',
    shortLabel: 'Other',
    icon: 'Plus',
    color: 'slate',
    description: 'Home, travel, and other coverage',
  },
}

// LIA Guidelines for quick calculation
export const liaGuidelines = {
  lifeInsurance: {
    incomeMultiplier: 10, // 9-10x annual income
    description: 'Recommended: 9-10x annual income',
  },
  criticalIllness: {
    incomeMultiplier: 3.4, // 3.4-4x annual income
    description: 'Recommended: 3.4-4x annual income',
  },
}

// Priority thresholds for gap analysis
export const gapPriorityThresholds = {
  critical: 25, // < 25% coverage = critical
  high: 50, // 25-50% = high
  medium: 75, // 50-75% = medium
  low: 100, // 75-100% = low (but not fully covered)
}

// Helper to get priority from coverage percentage
export function getGapPriority(
  coveragePercentage: number
): CoverageGap['priority'] {
  if (coveragePercentage < gapPriorityThresholds.critical) return 'critical'
  if (coveragePercentage < gapPriorityThresholds.high) return 'high'
  if (coveragePercentage < gapPriorityThresholds.medium) return 'medium'
  return 'low'
}

// Helper to format coverage amount
export function formatCoverageAmount(amount: number): string {
  if (amount >= 1_000_000) {
    return `$${(amount / 1_000_000).toFixed(1)}M`
  }
  if (amount >= 1_000) {
    return `$${(amount / 1_000).toFixed(0)}K`
  }
  return `$${amount.toFixed(0)}`
}

// ============================================================================
// RISK LAYER MODEL
// Replaces single "protection score" with 5 independent risk layers
// ============================================================================

export type RiskLayer =
  | 'medical_costs' // Hospitalization, surgery
  | 'income_interruption' // CI, temporary disability
  | 'permanent_disability' // TPD, LTC
  | 'death_dependency' // Life insurance for dependents
  | 'old_age_care' // CareShield, ElderShield

export type CoverageStatus = 'covered' | 'partial' | 'exposed'

export interface RiskLayerStatus {
  layer: RiskLayer
  status: CoverageStatus
  summary: string // e.g., "Ward B1 with ISP + rider"
  details: string[]
  governmentCoverage?: { scheme: GovernmentScheme; contribution: string }[]
  privateCoverage?: { policyName: string; contribution: string }[]
  exposureNotes?: string[]
}

export interface RiskCoverageSummary {
  coveredCount: number
  partialCount: number
  exposedCount: number
  totalLayers: number
  layers: RiskLayerStatus[]
  lastCalculated?: string
}

export const riskLayerConfig: Record<
  RiskLayer,
  {
    label: string
    shortLabel: string
    icon: string
    color: string
    description: string
    governmentSchemes: GovernmentScheme[]
    privateCategories: InsuranceCategory[]
  }
> = {
  medical_costs: {
    label: 'Medical Costs',
    shortLabel: 'Medical',
    icon: 'Stethoscope',
    color: 'emerald',
    description: 'Hospital bills, surgeries, treatments',
    governmentSchemes: ['medishield_life'],
    privateCategories: ['hospitalization'],
  },
  income_interruption: {
    label: 'Income Interruption',
    shortLabel: 'Income',
    icon: 'TrendingDown',
    color: 'blue',
    description: 'Income replacement during illness/recovery',
    governmentSchemes: [],
    privateCategories: ['critical_illness', 'disability'],
  },
  permanent_disability: {
    label: 'Permanent Disability',
    shortLabel: 'Disability',
    icon: 'Accessibility',
    color: 'amber',
    description: 'Coverage if unable to work permanently',
    governmentSchemes: ['dps'],
    privateCategories: ['disability', 'life'],
  },
  death_dependency: {
    label: 'Death / Dependents',
    shortLabel: 'Life',
    icon: 'Shield',
    color: 'purple',
    description: 'Financial protection for dependents',
    governmentSchemes: ['dps'],
    privateCategories: ['life'],
  },
  old_age_care: {
    label: 'Old Age Care',
    shortLabel: 'LTC',
    icon: 'HeartHandshake',
    color: 'rose',
    description: 'Long-term care support in old age',
    governmentSchemes: ['careshield_life', 'eldershield'],
    privateCategories: ['disability'],
  },
}

// ============================================================================
// SINGAPORE HOSPITALIZATION MODEL
// Ward class, ISP tier, rider type - not dollar amounts
// ============================================================================

export type WardClass = 'A' | 'B1' | 'B2_plus' | 'C'

export const wardClassConfig: Record<
  WardClass,
  {
    label: string
    description: string
    averageDailyCost: { min: number; max: number }
    medishieldCovers: boolean
  }
> = {
  A: {
    label: 'Class A',
    description: 'Single room, choice of doctor',
    averageDailyCost: { min: 500, max: 1500 },
    medishieldCovers: false,
  },
  B1: {
    label: 'Class B1',
    description: '4-bed room, choice of doctor',
    averageDailyCost: { min: 300, max: 800 },
    medishieldCovers: false,
  },
  B2_plus: {
    label: 'Class B2/C',
    description: 'Subsidised multi-bed wards',
    averageDailyCost: { min: 50, max: 200 },
    medishieldCovers: true,
  },
  C: {
    label: 'Class C',
    description: 'Open ward, highest subsidy',
    averageDailyCost: { min: 30, max: 100 },
    medishieldCovers: true,
  },
}

export type IspTier =
  | 'medishield_only'
  | 'basic'
  | 'standard'
  | 'enhanced'
  | 'premium'

export const ispTierConfig: Record<
  IspTier,
  {
    label: string
    wardClassCovered: WardClass
    annualLimitType: 'unlimited' | 'capped'
    typicalAnnualLimit?: number
  }
> = {
  medishield_only: {
    label: 'MediShield Life Only',
    wardClassCovered: 'B2_plus',
    annualLimitType: 'capped',
    typicalAnnualLimit: 150000,
  },
  basic: {
    label: 'Basic Shield',
    wardClassCovered: 'B2_plus',
    annualLimitType: 'capped',
    typicalAnnualLimit: 200000,
  },
  standard: {
    label: 'Standard Shield',
    wardClassCovered: 'B1',
    annualLimitType: 'capped',
    typicalAnnualLimit: 500000,
  },
  enhanced: {
    label: 'Enhanced Shield',
    wardClassCovered: 'A',
    annualLimitType: 'capped',
    typicalAnnualLimit: 1000000,
  },
  premium: {
    label: 'Private Shield',
    wardClassCovered: 'A',
    annualLimitType: 'unlimited',
  },
}

export type RiderType = 'none' | 'co_pay_5' | 'co_pay_10' | 'full'

export const riderTypeConfig: Record<
  RiderType,
  {
    label: string
    description: string
    outOfPocketRatio: number
  }
> = {
  none: {
    label: 'No Rider',
    description: 'MediShield/ISP pays first, then co-insurance applies',
    outOfPocketRatio: 0.1,
  },
  co_pay_5: {
    label: '5% Co-pay Rider',
    description: 'Reduces co-insurance to 5%',
    outOfPocketRatio: 0.05,
  },
  co_pay_10: {
    label: '10% Co-pay Rider',
    description: 'Reduces co-insurance to 10%',
    outOfPocketRatio: 0.1,
  },
  full: {
    label: 'Full Rider',
    description: 'Covers all co-insurance, deductible may still apply',
    outOfPocketRatio: 0,
  },
}

export interface HospitalizationCoverage {
  ispProvider?: string
  ispTier: IspTier
  ispPlanName?: string
  riderType: RiderType
  annualDeductible: number
  coInsurancePercentage: number
  annualLimit: number | null
  hasPanelRestrictions: boolean
  panelDescription?: string
  preferredWardClass: WardClass
  isAdequateForPreferredWard: boolean
  outOfPocketEstimate: {
    typicalClaim: { amount: number; scenario: string }
    majorClaim: { amount: number; scenario: string }
  }
}

// ============================================================================
// DISABILITY INCOME MODEL
// Monthly benefit, not lump sum
// ============================================================================

export type WaitingPeriod = 30 | 60 | 90 | 180

export interface DisabilityIncomePolicy {
  id: string
  policyName: string
  insurerName?: string
  monthlyBenefit: number
  maxReplacementRatio: number // Usually 65-75% of income
  waitingPeriodDays: WaitingPeriod
  benefitPeriod: {
    type: 'years' | 'to_age'
    value: number // Years or age
  }
  disabilityDefinition: 'own_occupation' | 'any_occupation' | 'hybrid'
  annualPremium: number
  isActive: boolean
}

export interface DisabilityCoverageNeeds {
  currentMonthlyIncome: number
  targetReplacementRatio: number
  targetMonthlyBenefit: number
  currentPolicies: DisabilityIncomePolicy[]
  totalMonthlyBenefitCurrent: number
  monthlyBenefitGap: number
  yearsToRetirement: number
  recommendedCoverageToAge: number
  isAdequate: boolean
  // Government coverage (context only - not income replacement)
  dpsTPDAmount: number
  careShieldMonthly: number
}

// ============================================================================
// LIFE INSURANCE WITH DEPENDENCIES
// Based on actual dependents, not just income multiplier
// ============================================================================

export interface Dependent {
  id: string
  name: string
  relationship: 'spouse' | 'child' | 'parent' | 'sibling' | 'other'
  dateOfBirth?: string
  hasOwnIncome: boolean
  monthlyIncome?: number
  incomeReplacementYears?: number
  educationFundNeeded?: number
  independenceAge?: number
  hasSpecialNeeds: boolean
  specialNeedsNotes?: string
}

export interface LifeInsuranceNeeds {
  dependents: Dependent[]
  totalDependentsCount: number
  dependentChildrenCount: number
  yearsUntilYoungestIndependent: number

  // Breakdown
  incomeReplacement: {
    primaryMonthlyIncome: number
    yearsOfSupport: number
    total: number
  }
  spouseDependency: {
    spouseMonthlyIncome: number
    incomeGap: number
    yearsOfSupport: number
    total: number
  }
  childrenEducation: {
    numberOfChildren: number
    perChildEstimate: number
    total: number
  }
  debtSettlement: {
    mortgage: number
    otherDebts: number
    total: number
  }
  finalExpenses: number

  // Totals
  totalNeeded: number
  currentCoverage: number
  dpsContribution: number
  gap: number
  yearsOfCoverageIfDeath: number
  isAdequate: boolean
}

// ============================================================================
// GOVERNMENT SCHEME LIMITATIONS
// Explicit about what they DON'T cover
// ============================================================================

export interface GovernmentSchemeLimitations {
  scheme: GovernmentScheme
  triggerCondition: {
    description: string
    severity: 'any' | 'moderate' | 'severe'
    adlCount?: number
    examples: string[]
  }
  doesNotCover: string[]
  keyLimitations: string[]
  warningMessage: string
}

export const governmentSchemeLimitations: Record<
  GovernmentScheme,
  GovernmentSchemeLimitations
> = {
  medishield_life: {
    scheme: 'medishield_life',
    triggerCondition: {
      description: 'Hospitalisation in B2/C ward',
      severity: 'any',
      examples: ['Hospital stays', 'Day surgeries', 'Chemotherapy'],
    },
    doesNotCover: [
      'Private hospital stays',
      'Class A or B1 wards',
      'Most outpatient treatments',
      'Dental and optical',
    ],
    keyLimitations: [
      'Only covers B2/C ward',
      'Deductibles of $1,500-$3,000 apply',
      'Co-insurance of 3-10% after deductible',
    ],
    warningMessage:
      'High out-of-pocket costs for private/A/B1 wards without ISP',
  },
  careshield_life: {
    scheme: 'careshield_life',
    triggerCondition: {
      description: 'Severe disability - cannot perform 3+ ADLs',
      severity: 'severe',
      adlCount: 3,
      examples: [
        'Washing/bathing',
        'Dressing',
        'Feeding',
        'Toileting',
        'Walking/mobility',
        'Transferring',
      ],
    },
    doesNotCover: [
      'Temporary disability',
      'Partial disability',
      'Medical treatment costs',
      'Income during illness/recovery',
      'Cancer/stroke unless causing 3+ ADL loss',
    ],
    keyLimitations: [
      'Only pays for SEVERE disability (3+ ADLs)',
      'Does NOT replace income during illness',
      'Does NOT cover medical bills',
    ],
    warningMessage: 'Only triggers at severe disability - not income protection',
  },
  eldershield: {
    scheme: 'eldershield',
    triggerCondition: {
      description: 'Severe disability - cannot perform 3+ ADLs',
      severity: 'severe',
      adlCount: 3,
      examples: [
        'Washing',
        'Dressing',
        'Feeding',
        'Toileting',
        'Mobility',
        'Transferring',
      ],
    },
    doesNotCover: ['Same as CareShield Life'],
    keyLimitations: [
      'Legacy scheme - lower payouts',
      'Benefits capped at 72 months',
    ],
    warningMessage: 'Legacy scheme with lower benefits than CareShield Life',
  },
  dps: {
    scheme: 'dps',
    triggerCondition: {
      description: 'Death OR Total Permanent Disability',
      severity: 'severe',
      examples: [
        'Death from any cause',
        'Total loss of 2 limbs',
        'Total loss of sight',
        'Total inability to work',
      ],
    },
    doesNotCover: [
      'Temporary disability',
      'Critical illness (cancer, heart attack, stroke)',
      'Income during recovery',
      'Partial disability',
    ],
    keyLimitations: [
      'Only $70k - often insufficient for dependents',
      'Only pays on DEATH or TOTAL PERMANENT disability',
      'Does NOT pay for critical illness',
      'Coverage decreases after age 60',
    ],
    warningMessage: 'Only $70k for death/TPD - not income protection',
  },
}

// ============================================================================
// EVENT-BASED STRESS TEST
// How Singaporeans think about risk
// ============================================================================

export type StressEvent =
  | 'cancer'
  | 'accident'
  | 'stroke'
  | 'death'
  | 'severe_disability'

export type StressTimeframe = '6_months' | '2_years' | '5_years' | 'lifetime'

export const stressEventConfig: Record<
  StressEvent,
  {
    label: string
    shortLabel: string
    description: string
    icon: string
    color: string
    sgStatistic: string
  }
> = {
  cancer: {
    label: 'Cancer Diagnosis',
    shortLabel: 'Cancer',
    description: 'Critical illness requiring extended treatment',
    icon: 'Heart',
    color: 'rose',
    sgStatistic: '1 in 4 Singaporeans will develop cancer by age 75',
  },
  accident: {
    label: 'Major Accident',
    shortLabel: 'Accident',
    description: 'Unexpected injury causing income loss',
    icon: 'AlertTriangle',
    color: 'amber',
    sgStatistic: 'Road accidents cause 100+ deaths yearly in SG',
  },
  stroke: {
    label: 'Stroke',
    shortLabel: 'Stroke',
    description: 'Brain injury requiring rehabilitation',
    icon: 'Brain',
    color: 'purple',
    sgStatistic: 'Stroke is the 4th leading cause of death in Singapore',
  },
  death: {
    label: 'Death',
    shortLabel: 'Death',
    description: 'Income loss for dependents',
    icon: 'Shield',
    color: 'slate',
    sgStatistic: 'Average family needs 10x annual income replacement',
  },
  severe_disability: {
    label: 'Severe Disability',
    shortLabel: 'Disability',
    description: 'Cannot perform 3+ activities of daily living',
    icon: 'Accessibility',
    color: 'blue',
    sgStatistic: 'CareShield Life payouts start at $662/month (2025)',
  },
}

export const stressTimeframeConfig: Record<
  StressTimeframe,
  {
    label: string
    shortLabel: string
    months: number
    description: string
  }
> = {
  '6_months': {
    label: '6 Months',
    shortLabel: '6M',
    months: 6,
    description: 'Acute phase - can deplete savings',
  },
  '2_years': {
    label: '2 Years',
    shortLabel: '2Y',
    months: 24,
    description: 'Extended illness period',
  },
  '5_years': {
    label: '5 Years',
    shortLabel: '5Y',
    months: 60,
    description: 'Long-term impact assessment',
  },
  lifetime: {
    label: 'Lifetime',
    shortLabel: 'Life',
    months: 360, // 30 years proxy
    description: 'Permanent conditions',
  },
}

export interface FinancialImpact {
  medicalCosts: number
  careCosts: number
  otherCosts: number
  incomeLoss: number
  debtSettlement: number
  totalNeed: number
}

export interface ResourcesAvailable {
  insurancePayout: number
  insuranceBreakdown: {
    life: number
    criticalIllness: number
    disability: number
    hospitalisation: number
    accident: number
  }
  governmentPayouts: number
  governmentBreakdown: {
    dps: number
    careshield: number
    medishield: number
  }
  savingsAvailable: number
  cpfWithdrawable: number
  totalResources: number
}

export interface StressTestCell {
  event: StressEvent
  timeframe: StressTimeframe
  impact: FinancialImpact
  resources: ResourcesAvailable
  coveragePercentage: number
  status: CoverageStatus
  shortfall: number
  riskStatement: string // "Family at risk if illness > 6 months"
  keyInsight: string
}

export interface StressTestMatrix {
  results: Record<StressEvent, Record<StressTimeframe, StressTestCell>>
  summary: {
    coveredCount: number
    partialCount: number
    exposedCount: number
    worstExposure: StressTestCell | null
    mostUrgentGap?: string
  }
  calculatedAt: string
}

// ============================================================================
// SINGAPORE MEDICAL COST ASSUMPTIONS (2025)
// ============================================================================

export interface SGMedicalCostAssumptions {
  cancer: {
    earlyStage: { min: number; max: number }
    midStage: { min: number; max: number }
    lateStage: { min: number; max: number }
    ongoingMonthly: number
    incomeLossMonths: { acute: number; recovery: number }
  }
  accident: {
    minor: { medical: number; incomeLossMonths: number }
    moderate: { medical: number; incomeLossMonths: number }
    severe: { medical: number; incomeLossMonths: number; disabilityChance: number }
  }
  stroke: {
    mild: { medical: number; rehabMonthly: number; incomeLossMonths: number }
    moderate: { medical: number; rehabMonthly: number; incomeLossMonths: number }
    severe: {
      medical: number
      rehabMonthly: number
      incomeLossMonths: number
      disabilityChance: number
    }
  }
  severeDisability: {
    caregivingMonthly: { min: number; max: number }
    medicalMonthly: number
    homeModification: number
  }
  death: {
    funeral: number
    estateSettlement: number
  }
}

export const defaultSGAssumptions: SGMedicalCostAssumptions = {
  cancer: {
    earlyStage: { min: 50000, max: 100000 },
    midStage: { min: 100000, max: 200000 },
    lateStage: { min: 150000, max: 300000 },
    ongoingMonthly: 2000,
    incomeLossMonths: { acute: 12, recovery: 12 },
  },
  accident: {
    minor: { medical: 10000, incomeLossMonths: 1 },
    moderate: { medical: 50000, incomeLossMonths: 6 },
    severe: { medical: 100000, incomeLossMonths: 12, disabilityChance: 0.2 },
  },
  stroke: {
    mild: { medical: 30000, rehabMonthly: 1500, incomeLossMonths: 6 },
    moderate: { medical: 80000, rehabMonthly: 3000, incomeLossMonths: 18 },
    severe: {
      medical: 150000,
      rehabMonthly: 5000,
      incomeLossMonths: 36,
      disabilityChance: 0.6,
    },
  },
  severeDisability: {
    caregivingMonthly: { min: 3000, max: 8000 },
    medicalMonthly: 1500,
    homeModification: 20000,
  },
  death: {
    funeral: 15000,
    estateSettlement: 5000,
  },
}

// ============================================================================
// USER-CONFIGURABLE COVERAGE GUIDELINES
// "Captain of Your Ship" - users define their own coverage targets
// ============================================================================

/**
 * Coverage type identifier for user guidelines
 * Maps to display icons:
 * - hospitalization: 🏥
 * - life_tpd: 😇 (guardian angel)
 * - critical_illness: 🩺
 * - personal_accident: 🚗
 */
export type GuidelineCoverageType =
  | 'hospitalization'
  | 'life_tpd'
  | 'critical_illness'
  | 'personal_accident'

/**
 * Configuration for a single coverage guideline
 */
export interface CoverageGuidelineConfig {
  type: GuidelineCoverageType
  /** Multiplier of annual income (e.g., 10 = 10× income) */
  incomeMultiplier: number
  /** Whether this coverage is required or optional */
  isRequired: boolean
  /** Whether the user has enabled this guideline */
  isEnabled: boolean
  /** Custom notes from the user */
  notes?: string
}

/**
 * Hospitalization-specific guideline (not income-based)
 */
export interface HospitalizationGuideline {
  type: 'hospitalization'
  /** Must have ISP upgrade from MediShield Life */
  requiresIspUpgrade: boolean
  /** Preferred ward class */
  preferredWardClass: WardClass
  /** Whether rider is recommended */
  recommendsRider: boolean
  isEnabled: boolean
  notes?: string
}

/**
 * Preset configuration levels
 */
export type GuidelinesPreset = 'lean' | 'standard' | 'comprehensive' | 'custom'

/**
 * User's complete coverage guidelines configuration
 */
export interface UserCoverageGuidelines {
  /** User's annual income (base for calculations) */
  annualIncome: number

  /** Maximum premium as percentage of income (e.g., 0.10 = 10%) */
  maxPremiumPercentage: number

  /** Selected preset or 'custom' if manually configured */
  preset: GuidelinesPreset

  /** Individual coverage configurations */
  coverages: {
    hospitalization: HospitalizationGuideline
    life_tpd: CoverageGuidelineConfig
    critical_illness: CoverageGuidelineConfig
    personal_accident: CoverageGuidelineConfig
  }

  /** When these guidelines were last updated */
  updatedAt: string
}

/**
 * Preset multiplier configurations
 */
export const guidelinesPresets: Record<
  Exclude<GuidelinesPreset, 'custom'>,
  {
    label: string
    description: string
    life_tpd: number
    critical_illness: number
    personal_accident: number
    maxPremiumPercentage: number
  }
> = {
  lean: {
    label: 'Lean',
    description: 'Basic protection with lower premiums',
    life_tpd: 5,
    critical_illness: 3,
    personal_accident: 3,
    maxPremiumPercentage: 0.05,
  },
  standard: {
    label: 'Standard',
    description: 'Balanced coverage for most situations',
    life_tpd: 10,
    critical_illness: 5,
    personal_accident: 5,
    maxPremiumPercentage: 0.1,
  },
  comprehensive: {
    label: 'Comprehensive',
    description: 'Maximum protection for peace of mind',
    life_tpd: 15,
    critical_illness: 7,
    personal_accident: 10,
    maxPremiumPercentage: 0.15,
  },
}

/**
 * Coverage type display configuration
 */
export const guidelineCoverageConfig: Record<
  GuidelineCoverageType,
  {
    label: string
    shortLabel: string
    emoji: string
    color: string
    description: string
    defaultMultiplier: number
    isRequired: boolean
  }
> = {
  hospitalization: {
    label: 'Hospitalization',
    shortLabel: 'Hospital',
    emoji: '🏥',
    color: 'emerald',
    description: 'Must upgrade from MediShield Life to ISP',
    defaultMultiplier: 0, // Not income-based
    isRequired: true,
  },
  life_tpd: {
    label: 'Life / TPD',
    shortLabel: 'Life',
    emoji: '😇',
    color: 'blue',
    description: 'Death and Total Permanent Disability coverage',
    defaultMultiplier: 10,
    isRequired: true,
  },
  critical_illness: {
    label: 'Critical Illness',
    shortLabel: 'CI',
    emoji: '🩺',
    color: 'purple',
    description: 'Lump-sum payout on diagnosis of major illness',
    defaultMultiplier: 5,
    isRequired: true,
  },
  personal_accident: {
    label: 'Personal Accident',
    shortLabel: 'PA',
    emoji: '🚗',
    color: 'amber',
    description: 'Coverage for accidental injuries',
    defaultMultiplier: 5,
    isRequired: true,
  },
}

/**
 * Helper to create default guidelines
 */
export function createDefaultGuidelines(
  annualIncome: number = 60000
): UserCoverageGuidelines {
  return {
    annualIncome,
    maxPremiumPercentage: 0.1,
    preset: 'standard',
    coverages: {
      hospitalization: {
        type: 'hospitalization',
        requiresIspUpgrade: true,
        preferredWardClass: 'B1',
        recommendsRider: true,
        isEnabled: true,
      },
      life_tpd: {
        type: 'life_tpd',
        incomeMultiplier: 10,
        isRequired: true,
        isEnabled: true,
      },
      critical_illness: {
        type: 'critical_illness',
        incomeMultiplier: 5,
        isRequired: true,
        isEnabled: true,
      },
      personal_accident: {
        type: 'personal_accident',
        incomeMultiplier: 5,
        isRequired: true,
        isEnabled: true,
      },
    },
    updatedAt: new Date().toISOString(),
  }
}

/**
 * Calculate target coverage amounts from guidelines
 */
export function calculateGuidelineTargets(guidelines: UserCoverageGuidelines): {
  life_tpd: number
  critical_illness: number
  personal_accident: number
  maxAnnualPremium: number
} {
  const { annualIncome, maxPremiumPercentage, coverages } = guidelines

  return {
    life_tpd: coverages.life_tpd.isEnabled
      ? annualIncome * coverages.life_tpd.incomeMultiplier
      : 0,
    critical_illness: coverages.critical_illness.isEnabled
      ? annualIncome * coverages.critical_illness.incomeMultiplier
      : 0,
    personal_accident: coverages.personal_accident.isEnabled
      ? annualIncome * coverages.personal_accident.incomeMultiplier
      : 0,
    maxAnnualPremium: annualIncome * maxPremiumPercentage,
  }
}

// ============================================================================
// COVERAGE STATUS & PROTECTION SCORE
// ============================================================================

/**
 * Status for a single coverage category
 */
export interface CoverageCategoryStatus {
  category: GuidelineCoverageType
  label: string
  target: number
  current: number
  gap: number
  percentage: number // 0-100, capped at 100
  status: 'covered' | 'partial' | 'gap' | 'disabled'
}

/**
 * Overall coverage status for a person (used by dashboard)
 */
export interface PersonCoverageStatus {
  personId: string
  personName: string
  annualIncome: number
  categories: CoverageCategoryStatus[]
  protectionScore: number // 0-100
  gapCount: number
  totalMonthlyPremium: number
  totalAnnualPremium: number
  premiumBudget: number
  premiumPercentageUsed: number
}

/**
 * Category weights for protection score calculation
 * Life/TPD is weighted highest as it protects dependents
 */
const PROTECTION_SCORE_WEIGHTS: Record<GuidelineCoverageType, number> = {
  hospitalization: 0.25,
  life_tpd: 0.35,
  critical_illness: 0.25,
  personal_accident: 0.15,
}

/**
 * Calculate protection score from coverage status
 * Returns weighted average of coverage percentages (0-100)
 */
export function calculateProtectionScore(
  guidelines: UserCoverageGuidelines,
  currentCoverage: {
    hospitalization: boolean // true if has valid ISP
    life_tpd: number
    critical_illness: number
    personal_accident: number
  }
): number {
  const targets = calculateGuidelineTargets(guidelines)
  const { coverages } = guidelines

  let totalWeight = 0
  let weightedScore = 0

  // Hospitalization: binary (covered or not)
  if (coverages.hospitalization.isEnabled) {
    const score = currentCoverage.hospitalization ? 100 : 0
    weightedScore += score * PROTECTION_SCORE_WEIGHTS.hospitalization
    totalWeight += PROTECTION_SCORE_WEIGHTS.hospitalization
  }

  // Life/TPD
  if (coverages.life_tpd.isEnabled && targets.life_tpd > 0) {
    const score = Math.min(100, (currentCoverage.life_tpd / targets.life_tpd) * 100)
    weightedScore += score * PROTECTION_SCORE_WEIGHTS.life_tpd
    totalWeight += PROTECTION_SCORE_WEIGHTS.life_tpd
  }

  // Critical Illness
  if (coverages.critical_illness.isEnabled && targets.critical_illness > 0) {
    const score = Math.min(100, (currentCoverage.critical_illness / targets.critical_illness) * 100)
    weightedScore += score * PROTECTION_SCORE_WEIGHTS.critical_illness
    totalWeight += PROTECTION_SCORE_WEIGHTS.critical_illness
  }

  // Personal Accident
  if (coverages.personal_accident.isEnabled && targets.personal_accident > 0) {
    const score = Math.min(100, (currentCoverage.personal_accident / targets.personal_accident) * 100)
    weightedScore += score * PROTECTION_SCORE_WEIGHTS.personal_accident
    totalWeight += PROTECTION_SCORE_WEIGHTS.personal_accident
  }

  // Return weighted average, or 0 if no categories enabled
  return totalWeight > 0 ? Math.round(weightedScore / totalWeight) : 0
}

/**
 * Build full coverage status for dashboard display
 */
export function buildCoverageStatus(
  guidelines: UserCoverageGuidelines,
  personId: string,
  personName: string,
  currentCoverage: {
    hospitalization: boolean
    life_tpd: number
    critical_illness: number
    personal_accident: number
  },
  premiumData: {
    monthlyPremium: number
    annualPremium: number
  }
): PersonCoverageStatus {
  const targets = calculateGuidelineTargets(guidelines)
  const { coverages, annualIncome } = guidelines

  const categories: CoverageCategoryStatus[] = []

  // Hospitalization (binary)
  if (coverages.hospitalization.isEnabled) {
    categories.push({
      category: 'hospitalization',
      label: `Ward ${coverages.hospitalization.preferredWardClass}${coverages.hospitalization.recommendsRider ? ' + Rider' : ''}`,
      target: 0, // Not applicable for hospitalization
      current: 0,
      gap: 0,
      percentage: currentCoverage.hospitalization ? 100 : 0,
      status: currentCoverage.hospitalization ? 'covered' : 'gap',
    })
  }

  // Life/TPD
  if (coverages.life_tpd.isEnabled) {
    const target = targets.life_tpd
    const current = currentCoverage.life_tpd
    const gap = Math.max(0, target - current)
    const percentage = target > 0 ? Math.min(100, (current / target) * 100) : 0
    categories.push({
      category: 'life_tpd',
      label: 'Life / TPD',
      target,
      current,
      gap,
      percentage: Math.round(percentage),
      status: percentage >= 100 ? 'covered' : percentage > 0 ? 'partial' : 'gap',
    })
  }

  // Critical Illness
  if (coverages.critical_illness.isEnabled) {
    const target = targets.critical_illness
    const current = currentCoverage.critical_illness
    const gap = Math.max(0, target - current)
    const percentage = target > 0 ? Math.min(100, (current / target) * 100) : 0
    categories.push({
      category: 'critical_illness',
      label: 'Critical Illness',
      target,
      current,
      gap,
      percentage: Math.round(percentage),
      status: percentage >= 100 ? 'covered' : percentage > 0 ? 'partial' : 'gap',
    })
  }

  // Personal Accident
  if (coverages.personal_accident.isEnabled) {
    const target = targets.personal_accident
    const current = currentCoverage.personal_accident
    const gap = Math.max(0, target - current)
    const percentage = target > 0 ? Math.min(100, (current / target) * 100) : 0
    categories.push({
      category: 'personal_accident',
      label: 'Personal Accident',
      target,
      current,
      gap,
      percentage: Math.round(percentage),
      status: percentage >= 100 ? 'covered' : percentage > 0 ? 'partial' : 'gap',
    })
  }

  const protectionScore = calculateProtectionScore(guidelines, currentCoverage)
  const gapCount = categories.filter((c) => c.status === 'gap' || c.status === 'partial').length
  const premiumBudget = targets.maxAnnualPremium
  const premiumPercentageUsed = premiumBudget > 0
    ? Math.round((premiumData.annualPremium / premiumBudget) * 100)
    : 0

  return {
    personId,
    personName,
    annualIncome,
    categories,
    protectionScore,
    gapCount,
    totalMonthlyPremium: premiumData.monthlyPremium,
    totalAnnualPremium: premiumData.annualPremium,
    premiumBudget,
    premiumPercentageUsed,
  }
}

// ============================================================================
// DEPRECATION NOTICE
// ============================================================================

/**
 * @deprecated Use RiskCoverageSummary instead.
 * Single protection scores are actuarially meaningless as insurance
 * categories cannot be combined into one number.
 */
export interface ProtectionScoreDeprecated extends ProtectionScore {
  /** @deprecated */
  overall: number
}

// ============================================================================
// COVERAGE CONTROL POINTS
// User-defined anchor points for coverage projections over time
// Inspired by Projection Lab's control points feature
// ============================================================================

/**
 * A user-defined anchor point for coverage at a specific age.
 * Values that are null will use the auto-calculated recommendation.
 */
export interface CoverageControlPoint {
  id: string
  personId: string
  age: number

  /** Life/TPD coverage amount. Null = use auto-calculated. */
  lifeTpd: number | null
  /** Critical Illness coverage amount. Null = use auto-calculated. */
  criticalIllness: number | null
  /** Personal Accident coverage amount. Null = use auto-calculated. */
  personalAccident: number | null

  /** Optional user note explaining this control point */
  reason?: string

  createdAt: string
  updatedAt: string
}

/**
 * Interpolation mode between control points
 * - linear: Straight line between points
 * - smooth: Curved interpolation (bezier-style)
 * - step: Jump directly at point age (no interpolation)
 */
export type InterpolationMode = 'linear' | 'smooth' | 'step'

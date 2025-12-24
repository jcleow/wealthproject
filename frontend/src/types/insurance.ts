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

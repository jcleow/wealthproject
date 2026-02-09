/**
 * Coverage Journey Utilities
 *
 * Calculations for life stage detection, coverage projections, and milestone alerts.
 * Used by the Coverage Journey view to show how insurance needs change over time.
 */

// =============================================================================
// Types
// =============================================================================

/**
 * Life stages that affect insurance coverage needs
 */
export type LifeStage =
  | 'young_professional'  // 22-30, no dependents
  | 'new_parent'          // First child under 5
  | 'growing_family'      // Multiple dependents, peak need
  | 'empty_nester'        // Kids independent, mortgage winding down
  | 'pre_retirement'      // 55-65, transitioning
  | 'retired'             // 65+, health focus

export interface LifeStageInfo {
  stage: LifeStage
  label: string
  description: string
  ageRange: string
  coveragePriority: 'life' | 'health' | 'balanced'
}

export interface CoverageProjectionYear {
  age: number
  year: number
  // Recommended coverage amounts
  recommendedLifeTpd: number
  recommendedCriticalIllness: number
  recommendedEarlyCi: number
  recommendedDisability: number
  recommendedPersonalAccident: number
  // Current coverage (from policies - future phase)
  currentLifeTpd: number
  currentCriticalIllness: number
  currentEarlyCi: number
  currentDisability: number
  currentPersonalAccident: number
}

export interface CoverageMilestone {
  year: number
  age: number
  event: string
  description: string
  impact: string
  coverageChange: number // Positive = increase, negative = decrease
  category: 'dependent' | 'debt' | 'retirement' | 'health'
}

export interface PersonCoverageContext {
  age: number
  annualIncome: number
  dependents: Array<{ name: string; age: number }>
  mortgageBalance: number
  mortgageEndYear: number | null
  retirementAge: number
}

// =============================================================================
// Life Stage Detection
// =============================================================================

export const LIFE_STAGE_INFO: Record<LifeStage, Omit<LifeStageInfo, 'stage'>> = {
  young_professional: {
    label: 'Young Professional',
    description: 'Building foundation, minimal dependents',
    ageRange: '22-30',
    coveragePriority: 'balanced',
  },
  new_parent: {
    label: 'New Parent',
    description: 'First child, growing responsibilities',
    ageRange: '25-40',
    coveragePriority: 'life',
  },
  growing_family: {
    label: 'Growing Family',
    description: 'Peak protection years, dependents rely on income',
    ageRange: '30-50',
    coveragePriority: 'life',
  },
  empty_nester: {
    label: 'Empty Nester',
    description: 'Kids independent, reducing obligations',
    ageRange: '50-65',
    coveragePriority: 'balanced',
  },
  pre_retirement: {
    label: 'Pre-Retirement',
    description: 'Transitioning focus to health coverage',
    ageRange: '55-65',
    coveragePriority: 'health',
  },
  retired: {
    label: 'Retired',
    description: 'Health coverage is primary concern',
    ageRange: '65+',
    coveragePriority: 'health',
  },
}

/**
 * Detect life stage based on age and dependents
 */
export function detectLifeStage(
  age: number,
  dependents: Array<{ age: number }> = []
): LifeStage {
  const hasDependents = dependents.length > 0
  const hasYoungChildren = dependents.some(d => d.age < 5)
  const hasSchoolAgeChildren = dependents.some(d => d.age >= 5 && d.age < 22)
  const youngestDependentAge = dependents.length > 0
    ? Math.min(...dependents.map(d => d.age))
    : null

  // Retirement (65+)
  if (age >= 65) {
    return 'retired'
  }

  // Pre-retirement (55-65, transitioning)
  if (age >= 55) {
    // Still has dependents? Stay in growing family
    if (hasDependents && hasSchoolAgeChildren) {
      return 'growing_family'
    }
    return 'pre_retirement'
  }

  // Empty nester (50-65, kids independent)
  if (age >= 50 && !hasDependents) {
    return 'empty_nester'
  }

  // Growing family (30-50, multiple/older dependents)
  if (hasDependents && (dependents.length > 1 || (youngestDependentAge && youngestDependentAge >= 5))) {
    return 'growing_family'
  }

  // New parent (has young children under 5)
  if (hasYoungChildren) {
    return 'new_parent'
  }

  // Young professional (22-30, no dependents)
  if (age < 30 && !hasDependents) {
    return 'young_professional'
  }

  // Default: growing family if has dependents, empty nester otherwise
  if (hasDependents) {
    return 'growing_family'
  }

  return age >= 50 ? 'empty_nester' : 'young_professional'
}

/**
 * Get full life stage info with label and description
 */
export function getLifeStageInfo(stage: LifeStage): LifeStageInfo {
  return {
    stage,
    ...LIFE_STAGE_INFO[stage],
  }
}

// =============================================================================
// Coverage Projections
// =============================================================================

/**
 * Income multiplier for life/TPD coverage based on life stage
 */
function getLifeTpdMultiplier(age: number, dependentCount: number): number {
  if (age >= 65) return 1 // Legacy planning only
  if (age >= 55) return dependentCount > 0 ? 5 : 3
  if (age >= 50) return dependentCount > 0 ? 6 : 4
  if (dependentCount > 1) return 10 // Growing family
  if (dependentCount === 1) return 8 // New parent
  return 3 // Young professional
}

/**
 * Income multiplier for critical illness coverage
 */
function getCriticalIllnessMultiplier(age: number): number {
  if (age >= 65) return 1
  if (age >= 55) return 2
  if (age >= 40) return 3
  return 2
}

/**
 * Calculate recommended coverage at a specific age
 */
export function calculateRecommendedCoverage(
  age: number,
  context: PersonCoverageContext
): Omit<CoverageProjectionYear, 'year' | 'currentLifeTpd' | 'currentCriticalIllness' | 'currentEarlyCi' | 'currentDisability' | 'currentPersonalAccident'> {
  // Adjust dependents count based on age (they grow up!)
  const yearsFromNow = age - context.age
  const activeDependents = context.dependents.filter(d => {
    const futureAge = d.age + yearsFromNow
    return futureAge < 22 // Assumed independence age
  })

  // Calculate mortgage remaining
  const mortgageRemaining = context.mortgageEndYear && context.mortgageEndYear > new Date().getFullYear() + yearsFromNow
    ? context.mortgageBalance * Math.max(0, 1 - (yearsFromNow / 25)) // Rough linear paydown
    : 0

  // Life/TPD: Income replacement + mortgage + dependents
  const incomeMultiplier = getLifeTpdMultiplier(age, activeDependents.length)
  const dependentCost = activeDependents.reduce((sum, d) => {
    const yearsOfSupport = Math.max(0, 22 - (d.age + yearsFromNow))
    return sum + (yearsOfSupport * 30000) // ~$30k/year per dependent
  }, 0)

  const recommendedLifeTpd = Math.round(
    (context.annualIncome * incomeMultiplier) + mortgageRemaining + dependentCost
  )

  // Critical illness: 2-4 years of expenses for recovery
  const ciMultiplier = getCriticalIllnessMultiplier(age)
  const recommendedCriticalIllness = Math.round(context.annualIncome * ciMultiplier * 0.7) // 70% of income as expenses

  // Early Critical Illness: ~50% of late-stage CI (smaller lump sum for early detection)
  // Most relevant ages 30-65; tapers off before and after
  const earlyCiMultiplier = age < 30 ? 0.3 : age >= 65 ? 0.5 : 0.5
  const recommendedEarlyCi = Math.round(recommendedCriticalIllness * earlyCiMultiplier)

  // Disability (income protection): replaces 60-75% of income during disability
  // Peaks during working years, drops at retirement
  const disabilityReplacementRatio = age >= 65 ? 0 : age >= 55 ? 0.4 : 0.6
  const disabilityYears = age >= 65 ? 0 : Math.min(5, 65 - age) // up to 5 years of income replacement
  const recommendedDisability = Math.round(context.annualIncome * disabilityReplacementRatio * disabilityYears)

  // Personal accident: 1-2x income
  const paMultiplier = age >= 55 ? 1 : 2
  const recommendedPersonalAccident = Math.round(context.annualIncome * paMultiplier)

  return {
    age,
    recommendedLifeTpd: Math.max(0, recommendedLifeTpd),
    recommendedCriticalIllness: Math.max(0, recommendedCriticalIllness),
    recommendedEarlyCi: Math.max(0, recommendedEarlyCi),
    recommendedDisability: Math.max(0, recommendedDisability),
    recommendedPersonalAccident: Math.max(0, recommendedPersonalAccident),
  }
}

/**
 * Generate coverage projection for a range of ages
 */
export function generateCoverageProjection(
  context: PersonCoverageContext,
  fromAge?: number,
  toAge?: number
): CoverageProjectionYear[] {
  const startAge = fromAge ?? Math.max(22, context.age - 5)
  const endAge = toAge ?? 75
  const currentYear = new Date().getFullYear()

  const projections: CoverageProjectionYear[] = []

  for (let age = startAge; age <= endAge; age++) {
    const yearsFromNow = age - context.age
    const year = currentYear + yearsFromNow

    const recommended = calculateRecommendedCoverage(age, context)

    projections.push({
      ...recommended,
      year,
      // Current coverage placeholder (to be filled from actual policies)
      currentLifeTpd: 0,
      currentCriticalIllness: 0,
      currentEarlyCi: 0,
      currentDisability: 0,
      currentPersonalAccident: 0,
    })
  }

  return projections
}

// =============================================================================
// Milestone Calculations
// =============================================================================

const INDEPENDENCE_AGE = 22

/**
 * Calculate coverage milestones based on life events
 */
export function calculateMilestones(context: PersonCoverageContext): CoverageMilestone[] {
  const milestones: CoverageMilestone[] = []
  const currentYear = new Date().getFullYear()

  // Dependent independence milestones
  for (const dependent of context.dependents) {
    const yearsUntilIndependent = Math.max(0, INDEPENDENCE_AGE - dependent.age)
    if (yearsUntilIndependent > 0) {
      const independenceYear = currentYear + yearsUntilIndependent
      const ageAtMilestone = context.age + yearsUntilIndependent

      // Estimate coverage reduction (years of support * annual cost)
      const coverageReduction = -240000 // ~$240k reduction per dependent

      milestones.push({
        year: independenceYear,
        age: ageAtMilestone,
        event: `${dependent.name} turns ${INDEPENDENCE_AGE}`,
        description: `${dependent.name} becomes financially independent`,
        impact: `Coverage need drops ~$240K`,
        coverageChange: coverageReduction,
        category: 'dependent',
      })
    }
  }

  // Mortgage payoff milestone
  if (context.mortgageEndYear && context.mortgageBalance > 0) {
    const yearsUntilPayoff = context.mortgageEndYear - currentYear
    if (yearsUntilPayoff > 0 && yearsUntilPayoff <= 30) {
      milestones.push({
        year: context.mortgageEndYear,
        age: context.age + yearsUntilPayoff,
        event: 'Mortgage paid off',
        description: 'No longer need to cover outstanding home loan',
        impact: `Coverage need drops ~$${Math.round(context.mortgageBalance / 1000)}K`,
        coverageChange: -context.mortgageBalance,
        category: 'debt',
      })
    }
  }

  // Retirement milestone
  const yearsUntilRetirement = context.retirementAge - context.age
  if (yearsUntilRetirement > 0) {
    milestones.push({
      year: currentYear + yearsUntilRetirement,
      age: context.retirementAge,
      event: 'Retirement',
      description: 'Coverage focus shifts from income protection to health',
      impact: 'Life/TPD becomes optional, hospitalization becomes priority',
      coverageChange: 0, // Shift, not reduction
      category: 'retirement',
    })
  }

  // Sort by year
  return milestones.sort((a, b) => a.year - b.year)
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Calculate age from date of birth
 */
export function calculateAge(dateOfBirth: string): number {
  const today = new Date()
  const birth = new Date(dateOfBirth)
  let age = today.getFullYear() - birth.getFullYear()
  const monthDiff = today.getMonth() - birth.getMonth()
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--
  }
  return age
}

/**
 * Format coverage amount for display
 */
export function formatCoverageAmount(amount: number): string {
  if (amount >= 1000000) {
    return `$${(amount / 1000000).toFixed(1)}M`
  }
  if (amount >= 1000) {
    return `$${Math.round(amount / 1000)}K`
  }
  return `$${amount}`
}

/**
 * Get life stage emoji
 */
export function getLifeStageEmoji(stage: LifeStage): string {
  const emojis: Record<LifeStage, string> = {
    young_professional: '🌱',
    new_parent: '👶',
    growing_family: '🏠',
    empty_nester: '🍂',
    pre_retirement: '🌅',
    retired: '☀️',
  }
  return emojis[stage]
}

// =============================================================================
// Control Point Interpolation
// =============================================================================

import type { CoverageControlPoint, InterpolationMode } from '@/types/insurance'

/**
 * Linear interpolation between two values
 */
function lerp(start: number, end: number, t: number): number {
  return start + (end - start) * t
}

/**
 * Smooth (cubic) interpolation for more natural curves
 */
function smoothstep(start: number, end: number, t: number): number {
  // Cubic smoothstep: 3t² - 2t³
  const smoothT = t * t * (3 - 2 * t)
  return start + (end - start) * smoothT
}

/**
 * Interpolate a single coverage value based on control points
 */
function interpolateValue(
  age: number,
  before: { age: number; value: number | null } | null,
  after: { age: number; value: number | null } | null,
  autoCalculatedValue: number,
  interpolationMode: InterpolationMode
): number {
  // If no control points, use auto-calculated
  if (!before && !after) {
    return autoCalculatedValue
  }

  // If only before exists, use its value (or auto if null)
  if (before && !after) {
    return before.value ?? autoCalculatedValue
  }

  // If only after exists, use auto-calculated (we're before any control points)
  if (!before && after) {
    return autoCalculatedValue
  }

  // Both exist - interpolate
  if (before && after) {
    const beforeValue = before.value ?? autoCalculatedValue
    const afterValue = after.value ?? autoCalculatedValue

    // Step mode: jump at the control point
    if (interpolationMode === 'step') {
      return beforeValue
    }

    // Calculate interpolation factor
    const t = (age - before.age) / (after.age - before.age)

    if (interpolationMode === 'smooth') {
      return Math.round(smoothstep(beforeValue, afterValue, t))
    }

    // Default: linear
    return Math.round(lerp(beforeValue, afterValue, t))
  }

  return autoCalculatedValue
}

/**
 * Apply control points to coverage projections with interpolation.
 * Control points override auto-calculated values; ages between control points
 * are interpolated.
 */
export function interpolateCoverageWithControlPoints(
  projections: CoverageProjectionYear[],
  controlPoints: CoverageControlPoint[],
  interpolationMode: InterpolationMode = 'linear'
): CoverageProjectionYear[] {
  if (controlPoints.length === 0) {
    return projections
  }

  // Sort control points by age
  const sortedPoints = [...controlPoints].sort((a, b) => a.age - b.age)

  return projections.map((proj) => {
    // Find exact match first
    const exactMatch = sortedPoints.find((p) => p.age === proj.age)
    if (exactMatch) {
      return {
        ...proj,
        recommendedLifeTpd: exactMatch.lifeTpd ?? proj.recommendedLifeTpd,
        recommendedCriticalIllness:
          exactMatch.criticalIllness ?? proj.recommendedCriticalIllness,
        recommendedEarlyCi: exactMatch.earlyCi ?? proj.recommendedEarlyCi,
        recommendedDisability: exactMatch.disability ?? proj.recommendedDisability,
        recommendedPersonalAccident:
          exactMatch.personalAccident ?? proj.recommendedPersonalAccident,
      }
    }

    // Find surrounding control points
    let before: CoverageControlPoint | null = null
    let after: CoverageControlPoint | null = null

    for (const point of sortedPoints) {
      if (point.age < proj.age) {
        before = point
      } else if (point.age > proj.age && !after) {
        after = point
        break
      }
    }

    // Interpolate each coverage type
    const interpolatedLifeTpd = interpolateValue(
      proj.age,
      before ? { age: before.age, value: before.lifeTpd } : null,
      after ? { age: after.age, value: after.lifeTpd } : null,
      proj.recommendedLifeTpd,
      interpolationMode
    )

    const interpolatedCriticalIllness = interpolateValue(
      proj.age,
      before ? { age: before.age, value: before.criticalIllness } : null,
      after ? { age: after.age, value: after.criticalIllness } : null,
      proj.recommendedCriticalIllness,
      interpolationMode
    )

    const interpolatedPersonalAccident = interpolateValue(
      proj.age,
      before ? { age: before.age, value: before.personalAccident } : null,
      after ? { age: after.age, value: after.personalAccident } : null,
      proj.recommendedPersonalAccident,
      interpolationMode
    )

    const interpolatedEarlyCi = interpolateValue(
      proj.age,
      before ? { age: before.age, value: before.earlyCi } : null,
      after ? { age: after.age, value: after.earlyCi } : null,
      proj.recommendedEarlyCi,
      interpolationMode
    )

    const interpolatedDisability = interpolateValue(
      proj.age,
      before ? { age: before.age, value: before.disability } : null,
      after ? { age: after.age, value: after.disability } : null,
      proj.recommendedDisability,
      interpolationMode
    )

    return {
      ...proj,
      recommendedLifeTpd: interpolatedLifeTpd,
      recommendedCriticalIllness: interpolatedCriticalIllness,
      recommendedEarlyCi: interpolatedEarlyCi,
      recommendedDisability: interpolatedDisability,
      recommendedPersonalAccident: interpolatedPersonalAccident,
    }
  })
}

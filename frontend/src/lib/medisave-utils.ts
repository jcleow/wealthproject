// =============================================================================
// MediSave & CPF Insurance Utility Functions
// =============================================================================
//
// Singapore's CPF system pays for certain insurance premiums:
//  - Government schemes (MediShield Life, CareShield Life, ElderShield, DPS)
//    → fully payable from CPF (MediSave or OA/SA for DPS)
//  - Integrated Shield Plans (ISPs)
//    → partially payable from MediSave up to the Additional Withdrawal Limit (AWL)
//  - All other private insurance → cash only
//
// AWL is shared across all ISPs for one person per year.

export type MediSavePayability = 'full' | 'partial' | 'none'

export type PremiumFrequency = 'monthly' | 'quarterly' | 'annually'

export type BannerState =
  | { type: 'full'; label: string; medisavePortion: number }
  | { type: 'mixed'; medisavePortion: number; cashPortion: number; awlLimit: number; remainingAWL: number }
  | { type: 'none' }

export interface MediSaveSplitBreakdown {
  policyId: string
  policyName: string
  payability: MediSavePayability
  annualPremium: number
  medisavePortion: number
  cashPortion: number
}

export interface MediSaveSplitResult {
  totalAnnualPremium: number
  medisavePayable: number
  cashPayable: number
  awlLimit: number
  awlUsed: number
  awlRemaining: number
  breakdown: MediSaveSplitBreakdown[]
}

export interface MediSaveProjectionYear {
  age: number
  year: number
  totalAnnualPremium: number
  medisavePayable: number
  cashPayable: number
  awlLimit: number
}

// Government schemes that are fully CPF-payable
const GOVERNMENT_SCHEMES = ['medishield_life', 'careshield_life', 'eldershield', 'dps'] as const

// DPS is special — it uses OA/SA, not MediSave (MA)
const DPS_SCHEME = 'dps'

// =============================================================================
// Core Functions
// =============================================================================

/**
 * Get the MediSave Additional Withdrawal Limit for ISP premiums.
 * This is a per-person per-year cap on how much MediSave can pay for
 * Integrated Shield Plan premiums.
 */
export function getAWLLimit(ageNextBirthday: number): number {
  if (ageNextBirthday <= 40) return 300
  if (ageNextBirthday <= 70) return 600
  return 900
}

/**
 * Determine the MediSave payability category of a policy.
 *
 * - 'full': government scheme, entire premium from CPF
 * - 'partial': ISP (hospitalization, no gov scheme), subject to AWL cap
 * - 'none': private insurance, cash only
 *
 * Note: 'partial' means "subject to AWL" — a low-premium ISP may still
 * be fully covered by MediSave if premium ≤ remaining AWL.
 */
export function getMediSavePayability(policy: {
  governmentScheme?: string | null
  category: string
}): MediSavePayability {
  if (policy.governmentScheme && GOVERNMENT_SCHEMES.includes(policy.governmentScheme as typeof GOVERNMENT_SCHEMES[number])) {
    return 'full'
  }
  // Hospitalization policies without a government scheme are ISPs
  if (policy.category === 'hospitalization' || policy.category === 'health') {
    return 'partial'
  }
  return 'none'
}

/**
 * Annualize a premium amount based on its frequency.
 */
export function annualizePremium(amount: number, frequency: PremiumFrequency | string): number {
  switch (frequency) {
    case 'monthly': return amount * 12
    case 'quarterly': return amount * 4
    case 'annually': return amount
    default: return amount * 12 // default to monthly
  }
}

/**
 * Get the CPF account label for a government scheme.
 * DPS uses OA/SA, everything else uses MediSave (MA).
 */
export function getCpfAccountLabel(governmentScheme: string | null): string {
  if (governmentScheme === DPS_SCHEME) return 'CPF OA'
  return 'MediSave'
}

/**
 * Compute the Payment Source banner state for a single policy
 * in the Add/Edit Policy modal. This is reactive — it recalculates
 * as the user changes premium, frequency, or covered person.
 */
export function getBannerState(params: {
  governmentScheme?: string | null
  category: string
  annualizedPremium: number
  remainingAWL: number
}): BannerState {
  const { governmentScheme, category, annualizedPremium, remainingAWL } = params

  // Government schemes are always fully CPF-payable
  if (governmentScheme && GOVERNMENT_SCHEMES.includes(governmentScheme as typeof GOVERNMENT_SCHEMES[number])) {
    const label = governmentScheme === DPS_SCHEME
      ? 'Premiums deducted from CPF Ordinary Account'
      : 'Premiums fully deducted from CPF MediSave Account'
    return { type: 'full', label, medisavePortion: annualizedPremium }
  }

  // ISPs: check premium against remaining AWL
  if (category === 'hospitalization' || category === 'health') {
    if (annualizedPremium <= 0) {
      return { type: 'none' }
    }
    if (annualizedPremium <= remainingAWL) {
      return {
        type: 'full',
        label: 'Premiums fully payable from MediSave (within AWL)',
        medisavePortion: annualizedPremium,
      }
    }
    return {
      type: 'mixed',
      medisavePortion: remainingAWL,
      cashPortion: annualizedPremium - remainingAWL,
      awlLimit: remainingAWL, // this is the remaining AWL, not total
      remainingAWL,
    }
  }

  // All other categories: cash only, no banner
  return { type: 'none' }
}

/**
 * Calculate the MediSave vs cash split for a set of policies
 * belonging to one person. Used for summary cards and the
 * Annual Premium Breakdown.
 *
 * AWL is shared across all ISPs — the first ISP in the list
 * consumes AWL, and subsequent ISPs get the remainder.
 */
export function calculateMediSaveSplit(
  policies: Array<{
    id: string
    name: string
    governmentScheme: string | null
    category: string
    premiumAmount: number
    premiumFrequency: string
  }>,
  personAgeNextBirthday: number,
): MediSaveSplitResult {
  const awlLimit = getAWLLimit(personAgeNextBirthday)
  let awlUsed = 0
  let totalMedisave = 0
  let totalCash = 0
  let totalPremium = 0

  const breakdown: MediSaveSplitBreakdown[] = policies.map((policy) => {
    const annualPremium = annualizePremium(policy.premiumAmount, policy.premiumFrequency)
    totalPremium += annualPremium
    const payability = getMediSavePayability(policy)

    if (payability === 'full') {
      // Government schemes — fully CPF-payable
      totalMedisave += annualPremium
      return {
        policyId: policy.id,
        policyName: policy.name,
        payability,
        annualPremium,
        medisavePortion: annualPremium,
        cashPortion: 0,
      }
    }

    if (payability === 'partial') {
      // ISP — capped at remaining AWL
      const remainingAWL = Math.max(0, awlLimit - awlUsed)
      const medisavePortion = Math.min(annualPremium, remainingAWL)
      const cashPortion = annualPremium - medisavePortion
      awlUsed += medisavePortion
      totalMedisave += medisavePortion
      totalCash += cashPortion
      return {
        policyId: policy.id,
        policyName: policy.name,
        payability: medisavePortion > 0 && cashPortion > 0 ? 'partial' : medisavePortion > 0 ? 'full' : 'none',
        annualPremium,
        medisavePortion,
        cashPortion,
      }
    }

    // Cash-only
    totalCash += annualPremium
    return {
      policyId: policy.id,
      policyName: policy.name,
      payability: 'none',
      annualPremium,
      medisavePortion: 0,
      cashPortion: annualPremium,
    }
  })

  return {
    totalAnnualPremium: totalPremium,
    medisavePayable: totalMedisave,
    cashPayable: totalCash,
    awlLimit,
    awlUsed,
    awlRemaining: Math.max(0, awlLimit - awlUsed),
    breakdown,
  }
}

/**
 * Project MediSave premium splits over an age range.
 * Used by the Coverage Journey chart to show premium costs over time.
 *
 * As the person ages across AWL thresholds (40→41, 70→71),
 * the AWL steps up and splits change.
 */
export function projectMediSavePremiums(
  policies: Array<{
    id: string
    name: string
    governmentScheme: string | null
    category: string
    premiumAmount: number
    premiumFrequency: string
    startDate?: string | null
    endDate?: string | null
  }>,
  startAge: number,
  endAge: number,
  currentYear: number,
): MediSaveProjectionYear[] {
  const projections: MediSaveProjectionYear[] = []

  for (let age = startAge; age <= endAge; age++) {
    const year = currentYear + (age - startAge)

    // Filter to policies active at this age/year
    const activePolicies = policies.filter((policy) => {
      if (!policy.startDate) return true
      const startYear = new Date(policy.startDate).getFullYear()
      if (year < startYear) return false
      if (policy.endDate) {
        const endYear = new Date(policy.endDate).getFullYear()
        if (year > endYear) return false
      }
      return true
    })

    const split = calculateMediSaveSplit(activePolicies, age)
    projections.push({
      age,
      year,
      totalAnnualPremium: split.totalAnnualPremium,
      medisavePayable: split.medisavePayable,
      cashPayable: split.cashPayable,
      awlLimit: split.awlLimit,
    })
  }

  return projections
}

/**
 * Income Ceiling Constants for Singapore Housing
 *
 * These ceilings are updated periodically by HDB/government.
 * Versioned by year to allow for policy changes.
 *
 * References:
 * - HDB: https://www.hdb.gov.sg/residential/buying-a-flat/understanding-your-eligibility-and-housing-loan-options
 * - EC: https://www.hdb.gov.sg/cs/infoweb/residential/buying-a-flat/executive-condominium
 */

// Income ceiling versions by year
const INCOME_CEILINGS = {
  2026: {
    hdb: 14000,  // HDB income ceiling ($14,000/month)
    ec: 16000,   // EC income ceiling ($16,000/month)
  },
  2025: {
    hdb: 14000,
    ec: 16000,
  },
  2024: {
    hdb: 14000,
    ec: 16000,
  },
  // Add historical ceilings as needed for backward compatibility
} as const

type CeilingYear = keyof typeof INCOME_CEILINGS

/**
 * Get income ceilings for a specific year.
 * Falls back to the most recent year if the requested year is not available.
 */
export function getIncomeCeilings(year: number = new Date().getFullYear()): {
  hdb: number
  ec: number
} {
  const availableYears = Object.keys(INCOME_CEILINGS)
    .map(Number)
    .sort((a, b) => b - a)

  // Find the ceiling for the requested year, or use the most recent
  const ceilingYear = availableYears.find(y => y <= year) ?? availableYears[0]

  return INCOME_CEILINGS[ceilingYear as CeilingYear]
}

/**
 * Check if household income exceeds the HDB income ceiling.
 */
export function exceedsHdbIncomeCeiling(
  householdIncome: number,
  year: number = new Date().getFullYear()
): boolean {
  const { hdb } = getIncomeCeilings(year)
  return householdIncome > hdb
}

/**
 * Check if household income exceeds the EC income ceiling.
 */
export function exceedsEcIncomeCeiling(
  householdIncome: number,
  year: number = new Date().getFullYear()
): boolean {
  const { ec } = getIncomeCeilings(year)
  return householdIncome > ec
}

// Export the raw ceilings for display purposes
export { INCOME_CEILINGS }

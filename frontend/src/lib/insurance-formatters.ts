// =============================================================================
// Shared insurance formatting utilities.
//
// Extracted from PoliciesTab, MyCoverageTab, and PolicyDetailModal to
// eliminate duplication of premium annualization and category label logic.
// =============================================================================

/**
 * Convert a premium amount to its annual equivalent based on the payment frequency.
 *
 * Duplicated logic was present in:
 * - PoliciesTab.annualizePremium
 * - MyCoverageTab.getAnnualPremium (via toNum wrapper)
 * - PolicyDetailModal.computeAnnualPremium
 */
export function annualizePremium(amount: number, frequency: string): number {
  switch (frequency) {
    case 'monthly':
      return amount * 12
    case 'quarterly':
      return amount * 4
    case 'annually':
      return amount
    default:
      return amount
  }
}

/**
 * Map a category/subcategory pair to a human-readable display label.
 *
 * Duplicated in PoliciesTab.formatCategoryLabel. Also implicitly present
 * in JourneyTab and MyCoverageTab via hardcoded label strings.
 */
export function formatCategoryLabel(category: string, subcategory?: string | null): string {
  const categoryLabels: Record<string, string> = {
    life: 'Life/TPD',
    health: 'Hospitalization',
    hospitalization: 'Hospitalization',
    critical_illness: 'Critical Illness',
    long_term_care: 'Disability',
    disability: 'Disability',
    personal_accident: 'Personal Accident',
    accident: 'Personal Accident',
  }

  if (subcategory) {
    const subcategoryLabels: Record<string, string> = {
      term_life: 'Life/TPD',
      whole_life: 'Life/TPD',
      ilp: 'Life/ILP',
      isp: 'Hospitalization',
      medishield: 'Hospitalization',
      early_ci: 'Critical Illness',
      late_ci: 'Critical Illness',
      multi_pay: 'Critical Illness',
      careshield: 'Disability',
      ltc_supplement: 'Disability',
      pa: 'Personal Accident',
    }
    if (subcategoryLabels[subcategory]) return subcategoryLabels[subcategory]
  }

  return categoryLabels[category] ?? category
}

/**
 * Safely coerce any value to a finite number.
 * Guards against string or NaN values from the API.
 *
 * Previously duplicated in MyCoverageTab.toNum.
 */
export function toFiniteNumber(value: unknown): number {
  const numericValue = Number(value)
  return Number.isFinite(numericValue) ? numericValue : 0
}

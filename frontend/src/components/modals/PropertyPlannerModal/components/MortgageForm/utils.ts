import type { CPFAssetResponseV2 } from '@/types/timeline'

/**
 * Extract projected OA balance from timeline CPF assets by earner name.
 * Matches by ID pattern (cpf-oa-{earner}) since the backend uses this consistent format.
 */
export function getProjectedOaByEarner(
  cpfAssets: CPFAssetResponseV2[],
  earner: string
): number | null {
  const earnerLower = earner.toLowerCase()
  const oaAsset = cpfAssets.find(
    (a) => a.earner?.toLowerCase() === earnerLower && a.id.startsWith('cpf-oa')
  )
  if (!oaAsset) return null
  return parseFloat(oaAsset.balance) || 0
}

/**
 * Helper to get monthly amount from an income record.
 * Handles both string and number amount types.
 */
export function getMonthlyAmount(income: { amount: string | number; frequency: string }): number {
  const amount = typeof income.amount === 'string' ? parseFloat(income.amount) : income.amount
  return income.frequency === 'monthly' ? amount : Math.round(amount / 12)
}

/**
 * Derive household income from borrower income IDs.
 * Computed inline rather than stored in state.
 */
export function getHouseholdIncome(
  incomes: { id: string; amount: string | number; frequency: string }[],
  borrower1IncomeId: string,
  borrower2IncomeId: string | null,
  borrowerType: string
): number {
  if (!borrower1IncomeId || incomes.length === 0) return 0

  const b1 = incomes.find(i => i.id === borrower1IncomeId)
  if (!b1) return 0

  let total = getMonthlyAmount(b1)

  if (borrowerType === 'joint' && borrower2IncomeId) {
    const b2 = incomes.find(i => i.id === borrower2IncomeId)
    if (b2) total += getMonthlyAmount(b2)
  }

  return total
}

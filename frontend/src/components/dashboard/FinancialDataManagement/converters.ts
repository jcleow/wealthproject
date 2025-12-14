import type {
  TimelineItem,
  TimelineFrequency,
  NonCashAssetResponseV2,
  CashAssetResponseV2,
  CPFAssetResponseV2,
  LiabilityResponseV2,
  IncomeResponseV2,
  ExpenseResponseV2,
} from '@/types/timeline'

/** Parse decimal string from V2 backend to number */
export function parseDecimal(value: string | undefined): number {
  if (!value) return 0
  const parsed = parseFloat(value)
  return isNaN(parsed) ? 0 : parsed
}

export function nonCashAssetV2ToTimelineItem(item: NonCashAssetResponseV2): TimelineItem {
  const balance = parseDecimal(item.balance)
  const adjBalance = parseDecimal(item.adjBalance)
  return {
    itemId: item.id,
    parentId: item.parentId,
    name: item.name,
    category: item.category,
    amountAnnual: balance,
    adjAnnualAmt: adjBalance,
    amountMonthly: balance,
    adjMonthlyAmt: adjBalance,
    itemType: 'asset',
    startYear: item.startYear,
    startMonth: item.startMonth,
  }
}

export function cashAssetV2ToTimelineItem(item: CashAssetResponseV2): TimelineItem {
  const balance = parseDecimal(item.balance)
  const adjBalance = parseDecimal(item.adjBalance)
  return {
    itemId: item.itemId,
    name: item.name,
    category: item.category,
    amountAnnual: balance,
    adjAnnualAmt: adjBalance,
    amountMonthly: balance,
    adjMonthlyAmt: adjBalance,
    itemType: 'cash_account',
    startYear: item.startYear,
    startMonth: item.startMonth,
    isAccumulator: item.isAccumulator,
  }
}

export function cpfAssetV2ToTimelineItem(item: CPFAssetResponseV2): TimelineItem {
  const balance = parseDecimal(item.balance)
  const adjBalance = parseDecimal(item.adjBalance)
  return {
    itemId: item.id,
    parentId: item.parentId,
    name: item.name,
    category: item.category,
    amountAnnual: balance,
    adjAnnualAmt: adjBalance,
    amountMonthly: balance,
    adjMonthlyAmt: adjBalance,
    itemType: 'asset',
    startYear: item.startYear,
    startMonth: item.startMonth,
  }
}

export function liabilityV2ToTimelineItem(item: LiabilityResponseV2): TimelineItem {
  const balance = parseDecimal(item.balance)
  const adjBalance = parseDecimal(item.adjBalance)
  return {
    itemId: item.id,
    parentId: item.parentId,
    name: item.name,
    category: item.category,
    amountAnnual: balance,
    adjAnnualAmt: adjBalance,
    amountMonthly: balance,
    adjMonthlyAmt: adjBalance,
    sourceAmount: parseDecimal(item.sourceAmount),
    itemType: 'liability',
    startYear: item.startYear,
    startMonth: item.startMonth,
  }
}

export function incomeV2ToTimelineItem(item: IncomeResponseV2): TimelineItem {
  return {
    itemId: item.id,
    parentId: item.parentId,
    name: item.name,
    category: item.category,
    amountAnnual: parseDecimal(item.amount),
    adjAnnualAmt: parseDecimal(item.adjAmount),
    amountMonthly: parseDecimal(item.amount),
    adjMonthlyAmt: parseDecimal(item.adjAmount),
    sourceFrequency: item.sourceFrequency as TimelineFrequency,
    itemType: 'income',
    startYear: item.startYear,
    startMonth: item.startMonth,
    growthRate: parseDecimal(item.growthRate),
  }
}

export function expenseV2ToTimelineItem(item: ExpenseResponseV2): TimelineItem {
  return {
    itemId: item.id,
    parentId: item.parentId,
    name: item.name,
    category: item.category,
    amountAnnual: parseDecimal(item.amount),
    adjAnnualAmt: parseDecimal(item.adjAmount),
    amountMonthly: parseDecimal(item.amount),
    adjMonthlyAmt: parseDecimal(item.adjAmount),
    sourceFrequency: item.sourceFrequency as TimelineFrequency,
    itemType: 'expense',
    startYear: item.startYear,
    startMonth: item.startMonth,
  }
}

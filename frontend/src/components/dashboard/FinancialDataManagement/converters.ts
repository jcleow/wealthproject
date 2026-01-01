import type {
  TimelineItem,
  TimelineEventImpact,
  AppliedImpactV2,
  NonCashAssetResponseV2,
  InvestmentResponseV2,
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

/** Convert V2 applied impacts to TimelineEventImpact array */
function convertAppliedImpacts(impacts?: AppliedImpactV2[]): TimelineEventImpact[] | undefined {
  if (!impacts || impacts.length === 0) return undefined
  return impacts.map((imp) => ({
    eventId: imp.eventId,
    amountAnnual: parseDecimal(imp.amountAnnual),
    amountMonthly: parseDecimal(imp.amountMonthly),
    impactKind: imp.impactKind,
    notes: imp.notes,
    growthRate: imp.growthRate,
  }))
}

export function nonCashAssetV2ToTimelineItem(item: NonCashAssetResponseV2): TimelineItem {
  const balance = parseDecimal(item.balance)
  const eventAdjBalance = parseDecimal(item.eventAdjBalance)
  return {
    itemId: item.id,
    parentId: item.parentId,
    name: item.name,
    category: item.category,
    amountAnnual: balance,
    adjAnnualAmt: eventAdjBalance,
    amountMonthly: balance,
    adjMonthlyAmt: eventAdjBalance,
    itemType: item.itemType,
    startYear: item.startYear,
    startMonth: item.startMonth,
    eventImpacts: convertAppliedImpacts(item.eventImpacts),
    scenarioEventId: item.scenarioEventId,
  }
}

export function investmentV2ToTimelineItem(item: InvestmentResponseV2): TimelineItem {
  const balance = parseDecimal(item.balance)
  const eventAdjBalance = parseDecimal(item.eventAdjBalance)
  return {
    itemId: item.id,
    parentId: item.parentId,
    name: item.name,
    category: item.category,
    amountAnnual: balance,
    adjAnnualAmt: eventAdjBalance,
    amountMonthly: balance,
    adjMonthlyAmt: eventAdjBalance,
    itemType: item.itemType,
    startYear: item.startYear,
    startMonth: item.startMonth,
    growthRate: parseDecimal(item.growthRate),
    eventImpacts: convertAppliedImpacts(item.eventImpacts),
    scenarioEventId: item.scenarioEventId,
  }
}

export function cashAssetV2ToTimelineItem(item: CashAssetResponseV2): TimelineItem {
  const balance = parseDecimal(item.balance)
  const eventAdjBalance = parseDecimal(item.eventAdjBalance)
  return {
    itemId: item.itemId,
    name: item.name,
    category: item.category,
    amountAnnual: balance,
    adjAnnualAmt: eventAdjBalance,
    amountMonthly: balance,
    adjMonthlyAmt: eventAdjBalance,
    itemType: item.itemType,
    startYear: item.startYear,
    startMonth: item.startMonth,
    isAccumulator: item.isAccumulator,
    eventImpacts: convertAppliedImpacts(item.eventImpacts),
  }
}

export function cpfAssetV2ToTimelineItem(item: CPFAssetResponseV2): TimelineItem {
  const balance = parseDecimal(item.balance)
  const eventAdjBalance = parseDecimal(item.eventAdjBalance)
  return {
    itemId: item.id,
    parentId: item.parentId,
    name: item.name,
    category: item.category,
    personId: item.personId,
    personName: item.personName,
    amountAnnual: balance,
    adjAnnualAmt: eventAdjBalance,
    amountMonthly: balance,
    adjMonthlyAmt: eventAdjBalance,
    itemType: item.itemType,
    startYear: item.startYear,
    startMonth: item.startMonth,
  }
}

export function liabilityV2ToTimelineItem(item: LiabilityResponseV2): TimelineItem {
  const balance = parseDecimal(item.balance)
  const eventAdjBalance = parseDecimal(item.eventAdjBalance)
  return {
    itemId: item.id,
    parentId: item.parentId,
    name: item.name,
    category: item.category,
    amountAnnual: balance,
    adjAnnualAmt: eventAdjBalance,
    amountMonthly: balance,
    adjMonthlyAmt: eventAdjBalance,
    sourceAmount: parseDecimal(item.sourceAmount),
    itemType: item.itemType,
    startYear: item.startYear,
    startMonth: item.startMonth,
    eventImpacts: convertAppliedImpacts(item.eventImpacts),
    scenarioEventId: item.scenarioEventId,
  }
}

export function incomeV2ToTimelineItem(item: IncomeResponseV2): TimelineItem {
  // V2 API returns both monthly amounts and pre-calculated annual amounts
  // Annual amounts are summed from all 12 months to account for growth and scenario impacts
  return {
    itemId: item.id,
    parentId: item.parentId,
    name: item.name,
    personId: item.personId,
    personName: item.personName,
    category: item.category,
    amountAnnual: parseDecimal(item.annualAmount),
    adjAnnualAmt: parseDecimal(item.eventAdjAnnualAmount),
    amountMonthly: parseDecimal(item.amount),
    adjMonthlyAmt: parseDecimal(item.eventAdjAmount),
    sourceFrequency: item.sourceFrequency,
    itemType: item.itemType,
    startYear: item.startYear,
    startMonth: item.startMonth,
    growthRate: parseDecimal(item.growthRate),
    eventImpacts: convertAppliedImpacts(item.eventImpacts),
    scenarioEventId: item.scenarioEventId,
  }
}

export function expenseV2ToTimelineItem(item: ExpenseResponseV2): TimelineItem {
  // V2 API returns both monthly amounts and pre-calculated annual amounts
  // Annual amounts are summed from all 12 months to account for growth and scenario impacts
  return {
    itemId: item.id,
    parentId: item.parentId,
    name: item.name,
    category: item.category,
    amountAnnual: parseDecimal(item.annualAmount),
    adjAnnualAmt: parseDecimal(item.eventAdjAnnualAmount),
    amountMonthly: parseDecimal(item.amount),
    adjMonthlyAmt: parseDecimal(item.eventAdjAmount),
    sourceFrequency: item.sourceFrequency,
    itemType: item.itemType,
    startYear: item.startYear,
    startMonth: item.startMonth,
    sourceLiabilityId: item.sourceLiabilityId,
    eventImpacts: convertAppliedImpacts(item.eventImpacts),
    scenarioEventId: item.scenarioEventId,
    icon: item.icon,
    iconColor: item.iconColor,
  }
}

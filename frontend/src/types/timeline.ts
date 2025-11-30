export type TimelineFrequency =
  | 'annual'
  | 'monthly'
  | 'weekly'
  | 'biweekly'
  | 'quarterly'
  | 'semiannual'

export type TimelineItemType = 'asset' | 'liability' | 'income' | 'expense'

/** Event impact attached to a timeline item */
export interface TimelineEventImpact {
  eventId: string
  amountAnnual?: number
  impactKind?: 'delta' | 'override' | 'start' | 'stop'
  notes?: string
}

export interface TimelineItem {
  itemId: string
  rowId?: string
  parentId?: string
  name: string
  category: string
  amountAnnual: number
  adjAnnualAmt?: number
  sourceAmount?: number
  sourceFrequency?: TimelineFrequency
  itemType: TimelineItemType
  createdYear: number
  /** Scenario event impacts applied to this item */
  eventImpacts?: TimelineEventImpact[]
}

export interface GrowthApplied {
  category: string
  annualRatePct: number
}

export interface TimelineYear {
  year: number
  assets: TimelineItem[]
  liabilities: TimelineItem[]
  income: TimelineItem[]
  expenses: TimelineItem[]
  netCash: number
  netWorth: number
  hasOverrides: boolean
  growthApplied: GrowthApplied[]
}

export interface TimelineResponse {
  years: TimelineYear[]
  version: string
}

export interface TimelineEdit {
  itemId?: string
  name?: string
  itemType: TimelineItemType
  category: string
  amount: number
  frequency: TimelineFrequency
}

export interface TimelineEditRequest {
  year: number
  edits: TimelineEdit[]
  note?: string
}

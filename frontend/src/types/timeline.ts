export type TimelineFrequency =
  | 'annual'
  | 'monthly'
  | 'weekly'
  | 'biweekly'
  | 'quarterly'
  | 'semiannual'

export type TimelineItemType = 'asset' | 'liability' | 'income' | 'expense'

export interface TimelineItem {
  item_id: string
  name: string
  category: string
  amount_annual: number
  source_amount?: number
  source_frequency?: TimelineFrequency
  item_type: TimelineItemType
  created_year: number
}

export interface GrowthApplied {
  category: string
  annual_rate_pct: number
}

export interface TimelineYear {
  year: number
  assets: TimelineItem[]
  liabilities: TimelineItem[]
  income: TimelineItem[]
  expenses: TimelineItem[]
  net_cash: number
  net_worth: number
  has_overrides: boolean
  growth_applied: GrowthApplied[]
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

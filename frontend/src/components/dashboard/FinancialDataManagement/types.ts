import type { LucideIcon } from 'lucide-react'
import type { Asset, Expense, Income, Liability, CashAccount } from '@/types/financial'
import type { ScenarioEvent } from '@/types/scenario'
import type {
  TimelineYear,
  TimelineMonth,
  TimelineEditRequest,
  TimelineItem,
  TimelineEventImpact,
  MonthDetailResponseV2,
} from '@/types/timeline'
import type { FinancialDataType, TimelineItemData } from '@/components/modals/FinancialFormModal'

export type FinancialCategory = FinancialDataType

export type CategoryConfig = {
  title: string
  emptyDescription: string
  icon: LucideIcon
  accent: string
  // Icon styling for dark mode
  iconBg: string
  iconColor: string
  // Icon styling for light mode (Monet)
  iconBgLight: string
  iconColorLight: string
  gradientBg: string
  textColor: string
  textColorLight: string
  progressColor: string
  singular: string
  plural: string
  helper?: string
}

/** Result of looking up scenario impacts on a timeline item */
export interface AppliedImpact {
  event: ScenarioEvent | null
  impact: TimelineEventImpact
}

/** Union type for any editable financial item (from timeline or raw API) */
export type EditableFinancialItem = Asset | Income | Liability | Expense | TimelineItem | TimelineItemData

export interface ModalState {
  isOpen: boolean
  type: FinancialCategory
  mode: 'create' | 'edit'
  data?: EditableFinancialItem
}

export interface CashAccountModalState {
  isOpen: boolean
  mode: 'create' | 'edit'
  data?: CashAccount
}

export interface FinancialDataManagementProps {
  // Timeline data props (selection state now comes from Zustand store)
  timelineYear?: TimelineYear
  timelineMonth?: TimelineMonth
  timelineMonths?: TimelineMonth[]
  /** V2 month data - when provided, used for card display instead of V1 data */
  timelineMonthV2?: MonthDetailResponseV2
  timelineYears?: TimelineYear[]
  isTimelineLoading?: boolean
  onSaveTimelineEdits?: (payload: TimelineEditRequest) => Promise<void>
  /** When true, show Tax Mode panel instead of cashflow cards */
  showTaxMode?: boolean
  /** When true, use compact layout for side-by-side view */
  compact?: boolean
}

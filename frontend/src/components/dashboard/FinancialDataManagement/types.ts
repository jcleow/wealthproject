import type { LucideIcon } from 'lucide-react'
import type { Asset, Expense, Income, Liability, CashAccount } from '@/types/financial'
import type { ScenarioEvent } from '@/types/scenario'
import type {
  TimelineYear,
  TimelineMonth,
  TimeResolution,
  TimelineEditRequest,
  TimelineItem,
  TimelineEventImpact,
  MonthDetailResponseV2,
} from '@/types/timeline'
import type { FinancialDataType } from '@/components/modals/FinancialFormModal'
import type { ZoomLevel } from '@/components/timeline/ZoomControls'

export type FinancialCategory = FinancialDataType

export type CategoryConfig = {
  title: string
  emptyDescription: string
  icon: LucideIcon
  accent: string
  gradientBg: string
  textColor: string
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
export type EditableFinancialItem = Asset | Income | Liability | Expense | TimelineItem

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
  selectedYear?: number
  onSelectYear?: (year: number) => void
  selectedMonth?: number
  onSelectMonth?: (month: number | null) => void
  timelineYear?: TimelineYear
  timelineMonth?: TimelineMonth
  /** V2 month data - when provided, used for card display instead of V1 data */
  timelineMonthV2?: MonthDetailResponseV2
  timelineYears?: TimelineYear[]
  anchorYear?: number | null
  anchorMonth?: number | null
  resolution?: TimeResolution
  zoomLevel?: ZoomLevel
  isTimelineLoading?: boolean
  onSaveTimelineEdits?: (payload: TimelineEditRequest) => Promise<void>
}

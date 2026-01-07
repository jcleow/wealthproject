/**
 * Shared types for CategoryCard subcomponents
 */

import type { TimelineItem, CPFContributionResponseV2, CPFRefundResponseV2 } from '@/types/timeline'
import type { ScenarioEvent } from '@/types/scenario'
import type { CashAccount } from '@/types/financial'
import type { PropertyLinkRecord } from '@/types/property'
import type { IncomeAllocation } from '@/api/financial/incomes'
import type { FinancialCategory } from '../../types'

/** Common props for item rendering */
export interface ItemRenderingProps {
  showMonthlyData: boolean
  getDisplayAmount: (item: TimelineItem) => number
  activeAnnualizationId: string | null
  setActiveAnnualizationId: (id: string | null) => void
}

/** Props for scenario event handling */
export interface ScenarioEventProps {
  scenarioEvents: ScenarioEvent[]
  expandedScenarioItems: Set<string>
  onToggleScenarioExpanded: (itemId: string) => void
}

/** Props for item selection */
export interface SelectionProps {
  selectedItemId: string | null
  onSelectItem: (itemId: string | null) => void
}

/** Props for CRUD operations on items */
export interface CRUDProps {
  onEditItem: (category: FinancialCategory, item: TimelineItem) => void
  onDeleteItem: (category: FinancialCategory, id: string) => void
}

/** Props for cash account operations */
export interface CashAccountProps {
  cashAccounts: CashAccount[]
  onSetAccumulator?: (id: string) => void
  onOpenCashAccountEdit?: (cashAccount: CashAccount) => void
  onDeleteCashAccount?: (id: string) => void
}

/** Props for property link operations */
export interface PropertyLinkProps {
  getPropertyLink?: (item: TimelineItem, index: number) => PropertyLinkRecord | null
  onOpenPropertyPlanner?: (link: PropertyLinkRecord) => void
}

/** Props for income allocation management */
export interface AllocationProps {
  onManageAllocations?: (item: TimelineItem) => void
}

/** Common props for grouped/flat section components */
export interface BaseSectionProps extends
  ItemRenderingProps,
  ScenarioEventProps,
  SelectionProps,
  CRUDProps,
  CashAccountProps {
  items: TimelineItem[]
  financialCategory: FinancialCategory
  summarizeAmount: (item: TimelineItem) => number
}

/** Props for investments section */
export interface InvestmentsSectionProps {
  monthlyInvestments: number
  showMonthlyData: boolean
  allocations: IncomeAllocation[]
  investments: TimelineItem[]
  onEditAllocation?: (allocation: IncomeAllocation) => void
  onDeleteAllocation?: (allocation: IncomeAllocation) => void
  groupItems?: boolean
}

/** Props for CPF contributions section */
export interface CPFContributionsSectionProps {
  cpfContributionsRaw: CPFContributionResponseV2[]
  cpfRefundsRaw?: CPFRefundResponseV2[]
  groupItems?: boolean
}

/** Props for debt repayments section */
export interface DebtRepaymentsSectionProps {
  debtRepayments: TimelineItem[]
  getDisplayAmount: (item: TimelineItem) => number
  showMonthlyData: boolean
  onEdit?: (item: TimelineItem) => void
  onDelete?: (item: TimelineItem) => void
  groupItems?: boolean
}

/** Props for investment/CPF assets sections */
export interface AssetSubsectionProps {
  items: TimelineItem[]
  getDisplayAmount: (item: TimelineItem) => number
  onEdit?: (item: TimelineItem) => void
  onDelete?: (id: string) => void
  groupItems?: boolean
}

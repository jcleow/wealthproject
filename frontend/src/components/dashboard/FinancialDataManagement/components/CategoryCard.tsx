import { useState, useEffect } from 'react'
import clsx from 'clsx'
import type { TimelineItem, CPFContributionResponseV2, PropertySnapshotV2 } from '@/types/timeline'
import type { ScenarioEvent } from '@/types/scenario'
import type { CashAccount } from '@/types/financial'
import type { PropertyLinkRecord } from '@/types/property'
import type { IncomeAllocation } from '@/api/financial/incomes'
import { categoryConfig } from '../config'
import { getItemId, sortItems } from '../utils'
import { parseDecimal } from '../converters'
import type { FinancialCategory } from '../types'

import {
  CategoryCardHeader,
  CategoryCardTotal,
  GroupedItemsSection,
  GroupedAssetsSection,
  FlatItemsSection,
  InvestmentsAssetsSection,
  CPFAssetsSection,
  CPFContributionsSection,
  InvestmentsIncomeSection,
  DebtRepaymentsSection,
  PropertiesAssetsSection,
  PropertiesMortgagesSection,
} from './CategoryCard/index'

interface CategoryCardProps {
  category: FinancialCategory
  data: TimelineItem[]
  sortDirection: 'asc' | 'desc'
  onToggleSortDirection: () => void
  onAddItem: () => void
  onEditItem: (category: FinancialCategory, item: TimelineItem) => void
  onDeleteItem: (category: FinancialCategory, id: string) => void
  selectedItemId: string | null
  onSelectItem: (itemId: string | null) => void
  expandedScenarioItems: Set<string>
  onToggleScenarioExpanded: (itemId: string) => void
  scenarioEvents: ScenarioEvent[]
  showMonthlyData: boolean
  getDisplayAmount: (item: TimelineItem) => number
  summarizeAmount: (item: TimelineItem) => number
  activeAnnualizationId: string | null
  setActiveAnnualizationId: (id: string | null) => void
  // Cash account specific
  cashAccounts: CashAccount[]
  onSetAccumulator?: (id: string) => void
  onOpenCashAccountEdit?: (cashAccount: CashAccount) => void
  onDeleteCashAccount?: (id: string) => void
  // Property links
  mergedLinks: Record<string, PropertyLinkRecord>
  assetLinks: Record<string, PropertyLinkRecord[]>
  liabilityLinks: Record<string, PropertyLinkRecord[]>
  firstLink: PropertyLinkRecord | null
  onOpenPropertyPlanner?: (link: PropertyLinkRecord) => void
  // Investments (V2 assets)
  investmentAssets?: TimelineItem[]
  // CPF specific (V2)
  cpfAssets?: TimelineItem[]
  cpfContributionsRaw?: CPFContributionResponseV2[]
  // Property snapshots (V2)
  propertySnapshots?: PropertySnapshotV2[]
  // Investments income (V2)
  hasInvestmentsSection?: boolean
  monthlyInvestments?: number
  // Investment CRUD callbacks
  onAddInvestment?: () => void
  onEditInvestment?: (item: TimelineItem) => void
  onDeleteInvestment?: (id: string) => void
  // CPF add callback
  onAddCpf?: () => void
  // Income allocation callbacks
  onManageAllocations?: (item: TimelineItem) => void
  // Investment allocations data (for Income card)
  investmentAllocations?: IncomeAllocation[]
  investments?: TimelineItem[]
  onEditAllocation?: (allocation: IncomeAllocation) => void
  onDeleteAllocation?: (allocation: IncomeAllocation) => void
  // Debt repayment callbacks
  onDeleteDebtRepayment?: (item: TimelineItem) => void
  // CPF CRUD callbacks
  onEditCpf?: (item: TimelineItem) => void
  onDeleteCpf?: (id: string) => void
  // Display settings
  groupItemsByCategory?: boolean
  compact?: boolean
  // Collapse state callback for parent components
  onCollapseChange?: (isCollapsed: boolean) => void
}

export function CategoryCard({
  category,
  data,
  sortDirection,
  onToggleSortDirection,
  onAddItem,
  onEditItem,
  onDeleteItem,
  selectedItemId,
  onSelectItem,
  expandedScenarioItems,
  onToggleScenarioExpanded,
  scenarioEvents,
  showMonthlyData,
  getDisplayAmount,
  summarizeAmount,
  activeAnnualizationId,
  setActiveAnnualizationId,
  cashAccounts,
  onSetAccumulator,
  onOpenCashAccountEdit,
  onDeleteCashAccount,
  mergedLinks,
  assetLinks,
  liabilityLinks,
  firstLink,
  onOpenPropertyPlanner,
  investmentAssets = [],
  cpfAssets = [],
  cpfContributionsRaw = [],
  propertySnapshots = [],
  hasInvestmentsSection = false,
  monthlyInvestments = 0,
  onAddInvestment,
  onEditInvestment,
  onDeleteInvestment,
  onAddCpf,
  onManageAllocations,
  investmentAllocations = [],
  investments = [],
  onEditAllocation,
  onDeleteAllocation,
  onDeleteDebtRepayment,
  onEditCpf,
  onDeleteCpf,
  groupItemsByCategory = true,
  compact = false,
  onCollapseChange,
}: CategoryCardProps) {
  // Start collapsed in compact mode (side-by-side layout)
  const [isCollapsed, setIsCollapsed] = useState(compact)

  // Notify parent of initial collapse state when in compact mode
  useEffect(() => {
    if (compact) {
      onCollapseChange?.(true)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Notify parent of collapse state changes
  const handleToggleCollapse = () => {
    const newCollapsedState = !isCollapsed
    setIsCollapsed(newCollapsedState)
    onCollapseChange?.(newCollapsedState)
  }
  const config = categoryConfig[category]

  // For expenses, split into regular expenses and debt repayments
  const { regularData, debtRepayments } = (() => {
    if (category === 'expense') {
      const regular = data.filter(item => !item.sourceLiabilityId)
      const debts = data.filter(item => !!item.sourceLiabilityId)
      return { regularData: regular, debtRepayments: debts }
    }
    return { regularData: data, debtRepayments: [] }
  })()

  const sortedData = sortItems(regularData, sortDirection, summarizeAmount)
  const sortedDebtRepayments = sortItems(debtRepayments, sortDirection, summarizeAmount)
  const hasData = sortedData.length > 0 || sortedDebtRepayments.length > 0

  // Calculate category total
  const baseTotal = sortedData.reduce((sum, item) => sum + summarizeAmount(item), 0)
  const debtRepaymentsTotal = sortedDebtRepayments.reduce((sum, item) => sum + summarizeAmount(item), 0)
  const investmentAssetsTotal = category === 'asset' ? investmentAssets.reduce((sum, item) => sum + (item.adjMonthlyAmt ?? item.amountMonthly ?? 0), 0) : 0
  const cpfAssetsTotal = category === 'asset' ? cpfAssets.reduce((sum, item) => sum + (item.adjMonthlyAmt ?? item.amountMonthly ?? 0), 0) : 0
  // Property totals: values for assets, mortgages for liabilities
  const propertyAssetsTotal = category === 'asset'
    ? propertySnapshots.reduce((sum, p) => sum + parseDecimal(p.propertyValue), 0)
    : 0
  const propertyMortgagesTotal = category === 'liability'
    ? propertySnapshots.reduce((sum, p) => sum + parseDecimal(p.mortgageBalance), 0)
    : 0
  const categoryTotal = baseTotal + debtRepaymentsTotal + investmentAssetsTotal + cpfAssetsTotal + propertyAssetsTotal + propertyMortgagesTotal

  const getPropertyLink = (item: TimelineItem, _index: number): PropertyLinkRecord | null => {
    if (category === 'income' || category === 'expense') return null
    const id = getItemId(item)
    if (!id) return null
    let link =
      mergedLinks[id] ??
      (category === 'asset'
        ? (assetLinks[id]?.[0] ?? null)
        : (liabilityLinks[id]?.[0] ?? null))
    if (!link && firstLink) {
      const onlyOneItemInCategory = sortedData.length === 1
      if (onlyOneItemInCategory) {
        link = firstLink
      }
    }
    return link
  }

  // Common props for section components
  const commonSectionProps = {
    summarizeAmount,
    selectedItemId,
    onSelectItem,
    onEditItem,
    onDeleteItem,
    cashAccounts,
    scenarioEvents,
    expandedScenarioItems,
    onToggleScenarioExpanded,
    showMonthlyData,
    getDisplayAmount,
    activeAnnualizationId,
    setActiveAnnualizationId,
  }

  const assetSectionProps = {
    ...commonSectionProps,
    onSetAccumulator,
    onOpenCashAccountEdit,
    onDeleteCashAccount,
    getPropertyLink,
    onOpenPropertyPlanner,
  }

  return (
    <div className={clsx(
      'flex flex-col overflow-hidden w-full min-w-0 rounded-2xl border border-white/[0.1] hover:border-white/[0.15] bg-[#0a0a0a]/60 transition-all',
      compact && !isCollapsed ? 'max-h-64' : '',
      !compact && !isCollapsed ? 'h-full' : ''
    )}>
      <CategoryCardHeader
        category={category}
        showMonthlyData={showMonthlyData}
        sortDirection={sortDirection}
        onToggleSortDirection={onToggleSortDirection}
        onAddItem={onAddItem}
        onAddInvestment={onAddInvestment}
        onAddCpf={onAddCpf}
        isCollapsed={isCollapsed}
        onToggleCollapse={handleToggleCollapse}
      />

      {/* Collapsible content */}
      <div className={clsx(
        'flex flex-col transition-all duration-200 overflow-hidden',
        isCollapsed ? 'h-0' : 'flex-1'
      )}>
        <CategoryCardTotal
          category={category}
          total={categoryTotal}
          showMonthlyData={showMonthlyData}
        />

        {/* List Items */}
        <div className="scrollbar-hide flex-1 overflow-y-auto px-3 py-2">
        {hasData || (category === 'asset' && (investmentAssets.length > 0 || cpfAssets.length > 0)) ? (
          <>
            {/* Asset items */}
            {category === 'asset' && sortedData.length > 0 && (
              groupItemsByCategory ? (
                <GroupedAssetsSection items={sortedData} {...assetSectionProps} />
              ) : (
                <FlatItemsSection
                  items={sortedData}
                  financialCategory="asset"
                  {...assetSectionProps}
                />
              )
            )}

            {/* Income items */}
            {category === 'income' && sortedData.length > 0 && (
              groupItemsByCategory ? (
                <GroupedItemsSection
                  items={sortedData}
                  financialCategory="income"
                  {...commonSectionProps}
                  onManageAllocations={onManageAllocations}
                />
              ) : (
                <FlatItemsSection
                  items={sortedData}
                  financialCategory="income"
                  {...commonSectionProps}
                  onManageAllocations={onManageAllocations}
                />
              )
            )}

            {/* Liability items */}
            {category === 'liability' && sortedData.length > 0 && (
              groupItemsByCategory ? (
                <GroupedItemsSection
                  items={sortedData}
                  financialCategory="liability"
                  {...commonSectionProps}
                  getPropertyLink={getPropertyLink}
                  onOpenPropertyPlanner={onOpenPropertyPlanner}
                />
              ) : (
                <FlatItemsSection
                  items={sortedData}
                  financialCategory="liability"
                  {...commonSectionProps}
                  getPropertyLink={getPropertyLink}
                  onOpenPropertyPlanner={onOpenPropertyPlanner}
                />
              )
            )}

            {/* Expense items */}
            {category === 'expense' && sortedData.length > 0 && (
              groupItemsByCategory ? (
                <GroupedItemsSection
                  items={sortedData}
                  financialCategory="expense"
                  {...commonSectionProps}
                />
              ) : (
                <FlatItemsSection
                  items={sortedData}
                  financialCategory="expense"
                  {...commonSectionProps}
                />
              )
            )}

            {/* Investment assets subsection */}
            {category === 'asset' && investmentAssets.length > 0 && (
              <InvestmentsAssetsSection
                items={investmentAssets}
                getDisplayAmount={getDisplayAmount}
                onEdit={onEditInvestment}
                onDelete={onDeleteInvestment}
                groupItems={groupItemsByCategory}
              />
            )}

            {/* CPF assets subsection */}
            {category === 'asset' && cpfAssets.length > 0 && (
              <CPFAssetsSection
                items={cpfAssets}
                getDisplayAmount={getDisplayAmount}
                onEdit={onEditCpf}
                onDelete={onDeleteCpf}
                groupItems={groupItemsByCategory}
              />
            )}

            {/* Property assets subsection (Real Estate) */}
            {category === 'asset' && propertySnapshots.length > 0 && (
              <PropertiesAssetsSection
                properties={propertySnapshots}
                groupItems={groupItemsByCategory}
              />
            )}

            {/* Property mortgages subsection */}
            {category === 'liability' && propertySnapshots.length > 0 && (
              <PropertiesMortgagesSection
                properties={propertySnapshots}
                groupItems={groupItemsByCategory}
              />
            )}

            {/* CPF contributions subsection */}
            {category === 'income' && cpfContributionsRaw.length > 0 && (
              <CPFContributionsSection
                cpfContributionsRaw={cpfContributionsRaw}
                groupItems={groupItemsByCategory}
              />
            )}

            {/* Investments income subsection */}
            {category === 'income' && hasInvestmentsSection && (
              <InvestmentsIncomeSection
                monthlyInvestments={monthlyInvestments}
                showMonthlyData={showMonthlyData}
                allocations={investmentAllocations}
                investments={investments}
                onEditAllocation={onEditAllocation}
                onDeleteAllocation={onDeleteAllocation}
                groupItems={groupItemsByCategory}
              />
            )}

            {/* Debt repayments subsection */}
            {category === 'expense' && sortedDebtRepayments.length > 0 && (
              <DebtRepaymentsSection
                debtRepayments={sortedDebtRepayments}
                getDisplayAmount={getDisplayAmount}
                showMonthlyData={showMonthlyData}
                onEdit={(item) => onEditItem('expense', item)}
                onDelete={(item) => onDeleteDebtRepayment?.(item)}
                groupItems={groupItemsByCategory}
              />
            )}
          </>
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center gap-1 py-6 text-center">
            <p className="text-[11px] text-slate-500">{config.emptyDescription}</p>
            <p className="text-[10px] text-slate-600">Click + to add</p>
          </div>
        )}
        </div>
      </div>
    </div>
  )
}

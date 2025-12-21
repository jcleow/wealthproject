import { useState, useRef, useEffect } from 'react'
import { Plus, ArrowDownWideNarrow, ArrowUpRight, ArrowDownRight, Wallet, BarChart3, Shield } from 'lucide-react'
import type { TimelineItem, CPFContributionResponseV2 } from '@/types/timeline'
import type { ScenarioEvent } from '@/types/scenario'
import type { CashAccount } from '@/types/financial'
import type { PropertyLinkRecord } from '@/types/property'
import type { IncomeAllocation } from '@/api/financial/incomes'
import { formatCurrency } from '@/lib/format'
import { numericStyles } from '@/lib/utils'
import { categoryConfig } from '../config'
import { getAppliedImpacts, getItemId, sortItems } from '../utils'
import { parseDecimal } from '../converters'
import { LineItem } from './LineItem'
import { CollapsibleSection, CollapsibleItem, useCollapsibleSelection } from './CollapsibleSection'
import type { FinancialCategory } from '../types'

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
  investments?: TimelineItem[]  // For resolving investment names in allocations
  onEditAllocation?: (allocation: IncomeAllocation) => void
  onDeleteAllocation?: (allocation: IncomeAllocation) => void
  // Debt repayment callbacks
  onDeleteDebtRepayment?: (item: TimelineItem) => void
  // CPF CRUD callbacks
  onEditCpf?: (item: TimelineItem) => void
  onDeleteCpf?: (id: string) => void
  // Display settings
  groupItemsByCategory?: boolean
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
}: CategoryCardProps) {
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

  // State for asset type dropdown
  const [showAssetMenu, setShowAssetMenu] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowAssetMenu(false)
      }
    }
    if (showAssetMenu) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showAssetMenu])

  // Calculate category total, including investments, CPF assets, and debt repayments
  const baseTotal = sortedData.reduce((sum, item) => sum + summarizeAmount(item), 0)
  const debtRepaymentsTotal = sortedDebtRepayments.reduce((sum, item) => sum + summarizeAmount(item), 0)
  const investmentAssetsTotal = category === 'asset' ? investmentAssets.reduce((sum, item) => sum + (item.adjMonthlyAmt ?? item.amountMonthly ?? 0), 0) : 0
  const cpfAssetsTotal = category === 'asset' ? cpfAssets.reduce((sum, item) => sum + (item.adjMonthlyAmt ?? item.amountMonthly ?? 0), 0) : 0
  const categoryTotal = baseTotal + debtRepaymentsTotal + investmentAssetsTotal + cpfAssetsTotal

  // Mock trend (you may want to calculate real trends)
  const mockTrend = category === 'asset' ? 12.5 : category === 'income' ? 5.2 : category === 'liability' ? -2.1 : 1.2
  const isPositiveTrend = mockTrend >= 0

  const IconComponent = config.icon

  // Dynamic title based on view mode
  const getTitle = () => {
    if (category === 'income') {
      return showMonthlyData ? 'Monthly Income' : 'Annual Income'
    }
    if (category === 'expense') {
      return showMonthlyData ? 'Monthly Expenses' : 'Annual Expenses'
    }
    return config.title
  }

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

  return (
    <div className={`flex flex-col overflow-hidden
h-full w-full min-w-0
rounded-2xl border border-white/[0.1] hover:border-white/[0.15]
bg-[#0a0a0a]/60
transition-all`}>
      {/* Header */}
      <div className={`flex items-center justify-between
px-4 py-2.5
border-b border-white/[0.04]`}>
        <div className="flex items-center gap-2.5">
          <div className={`rounded-lg border p-1.5 ${config.gradientBg}`}>
            <IconComponent className={`h-4 w-4 ${config.textColor}`} />
          </div>
          <h4 className="text-sm font-medium text-slate-200">{getTitle()}</h4>
        </div>
        <div className="flex items-center gap-0.5">
          <button
            type="button"
            className={`p-1.5
rounded-md
hover:bg-white/5
text-slate-500 hover:text-slate-300
transition-colors`}
            aria-label={`Sort ${sortDirection === 'desc' ? 'high to low' : 'low to high'}`}
            onClick={onToggleSortDirection}
          >
            <ArrowDownWideNarrow
              className={`h-4 w-4 ${sortDirection === 'desc' ? '' : 'rotate-180'}`}
            />
          </button>
          {/* For assets, show dropdown; for others, direct add */}
          {category === 'asset' && (onAddInvestment || onAddCpf) ? (
            <div className="relative" ref={menuRef}>
              <button
                onClick={() => setShowAssetMenu(!showAssetMenu)}
                className={`p-1.5
rounded-md
hover:bg-white/5
text-slate-500 hover:text-slate-300
transition-colors`}
                type="button"
                title="Add Item"
              >
                <Plus className="h-4 w-4" />
              </button>
              {showAssetMenu && (
                <div className={`absolute right-0 top-full z-50
w-40
mt-1 py-1
rounded-lg border border-white/10
bg-[#151515]
shadow-xl`}>
                  <button
                    onClick={() => {
                      onAddItem()
                      setShowAssetMenu(false)
                    }}
                className={`flex items-center
w-full
gap-2 px-3 py-2
hover:bg-white/5
text-left text-sm text-slate-300
transition-colors`}
                    type="button"
                  >
                    <Wallet className="h-4 w-4 text-emerald-400" />
                    Asset
                  </button>
                  {onAddInvestment && (
                    <button
                      onClick={() => {
                        onAddInvestment()
                        setShowAssetMenu(false)
                      }}
                      className={`flex items-center
w-full
gap-2 px-3 py-2
hover:bg-white/5
text-left text-sm text-slate-300
transition-colors`}
                      type="button"
                    >
                      <BarChart3 className="h-4 w-4 text-purple-400" />
                      Investment
                    </button>
                  )}
                  {onAddCpf && (
                    <button
                      onClick={() => {
                        onAddCpf()
                        setShowAssetMenu(false)
                      }}
                      className={`flex items-center
w-full
gap-2 px-3 py-2
hover:bg-white/5
text-left text-sm text-slate-300
transition-colors`}
                      type="button"
                    >
                      <Shield className="h-4 w-4 text-blue-400" />
                      CPF Account
                    </button>
                  )}
                </div>
              )}
            </div>
          ) : (
            <button
              onClick={onAddItem}
              className={`p-1.5
rounded-md
hover:bg-white/5
text-slate-500 hover:text-slate-300
transition-colors`}
              type="button"
              title="Add Item"
            >
              <Plus className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {/* Total & Trend */}
      <div className="border-b border-white/[0.04] px-4 py-2.5">
        <div className="flex items-baseline gap-1.5">
          <div className="text-2xl font-light tracking-tight text-slate-100">
            {formatCurrency(categoryTotal)}
          </div>
          {showMonthlyData && (category === 'income' || category === 'expense') && (
            <span className="text-xs text-slate-400">/mo</span>
          )}
        </div>
        <div className="mt-1 flex items-center gap-2">
          <div className={`flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${isPositiveTrend ? 'bg-emerald-500/15 text-emerald-400' : 'bg-rose-500/15 text-rose-400'}`}>
            {isPositiveTrend ? <ArrowUpRight className="h-2.5 w-2.5" /> : <ArrowDownRight className="h-2.5 w-2.5" />}
            {Math.abs(mockTrend)}%
          </div>
          <span className="text-sm text-slate-500">vs last month</span>
        </div>
      </div>

      {/* List Items */}
      <div className="scrollbar-hide flex-1 overflow-y-auto px-3 py-2">
        {hasData || (category === 'asset' && (investmentAssets.length > 0 || cpfAssets.length > 0)) ? (
          <>
            {/* For Assets */}
            {category === 'asset' && sortedData.length > 0 && (
              groupItemsByCategory ? (
                <GroupedAssetsSection
                  items={sortedData}
                  summarizeAmount={summarizeAmount}
                  selectedItemId={selectedItemId}
                  onSelectItem={onSelectItem}
                  onEditItem={onEditItem}
                  onDeleteItem={onDeleteItem}
                  onSetAccumulator={onSetAccumulator}
                  onOpenCashAccountEdit={onOpenCashAccountEdit}
                  onDeleteCashAccount={onDeleteCashAccount}
                  cashAccounts={cashAccounts}
                  scenarioEvents={scenarioEvents}
                  expandedScenarioItems={expandedScenarioItems}
                  onToggleScenarioExpanded={onToggleScenarioExpanded}
                  showMonthlyData={showMonthlyData}
                  getDisplayAmount={getDisplayAmount}
                  activeAnnualizationId={activeAnnualizationId}
                  setActiveAnnualizationId={setActiveAnnualizationId}
                  getPropertyLink={getPropertyLink}
                  onOpenPropertyPlanner={onOpenPropertyPlanner}
                />
              ) : (
                <FlatItemsSection
                  items={sortedData}
                  financialCategory="asset"
                  summarizeAmount={summarizeAmount}
                  selectedItemId={selectedItemId}
                  onSelectItem={onSelectItem}
                  onEditItem={onEditItem}
                  onDeleteItem={onDeleteItem}
                  onSetAccumulator={onSetAccumulator}
                  onOpenCashAccountEdit={onOpenCashAccountEdit}
                  onDeleteCashAccount={onDeleteCashAccount}
                  cashAccounts={cashAccounts}
                  scenarioEvents={scenarioEvents}
                  expandedScenarioItems={expandedScenarioItems}
                  onToggleScenarioExpanded={onToggleScenarioExpanded}
                  showMonthlyData={showMonthlyData}
                  getDisplayAmount={getDisplayAmount}
                  activeAnnualizationId={activeAnnualizationId}
                  setActiveAnnualizationId={setActiveAnnualizationId}
                  getPropertyLink={getPropertyLink}
                  onOpenPropertyPlanner={onOpenPropertyPlanner}
                />
              )
            )}

            {/* For Income */}
            {category === 'income' && sortedData.length > 0 && (
              groupItemsByCategory ? (
                <GroupedItemsSection
                  items={sortedData}
                  financialCategory="income"
                  summarizeAmount={summarizeAmount}
                  selectedItemId={selectedItemId}
                  onSelectItem={onSelectItem}
                  onEditItem={onEditItem}
                  onDeleteItem={onDeleteItem}
                  onManageAllocations={onManageAllocations}
                  cashAccounts={cashAccounts}
                  scenarioEvents={scenarioEvents}
                  expandedScenarioItems={expandedScenarioItems}
                  onToggleScenarioExpanded={onToggleScenarioExpanded}
                  showMonthlyData={showMonthlyData}
                  getDisplayAmount={getDisplayAmount}
                  activeAnnualizationId={activeAnnualizationId}
                  setActiveAnnualizationId={setActiveAnnualizationId}
                />
              ) : (
                <FlatItemsSection
                  items={sortedData}
                  financialCategory="income"
                  summarizeAmount={summarizeAmount}
                  selectedItemId={selectedItemId}
                  onSelectItem={onSelectItem}
                  onEditItem={onEditItem}
                  onDeleteItem={onDeleteItem}
                  onManageAllocations={onManageAllocations}
                  cashAccounts={cashAccounts}
                  scenarioEvents={scenarioEvents}
                  expandedScenarioItems={expandedScenarioItems}
                  onToggleScenarioExpanded={onToggleScenarioExpanded}
                  showMonthlyData={showMonthlyData}
                  getDisplayAmount={getDisplayAmount}
                  activeAnnualizationId={activeAnnualizationId}
                  setActiveAnnualizationId={setActiveAnnualizationId}
                />
              )
            )}

            {/* For Liabilities */}
            {category === 'liability' && sortedData.length > 0 && (
              groupItemsByCategory ? (
                <GroupedItemsSection
                  items={sortedData}
                  financialCategory="liability"
                  summarizeAmount={summarizeAmount}
                  selectedItemId={selectedItemId}
                  onSelectItem={onSelectItem}
                  onEditItem={onEditItem}
                  onDeleteItem={onDeleteItem}
                  cashAccounts={cashAccounts}
                  scenarioEvents={scenarioEvents}
                  expandedScenarioItems={expandedScenarioItems}
                  onToggleScenarioExpanded={onToggleScenarioExpanded}
                  showMonthlyData={showMonthlyData}
                  getDisplayAmount={getDisplayAmount}
                  activeAnnualizationId={activeAnnualizationId}
                  setActiveAnnualizationId={setActiveAnnualizationId}
                  getPropertyLink={getPropertyLink}
                  onOpenPropertyPlanner={onOpenPropertyPlanner}
                />
              ) : (
                <FlatItemsSection
                  items={sortedData}
                  financialCategory="liability"
                  summarizeAmount={summarizeAmount}
                  selectedItemId={selectedItemId}
                  onSelectItem={onSelectItem}
                  onEditItem={onEditItem}
                  onDeleteItem={onDeleteItem}
                  cashAccounts={cashAccounts}
                  scenarioEvents={scenarioEvents}
                  expandedScenarioItems={expandedScenarioItems}
                  onToggleScenarioExpanded={onToggleScenarioExpanded}
                  showMonthlyData={showMonthlyData}
                  getDisplayAmount={getDisplayAmount}
                  activeAnnualizationId={activeAnnualizationId}
                  setActiveAnnualizationId={setActiveAnnualizationId}
                  getPropertyLink={getPropertyLink}
                  onOpenPropertyPlanner={onOpenPropertyPlanner}
                />
              )
            )}

            {/* For Expenses (excluding debt repayments which have their own section) */}
            {category === 'expense' && sortedData.length > 0 && (
              groupItemsByCategory ? (
                <GroupedItemsSection
                  items={sortedData}
                  financialCategory="expense"
                  summarizeAmount={summarizeAmount}
                  selectedItemId={selectedItemId}
                  onSelectItem={onSelectItem}
                  onEditItem={onEditItem}
                  onDeleteItem={onDeleteItem}
                  cashAccounts={cashAccounts}
                  scenarioEvents={scenarioEvents}
                  expandedScenarioItems={expandedScenarioItems}
                  onToggleScenarioExpanded={onToggleScenarioExpanded}
                  showMonthlyData={showMonthlyData}
                  getDisplayAmount={getDisplayAmount}
                  activeAnnualizationId={activeAnnualizationId}
                  setActiveAnnualizationId={setActiveAnnualizationId}
                />
              ) : (
                <FlatItemsSection
                  items={sortedData}
                  financialCategory="expense"
                  summarizeAmount={summarizeAmount}
                  selectedItemId={selectedItemId}
                  onSelectItem={onSelectItem}
                  onEditItem={onEditItem}
                  onDeleteItem={onDeleteItem}
                  cashAccounts={cashAccounts}
                  scenarioEvents={scenarioEvents}
                  expandedScenarioItems={expandedScenarioItems}
                  onToggleScenarioExpanded={onToggleScenarioExpanded}
                  showMonthlyData={showMonthlyData}
                  getDisplayAmount={getDisplayAmount}
                  activeAnnualizationId={activeAnnualizationId}
                  setActiveAnnualizationId={setActiveAnnualizationId}
                />
              )
            )}

            {/* Investments Sub-section for Assets (V2 only) */}
            {category === 'asset' && investmentAssets.length > 0 && (
              <InvestmentsAssetsSection
                investmentAssets={investmentAssets}
                getDisplayAmount={getDisplayAmount}
                onEdit={onEditInvestment}
                onDelete={onDeleteInvestment}
                groupItems={groupItemsByCategory}
              />
            )}

            {/* CPF Sub-section for Assets (V2 only) */}
            {category === 'asset' && cpfAssets.length > 0 && (
              <CPFAssetsSection
                cpfAssets={cpfAssets}
                getDisplayAmount={getDisplayAmount}
                onEdit={onEditCpf}
                onDelete={onDeleteCpf}
                groupItems={groupItemsByCategory}
              />
            )}

            {/* CPF Contributions Sub-section for Income (V2 only) */}
            {category === 'income' && cpfContributionsRaw.length > 0 && (
              <CPFContributionsSection cpfContributionsRaw={cpfContributionsRaw} groupItems={groupItemsByCategory} />
            )}

            {/* Investments Sub-section (V2 only) */}
            {category === 'income' && hasInvestmentsSection && (
              <InvestmentsSection
                monthlyInvestments={monthlyInvestments}
                showMonthlyData={showMonthlyData}
                allocations={investmentAllocations}
                investments={investments}
                onEditAllocation={onEditAllocation}
                onDeleteAllocation={onDeleteAllocation}
                groupItems={groupItemsByCategory}
              />
            )}

            {/* Debt Repayments Sub-section for Expenses */}
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
          <div className={`flex flex-1 flex-col items-center justify-center
gap-1 py-6
text-center`}>
            <p className="text-[11px] text-slate-500">{config.emptyDescription}</p>
            <p className="text-[10px] text-slate-600">
              Click + to add
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

// Sub-components for V2 sections

// Helper to format category names for display
function formatCategoryName(category: string): string {
  // Map common category values to friendly display names
  const categoryMap: Record<string, string> = {
    'bank_account': 'Bank Accounts',
    'bank': 'Bank Accounts',
    'savings': 'Savings',
    'cash': 'Cash',
    'property': 'Property',
    'real_estate': 'Real Estate',
    'vehicle': 'Vehicles',
    'other': 'Other Assets',
    'investment': 'Investments',
    'cpf': 'CPF',
    'stocks': 'Stocks',
    'bonds': 'Bonds',
    'crypto': 'Crypto',
  }

  // Check if we have a mapping, otherwise format the category string
  if (categoryMap[category.toLowerCase()]) {
    return categoryMap[category.toLowerCase()]
  }

  // Convert snake_case or camelCase to Title Case
  return category
    .replace(/_/g, ' ')
    .replace(/([A-Z])/g, ' $1')
    .trim()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ')
}

// Generic Grouped Items Section - groups items by their category field
// Works for all financial categories (assets, liabilities, income, expenses)
interface GroupedItemsSectionProps {
  items: TimelineItem[]
  financialCategory: FinancialCategory
  summarizeAmount: (item: TimelineItem) => number
  selectedItemId: string | null
  onSelectItem: (itemId: string | null) => void
  onEditItem: (category: FinancialCategory, item: TimelineItem) => void
  onDeleteItem: (category: FinancialCategory, id: string) => void
  onSetAccumulator?: (id: string) => void
  onOpenCashAccountEdit?: (cashAccount: CashAccount) => void
  onDeleteCashAccount?: (id: string) => void
  onManageAllocations?: (item: TimelineItem) => void
  cashAccounts: CashAccount[]
  scenarioEvents: ScenarioEvent[]
  expandedScenarioItems: Set<string>
  onToggleScenarioExpanded: (itemId: string) => void
  showMonthlyData: boolean
  getDisplayAmount: (item: TimelineItem) => number
  activeAnnualizationId: string | null
  setActiveAnnualizationId: (id: string | null) => void
  getPropertyLink?: (item: TimelineItem, index: number) => PropertyLinkRecord | null
  onOpenPropertyPlanner?: (link: PropertyLinkRecord) => void
}

function GroupedItemsSection({
  items,
  financialCategory,
  summarizeAmount,
  selectedItemId,
  onSelectItem,
  onEditItem,
  onDeleteItem,
  onSetAccumulator,
  onOpenCashAccountEdit,
  onDeleteCashAccount,
  onManageAllocations,
  cashAccounts,
  scenarioEvents,
  expandedScenarioItems,
  onToggleScenarioExpanded,
  showMonthlyData,
  getDisplayAmount,
  activeAnnualizationId,
  setActiveAnnualizationId,
  getPropertyLink,
  onOpenPropertyPlanner,
}: GroupedItemsSectionProps) {
  // Group items by their category field
  const groupedItems = items.reduce((acc, item) => {
    const cat = item.category || 'Other'
    if (!acc[cat]) {
      acc[cat] = []
    }
    acc[cat].push(item)
    return acc
  }, {} as Record<string, TimelineItem[]>)

  // Sort categories alphabetically, but put "Other" at the end
  const sortedCategories = Object.keys(groupedItems).sort((a, b) => {
    if (a.toLowerCase() === 'other') return 1
    if (b.toLowerCase() === 'other') return -1
    return a.localeCompare(b)
  })

  return (
    <>
      {sortedCategories.map((cat) => {
        const categoryItems = groupedItems[cat]
        const categoryTotal = categoryItems.reduce((sum, item) => sum + summarizeAmount(item), 0)

        // Hide categories with $0 total
        if (categoryTotal === 0) {
          return null
        }

        return (
          <CollapsibleSection key={cat} title={formatCategoryName(cat)} total={categoryTotal}>
            {categoryItems.map((item, index) => {
              const itemId = getItemId(item) || `${financialCategory}-${cat}-${index}`
              const scenarioImpacts = getAppliedImpacts(item, financialCategory, scenarioEvents)
              const isExpanded = expandedScenarioItems.has(itemId)
              const isSelected = selectedItemId === itemId

              return (
                <LineItem
                  key={itemId}
                  item={item}
                  category={financialCategory}
                  index={index}
                  isSelected={isSelected}
                  onSelect={onSelectItem}
                  onEdit={onEditItem}
                  onDelete={onDeleteItem}
                  onSetAccumulator={onSetAccumulator}
                  onOpenCashAccountEdit={onOpenCashAccountEdit}
                  onDeleteCashAccount={onDeleteCashAccount}
                  onManageAllocations={financialCategory === 'income' ? onManageAllocations : undefined}
                  cashAccounts={cashAccounts}
                  scenarioImpacts={scenarioImpacts}
                  isExpanded={isExpanded}
                  onToggleExpand={onToggleScenarioExpanded}
                  showMonthlyData={showMonthlyData}
                  getDisplayAmount={getDisplayAmount}
                  activeAnnualizationId={activeAnnualizationId}
                  setActiveAnnualizationId={setActiveAnnualizationId}
                  propertyLink={getPropertyLink?.(item, index) ?? null}
                  onOpenPropertyPlanner={onOpenPropertyPlanner}
                />
              )
            })}
          </CollapsibleSection>
        )
      })}
    </>
  )
}

// Grouped Assets Section - wrapper for assets with asset-specific props
interface GroupedAssetsSectionProps {
  items: TimelineItem[]
  summarizeAmount: (item: TimelineItem) => number
  selectedItemId: string | null
  onSelectItem: (itemId: string | null) => void
  onEditItem: (category: FinancialCategory, item: TimelineItem) => void
  onDeleteItem: (category: FinancialCategory, id: string) => void
  onSetAccumulator?: (id: string) => void
  onOpenCashAccountEdit?: (cashAccount: CashAccount) => void
  onDeleteCashAccount?: (id: string) => void
  cashAccounts: CashAccount[]
  scenarioEvents: ScenarioEvent[]
  expandedScenarioItems: Set<string>
  onToggleScenarioExpanded: (itemId: string) => void
  showMonthlyData: boolean
  getDisplayAmount: (item: TimelineItem) => number
  activeAnnualizationId: string | null
  setActiveAnnualizationId: (id: string | null) => void
  getPropertyLink: (item: TimelineItem, index: number) => PropertyLinkRecord | null
  onOpenPropertyPlanner?: (link: PropertyLinkRecord) => void
}

function GroupedAssetsSection(props: GroupedAssetsSectionProps) {
  return (
    <GroupedItemsSection
      {...props}
      financialCategory="asset"
    />
  )
}

// Flat items section - renders items without grouping
interface FlatItemsSectionProps {
  items: TimelineItem[]
  financialCategory: FinancialCategory
  summarizeAmount: (item: TimelineItem) => number
  selectedItemId: string | null
  onSelectItem: (itemId: string | null) => void
  onEditItem: (category: FinancialCategory, item: TimelineItem) => void
  onDeleteItem: (category: FinancialCategory, id: string) => void
  onSetAccumulator?: (id: string) => void
  onOpenCashAccountEdit?: (cashAccount: CashAccount) => void
  onDeleteCashAccount?: (id: string) => void
  onManageAllocations?: (item: TimelineItem) => void
  cashAccounts: CashAccount[]
  scenarioEvents: ScenarioEvent[]
  expandedScenarioItems: Set<string>
  onToggleScenarioExpanded: (itemId: string) => void
  showMonthlyData: boolean
  getDisplayAmount: (item: TimelineItem) => number
  activeAnnualizationId: string | null
  setActiveAnnualizationId: (id: string | null) => void
  getPropertyLink?: (item: TimelineItem, index: number) => PropertyLinkRecord | null
  onOpenPropertyPlanner?: (link: PropertyLinkRecord) => void
}

function FlatItemsSection({
  items,
  financialCategory,
  selectedItemId,
  onSelectItem,
  onEditItem,
  onDeleteItem,
  onSetAccumulator,
  onOpenCashAccountEdit,
  onDeleteCashAccount,
  onManageAllocations,
  cashAccounts,
  scenarioEvents,
  expandedScenarioItems,
  onToggleScenarioExpanded,
  showMonthlyData,
  getDisplayAmount,
  activeAnnualizationId,
  setActiveAnnualizationId,
  getPropertyLink,
  onOpenPropertyPlanner,
}: FlatItemsSectionProps) {
  return (
    <>
      {items.map((item, index) => {
        const itemId = getItemId(item) || `${financialCategory}-${index}`
        const scenarioImpacts = getAppliedImpacts(item, financialCategory, scenarioEvents)
        const isExpanded = expandedScenarioItems.has(itemId)
        const isSelected = selectedItemId === itemId

        return (
          <LineItem
            key={itemId}
            item={item}
            category={financialCategory}
            index={index}
            isSelected={isSelected}
            onSelect={onSelectItem}
            onEdit={onEditItem}
            onDelete={onDeleteItem}
            onSetAccumulator={onSetAccumulator}
            onOpenCashAccountEdit={onOpenCashAccountEdit}
            onDeleteCashAccount={onDeleteCashAccount}
            onManageAllocations={financialCategory === 'income' ? onManageAllocations : undefined}
            cashAccounts={cashAccounts}
            scenarioImpacts={scenarioImpacts}
            isExpanded={isExpanded}
            onToggleExpand={onToggleScenarioExpanded}
            showMonthlyData={showMonthlyData}
            getDisplayAmount={getDisplayAmount}
            activeAnnualizationId={activeAnnualizationId}
            setActiveAnnualizationId={setActiveAnnualizationId}
            propertyLink={getPropertyLink?.(item, index) ?? null}
            onOpenPropertyPlanner={onOpenPropertyPlanner}
          />
        )
      })}
    </>
  )
}

interface InvestmentsAssetsSectionProps {
  investmentAssets: TimelineItem[]
  getDisplayAmount: (item: TimelineItem) => number
  onEdit?: (item: TimelineItem) => void
  onDelete?: (id: string) => void
  groupItems?: boolean
}

function InvestmentsAssetsSection({ investmentAssets, getDisplayAmount, onEdit, onDelete, groupItems = true }: InvestmentsAssetsSectionProps) {
  const total = investmentAssets.reduce((sum, item) => sum + (item.adjMonthlyAmt ?? item.amountMonthly ?? 0), 0)
  const { selectedId, handleSelect, sectionRef } = useCollapsibleSelection()

  const renderItems = () => investmentAssets.map((item, index) => {
    const itemId = item.itemId || `investment-asset-${index}`
    return (
      <CollapsibleItem
        key={itemId}
        id={itemId}
        name={item.name}
        amount={getDisplayAmount(item)}
        isSelected={selectedId === itemId}
        onSelect={handleSelect}
        onEdit={onEdit ? () => onEdit(item) : undefined}
        onDelete={onDelete && item.itemId ? () => onDelete(item.itemId!) : undefined}
      />
    )
  })

  if (!groupItems) {
    return <div ref={sectionRef}>{renderItems()}</div>
  }

  return (
    <div ref={sectionRef}>
      <CollapsibleSection title="Investments" total={total}>
        {renderItems()}
      </CollapsibleSection>
    </div>
  )
}

interface CPFAssetsSectionProps {
  cpfAssets: TimelineItem[]
  getDisplayAmount: (item: TimelineItem) => number
  onEdit?: (item: TimelineItem) => void
  onDelete?: (id: string) => void
  groupItems?: boolean
}

function CPFAssetsSection({ cpfAssets, getDisplayAmount, onEdit, onDelete, groupItems = true }: CPFAssetsSectionProps) {
  const total = cpfAssets.reduce((sum, item) => sum + (item.adjMonthlyAmt ?? item.amountMonthly ?? 0), 0)
  const { selectedId, handleSelect, sectionRef } = useCollapsibleSelection()

  const renderItems = () => cpfAssets.map((item, index) => {
    const itemId = item.itemId || `cpf-asset-${index}`
    return (
      <CollapsibleItem
        key={itemId}
        id={itemId}
        name={item.name}
        amount={getDisplayAmount(item)}
        isSelected={selectedId === itemId}
        onSelect={handleSelect}
        onEdit={onEdit ? () => onEdit(item) : undefined}
        onDelete={onDelete && item.itemId ? () => onDelete(item.itemId!) : undefined}
      />
    )
  })

  if (!groupItems) {
    return <div ref={sectionRef}>{renderItems()}</div>
  }

  return (
    <div ref={sectionRef}>
      <CollapsibleSection title="CPF Accounts" total={total}>
        {renderItems()}
      </CollapsibleSection>
    </div>
  )
}

interface CPFContributionsSectionProps {
  cpfContributionsRaw: CPFContributionResponseV2[]
  groupItems?: boolean
}

function CPFContributionsSection({ cpfContributionsRaw, groupItems = true }: CPFContributionsSectionProps) {
  const total = cpfContributionsRaw.reduce((sum, item) => sum + parseDecimal(item.totalContribution), 0)

  const renderItems = () => cpfContributionsRaw.map((item, index) => (
    <div key={item.id || `cpf-contrib-${index}`}>
      <div className="flex items-center justify-between px-2 py-1.5 rounded-lg hover:bg-white/[0.04] transition-colors">
        <span className="truncate text-sm text-slate-300">Employee - {item.name.replace('CPF Contribution - ', '')}</span>
        <span className={numericStyles.base}>
          ({formatCurrency(parseDecimal(item.employeeContribution))})
          <span className="ml-1 text-xs text-slate-400">/mo</span>
        </span>
      </div>
      <div className="flex items-center justify-between px-2 py-1.5 rounded-lg hover:bg-white/[0.04] transition-colors">
        <span className="truncate text-sm text-slate-300">Employer - {item.name.replace('CPF Contribution - ', '')}</span>
        <span className={numericStyles.base}>
          {formatCurrency(parseDecimal(item.employerContribution))}
          <span className="ml-1 text-xs text-slate-400">/mo</span>
        </span>
      </div>
    </div>
  ))

  if (!groupItems) {
    return <>{renderItems()}</>
  }

  return (
    <CollapsibleSection title="CPF Contributions" total={total}>
      {renderItems()}
    </CollapsibleSection>
  )
}

interface InvestmentsSectionProps {
  monthlyInvestments: number
  showMonthlyData: boolean
  allocations: IncomeAllocation[]
  investments: TimelineItem[]
  onEditAllocation?: (allocation: IncomeAllocation) => void
  onDeleteAllocation?: (allocation: IncomeAllocation) => void
  groupItems?: boolean
}

function InvestmentsSection({
  monthlyInvestments,
  showMonthlyData,
  allocations,
  investments,
  onEditAllocation,
  onDeleteAllocation,
  groupItems = true,
}: InvestmentsSectionProps) {
  const investmentAllocations = allocations.filter((a) => a.targetInvestmentId)
  const { selectedId, handleSelect, sectionRef } = useCollapsibleSelection()
  const displayAmount = showMonthlyData ? monthlyInvestments : monthlyInvestments * 12

  const getInvestmentName = (investmentId: string): string => {
    const investment = investments.find((i) => getItemId(i) === investmentId)
    return investment?.name ?? 'Unknown Investment'
  }

  const getAllocationAmount = (allocation: IncomeAllocation): number => {
    // allocationValue is stored as a number
    return typeof allocation.allocationValue === 'number'
      ? allocation.allocationValue
      : parseFloat(allocation.allocationValue) || 0
  }

  const renderItems = () => investmentAllocations.length > 0 ? (
    investmentAllocations.map((allocation) => (
      <CollapsibleItem
        key={allocation.id}
        id={allocation.id}
        name={getInvestmentName(allocation.targetInvestmentId!)}
        amount={getAllocationAmount(allocation)}
        amountSuffix={allocation.allocationType === 'fixed' ? '/mo' : (allocation.allocationType === 'percentage' ? '%' : undefined)}
        isSelected={selectedId === allocation.id}
        onSelect={handleSelect}
        onEdit={onEditAllocation ? () => onEditAllocation(allocation) : undefined}
        onDelete={onDeleteAllocation ? () => onDeleteAllocation(allocation) : undefined}
      />
    ))
  ) : (
    <div className="flex items-center justify-between px-2 py-1.5 rounded-lg hover:bg-white/[0.04] transition-colors">
      <span className="truncate text-sm text-slate-300">Allocated to investments</span>
      <span className={numericStyles.base}>
        {formatCurrency(displayAmount)}
        <span className="ml-1 text-xs text-slate-400">{showMonthlyData ? '/mo' : '/yr'}</span>
      </span>
    </div>
  )

  if (!groupItems) {
    return <div ref={sectionRef}>{renderItems()}</div>
  }

  return (
    <div ref={sectionRef}>
      <CollapsibleSection
        title="Investments"
        total={displayAmount}
        totalSuffix={showMonthlyData ? '/mo' : '/yr'}
      >
        {renderItems()}
      </CollapsibleSection>
    </div>
  )
}

interface DebtRepaymentsSectionProps {
  debtRepayments: TimelineItem[]
  getDisplayAmount: (item: TimelineItem) => number
  showMonthlyData: boolean
  onEdit?: (item: TimelineItem) => void
  onDelete?: (item: TimelineItem) => void
  groupItems?: boolean
}

function DebtRepaymentsSection({ debtRepayments, getDisplayAmount, showMonthlyData, onEdit, onDelete, groupItems = true }: DebtRepaymentsSectionProps) {
  const total = debtRepayments.reduce((sum, item) => sum + getDisplayAmount(item), 0)
  const { selectedId, handleSelect, sectionRef } = useCollapsibleSelection()

  const renderItems = () => debtRepayments.map((item, index) => {
    const itemId = item.itemId || `debt-repayment-${index}`
    return (
      <CollapsibleItem
        key={itemId}
        id={itemId}
        name={item.name}
        amount={getDisplayAmount(item)}
        amountSuffix={showMonthlyData ? '/mo' : undefined}
        isSelected={selectedId === itemId}
        onSelect={handleSelect}
        onEdit={onEdit ? () => onEdit(item) : undefined}
        onDelete={onDelete && item.itemId ? () => onDelete(item) : undefined}
      />
    )
  })

  if (!groupItems) {
    return <div ref={sectionRef}>{renderItems()}</div>
  }

  return (
    <div ref={sectionRef}>
      <CollapsibleSection
        title="Debt Repayments"
        total={total}
        totalSuffix={showMonthlyData ? '/mo' : undefined}
      >
        {renderItems()}
      </CollapsibleSection>
    </div>
  )
}

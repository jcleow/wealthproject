import { Plus, ArrowDownWideNarrow, ArrowUpRight, ArrowDownRight } from 'lucide-react'
import type { TimelineItem, CPFContributionResponseV2 } from '@/types/timeline'
import type { ScenarioEvent } from '@/types/scenario'
import type { CashAccount } from '@/types/financial'
import type { PropertyLinkRecord } from '@/types/property'
import { formatCurrency } from '@/lib/format'
import { categoryConfig } from '../config'
import { getAppliedImpacts, getItemId, sortItems } from '../utils'
import { parseDecimal } from '../converters'
import { LineItem } from './LineItem'
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
}: CategoryCardProps) {
  const config = categoryConfig[category]
  const sortedData = sortItems(data, sortDirection, summarizeAmount)
  const hasData = sortedData.length > 0

  // Calculate category total, including investments and CPF assets for the asset category
  const baseTotal = sortedData.reduce((sum, item) => sum + summarizeAmount(item), 0)
  const investmentAssetsTotal = category === 'asset' ? investmentAssets.reduce((sum, item) => sum + (item.adjMonthlyAmt ?? item.amountMonthly ?? 0), 0) : 0
  const cpfAssetsTotal = category === 'asset' ? cpfAssets.reduce((sum, item) => sum + (item.adjMonthlyAmt ?? item.amountMonthly ?? 0), 0) : 0
  const categoryTotal = baseTotal + investmentAssetsTotal + cpfAssetsTotal

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
    <div className="flex h-full w-full min-w-0 flex-col overflow-hidden rounded-2xl border border-white/[0.1] bg-[#0a0a0a]/60 transition-all hover:border-white/[0.15]">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-white/[0.04] px-4 py-2.5">
        <div className="flex items-center gap-2.5">
          <div className={`rounded-lg border p-1.5 ${config.gradientBg}`}>
            <IconComponent className={`h-4 w-4 ${config.textColor}`} />
          </div>
          <h4 className="text-sm font-medium text-slate-200">{getTitle()}</h4>
        </div>
        <div className="flex items-center gap-0.5">
          <button
            type="button"
            className="rounded-md p-1.5 text-slate-500 transition-colors hover:bg-white/5 hover:text-slate-300"
            aria-label={`Sort ${sortDirection === 'desc' ? 'high to low' : 'low to high'}`}
            onClick={onToggleSortDirection}
          >
            <ArrowDownWideNarrow
              className={`h-4 w-4 ${sortDirection === 'desc' ? '' : 'rotate-180'}`}
            />
          </button>
          <button
            onClick={onAddItem}
            className="rounded-md p-1.5 text-slate-500 transition-colors hover:bg-white/5 hover:text-slate-300"
            type="button"
            title="Add Item"
          >
            <Plus className="h-4 w-4" />
          </button>
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
          <span className="text-[10px] text-slate-500">vs last month</span>
        </div>
      </div>

      {/* List Items */}
      <div className="scrollbar-hide flex-1 overflow-y-auto px-3 py-2">
        {hasData ? (
          <>
            {sortedData.map((item, index) => {
              const itemId = getItemId(item) || `${category}-${index}`
              const scenarioImpacts = getAppliedImpacts(item, category, scenarioEvents)
              const isExpanded = expandedScenarioItems.has(itemId)
              const isSelected = selectedItemId === itemId

              return (
                <LineItem
                  key={itemId}
                  item={item}
                  category={category}
                  index={index}
                  isSelected={isSelected}
                  onSelect={onSelectItem}
                  onEdit={onEditItem}
                  onDelete={onDeleteItem}
                  onSetAccumulator={onSetAccumulator}
                  onOpenCashAccountEdit={onOpenCashAccountEdit}
                  onDeleteCashAccount={onDeleteCashAccount}
                  cashAccounts={cashAccounts}
                  scenarioImpacts={scenarioImpacts}
                  isExpanded={isExpanded}
                  onToggleExpand={onToggleScenarioExpanded}
                  showMonthlyData={showMonthlyData}
                  getDisplayAmount={getDisplayAmount}
                  activeAnnualizationId={activeAnnualizationId}
                  setActiveAnnualizationId={setActiveAnnualizationId}
                  propertyLink={getPropertyLink(item, index)}
                  onOpenPropertyPlanner={onOpenPropertyPlanner}
                />
              )
            })}

            {/* Investments Sub-section for Assets (V2 only) */}
            {category === 'asset' && investmentAssets.length > 0 && (
              <InvestmentsAssetsSection investmentAssets={investmentAssets} getDisplayAmount={getDisplayAmount} />
            )}

            {/* CPF Sub-section for Assets (V2 only) */}
            {category === 'asset' && cpfAssets.length > 0 && (
              <CPFAssetsSection cpfAssets={cpfAssets} getDisplayAmount={getDisplayAmount} />
            )}

            {/* CPF Contributions Sub-section for Income (V2 only) */}
            {category === 'income' && cpfContributionsRaw.length > 0 && (
              <CPFContributionsSection cpfContributionsRaw={cpfContributionsRaw} />
            )}

            {/* Investments Sub-section (V2 only) */}
            {category === 'income' && hasInvestmentsSection && (
              <InvestmentsSection
                monthlyInvestments={monthlyInvestments}
                showMonthlyData={showMonthlyData}
              />
            )}
          </>
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center gap-1 py-6 text-center">
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

interface InvestmentsAssetsSectionProps {
  investmentAssets: TimelineItem[]
  getDisplayAmount: (item: TimelineItem) => number
}

function InvestmentsAssetsSection({ investmentAssets, getDisplayAmount }: InvestmentsAssetsSectionProps) {
  const total = investmentAssets.reduce((sum, item) => sum + (item.adjMonthlyAmt ?? item.amountMonthly ?? 0), 0)

  return (
    <div className="mt-3 border-t border-white/[0.06] pt-3">
      <div className="mb-2 flex items-center gap-2 px-2">
        <span className="text-[10px] font-medium uppercase tracking-wider text-slate-500">Investments</span>
        <span className="text-[10px] text-slate-600">({formatCurrency(total)})</span>
      </div>
      {investmentAssets.map((item, index) => (
        <div
          key={item.itemId || `investment-asset-${index}`}
          className="group/item relative flex cursor-default items-center justify-between rounded-lg px-2 py-2 transition-colors hover:bg-white/[0.04]"
        >
          <span className="truncate text-sm text-slate-300">{item.name}</span>
          <span className="text-sm font-medium text-slate-200">
            {formatCurrency(getDisplayAmount(item))}
          </span>
        </div>
      ))}
    </div>
  )
}

interface CPFAssetsSectionProps {
  cpfAssets: TimelineItem[]
  getDisplayAmount: (item: TimelineItem) => number
}

function CPFAssetsSection({ cpfAssets, getDisplayAmount }: CPFAssetsSectionProps) {
  const total = cpfAssets.reduce((sum, item) => sum + (item.adjMonthlyAmt ?? item.amountMonthly ?? 0), 0)

  return (
    <div className="mt-3 border-t border-white/[0.06] pt-3">
      <div className="mb-2 flex items-center gap-2 px-2">
        <span className="text-[10px] font-medium uppercase tracking-wider text-slate-500">CPF Accounts</span>
        <span className="text-[10px] text-slate-600">({formatCurrency(total)})</span>
      </div>
      {cpfAssets.map((item, index) => (
        <div
          key={item.itemId || `cpf-asset-${index}`}
          className="group/item relative flex cursor-default items-center justify-between rounded-lg px-2 py-2 transition-colors hover:bg-white/[0.04]"
        >
          <span className="truncate text-sm text-slate-300">{item.name}</span>
          <span className="text-sm font-medium text-slate-200">
            {formatCurrency(getDisplayAmount(item))}
          </span>
        </div>
      ))}
    </div>
  )
}

interface CPFContributionsSectionProps {
  cpfContributionsRaw: CPFContributionResponseV2[]
}

function CPFContributionsSection({ cpfContributionsRaw }: CPFContributionsSectionProps) {
  const total = cpfContributionsRaw.reduce((sum, item) => sum + parseDecimal(item.totalContribution), 0)

  return (
    <div className="mt-3 border-t border-white/[0.06] pt-3">
      <div className="mb-2 flex items-center gap-2 px-2">
        <span className="text-[10px] font-medium uppercase tracking-wider text-slate-500">CPF Contributions</span>
        <span className="text-[10px] text-slate-600">({formatCurrency(total)})</span>
      </div>
      {cpfContributionsRaw.map((item, index) => (
        <div key={item.id || `cpf-contrib-${index}`}>
          <div className="flex items-center justify-between rounded-lg px-2 py-1.5 transition-colors hover:bg-white/[0.04]">
            <span className="truncate text-sm text-slate-300">Employee Contribution - {item.name.replace('CPF Contribution - ', '')}</span>
            <span className="font-mono text-sm text-slate-300">
              ({formatCurrency(parseDecimal(item.employeeContribution))})
              <span className="ml-1 text-xs text-slate-400">/mo</span>
            </span>
          </div>
          <div className="flex items-center justify-between rounded-lg px-2 py-1.5 transition-colors hover:bg-white/[0.04]">
            <span className="truncate text-sm text-slate-300">Employer Contribution - {item.name.replace('CPF Contribution - ', '')}</span>
            <span className="font-mono text-sm text-slate-300">
              {formatCurrency(parseDecimal(item.employerContribution))}
              <span className="ml-1 text-xs text-slate-400">/mo</span>
            </span>
          </div>
        </div>
      ))}
    </div>
  )
}

interface InvestmentsSectionProps {
  monthlyInvestments: number
  showMonthlyData: boolean
}

function InvestmentsSection({ monthlyInvestments, showMonthlyData }: InvestmentsSectionProps) {
  return (
    <div className="mt-3 border-t border-white/[0.06] pt-3">
      <div className="mb-2 flex items-center gap-2 px-2">
        <span className="text-[10px] font-medium uppercase tracking-wider text-slate-500">Investments</span>
        <span className="text-[10px] text-slate-600">
          ({formatCurrency(showMonthlyData ? monthlyInvestments : monthlyInvestments * 12)})
          <span className="ml-1 text-[10px] text-slate-500">{showMonthlyData ? '/mo' : '/yr'}</span>
        </span>
      </div>
      <div className="flex items-center justify-between rounded-lg px-2 py-1.5 transition-colors hover:bg-white/[0.04]">
        <span className="truncate text-sm text-slate-300">Allocated to investments</span>
        <span className="font-mono text-sm text-slate-300">
          {formatCurrency(showMonthlyData ? monthlyInvestments : monthlyInvestments * 12)}
          <span className="ml-1 text-xs text-slate-400">{showMonthlyData ? '/mo' : '/yr'}</span>
        </span>
      </div>
    </div>
  )
}

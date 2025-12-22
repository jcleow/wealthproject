import { Pencil, Trash2, Home, Info, ChevronRight, Star, GitBranch } from 'lucide-react'
import * as Tooltip from '@radix-ui/react-tooltip'
import type { TimelineItem } from '@/types/timeline'
import type { CashAccount } from '@/types/financial'
import type { PropertyLinkRecord } from '@/types/property'
import { formatCurrency } from '@/lib/format'
import { numericStyles } from '@/lib/utils'
import { getIconByName, getItemId, getAnnualizationLabel } from '../utils'
import type { AppliedImpact, FinancialCategory } from '../types'

interface LineItemProps {
  item: TimelineItem
  category: FinancialCategory
  index: number
  isSelected: boolean
  onSelect: (itemId: string | null) => void
  onEdit: (category: FinancialCategory, item: TimelineItem) => void
  onDelete: (category: FinancialCategory, id: string) => void
  onSetAccumulator?: (id: string) => void
  onOpenCashAccountEdit?: (cashAccount: CashAccount) => void
  onDeleteCashAccount?: (id: string) => void
  onManageAllocations?: (item: TimelineItem) => void
  cashAccounts: CashAccount[]
  scenarioImpacts: AppliedImpact[]
  isExpanded: boolean
  onToggleExpand: (itemId: string) => void
  showMonthlyData: boolean
  getDisplayAmount: (item: TimelineItem) => number
  activeAnnualizationId: string | null
  setActiveAnnualizationId: (id: string | null) => void
  propertyLink?: PropertyLinkRecord | null
  onOpenPropertyPlanner?: (link: PropertyLinkRecord) => void
}

export function LineItem({
  item,
  category,
  index,
  isSelected,
  onSelect,
  onEdit,
  onDelete,
  onSetAccumulator,
  onOpenCashAccountEdit,
  onDeleteCashAccount,
  onManageAllocations,
  cashAccounts,
  scenarioImpacts,
  isExpanded,
  onToggleExpand,
  showMonthlyData,
  getDisplayAmount,
  activeAnnualizationId,
  setActiveAnnualizationId,
  propertyLink,
  onOpenPropertyPlanner,
}: LineItemProps) {
  const itemId = getItemId(item) || `${category}-${index}`
  const hasScenarios = scenarioImpacts.length > 0
  const annualizationLabel = getAnnualizationLabel(item)

  // Check if this item was created by a 'start' impact - show the scenario icon inline
  const startImpact = scenarioImpacts.find(({ impact }) => impact.impactKind === 'start')
  const startEvent = startImpact?.event

  const handleItemClick = () => {
    onSelect(isSelected ? null : itemId)
  }

  const handleDoubleClick = () => {
    const id = getItemId(item)
    if (item.itemType === 'cash_account') {
      const cashAccount = cashAccounts.find(ca => ca.id === id)
      if (cashAccount && onOpenCashAccountEdit) {
        onOpenCashAccountEdit(cashAccount)
      }
    } else {
      onEdit(category, item)
    }
  }

  const handleEditClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    const id = getItemId(item)
    if (item.itemType === 'cash_account') {
      const cashAccount = cashAccounts.find(ca => ca.id === id)
      if (cashAccount && onOpenCashAccountEdit) {
        onOpenCashAccountEdit(cashAccount)
      }
    } else {
      onEdit(category, item)
    }
  }

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    const id = getItemId(item)
    if (!id) return
    if (item.itemType === 'cash_account') {
      if (confirm('Are you sure you want to delete this cash account?') && onDeleteCashAccount) {
        onDeleteCashAccount(id)
      }
    } else {
      void onDelete(category, id)
    }
  }

  const handleSetAccumulatorClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    const id = getItemId(item)
    if (id && onSetAccumulator) {
      onSetAccumulator(id)
    }
  }

  return (
    <div>
      {/* Main line item row */}
      <div
        data-line-item
        onClick={handleItemClick}
        onDoubleClick={handleDoubleClick}
        className={`group/item relative flex cursor-default items-center justify-between rounded-lg px-2 py-2 transition-colors ${isSelected ? 'bg-white/[0.08]' : 'hover:bg-white/[0.04]'}`}
      >
        {/* Left side: name */}
        <div className="flex min-w-0 items-center gap-2">
          <span className={`truncate text-sm transition-colors ${isSelected ? 'text-slate-100' : 'text-slate-300'}`}>
            {item.name ?? 'Entry'}
          </span>
          {/* Accumulator star */}
          {item.isAccumulator && (
            <Tooltip.Provider delayDuration={0}>
              <Tooltip.Root>
                <Tooltip.Trigger asChild>
                  <Star className="h-2.5 w-2.5 flex-shrink-0 fill-amber-400 text-amber-400" />
                </Tooltip.Trigger>
                <Tooltip.Content
                  side="top"
                  sideOffset={6}
                  className={`z-50
px-2 py-1
rounded-md
bg-black
text-xs text-white
shadow-lg`}
                >
                  Accumulator - receives surplus cash
                </Tooltip.Content>
              </Tooltip.Root>
            </Tooltip.Provider>
          )}
          {/* Scenario indicator - show event icon for start impacts, amber dot for others */}
          {startEvent ? (
            <Tooltip.Provider delayDuration={0}>
              <Tooltip.Root>
                <Tooltip.Trigger asChild>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      window.dispatchEvent(new CustomEvent('open-scenario-event', { detail: startEvent }))
                    }}
                    className="flex-shrink-0 rounded p-0.5 transition hover:bg-white/10"
                  >
                    {(() => {
                      const Icon = getIconByName(startEvent.displayIcon ?? '')
                      return Icon ? (
                        <Icon
                          className="h-3.5 w-3.5"
                          style={{ color: startEvent.displayColor ?? '#f59e0b' }}
                        />
                      ) : (
                        <span
                          className="flex h-3.5 w-3.5 items-center justify-center rounded-full text-[8px] font-bold text-white"
                          style={{ backgroundColor: startEvent.displayColor ?? '#f59e0b' }}
                        >
                          {(startEvent.displayIcon ?? '?').slice(0, 1).toUpperCase()}
                        </span>
                      )
                    })()}
                  </button>
                </Tooltip.Trigger>
                <Tooltip.Content
                  side="top"
                  sideOffset={6}
                  className="z-50 rounded-md bg-black px-2 py-1 text-xs text-white shadow-lg"
                >
                  Created by: {startEvent.name}
                </Tooltip.Content>
              </Tooltip.Root>
            </Tooltip.Provider>
          ) : hasScenarios ? (
            <span className="h-1 w-1 flex-shrink-0 rounded-full bg-amber-400" />
          ) : null}
          {/* Annualization info */}
          {annualizationLabel && (
            <Tooltip.Provider delayDuration={0}>
              <Tooltip.Root
                open={activeAnnualizationId === itemId}
                onOpenChange={(open) => {
                  setActiveAnnualizationId(open ? itemId : null)
                }}
                disableHoverableContent
              >
                <Tooltip.Trigger asChild>
                  <button
                    type="button"
                    onClick={() => {
                      setActiveAnnualizationId(activeAnnualizationId === itemId ? null : itemId)
                    }}
                    className={`flex items-center justify-center
h-3.5 w-3.5
rounded
text-slate-600 hover:text-slate-300
transition`}
                    aria-label="Show annualized source"
                  >
                    <Info className="h-2.5 w-2.5" />
                  </button>
                </Tooltip.Trigger>
                <Tooltip.Content
                  side="top"
                  sideOffset={6}
                  className={`z-50
px-2 py-1
rounded-md
bg-black
text-xs text-white
shadow-lg`}
                >
                  {annualizationLabel}
                </Tooltip.Content>
              </Tooltip.Root>
            </Tooltip.Provider>
          )}
          {/* Scenario expand caret */}
          {hasScenarios && (
            <button
              type="button"
              onClick={() => onToggleExpand(itemId)}
              className={`flex flex-shrink-0 items-center justify-center
h-3.5 w-3.5
rounded
text-slate-600 hover:text-slate-300
transition`}
              aria-label={isExpanded ? 'Collapse scenarios' : 'Expand scenarios'}
            >
              <ChevronRight className={`h-2.5 w-2.5 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
            </button>
          )}
          {/* Property link */}
          {category !== 'income' && category !== 'expense' && propertyLink && onOpenPropertyPlanner && (
            <button
              type="button"
              onClick={() => onOpenPropertyPlanner(propertyLink)}
              className={`flex items-center justify-center
h-4 w-4
rounded
bg-white/5 hover:bg-white/10
text-blue-300
transition`}
              title="Open property scenario"
            >
              <Home className="h-2.5 w-2.5" />
            </button>
          )}
        </div>

        {/* Right side: amount with hover actions */}
        <div className="flex items-center gap-1">
          {/* Value */}
          <span className={`${numericStyles.base} transition-opacity ${isSelected ? 'opacity-0' : 'opacity-100'}`}>
            {formatCurrency(getDisplayAmount(item))}
            {showMonthlyData && (category === 'income' || category === 'expense') && (
              <span className="ml-1 text-xs text-slate-400">/mo</span>
            )}
          </span>

          {/* Actions - shown on click */}
          <div className={`absolute right-2 flex items-center gap-0.5 transition-opacity ${isSelected ? 'opacity-100 pointer-events-auto' : 'pointer-events-none opacity-0'}`}>
            {/* Set as accumulator button for cash accounts */}
            {item.itemType === 'cash_account' && !item.isAccumulator && onSetAccumulator && (
              <button
                onClick={handleSetAccumulatorClick}
                className={`p-1
rounded
hover:bg-amber-500/20
text-slate-500 hover:text-amber-300
transition-colors`}
                type="button"
                title="Set as accumulator"
              >
                <Star className="h-3 w-3" />
              </button>
            )}
            {/* Allocations button for income items */}
            {category === 'income' && onManageAllocations && (
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  onManageAllocations(item)
                }}
                className={`p-1
rounded
hover:bg-purple-500/20
text-slate-500 hover:text-purple-300
transition-colors`}
                type="button"
                title="Manage allocations"
              >
                <GitBranch className="h-3 w-3" />
              </button>
            )}
            <button
              onClick={handleEditClick}
              className={`p-1
rounded
hover:bg-blue-500/20
text-slate-500 hover:text-blue-300
transition-colors`}
              type="button"
              title="Edit"
            >
              <Pencil className="h-3 w-3" />
            </button>
            <button
              onClick={handleDeleteClick}
              className={`p-1
rounded
hover:bg-rose-500/20
text-slate-500 hover:text-rose-300
transition-colors`}
              type="button"
              title="Delete"
            >
              <Trash2 className="h-3 w-3" />
            </button>
          </div>
        </div>
      </div>

      {/* Expanded scenario impacts */}
      {isExpanded && (
        <ScenarioImpactsList
          item={item}
          scenarioImpacts={scenarioImpacts}
          showMonthlyData={showMonthlyData}
        />
      )}
    </div>
  )
}

interface ScenarioImpactsListProps {
  item: TimelineItem
  scenarioImpacts: AppliedImpact[]
  showMonthlyData: boolean
}

function ScenarioImpactsList({ item, scenarioImpacts, showMonthlyData }: ScenarioImpactsListProps) {
  return (
    <div className="space-y-1">
      <div className={`flex items-center justify-between
w-full
pl-4 pr-2 py-1.5
rounded
text-sm text-gray-300`}>
        <div className="flex items-center gap-2">
          <span className="text-xs italic">Original</span>
        </div>
        <span className="text-xs italic">
          {formatCurrency(showMonthlyData ? (item.amountMonthly ?? 0) : (item.amountAnnual ?? 0))}
        </span>
      </div>
      {scenarioImpacts.map(({ event, impact }) => {
        if (!event) return null
        const Icon = getIconByName(event.displayIcon ?? '')
        const isDisabled = !event.isIncluded
        return (
          <button
            key={`${event.id}-${impact.eventId}`}
            type="button"
            onClick={() => {
              if (event) {
                window.dispatchEvent(new CustomEvent('open-scenario-event', { detail: event }))
              }
            }}
            className={`flex w-full items-center justify-between rounded pl-4 pr-2 py-1.5 text-sm transition hover:bg-white/5 ${
              isDisabled ? 'opacity-50' : ''
            }`}
          >
            <div className="flex items-center gap-2">
              <span className={`text-xs italic ${isDisabled ? 'line-through' : ''}`}>
                {event?.name ?? 'Scenario'}
              </span>
              {Icon ? (
                <Icon
                  className="h-3.5 w-3.5 flex-shrink-0"
                  style={{ color: event?.displayColor ?? '#888' }}
                />
              ) : (
                <span
                  className={`flex flex-shrink-0 items-center justify-center
h-3.5 w-3.5
rounded-full
text-[10px] font-bold text-white`}
                  style={{ backgroundColor: event?.displayColor ?? '#888' }}
                >
                  {(event?.displayIcon ?? '?').slice(0, 1).toUpperCase()}
                </span>
              )}
            </div>
            <div className="flex items-center gap-1">
              {(() => {
                const impactAmt = showMonthlyData
                  ? (impact.amountMonthly ?? (impact.amountAnnual ?? 0) / 12)
                  : (impact.amountAnnual ?? 0)
                const hasPercentage = impact.growthRate != null && impact.growthRate !== 0
                // Use percentage sign for color if present, otherwise use amount sign
                const isNegative = hasPercentage ? impact.growthRate! < 0 : impactAmt < 0
                const colorClass = isNegative ? 'text-rose-400' : 'text-emerald-400'

                return (
                  <span className={`text-xs italic ${colorClass}`}>
                    {formatCurrency(impactAmt)}
                    {hasPercentage && (
                      <span className="ml-1">
                        ({impact.growthRate! >= 0 ? '+' : ''}{impact.growthRate}%)
                      </span>
                    )}
                  </span>
                )
              })()}
            </div>
          </button>
        )
      })}
    </div>
  )
}

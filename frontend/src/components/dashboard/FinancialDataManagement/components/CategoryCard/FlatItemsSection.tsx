import { getAppliedImpacts, getItemId } from '../../utils'
import { LineItem } from '../LineItem'
import type { BaseSectionProps, PropertyLinkProps, AllocationProps } from './types'

/** Props for flat items section */
export interface FlatItemsSectionProps extends BaseSectionProps, PropertyLinkProps, AllocationProps {}

export function FlatItemsSection({
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
            scenarioEvents={scenarioEvents}
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

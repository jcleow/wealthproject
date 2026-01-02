import type { TimelineItem } from '@/types/timeline'
import type { PropertyLinkRecord } from '@/types/property'
import { getAppliedImpacts, getItemId } from '../../utils'
import { LineItem } from '../LineItem'
import { CollapsibleSection } from '../CollapsibleSection'
import type { FinancialCategory } from '../../types'
import type { BaseSectionProps, PropertyLinkProps, AllocationProps } from './types'

/** Props for grouped items section */
export interface GroupedItemsSectionProps extends BaseSectionProps, PropertyLinkProps, AllocationProps {}

/** Helper to format category names for display */
function formatCategoryName(category: string, financialCategory?: FinancialCategory): string {
  const categoryMap: Record<string, string> = {
    'bank_account': 'Bank Accounts',
    'bank': 'Bank Accounts',
    'savings': 'Savings',
    'cash': 'Cash',
    'property': 'Property',
    'real_estate': 'Real Estate',
    'vehicle': 'Vehicles',
    'investment': 'Investments',
    'cpf': 'CPF',
    'stocks': 'Stocks',
    'bonds': 'Bonds',
    'crypto': 'Crypto',
  }

  // Handle "Other" category dynamically based on financial type
  if (category.toLowerCase() === 'other') {
    const financialTypeLabels: Record<string, string> = {
      'asset': 'Other Assets',
      'liability': 'Other Liabilities',
      'income': 'Other Income',
      'expense': 'Other Expenses',
      'investment': 'Other Investments',
    }
    return financialCategory ? (financialTypeLabels[financialCategory] ?? 'Other') : 'Other'
  }

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

export function GroupedItemsSection({
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
  // Group items by their category field (case-insensitive)
  // We use lowercase keys for grouping but preserve a display name from the first item
  const { groupedItems, displayNames } = items.reduce((acc, item) => {
    const rawCat = item.category || 'Other'
    const normalizedKey = rawCat.toLowerCase()
    if (!acc.groupedItems[normalizedKey]) {
      acc.groupedItems[normalizedKey] = []
      // Store the first occurrence's casing as the display name
      acc.displayNames[normalizedKey] = rawCat
    }
    acc.groupedItems[normalizedKey].push(item)
    return acc
  }, { groupedItems: {} as Record<string, TimelineItem[]>, displayNames: {} as Record<string, string> })

  // Sort categories alphabetically (case-insensitive), but put "Other" at the end
  const sortedCategories = Object.keys(groupedItems).sort((a, b) => {
    if (a === 'other') return 1
    if (b === 'other') return -1
    return a.localeCompare(b)
  })

  return (
    <>
      {sortedCategories.map((normalizedKey) => {
        const categoryItems = groupedItems[normalizedKey]
        const categoryTotal = categoryItems.reduce((sum, item) => sum + summarizeAmount(item), 0)

        // Hide categories with $0 total, but always show if it contains an accumulator
        const hasAccumulator = categoryItems.some(item => item.isAccumulator)
        if (categoryTotal === 0 && !hasAccumulator) {
          return null
        }

        // Use the preserved display name for formatting
        const displayName = displayNames[normalizedKey]

        return (
          <CollapsibleSection key={normalizedKey} title={formatCategoryName(displayName, financialCategory)} total={categoryTotal}>
            {categoryItems.map((item, index) => {
              const itemId = getItemId(item) || `${financialCategory}-${normalizedKey}-${index}`
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
          </CollapsibleSection>
        )
      })}
    </>
  )
}

/** Props for grouped assets section - wrapper with asset-specific defaults */
export interface GroupedAssetsSectionProps extends Omit<GroupedItemsSectionProps, 'financialCategory'> {
  getPropertyLink: (item: TimelineItem, index: number) => PropertyLinkRecord | null
}

export function GroupedAssetsSection(props: GroupedAssetsSectionProps) {
  return (
    <GroupedItemsSection
      {...props}
      financialCategory="asset"
    />
  )
}

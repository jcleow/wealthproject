import { CollapsibleSection, CollapsibleItem, useCollapsibleSelection } from '../CollapsibleSection'
import type { AssetSubsectionProps } from './types'

export function InvestmentsAssetsSection({
  items: investmentAssets,
  getDisplayAmount,
  onEdit,
  onDelete,
  groupItems = true,
}: AssetSubsectionProps) {
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

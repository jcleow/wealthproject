import { CollapsibleSection, CollapsibleItem, useCollapsibleSelection } from '../CollapsibleSection'
import type { AssetSubsectionProps } from './types'

export function CPFAssetsSection({
  items: cpfAssets,
  getDisplayAmount,
  onEdit,
  onDelete,
  groupItems = true,
}: AssetSubsectionProps) {
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

import { useMemo } from 'react'
import { CollapsibleSection, CollapsibleItem, useCollapsibleSelection } from '../CollapsibleSection'
import type { AssetSubsectionProps } from './types'

export function CPFAssetsSection({
  items: cpfAssets,
  getDisplayAmount,
  onEdit,
  onDelete,
  groupItems = true,
}: AssetSubsectionProps) {
  const { selectedId, handleSelect, sectionRef } = useCollapsibleSelection()

  // Group CPF assets by earner
  const assetsByEarner = useMemo(() => {
    const groups: Record<string, typeof cpfAssets> = {}
    for (const asset of cpfAssets) {
      const earner = asset.earner || 'default'
      if (!groups[earner]) groups[earner] = []
      groups[earner].push(asset)
    }
    return groups
  }, [cpfAssets])

  const renderItemsForEarner = (items: typeof cpfAssets) => items.map((item, index) => {
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
    return (
      <div ref={sectionRef}>
        {cpfAssets.map((item, index) => {
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
        })}
      </div>
    )
  }

  // Render a section for each earner
  const earnerEntries = Object.entries(assetsByEarner)

  return (
    <div ref={sectionRef}>
      {earnerEntries.map(([earner, assets]) => {
        const earnerTotal = assets.reduce((sum, item) => sum + (item.adjMonthlyAmt ?? item.amountMonthly ?? 0), 0)
        // Always show earner name, even with single account
        const title = earner === 'default' ? 'CPF Accounts' : `CPF - ${earner}`
        return (
          <CollapsibleSection key={earner} title={title} total={earnerTotal}>
            {renderItemsForEarner(assets)}
          </CollapsibleSection>
        )
      })}
    </div>
  )
}

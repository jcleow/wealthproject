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

  // Group CPF assets by personId, using personName for display
  const assetsByPerson = useMemo(() => {
    const groups: Record<string, { personName: string; assets: typeof cpfAssets }> = {}
    for (const asset of cpfAssets) {
      const personId = asset.personId || 'default'
      if (!groups[personId]) {
        groups[personId] = { personName: asset.personName || '', assets: [] }
      }
      groups[personId].assets.push(asset)
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

  // Render a section for each person
  const personEntries = Object.entries(assetsByPerson)

  return (
    <div ref={sectionRef}>
      {personEntries.map(([personId, { personName, assets }]) => {
        const personTotal = assets.reduce((sum, item) => sum + (item.adjMonthlyAmt ?? item.amountMonthly ?? 0), 0)
        // Always show person name, even with single account
        const title = personId === 'default' || !personName ? 'CPF Accounts' : `CPF - ${personName}`
        return (
          <CollapsibleSection key={personId} title={title} total={personTotal}>
            {renderItemsForEarner(assets)}
          </CollapsibleSection>
        )
      })}
    </div>
  )
}

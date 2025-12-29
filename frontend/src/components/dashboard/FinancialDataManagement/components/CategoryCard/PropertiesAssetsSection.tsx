import { CollapsibleSection, CollapsibleItem, useCollapsibleSelection } from '../CollapsibleSection'
import type { PropertySnapshotV2 } from '@/types/timeline'
import { parseDecimal } from '../../converters'

interface PropertiesAssetsSectionProps {
  properties: PropertySnapshotV2[]
  groupItems?: boolean
}

export function PropertiesAssetsSection({
  properties,
  groupItems = true,
}: PropertiesAssetsSectionProps) {
  const total = properties.reduce((sum, p) => sum + parseDecimal(p.propertyValue), 0)
  const { selectedId, handleSelect, sectionRef } = useCollapsibleSelection()

  const renderItems = () => properties.map((property) => {
    const propertyId = property.id
    return (
      <CollapsibleItem
        key={propertyId}
        id={propertyId}
        name={property.name}
        amount={parseDecimal(property.propertyValue)}
        isSelected={selectedId === propertyId}
        onSelect={handleSelect}
        // Property items are read-only from timeline view - edit via Property Planner modal
      />
    )
  })

  if (!groupItems) {
    return <div ref={sectionRef}>{renderItems()}</div>
  }

  return (
    <div ref={sectionRef}>
      <CollapsibleSection title="Real Estate" total={total}>
        {renderItems()}
      </CollapsibleSection>
    </div>
  )
}

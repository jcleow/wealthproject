import { useCallback } from 'react'
import { CollapsibleSection, CollapsibleItem, useCollapsibleSelection } from '../CollapsibleSection'
import type { PropertySnapshotV2 } from '@/types/timeline'
import { parseDecimal } from '../../converters'

interface PropertiesMortgagesSectionProps {
  properties: PropertySnapshotV2[]
  groupItems?: boolean
}

export function PropertiesMortgagesSection({
  properties,
  groupItems = true,
}: PropertiesMortgagesSectionProps) {
  // Only include properties that have a mortgage balance
  const propertiesWithMortgage = properties.filter(p => parseDecimal(p.mortgageBalance) > 0)
  const total = propertiesWithMortgage.reduce((sum, p) => sum + parseDecimal(p.mortgageBalance), 0)
  const { selectedId, handleSelect, sectionRef } = useCollapsibleSelection()

  const handleOpenPropertyScenario = useCallback((scenarioId: string) => {
    window.dispatchEvent(new CustomEvent('open-property-scenario', { detail: { scenarioId } }))
  }, [])

  if (propertiesWithMortgage.length === 0) {
    return null
  }

  const renderItems = () => propertiesWithMortgage.map((property) => {
    const propertyId = `${property.id}-mortgage`
    return (
      <CollapsibleItem
        key={propertyId}
        id={propertyId}
        name={`${property.name} Mortgage`}
        amount={parseDecimal(property.mortgageBalance)}
        isSelected={selectedId === propertyId}
        onSelect={handleSelect}
        icon={property.icon ?? 'home'}
        iconColor={property.iconColor ?? '#6366f1'}
        tooltipLabel="Open property scenario"
        onIconClick={() => handleOpenPropertyScenario(property.id)}
      />
    )
  })

  if (!groupItems) {
    return <div ref={sectionRef}>{renderItems()}</div>
  }

  return (
    <div ref={sectionRef}>
      <CollapsibleSection title="Mortgages" total={total}>
        {renderItems()}
      </CollapsibleSection>
    </div>
  )
}

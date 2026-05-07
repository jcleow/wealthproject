import type { InsurancePremiumExpense } from '@/types/api.aliases'
import { CollapsibleSection, CollapsibleItem, useCollapsibleSelection } from '../CollapsibleSection'

function premiumToMonthly(amount: number, frequency: string): number {
  switch (frequency) {
    case 'annual': return amount / 12
    case 'quarterly': return amount / 3
    case 'semi_annual': return amount / 6
    case 'monthly': return amount
    default: return amount / 12
  }
}

interface InsurancePremiumsSectionProps {
  premiums: InsurancePremiumExpense[]
  showMonthlyData: boolean
  groupItems?: boolean
}

export function InsurancePremiumsSection({
  premiums,
  showMonthlyData,
  groupItems = true,
}: InsurancePremiumsSectionProps) {
  const { selectedId, handleSelect, sectionRef } = useCollapsibleSelection()

  const getDisplayAmount = (premium: InsurancePremiumExpense): number => {
    if (showMonthlyData) {
      return premiumToMonthly(premium.premiumAmount, premium.premiumFrequency)
    }
    return premium.premiumAmount
  }

  const total = premiums.reduce((sum, p) => sum + getDisplayAmount(p), 0)

  const renderItems = () =>
    premiums.map((premium) => {
      const displayName = premium.personName
        ? `${premium.policyName} (${premium.personName})`
        : premium.policyName
      return (
        <CollapsibleItem
          key={premium.policyId}
          id={premium.policyId}
          name={displayName}
          amount={getDisplayAmount(premium)}
          amountSuffix={showMonthlyData ? '/mo' : undefined}
          isSelected={selectedId === premium.policyId}
          onSelect={handleSelect}
          icon="shield"
          iconColor="#f43f5e"
        />
      )
    })

  if (!groupItems) {
    return <div ref={sectionRef}>{renderItems()}</div>
  }

  return (
    <div ref={sectionRef}>
      <CollapsibleSection
        title="Insurance Premiums"
        total={total}
        totalSuffix={showMonthlyData ? '/mo' : undefined}
      >
        {renderItems()}
      </CollapsibleSection>
    </div>
  )
}

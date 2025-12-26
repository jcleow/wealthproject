import { CollapsibleSection, CollapsibleItem, useCollapsibleSelection } from '../CollapsibleSection'
import type { DebtRepaymentsSectionProps } from './types'

export function DebtRepaymentsSection({
  debtRepayments,
  getDisplayAmount,
  showMonthlyData,
  onEdit,
  onDelete,
  groupItems = true,
}: DebtRepaymentsSectionProps) {
  const total = debtRepayments.reduce((sum, item) => sum + getDisplayAmount(item), 0)
  const { selectedId, handleSelect, sectionRef } = useCollapsibleSelection()

  const renderItems = () => debtRepayments.map((item, index) => {
    const itemId = item.itemId || `debt-repayment-${index}`
    return (
      <CollapsibleItem
        key={itemId}
        id={itemId}
        name={item.name}
        amount={getDisplayAmount(item)}
        amountSuffix={showMonthlyData ? '/mo' : undefined}
        isSelected={selectedId === itemId}
        onSelect={handleSelect}
        onEdit={onEdit ? () => onEdit(item) : undefined}
        onDelete={onDelete && item.itemId ? () => onDelete(item) : undefined}
      />
    )
  })

  if (!groupItems) {
    return <div ref={sectionRef}>{renderItems()}</div>
  }

  return (
    <div ref={sectionRef}>
      <CollapsibleSection
        title="Debt Repayments"
        total={total}
        totalSuffix={showMonthlyData ? '/mo' : undefined}
      >
        {renderItems()}
      </CollapsibleSection>
    </div>
  )
}

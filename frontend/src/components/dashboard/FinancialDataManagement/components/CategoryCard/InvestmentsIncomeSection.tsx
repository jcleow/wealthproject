import { formatCurrency } from '@/lib/format'
import { numericStyles } from '@/lib/utils'
import { CollapsibleSection, CollapsibleItem, useCollapsibleSelection } from '../CollapsibleSection'
import { getItemId } from '../../utils'
import type { InvestmentsSectionProps } from './types'

export function InvestmentsIncomeSection({
  monthlyInvestments,
  showMonthlyData,
  allocations,
  investments,
  onEditAllocation,
  onDeleteAllocation,
  groupItems = true,
}: InvestmentsSectionProps) {
  const investmentAllocations = allocations.filter((a) => a.targetInvestmentId)
  const { selectedId, handleSelect, sectionRef } = useCollapsibleSelection()
  const displayAmount = showMonthlyData ? monthlyInvestments : monthlyInvestments * 12

  const getInvestmentName = (investmentId: string): string => {
    const investment = investments.find((i) => getItemId(i) === investmentId)
    return investment?.name ?? 'Unknown Investment'
  }

  const getAllocationAmount = (allocation: { allocationValue: number | string }): number => {
    return typeof allocation.allocationValue === 'number'
      ? allocation.allocationValue
      : parseFloat(allocation.allocationValue) || 0
  }

  const renderItems = () => investmentAllocations.length > 0 ? (
    investmentAllocations.map((allocation) => (
      <CollapsibleItem
        key={allocation.id}
        id={allocation.id}
        name={getInvestmentName(allocation.targetInvestmentId!)}
        amount={getAllocationAmount(allocation)}
        amountSuffix={allocation.allocationType === 'fixed' ? '/mo' : (allocation.allocationType === 'percentage' ? '%' : undefined)}
        isSelected={selectedId === allocation.id}
        onSelect={handleSelect}
        onEdit={onEditAllocation ? () => onEditAllocation(allocation) : undefined}
        onDelete={onDeleteAllocation ? () => onDeleteAllocation(allocation) : undefined}
      />
    ))
  ) : (
    <div className="flex items-center justify-between px-2 py-1.5 rounded-lg hover:bg-white/[0.04] transition-colors">
      <span className="truncate text-sm text-slate-300">Allocated to investments</span>
      <span className={numericStyles.base}>
        {formatCurrency(displayAmount)}
        <span className="ml-1 text-xs text-slate-400">{showMonthlyData ? '/mo' : '/yr'}</span>
      </span>
    </div>
  )

  if (!groupItems) {
    return <div ref={sectionRef}>{renderItems()}</div>
  }

  return (
    <div ref={sectionRef}>
      <CollapsibleSection
        title="Investments"
        total={displayAmount}
        totalSuffix={showMonthlyData ? '/mo' : '/yr'}
      >
        {renderItems()}
      </CollapsibleSection>
    </div>
  )
}

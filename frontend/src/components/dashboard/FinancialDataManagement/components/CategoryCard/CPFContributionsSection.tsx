import { formatCurrency } from '@/lib/format'
import { numericStyles } from '@/lib/utils'
import { CollapsibleSection } from '../CollapsibleSection'
import { parseDecimal } from '../../converters'
import type { CPFContributionsSectionProps } from './types'

export function CPFContributionsSection({
  cpfContributionsRaw,
  groupItems = true,
}: CPFContributionsSectionProps) {
  const total = cpfContributionsRaw.reduce((sum, item) => sum + parseDecimal(item.totalContribution), 0)

  const renderItems = () => cpfContributionsRaw.map((item, index) => (
    <div key={item.id || `cpf-contrib-${index}`}>
      <div className="flex items-center justify-between px-2 py-1.5 rounded-lg hover:bg-white/[0.04] transition-colors">
        <span className="truncate text-sm text-slate-300">Employee - {item.name.replace('CPF Contribution - ', '')}</span>
        <span className={numericStyles.base}>
          ({formatCurrency(parseDecimal(item.employeeContribution))})
          <span className="ml-1 text-xs text-slate-400">/mo</span>
        </span>
      </div>
      <div className="flex items-center justify-between px-2 py-1.5 rounded-lg hover:bg-white/[0.04] transition-colors">
        <span className="truncate text-sm text-slate-300">Employer - {item.name.replace('CPF Contribution - ', '')}</span>
        <span className={numericStyles.base}>
          {formatCurrency(parseDecimal(item.employerContribution))}
          <span className="ml-1 text-xs text-slate-400">/mo</span>
        </span>
      </div>
    </div>
  ))

  if (!groupItems) {
    return <>{renderItems()}</>
  }

  return (
    <CollapsibleSection title="CPF Contributions" total={total}>
      {renderItems()}
    </CollapsibleSection>
  )
}

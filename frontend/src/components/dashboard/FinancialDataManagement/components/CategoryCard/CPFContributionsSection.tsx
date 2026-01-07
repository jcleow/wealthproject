import { formatCurrency } from '@/lib/format'
import { numericStyles } from '@/lib/utils'
import { CollapsibleSection } from '../CollapsibleSection'
import { parseDecimal } from '../../converters'
import type { CPFContributionsSectionProps } from './types'
import { ArrowUpRight } from 'lucide-react'

export function CPFContributionsSection({
  cpfContributionsRaw,
  cpfRefundsRaw = [],
  groupItems = true,
}: CPFContributionsSectionProps) {
  const contributionTotal = cpfContributionsRaw.reduce((sum, item) => sum + parseDecimal(item.totalContribution), 0)
  const refundTotal = cpfRefundsRaw.reduce((sum, item) => sum + parseDecimal(item.totalRefund), 0)
  const total = contributionTotal + refundTotal

  const renderContributions = () => cpfContributionsRaw.map((item, index) => (
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

  const renderRefunds = () => cpfRefundsRaw.map((refund) => (
    <div
      key={refund.id}
      className="flex items-center justify-between px-2 py-1.5 rounded-lg bg-emerald-500/5 border border-emerald-500/10 hover:bg-emerald-500/10 transition-colors"
    >
      <div className="flex items-center gap-2 min-w-0">
        <ArrowUpRight className="h-4 w-4 text-emerald-400 shrink-0" />
        <span className="truncate text-sm text-emerald-300">
          CPF Refund - {refund.propertyName}
        </span>
      </div>
      <span className={`${numericStyles.base} text-emerald-400 shrink-0 ml-2`}>
        {formatCurrency(parseDecimal(refund.totalRefund))}
      </span>
    </div>
  ))

  const renderItems = () => (
    <>
      {renderContributions()}
      {renderRefunds()}
    </>
  )

  if (!groupItems) {
    return <>{renderItems()}</>
  }

  return (
    <CollapsibleSection title="CPF Contributions" total={total}>
      {renderItems()}
    </CollapsibleSection>
  )
}

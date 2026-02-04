import { useFormContext } from 'react-hook-form'
import { CheckCircle2, Users, Wallet, CreditCard, TrendingUp, TrendingDown, Landmark, Info } from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatCurrency } from '@/lib/format'
import { ONBOARDING_STEPS, type StepStatus, type OnboardingFormData } from '../types'

interface SummaryStepProps {
  stepStatuses: StepStatus[]
  onClose: () => void
  onBack?: () => void
  isMonet: boolean
}

export function SummaryStep({ stepStatuses, onClose, onBack, isMonet }: SummaryStepProps) {
  const { getValues } = useFormContext<OnboardingFormData>()
  const { persons, incomes, expenses, assets, liabilities, cpfAccounts } = getValues()

  // Only count non-empty entries
  const personCount = persons.filter(p => p.name.trim()).length
  const incomeCount = incomes.filter(i => i.amount > 0).length
  const expenseCount = expenses.filter(e => e.amount > 0).length
  const assetCount = assets.filter(a => a.currentValue > 0).length
  const liabilityCount = liabilities.filter(l => l.currentBalance > 0).length
  const cpfPersonCount = cpfAccounts.filter(c => c.oaBalance > 0 || c.saBalance > 0 || c.maBalance > 0 || c.raBalance > 0).length
  const cpfSubAccountCount = cpfAccounts.reduce((count, c) => {
    return count + (c.oaBalance > 0 ? 1 : 0) + (c.saBalance > 0 ? 1 : 0) + (c.maBalance > 0 ? 1 : 0) + (c.raBalance > 0 ? 1 : 0)
  }, 0)

  // Totals
  const incomeMonthlyTotal = incomes.reduce((sum, inc) => {
    if (inc.amount <= 0) return sum
    const monthlyAmount = inc.frequency === 'annual' ? inc.amount / 12
      : inc.frequency === 'quarterly' ? inc.amount / 3
      : inc.frequency === 'weekly' ? inc.amount * 4.33
      : inc.frequency === 'biweekly' ? inc.amount * 2.17
      : inc.amount
    return sum + monthlyAmount
  }, 0)

  const expenseMonthlyTotal = expenses.reduce((sum, exp) => {
    if (exp.amount <= 0) return sum
    const monthlyAmount = exp.frequency === 'annual' ? exp.amount / 12
      : exp.frequency === 'quarterly' ? exp.amount / 3
      : exp.frequency === 'weekly' ? exp.amount * 4.33
      : exp.frequency === 'biweekly' ? exp.amount * 2.17
      : exp.amount
    return sum + monthlyAmount
  }, 0)

  const assetTotal = assets.reduce((sum, a) => sum + (a.currentValue ?? 0), 0)
  const liabilityTotal = liabilities.reduce((sum, l) => sum + (l.currentBalance ?? 0), 0)
  const cpfTotal = cpfAccounts.reduce((sum, c) => sum + c.oaBalance + c.saBalance + c.maBalance + c.raBalance, 0)

  const skippedSteps = ONBOARDING_STEPS
    .filter((_, idx) => stepStatuses[idx] === 'skipped')
    .map(s => s.label)

  const personNames = persons
    .filter(p => p.name.trim())
    .map(p => p.name.trim())
    .join(', ')

  const summaryItems = [
    { icon: Users, label: `${personCount} Household Member${personCount !== 1 ? 's' : ''}`, detail: personNames, show: personCount > 0 },
    { icon: Wallet, label: `${incomeCount} Income Source${incomeCount !== 1 ? 's' : ''}`, detail: `${formatCurrency(incomeMonthlyTotal)}/mo total`, show: incomeCount > 0 },
    { icon: CreditCard, label: `${expenseCount} Recurring Expense${expenseCount !== 1 ? 's' : ''}`, detail: `${formatCurrency(expenseMonthlyTotal)}/mo total`, show: expenseCount > 0 },
    { icon: TrendingUp, label: `${assetCount} Asset${assetCount !== 1 ? 's' : ''}`, detail: `${formatCurrency(assetTotal)} total`, show: assetCount > 0 },
    { icon: TrendingDown, label: `${liabilityCount} Liabilit${liabilityCount !== 1 ? 'ies' : 'y'}`, detail: `(${formatCurrency(liabilityTotal)}) total`, show: liabilityCount > 0 },
    { icon: Landmark, label: `${cpfSubAccountCount} CPF Sub-account${cpfSubAccountCount !== 1 ? 's' : ''}`, detail: `${formatCurrency(cpfTotal)} combined`, show: cpfPersonCount > 0 },
  ]

  return (
    <div className="flex flex-col items-center py-8 px-6">
      {/* Success icon */}
      <div className={cn(
        'w-14 h-14 rounded-full flex items-center justify-center mb-4',
        isMonet ? 'bg-[var(--monet-sage)]/15' : 'bg-emerald-500/15'
      )}>
        <CheckCircle2 className={cn('w-7 h-7', isMonet ? 'text-[var(--monet-sage)]' : 'text-emerald-400')} />
      </div>

      <h3 className={cn(
        'text-lg font-semibold mb-6',
        isMonet ? 'text-[var(--monet-text-primary)]' : 'text-white'
      )}>
        Your Plan is Ready!
      </h3>

      {/* Summary card */}
      <div className={cn(
        'w-full max-w-md rounded-xl border p-5 mb-6',
        isMonet
          ? 'border-[var(--monet-lavender)]/15 bg-[var(--monet-lavender)]/[0.03]'
          : 'border-white/[0.06] bg-white/[0.02]'
      )}>
        <h4 className={cn(
          'text-xs font-semibold uppercase tracking-wider mb-4',
          isMonet ? 'text-[var(--monet-text-secondary)]' : 'text-slate-400'
        )}>
          What We Set Up
        </h4>

        <div className="space-y-3">
          {summaryItems.filter(item => item.show).map((item) => (
            <div key={item.label} className="flex items-center gap-3">
              <item.icon className={cn('w-4 h-4 flex-shrink-0', isMonet ? 'text-[var(--monet-sage)]' : 'text-emerald-400')} />
              <span className={cn('text-sm flex-1', isMonet ? 'text-[var(--monet-text-primary)]' : 'text-slate-300')}>
                {item.label}
              </span>
              <span className={cn(
                'text-xs font-mono tabular-nums',
                isMonet ? 'text-[var(--monet-text-muted)]' : 'text-slate-500'
              )}>
                {item.detail}
              </span>
            </div>
          ))}

          {summaryItems.every(item => !item.show) && (
            <p className={cn('text-xs text-center py-2', isMonet ? 'text-[var(--monet-text-muted)]' : 'text-slate-600')}>
              No data was added during setup.
            </p>
          )}
        </div>

        {skippedSteps.length > 0 && (
          <div className={cn(
            'mt-4 pt-3 border-t flex items-center gap-2',
            isMonet ? 'border-[var(--monet-lavender)]/10' : 'border-white/[0.04]'
          )}>
            <span className="text-amber-400/80 text-xs">⊘</span>
            <span className={cn('text-xs', isMonet ? 'text-[var(--monet-text-muted)]' : 'text-slate-500')}>
              Skipped: {skippedSteps.join(', ')}
            </span>
          </div>
        )}
      </div>

      {/* Info banner */}
      <div className={cn(
        'w-full max-w-md flex items-start gap-2.5 px-4 py-3 rounded-xl border mb-6',
        isMonet
          ? 'border-[var(--monet-lavender)]/15 bg-[var(--monet-lavender)]/5'
          : 'border-blue-500/15 bg-blue-500/5'
      )}>
        <Info className={cn('w-4 h-4 mt-0.5 flex-shrink-0', isMonet ? 'text-[var(--monet-sage)]' : 'text-blue-400')} />
        <p className={cn('text-xs', isMonet ? 'text-[var(--monet-text-secondary)]' : 'text-slate-400')}>
          You can fine-tune your financial data anytime from the dashboard.
          Add scenario events to test &ldquo;what-if&rdquo; situations, explore CPF projections, or set up insurance coverage analysis.
        </p>
      </div>

      {/* Action buttons */}
      <div className="flex items-center gap-3">
        {onBack && (
          <button
            type="button"
            onClick={onBack}
            className={cn(
              'px-4 py-2.5 rounded-lg text-sm font-medium transition-all',
              isMonet
                ? 'text-[var(--monet-text-secondary)] hover:bg-[var(--monet-lavender)]/10'
                : 'text-slate-400 hover:bg-white/[0.05]'
            )}
          >
            &larr; Back to Edit
          </button>
        )}
        <button
          type="button"
          onClick={onClose}
          className={cn(
            'px-6 py-2.5 rounded-lg text-sm font-medium transition-all',
            isMonet
              ? 'bg-[var(--monet-sage)] text-white hover:bg-[var(--monet-sage)]/90'
              : 'bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25 border border-emerald-500/25'
          )}
        >
          Go to Dashboard &rarr;
        </button>
      </div>
    </div>
  )
}

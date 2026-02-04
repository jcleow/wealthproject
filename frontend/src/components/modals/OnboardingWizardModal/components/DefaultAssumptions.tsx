import { Settings } from 'lucide-react'
import { cn } from '@/lib/utils'
import { CurrencyInput } from '@/components/ui/CurrencyInput'
import { CustomDropdown } from '@/components/modals/ScenarioEventModal/components/CustomDropdown'
import { FREQUENCY_LABELS } from '../types'

const FREQUENCY_OPTIONS = Object.entries(FREQUENCY_LABELS).map(([value, label]) => ({ value, label }))

interface DefaultAssumptionsProps {
  incomeGrowthDefault: number
  setIncomeGrowthDefault: (v: number) => void
  expenseGrowthDefault: number
  setExpenseGrowthDefault: (v: number) => void
  frequencyDefault: string
  setFrequencyDefault: (v: string) => void
  isMonet: boolean
}

export function DefaultAssumptions({
  incomeGrowthDefault,
  setIncomeGrowthDefault,
  expenseGrowthDefault,
  setExpenseGrowthDefault,
  frequencyDefault,
  setFrequencyDefault,
  isMonet,
}: DefaultAssumptionsProps) {
  return (
    <div
      className={cn(
        'flex flex-wrap items-center gap-x-4 gap-y-2 rounded-xl border px-4 py-2.5',
        isMonet
          ? 'border-[var(--monet-lavender)]/10 bg-[var(--monet-lavender)]/3'
          : 'border-white/[0.06] bg-white/[0.02]'
      )}
    >
      <div className="flex items-center gap-1.5">
        <Settings className={cn('w-3.5 h-3.5', isMonet ? 'text-[var(--monet-text-muted)]' : 'text-slate-500')} />
        <span className={cn('text-xs font-medium', isMonet ? 'text-[var(--monet-text-muted)]' : 'text-slate-500')}>
          Defaults
        </span>
      </div>

      {/* Income growth */}
      <div className="flex items-center gap-1.5">
        <span className={cn('text-xs', isMonet ? 'text-[var(--monet-text-muted)]' : 'text-slate-500')}>
          Income growth:
        </span>
        <div className="w-16">
          <CurrencyInput
            value={incomeGrowthDefault}
            onChange={setIncomeGrowthDefault}
            isPercentage
            size="sm"
          />
        </div>
      </div>

      {/* Expense inflation */}
      <div className="flex items-center gap-1.5">
        <span className={cn('text-xs', isMonet ? 'text-[var(--monet-text-muted)]' : 'text-slate-500')}>
          Expense inflation:
        </span>
        <div className="w-16">
          <CurrencyInput
            value={expenseGrowthDefault}
            onChange={setExpenseGrowthDefault}
            isPercentage
            size="sm"
          />
        </div>
      </div>

      {/* Frequency */}
      <div className="flex items-center gap-1.5">
        <span className={cn('text-xs', isMonet ? 'text-[var(--monet-text-muted)]' : 'text-slate-500')}>
          Frequency:
        </span>
        <div className="w-28">
          <CustomDropdown
            value={frequencyDefault}
            onChange={setFrequencyDefault}
            options={FREQUENCY_OPTIONS}
            variant={isMonet ? 'monet' : 'dark'}
            minWidth="100%"
          />
        </div>
      </div>
    </div>
  )
}

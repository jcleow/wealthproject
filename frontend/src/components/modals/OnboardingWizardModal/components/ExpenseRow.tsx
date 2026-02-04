import { useFormContext } from 'react-hook-form'
import { Trash2 } from 'lucide-react'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'
import { CurrencyInput } from '@/components/ui/CurrencyInput'
import { CustomDropdown } from '@/components/modals/ScenarioEventModal/components/CustomDropdown'
import type { OnboardingFormData } from '../types'
import {
  EXPENSE_CATEGORY_LABELS,
  FREQUENCY_LABELS,
} from '../types'
import { EXPENSE_CATEGORY_ICONS } from './incomeExpensesConstants'
import { formatCollapsedLabel, formatCollapsedAmount } from './collapsedSummaryUtils'

const EXPENSE_CATEGORY_OPTIONS = Object.entries(EXPENSE_CATEGORY_LABELS).map(([value, label]) => ({
  value,
  label: `${EXPENSE_CATEGORY_ICONS[value] ?? ''} ${label}`,
}))

const FREQUENCY_OPTIONS = Object.entries(FREQUENCY_LABELS).map(([value, label]) => ({ value, label }))

interface ExpenseRowProps {
  fieldIndex: number
  isExpanded: boolean
  onToggle: () => void
  onRemove: () => void
  isMonet: boolean
  defaults: { growthRate: number; frequency: string }
}

export function ExpenseRow({
  fieldIndex,
  isExpanded,
  onToggle,
  onRemove,
  isMonet,
  defaults,
}: ExpenseRowProps) {
  const { watch, setValue, register, formState: { errors } } = useFormContext<OnboardingFormData>()
  const expense = watch(`expenses.${fieldIndex}`)
  const fieldErrors = errors.expenses?.[fieldIndex]

  if (!expense) return null

  const categoryIcon = EXPENSE_CATEGORY_ICONS[expense.category] ?? '📦'
  const categoryLabel = EXPENSE_CATEGORY_LABELS[expense.category] ?? expense.category

  const getInputClass = (hasError?: boolean) => cn(
    'w-full py-2 px-3 rounded-lg text-sm transition-colors focus:outline-none',
    hasError
      ? 'border border-rose-500/40 bg-rose-500/5 text-white placeholder:text-slate-600 focus:border-rose-500/60'
      : isMonet
        ? 'bg-[var(--monet-lavender)]/5 border border-[var(--monet-lavender)]/15 text-[var(--monet-text-primary)] placeholder:text-[var(--monet-text-muted)] focus:border-[var(--monet-sage)]/40'
        : 'bg-white/[0.03] border border-white/[0.06] text-white placeholder:text-slate-600 focus:border-white/20'
  )

  const matchesDefault = (field: 'growthRate' | 'frequency') => {
    if (field === 'growthRate') return expense.growthRate === defaults.growthRate
    return expense.frequency === defaults.frequency
  }

  // ─── Collapsed row ────────────────────────────────────────────────────────
  const hasAnyError = !!fieldErrors

  if (!isExpanded) {
    return (
      <div
        onClick={onToggle}
        className={cn(
          'group relative flex items-center gap-3 pl-3 pr-0 py-2.5 rounded-xl cursor-pointer transition-all',
          hasAnyError
            ? 'border border-rose-500/30 bg-rose-500/5 hover:border-rose-500/40'
            : isMonet
              ? 'hover:bg-[var(--monet-lavender)]/5 border border-transparent hover:border-[var(--monet-lavender)]/10'
              : 'hover:bg-white/[0.02] border border-transparent hover:border-white/[0.06]'
        )}
      >
        <span className="text-base flex-shrink-0">{categoryIcon}</span>
        <span className={cn(
          'flex-1 text-sm truncate',
          isMonet ? 'text-[var(--monet-text-primary)]' : 'text-slate-200'
        )}>
          {formatCollapsedLabel(expense.name, categoryLabel)}
        </span>
        <span className={cn(
          'flex-shrink-0 text-sm font-mono tabular-nums',
          isMonet ? 'text-rose-500' : 'text-rose-400'
        )}>
          {formatCollapsedAmount(expense.amount, expense.frequency)}
        </span>
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onRemove() }}
          className={cn(
            'absolute -right-1 top-1/2 -translate-y-1/2 p-1 rounded-lg transition-all opacity-0 group-hover:opacity-100',
            isMonet
              ? 'text-[var(--monet-text-muted)] hover:text-rose-500 hover:bg-rose-50'
              : 'text-slate-600 hover:text-rose-400 hover:bg-rose-500/10'
          )}
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    )
  }

  // ─── Expanded row ─────────────────────────────────────────────────────────
  return (
    <motion.div
      initial={{ height: 0, opacity: 0 }}
      animate={{ height: 'auto', opacity: 1 }}
      exit={{ height: 0, opacity: 0 }}
      transition={{ duration: 0.2, ease: 'easeInOut' }}
      className="overflow-hidden"
    >
      <div
        className={cn(
          'rounded-xl border p-4 space-y-3',
          isMonet
            ? 'border-[var(--monet-sage)]/20 bg-[var(--monet-lavender)]/5'
            : 'border-white/[0.08] bg-white/[0.02]'
        )}
      >
        {/* Row 1: Name + Amount */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className={cn('text-[10px] font-medium uppercase tracking-wider mb-1 block', isMonet ? 'text-[var(--monet-text-muted)]' : 'text-slate-600')}>
              Name
            </label>
            <input
              {...register(`expenses.${fieldIndex}.name`)}
              placeholder="e.g. Monthly Rent"
              className={getInputClass(!!fieldErrors?.name)}
              autoFocus
            />
          </div>
          <div>
            <label className={cn('text-[10px] font-medium uppercase tracking-wider mb-1 block', isMonet ? 'text-[var(--monet-text-muted)]' : 'text-slate-600')}>
              Amount
            </label>
            <CurrencyInput
              value={expense.amount}
              onChange={(val) => setValue(`expenses.${fieldIndex}.amount`, val)}
              size="sm"
            />
          </div>
        </div>

        {/* Row 2: Frequency + Category */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className={cn(
              'text-[10px] font-medium uppercase tracking-wider mb-1 block',
              isMonet ? 'text-[var(--monet-text-muted)]' : 'text-slate-600'
            )}>
              Frequency
              {matchesDefault('frequency') && (
                <span className={cn('ml-1.5 normal-case tracking-normal', isMonet ? 'text-[var(--monet-text-muted)]/60' : 'text-slate-700')}>(default)</span>
              )}
            </label>
            <CustomDropdown
              value={expense.frequency}
              onChange={(val) => setValue(`expenses.${fieldIndex}.frequency`, val as any)}
              options={FREQUENCY_OPTIONS}
              variant={isMonet ? 'monet' : 'dark'}
              minWidth="100%"
            />
          </div>
          <div>
            <label className={cn('text-[10px] font-medium uppercase tracking-wider mb-1 block', isMonet ? 'text-[var(--monet-text-muted)]' : 'text-slate-600')}>
              Category
            </label>
            <CustomDropdown
              value={expense.category}
              onChange={(val) => setValue(`expenses.${fieldIndex}.category`, val as any)}
              options={EXPENSE_CATEGORY_OPTIONS}
              variant={isMonet ? 'monet' : 'dark'}
              minWidth="100%"
            />
          </div>
        </div>

        {/* Row 3: Growth Rate */}
        <div className="max-w-[200px]">
          <label className={cn(
            'text-[10px] font-medium uppercase tracking-wider mb-1 block',
            isMonet ? 'text-[var(--monet-text-muted)]' : 'text-slate-600'
          )}>
            Annual Inflation
            {matchesDefault('growthRate') && (
              <span className={cn('ml-1.5 normal-case tracking-normal', isMonet ? 'text-[var(--monet-text-muted)]/60' : 'text-slate-700')}>(default)</span>
            )}
          </label>
          <CurrencyInput
            value={expense.growthRate}
            onChange={(val) => setValue(`expenses.${fieldIndex}.growthRate`, val)}
            isPercentage
            size="sm"
          />
        </div>

        {/* Collapse / Delete actions */}
        <div className="flex items-center justify-between pt-1">
          <button
            type="button"
            onClick={onToggle}
            className={cn(
              'text-xs transition-colors',
              isMonet ? 'text-[var(--monet-text-muted)] hover:text-[var(--monet-text-secondary)]' : 'text-slate-500 hover:text-slate-300'
            )}
          >
            Done
          </button>
          <button
            type="button"
            onClick={onRemove}
            className={cn(
              'flex items-center gap-1 text-xs transition-colors',
              isMonet ? 'text-rose-400 hover:text-rose-500' : 'text-rose-400/60 hover:text-rose-400'
            )}
          >
            <Trash2 className="w-3 h-3" />
            Remove
          </button>
        </div>
      </div>
    </motion.div>
  )
}

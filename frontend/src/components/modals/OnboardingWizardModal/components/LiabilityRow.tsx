import { useFormContext } from 'react-hook-form'
import { Trash2 } from 'lucide-react'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'
import { formatCurrency } from '@/lib/format'
import { CurrencyInput } from '@/components/ui/CurrencyInput'
import { CustomDropdown } from '@/components/modals/ScenarioEventModal/components/CustomDropdown'
import type { OnboardingFormData } from '../types'
import { LIABILITY_CATEGORY_LABELS } from '../types'
import { LIABILITY_CATEGORY_ICONS } from './incomeExpensesConstants'

const LIABILITY_CATEGORY_OPTIONS = Object.entries(LIABILITY_CATEGORY_LABELS).map(([value, label]) => ({
  value,
  label: `${LIABILITY_CATEGORY_ICONS[value] ?? ''} ${label}`,
}))

interface LiabilityRowProps {
  fieldIndex: number
  isExpanded: boolean
  onToggle: () => void
  onRemove: () => void
  isMonet: boolean
}

export function LiabilityRow({
  fieldIndex,
  isExpanded,
  onToggle,
  onRemove,
  isMonet,
}: LiabilityRowProps) {
  const { watch, setValue, register, formState: { errors } } = useFormContext<OnboardingFormData>()
  const liability = watch(`liabilities.${fieldIndex}`)
  const fieldErrors = errors.liabilities?.[fieldIndex]

  if (!liability) return null

  const categoryIcon = LIABILITY_CATEGORY_ICONS[liability.category] ?? '📋'
  const categoryLabel = LIABILITY_CATEGORY_LABELS[liability.category] ?? liability.category

  const getInputClass = (hasError?: boolean) => cn(
    'w-full py-2 px-3 rounded-lg text-sm transition-colors focus:outline-none',
    hasError
      ? 'border border-rose-500/40 bg-rose-500/5 text-white placeholder:text-slate-600 focus:border-rose-500/60'
      : isMonet
        ? 'bg-[var(--monet-lavender)]/5 border border-[var(--monet-lavender)]/15 text-[var(--monet-text-primary)] placeholder:text-[var(--monet-text-muted)] focus:border-[var(--monet-sage)]/40'
        : 'bg-white/[0.03] border border-white/[0.06] text-white placeholder:text-slate-600 focus:border-blue-500/30 focus:bg-blue-500/[0.06]'
  )

  // ─── Collapsed row ────────────────────────────────────────────────────────
  const hasAnyError = !!fieldErrors
  const displayName = liability.name || 'Untitled'
  const displayAmount = liability.currentBalance > 0 ? `(${formatCurrency(liability.currentBalance)})` : '—'

  if (!isExpanded) {
    return (
      <div
        onClick={onToggle}
        className={cn(
          'group flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer transition-all',
          hasAnyError
            ? 'border border-rose-500/30 bg-rose-500/5 hover:border-rose-500/40'
            : isMonet
              ? 'hover:bg-[var(--monet-lavender)]/5 border border-transparent hover:border-[var(--monet-lavender)]/10'
              : 'hover:bg-white/[0.02] border border-transparent hover:border-white/[0.06]'
        )}
      >
        <span className={cn(
          'flex-1 text-sm truncate',
          isMonet ? 'text-[var(--monet-text-primary)]' : 'text-slate-200'
        )}>
          {displayName} · {categoryLabel}
        </span>
        <span className={cn(
          'flex-shrink-0 text-sm font-mono tabular-nums text-right min-w-[100px]',
          isMonet ? 'text-rose-500' : 'text-slate-300'
        )}>
          {displayAmount}
        </span>
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onRemove() }}
          className={cn(
            'flex-shrink-0 p-1 rounded-lg transition-all opacity-0 group-hover:opacity-100',
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
        {/* Row 1: Name + Balance */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className={cn('text-[10px] font-medium uppercase tracking-wider mb-1 block', isMonet ? 'text-[var(--monet-text-muted)]' : 'text-slate-600')}>
              Name
            </label>
            <input
              {...register(`liabilities.${fieldIndex}.name`)}
              placeholder="e.g. Home Mortgage"
              className={getInputClass(!!fieldErrors?.name)}
              autoFocus
            />
          </div>
          <div>
            <label className={cn('text-[10px] font-medium uppercase tracking-wider mb-1 block', isMonet ? 'text-[var(--monet-text-muted)]' : 'text-slate-600')}>
              Outstanding Balance
            </label>
            <CurrencyInput
              value={liability.currentBalance}
              onChange={(val) => setValue(`liabilities.${fieldIndex}.currentBalance`, val)}
              size="sm"
            />
          </div>
        </div>

        {/* Row 2: Category + APR */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className={cn('text-[10px] font-medium uppercase tracking-wider mb-1 block', isMonet ? 'text-[var(--monet-text-muted)]' : 'text-slate-600')}>
              Category
            </label>
            <CustomDropdown
              value={liability.category}
              onChange={(val) => setValue(`liabilities.${fieldIndex}.category`, val as any)}
              options={LIABILITY_CATEGORY_OPTIONS}
              variant={isMonet ? 'monet' : 'dark'}
              minWidth="100%"
            />
          </div>
          <div>
            <label className={cn('text-[10px] font-medium uppercase tracking-wider mb-1 block', isMonet ? 'text-[var(--monet-text-muted)]' : 'text-slate-600')}>
              Interest Rate (APR)
            </label>
            <CurrencyInput
              value={liability.interestRateApr}
              onChange={(val) => setValue(`liabilities.${fieldIndex}.interestRateApr`, val)}
              isPercentage
              size="sm"
            />
          </div>
        </div>

        {/* Row 3: Minimum Payment */}
        <div className="max-w-[200px]">
          <label className={cn('text-[10px] font-medium uppercase tracking-wider mb-1 block', isMonet ? 'text-[var(--monet-text-muted)]' : 'text-slate-600')}>
            Min. Monthly Payment
          </label>
          <CurrencyInput
            value={liability.minimumPayment}
            onChange={(val) => setValue(`liabilities.${fieldIndex}.minimumPayment`, val)}
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

import { useFormContext } from 'react-hook-form'
import { Trash2, Info } from 'lucide-react'
import { AnimatePresence, motion } from 'framer-motion'
import { cn } from '@/lib/utils'
import { CurrencyInput } from '@/components/ui/CurrencyInput'
import { CustomDropdown } from '@/components/modals/ScenarioEventModal/components/CustomDropdown'
import type { OnboardingFormData } from '../types'
import {
  INCOME_CATEGORY_LABELS,
  FREQUENCY_LABELS,
} from '../types'
import { INCOME_CATEGORY_ICONS, CPF_DEFAULT_CATEGORIES } from './incomeExpensesConstants'
import { formatCollapsedLabel, formatCollapsedAmount } from './collapsedSummaryUtils'

const INCOME_CATEGORY_OPTIONS = Object.entries(INCOME_CATEGORY_LABELS).map(([value, label]) => ({
  value,
  label: `${INCOME_CATEGORY_ICONS[value] ?? ''} ${label}`,
}))

const FREQUENCY_OPTIONS = Object.entries(FREQUENCY_LABELS).map(([value, label]) => ({ value, label }))

const CPF_WAGE_OPTIONS = [
  { value: 'ow', label: 'Ordinary Wages (OW)' },
  { value: 'aw', label: 'Additional Wages (AW)' },
]

interface IncomeRowProps {
  fieldIndex: number
  isExpanded: boolean
  onToggle: () => void
  onRemove: () => void
  cpfEligible: boolean
  isMonet: boolean
  defaults: { growthRate: number; frequency: string }
}

export function IncomeRow({
  fieldIndex,
  isExpanded,
  onToggle,
  onRemove,
  cpfEligible,
  isMonet,
  defaults,
}: IncomeRowProps) {
  const { watch, setValue, register, formState: { errors } } = useFormContext<OnboardingFormData>()
  const income = watch(`incomes.${fieldIndex}`)
  const fieldErrors = errors.incomes?.[fieldIndex]

  if (!income) return null

  const cpfApplies = income.cpfWageType !== null
  const categoryIcon = INCOME_CATEGORY_ICONS[income.category] ?? '📋'
  const categoryLabel = INCOME_CATEGORY_LABELS[income.category] ?? income.category

  const handleCpfToggle = (applies: boolean) => {
    if (applies) {
      const defaultType = CPF_DEFAULT_CATEGORIES.has(income.category) ? 'ow' : 'ow'
      setValue(`incomes.${fieldIndex}.cpfWageType`, defaultType)
    } else {
      setValue(`incomes.${fieldIndex}.cpfWageType`, null)
    }
  }

  const handleCategoryChange = (newCategory: string) => {
    setValue(`incomes.${fieldIndex}.category`, newCategory as any)
    // Auto-toggle CPF based on new category
    if (cpfEligible) {
      if (CPF_DEFAULT_CATEGORIES.has(newCategory)) {
        setValue(`incomes.${fieldIndex}.cpfWageType`, 'ow')
      } else {
        setValue(`incomes.${fieldIndex}.cpfWageType`, null)
      }
    }
  }

  const getInputClass = (hasError?: boolean) => cn(
    'w-full py-2 px-3 rounded-lg text-sm transition-colors focus:outline-none',
    hasError
      ? 'border border-rose-500/40 bg-rose-500/5 text-white placeholder:text-slate-600 focus:border-rose-500/60'
      : isMonet
        ? 'bg-[var(--monet-lavender)]/5 border border-[var(--monet-lavender)]/15 text-[var(--monet-text-primary)] placeholder:text-[var(--monet-text-muted)] focus:border-[var(--monet-sage)]/40'
        : 'bg-white/[0.03] border border-white/[0.06] text-white placeholder:text-slate-600 focus:border-blue-500/30 focus:bg-blue-500/[0.06]'
  )

  const matchesDefault = (field: 'growthRate' | 'frequency') => {
    if (field === 'growthRate') return income.growthRate === defaults.growthRate
    return income.frequency === defaults.frequency
  }

  const hasAnyError = !!fieldErrors

  // ─── Collapsed row ────────────────────────────────────────────────────────
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
        <span className="text-base flex-shrink-0">{categoryIcon}</span>
        <span className={cn(
          'flex-1 text-sm truncate',
          isMonet ? 'text-[var(--monet-text-primary)]' : 'text-slate-200'
        )}>
          {formatCollapsedLabel(income.name, categoryLabel)}
        </span>
        <span className={cn(
          'flex-shrink-0 text-sm font-mono tabular-nums',
          isMonet ? 'text-[var(--monet-sage)]' : 'text-emerald-400'
        )}>
          {formatCollapsedAmount(income.amount, income.frequency)}
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
        {/* Row 1: Name + Amount */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className={cn('text-[10px] font-medium uppercase tracking-wider mb-1 block', isMonet ? 'text-[var(--monet-text-muted)]' : 'text-slate-600')}>
              Name
            </label>
            <input
              {...register(`incomes.${fieldIndex}.name`)}
              placeholder="e.g. Monthly Salary"
              className={getInputClass(!!fieldErrors?.name)}
              autoFocus
            />
          </div>
          <div>
            <label className={cn('text-[10px] font-medium uppercase tracking-wider mb-1 block', isMonet ? 'text-[var(--monet-text-muted)]' : 'text-slate-600')}>
              Amount
            </label>
            <CurrencyInput
              value={income.amount}
              onChange={(val) => setValue(`incomes.${fieldIndex}.amount`, val)}
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
              value={income.frequency}
              onChange={(val) => setValue(`incomes.${fieldIndex}.frequency`, val as any)}
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
              value={income.category}
              onChange={handleCategoryChange}
              options={INCOME_CATEGORY_OPTIONS}
              variant={isMonet ? 'monet' : 'dark'}
              minWidth="100%"
            />
          </div>
        </div>

        {/* Row 3: CPF Section (only for eligible persons) */}
        {cpfEligible && (
          <div className="space-y-2">
            <label className={cn('text-[10px] font-medium uppercase tracking-wider block', isMonet ? 'text-[var(--monet-text-muted)]' : 'text-slate-600')}>
              CPF Contribution
            </label>
            <div className="flex items-center gap-3 flex-wrap">
              {/* Toggle: CPF applies? */}
              <div className={cn(
                'inline-flex rounded-lg p-0.5 border',
                isMonet
                  ? 'bg-[var(--monet-lavender)]/5 border-[var(--monet-lavender)]/15'
                  : 'bg-white/[0.03] border-white/[0.08]'
              )}>
                <button
                  type="button"
                  onClick={() => handleCpfToggle(true)}
                  className={cn(
                    'px-3 py-1.5 rounded-md text-xs font-medium transition-all duration-150',
                    cpfApplies
                      ? isMonet
                        ? 'bg-[var(--monet-sage)]/15 text-[var(--monet-sage)] shadow-sm'
                        : 'bg-emerald-500/15 text-emerald-400 shadow-sm'
                      : isMonet
                        ? 'text-[var(--monet-text-muted)]'
                        : 'text-slate-500 hover:text-slate-300'
                  )}
                >
                  Yes
                </button>
                <button
                  type="button"
                  onClick={() => handleCpfToggle(false)}
                  className={cn(
                    'px-3 py-1.5 rounded-md text-xs font-medium transition-all duration-150',
                    !cpfApplies
                      ? isMonet
                        ? 'bg-[var(--monet-lavender)]/15 text-[var(--monet-text-primary)] shadow-sm'
                        : 'bg-white/[0.1] text-white shadow-sm'
                      : isMonet
                        ? 'text-[var(--monet-text-muted)]'
                        : 'text-slate-500 hover:text-slate-300'
                  )}
                >
                  No
                </button>
              </div>

              {/* Wage Type dropdown (inline, right of toggle) */}
              <AnimatePresence>
                {cpfApplies && (
                  <motion.div
                    initial={{ width: 0, opacity: 0 }}
                    animate={{ width: 'auto', opacity: 1 }}
                    exit={{ width: 0, opacity: 0 }}
                    transition={{ duration: 0.15 }}
                    className="overflow-hidden"
                  >
                    <div className="flex items-center gap-2">
                      <CustomDropdown
                        value={income.cpfWageType ?? 'ow'}
                        onChange={(val) => setValue(`incomes.${fieldIndex}.cpfWageType`, val as any)}
                        options={CPF_WAGE_OPTIONS}
                        variant={isMonet ? 'monet' : 'dark'}
                        minWidth="180px"
                      />
                      <div className="relative group">
                        <Info className={cn(
                          'w-3.5 h-3.5 cursor-help',
                          isMonet ? 'text-[var(--monet-text-muted)]' : 'text-slate-600'
                        )} />
                        <div className={cn(
                          'absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-56 p-2.5 rounded-lg text-[11px] leading-relaxed',
                          'opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto transition-opacity z-50',
                          isMonet
                            ? 'bg-white border border-[var(--monet-lavender)]/20 text-[var(--monet-text-secondary)] shadow-lg'
                            : 'bg-[#1a1a2e] border border-white/10 text-slate-300 shadow-xl'
                        )}>
                          <p className="font-semibold mb-1">OW — Ordinary Wages</p>
                          <p className="mb-1.5">Regular monthly salary. Subject to the OW ceiling ($6,800/mo) for CPF contributions.</p>
                          <p className="font-semibold mb-1">AW — Additional Wages</p>
                          <p>Bonuses, commissions, etc. Subject to a separate annual AW ceiling.</p>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        )}

        {/* Row 4: Growth Rate */}
        <div className="max-w-[200px]">
          <label className={cn(
            'text-[10px] font-medium uppercase tracking-wider mb-1 block',
            isMonet ? 'text-[var(--monet-text-muted)]' : 'text-slate-600'
          )}>
            Annual Growth
            {matchesDefault('growthRate') && (
              <span className={cn('ml-1.5 normal-case tracking-normal', isMonet ? 'text-[var(--monet-text-muted)]/60' : 'text-slate-700')}>(default)</span>
            )}
          </label>
          <CurrencyInput
            value={income.growthRate}
            onChange={(val) => setValue(`incomes.${fieldIndex}.growthRate`, val)}
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

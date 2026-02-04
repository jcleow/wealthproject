import { useFormContext, useFieldArray } from 'react-hook-form'
import { Plus, Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatCurrency } from '@/lib/format'
import { CurrencyInput } from '@/components/ui/CurrencyInput'
import { CustomDropdown } from '@/components/modals/ScenarioEventModal/components/CustomDropdown'
import { createDefaultIncome, createDefaultExpense } from '../hooks/useOnboardingForm'
import type { OnboardingFormData } from '../types'
import {
  INCOME_CATEGORY_LABELS,
  EXPENSE_CATEGORY_LABELS,
  FREQUENCY_LABELS,
} from '../types'

interface IncomeExpensesStepProps {
  isMonet: boolean
}

const INCOME_CATEGORY_OPTIONS = Object.entries(INCOME_CATEGORY_LABELS).map(([value, label]) => ({ value, label }))
const EXPENSE_CATEGORY_OPTIONS = Object.entries(EXPENSE_CATEGORY_LABELS).map(([value, label]) => ({ value, label }))
const FREQUENCY_OPTIONS = Object.entries(FREQUENCY_LABELS).map(([value, label]) => ({ value, label }))
const CPF_WAGE_OPTIONS = [
  { value: 'ow', label: 'Ordinary Wages (OW)' },
  { value: 'aw', label: 'Additional Wages (AW)' },
]

export function IncomeExpensesStep({ isMonet }: IncomeExpensesStepProps) {
  const { watch, setValue, register, control } = useFormContext<OnboardingFormData>()
  const { fields: incomeFields, append: appendIncome, remove: removeIncome } = useFieldArray({ control, name: 'incomes' })
  const { fields: expenseFields, append: appendExpense, remove: removeExpense } = useFieldArray({ control, name: 'expenses' })

  const persons = watch('persons')
  const incomes = watch('incomes')
  const expenses = watch('expenses')

  const personOptions = persons.map(p => ({
    value: p.tempId,
    label: p.name || 'Unnamed',
  }))

  // Calculate totals (monthly equivalent)
  const incomeTotal = incomes.reduce((sum, inc) => {
    const monthlyAmount = inc.frequency === 'annual' ? inc.amount / 12
      : inc.frequency === 'quarterly' ? inc.amount / 3
      : inc.frequency === 'weekly' ? inc.amount * 4.33
      : inc.frequency === 'biweekly' ? inc.amount * 2.17
      : inc.amount
    return sum + monthlyAmount
  }, 0)

  const expenseTotal = expenses.reduce((sum, exp) => {
    const monthlyAmount = exp.frequency === 'annual' ? exp.amount / 12
      : exp.frequency === 'quarterly' ? exp.amount / 3
      : exp.frequency === 'weekly' ? exp.amount * 4.33
      : exp.frequency === 'biweekly' ? exp.amount * 2.17
      : exp.amount
    return sum + monthlyAmount
  }, 0)

  const handleAddIncome = () => {
    const firstPersonTempId = persons[0]?.tempId ?? ''
    appendIncome(createDefaultIncome(firstPersonTempId))
  }

  const handleAddExpense = () => {
    appendExpense(createDefaultExpense())
  }

  // Check if a person is citizen/PR (for CPF wage type field)
  const isPersonEligibleForCpf = (personTempId: string): boolean => {
    const person = persons.find(p => p.tempId === personTempId)
    return person?.residencyStatus === 'citizen' || person?.residencyStatus === 'pr'
  }

  const labelClass = cn(
    'text-xs font-medium mb-1',
    isMonet ? 'text-[var(--monet-text-secondary)]' : 'text-slate-400'
  )

  const inputClass = cn(
    'w-full py-2 px-3 rounded-lg text-sm transition-colors focus:outline-none',
    isMonet
      ? 'bg-[var(--monet-lavender)]/5 border border-[var(--monet-lavender)]/15 text-[var(--monet-text-primary)] placeholder:text-[var(--monet-text-muted)] focus:border-[var(--monet-sage)]/40'
      : 'bg-white/[0.03] border border-white/[0.06] text-white placeholder:text-slate-600 focus:border-white/20'
  )

  const sectionHeaderClass = cn(
    'flex items-center justify-between mb-3',
  )

  return (
    <div className="space-y-6">
      {/* ─── Income Sources ────────────────────────────────────────────────── */}
      <div>
        <div className={sectionHeaderClass}>
          <div>
            <h3 className={cn('text-sm font-semibold', isMonet ? 'text-[var(--monet-text-primary)]' : 'text-white')}>
              Income Sources
            </h3>
          </div>
          <span className={cn('text-xs font-mono tabular-nums', isMonet ? 'text-[var(--monet-sage)]' : 'text-emerald-400')}>
            Total: {formatCurrency(incomeTotal)}/mo
          </span>
        </div>

        <div className={cn(
          'rounded-xl border p-4 space-y-4',
          isMonet
            ? 'border-[var(--monet-lavender)]/15 bg-[var(--monet-lavender)]/[0.03]'
            : 'border-white/[0.06] bg-white/[0.02]'
        )}>
          {incomeFields.map((field, index) => (
            <div key={field.id}>
              {index > 0 && (
                <div className={cn('border-t my-4', isMonet ? 'border-[var(--monet-lavender)]/10' : 'border-white/[0.04]')} />
              )}
              {/* Row 1: Person, Name, Amount */}
              <div className="grid grid-cols-3 gap-3 mb-3">
                <div>
                  <label className={labelClass}>Person</label>
                  <CustomDropdown
                    value={incomes[index]?.personTempId ?? ''}
                    onChange={(val) => setValue(`incomes.${index}.personTempId`, val)}
                    options={personOptions}
                    variant={isMonet ? 'monet' : 'dark'}
                    minWidth="100%"
                  />
                </div>
                <div>
                  <label className={labelClass}>Name</label>
                  <input {...register(`incomes.${index}.name`)} placeholder="Salary" className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Amount</label>
                  <CurrencyInput
                    value={incomes[index]?.amount ?? 0}
                    onChange={(val) => setValue(`incomes.${index}.amount`, val)}
                    size="sm"
                  />
                </div>
              </div>

              {/* Row 2: Frequency, Category, CPF Wage Type, Growth Rate, Delete */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 items-end">
                <div>
                  <label className={labelClass}>Frequency</label>
                  <CustomDropdown
                    value={incomes[index]?.frequency ?? 'monthly'}
                    onChange={(val) => setValue(`incomes.${index}.frequency`, val as any)}
                    options={FREQUENCY_OPTIONS}
                    variant={isMonet ? 'monet' : 'dark'}
                    minWidth="100%"
                  />
                </div>
                <div>
                  <label className={labelClass}>Category</label>
                  <CustomDropdown
                    value={incomes[index]?.category ?? 'salary'}
                    onChange={(val) => setValue(`incomes.${index}.category`, val as any)}
                    options={INCOME_CATEGORY_OPTIONS}
                    variant={isMonet ? 'monet' : 'dark'}
                    minWidth="100%"
                  />
                </div>
                {isPersonEligibleForCpf(incomes[index]?.personTempId) && (
                  <div>
                    <label className={labelClass}>CPF Wage Type</label>
                    <CustomDropdown
                      value={incomes[index]?.cpfWageType ?? 'ow'}
                      onChange={(val) => setValue(`incomes.${index}.cpfWageType`, val as any)}
                      options={CPF_WAGE_OPTIONS}
                      variant={isMonet ? 'monet' : 'dark'}
                      minWidth="100%"
                    />
                  </div>
                )}
                <div className="flex items-end gap-2">
                  <div className="flex-1">
                    <label className={labelClass}>Growth</label>
                    <CurrencyInput
                      value={incomes[index]?.growthRate ?? 3}
                      onChange={(val) => setValue(`incomes.${index}.growthRate`, val)}
                      isPercentage
                      size="sm"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => removeIncome(index)}
                    className={cn(
                      'p-2 rounded-md transition-colors mb-0.5',
                      isMonet
                        ? 'text-[var(--monet-text-muted)] hover:text-rose-500'
                        : 'text-slate-600 hover:text-rose-400'
                    )}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        <button
          type="button"
          onClick={handleAddIncome}
          className={cn(
            'flex items-center gap-1.5 text-xs font-medium mt-2 transition-colors',
            isMonet ? 'text-[var(--monet-sage)]' : 'text-emerald-400 hover:text-emerald-300'
          )}
        >
          <Plus className="w-3.5 h-3.5" />
          Add Income Source
        </button>
      </div>

      {/* ─── Divider ───────────────────────────────────────────────────────── */}
      <div className={cn('border-t', isMonet ? 'border-[var(--monet-lavender)]/10' : 'border-white/[0.04]')} />

      {/* ─── Recurring Expenses ────────────────────────────────────────────── */}
      <div>
        <div className={sectionHeaderClass}>
          <div>
            <h3 className={cn('text-sm font-semibold', isMonet ? 'text-[var(--monet-text-primary)]' : 'text-white')}>
              Recurring Expenses
            </h3>
          </div>
          <span className={cn('text-xs font-mono tabular-nums', isMonet ? 'text-rose-500' : 'text-rose-400')}>
            Total: {formatCurrency(expenseTotal)}/mo
          </span>
        </div>

        <div className={cn(
          'rounded-xl border p-4 space-y-3',
          isMonet
            ? 'border-[var(--monet-lavender)]/15 bg-[var(--monet-lavender)]/[0.03]'
            : 'border-white/[0.06] bg-white/[0.02]'
        )}>
          {expenseFields.map((field, index) => (
            <div key={field.id} className="space-y-3">
              {/* Row 1: Name, Amount, Frequency */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className={labelClass}>Name</label>
                  <input {...register(`expenses.${index}.name`)} placeholder="Expense name" className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Amount</label>
                  <CurrencyInput
                    value={expenses[index]?.amount ?? 0}
                    onChange={(val) => setValue(`expenses.${index}.amount`, val)}
                    size="sm"
                  />
                </div>
                <div>
                  <label className={labelClass}>Frequency</label>
                  <CustomDropdown
                    value={expenses[index]?.frequency ?? 'monthly'}
                    onChange={(val) => setValue(`expenses.${index}.frequency`, val as any)}
                    options={FREQUENCY_OPTIONS}
                    variant={isMonet ? 'monet' : 'dark'}
                    minWidth="100%"
                  />
                </div>
              </div>
              {/* Row 2: Category, Growth, Delete */}
              <div className="grid grid-cols-3 gap-3 items-end">
                <div>
                  <label className={labelClass}>Category</label>
                  <CustomDropdown
                    value={expenses[index]?.category ?? 'living'}
                    onChange={(val) => setValue(`expenses.${index}.category`, val as any)}
                    options={EXPENSE_CATEGORY_OPTIONS}
                    variant={isMonet ? 'monet' : 'dark'}
                    minWidth="100%"
                  />
                </div>
                <div className="flex items-end gap-2">
                  <div className="flex-1">
                    <label className={labelClass}>Growth</label>
                    <CurrencyInput
                      value={expenses[index]?.growthRate ?? 2}
                      onChange={(val) => setValue(`expenses.${index}.growthRate`, val)}
                      isPercentage
                      size="sm"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => removeExpense(index)}
                    className={cn(
                      'p-2 rounded-md transition-colors mb-0.5',
                      isMonet
                        ? 'text-[var(--monet-text-muted)] hover:text-rose-500'
                        : 'text-slate-600 hover:text-rose-400'
                    )}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
                <div /> {/* Empty cell for alignment */}
              </div>
            </div>
          ))}
        </div>

        <button
          type="button"
          onClick={handleAddExpense}
          className={cn(
            'flex items-center gap-1.5 text-xs font-medium mt-2 transition-colors',
            isMonet ? 'text-[var(--monet-sage)]' : 'text-emerald-400 hover:text-emerald-300'
          )}
        >
          <Plus className="w-3.5 h-3.5" />
          Add Expense
        </button>
      </div>
    </div>
  )
}

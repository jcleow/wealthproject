import { useState } from 'react'
import { useFormContext, useFieldArray } from 'react-hook-form'
import { Plus } from 'lucide-react'
import { AnimatePresence, motion } from 'framer-motion'
import { cn } from '@/lib/utils'
import { formatCurrency } from '@/lib/format'
import { createDefaultIncome, createDefaultExpense } from '../hooks/useOnboardingForm'
import type { OnboardingFormData } from '../types'
import { RELATIONSHIP_LABELS } from '../types'
import { IncomeRow } from './IncomeRow'
import { ExpenseRow } from './ExpenseRow'
import { DefaultAssumptions } from './DefaultAssumptions'

interface IncomeExpensesStepProps {
  isMonet: boolean
}

const ROLE_COLORS: Record<string, string> = {
  self: '#10b981',
  spouse: '#3b82f6',
  child: '#8b5cf6',
  parent: '#f59e0b',
  sibling: '#06b6d4',
  other: '#ec4899',
}

const rowAnimation = {
  initial: { opacity: 0, y: -8 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: 8, transition: { duration: 0.15 } },
  transition: { duration: 0.2 },
}

export function IncomeExpensesStep({ isMonet }: IncomeExpensesStepProps) {
  const { watch, control } = useFormContext<OnboardingFormData>()
  const { fields: incomeFields, append: appendIncome, remove: removeIncome } = useFieldArray({ control, name: 'incomes' })
  const { fields: expenseFields, append: appendExpense, remove: removeExpense } = useFieldArray({ control, name: 'expenses' })

  const persons = watch('persons')
  const incomes = watch('incomes')
  const expenses = watch('expenses')

  // ─── Accordion state ────────────────────────────────────────────────────
  const [expandedRowId, setExpandedRowId] = useState<string | null>(null)

  // ─── Default assumptions (local, not persisted) ─────────────────────────
  const [incomeGrowthDefault, setIncomeGrowthDefault] = useState(3)
  const [expenseGrowthDefault, setExpenseGrowthDefault] = useState(2)
  const [frequencyDefault, setFrequencyDefault] = useState<string>('monthly')

  // ─── Monthly equivalent helper ──────────────────────────────────────────
  const toMonthly = (amount: number, frequency: string) =>
    frequency === 'annual' ? amount / 12
    : frequency === 'quarterly' ? amount / 3
    : frequency === 'weekly' ? amount * 4.33
    : frequency === 'biweekly' ? amount * 2.17
    : amount

  const incomeTotal = incomes.reduce((sum, inc) => sum + toMonthly(inc.amount, inc.frequency), 0)
  const expenseTotal = expenses.reduce((sum, exp) => sum + toMonthly(exp.amount, exp.frequency), 0)

  // ─── Group incomes by person ────────────────────────────────────────────
  const incomesByPerson = persons.map((person) => {
    const indices: number[] = []
    incomeFields.forEach((_field, index) => {
      if (incomes[index]?.personTempId === person.tempId) {
        indices.push(index)
      }
    })
    return { person, indices }
  })

  const isPersonEligibleForCpf = (personTempId: string): boolean => {
    const person = persons.find(p => p.tempId === personTempId)
    return person?.residencyStatus === 'citizen' || person?.residencyStatus === 'pr'
  }

  // ─── Add handlers (new rows start expanded) ────────────────────────────
  const handleAddIncome = (personTempId: string) => {
    const newIncome = createDefaultIncome(personTempId, {
      growthRate: incomeGrowthDefault,
      frequency: frequencyDefault as any,
    })
    appendIncome(newIncome)
    // New row at end of incomes array → will be the last index
    setExpandedRowId(`income-${incomeFields.length}`)
  }

  const handleAddExpense = () => {
    const newExpense = createDefaultExpense({
      growthRate: expenseGrowthDefault,
      frequency: frequencyDefault as any,
    })
    appendExpense(newExpense)
    setExpandedRowId(`expense-${expenseFields.length}`)
  }

  const handleRemoveIncome = (index: number) => {
    if (expandedRowId === `income-${index}`) setExpandedRowId(null)
    removeIncome(index)
  }

  const handleRemoveExpense = (index: number) => {
    if (expandedRowId === `expense-${index}`) setExpandedRowId(null)
    removeExpense(index)
  }

  const addButtonClass = cn(
    'flex items-center gap-1.5 text-xs font-medium transition-colors mt-3',
    isMonet ? 'text-[var(--monet-sage)]' : 'text-emerald-400 hover:text-emerald-300'
  )

  return (
    <div className="space-y-5">
      {/* ─── Default Assumptions Bar ───────────────────────────────────────── */}
      <DefaultAssumptions
        incomeGrowthDefault={incomeGrowthDefault}
        setIncomeGrowthDefault={setIncomeGrowthDefault}
        expenseGrowthDefault={expenseGrowthDefault}
        setExpenseGrowthDefault={setExpenseGrowthDefault}
        frequencyDefault={frequencyDefault}
        setFrequencyDefault={setFrequencyDefault}
        isMonet={isMonet}
      />

      {/* ─── Income Sources ────────────────────────────────────────────────── */}
      <div className={cn(
        'rounded-2xl border p-4',
        isMonet
          ? 'border-[var(--monet-lavender)]/10 bg-[var(--monet-lavender)]/3'
          : 'border-white/[0.06] bg-white/[0.02]'
      )}>
        <div className="flex items-center justify-between mb-1">
          <h3 className={cn('text-sm font-semibold', isMonet ? 'text-[var(--monet-text-primary)]' : 'text-white')}>
            Income Sources
          </h3>
          <span className={cn(
            'text-lg font-semibold font-mono tabular-nums',
            isMonet ? 'text-[var(--monet-sage)]' : 'text-emerald-400'
          )}>
            {formatCurrency(incomeTotal)}/mo
          </span>
        </div>
        <p className={cn('text-xs mb-4', isMonet ? 'text-[var(--monet-text-muted)]' : 'text-slate-500')}>
          Salaries, bonuses, rental income, etc.
        </p>

        <div className="space-y-4">
          {incomesByPerson.map(({ person, indices }) => {
            const roleColor = ROLE_COLORS[person.relationship] ?? ROLE_COLORS.other
            const personName = person.name || 'Unnamed'
            const personLabel = person.relationship === 'self'
              ? personName
              : `${personName} (${RELATIONSHIP_LABELS[person.relationship] || 'Member'})`
            const cpfEligible = isPersonEligibleForCpf(person.tempId)

            return (
              <div key={person.tempId}>
                {/* Person header */}
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: roleColor }} />
                  <span className={cn(
                    'text-xs font-semibold uppercase tracking-wider',
                    isMonet ? 'text-[var(--monet-text-secondary)]' : 'text-slate-400'
                  )}>
                    {personLabel}
                  </span>
                </div>

                {/* Income rows */}
                <div className="space-y-1">
                  <AnimatePresence mode="popLayout">
                    {indices.map((fieldIndex) => (
                      <motion.div key={incomeFields[fieldIndex].id} {...rowAnimation}>
                        <IncomeRow
                          fieldIndex={fieldIndex}
                          isExpanded={expandedRowId === `income-${fieldIndex}`}
                          onToggle={() =>
                            setExpandedRowId(
                              expandedRowId === `income-${fieldIndex}` ? null : `income-${fieldIndex}`
                            )
                          }
                          onRemove={() => handleRemoveIncome(fieldIndex)}
                          cpfEligible={cpfEligible}
                          isMonet={isMonet}
                          defaults={{ growthRate: incomeGrowthDefault, frequency: frequencyDefault }}
                        />
                      </motion.div>
                    ))}
                  </AnimatePresence>

                  {/* Empty state */}
                  {indices.length === 0 && (
                    <div className={cn(
                      'text-center py-4 rounded-xl border border-dashed',
                      isMonet ? 'border-[var(--monet-lavender)]/15 text-[var(--monet-text-muted)]' : 'border-white/[0.08] text-slate-600'
                    )}>
                      <p className="text-xs">No income sources yet. Add your salary or other income to get started.</p>
                    </div>
                  )}
                </div>

                {/* Add button per person */}
                <button
                  type="button"
                  onClick={() => handleAddIncome(person.tempId)}
                  className={addButtonClass}
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add income for {personName}
                </button>
              </div>
            )
          })}
        </div>
      </div>

      {/* ─── Recurring Expenses ────────────────────────────────────────────── */}
      <div className={cn(
        'rounded-2xl border p-4',
        isMonet
          ? 'border-[var(--monet-lavender)]/10 bg-[var(--monet-lavender)]/3'
          : 'border-white/[0.06] bg-white/[0.02]'
      )}>
        <div className="flex items-center justify-between mb-1">
          <h3 className={cn('text-sm font-semibold', isMonet ? 'text-[var(--monet-text-primary)]' : 'text-white')}>
            Recurring Expenses
          </h3>
          <span className={cn(
            'text-lg font-semibold font-mono tabular-nums',
            isMonet ? 'text-rose-500' : 'text-rose-400'
          )}>
            {formatCurrency(expenseTotal)}/mo
          </span>
        </div>
        <p className={cn('text-xs mb-4', isMonet ? 'text-[var(--monet-text-muted)]' : 'text-slate-500')}>
          Housing, transport, food, utilities, etc.
        </p>

        <div className="space-y-1">
          <AnimatePresence mode="popLayout">
            {expenseFields.map((field, index) => (
              <motion.div key={field.id} {...rowAnimation}>
                <ExpenseRow
                  fieldIndex={index}
                  isExpanded={expandedRowId === `expense-${index}`}
                  onToggle={() =>
                    setExpandedRowId(
                      expandedRowId === `expense-${index}` ? null : `expense-${index}`
                    )
                  }
                  onRemove={() => handleRemoveExpense(index)}
                  isMonet={isMonet}
                  defaults={{ growthRate: expenseGrowthDefault, frequency: frequencyDefault }}
                />
              </motion.div>
            ))}
          </AnimatePresence>

          {/* Empty state */}
          {expenseFields.length === 0 && (
            <div className={cn(
              'text-center py-4 rounded-xl border border-dashed',
              isMonet ? 'border-[var(--monet-lavender)]/15 text-[var(--monet-text-muted)]' : 'border-white/[0.08] text-slate-600'
            )}>
              <p className="text-xs">No expenses added yet. Tracking spending helps build an accurate plan.</p>
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={handleAddExpense}
          className={addButtonClass}
        >
          <Plus className="w-3.5 h-3.5" />
          Add expense
        </button>
      </div>
    </div>
  )
}

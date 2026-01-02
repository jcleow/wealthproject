'use client'

import { useState, useMemo, useCallback, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Wallet,
  CheckCircle2,
  RotateCcw,
  Receipt,
  TrendingUp,
  Info,
  ExternalLink,
  X,
} from 'lucide-react'
import * as Tooltip from '@radix-ui/react-tooltip'
import { clsx } from 'clsx'
import { Modal } from '@/components/ui/Modal'
import { useTaxModeStore } from '@/stores'
import { useTaxReliefStorage } from '@/hooks/useTaxReliefStorage'
import { useIncomesQuery } from '@/hooks/queries/useIncomesQuery'
import { numericStyles } from '@/lib/utils'
import { CustomDropdown } from '@/components/modals/ScenarioEventModal/components/CustomDropdown'
import {
  calculateTaxSimple,
  formatCurrency,
  formatPercent,
  PERSONAL_RELIEF_CAP,
  RELIEF_INFO,
  TAX_DATA_VERSION,
  type TaxRelief,
} from '@/lib/taxCalculations'
import type { Income } from '@/types/financial'

// ============================================
// TYPES
// ============================================

type PersonId = 'person1' | 'person2'
type TaxView = 'summary' | 'by-bracket'
type PaymentMethod = 'lump-sum' | 'giro'

interface IncomeAssignment {
  incomeId: string
  assignedTo: PersonId
}

// ============================================
// HELPER FUNCTIONS
// ============================================

function annualizeIncome(amount: number, frequency: string): number {
  switch (frequency) {
    case 'monthly':
      return amount * 12
    case 'quarterly':
      return amount * 4
    case 'yearly':
    case 'one_time':
      return amount
    default:
      return amount * 12
  }
}

function mapCategoryToTaxType(category: string): 'employment' | 'rental' | 'dividend' | 'interest' | 'business' | 'other' {
  const categoryLower = category.toLowerCase()
  if (categoryLower.includes('salary') || categoryLower.includes('employment') || categoryLower.includes('bonus')) {
    return 'employment'
  }
  if (categoryLower.includes('rental') || categoryLower.includes('rent')) {
    return 'rental'
  }
  if (categoryLower.includes('dividend')) {
    return 'dividend'
  }
  if (categoryLower.includes('interest')) {
    return 'interest'
  }
  if (categoryLower.includes('business') || categoryLower.includes('freelance')) {
    return 'business'
  }
  return 'other'
}

// ============================================
// SUB-COMPONENTS
// ============================================

interface SegmentedControlProps<T extends string> {
  value: T
  onChange: (value: T) => void
  options: { value: T; label: string; icon?: React.ReactNode }[]
}

function SegmentedControl<T extends string>({ value, onChange, options }: SegmentedControlProps<T>) {
  return (
    <div className="inline-flex rounded-lg bg-white/[0.03] p-0.5 border border-white/[0.08]">
      {options.map((option) => {
        const isActive = option.value === value
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            className={clsx(
              'flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-all duration-150',
              isActive
                ? 'bg-white/[0.1] text-white shadow-sm'
                : 'text-slate-500 hover:text-slate-300'
            )}
          >
            {option.icon}
            {option.label}
          </button>
        )
      })}
    </div>
  )
}

interface IncomeRowProps {
  income: Income
  annualAmount: number
}

function IncomeRow({ income, annualAmount }: IncomeRowProps) {
  const taxType = mapCategoryToTaxType(income.category)

  return (
    <div className="flex items-center justify-between py-2 border-b border-white/[0.04] last:border-0">
      <div className="flex flex-col min-w-0 mr-4">
        <span className="text-sm text-slate-300 truncate">{income.name}</span>
        <span className="text-xs text-slate-500 capitalize">{taxType}</span>
      </div>
      <span className={numericStyles.medium}>
        {formatCurrency(annualAmount)}
      </span>
    </div>
  )
}

interface ReliefRowProps {
  relief: TaxRelief
  onUpdate: (amount: number) => void
}

function ReliefRow({ relief, onUpdate }: ReliefRowProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [inputValue, setInputValue] = useState(relief.claimedAmount.toString())
  const isUsed = relief.claimedAmount > 0
  const reliefInfo = RELIEF_INFO[relief.id]

  const handleBlur = () => {
    const parsed = parseFloat(inputValue) || 0
    const clamped = Math.min(Math.max(0, parsed), relief.maxAmount)
    onUpdate(clamped)
    setInputValue(clamped.toString())
    setIsEditing(false)
  }

  return (
    <div className="flex items-center justify-between py-2 border-b border-white/[0.04] last:border-0">
      <div className="flex items-center gap-2 min-w-0 mr-4">
        <span className={clsx('text-sm truncate', isUsed ? 'text-slate-300' : 'text-slate-500')}>
          {relief.name}
        </span>
        {relief.autoCalculated && (
          <span className="shrink-0 text-xs px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20">
            Auto
          </span>
        )}
        {reliefInfo && (
          <Tooltip.Provider delayDuration={200}>
            <Tooltip.Root>
              <Tooltip.Trigger asChild>
                <button type="button" className="shrink-0 text-slate-500 hover:text-slate-300 transition-colors">
                  <Info className="h-3.5 w-3.5" />
                </button>
              </Tooltip.Trigger>
              <Tooltip.Portal>
                <Tooltip.Content
                  side="top"
                  align="start"
                  sideOffset={4}
                  className="z-[60] max-w-xs px-3 py-2 text-xs leading-relaxed text-slate-200 bg-[#1a1a1a] border border-white/[0.1] rounded-lg shadow-xl"
                >
                  <p className="mb-2">{reliefInfo.description}</p>
                  <a
                    href={reliefInfo.irasUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-blue-400 hover:text-blue-300 transition-colors"
                  >
                    Learn more on IRAS
                    <ExternalLink className="h-3 w-3" />
                  </a>
                  <Tooltip.Arrow className="fill-[#1a1a1a]" />
                </Tooltip.Content>
              </Tooltip.Portal>
            </Tooltip.Root>
          </Tooltip.Provider>
        )}
      </div>
      <div className="flex items-center gap-1.5 shrink-0">
        {isEditing ? (
          <input
            type="number"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onBlur={handleBlur}
            onKeyDown={(e) => e.key === 'Enter' && handleBlur()}
            autoFocus
            className="w-24 px-2 py-1 text-right text-sm rounded-lg bg-white/[0.03] border border-white/[0.06] text-white font-mono tabular-nums focus:outline-none focus:border-white/20 transition-colors"
          />
        ) : (
          <button
            onClick={() => setIsEditing(true)}
            className={clsx(
              numericStyles.medium,
              'transition-colors hover:text-amber-400',
              !isUsed && 'text-slate-500'
            )}
          >
            {formatCurrency(relief.claimedAmount)}
          </button>
        )}
        <span className="text-xs text-slate-500 font-mono tabular-nums">
          / {formatCurrency(relief.maxAmount)}
        </span>
      </div>
    </div>
  )
}

// ============================================
// MAIN COMPONENT
// ============================================

interface TaxModeModalProps {
  isOpen: boolean
  onClose: () => void
}

export function TaxModeModal({ isOpen, onClose }: TaxModeModalProps) {
  const residencyStatus = useTaxModeStore((s) => s.residencyStatus)

  const { loadReliefs, saveReliefs } = useTaxReliefStorage()
  const { data: incomes = [], isLoading: incomesLoading } = useIncomesQuery()

  const currentYear = new Date().getFullYear()
  const assessmentYear = currentYear + 1

  const [selectedPerson, setSelectedPerson] = useState<PersonId>('person1')
  const [taxView, setTaxView] = useState<TaxView>('summary')
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('lump-sum')

  const [incomeAssignments, setIncomeAssignments] = useState<IncomeAssignment[]>([])

  useEffect(() => {
    if (incomes.length > 0 && incomeAssignments.length === 0) {
      setIncomeAssignments(incomes.map(inc => ({
        incomeId: inc.id,
        assignedTo: 'person1' as PersonId,
      })))
    }
  }, [incomes, incomeAssignments.length])

  const getAssignment = useCallback((incomeId: string): PersonId => {
    const assignment = incomeAssignments.find(a => a.incomeId === incomeId)
    return assignment?.assignedTo ?? 'person1'
  }, [incomeAssignments])

  const { person1Total, person2Total } = useMemo(() => {
    let p1Total = 0
    let p2Total = 0

    for (const income of incomes) {
      const annual = annualizeIncome(income.amount, income.frequency)
      const assignment = getAssignment(income.id)

      if (assignment === 'person1') {
        p1Total += annual
      } else {
        p2Total += annual
      }
    }

    return { person1Total: p1Total, person2Total: p2Total }
  }, [incomes, getAssignment])

  const currentGrossIncome = useMemo(() => {
    return selectedPerson === 'person1' ? person1Total : person2Total
  }, [selectedPerson, person1Total, person2Total])

  const cpfDeduction = useMemo(() => {
    const relevantIncomes = incomes.filter(inc => getAssignment(inc.id) === selectedPerson)

    const employmentIncome = relevantIncomes
      .filter(inc => mapCategoryToTaxType(inc.category) === 'employment')
      .reduce((sum, inc) => sum + annualizeIncome(inc.amount, inc.frequency), 0)

    const maxCpf = 81600 * 0.20
    return Math.min(employmentIncome * 0.20, maxCpf)
  }, [incomes, selectedPerson, getAssignment])

  const [reliefs, setReliefs] = useState<TaxRelief[]>(() =>
    loadReliefs(assessmentYear, cpfDeduction)
  )

  useEffect(() => {
    setReliefs(prev => prev.map(r =>
      r.id === 'cpf-employee'
        ? { ...r, claimedAmount: Math.min(cpfDeduction, r.maxAmount) }
        : r
    ))
  }, [cpfDeduction])

  const totalReliefs = useMemo(() =>
    reliefs.reduce((sum, r) => sum + r.claimedAmount, 0),
    [reliefs]
  )

  const taxResult = useMemo(() =>
    calculateTaxSimple(currentGrossIncome, cpfDeduction, totalReliefs, residencyStatus),
    [currentGrossIncome, cpfDeduction, totalReliefs, residencyStatus]
  )

  const usedReliefs = useMemo(() => reliefs.filter(r => r.claimedAmount > 0), [reliefs])
  const availableReliefs = useMemo(() => reliefs.filter(r => r.claimedAmount === 0), [reliefs])

  const handleUpdateRelief = useCallback((reliefId: string, amount: number) => {
    setReliefs(prev => prev.map(r =>
      r.id === reliefId ? { ...r, claimedAmount: amount } : r
    ))
  }, [])

  const handleResetReliefs = useCallback(() => {
    setReliefs(loadReliefs(assessmentYear, cpfDeduction))
  }, [assessmentYear, cpfDeduction, loadReliefs])

  useEffect(() => {
    saveReliefs(assessmentYear, reliefs, residencyStatus)
  }, [reliefs, residencyStatus, assessmentYear, saveReliefs])

  const selectedPersonIncomes = useMemo(() => {
    return incomes
      .filter(inc => getAssignment(inc.id) === selectedPerson)
      .map(inc => ({
        income: inc,
        annual: annualizeIncome(inc.amount, inc.frequency),
      }))
  }, [incomes, selectedPerson, getAssignment])

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      overlayClassName="bg-black/60 backdrop-blur-sm"
      className="w-full max-w-4xl max-h-[85vh] mx-4"
    >
      <div className="flex flex-col rounded-2xl border border-white/[0.08] bg-[#0a0a0a] overflow-hidden max-h-[85vh]">
        {/* Header */}
        <div className="px-5 py-4 border-b border-white/[0.06] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <span className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
              <Receipt className="h-5 w-5" />
            </span>
            <div>
              <h2 className="text-lg font-semibold text-white">Tax Estimate</h2>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-sm text-slate-500">YA {assessmentYear}</span>
                <Tooltip.Provider delayDuration={200}>
                  <Tooltip.Root>
                    <Tooltip.Trigger asChild>
                      <button
                        type="button"
                        className="text-slate-500 hover:text-slate-300 transition-colors"
                      >
                        <Info className="h-3.5 w-3.5" />
                      </button>
                    </Tooltip.Trigger>
                    <Tooltip.Portal>
                      <Tooltip.Content
                        side="bottom"
                        align="start"
                        sideOffset={4}
                        className="z-[60] max-w-xs px-3 py-2 text-xs leading-relaxed text-slate-200 bg-[#1a1a1a] border border-white/[0.1] rounded-lg shadow-xl"
                      >
                        <div className="space-y-1.5">
                          <div className="flex justify-between gap-4">
                            <span className="text-slate-500">Version</span>
                            <span className="font-mono">{TAX_DATA_VERSION.version}</span>
                          </div>
                          <div className="flex justify-between gap-4">
                            <span className="text-slate-500">Last updated</span>
                            <span>{TAX_DATA_VERSION.lastUpdated}</span>
                          </div>
                          <div className="flex justify-between gap-4">
                            <span className="text-slate-500">Valid for</span>
                            <span>YA {TAX_DATA_VERSION.validForYA.join(', ')}</span>
                          </div>
                          <div className="pt-1.5 border-t border-white/[0.06] text-slate-400">
                            {TAX_DATA_VERSION.notes}
                          </div>
                          <a
                            href={TAX_DATA_VERSION.sourceUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-blue-400 hover:text-blue-300 transition-colors pt-1"
                          >
                            View IRAS tax rates
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        </div>
                        <Tooltip.Arrow className="fill-[#1a1a1a]" />
                      </Tooltip.Content>
                    </Tooltip.Portal>
                  </Tooltip.Root>
                </Tooltip.Provider>
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/[0.05] transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content - Two Column Layout */}
        <div className="flex-1 flex overflow-hidden">
          {/* LEFT COLUMN - Inputs */}
          <div className="flex-1 overflow-y-auto p-5 space-y-6 border-r border-white/[0.06]">
            {/* Income Section */}
            <section>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Wallet className="h-4 w-4 text-emerald-400" />
                  <span className="text-sm font-medium text-white">Income (Annual)</span>
                </div>
                <CustomDropdown
                  value={selectedPerson}
                  onChange={(v) => setSelectedPerson(v as PersonId)}
                  options={[
                    { value: 'person1', label: 'Person 1' },
                    { value: 'person2', label: 'Person 2' },
                  ]}
                  minWidth="100px"
                />
              </div>

              {incomesLoading ? (
                <div className="py-4 text-center text-sm text-slate-500">Loading incomes...</div>
              ) : selectedPersonIncomes.length === 0 ? (
                <div className="py-4 text-center text-sm text-slate-500">
                  No income assigned to {selectedPerson === 'person1' ? 'Person 1' : 'Person 2'}
                </div>
              ) : (
                selectedPersonIncomes.map(({ income, annual }) => (
                  <IncomeRow key={income.id} income={income} annualAmount={annual} />
                ))
              )}

              <div className="mt-3 pt-3 border-t border-white/[0.06] space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-sm text-slate-400">Gross Income</span>
                  <span className={numericStyles.medium}>{formatCurrency(currentGrossIncome)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-slate-500">CPF Deduction</span>
                  <span className={numericStyles.muted}>({formatCurrency(cpfDeduction)})</span>
                </div>
              </div>
            </section>

            {/* Deductions & Reliefs Section */}
            <section>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-blue-400" />
                  <span className="text-sm font-medium text-white">Deductions & Reliefs</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-500 font-mono tabular-nums">
                    {formatCurrency(totalReliefs)} / {formatCurrency(PERSONAL_RELIEF_CAP)}
                  </span>
                  <button
                    onClick={handleResetReliefs}
                    className="p-1 text-slate-500 hover:text-slate-300 transition-colors"
                    title="Reset reliefs"
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>

              {usedReliefs.length > 0 && (
                <div className="mb-4">
                  <div className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">Used</div>
                  {usedReliefs.map((relief) => (
                    <ReliefRow
                      key={relief.id}
                      relief={relief}
                      onUpdate={(amount) => handleUpdateRelief(relief.id, amount)}
                    />
                  ))}
                </div>
              )}

              {availableReliefs.length > 0 && (
                <div>
                  <div className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">Available</div>
                  {availableReliefs.map((relief) => (
                    <ReliefRow
                      key={relief.id}
                      relief={relief}
                      onUpdate={(amount) => handleUpdateRelief(relief.id, amount)}
                    />
                  ))}
                </div>
              )}

              {totalReliefs >= PERSONAL_RELIEF_CAP && (
                <div className="mt-3 p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20">
                  <p className="text-xs text-amber-400">
                    Relief cap of {formatCurrency(PERSONAL_RELIEF_CAP)} reached
                  </p>
                </div>
              )}
            </section>
          </div>

          {/* RIGHT COLUMN - Results */}
          <div className="w-72 shrink-0 p-5 space-y-6 overflow-y-auto bg-white/[0.01]">
            {/* Chargeable Income */}
            <section>
              <div className="flex items-center gap-2 mb-3">
                <TrendingUp className="h-4 w-4 text-blue-400" />
                <span className="text-xs font-medium text-slate-400 uppercase tracking-wide">Chargeable Income</span>
              </div>

              <div className="space-y-1.5 text-sm mb-3">
                <div className="flex justify-between">
                  <span className="text-slate-500">Gross Income</span>
                  <span className={numericStyles.base}>{formatCurrency(currentGrossIncome)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">CPF Deduction</span>
                  <span className={numericStyles.muted}>({formatCurrency(cpfDeduction)})</span>
                </div>
                <div className="flex justify-between pb-1.5 border-b border-white/[0.04]">
                  <span className="text-slate-400">Assessable Income</span>
                  <span className={numericStyles.base}>{formatCurrency(currentGrossIncome - cpfDeduction)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Reliefs</span>
                  <span className={numericStyles.muted}>({formatCurrency(totalReliefs)})</span>
                </div>
              </div>

              <div className="flex justify-between pt-2 border-t border-white/[0.06]">
                <span className="text-sm text-slate-300 font-medium">Chargeable Income</span>
                <span className={numericStyles.medium}>{formatCurrency(taxResult.chargeableIncome)}</span>
              </div>
            </section>

            {/* Tax */}
            <section className="space-y-1.5 text-sm">
              <div className="flex justify-between">
                <span className="text-sm text-slate-300 font-medium">Tax Payable</span>
                <span className="text-sm font-medium text-rose-400 font-mono tabular-nums">
                  ({formatCurrency(taxResult.taxPayable)})
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-slate-500">
                  {formatPercent(taxResult.effectiveRate)} effective | {formatPercent(taxResult.marginalRate)} marginal
                </span>
                <button
                  type="button"
                  onClick={() => setTaxView(taxView === 'summary' ? 'by-bracket' : 'summary')}
                  className="text-xs text-slate-500 hover:text-slate-300 transition-colors"
                >
                  {taxView === 'summary' ? 'Show details' : 'Hide details'}
                </button>
              </div>

              <AnimatePresence>
                {taxView === 'by-bracket' && taxResult.taxBreakdown.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="pt-2 mt-2 border-t border-white/[0.04] space-y-1">
                      {taxResult.taxBreakdown.map((bracket, idx) => (
                        <div key={idx} className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-slate-500 w-8 font-mono tabular-nums">
                              {formatPercent(bracket.rate)}
                            </span>
                            <span className="text-xs text-slate-500">{bracket.bracket}</span>
                          </div>
                          <span className="text-xs text-slate-400 font-mono tabular-nums">
                            {formatCurrency(bracket.amount)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </section>

            {/* Net Income */}
            <section className="pt-4 border-t border-white/[0.06] space-y-1.5 text-sm">
              <div className="flex justify-between">
                <span className="text-sm text-slate-300 font-medium">Net Income</span>
                <span className="text-sm font-medium text-emerald-400 font-mono tabular-nums">
                  {formatCurrency(taxResult.chargeableIncome - taxResult.taxPayable)}
                </span>
              </div>

              {/* Payment Method */}
              <div className="mt-3 pt-3 border-t border-white/[0.06]">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-slate-500">Payment</span>
                  <SegmentedControl
                    value={paymentMethod}
                    onChange={setPaymentMethod}
                    options={[
                      { value: 'lump-sum', label: 'One-Time' },
                      { value: 'giro', label: 'Monthly' },
                    ]}
                  />
                </div>
                {paymentMethod === 'giro' && taxResult.taxPayable > 0 && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-500">Monthly (12 instalments)</span>
                    <span className={numericStyles.base}>
                      ({formatCurrency(Math.ceil(taxResult.taxPayable / 12))})
                    </span>
                  </div>
                )}
              </div>
            </section>
          </div>
        </div>
      </div>
    </Modal>
  )
}

'use client'

import { useState, useMemo, useCallback, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ChevronDown,
  ChevronUp,
  DollarSign,
  TrendingUp,
  Receipt,
  Wallet,
  Plus,
  Trash2,
  HelpCircle,
  CheckCircle2,
  RotateCcw,
} from 'lucide-react'
import clsx from 'clsx'
import { useTaxMode } from '@/contexts/TaxModeContext'
import { useTaxReliefStorage } from '@/hooks/useTaxReliefStorage'
import {
  calculateTaxSimple,
  formatCurrency,
  formatPercent,
  PERSONAL_RELIEF_CAP,
  type TaxRelief,
  type TaxCalculationResult,
} from '@/lib/taxCalculations'

// ============================================
// TYPES
// ============================================

interface IncomeEntry {
  id: string
  name: string
  amount: number
  type: 'employment' | 'rental' | 'dividend' | 'interest' | 'business' | 'other'
}

// ============================================
// SUB-COMPONENTS
// ============================================

interface StatCardProps {
  label: string
  value: string
  subValue?: string
  icon: React.ReactNode
  color: 'amber' | 'emerald' | 'blue' | 'rose'
}

function StatCard({ label, value, subValue, icon, color }: StatCardProps) {
  const colorClasses = {
    amber: 'bg-amber-500/10 border-amber-500/20 text-amber-400',
    emerald: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400',
    blue: 'bg-blue-500/10 border-blue-500/20 text-blue-400',
    rose: 'bg-rose-500/10 border-rose-500/20 text-rose-400',
  }

  return (
    <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs text-slate-500 mb-1">{label}</p>
          <p className="text-lg font-semibold text-white">{value}</p>
          {subValue && (
            <p className="text-xs text-slate-400 mt-0.5">{subValue}</p>
          )}
        </div>
        <span className={clsx('p-2 rounded-lg border', colorClasses[color])}>
          {icon}
        </span>
      </div>
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

  const handleBlur = () => {
    const parsed = parseFloat(inputValue) || 0
    const clamped = Math.min(Math.max(0, parsed), relief.maxAmount)
    onUpdate(clamped)
    setInputValue(clamped.toString())
    setIsEditing(false)
  }

  return (
    <div className="flex items-center justify-between py-2 border-b border-white/[0.04] last:border-0">
      <div className="flex items-center gap-2">
        <span className="text-sm text-slate-300">{relief.name}</span>
        {relief.autoCalculated && (
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20">
            Auto
          </span>
        )}
      </div>
      <div className="flex items-center gap-2">
        {isEditing ? (
          <input
            type="number"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onBlur={handleBlur}
            onKeyDown={(e) => e.key === 'Enter' && handleBlur()}
            autoFocus
            className="w-28 px-3 py-1.5 text-right text-sm rounded-xl bg-white/[0.03] border border-white/[0.06] text-white focus:outline-none focus:border-white/20 transition-colors"
          />
        ) : (
          <button
            onClick={() => setIsEditing(true)}
            className="text-sm text-white hover:text-amber-400 transition-colors font-medium"
          >
            {formatCurrency(relief.claimedAmount)}
          </button>
        )}
        <span className="text-xs text-slate-500">
          / {formatCurrency(relief.maxAmount)}
        </span>
      </div>
    </div>
  )
}

// ============================================
// MAIN COMPONENT
// ============================================

interface TaxModePanelProps {
  fullWidth?: boolean
  /** When true, hide the Cashflow/Tax toggle (used when toggle is in parent Header) */
  hideToggle?: boolean
}

export function TaxModePanel({ fullWidth = false, hideToggle = false }: TaxModePanelProps) {
  const {
    isTaxModeEnabled,
    disableTaxMode,
    viewMode,
    setViewMode,
    residencyStatus,
    setResidencyStatus,
  } = useTaxMode()

  const { loadReliefs, saveReliefs } = useTaxReliefStorage()

  // Current year for tax calculation
  const currentYear = new Date().getFullYear()
  const assessmentYear = currentYear + 1 // Tax is filed for previous year

  // Local state for income entries
  const [incomes, setIncomes] = useState<IncomeEntry[]>([
    { id: '1', name: 'Employment', amount: 80000, type: 'employment' },
  ])

  // CPF deduction (20% of employment income, capped at OW ceiling)
  const cpfDeduction = useMemo(() => {
    const employmentIncome = incomes
      .filter(i => i.type === 'employment')
      .reduce((sum, i) => sum + i.amount, 0)
    // CPF OW ceiling is $6,800/month = $81,600/year, employee contribution ~20%
    const maxCpf = 81600 * 0.20
    return Math.min(employmentIncome * 0.20, maxCpf)
  }, [incomes])

  // Load reliefs from storage
  const [reliefs, setReliefs] = useState<TaxRelief[]>(() =>
    loadReliefs(assessmentYear, cpfDeduction)
  )

  // Update CPF relief when cpfDeduction changes
  useEffect(() => {
    setReliefs(prev => prev.map(r =>
      r.id === 'cpf-employee'
        ? { ...r, claimedAmount: Math.min(cpfDeduction, r.maxAmount) }
        : r
    ))
  }, [cpfDeduction])

  // Calculate totals
  const grossIncome = useMemo(() =>
    incomes.reduce((sum, i) => sum + i.amount, 0),
    [incomes]
  )

  const totalReliefs = useMemo(() =>
    reliefs.reduce((sum, r) => sum + r.claimedAmount, 0),
    [reliefs]
  )

  // Calculate tax
  const taxResult = useMemo<TaxCalculationResult>(() =>
    calculateTaxSimple(grossIncome, cpfDeduction, totalReliefs, residencyStatus),
    [grossIncome, cpfDeduction, totalReliefs, residencyStatus]
  )

  // Handlers
  const handleAddIncome = useCallback(() => {
    const newIncome: IncomeEntry = {
      id: Date.now().toString(),
      name: 'New Income',
      amount: 0,
      type: 'other',
    }
    setIncomes(prev => [...prev, newIncome])
  }, [])

  const handleUpdateIncome = useCallback((id: string, updates: Partial<IncomeEntry>) => {
    setIncomes(prev => prev.map(i => i.id === id ? { ...i, ...updates } : i))
  }, [])

  const handleDeleteIncome = useCallback((id: string) => {
    setIncomes(prev => prev.filter(i => i.id !== id))
  }, [])

  const handleUpdateRelief = useCallback((reliefId: string, amount: number) => {
    setReliefs(prev => prev.map(r =>
      r.id === reliefId ? { ...r, claimedAmount: amount } : r
    ))
  }, [])

  const handleResetReliefs = useCallback(() => {
    setReliefs(loadReliefs(assessmentYear, cpfDeduction))
  }, [assessmentYear, cpfDeduction, loadReliefs])

  // Save reliefs when they change
  useEffect(() => {
    saveReliefs(assessmentYear, reliefs, residencyStatus)
  }, [reliefs, residencyStatus, assessmentYear, saveReliefs])

  if (!isTaxModeEnabled) return null

  return (
    <div
      className={clsx(
        "flex flex-col rounded-2xl border border-white/[0.06] bg-[#0a0a0a]/90 backdrop-blur-xl overflow-hidden",
        fullWidth ? "w-full" : "h-full"
      )}
    >
      {/* Header */}
      <div className="px-4 py-3 border-b border-white/[0.06]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400">
              <Receipt className="h-4 w-4" />
            </span>
            <div>
              <h3 className="text-sm font-medium text-white">Tax Estimate</h3>
              <p className="text-xs text-slate-500">YA {assessmentYear}</p>
            </div>
          </div>
          <button
            onClick={() => setViewMode(viewMode === 'summary' ? 'detailed' : 'summary')}
            className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs text-slate-400 hover:text-slate-300 hover:bg-white/5 transition-colors"
          >
            {viewMode === 'summary' ? 'Details' : 'Summary'}
            {viewMode === 'summary' ? <ChevronDown className="h-3 w-3" /> : <ChevronUp className="h-3 w-3" />}
          </button>
        </div>

        {/* Cashflow / Tax Toggle - only shown if not hidden */}
        {!hideToggle && (
          <div className="flex rounded-lg border border-white/[0.08] overflow-hidden mt-3">
            <button
              type="button"
              onClick={disableTaxMode}
              className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium transition-all duration-200 text-slate-500 hover:text-slate-400 hover:bg-white/[0.02]"
            >
              <span>Cashflow</span>
            </button>
            <div className="w-px bg-white/[0.08]" />
            <button
              type="button"
              className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium transition-all duration-200 bg-amber-500/10 text-amber-400"
            >
              <Receipt className="h-3 w-3" />
              <span>Tax</span>
            </button>
          </div>
        )}
      </div>

      {/* Content */}
      <div className={clsx(
        "flex-1 overflow-y-auto p-4",
        fullWidth ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" : "space-y-4"
      )}>
        {/* Income Section */}
        <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Wallet className="h-4 w-4 text-emerald-400" />
              <span className="text-sm font-medium text-white">Income</span>
            </div>
            <button
              onClick={handleAddIncome}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-slate-300 text-xs font-medium transition-colors border border-white/[0.06]"
            >
              <Plus className="h-3.5 w-3.5" />
              Add
            </button>
          </div>

          <div className="space-y-3">
            {incomes.map((income) => (
              <div key={income.id} className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.02] border border-white/[0.06]">
                <select
                  value={income.type}
                  onChange={(e) => handleUpdateIncome(income.id, { type: e.target.value as IncomeEntry['type'] })}
                  className="rounded-xl bg-white/[0.03] border border-white/[0.06] text-white text-sm py-2 px-3 focus:outline-none focus:border-white/20 transition-colors appearance-none cursor-pointer"
                  style={{
                    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%2394a3b8'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`,
                    backgroundRepeat: 'no-repeat',
                    backgroundPosition: 'right 0.5rem center',
                    backgroundSize: '0.875rem',
                    paddingRight: '2rem'
                  }}
                >
                  <option value="employment">Employment</option>
                  <option value="rental">Rental</option>
                  <option value="dividend">Dividend</option>
                  <option value="interest">Interest</option>
                  <option value="business">Business</option>
                  <option value="other">Other</option>
                </select>
                <input
                  type="text"
                  value={income.name}
                  onChange={(e) => handleUpdateIncome(income.id, { name: e.target.value })}
                  className="flex-1 rounded-xl bg-white/[0.03] border border-white/[0.06] text-white text-sm py-2 px-3 focus:outline-none focus:border-white/20 transition-colors placeholder:text-slate-500"
                  placeholder="Income name"
                />
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm pointer-events-none">$</span>
                  <input
                    type="number"
                    value={income.amount}
                    onChange={(e) => handleUpdateIncome(income.id, { amount: parseFloat(e.target.value) || 0 })}
                    className="w-32 rounded-xl bg-white/[0.03] border border-white/[0.06] text-white text-sm py-2 pl-7 pr-3 text-right focus:outline-none focus:border-white/20 transition-colors placeholder:text-slate-500"
                    placeholder="0"
                  />
                </div>
                <button
                  onClick={() => handleDeleteIncome(income.id)}
                  className="p-2 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>

          <div className="mt-3 pt-3 border-t border-white/[0.06] flex justify-between">
            <span className="text-sm text-slate-400">Gross Income</span>
            <span className="text-sm font-medium text-white">{formatCurrency(grossIncome)}</span>
          </div>
          <div className="flex justify-between mt-1">
            <span className="text-sm text-slate-400">CPF Deduction</span>
            <span className="text-sm text-slate-400">-{formatCurrency(cpfDeduction)}</span>
          </div>
        </div>

        {/* Detailed View - Reliefs */}
        <AnimatePresence>
          {viewMode === 'detailed' && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3 overflow-hidden"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-blue-400" />
                  <span className="text-sm font-medium text-white">Tax Reliefs</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-500">
                    {formatCurrency(totalReliefs)} / {formatCurrency(PERSONAL_RELIEF_CAP)} cap
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

              <div className="space-y-0">
                {reliefs.map((relief) => (
                  <ReliefRow
                    key={relief.id}
                    relief={relief}
                    onUpdate={(amount) => handleUpdateRelief(relief.id, amount)}
                  />
                ))}
              </div>

              {totalReliefs >= PERSONAL_RELIEF_CAP && (
                <div className="mt-3 p-2 rounded-lg bg-amber-500/10 border border-amber-500/20">
                  <p className="text-xs text-amber-400 flex items-center gap-1">
                    <HelpCircle className="h-3 w-3" />
                    Relief cap of {formatCurrency(PERSONAL_RELIEF_CAP)} reached
                  </p>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Tax Breakdown */}
        <AnimatePresence>
          {viewMode === 'detailed' && taxResult.taxBreakdown.length > 0 && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3 overflow-hidden"
            >
              <div className="flex items-center gap-2 mb-3">
                <Receipt className="h-4 w-4 text-rose-400" />
                <span className="text-sm font-medium text-white">Tax Breakdown</span>
              </div>

              <div className="space-y-1">
                {taxResult.taxBreakdown.map((bracket, idx) => (
                  <div key={idx} className="flex items-center justify-between py-1.5 border-b border-white/[0.04] last:border-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-500 w-12">
                        {formatPercent(bracket.rate)}
                      </span>
                      <span className="text-sm text-slate-400">{bracket.bracket}</span>
                    </div>
                    <span className="text-sm text-white">{formatCurrency(bracket.amount)}</span>
                  </div>
                ))}
              </div>

              <div className="mt-3 pt-3 border-t border-white/[0.06] flex justify-between">
                <span className="text-sm font-medium text-white">Total Tax</span>
                <span className="text-sm font-semibold text-rose-400">{formatCurrency(taxResult.taxPayable)}</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Summary Stats - at the end as aggregation/results */}
        <div className={clsx(
          "gap-3",
          fullWidth ? "grid grid-cols-2 col-span-full" : "grid grid-cols-2"
        )}>
          <StatCard
            label="Chargeable Income"
            value={formatCurrency(taxResult.chargeableIncome)}
            subValue={`${formatPercent(taxResult.marginalRate)} marginal rate`}
            icon={<TrendingUp className="h-4 w-4" />}
            color="blue"
          />
          <StatCard
            label="Tax Payable"
            value={formatCurrency(taxResult.taxPayable)}
            subValue={`${formatPercent(taxResult.effectiveRate)} effective rate`}
            icon={<DollarSign className="h-4 w-4" />}
            color="rose"
          />
        </div>
      </div>
    </div>
  )
}

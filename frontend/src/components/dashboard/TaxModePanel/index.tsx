'use client'

import { useState, useMemo, useCallback, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  X,
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
  type TaxResidencyStatus,
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
            className="w-24 px-2 py-1 text-right text-sm rounded-lg bg-white/[0.05] border border-white/[0.1] text-white focus:outline-none focus:border-amber-500/50"
          />
        ) : (
          <button
            onClick={() => setIsEditing(true)}
            className="text-sm text-slate-400 hover:text-white transition-colors"
          >
            {formatCurrency(relief.claimedAmount)}
          </button>
        )}
        <span className="text-xs text-slate-600">
          / {formatCurrency(relief.maxAmount)}
        </span>
      </div>
    </div>
  )
}

// ============================================
// MAIN COMPONENT
// ============================================

export function TaxModePanel() {
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
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      className="h-full flex flex-col rounded-2xl border border-white/[0.06] bg-[#0a0a0a]/90 backdrop-blur-xl overflow-hidden"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.06]">
        <div className="flex items-center gap-2">
          <span className="p-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400">
            <Receipt className="h-4 w-4" />
          </span>
          <div>
            <h3 className="text-sm font-medium text-white">Tax Estimate</h3>
            <p className="text-xs text-slate-500">YA {assessmentYear}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setViewMode(viewMode === 'summary' ? 'detailed' : 'summary')}
            className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs text-slate-400 hover:text-slate-300 hover:bg-white/5 transition-colors"
          >
            {viewMode === 'summary' ? 'Details' : 'Summary'}
            {viewMode === 'summary' ? <ChevronDown className="h-3 w-3" /> : <ChevronUp className="h-3 w-3" />}
          </button>
          <button
            onClick={disableTaxMode}
            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-300 hover:bg-white/5 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Summary Stats */}
        <div className="grid grid-cols-2 gap-3">
          <StatCard
            label="Tax Payable"
            value={formatCurrency(taxResult.taxPayable)}
            subValue={`${formatPercent(taxResult.effectiveRate)} effective`}
            icon={<DollarSign className="h-4 w-4" />}
            color="rose"
          />
          <StatCard
            label="Chargeable Income"
            value={formatCurrency(taxResult.chargeableIncome)}
            subValue={`${formatPercent(taxResult.marginalRate)} marginal`}
            icon={<TrendingUp className="h-4 w-4" />}
            color="blue"
          />
        </div>

        {/* Residency Status */}
        <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3">
          <label className="text-xs text-slate-500 mb-2 block">Residency Status</label>
          <div className="flex gap-2">
            {(['resident', 'non-resident'] as TaxResidencyStatus[]).map((status) => (
              <button
                key={status}
                onClick={() => setResidencyStatus(status)}
                className={clsx(
                  'flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all',
                  residencyStatus === status
                    ? 'bg-amber-500/15 text-amber-400 border border-amber-500/20'
                    : 'bg-white/[0.02] text-slate-400 border border-white/[0.06] hover:bg-white/[0.04]'
                )}
              >
                {status === 'resident' ? 'Resident' : 'Non-Resident'}
              </button>
            ))}
          </div>
        </div>

        {/* Income Section */}
        <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Wallet className="h-4 w-4 text-emerald-400" />
              <span className="text-sm font-medium text-white">Income</span>
            </div>
            <button
              onClick={handleAddIncome}
              className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs text-emerald-400 hover:bg-emerald-500/10 transition-colors"
            >
              <Plus className="h-3 w-3" />
              Add
            </button>
          </div>

          <div className="space-y-2">
            {incomes.map((income) => (
              <div key={income.id} className="flex items-center gap-2 p-2 rounded-lg bg-black/20">
                <select
                  value={income.type}
                  onChange={(e) => handleUpdateIncome(income.id, { type: e.target.value as IncomeEntry['type'] })}
                  className="bg-transparent text-xs text-slate-400 border-none focus:outline-none cursor-pointer"
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
                  className="flex-1 bg-transparent text-sm text-white border-none focus:outline-none"
                  placeholder="Income name"
                />
                <span className="text-slate-500">$</span>
                <input
                  type="number"
                  value={income.amount}
                  onChange={(e) => handleUpdateIncome(income.id, { amount: parseFloat(e.target.value) || 0 })}
                  className="w-24 text-right bg-transparent text-sm text-white border-none focus:outline-none"
                  placeholder="0"
                />
                <button
                  onClick={() => handleDeleteIncome(income.id)}
                  className="p-1 text-slate-600 hover:text-rose-400 transition-colors"
                >
                  <Trash2 className="h-3.5 w-3.5" />
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
      </div>
    </motion.div>
  )
}

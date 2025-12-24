"use client"

import { useState, useMemo, useCallback } from 'react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  AreaChart,
  Area,
  CartesianGrid,
} from 'recharts'
import {
  ArrowLeft,
  DollarSign,
  Building2,
  TrendingUp,
  CheckCircle2,
  HelpCircle,
  Check,
  Plus,
  X,
  ChevronDown,
  ChevronRight,
  Trash2,
  Pencil,
  Briefcase,
  Home,
  PiggyBank,
  Heart,
  GraduationCap,
  Wallet,
  Users,
  Sparkles,
  Receipt,
  Shield,
} from 'lucide-react'

// ============================================
// TYPES
// ============================================

type TaxResidencyStatus = 'resident' | 'non-resident' | 'not-ordinarily-resident'
type AssessmentYear = '2024' | '2025' | '2026'

interface IncomeSource {
  id: string
  name: string
  type: 'employment' | 'rental' | 'dividend' | 'interest' | 'business' | 'other'
  grossAmount: number
  cpfDeducted?: number
  bonus?: number
}

interface TaxRelief {
  id: string
  name: string
  code: string
  maxAmount: number
  claimedAmount: number
  autoCalculated?: boolean
  category: 'personal' | 'cpf-srs' | 'family' | 'insurance-education'
}

interface TaxScenario {
  id: string
  name: string
  assessmentYear: AssessmentYear
  residencyStatus: TaxResidencyStatus
  incomeSources: IncomeSource[]
  reliefs: TaxRelief[]
  isIncluded: boolean
  createdAt: number
}

interface TaxCalculationResult {
  grossIncome: number
  totalDeductions: number
  assessableIncome: number
  totalReliefs: number
  chargeableIncome: number
  taxPayable: number
  effectiveRate: number
  marginalRate: number
  taxBreakdown: { bracket: string; amount: number; rate: number; min: number; max: number }[]
}

// ============================================
// SINGAPORE TAX BRACKETS 2024 (RESIDENT)
// ============================================

const SG_TAX_BRACKETS_RESIDENT = [
  { min: 0, max: 20000, rate: 0 },
  { min: 20000, max: 30000, rate: 0.02 },
  { min: 30000, max: 40000, rate: 0.035 },
  { min: 40000, max: 80000, rate: 0.07 },
  { min: 80000, max: 120000, rate: 0.115 },
  { min: 120000, max: 160000, rate: 0.15 },
  { min: 160000, max: 200000, rate: 0.18 },
  { min: 200000, max: 240000, rate: 0.19 },
  { min: 240000, max: 280000, rate: 0.195 },
  { min: 280000, max: 320000, rate: 0.20 },
  { min: 320000, max: 500000, rate: 0.22 },
  { min: 500000, max: 1000000, rate: 0.23 },
  { min: 1000000, max: Infinity, rate: 0.24 },
]

const NON_RESIDENT_RATE = 0.24
const PERSONAL_RELIEF_CAP = 80000

// ============================================
// DEFAULT RELIEFS DATA
// ============================================

const DEFAULT_RELIEFS: TaxRelief[] = [
  { id: 'earned-income', name: 'Earned Income Relief', code: 'EIR', maxAmount: 1000, claimedAmount: 1000, autoCalculated: true, category: 'personal' },
  { id: 'cpf-employee', name: 'CPF (Employee)', code: 'CPF-E', maxAmount: 37740, claimedAmount: 0, autoCalculated: true, category: 'cpf-srs' },
  { id: 'cpf-cash', name: 'CPF Cash Top-Up', code: 'CPF-CT', maxAmount: 8000, claimedAmount: 0, category: 'cpf-srs' },
  { id: 'srs', name: 'SRS Contribution', code: 'SRS', maxAmount: 15300, claimedAmount: 0, category: 'cpf-srs' },
  { id: 'life-insurance', name: 'Life Insurance', code: 'LIR', maxAmount: 5000, claimedAmount: 0, category: 'insurance-education' },
  { id: 'course-fees', name: 'Course Fees', code: 'CFR', maxAmount: 5500, claimedAmount: 0, category: 'insurance-education' },
  { id: 'nsman', name: 'NSman Relief', code: 'NSR', maxAmount: 5000, claimedAmount: 0, category: 'personal' },
  { id: 'spouse-relief', name: 'Spouse Relief', code: 'SR', maxAmount: 2000, claimedAmount: 0, category: 'family' },
  { id: 'child-relief', name: 'Qualifying Child', code: 'QCR', maxAmount: 4000, claimedAmount: 0, category: 'family' },
  { id: 'parent-relief', name: 'Parent Relief', code: 'PR', maxAmount: 9000, claimedAmount: 0, category: 'family' },
  { id: 'handicapped-parent', name: 'Handicapped Parent', code: 'HPR', maxAmount: 14000, claimedAmount: 0, category: 'family' },
  { id: 'foreign-domestic', name: 'Foreign Maid Levy', code: 'FDWL', maxAmount: 6360, claimedAmount: 0, category: 'family' },
]

// Income type metadata
const INCOME_TYPES = [
  { id: 'employment', label: 'Employment', icon: <Briefcase className="w-4 h-4" />, color: 'from-blue-500/20 to-blue-600/5', accent: 'text-blue-400' },
  { id: 'rental', label: 'Rental', icon: <Home className="w-4 h-4" />, color: 'from-emerald-500/20 to-emerald-600/5', accent: 'text-emerald-400' },
  { id: 'dividend', label: 'Dividend', icon: <TrendingUp className="w-4 h-4" />, color: 'from-violet-500/20 to-violet-600/5', accent: 'text-violet-400' },
  { id: 'interest', label: 'Interest', icon: <PiggyBank className="w-4 h-4" />, color: 'from-amber-500/20 to-amber-600/5', accent: 'text-amber-400' },
  { id: 'business', label: 'Business', icon: <Building2 className="w-4 h-4" />, color: 'from-rose-500/20 to-rose-600/5', accent: 'text-rose-400' },
  { id: 'other', label: 'Other', icon: <Wallet className="w-4 h-4" />, color: 'from-slate-500/20 to-slate-600/5', accent: 'text-slate-400' },
] as const

// Relief categories
const RELIEF_CATEGORIES = [
  { id: 'personal', label: 'Personal', icon: <Users className="w-4 h-4" /> },
  { id: 'cpf-srs', label: 'CPF & SRS', icon: <PiggyBank className="w-4 h-4" /> },
  { id: 'family', label: 'Family', icon: <Heart className="w-4 h-4" /> },
  { id: 'insurance-education', label: 'Insurance & Education', icon: <GraduationCap className="w-4 h-4" /> },
] as const

// ============================================
// UTILITY FUNCTIONS
// ============================================

function formatCurrency(amount: number): string {
  if (amount >= 1000000) {
    return `$${(amount / 1000000).toFixed(2)}M`
  }
  return new Intl.NumberFormat('en-SG', {
    style: 'currency',
    currency: 'SGD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

function formatCompactCurrency(value: number): string {
  return new Intl.NumberFormat('en-SG', {
    style: 'currency',
    currency: 'SGD',
    notation: 'compact',
    maximumFractionDigits: 1,
    minimumFractionDigits: 0,
  }).format(value)
}

function formatPercent(value: number): string {
  return `${(value * 100).toFixed(1)}%`
}

function calculateTax(scenario: TaxScenario): TaxCalculationResult {
  const { residencyStatus, incomeSources, reliefs } = scenario

  // Calculate gross income
  const grossIncome = incomeSources.reduce((sum, source) => {
    let amount = source.grossAmount
    if (source.type === 'employment' && source.bonus) {
      amount += source.bonus
    }
    return sum + amount
  }, 0)

  // Calculate CPF deductions (only for employment income)
  const totalDeductions = incomeSources
    .filter(s => s.type === 'employment')
    .reduce((sum, s) => sum + (s.cpfDeducted || 0), 0)

  const assessableIncome = grossIncome - totalDeductions

  // Calculate total reliefs (capped at $80,000)
  const totalReliefs = Math.min(
    reliefs.reduce((sum, r) => sum + r.claimedAmount, 0),
    PERSONAL_RELIEF_CAP
  )

  const chargeableIncome = Math.max(0, assessableIncome - totalReliefs)

  // Calculate tax based on residency status
  let taxPayable = 0
  const taxBreakdown: TaxCalculationResult['taxBreakdown'] = []

  if (residencyStatus === 'non-resident') {
    const flatTax = chargeableIncome * NON_RESIDENT_RATE
    const progressiveTax = calculateProgressiveTax(chargeableIncome).total
    taxPayable = Math.max(flatTax, progressiveTax)
    taxBreakdown.push({
      bracket: 'Non-Resident (24%)',
      amount: taxPayable,
      rate: NON_RESIDENT_RATE,
      min: 0,
      max: Infinity,
    })
  } else {
    const result = calculateProgressiveTax(chargeableIncome)
    taxPayable = result.total
    taxBreakdown.push(...result.breakdown)
  }

  const effectiveRate = chargeableIncome > 0 ? taxPayable / chargeableIncome : 0
  const marginalRate = getMarginalRate(chargeableIncome, residencyStatus)

  return {
    grossIncome,
    totalDeductions,
    assessableIncome,
    totalReliefs,
    chargeableIncome,
    taxPayable,
    effectiveRate,
    marginalRate,
    taxBreakdown,
  }
}

function calculateProgressiveTax(chargeableIncome: number): { total: number; breakdown: TaxCalculationResult['taxBreakdown'] } {
  let remainingIncome = chargeableIncome
  let totalTax = 0
  const breakdown: TaxCalculationResult['taxBreakdown'] = []

  for (const bracket of SG_TAX_BRACKETS_RESIDENT) {
    if (remainingIncome <= 0) break

    const bracketSize = bracket.max - bracket.min
    const taxableInBracket = Math.min(remainingIncome, bracketSize)
    const taxInBracket = taxableInBracket * bracket.rate

    if (taxInBracket > 0 || (bracket.rate === 0 && taxableInBracket > 0)) {
      breakdown.push({
        bracket: bracket.max === Infinity
          ? `Above ${formatCurrency(bracket.min)}`
          : `${formatCurrency(bracket.min)} - ${formatCurrency(bracket.max)}`,
        amount: taxInBracket,
        rate: bracket.rate,
        min: bracket.min,
        max: bracket.max,
      })
    }

    totalTax += taxInBracket
    remainingIncome -= taxableInBracket
  }

  return { total: totalTax, breakdown }
}

function getMarginalRate(chargeableIncome: number, residencyStatus: TaxResidencyStatus): number {
  if (residencyStatus === 'non-resident') {
    return NON_RESIDENT_RATE
  }

  for (const bracket of SG_TAX_BRACKETS_RESIDENT) {
    if (chargeableIncome >= bracket.min && chargeableIncome < bracket.max) {
      return bracket.rate
    }
  }
  return SG_TAX_BRACKETS_RESIDENT[SG_TAX_BRACKETS_RESIDENT.length - 1].rate
}

function getDefaultScenario(): TaxScenario {
  return {
    id: `scenario-${Date.now()}`,
    name: 'Tax Scenario 1',
    assessmentYear: '2025',
    residencyStatus: 'resident',
    incomeSources: [
      {
        id: 'income-1',
        name: 'Main Employment',
        type: 'employment',
        grossAmount: 80000,
        cpfDeducted: 16000,
        bonus: 8000,
      },
    ],
    reliefs: DEFAULT_RELIEFS.map(r => ({ ...r })),
    isIncluded: true,
    createdAt: Date.now(),
  }
}

// ============================================
// COMPONENTS
// ============================================

type FormStep = 'income' | 'reliefs' | 'summary'

const FORM_STEPS: { id: FormStep; label: string }[] = [
  { id: 'income', label: 'Income' },
  { id: 'reliefs', label: 'Reliefs' },
  { id: 'summary', label: 'Summary' },
]

interface FormInputProps {
  label: string
  value: string
  onChange: (value: string) => void
  prefix?: string
  suffix?: string
  helper?: string
}

function FormInput({ label, value, onChange, prefix, suffix, helper }: FormInputProps) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-medium text-slate-400 block">{label}</label>
      <div className="relative">
        {prefix && (
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm font-medium">{prefix}</span>
        )}
        <input
          type="text"
          inputMode="numeric"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={cn(
            "w-full rounded-xl bg-white/[0.03] border border-white/[0.06] text-white text-sm py-2.5 transition-all duration-200",
            "hover:border-white/[0.10] focus:outline-none focus:border-white/20 focus:bg-white/[0.05]",
            prefix ? "pl-7" : "px-3",
            suffix ? "pr-10" : "pr-3"
          )}
        />
        {suffix && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm">{suffix}</span>
        )}
      </div>
      {helper && <p className="text-[10px] text-slate-600">{helper}</p>}
    </div>
  )
}

type AccordionColor = 'blue' | 'emerald' | 'violet' | 'amber' | 'rose'

const accordionColors: Record<AccordionColor, { border: string; indicator: string; hover: string }> = {
  blue: { border: 'border-l-blue-500/50', indicator: 'bg-blue-500', hover: 'hover:bg-blue-500/5' },
  emerald: { border: 'border-l-emerald-500/50', indicator: 'bg-emerald-500', hover: 'hover:bg-emerald-500/5' },
  violet: { border: 'border-l-violet-500/50', indicator: 'bg-violet-500', hover: 'hover:bg-violet-500/5' },
  amber: { border: 'border-l-amber-500/50', indicator: 'bg-amber-500', hover: 'hover:bg-amber-500/5' },
  rose: { border: 'border-l-rose-500/50', indicator: 'bg-rose-500', hover: 'hover:bg-rose-500/5' },
}

function FormAccordion({
  title,
  subtitle,
  children,
  defaultOpen = true,
  badge,
  color = 'blue',
}: {
  title: string
  subtitle?: string
  children: React.ReactNode
  defaultOpen?: boolean
  badge?: React.ReactNode
  color?: AccordionColor
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen)
  const colorStyles = accordionColors[color]

  return (
    <div className={cn(
      "rounded-xl border border-white/[0.06] bg-white/[0.02] overflow-hidden",
      "border-l-2",
      colorStyles.border
    )}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "w-full px-4 py-3 flex items-center justify-between transition-colors",
          colorStyles.hover
        )}
      >
        <div className="flex items-center gap-3">
          <div className={cn("w-1.5 h-1.5 rounded-full", colorStyles.indicator)} />
          <div className="text-left">
            <span className="text-sm font-medium text-white">{title}</span>
            {subtitle && (
              <span className="text-xs text-slate-500 ml-2">{subtitle}</span>
            )}
          </div>
          {badge}
        </div>
        <motion.div
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.2 }}
        >
          <ChevronDown className="w-4 h-4 text-slate-500" />
        </motion.div>
      </button>
      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 pt-1 border-t border-white/[0.04]">
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function IncomeSourceCard({
  source,
  onUpdate,
  onDelete,
}: {
  source: IncomeSource
  onUpdate: (updates: Partial<IncomeSource>) => void
  onDelete: () => void
}) {
  const typeInfo = INCOME_TYPES.find(t => t.id === source.type)

  return (
    <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06] space-y-4 transition-all hover:border-white/[0.10]">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className={cn(
            "w-10 h-10 rounded-xl flex items-center justify-center bg-gradient-to-br",
            typeInfo?.color
          )}>
            <span className={typeInfo?.accent}>{typeInfo?.icon}</span>
          </div>
          <div>
            <input
              type="text"
              value={source.name}
              onChange={(e) => onUpdate({ name: e.target.value })}
              className="text-sm font-medium text-white bg-transparent border-none focus:outline-none w-full"
            />
            <select
              value={source.type}
              onChange={(e) => onUpdate({ type: e.target.value as IncomeSource['type'] })}
              className="block text-xs text-slate-500 bg-transparent border-none focus:outline-none cursor-pointer hover:text-slate-400 transition-colors"
            >
              {INCOME_TYPES.map(t => (
                <option key={t.id} value={t.id}>{t.label}</option>
              ))}
            </select>
          </div>
        </div>
        <button
          onClick={onDelete}
          className="p-2 rounded-lg hover:bg-white/10 text-slate-500 hover:text-red-400 transition-colors"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <FormInput
          label="Gross Income"
          prefix="$"
          value={source.grossAmount.toLocaleString()}
          onChange={(v) => onUpdate({ grossAmount: Number(v.replace(/[^0-9]/g, '')) || 0 })}
        />
        {source.type === 'employment' && (
          <>
            <FormInput
              label="CPF Deducted"
              prefix="$"
              value={(source.cpfDeducted || 0).toLocaleString()}
              onChange={(v) => onUpdate({ cpfDeducted: Number(v.replace(/[^0-9]/g, '')) || 0 })}
            />
            <FormInput
              label="Bonus / AWS"
              prefix="$"
              value={(source.bonus || 0).toLocaleString()}
              onChange={(v) => onUpdate({ bonus: Number(v.replace(/[^0-9]/g, '')) || 0 })}
            />
          </>
        )}
      </div>
    </div>
  )
}

function ReliefCard({
  relief,
  onUpdate,
}: {
  relief: TaxRelief
  onUpdate: (claimedAmount: number) => void
}) {
  const isMaxed = relief.claimedAmount >= relief.maxAmount && relief.maxAmount > 0
  const percentage = relief.maxAmount > 0 ? (relief.claimedAmount / relief.maxAmount) * 100 : 0

  return (
    <div className={cn(
      "p-3 rounded-lg border transition-all",
      relief.claimedAmount > 0
        ? "bg-white/[0.03] border-white/[0.08]"
        : "bg-white/[0.01] border-white/[0.04] hover:border-white/[0.06]"
    )}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-white/90">{relief.name}</span>
          <span className="text-[10px] text-slate-600 px-1.5 py-0.5 bg-white/[0.03] rounded">
            {relief.code}
          </span>
        </div>
        {relief.maxAmount > 0 && (
          <span className={cn(
            "text-[10px] font-medium",
            isMaxed ? "text-emerald-400" : "text-slate-500"
          )}>
            Max: {formatCurrency(relief.maxAmount)}
          </span>
        )}
      </div>

      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-xs">$</span>
          <input
            type="text"
            inputMode="numeric"
            value={relief.claimedAmount.toLocaleString()}
            onChange={(e) => {
              const value = Number(e.target.value.replace(/[^0-9]/g, '')) || 0
              onUpdate(relief.maxAmount > 0 ? Math.min(value, relief.maxAmount) : value)
            }}
            disabled={relief.autoCalculated}
            className={cn(
              "w-full rounded-lg bg-white/[0.03] border border-white/[0.06] text-white text-sm py-2 pl-7 pr-3",
              "focus:outline-none focus:border-white/20 transition-colors",
              relief.autoCalculated && "opacity-50 cursor-not-allowed"
            )}
          />
        </div>
        {relief.maxAmount > 0 && !relief.autoCalculated && (
          <button
            onClick={() => onUpdate(relief.maxAmount)}
            className={cn(
              "px-3 py-2 rounded-lg text-xs font-medium transition-colors",
              isMaxed
                ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/20"
                : "bg-white/[0.04] text-slate-400 hover:text-white hover:bg-white/[0.08] border border-white/[0.06]"
            )}
          >
            Max
          </button>
        )}
      </div>

      {/* Progress bar */}
      {relief.maxAmount > 0 && (
        <div className="mt-2 h-1 rounded-full bg-white/[0.04] overflow-hidden">
          <div
            className={cn(
              "h-full rounded-full transition-all duration-500",
              isMaxed ? "bg-gradient-to-r from-emerald-500 to-emerald-400" : "bg-gradient-to-r from-blue-500 to-blue-400"
            )}
            style={{ width: `${Math.min(percentage, 100)}%` }}
          />
        </div>
      )}
    </div>
  )
}

type ChartView = 'breakdown' | 'brackets' | 'waterfall'

function TaxVisualization({ calculation }: { calculation: TaxCalculationResult }) {
  const [chartView, setChartView] = useState<ChartView>('breakdown')

  // Prepare chart data
  const breakdownData = [
    { name: 'Gross\nIncome', value: calculation.grossIncome, fill: '#3b82f6' },
    { name: 'CPF\nDeductions', value: -calculation.totalDeductions, fill: '#64748b' },
    { name: 'Tax\nReliefs', value: -calculation.totalReliefs, fill: '#10b981' },
    { name: 'Chargeable\nIncome', value: calculation.chargeableIncome, fill: '#8b5cf6' },
    { name: 'Tax\nPayable', value: calculation.taxPayable, fill: '#f43f5e' },
  ]

  const bracketData = calculation.taxBreakdown
    .filter(b => b.amount > 0 || b.rate === 0)
    .map(b => ({
      name: b.bracket.replace(' - ', '\n').replace('Above ', '>'),
      tax: b.amount,
      rate: b.rate * 100,
    }))

  return (
    <div className="space-y-3">
      {/* Toggle */}
      <div className="flex items-center justify-between">
        <p className="text-[10px] font-medium text-slate-500 uppercase tracking-wide">
          {chartView === 'breakdown' ? 'Income Breakdown' : chartView === 'brackets' ? 'Tax by Bracket' : 'Tax Flow'}
        </p>
        <div className="flex items-center gap-0.5 p-0.5 bg-white/[0.04] rounded-md">
          {(['breakdown', 'brackets'] as ChartView[]).map((view) => (
            <button
              key={view}
              onClick={() => setChartView(view)}
              className={cn(
                "px-2 py-0.5 text-[10px] font-medium rounded transition-colors capitalize",
                chartView === view ? "bg-white/10 text-white" : "text-slate-500 hover:text-slate-300"
              )}
            >
              {view}
            </button>
          ))}
        </div>
      </div>

      {/* Chart */}
      <div style={{ minHeight: 200 }}>
        <AnimatePresence mode="wait">
          {chartView === 'breakdown' && (
            <motion.div
              key="breakdown"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={breakdownData} layout="vertical" margin={{ left: 60, right: 20, top: 10, bottom: 10 }}>
                  <CartesianGrid stroke="rgba(255,255,255,0.04)" horizontal={false} />
                  <XAxis
                    type="number"
                    stroke="#64748b"
                    fontSize={10}
                    tickFormatter={(v) => formatCompactCurrency(Math.abs(v))}
                  />
                  <YAxis
                    type="category"
                    dataKey="name"
                    stroke="#64748b"
                    fontSize={10}
                    width={55}
                    tick={{ fill: '#94a3b8' }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'rgba(15, 23, 40, 0.95)',
                      border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: '12px',
                      backdropFilter: 'blur(12px)',
                    }}
                    formatter={(value: number) => [formatCurrency(Math.abs(value)), value < 0 ? 'Deduction' : 'Amount']}
                    labelFormatter={(label) => label.replace('\n', ' ')}
                  />
                  <Bar dataKey="value" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </motion.div>
          )}
          {chartView === 'brackets' && bracketData.length > 0 && (
            <motion.div
              key="brackets"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={bracketData} margin={{ left: 10, right: 10, top: 10, bottom: 24 }}>
                  <defs>
                    <linearGradient id="taxGradient" x1="0" x2="0" y1="0" y2="1">
                      <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.5} />
                      <stop offset="95%" stopColor="#f43f5e" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="rgba(255,255,255,0.04)" strokeDasharray="3 3" />
                  <XAxis
                    dataKey="name"
                    stroke="#64748b"
                    fontSize={9}
                    tickMargin={8}
                    interval={0}
                    tick={{ fill: '#64748b' }}
                  />
                  <YAxis
                    stroke="#64748b"
                    fontSize={10}
                    tickFormatter={(v) => formatCompactCurrency(v)}
                    width={50}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'rgba(15, 23, 40, 0.95)',
                      border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: '12px',
                      backdropFilter: 'blur(12px)',
                    }}
                    formatter={(value: number, name: string) => [
                      name === 'tax' ? formatCurrency(value) : `${value.toFixed(1)}%`,
                      name === 'tax' ? 'Tax' : 'Rate'
                    ]}
                    labelFormatter={(label) => label.replace('\n', ' to ')}
                  />
                  <Area
                    type="stepAfter"
                    dataKey="tax"
                    stroke="#f43f5e"
                    strokeWidth={2}
                    fill="url(#taxGradient)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}

function TaxScenarioForm({
  scenario,
  onScenarioChange,
  calculation,
}: {
  scenario: TaxScenario
  onScenarioChange: (updates: Partial<TaxScenario>) => void
  calculation: TaxCalculationResult
}) {
  const [currentStep, setCurrentStep] = useState<FormStep>('income')
  const currentStepIndex = FORM_STEPS.findIndex(s => s.id === currentStep)

  const goToNextStep = () => {
    const nextIndex = currentStepIndex + 1
    if (nextIndex < FORM_STEPS.length) {
      setCurrentStep(FORM_STEPS[nextIndex].id)
    }
  }

  const goToPrevStep = () => {
    const prevIndex = currentStepIndex - 1
    if (prevIndex >= 0) {
      setCurrentStep(FORM_STEPS[prevIndex].id)
    }
  }

  const handleAddIncome = () => {
    const newIncome: IncomeSource = {
      id: `income-${Date.now()}`,
      name: `Income Source ${scenario.incomeSources.length + 1}`,
      type: 'employment',
      grossAmount: 0,
      cpfDeducted: 0,
      bonus: 0,
    }
    onScenarioChange({
      incomeSources: [...scenario.incomeSources, newIncome],
    })
  }

  const handleUpdateIncome = (id: string, updates: Partial<IncomeSource>) => {
    onScenarioChange({
      incomeSources: scenario.incomeSources.map(s =>
        s.id === id ? { ...s, ...updates } : s
      ),
    })
  }

  const handleDeleteIncome = (id: string) => {
    onScenarioChange({
      incomeSources: scenario.incomeSources.filter(s => s.id !== id),
    })
  }

  const handleUpdateRelief = (id: string, claimedAmount: number) => {
    onScenarioChange({
      reliefs: scenario.reliefs.map(r =>
        r.id === id ? { ...r, claimedAmount } : r
      ),
    })
  }

  const getStepValidation = (index: number): boolean => {
    if (index === 0) return true
    if (index === 1) return scenario.incomeSources.length > 0
    if (index === 2) return scenario.incomeSources.length > 0
    return false
  }

  return (
    <div className="space-y-4">
      {/* Progress Tabs */}
      <div className="flex items-center gap-1 p-1.5 bg-white/[0.02] border border-white/[0.08] rounded-xl">
        {FORM_STEPS.map((step, index) => {
          const isActive = step.id === currentStep
          const isPast = index < currentStepIndex
          const isAccessible = getStepValidation(index)
          const isLocked = !isAccessible && index > currentStepIndex
          return (
            <button
              key={step.id}
              onClick={() => isAccessible && setCurrentStep(step.id)}
              disabled={isLocked}
              className={cn(
                "flex-1 flex items-center justify-center gap-1.5 py-2.5 px-2 rounded-lg text-xs font-medium transition-all duration-200",
                isActive
                  ? "bg-white/[0.12] text-white shadow-sm"
                  : isPast
                    ? "text-white/80 hover:bg-white/[0.05]"
                    : isLocked
                      ? "text-slate-600 cursor-not-allowed opacity-50"
                      : "text-slate-400 hover:text-slate-300 hover:bg-white/[0.03]"
              )}
            >
              <span className={cn(
                "w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-semibold",
                isActive
                  ? "bg-white/20 text-white"
                  : isPast
                    ? "bg-white/15 text-white"
                    : isLocked
                      ? "bg-white/[0.02] text-slate-600"
                      : "bg-white/[0.06] text-slate-400"
              )}>
                {isPast ? '✓' : index + 1}
              </span>
              <span className="hidden sm:inline">{step.label}</span>
            </button>
          )
        })}
      </div>

      {/* Step Content */}
      <div className="min-h-[380px]">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
          >
            {/* STEP 1: INCOME */}
            {currentStep === 'income' && (
              <div className="space-y-4">
                {/* Year and Residency */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-slate-400 block">Assessment Year</label>
                    <select
                      value={scenario.assessmentYear}
                      onChange={(e) => onScenarioChange({ assessmentYear: e.target.value as AssessmentYear })}
                      className="w-full rounded-xl bg-white/[0.03] border border-white/[0.06] text-white text-sm py-2.5 px-3 focus:outline-none focus:border-white/20 transition-colors appearance-none cursor-pointer"
                      style={{
                        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%2394a3b8'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`,
                        backgroundRepeat: 'no-repeat',
                        backgroundPosition: 'right 0.75rem center',
                        backgroundSize: '1rem'
                      }}
                    >
                      <option value="2024">YA 2024</option>
                      <option value="2025">YA 2025</option>
                      <option value="2026">YA 2026</option>
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-slate-400 block">Residency Status</label>
                    <select
                      value={scenario.residencyStatus}
                      onChange={(e) => onScenarioChange({ residencyStatus: e.target.value as TaxResidencyStatus })}
                      className="w-full rounded-xl bg-white/[0.03] border border-white/[0.06] text-white text-sm py-2.5 px-3 focus:outline-none focus:border-white/20 transition-colors appearance-none cursor-pointer"
                      style={{
                        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%2394a3b8'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`,
                        backgroundRepeat: 'no-repeat',
                        backgroundPosition: 'right 0.75rem center',
                        backgroundSize: '1rem'
                      }}
                    >
                      <option value="resident">Tax Resident</option>
                      <option value="non-resident">Non-Resident</option>
                      <option value="not-ordinarily-resident">Not Ordinarily Resident</option>
                    </select>
                  </div>
                </div>

                {/* Income Sources */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-medium text-white">Income Sources</h4>
                    <button
                      onClick={handleAddIncome}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-slate-300 text-xs font-medium transition-colors border border-white/[0.06]"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Add
                    </button>
                  </div>

                  {scenario.incomeSources.length === 0 ? (
                    <div className="p-8 rounded-xl border border-dashed border-white/[0.08] text-center">
                      <DollarSign className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                      <p className="text-sm text-slate-500">No income sources added</p>
                      <button
                        onClick={handleAddIncome}
                        className="mt-3 text-xs text-blue-400 hover:text-blue-300 transition-colors"
                      >
                        Add your first income source
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {scenario.incomeSources.map(source => (
                        <IncomeSourceCard
                          key={source.id}
                          source={source}
                          onUpdate={(updates) => handleUpdateIncome(source.id, updates)}
                          onDelete={() => handleDeleteIncome(source.id)}
                        />
                      ))}
                    </div>
                  )}
                </div>

                {/* Quick summary */}
                <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.06]">
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-slate-500">Total Gross Income</span>
                    <span className="text-sm font-medium text-white">{formatCurrency(calculation.grossIncome)}</span>
                  </div>
                </div>
              </div>
            )}

            {/* STEP 2: RELIEFS */}
            {currentStep === 'reliefs' && (
              <div className="space-y-4">
                {/* Relief cap info */}
                <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/20">
                  <div className="flex items-center gap-2">
                    <HelpCircle className="w-4 h-4 text-blue-400" />
                    <span className="text-xs text-blue-300">
                      Personal reliefs capped at {formatCurrency(PERSONAL_RELIEF_CAP)}
                    </span>
                  </div>
                </div>

                {/* Reliefs by category */}
                {RELIEF_CATEGORIES.map((category, index) => {
                  const categoryReliefs = scenario.reliefs.filter(r => r.category === category.id)
                  if (categoryReliefs.length === 0) return null

                  const categoryTotal = categoryReliefs.reduce((sum, r) => sum + r.claimedAmount, 0)
                  const colors: AccordionColor[] = ['blue', 'emerald', 'violet', 'amber']

                  return (
                    <FormAccordion
                      key={category.id}
                      title={category.label}
                      subtitle={categoryTotal > 0 ? formatCurrency(categoryTotal) : undefined}
                      defaultOpen={index === 0}
                      color={colors[index % colors.length]}
                      badge={
                        categoryTotal > 0 ? (
                          <span className="text-[10px] text-emerald-400 px-1.5 py-0.5 bg-emerald-500/10 rounded">
                            Active
                          </span>
                        ) : null
                      }
                    >
                      <div className="space-y-2">
                        {categoryReliefs.map(relief => (
                          <ReliefCard
                            key={relief.id}
                            relief={relief}
                            onUpdate={(amount) => handleUpdateRelief(relief.id, amount)}
                          />
                        ))}
                      </div>
                    </FormAccordion>
                  )
                })}

                {/* Total reliefs summary */}
                <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-emerald-300">Total Reliefs Claimed</span>
                    <span className="text-lg font-semibold text-emerald-400">
                      {formatCurrency(calculation.totalReliefs)}
                    </span>
                  </div>
                  {calculation.totalReliefs >= PERSONAL_RELIEF_CAP && (
                    <p className="text-[10px] text-emerald-400/70 mt-1">
                      Cap reached - additional reliefs will not reduce tax
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* STEP 3: SUMMARY */}
            {currentStep === 'summary' && (
              <div className="space-y-4">
                {/* Key metrics */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="p-4 rounded-xl bg-gradient-to-br from-rose-500/10 to-rose-600/5 border border-rose-500/20">
                    <span className="text-[10px] font-medium text-slate-500 uppercase tracking-wide block mb-1">Tax Payable</span>
                    <span className="text-xl font-semibold text-white">{formatCurrency(calculation.taxPayable)}</span>
                  </div>
                  <div className="p-4 rounded-xl bg-gradient-to-br from-emerald-500/10 to-emerald-600/5 border border-emerald-500/20">
                    <span className="text-[10px] font-medium text-slate-500 uppercase tracking-wide block mb-1">Effective Rate</span>
                    <span className="text-xl font-semibold text-emerald-400">{formatPercent(calculation.effectiveRate)}</span>
                  </div>
                  <div className="p-4 rounded-xl bg-gradient-to-br from-amber-500/10 to-amber-600/5 border border-amber-500/20">
                    <span className="text-[10px] font-medium text-slate-500 uppercase tracking-wide block mb-1">Marginal Rate</span>
                    <span className="text-xl font-semibold text-amber-400">{formatPercent(calculation.marginalRate)}</span>
                  </div>
                </div>

                {/* Visualization */}
                <div className="rounded-xl bg-black/20 p-4">
                  <TaxVisualization calculation={calculation} />
                </div>

                {/* Breakdown table */}
                <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] overflow-hidden">
                  <table className="w-full text-xs">
                    <tbody>
                      <tr className="border-b border-white/[0.04]">
                        <td className="px-4 py-3 text-slate-400">Gross Income</td>
                        <td className="px-4 py-3 text-right text-white font-medium">{formatCurrency(calculation.grossIncome)}</td>
                      </tr>
                      <tr className="border-b border-white/[0.04]">
                        <td className="px-4 py-3 text-slate-400">Less: CPF Contributions</td>
                        <td className="px-4 py-3 text-right text-slate-300">-{formatCurrency(calculation.totalDeductions)}</td>
                      </tr>
                      <tr className="border-b border-white/[0.04]">
                        <td className="px-4 py-3 text-slate-400">Assessable Income</td>
                        <td className="px-4 py-3 text-right text-white font-medium">{formatCurrency(calculation.assessableIncome)}</td>
                      </tr>
                      <tr className="border-b border-white/[0.04]">
                        <td className="px-4 py-3 text-slate-400">Less: Tax Reliefs</td>
                        <td className="px-4 py-3 text-right text-emerald-400">-{formatCurrency(calculation.totalReliefs)}</td>
                      </tr>
                      <tr className="border-b border-white/[0.04]">
                        <td className="px-4 py-3 text-slate-400">Chargeable Income</td>
                        <td className="px-4 py-3 text-right text-white font-medium">{formatCurrency(calculation.chargeableIncome)}</td>
                      </tr>
                      <tr className="bg-rose-500/5">
                        <td className="px-4 py-3 text-white font-medium">Tax Payable</td>
                        <td className="px-4 py-3 text-right text-rose-400 font-semibold">{formatCurrency(calculation.taxPayable)}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Navigation Buttons */}
      <div className="flex items-center justify-between pt-4 border-t border-white/[0.04]">
        <button
          onClick={goToPrevStep}
          disabled={currentStepIndex === 0}
          className={cn(
            "px-4 py-2.5 rounded-xl text-sm font-medium transition-all flex items-center gap-2",
            currentStepIndex === 0
              ? "text-slate-700 cursor-not-allowed"
              : "text-slate-400 hover:text-white hover:bg-white/[0.05] border border-white/[0.06]"
          )}
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>
        {currentStepIndex < FORM_STEPS.length - 1 ? (
          <button
            onClick={goToNextStep}
            className="px-5 py-2.5 rounded-xl text-sm font-semibold transition-all flex items-center gap-2 bg-white/[0.12] text-white hover:bg-white/[0.18] border border-white/[0.1]"
          >
            Next: {FORM_STEPS[currentStepIndex + 1].label}
            <ChevronRight className="w-4 h-4" />
          </button>
        ) : (
          <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-500/15 border border-emerald-500/20">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span className="text-sm text-emerald-400">Complete</span>
          </div>
        )}
      </div>
    </div>
  )
}

// ============================================
// MAIN VIEW
// ============================================

export function TaxPlannerV2View({ onClose }: { onClose?: () => void }) {
  const [scenarios, setScenarios] = useState<TaxScenario[]>([])
  const [editingScenarioId, setEditingScenarioId] = useState<string | null>(null)

  // Inline new row state
  const [isCreatingNew, setIsCreatingNew] = useState(false)
  const [newRowName, setNewRowName] = useState('')
  const [newRowYear, setNewRowYear] = useState<AssessmentYear>('2025')
  const [newRowIncome, setNewRowIncome] = useState('')

  const editingScenario = editingScenarioId
    ? scenarios.find(s => s.id === editingScenarioId)
    : null

  const handleStartNewRow = useCallback(() => {
    setNewRowName(`Tax Scenario ${scenarios.length + 1}`)
    setNewRowYear('2025')
    setNewRowIncome('80000')
    setIsCreatingNew(true)
  }, [scenarios.length])

  const handleConfirmNewRow = useCallback(() => {
    const income = parseInt(newRowIncome.replace(/[^0-9]/g, '')) || 80000
    const cpfDeducted = Math.min(Math.round(income * 0.2), 20400)

    const newScenario: TaxScenario = {
      ...getDefaultScenario(),
      id: `scenario-${Date.now()}`,
      name: newRowName || `Tax Scenario ${scenarios.length + 1}`,
      assessmentYear: newRowYear,
      incomeSources: [{
        id: 'income-1',
        name: 'Main Employment',
        type: 'employment',
        grossAmount: income,
        cpfDeducted,
        bonus: 0,
      }],
    }
    setScenarios(prev => [...prev, newScenario])
    setIsCreatingNew(false)
    setNewRowName('')
    setNewRowIncome('')
  }, [newRowName, newRowYear, newRowIncome, scenarios.length])

  const handleCancelNewRow = useCallback(() => {
    setIsCreatingNew(false)
    setNewRowName('')
    setNewRowIncome('')
  }, [])

  const handleEditScenario = useCallback((scenario: TaxScenario) => {
    setEditingScenarioId(scenario.id)
  }, [])

  const handleSaveAndClose = useCallback(() => {
    setEditingScenarioId(null)
  }, [])

  const handleDeleteScenario = useCallback((id: string) => {
    setScenarios(prev => prev.filter(s => s.id !== id))
  }, [])

  const handleToggleInclude = useCallback((id: string) => {
    setScenarios(prev => prev.map(s =>
      s.id === id ? { ...s, isIncluded: !s.isIncluded } : s
    ))
  }, [])

  const handleUpdateScenario = useCallback((updates: Partial<TaxScenario>) => {
    if (editingScenarioId) {
      setScenarios(prev => prev.map(s =>
        s.id === editingScenarioId ? { ...s, ...updates } : s
      ))
    }
  }, [editingScenarioId])

  const calculation = useMemo(() => {
    if (editingScenario) {
      return calculateTax(editingScenario)
    }
    return null
  }, [editingScenario])

  const isEmbedded = !!onClose

  return (
    <div className={cn("flex flex-col", isEmbedded ? "h-full" : "min-h-screen bg-gray-950")}>
      {/* Background gradients - standalone mode */}
      {!isEmbedded && (
        <>
          <div className="fixed inset-0 bg-gradient-to-br from-gray-950 via-gray-950 to-gray-900" />
          <div className="fixed inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(59,130,246,0.08),transparent)]" />
        </>
      )}

      {/* Header for embedded mode */}
      {isEmbedded && (
        <div className="flex items-center justify-between px-6 py-4 shrink-0">
          <h2 className="text-lg font-semibold text-white">Tax Scenarios</h2>
          <button
            onClick={onClose}
            className="flex items-center justify-center h-8 w-8 rounded-lg hover:bg-white/5 text-slate-400 hover:text-white transition"
            title="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      <div className={cn("relative", isEmbedded ? "flex-1 overflow-y-auto" : "z-10")}>
        <AnimatePresence mode="wait">
          {!editingScenario ? (
            <motion.div
              key="selection"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, y: -20 }}
              className={cn(
                "mx-auto px-6",
                isEmbedded ? "max-w-5xl py-8" : "max-w-6xl py-16"
              )}
            >
              {/* Back to Dashboard - standalone */}
              {!isEmbedded && (
                <motion.div
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.05 }}
                  className="mb-12"
                >
                  <Link
                    href="/dashboard"
                    className="inline-flex items-center gap-2 text-slate-500 hover:text-slate-300 transition-colors text-sm font-medium"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    Back to Dashboard
                  </Link>
                </motion.div>
              )}

              {/* Header - standalone */}
              {!isEmbedded && (
                <div className="mb-8">
                  <motion.h1
                    className="text-3xl md:text-4xl font-semibold text-white mb-2 tracking-tight"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                  >
                    Tax Scenarios
                  </motion.h1>
                  <motion.p
                    className="text-sm text-slate-500"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.15 }}
                  >
                    Plan and optimize your Singapore income tax
                  </motion.p>
                </div>
              )}

              {/* Scenario List */}
              <motion.div
                className="space-y-2"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
              >
                {/* Existing Scenarios */}
                {scenarios.map((scenario, index) => {
                  const scenarioCalc = calculateTax(scenario)
                  return (
                    <motion.div
                      key={scenario.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.05 * index }}
                      className={cn(
                        "group flex items-center gap-4 p-4 rounded-xl border transition-all cursor-pointer",
                        scenario.isIncluded
                          ? "bg-white/[0.03] border-white/[0.08] hover:bg-white/[0.05]"
                          : "bg-white/[0.01] border-white/[0.04] opacity-60 hover:opacity-80"
                      )}
                      onClick={() => handleEditScenario(scenario)}
                    >
                      {/* Include Toggle */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleToggleInclude(scenario.id)
                        }}
                        className={cn(
                          "w-5 h-5 rounded border-2 flex items-center justify-center transition-colors shrink-0",
                          scenario.isIncluded
                            ? "bg-emerald-500 border-emerald-500"
                            : "bg-transparent border-slate-600 hover:border-slate-500"
                        )}
                      >
                        {scenario.isIncluded && <Check className="w-3 h-3 text-white" />}
                      </button>

                      {/* Icon */}
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 bg-gradient-to-br from-blue-500/20 to-blue-600/5">
                        <Receipt className="w-5 h-5 text-blue-400" />
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="text-sm font-medium text-white truncate">
                            {scenario.name}
                          </span>
                          <span className="text-xs px-2 py-0.5 rounded-md text-blue-400 bg-white/[0.04]">
                            YA {scenario.assessmentYear}
                          </span>
                        </div>
                        <div className="text-xs text-slate-500">
                          Income: {formatCurrency(scenarioCalc.grossIncome)} · Tax: {formatCurrency(scenarioCalc.taxPayable)}
                        </div>
                      </div>

                      {/* Tax Summary */}
                      <div className="text-right hidden sm:block">
                        <div className="text-sm font-medium text-white">{formatCurrency(scenarioCalc.taxPayable)}</div>
                        <div className="text-xs text-emerald-400">{formatPercent(scenarioCalc.effectiveRate)} effective</div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            handleEditScenario(scenario)
                          }}
                          className="p-2 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
                          title="Edit details"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            handleDeleteScenario(scenario.id)
                          }}
                          className="p-2 rounded-lg hover:bg-white/10 text-slate-400 hover:text-red-400 transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </motion.div>
                  )
                })}

                {/* New row being created */}
                {isCreatingNew && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-center gap-4 p-4 rounded-xl border border-blue-500/30 bg-blue-500/5"
                  >
                    <div className="w-5 h-5 rounded border-2 border-slate-600 shrink-0" />
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 bg-gradient-to-br from-blue-500/20 to-blue-600/5">
                      <Receipt className="w-5 h-5 text-blue-400" />
                    </div>
                    <div className="flex-1 flex items-center gap-3">
                      <input
                        type="text"
                        value={newRowName}
                        onChange={(e) => setNewRowName(e.target.value)}
                        placeholder="Scenario name"
                        className="flex-1 bg-transparent text-sm text-white placeholder:text-slate-600 border-b border-white/10 focus:border-white/30 focus:outline-none py-1"
                        autoFocus
                      />
                      <select
                        value={newRowYear}
                        onChange={(e) => setNewRowYear(e.target.value as AssessmentYear)}
                        className="bg-white/5 text-xs text-white rounded-lg px-2 py-1.5 border border-white/10"
                      >
                        <option value="2024">YA 2024</option>
                        <option value="2025">YA 2025</option>
                        <option value="2026">YA 2026</option>
                      </select>
                      <div className="relative">
                        <span className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-500 text-xs">$</span>
                        <input
                          type="text"
                          inputMode="numeric"
                          value={newRowIncome}
                          onChange={(e) => setNewRowIncome(e.target.value.replace(/[^0-9]/g, ''))}
                          placeholder="Income"
                          className="w-28 bg-white/5 text-xs text-white rounded-lg pl-5 pr-2 py-1.5 border border-white/10 focus:outline-none focus:border-white/20"
                        />
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={handleConfirmNewRow}
                        className="p-2 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 transition-colors"
                        title="Confirm"
                      >
                        <Check className="w-4 h-4" />
                      </button>
                      <button
                        onClick={handleCancelNewRow}
                        className="p-2 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
                        title="Cancel"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </motion.div>
                )}

                {/* Add new scenario button */}
                {!isCreatingNew && (
                  <motion.button
                    onClick={handleStartNewRow}
                    className="w-full flex items-center justify-center gap-2 p-4 rounded-xl border border-dashed border-white/[0.08] text-slate-500 hover:text-slate-300 hover:border-white/[0.15] hover:bg-white/[0.02] transition-all"
                    whileHover={{ scale: 1.005 }}
                    whileTap={{ scale: 0.995 }}
                  >
                    <Plus className="w-4 h-4" />
                    <span className="text-sm font-medium">Add Tax Scenario</span>
                  </motion.button>
                )}
              </motion.div>

              {/* Summary comparison */}
              {scenarios.filter(s => s.isIncluded).length > 1 && (
                <motion.div
                  className="mt-8 p-6 rounded-2xl bg-white/[0.02] border border-white/[0.06]"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                >
                  <h3 className="text-sm font-medium text-white mb-4">Scenario Comparison</h3>
                  <div className="h-48">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={scenarios.filter(s => s.isIncluded).map(s => {
                          const calc = calculateTax(s)
                          return {
                            name: s.name,
                            tax: calc.taxPayable,
                            income: calc.grossIncome,
                          }
                        })}
                        margin={{ top: 5, right: 5, left: 5, bottom: 5 }}
                      >
                        <CartesianGrid stroke="rgba(255,255,255,0.04)" strokeDasharray="3 3" />
                        <XAxis dataKey="name" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => formatCompactCurrency(v)} />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: 'rgba(15, 23, 40, 0.95)',
                            border: '1px solid rgba(255,255,255,0.1)',
                            borderRadius: '12px',
                            backdropFilter: 'blur(12px)',
                          }}
                          labelStyle={{ color: '#fff' }}
                          formatter={(value: number) => [formatCurrency(value), 'Tax Payable']}
                        />
                        <Bar dataKey="tax" name="Tax Payable" fill="#f43f5e" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </motion.div>
              )}
            </motion.div>
          ) : (
            // Detail editing view - 2x2 Grid Layout
            <motion.div
              key="editor"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, y: 20 }}
              className={cn("mx-auto px-6", isEmbedded ? "max-w-4xl py-6" : "max-w-5xl py-12")}
            >
              {/* Back button */}
              <motion.button
                onClick={handleSaveAndClose}
                className="flex items-center gap-2 text-slate-500 hover:text-slate-300 transition-colors text-sm font-medium mb-6"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
              >
                <ArrowLeft className="w-4 h-4" />
                Back to Scenarios
              </motion.button>

              {/* 2x2 Grid Layout */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Left: Form */}
                <motion.div
                  className="rounded-2xl bg-white/[0.02] border border-white/[0.06] backdrop-blur-xl p-6"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                >
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-gradient-to-br from-blue-500/20 to-blue-600/5">
                      <Receipt className="w-5 h-5 text-blue-400" />
                    </div>
                    <div>
                      <input
                        type="text"
                        value={editingScenario.name}
                        onChange={(e) => handleUpdateScenario({ name: e.target.value })}
                        className="text-lg font-semibold text-white bg-transparent border-none focus:outline-none"
                      />
                      <p className="text-xs text-slate-500">YA {editingScenario.assessmentYear}</p>
                    </div>
                  </div>

                  <TaxScenarioForm
                    scenario={editingScenario}
                    onScenarioChange={handleUpdateScenario}
                    calculation={calculation!}
                  />
                </motion.div>

                {/* Right: Results Summary */}
                <motion.div
                  className="space-y-6"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                >
                  {/* Quick Stats */}
                  <div className="rounded-2xl bg-gradient-to-br from-blue-500/10 to-violet-500/5 border border-blue-500/20 p-6">
                    <h3 className="text-sm font-medium text-white mb-4">Tax Summary</h3>
                    <div className="space-y-4">
                      <div>
                        <span className="text-xs text-slate-500 block mb-1">Tax Payable</span>
                        <span className="text-3xl font-bold text-white">{formatCurrency(calculation?.taxPayable || 0)}</span>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <span className="text-xs text-slate-500 block mb-1">Effective Rate</span>
                          <span className="text-xl font-semibold text-emerald-400">{formatPercent(calculation?.effectiveRate || 0)}</span>
                        </div>
                        <div>
                          <span className="text-xs text-slate-500 block mb-1">Marginal Rate</span>
                          <span className="text-xl font-semibold text-amber-400">{formatPercent(calculation?.marginalRate || 0)}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Income Flow */}
                  <div className="rounded-2xl bg-white/[0.02] border border-white/[0.06] backdrop-blur-xl p-6">
                    <h3 className="text-sm font-medium text-white mb-4">Income Flow</h3>
                    <div className="space-y-3">
                      {[
                        { label: 'Gross Income', value: calculation?.grossIncome || 0, color: 'text-white' },
                        { label: 'CPF Contributions', value: -(calculation?.totalDeductions || 0), color: 'text-slate-300' },
                        { label: 'Tax Reliefs', value: -(calculation?.totalReliefs || 0), color: 'text-emerald-400' },
                        { label: 'Chargeable Income', value: calculation?.chargeableIncome || 0, color: 'text-white font-medium' },
                        { label: 'Tax Payable', value: calculation?.taxPayable || 0, color: 'text-rose-400 font-medium' },
                      ].map((item, index, arr) => (
                        <div
                          key={item.label}
                          className={cn(
                            "flex justify-between items-center py-2",
                            index < arr.length - 1 && "border-b border-white/[0.04]"
                          )}
                        >
                          <span className="text-sm text-slate-400">{item.label}</span>
                          <span className={cn("text-sm tabular-nums", item.color)}>
                            {item.value < 0 ? '-' : ''}{formatCurrency(Math.abs(item.value))}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Tax Optimization Tips */}
                  <div className="rounded-2xl bg-white/[0.02] border border-white/[0.06] backdrop-blur-xl p-6">
                    <h3 className="text-sm font-medium text-white mb-4 flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-amber-400" />
                      Optimization Tips
                    </h3>
                    <div className="space-y-3">
                      {calculation && calculation.totalReliefs < PERSONAL_RELIEF_CAP && (
                        <div className="flex items-start gap-3 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                          <TrendingUp className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />
                          <div>
                            <p className="text-xs font-medium text-emerald-300">Maximize Reliefs</p>
                            <p className="text-xs text-slate-400 mt-1">
                              You have {formatCurrency(PERSONAL_RELIEF_CAP - calculation.totalReliefs)} more relief capacity. Consider SRS or CPF top-ups.
                            </p>
                          </div>
                        </div>
                      )}
                      {editingScenario.reliefs.find(r => r.code === 'SRS')?.claimedAmount === 0 && (
                        <div className="flex items-start gap-3 p-3 rounded-xl bg-blue-500/10 border border-blue-500/20">
                          <PiggyBank className="w-4 h-4 text-blue-400 mt-0.5 shrink-0" />
                          <div>
                            <p className="text-xs font-medium text-blue-300">SRS Contribution</p>
                            <p className="text-xs text-slate-400 mt-1">
                              Contributing to SRS can reduce taxable income by up to $15,300.
                            </p>
                          </div>
                        </div>
                      )}
                      {calculation && calculation.marginalRate >= 0.15 && (
                        <div className="flex items-start gap-3 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20">
                          <Shield className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" />
                          <div>
                            <p className="text-xs font-medium text-amber-300">High Marginal Rate</p>
                            <p className="text-xs text-slate-400 mt-1">
                              At {formatPercent(calculation.marginalRate)}, each dollar of relief saves {formatPercent(calculation.marginalRate)} in tax.
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}

export default function TaxPlannerPage() {
  return <TaxPlannerV2View />
}

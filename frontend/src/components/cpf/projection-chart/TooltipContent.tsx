import { formatCurrency } from '@/lib/format'
import { CPF_CONSTANTS, CPF_POLICY_YEAR } from '@/lib/cpf-constants'
import type { VisibleAccounts, PayoutProjectionYear, PayoutPlan } from './types'
import { ACCOUNT_COLORS, THRESHOLD_COLORS } from './types'

/** Calculate projected retirement sums for a given year */
function calculateProjectedThresholds(year: number, frsGrowthRate: number) {
  const yearsFromPolicy = year - CPF_POLICY_YEAR
  const growthFactor = Math.pow(1 + frsGrowthRate, yearsFromPolicy)

  return {
    brs: Math.round(CPF_CONSTANTS.BRS * growthFactor),
    frs: Math.round(CPF_CONSTANTS.FRS * growthFactor),
    ers: Math.round(CPF_CONSTANTS.ERS * growthFactor),
    bhs: Math.round(CPF_CONSTANTS.BHS * growthFactor),
  }
}

interface BalanceTooltipProps {
  data: {
    age: number
    year: number
    oa: number
    sa: number | null
    ma: number
    ra: number | null
    total: number
    contributions: number
    interest: number
    retirementSavings?: number | null
  }
  visibleAccounts: VisibleAccounts
  /** FRS annual growth rate (default 3.5%) */
  frsGrowthRate?: number
}

export function BalanceTooltipContent({ data, visibleAccounts, frsGrowthRate = 0.035 }: BalanceTooltipProps) {
  const thresholds = calculateProjectedThresholds(data.year, frsGrowthRate)

  // Calculate retirement savings (OA + SA before 55, RA after 55)
  const retirementSavings = data.retirementSavings ?? (data.age < 55 ? (data.oa + (data.sa ?? 0)) : null)

  return (
    <div className="min-w-[240px] px-3 py-2 rounded-lg border border-white/10 bg-[#0f1728]/95 shadow-xl backdrop-blur">
      <p className="text-xs font-bold text-slate-400">
        Age {data.age} ({data.year})
      </p>

      {/* Account Balances */}
      <div className="mt-2 space-y-1">
        {visibleAccounts.oa && <TooltipRow label="OA" value={data.oa} color={ACCOUNT_COLORS.oa} />}
        {visibleAccounts.sa && data.sa !== null && (
          <TooltipRow label="SA" value={data.sa} color={ACCOUNT_COLORS.sa} />
        )}
        {visibleAccounts.ma && <TooltipRow label="MA" value={data.ma} color={ACCOUNT_COLORS.ma} />}
        {visibleAccounts.ra && data.ra !== null && data.ra > 0 && (
          <TooltipRow label="RA" value={data.ra} color={ACCOUNT_COLORS.ra} />
        )}
        <div className="border-t border-white/10 pt-1">
          <TooltipRow label="Total" value={data.total} color="#fff" bold />
        </div>
      </div>

      {/* Retirement Thresholds */}
      <div className="mt-2 pt-2 border-t border-white/10">
        <p className="text-[10px] text-slate-500 mb-1">Projected Targets ({data.year})</p>
        <div className="grid grid-cols-2 gap-x-3 gap-y-0.5">
          <ThresholdRow
            label="BRS"
            value={thresholds.brs}
            color={THRESHOLD_COLORS.brs}
            current={retirementSavings}
          />
          <ThresholdRow
            label="FRS"
            value={thresholds.frs}
            color={THRESHOLD_COLORS.frs}
            current={retirementSavings}
          />
          <ThresholdRow
            label="ERS"
            value={thresholds.ers}
            color={THRESHOLD_COLORS.ers}
            current={retirementSavings}
          />
          <ThresholdRow
            label="BHS"
            value={thresholds.bhs}
            color={THRESHOLD_COLORS.bhs}
            current={data.ma}
          />
        </div>
      </div>
    </div>
  )
}

interface PayoutTooltipProps {
  data: PayoutProjectionYear
  selectedPlan: PayoutPlan
}

export function PayoutTooltipContent({ data, selectedPlan }: PayoutTooltipProps) {
  const remainingBalance = data.remainingPremium + (selectedPlan === 'basic' ? data.remainingRA : 0)

  return (
    <div className="min-w-[220px] px-3 py-2 rounded-lg border border-white/10 bg-[#0f1728]/95 shadow-xl backdrop-blur">
      <p className="text-xs font-bold text-slate-400">
        Age {data.age} ({data.year})
      </p>
      <div className="mt-2 space-y-1">
        <PayoutRow label="Monthly Payout" value={data.monthlyPayout} color="#10b981" highlight />
        <div className="flex items-center justify-between gap-4 text-xs">
          <span className="text-slate-400">Annual</span>
          <span className="font-mono text-slate-300">{formatCurrency(data.annualPayout)}</span>
        </div>
      </div>

      <div className="mt-2 pt-2 border-t border-white/10 space-y-1">
        <PayoutRow label="Remaining Balance" value={remainingBalance} color="#8b5cf6" highlight />
        <div className="flex items-center justify-between gap-4 text-xs">
          <span className="text-slate-500">Total Received</span>
          <span className="font-mono text-slate-400">{formatCurrency(data.cumulativePayouts)}</span>
        </div>
        {selectedPlan === 'basic' && data.remainingRA > 0 && (
          <div className="flex items-center justify-between gap-4 text-xs">
            <span className="text-slate-500 pl-3">- RA Balance</span>
            <span className="font-mono text-slate-400">{formatCurrency(data.remainingRA)}</span>
          </div>
        )}
        <div className="flex items-center justify-between gap-4 text-xs pt-1 border-t border-white/5">
          <PayoutRow label="Bequest" value={data.bequestValue} color="#f59e0b" highlight />
        </div>
      </div>

      {selectedPlan === 'escalating' && (
        <p className="mt-2 text-xs text-slate-500">Payouts increase +2% annually</p>
      )}
    </div>
  )
}

function TooltipRow({
  label,
  value,
  color,
  bold,
}: {
  label: string
  value: number
  color: string
  bold?: boolean
}) {
  return (
    <div className="flex items-center justify-between gap-4 text-xs">
      <span className="flex items-center gap-1.5" style={{ color }}>
        <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: color }} />
        {label}
      </span>
      <span className={`font-mono ${bold ? 'font-semibold text-white' : 'text-slate-200'}`}>
        {formatCurrency(value)}
      </span>
    </div>
  )
}

function PayoutRow({
  label,
  value,
  color,
  highlight,
}: {
  label: string
  value: number
  color: string
  highlight?: boolean
}) {
  return (
    <div className="flex items-center justify-between gap-4 text-xs">
      <span className="flex items-center gap-1.5" style={{ color }}>
        <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: color }} />
        {label}
      </span>
      <span className={`font-mono ${highlight ? 'font-semibold' : ''}`} style={{ color }}>
        {formatCurrency(value)}
      </span>
    </div>
  )
}

/** Compact threshold row with progress indicator */
function ThresholdRow({
  label,
  value,
  color,
  current,
}: {
  label: string
  value: number
  color: string
  current: number | null
}) {
  const progress = current !== null ? Math.min(100, (current / value) * 100) : 0
  const isAchieved = progress >= 100

  return (
    <div className="text-[10px]">
      <div className="flex items-center justify-between gap-1">
        <span className="flex items-center gap-1" style={{ color }}>
          <span className="h-1 w-1 rounded-full" style={{ backgroundColor: color }} />
          {label}
        </span>
        <span className={`font-mono ${isAchieved ? 'text-emerald-400' : 'text-slate-400'}`}>
          {formatCurrency(value)}
        </span>
      </div>
      {current !== null && (
        <div className="mt-0.5 h-0.5 w-full rounded-full bg-white/10 overflow-hidden">
          <div
            className="h-full rounded-full transition-all"
            style={{
              width: `${progress}%`,
              backgroundColor: isAchieved ? '#10b981' : color,
            }}
          />
        </div>
      )}
    </div>
  )
}

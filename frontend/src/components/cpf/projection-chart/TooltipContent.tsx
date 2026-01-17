import { formatCurrency } from '@/lib/format'
import type { VisibleAccounts, PayoutProjectionYear, PayoutPlan } from './types'
import { ACCOUNT_COLORS } from './types'

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
  }
  visibleAccounts: VisibleAccounts
}

export function BalanceTooltipContent({ data, visibleAccounts }: BalanceTooltipProps) {
  return (
    <div className="min-w-[200px] px-3 py-2 rounded-lg border border-white/10 bg-[#0f1728]/95 shadow-xl backdrop-blur">
      <p className="text-xs font-bold text-slate-400">
        Age {data.age} ({data.year})
      </p>
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

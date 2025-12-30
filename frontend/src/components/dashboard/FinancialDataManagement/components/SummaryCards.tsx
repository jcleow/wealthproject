import clsx from 'clsx'
import { formatCurrency } from '@/lib/format'
import { numericStyles } from '@/lib/utils'
import type { MonthDetailResponseV2 } from '@/types/timeline'
import { parseDecimal } from '../converters'

interface SummaryCardsProps {
  netWorth: number
  annualSavings: number
  hasV2Data: boolean
  timelineMonthV2?: MonthDetailResponseV2
  compact?: boolean
}

export function SummaryCards({
  netWorth,
  annualSavings,
  hasV2Data,
  timelineMonthV2,
  compact = false,
}: SummaryCardsProps) {
  return (
    <div className={clsx(
      'grid',
      compact ? 'grid-cols-1 gap-3' : 'gap-4 md:grid-cols-2'
    )}>
      <NetWorthCard netWorth={netWorth} compact={compact} />
      <SavingsCard
        annualSavings={annualSavings}
        hasV2Data={hasV2Data}
        timelineMonthV2={timelineMonthV2}
        compact={compact}
      />
    </div>
  )
}

interface NetWorthCardProps {
  netWorth: number
  compact?: boolean
}

function NetWorthCard({ netWorth, compact = false }: NetWorthCardProps) {
  return (
    <div className={clsx(
      'rounded-2xl border border-white/[0.1] hover:border-white/[0.15] bg-[#0a0a0a]/60 transition-all',
      compact ? 'p-3' : 'p-4'
    )}>
      <div className="flex items-center justify-between">
        <div>
          <h4 className={clsx('font-medium text-slate-200', compact ? 'text-xs' : 'text-sm')}>Net Worth</h4>
          {!compact && <p className="text-xs text-slate-500">Assets minus liabilities</p>}
        </div>
        <div className="h-2 w-2 rounded-full bg-blue-400" />
      </div>
      <p className={clsx(
        'font-light tracking-tight text-slate-100',
        compact ? 'mt-2 text-lg' : 'mt-3 text-2xl'
      )}>
        {formatCurrency(netWorth)}
      </p>
    </div>
  )
}

interface SavingsCardProps {
  annualSavings: number
  hasV2Data: boolean
  timelineMonthV2?: MonthDetailResponseV2
  compact?: boolean
}

function SavingsCard({ annualSavings, hasV2Data, timelineMonthV2, compact = false }: SavingsCardProps) {
  const displaySavings = hasV2Data && timelineMonthV2
    ? parseDecimal(timelineMonthV2.netSavings)
    : annualSavings

  return (
    <div className={clsx(
      'rounded-2xl border border-white/[0.1] hover:border-white/[0.15] bg-[#0a0a0a]/60 transition-all',
      compact ? 'p-3' : 'p-4'
    )}>
      <div className="flex items-center justify-between">
        <div>
          <h4 className={clsx('font-medium text-slate-200', compact ? 'text-xs' : 'text-sm')}>Savings</h4>
          {!compact && <p className="text-xs text-slate-500">Income minus CPF minus expenses</p>}
        </div>
        <div className="h-2 w-2 rounded-full bg-emerald-400" />
      </div>
      <p className={clsx(
        'font-light tracking-tight text-slate-100',
        compact ? 'mt-2 text-lg' : 'mt-2 text-2xl'
      )}>
        {formatCurrency(displaySavings)}
      </p>
      {!compact && hasV2Data && timelineMonthV2 && (
        <SavingsBreakdown timelineMonthV2={timelineMonthV2} />
      )}
    </div>
  )
}

interface SavingsBreakdownProps {
  timelineMonthV2: MonthDetailResponseV2
}

function SavingsBreakdown({ timelineMonthV2 }: SavingsBreakdownProps) {
  const netCash = parseDecimal(timelineMonthV2.netCash)
  const netInvestments = parseDecimal(timelineMonthV2.netInvestments)

  return (
    <div className="mt-3 space-y-1.5 border-t border-white/[0.06] pt-3">
      <div className="flex items-center justify-between pl-3">
        <span className="text-sm text-slate-400">Net Cash</span>
        <span className={numericStyles.base}>
          {formatCurrency(netCash)}
        </span>
      </div>
      {netInvestments > 0 && (
        <div className="flex items-center justify-between pl-3">
          <span className="text-sm text-slate-400">Net Investments</span>
          <span className={numericStyles.base}>
            {formatCurrency(netInvestments)}
          </span>
        </div>
      )}
    </div>
  )
}

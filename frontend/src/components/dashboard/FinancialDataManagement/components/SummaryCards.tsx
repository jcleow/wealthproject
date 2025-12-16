import { formatCurrency } from '@/lib/format'
import type { MonthDetailResponseV2 } from '@/types/timeline'
import { parseDecimal } from '../converters'
import { numericStyles } from '../utils'

interface SummaryCardsProps {
  netWorth: number
  annualSavings: number
  hasV2Data: boolean
  timelineMonthV2?: MonthDetailResponseV2
}

export function SummaryCards({
  netWorth,
  annualSavings,
  hasV2Data,
  timelineMonthV2,
}: SummaryCardsProps) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <NetWorthCard netWorth={netWorth} />
      <SavingsCard
        annualSavings={annualSavings}
        hasV2Data={hasV2Data}
        timelineMonthV2={timelineMonthV2}
      />
    </div>
  )
}

interface NetWorthCardProps {
  netWorth: number
}

function NetWorthCard({ netWorth }: NetWorthCardProps) {
  return (
    <div className="rounded-2xl border border-white/[0.1] bg-[#0a0a0a]/60 p-4 transition-all hover:border-white/[0.15]">
      <div className="flex items-center justify-between">
        <div>
          <h4 className="text-sm font-medium text-slate-200">Net Worth</h4>
          <p className="text-xs text-slate-500">Assets minus liabilities</p>
        </div>
        <div className="h-2 w-2 rounded-full bg-blue-400" />
      </div>
      <p className="mt-3 text-2xl font-light tracking-tight text-slate-100">
        {formatCurrency(netWorth)}
      </p>
    </div>
  )
}

interface SavingsCardProps {
  annualSavings: number
  hasV2Data: boolean
  timelineMonthV2?: MonthDetailResponseV2
}

function SavingsCard({ annualSavings, hasV2Data, timelineMonthV2 }: SavingsCardProps) {
  const displaySavings = hasV2Data && timelineMonthV2
    ? parseDecimal(timelineMonthV2.netSavings)
    : annualSavings

  return (
    <div className="rounded-2xl border border-white/[0.1] bg-[#0a0a0a]/60 p-4 transition-all hover:border-white/[0.15]">
      <div className="flex items-center justify-between">
        <div>
          <h4 className="text-sm font-medium text-slate-200">Savings</h4>
          <p className="text-xs text-slate-500">Income minus CPF minus expenses</p>
        </div>
        <div className="h-2 w-2 rounded-full bg-emerald-400" />
      </div>
      <p className="mt-2 text-2xl font-light tracking-tight text-slate-100">
        {formatCurrency(displaySavings)}
      </p>
      {hasV2Data && timelineMonthV2 && (
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

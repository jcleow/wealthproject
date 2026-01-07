import { formatCurrency } from '@/lib/format'
import type { MonthDetailResponseV2 } from '@/types/timeline'
import { parseDecimal } from '../converters'

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
    <div className="grid grid-cols-2 gap-3">
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
    <div className="rounded-xl border border-white/[0.08] hover:border-white/[0.12] bg-[#0a0a0a]/40 transition-all px-3 py-2.5">
      <div className="flex items-center gap-2">
        <div className="h-1.5 w-1.5 rounded-full bg-blue-400 shrink-0" />
        <span className="text-xs font-medium text-slate-400">Net Worth</span>
      </div>
      <p className="mt-1 text-lg font-light tracking-tight text-slate-100">
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
    <div className="rounded-xl border border-white/[0.08] hover:border-white/[0.12] bg-[#0a0a0a]/40 transition-all px-3 py-2.5">
      <div className="flex items-center gap-2">
        <div className="h-1.5 w-1.5 rounded-full bg-emerald-400 shrink-0" />
        <span className="text-xs font-medium text-slate-400">Savings</span>
      </div>
      <p className="mt-1 text-lg font-light tracking-tight text-slate-100">
        {formatCurrency(displaySavings)}
      </p>
    </div>
  )
}

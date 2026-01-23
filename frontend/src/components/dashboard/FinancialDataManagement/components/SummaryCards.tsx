import clsx from 'clsx'
import { formatCurrency } from '@/lib/format'
import { useColorScheme } from '@/stores'
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
  const colorScheme = useColorScheme()
  const isMonet = colorScheme === 'monet'

  return (
    <div className={clsx(
      "rounded-2xl border p-3",
      isMonet
        ? "border-slate-200 bg-white shadow-sm"
        : "border-white/[0.08] bg-[#0a0a0a]/40"
    )}>
      <div className="grid grid-cols-2 gap-3">
        <NetWorthCard netWorth={netWorth} isMonet={isMonet} />
        <SavingsCard
          annualSavings={annualSavings}
          hasV2Data={hasV2Data}
          timelineMonthV2={timelineMonthV2}
          isMonet={isMonet}
        />
      </div>
    </div>
  )
}

interface NetWorthCardProps {
  netWorth: number
  isMonet: boolean
}

function NetWorthCard({ netWorth, isMonet }: NetWorthCardProps) {
  return (
    <div className={clsx(
      "rounded-xl border transition-all px-3 py-2.5",
      isMonet
        ? "border-slate-200 bg-white shadow-sm hover:shadow-md"
        : "border-white/[0.08] hover:border-white/[0.12] bg-[#0a0a0a]/40"
    )}>
      <div className="flex items-center gap-2">
        <div className="h-2 w-2 rounded-full shrink-0 bg-blue-500" />
        <span className={clsx(
          "text-[10px] font-medium uppercase tracking-wider",
          isMonet ? "text-slate-500" : "text-slate-400"
        )}>Net Worth</span>
      </div>
      <p className={clsx(
        "mt-1 text-xl font-semibold tracking-tight",
        isMonet ? "text-slate-800" : "text-slate-100"
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
  isMonet: boolean
}

function SavingsCard({ annualSavings, hasV2Data, timelineMonthV2, isMonet }: SavingsCardProps) {
  const displaySavings = hasV2Data && timelineMonthV2
    ? parseDecimal(timelineMonthV2.netSavings)
    : annualSavings

  return (
    <div className={clsx(
      "rounded-xl border transition-all px-3 py-2.5",
      isMonet
        ? "border-slate-200 bg-white shadow-sm hover:shadow-md"
        : "border-white/[0.08] hover:border-white/[0.12] bg-[#0a0a0a]/40"
    )}>
      <div className="flex items-center gap-2">
        <div className="h-2 w-2 rounded-full shrink-0 bg-emerald-500" />
        <span className={clsx(
          "text-[10px] font-medium uppercase tracking-wider",
          isMonet ? "text-slate-500" : "text-slate-400"
        )}>Savings</span>
      </div>
      <p className={clsx(
        "mt-1 text-xl font-semibold tracking-tight",
        isMonet ? "text-slate-800" : "text-slate-100"
      )}>
        {formatCurrency(displaySavings)}
      </p>
    </div>
  )
}

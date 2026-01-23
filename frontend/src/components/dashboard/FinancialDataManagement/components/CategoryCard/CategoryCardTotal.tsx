import { ArrowUpRight, ArrowDownRight } from 'lucide-react'
import clsx from 'clsx'
import { formatCurrency } from '@/lib/format'
import { useColorScheme } from '@/stores'
import type { FinancialCategory } from '../../types'

interface CategoryCardTotalProps {
  category: FinancialCategory
  total: number
  showMonthlyData: boolean
}

export function CategoryCardTotal({
  category,
  total,
  showMonthlyData,
}: CategoryCardTotalProps) {
  const colorScheme = useColorScheme()
  const isMonet = colorScheme === 'monet'

  // Mock trend (you may want to calculate real trends)
  const mockTrend = category === 'asset' ? 12.5 : category === 'income' ? 5.2 : category === 'liability' ? -2.1 : 1.2
  const isPositiveTrend = mockTrend >= 0
  const showMonthSuffix = showMonthlyData && (category === 'income' || category === 'expense')

  return (
    <div className={clsx(
      "border-b px-4 py-2.5",
      isMonet ? "border-slate-200/60" : "border-white/[0.04]"
    )}>
      <div className="flex items-baseline gap-1.5">
        <div className={clsx(
          "text-2xl font-light tracking-tight",
          isMonet ? "text-slate-700" : "text-slate-100"
        )}>
          {formatCurrency(total)}
        </div>
        {showMonthSuffix && (
          <span className={clsx("text-xs", isMonet ? "text-slate-500" : "text-slate-400")}>/mo</span>
        )}
      </div>
      <div className="mt-1 flex items-center gap-2">
        <div className={clsx(
          "flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider",
          isPositiveTrend
            ? (isMonet ? "bg-emerald-100 text-emerald-700" : "bg-emerald-500/15 text-emerald-400")
            : (isMonet ? "bg-rose-100 text-rose-700" : "bg-rose-500/15 text-rose-400")
        )}>
          {isPositiveTrend ? <ArrowUpRight className="h-2.5 w-2.5" /> : <ArrowDownRight className="h-2.5 w-2.5" />}
          {Math.abs(mockTrend)}%
        </div>
        <span className={clsx("text-sm", isMonet ? "text-slate-500" : "text-slate-500")}>vs last month</span>
      </div>
    </div>
  )
}

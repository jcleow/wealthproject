import { ArrowUpRight, ArrowDownRight } from 'lucide-react'
import { formatCurrency } from '@/lib/format'
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
  // Mock trend (you may want to calculate real trends)
  const mockTrend = category === 'asset' ? 12.5 : category === 'income' ? 5.2 : category === 'liability' ? -2.1 : 1.2
  const isPositiveTrend = mockTrend >= 0
  const showMonthSuffix = showMonthlyData && (category === 'income' || category === 'expense')

  return (
    <div className="border-b border-white/[0.04] px-4 py-2.5">
      <div className="flex items-baseline gap-1.5">
        <div className="text-2xl font-light tracking-tight text-slate-100">
          {formatCurrency(total)}
        </div>
        {showMonthSuffix && (
          <span className="text-xs text-slate-400">/mo</span>
        )}
      </div>
      <div className="mt-1 flex items-center gap-2">
        <div className={`flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${isPositiveTrend ? 'bg-emerald-500/15 text-emerald-400' : 'bg-rose-500/15 text-rose-400'}`}>
          {isPositiveTrend ? <ArrowUpRight className="h-2.5 w-2.5" /> : <ArrowDownRight className="h-2.5 w-2.5" />}
          {Math.abs(mockTrend)}%
        </div>
        <span className="text-sm text-slate-500">vs last month</span>
      </div>
    </div>
  )
}

import type { PayoutPlan } from './types'

interface PayoutLegendProps {
  selectedPlan: PayoutPlan
}

export function PayoutLegend({ selectedPlan }: PayoutLegendProps) {
  const planLabel = selectedPlan.charAt(0).toUpperCase() + selectedPlan.slice(1)

  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center gap-1.5">
        <div className="h-2 w-2 rounded-full bg-emerald-500" />
        <span className="text-xs text-slate-400">{planLabel} Plan</span>
      </div>
    </div>
  )
}

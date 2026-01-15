import type { ChartView } from './types'

interface ChartViewToggleProps {
  value: ChartView
  onChange: (view: ChartView) => void
}

export function ChartViewToggle({ value, onChange }: ChartViewToggleProps) {
  return (
    <div className="flex rounded-lg bg-white/[0.03] p-0.5 border border-white/[0.06]">
      <ToggleButton
        label="Balance"
        isActive={value === 'balance'}
        onClick={() => onChange('balance')}
      />
      <ToggleButton
        label="Payout"
        isActive={value === 'payout'}
        onClick={() => onChange('payout')}
      />
    </div>
  )
}

function ToggleButton({
  label,
  isActive,
  onClick,
}: {
  label: string
  isActive: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all duration-150 ${
        isActive ? 'bg-white/[0.1] text-white shadow-sm' : 'text-slate-500 hover:text-slate-300'
      }`}
    >
      {label}
    </button>
  )
}

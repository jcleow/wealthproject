import type { AxisMode } from './types'

export interface AxisModeToggleProps {
  mode: AxisMode
  onToggle: () => void
}

/**
 * Toggle button to switch between 'age' and 'year' display modes on the X-axis.
 */
export function AxisModeToggle({ mode, onToggle }: AxisModeToggleProps) {
  return (
    <div className="mt-2 text-center text-xs text-slate-300">
      <button
        type="button"
        className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-slate-200 transition hover:bg-white/10"
        onClick={onToggle}
      >
        {mode === 'age' ? 'Age' : 'Year'}
      </button>
    </div>
  )
}

import clsx from 'clsx'
import { useColorScheme } from '@/stores'
import type { AxisMode } from './types'

export interface AxisModeToggleProps {
  mode: AxisMode
  onToggle: () => void
}

/**
 * Toggle button to switch between 'age' and 'year' display modes on the X-axis.
 */
export function AxisModeToggle({ mode, onToggle }: AxisModeToggleProps) {
  const colorScheme = useColorScheme()
  const isMonet = colorScheme === 'monet'

  return (
    <div className={clsx(
      "mt-2 text-center text-xs",
      isMonet ? "text-slate-500" : "text-slate-300"
    )}>
      <button
        type="button"
        className={clsx(
          "rounded-full border px-4 py-1.5 transition tracking-widest text-xs font-medium",
          isMonet
            ? "border-slate-200 bg-white text-slate-600 hover:bg-slate-50 shadow-sm"
            : "border-white/10 bg-white/5 text-slate-200 hover:bg-white/10"
        )}
        onClick={onToggle}
      >
        {mode === 'age' ? 'AGE' : 'YEAR'}
      </button>
    </div>
  )
}

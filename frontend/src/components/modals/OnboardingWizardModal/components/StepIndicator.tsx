import { cn } from '@/lib/utils'
import { ONBOARDING_STEPS, type StepStatus } from '../types'

interface StepIndicatorProps {
  currentStepIndex: number
  stepStatuses: StepStatus[]
  onStepClick: (stepIndex: number) => void
  isMonet: boolean
}

export function StepIndicator({ currentStepIndex, stepStatuses, onStepClick, isMonet }: StepIndicatorProps) {
  return (
    <div className="flex items-center gap-1 py-3 px-4 sm:px-6 flex-wrap">
      {ONBOARDING_STEPS.map((step, index) => {
        const status = stepStatuses[index]
        const isActive = index === currentStepIndex
        const isClickable = status === 'completed' || status === 'skipped'

        return (
          <button
            key={step.key}
            type="button"
            onClick={() => isClickable && onStepClick(index)}
            disabled={!isClickable && !isActive}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 whitespace-nowrap',
              // Active step: filled pill
              isActive && !isMonet && 'bg-white/[0.1] text-white border border-white/[0.1]',
              isActive && isMonet && 'bg-[var(--monet-sage)]/10 text-[var(--monet-text-primary)] border border-[var(--monet-sage)]/20',
              // Completed/skipped steps: dot + text
              (status === 'completed' || status === 'skipped') && !isMonet && 'text-emerald-400 hover:bg-white/[0.05] cursor-pointer',
              (status === 'completed' || status === 'skipped') && isMonet && 'text-[var(--monet-sage)] hover:bg-[var(--monet-sage)]/5 cursor-pointer',
              // Pending steps: muted
              status === 'pending' && !isActive && !isMonet && 'text-slate-600 cursor-default',
              status === 'pending' && !isActive && isMonet && 'text-[var(--monet-text-muted)] cursor-default',
            )}
          >
            {/* Status dot */}
            {(status === 'completed' || status === 'skipped') && (
              <span
                className={cn(
                  'w-1.5 h-1.5 rounded-full flex-shrink-0',
                  status === 'completed' && !isMonet && 'bg-emerald-400',
                  status === 'completed' && isMonet && 'bg-[var(--monet-sage)]',
                  status === 'skipped' && 'bg-amber-400',
                )}
              />
            )}
            {step.label}
          </button>
        )
      })}
    </div>
  )
}

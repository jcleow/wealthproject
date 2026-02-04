import { Check, Minus } from 'lucide-react'
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
    <div className="flex items-center justify-center gap-0 py-4 px-6">
      {ONBOARDING_STEPS.map((step, index) => {
        const status = stepStatuses[index]
        const isActive = index === currentStepIndex
        const isClickable = status === 'completed' || status === 'skipped'

        return (
          <div key={step.key} className="flex items-center">
            {/* Step circle + label */}
            <button
              type="button"
              onClick={() => isClickable && onStepClick(index)}
              disabled={!isClickable}
              className={cn(
                'flex flex-col items-center gap-1.5 group',
                isClickable ? 'cursor-pointer' : 'cursor-default'
              )}
            >
              {/* Circle */}
              <div
                className={cn(
                  'flex items-center justify-center w-8 h-8 rounded-full text-xs font-semibold transition-all duration-200',
                  isActive && !isMonet && 'border-2 border-emerald-400 bg-emerald-500/15 text-white',
                  isActive && isMonet && 'border-2 border-[var(--monet-sage)] bg-[var(--monet-sage)]/15 text-[var(--monet-text-primary)]',
                  status === 'completed' && !isMonet && 'bg-emerald-500 text-white',
                  status === 'completed' && isMonet && 'bg-[var(--monet-sage)] text-white',
                  status === 'skipped' && !isMonet && 'bg-amber-500/80 text-white',
                  status === 'skipped' && isMonet && 'bg-amber-500/60 text-white',
                  status === 'pending' && !isMonet && 'border border-slate-600 text-slate-600',
                  status === 'pending' && isMonet && 'border border-[var(--monet-lavender)]/30 text-[var(--monet-text-muted)]',
                )}
              >
                {status === 'completed' ? (
                  <Check className="w-4 h-4" />
                ) : status === 'skipped' ? (
                  <Minus className="w-4 h-4" />
                ) : (
                  index + 1
                )}
              </div>

              {/* Label */}
              <span
                className={cn(
                  'text-[10px] font-medium whitespace-nowrap transition-colors',
                  isActive && !isMonet && 'text-white',
                  isActive && isMonet && 'text-[var(--monet-text-primary)]',
                  (status === 'completed' || status === 'skipped') && !isMonet && 'text-slate-400 group-hover:text-slate-300',
                  (status === 'completed' || status === 'skipped') && isMonet && 'text-[var(--monet-text-secondary)] group-hover:text-[var(--monet-text-primary)]',
                  status === 'pending' && !isMonet && 'text-slate-600',
                  status === 'pending' && isMonet && 'text-[var(--monet-text-muted)]',
                )}
              >
                {step.label}
              </span>
            </button>

            {/* Connector line between steps */}
            {index < ONBOARDING_STEPS.length - 1 && (
              <div
                className={cn(
                  'w-12 sm:w-20 h-px mx-2 mt-[-18px]',
                  (status === 'completed' || status === 'skipped')
                    ? isMonet ? 'bg-[var(--monet-sage)]/40' : 'bg-emerald-500/40'
                    : isMonet ? 'bg-[var(--monet-lavender)]/15' : 'bg-white/[0.06]'
                )}
              />
            )}
          </div>
        )
      })}
    </div>
  )
}

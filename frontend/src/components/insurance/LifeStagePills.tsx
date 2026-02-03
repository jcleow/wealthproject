'use client'

import { cn } from '@/lib/utils'
import {
  type LifeStage,
  LIFE_STAGE_INFO,
  getLifeStageEmoji,
} from '@/lib/coverage-journey-utils'

// =============================================================================
// Types
// =============================================================================

interface LifeStagePillsProps {
  currentStage: LifeStage
  onStageClick?: (stage: LifeStage) => void
  showDescriptions?: boolean
  className?: string
}

// =============================================================================
// Constants
// =============================================================================

const STAGE_ORDER: LifeStage[] = [
  'young_professional',
  'new_parent',
  'growing_family',
  'empty_nester',
  'retired',
]

// =============================================================================
// Component
// =============================================================================

export function LifeStagePills({
  currentStage,
  onStageClick,
  showDescriptions = true,
  className,
}: LifeStagePillsProps) {
  const currentInfo = LIFE_STAGE_INFO[currentStage]

  return (
    <div className={cn('space-y-4', className)}>
      {/* Stage Pills */}
      <div className="flex flex-wrap items-center gap-2">
        {STAGE_ORDER.map((stage) => {
          const info = LIFE_STAGE_INFO[stage]
          const isCurrent = stage === currentStage
          const emoji = getLifeStageEmoji(stage)

          return (
            <button
              key={stage}
              type="button"
              onClick={() => onStageClick?.(stage)}
              disabled={!onStageClick}
              className={cn(
                'flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-all duration-200',
                isCurrent
                  ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                  : 'bg-white/[0.03] text-slate-400 border border-white/[0.06] hover:bg-white/[0.05] hover:text-slate-300',
                !onStageClick && 'cursor-default'
              )}
            >
              <span className="text-base">{emoji}</span>
              <span>{info.label}</span>
              {isCurrent && (
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              )}
            </button>
          )
        })}
      </div>

      {/* Current Stage Description */}
      {showDescriptions && (
        <div className="px-4 py-3 rounded-xl bg-white/[0.02] border border-white/[0.06]">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-lg">{getLifeStageEmoji(currentStage)}</span>
            <span className="text-sm font-medium text-white">
              You&apos;re in: {currentInfo.label}
            </span>
          </div>
          <p className="text-sm text-slate-400">
            {currentInfo.description}
          </p>
        </div>
      )}
    </div>
  )
}

// =============================================================================
// Compact Variant (for header use)
// =============================================================================

interface LifeStageIndicatorProps {
  stage: LifeStage
  className?: string
}

export function LifeStageIndicator({ stage, className }: LifeStageIndicatorProps) {
  const info = LIFE_STAGE_INFO[stage]
  const emoji = getLifeStageEmoji(stage)

  return (
    <div
      className={cn(
        'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium',
        'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
        className
      )}
    >
      <span>{emoji}</span>
      <span>{info.label}</span>
    </div>
  )
}

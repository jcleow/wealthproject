'use client'

import { Plus, Pencil, Trash2, RotateCcw } from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatCoverageAmount } from '@/lib/coverage-journey-utils'
import type { CoverageControlPoint, InterpolationMode } from '@/types/insurance'

// =============================================================================
// Types
// =============================================================================

interface ControlPointsPanelProps {
  controlPoints: CoverageControlPoint[]
  interpolationMode: InterpolationMode
  showRecommendedBaseline: boolean
  onAddPoint: () => void
  onEditPoint: (point: CoverageControlPoint) => void
  onDeletePoint: (id: string) => void
  onInterpolationModeChange: (mode: InterpolationMode) => void
  onShowBaselineChange: (show: boolean) => void
  onResetAll: () => void
  className?: string
}

// Monet-inspired colors (matching insurance planner)
const monetColors = {
  lavender: '#9B8BB4',
  lavenderLight: '#C4B8D9',
  lavenderDark: '#7A6B94',
  coralRose: '#E8A898',
  sage: '#7FB285',
  sunlightGold: '#D4C5A9',
  textPrimary: '#3D3D3D',
  textSecondary: '#6B6B6B',
  textMuted: '#9B9B9B',
  shadowSoft: 'rgba(155, 139, 180, 0.12)',
}

// =============================================================================
// Component
// =============================================================================

export function ControlPointsPanel({
  controlPoints,
  interpolationMode,
  showRecommendedBaseline,
  onAddPoint,
  onEditPoint,
  onDeletePoint,
  onInterpolationModeChange,
  onShowBaselineChange,
  onResetAll,
  className,
}: ControlPointsPanelProps) {
  const sortedPoints = [...controlPoints].sort((a, b) => a.age - b.age)

  return (
    <div className={cn('space-y-4', className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3
            className="text-sm font-semibold"
            style={{ color: monetColors.textPrimary }}
          >
            Control Points
          </h3>
          <p className="text-xs mt-0.5" style={{ color: monetColors.textMuted }}>
            {controlPoints.length === 0
              ? 'Add points to customize your coverage plan'
              : `${controlPoints.length} point${controlPoints.length !== 1 ? 's' : ''} defined`}
          </p>
        </div>
        <button
          type="button"
          onClick={onAddPoint}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 hover:scale-105"
          style={{
            background: `linear-gradient(135deg, ${monetColors.lavender}, ${monetColors.lavenderDark})`,
            color: 'white',
            boxShadow: `0 2px 8px ${monetColors.shadowSoft}`,
          }}
        >
          <Plus className="h-3.5 w-3.5" />
          Add Point
        </button>
      </div>

      {/* Control Points List */}
      {sortedPoints.length > 0 ? (
        <div className="space-y-2">
          {sortedPoints.map((point) => (
            <ControlPointCard
              key={point.id}
              point={point}
              onEdit={() => onEditPoint(point)}
              onDelete={() => onDeletePoint(point.id)}
            />
          ))}
        </div>
      ) : (
        <EmptyState onAddPoint={onAddPoint} />
      )}

      {/* Settings */}
      {controlPoints.length > 0 && (
        <div
          className="pt-3 border-t space-y-3"
          style={{ borderColor: 'rgba(155, 139, 180, 0.15)' }}
        >
          {/* Interpolation Mode */}
          <div className="flex items-center justify-between">
            <span className="text-xs" style={{ color: monetColors.textSecondary }}>
              Interpolation
            </span>
            <div
              className="flex rounded-lg p-0.5"
              style={{
                background: 'rgba(155, 139, 180, 0.1)',
                border: '1px solid rgba(155, 139, 180, 0.15)',
              }}
            >
              {(['linear', 'smooth', 'step'] as InterpolationMode[]).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => onInterpolationModeChange(mode)}
                  className="px-2.5 py-1 rounded-md text-xs font-medium transition-all duration-150"
                  style={{
                    background:
                      interpolationMode === mode
                        ? 'white'
                        : 'transparent',
                    color:
                      interpolationMode === mode
                        ? monetColors.lavenderDark
                        : monetColors.textMuted,
                    boxShadow:
                      interpolationMode === mode
                        ? `0 1px 3px ${monetColors.shadowSoft}`
                        : 'none',
                  }}
                >
                  {mode.charAt(0).toUpperCase() + mode.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {/* Show Baseline Toggle */}
          <div className="flex items-center justify-between">
            <span className="text-xs" style={{ color: monetColors.textSecondary }}>
              Show recommended baseline
            </span>
            <button
              type="button"
              onClick={() => onShowBaselineChange(!showRecommendedBaseline)}
              className="relative w-10 h-5 rounded-full transition-colors duration-200"
              style={{
                background: showRecommendedBaseline
                  ? monetColors.sage
                  : 'rgba(155, 139, 180, 0.2)',
              }}
            >
              <div
                className="absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform duration-200"
                style={{
                  transform: showRecommendedBaseline
                    ? 'translateX(22px)'
                    : 'translateX(2px)',
                }}
              />
            </button>
          </div>

          {/* Reset Button */}
          <button
            type="button"
            onClick={onResetAll}
            className="flex items-center gap-1.5 text-xs transition-colors duration-200 hover:opacity-80"
            style={{ color: monetColors.coralRose }}
          >
            <RotateCcw className="h-3 w-3" />
            Reset to recommended
          </button>
        </div>
      )}
    </div>
  )
}

// =============================================================================
// Sub-components
// =============================================================================

function ControlPointCard({
  point,
  onEdit,
  onDelete,
}: {
  point: CoverageControlPoint
  onEdit: () => void
  onDelete: () => void
}) {
  const hasLifeTpd = point.lifeTpd !== null
  const hasCriticalIllness = point.criticalIllness !== null
  const hasPersonalAccident = point.personalAccident !== null

  return (
    <div
      className="px-3 py-2.5 rounded-xl transition-all duration-200 hover:shadow-sm group"
      style={{
        background: 'rgba(255, 255, 255, 0.7)',
        border: '1px solid rgba(155, 139, 180, 0.15)',
      }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          {/* Age badge */}
          <div className="flex items-center gap-2 mb-1.5">
            <span
              className="px-2 py-0.5 rounded-md text-xs font-semibold"
              style={{
                background: `${monetColors.lavender}20`,
                color: monetColors.lavenderDark,
              }}
            >
              Age {point.age}
            </span>
          </div>

          {/* Coverage values */}
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs">
            {hasLifeTpd && (
              <span style={{ color: monetColors.textSecondary }}>
                <span style={{ color: monetColors.sage }}>Life/TPD:</span>{' '}
                {formatCoverageAmount(point.lifeTpd!)}
              </span>
            )}
            {hasCriticalIllness && (
              <span style={{ color: monetColors.textSecondary }}>
                <span style={{ color: '#3B82F6' }}>CI:</span>{' '}
                {formatCoverageAmount(point.criticalIllness!)}
              </span>
            )}
            {hasPersonalAccident && (
              <span style={{ color: monetColors.textSecondary }}>
                <span style={{ color: '#A855F7' }}>PA:</span>{' '}
                {formatCoverageAmount(point.personalAccident!)}
              </span>
            )}
            {!hasLifeTpd && !hasCriticalIllness && !hasPersonalAccident && (
              <span style={{ color: monetColors.textMuted }}>
                Using recommended values
              </span>
            )}
          </div>

          {/* Reason */}
          {point.reason && (
            <p
              className="text-xs mt-1.5 line-clamp-1"
              style={{ color: monetColors.textMuted }}
            >
              &ldquo;{point.reason}&rdquo;
            </p>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            type="button"
            onClick={onEdit}
            className="p-1.5 rounded-lg transition-colors duration-150 hover:bg-white/80"
            style={{ color: monetColors.textMuted }}
            title="Edit"
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={onDelete}
            className="p-1.5 rounded-lg transition-colors duration-150 hover:bg-white/80"
            style={{ color: monetColors.coralRose }}
            title="Delete"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  )
}

function EmptyState({ onAddPoint }: { onAddPoint: () => void }) {
  return (
    <div
      className="py-6 px-4 rounded-xl text-center"
      style={{
        background: 'rgba(155, 139, 180, 0.05)',
        border: '1px dashed rgba(155, 139, 180, 0.2)',
      }}
    >
      <div
        className="w-10 h-10 mx-auto mb-3 rounded-full flex items-center justify-center"
        style={{ background: `${monetColors.lavender}15` }}
      >
        <Plus className="h-5 w-5" style={{ color: monetColors.lavender }} />
      </div>
      <p className="text-sm font-medium mb-1" style={{ color: monetColors.textPrimary }}>
        No control points yet
      </p>
      <p className="text-xs mb-3" style={{ color: monetColors.textMuted }}>
        Add control points to define custom coverage<br />targets at specific ages
      </p>
      <button
        type="button"
        onClick={onAddPoint}
        className="text-xs font-medium px-3 py-1.5 rounded-lg transition-colors duration-200"
        style={{
          background: `${monetColors.lavender}15`,
          color: monetColors.lavenderDark,
        }}
      >
        Add your first point
      </button>
    </div>
  )
}

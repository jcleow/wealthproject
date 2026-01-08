'use client'

import { Shield, CheckCircle2, AlertCircle, Circle, Info } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { RiskCoverageSummary } from '@/types/insurance'
import { riskLayerConfig } from '@/types/insurance'
import { RiskLayerCard } from './RiskLayerCard'

interface RiskCoverageSummaryCardProps {
  summary: RiskCoverageSummary
  className?: string
}

/**
 * RiskCoverageSummaryCard - Replaces the misleading ProtectionScoreCard
 *
 * Instead of showing "47% Protected" (which is actuarially meaningless),
 * this shows "3 of 5 risk areas covered" with categorical status per layer.
 *
 * Key design decisions:
 * - No single percentage score (cannot combine insurance categories)
 * - Each risk layer has independent status (covered/partial/exposed)
 * - Neutral tone - no alarmist language or red colors
 * - Engineering-style diagnosis, not sales manipulation
 */
export function RiskCoverageSummaryCard({
  summary,
  className,
}: RiskCoverageSummaryCardProps) {
  return (
    <div
      className={cn(
        'rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6',
        className
      )}
    >
      {/* Header with summary */}
      <div className="mb-6">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-500/15">
            <Shield className="h-6 w-6 text-blue-400" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-white">
              Risk Protection Status
            </h2>
            <p className="text-slate-400">
              <span className="font-medium text-white">
                {summary.coveredCount} of {summary.totalLayers}
              </span>{' '}
              risk areas covered
            </p>
          </div>
        </div>
      </div>

      {/* Status summary chips */}
      <div className="mb-6 flex flex-wrap gap-2">
        {summary.coveredCount > 0 && (
          <div className="flex items-center gap-1.5 rounded-full bg-emerald-500/15 px-3 py-1.5 text-xs font-medium text-emerald-400">
            <CheckCircle2 className="h-3.5 w-3.5" />
            {summary.coveredCount} Covered
          </div>
        )}
        {summary.partialCount > 0 && (
          <div className="flex items-center gap-1.5 rounded-full bg-amber-500/15 px-3 py-1.5 text-xs font-medium text-amber-400">
            <AlertCircle className="h-3.5 w-3.5" />
            {summary.partialCount} Partial
          </div>
        )}
        {summary.exposedCount > 0 && (
          <div className="flex items-center gap-1.5 rounded-full bg-slate-500/15 px-3 py-1.5 text-xs font-medium text-slate-400">
            <Circle className="h-3.5 w-3.5" />
            {summary.exposedCount} Exposed
          </div>
        )}
      </div>

      {/* Risk layers list */}
      <div className="space-y-3">
        {summary.layers.map((layer) => (
          <RiskLayerCard
            key={layer.layer}
            layerStatus={layer}
            defaultExpanded={false}
          />
        ))}
      </div>

      {/* Educational note - neutral, not alarmist */}
      <div className="mt-6 flex items-start gap-2 rounded-xl bg-blue-500/5 border border-blue-500/10 p-3">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-blue-400" />
        <p className="text-xs text-slate-400">
          Each risk area is independent. Being covered in one area doesn't
          offset exposure in another. Focus on areas marked "Exposed" or
          "Partial" based on your personal circumstances.
        </p>
      </div>
    </div>
  )
}

// Compact header version for use at top of page
export function RiskCoverageHeader({
  summary,
  className,
}: RiskCoverageSummaryCardProps) {
  return (
    <div
      className={cn(
        'flex items-center justify-between rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4',
        className
      )}
    >
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/15">
          <Shield className="h-5 w-5 text-blue-400" />
        </div>
        <div>
          <p className="text-sm text-slate-400">Risk Protection</p>
          <p className="font-medium text-white">
            {summary.coveredCount} of {summary.totalLayers} areas covered
          </p>
        </div>
      </div>

      <div className="flex gap-1.5">
        {summary.layers.map((layer) => {
          const config = riskLayerConfig[layer.layer]
          return (
            <div
              key={layer.layer}
              className={cn(
                'h-2 w-2 rounded-full',
                layer.status === 'covered' && 'bg-emerald-400',
                layer.status === 'partial' && 'bg-amber-400',
                layer.status === 'exposed' && 'bg-slate-500'
              )}
              title={`${config.label}: ${layer.status}`}
            />
          )
        })}
      </div>
    </div>
  )
}

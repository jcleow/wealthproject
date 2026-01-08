'use client'

import { useState } from 'react'
import {
  Stethoscope,
  TrendingDown,
  Accessibility,
  Shield,
  HeartHandshake,
  ChevronDown,
  ChevronUp,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { CoverageStatusBadge } from '../shared/CoverageStatusBadge'
import type { RiskLayerStatus } from '@/types/insurance'
import { riskLayerConfig } from '@/types/insurance'

interface RiskLayerCardProps {
  layerStatus: RiskLayerStatus
  defaultExpanded?: boolean
  className?: string
}

const iconMap: Record<string, typeof Stethoscope> = {
  Stethoscope,
  TrendingDown,
  Accessibility,
  Shield,
  HeartHandshake,
}

const statusBorderColors = {
  covered: 'border-emerald-500/20 hover:border-emerald-500/30',
  partial: 'border-amber-500/20 hover:border-amber-500/30',
  exposed: 'border-white/[0.06] hover:border-white/[0.12]',
}

const statusBgColors = {
  covered: 'bg-emerald-500/5',
  partial: 'bg-amber-500/5',
  exposed: 'bg-white/[0.02]',
}

export function RiskLayerCard({
  layerStatus,
  defaultExpanded = false,
  className,
}: RiskLayerCardProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded)
  const config = riskLayerConfig[layerStatus.layer]
  const IconComponent = iconMap[config.icon] || Shield

  return (
    <div
      className={cn(
        'rounded-2xl border transition-all duration-200',
        statusBorderColors[layerStatus.status],
        statusBgColors[layerStatus.status],
        className
      )}
    >
      {/* Header - Always visible */}
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex w-full items-center gap-4 p-4 text-left"
      >
        {/* Icon */}
        <div
          className={cn(
            'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl',
            `bg-${config.color}-500/15`
          )}
        >
          <IconComponent className={cn('h-5 w-5', `text-${config.color}-400`)} />
        </div>

        {/* Title and summary */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="font-medium text-white">{config.label}</h3>
            <CoverageStatusBadge status={layerStatus.status} size="sm" />
          </div>
          <p className="mt-0.5 truncate text-sm text-slate-400">
            {layerStatus.summary}
          </p>
        </div>

        {/* Expand indicator */}
        <div className="shrink-0 text-slate-500">
          {isExpanded ? (
            <ChevronUp className="h-5 w-5" />
          ) : (
            <ChevronDown className="h-5 w-5" />
          )}
        </div>
      </button>

      {/* Expanded details */}
      {isExpanded && (
        <div className="border-t border-white/[0.06] px-4 pb-4 pt-3">
          {/* What's covered */}
          {layerStatus.details.length > 0 && (
            <div className="mb-3">
              <h4 className="mb-1.5 text-xs font-medium uppercase tracking-wider text-slate-500">
                Coverage Details
              </h4>
              <ul className="space-y-1">
                {layerStatus.details.map((detail, index) => (
                  <li
                    key={index}
                    className="flex items-start gap-2 text-sm text-slate-300"
                  >
                    <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-slate-500" />
                    {detail}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Government coverage */}
          {layerStatus.governmentCoverage &&
            layerStatus.governmentCoverage.length > 0 && (
              <div className="mb-3">
                <h4 className="mb-1.5 text-xs font-medium uppercase tracking-wider text-slate-500">
                  Government Schemes
                </h4>
                <ul className="space-y-1">
                  {layerStatus.governmentCoverage.map((gov, index) => (
                    <li
                      key={index}
                      className="flex items-start gap-2 text-sm text-slate-400"
                    >
                      <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-blue-400" />
                      {gov.contribution}
                    </li>
                  ))}
                </ul>
              </div>
            )}

          {/* Private coverage */}
          {layerStatus.privateCoverage &&
            layerStatus.privateCoverage.length > 0 && (
              <div className="mb-3">
                <h4 className="mb-1.5 text-xs font-medium uppercase tracking-wider text-slate-500">
                  Private Insurance
                </h4>
                <ul className="space-y-1">
                  {layerStatus.privateCoverage.map((priv, index) => (
                    <li
                      key={index}
                      className="flex items-start gap-2 text-sm text-slate-400"
                    >
                      <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-emerald-400" />
                      {priv.policyName}: {priv.contribution}
                    </li>
                  ))}
                </ul>
              </div>
            )}

          {/* Exposure notes - what's NOT covered */}
          {layerStatus.exposureNotes && layerStatus.exposureNotes.length > 0 && (
            <div>
              <h4 className="mb-1.5 text-xs font-medium uppercase tracking-wider text-slate-500">
                Not Covered
              </h4>
              <ul className="space-y-1">
                {layerStatus.exposureNotes.map((note, index) => (
                  <li
                    key={index}
                    className="flex items-start gap-2 text-sm text-slate-500"
                  >
                    <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-slate-600" />
                    {note}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// Compact version for list view
export function RiskLayerCardCompact({
  layerStatus,
  onClick,
  className,
}: {
  layerStatus: RiskLayerStatus
  onClick?: () => void
  className?: string
}) {
  const config = riskLayerConfig[layerStatus.layer]
  const IconComponent = iconMap[config.icon] || Shield

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex w-full items-center gap-3 rounded-xl border p-3 text-left transition-all',
        statusBorderColors[layerStatus.status],
        statusBgColors[layerStatus.status],
        className
      )}
    >
      <div
        className={cn(
          'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg',
          `bg-${config.color}-500/15`
        )}
      >
        <IconComponent className={cn('h-4 w-4', `text-${config.color}-400`)} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-white">{config.shortLabel}</p>
        <p className="truncate text-xs text-slate-500">{layerStatus.summary}</p>
      </div>
      <CoverageStatusBadge
        status={layerStatus.status}
        size="sm"
        showLabel={false}
      />
    </button>
  )
}

'use client'

import { useMemo } from 'react'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { formatCoverageAmount } from '@/types/insurance'

interface ProtectionScoreCardProps {
  score: number // 0-100
  totalGap: number
  trend?: 'up' | 'down' | 'stable'
  lastUpdated?: string
}

export function ProtectionScoreCard({
  score,
  totalGap,
  trend = 'stable',
  lastUpdated,
}: ProtectionScoreCardProps) {
  const scoreColor = useMemo(() => {
    if (score >= 75) return { ring: 'stroke-emerald-500', text: 'text-emerald-400' }
    if (score >= 50) return { ring: 'stroke-amber-500', text: 'text-amber-400' }
    if (score >= 25) return { ring: 'stroke-orange-500', text: 'text-orange-400' }
    return { ring: 'stroke-rose-500', text: 'text-rose-400' }
  }, [score])

  const statusLabel = useMemo(() => {
    if (score >= 75) return 'Well Protected'
    if (score >= 50) return 'Partially Protected'
    if (score >= 25) return 'Under Protected'
    return 'At Risk'
  }, [score])

  // SVG gauge parameters
  const size = 200
  const strokeWidth = 12
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const strokeDashoffset = circumference - (score / 100) * circumference

  return (
    <div className="flex flex-col items-center rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6">
      {/* Gauge */}
      <div className="relative">
        <svg
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
          className="-rotate-90 transform"
        >
          {/* Background circle */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="rgba(255, 255, 255, 0.05)"
            strokeWidth={strokeWidth}
          />
          {/* Score arc */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            className={scoreColor.ring}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            style={{
              transition: 'stroke-dashoffset 1s ease-out',
            }}
          />
        </svg>

        {/* Center content */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={`text-5xl font-bold ${scoreColor.text}`}>{score}%</span>
          <span className="mt-1 text-sm text-slate-400">Protected</span>
        </div>
      </div>

      {/* Status */}
      <div className="mt-4 text-center">
        <p className="text-lg font-medium text-white">{statusLabel}</p>
        {totalGap > 0 && (
          <p className="mt-1 text-sm text-slate-400">
            Gap: <span className="text-rose-400">{formatCoverageAmount(totalGap)}</span>
          </p>
        )}
      </div>

      {/* Trend indicator */}
      <div className="mt-4 flex items-center gap-2 rounded-full bg-white/[0.03] px-3 py-1.5">
        {trend === 'up' && (
          <>
            <TrendingUp className="h-4 w-4 text-emerald-400" />
            <span className="text-xs text-emerald-400">Improving</span>
          </>
        )}
        {trend === 'down' && (
          <>
            <TrendingDown className="h-4 w-4 text-rose-400" />
            <span className="text-xs text-rose-400">Declining</span>
          </>
        )}
        {trend === 'stable' && (
          <>
            <Minus className="h-4 w-4 text-slate-400" />
            <span className="text-xs text-slate-400">Stable</span>
          </>
        )}
      </div>

      {lastUpdated && (
        <p className="mt-3 text-xs text-slate-500">Last updated: {lastUpdated}</p>
      )}
    </div>
  )
}

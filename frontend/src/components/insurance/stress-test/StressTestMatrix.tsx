'use client'

import { useState } from 'react'
import {
  Heart,
  AlertTriangle,
  Brain,
  Shield,
  Accessibility,
  CheckCircle2,
  AlertCircle,
  Circle,
  Info,
  X,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatCoverageAmount } from '@/types/insurance'
import type {
  StressTestMatrix as StressTestMatrixType,
  StressTestCell,
  StressEvent,
  StressTimeframe,
  CoverageStatus,
} from '@/types/insurance'
import { stressEventConfig, stressTimeframeConfig } from '@/types/insurance'

interface StressTestMatrixProps {
  matrix: StressTestMatrixType
  className?: string
}

const eventIcons: Record<StressEvent, typeof Heart> = {
  cancer: Heart,
  accident: AlertTriangle,
  stroke: Brain,
  death: Shield,
  severe_disability: Accessibility,
}

const statusIcons: Record<CoverageStatus, typeof CheckCircle2> = {
  covered: CheckCircle2,
  partial: AlertCircle,
  exposed: Circle,
}

const statusColors: Record<CoverageStatus, string> = {
  covered: 'text-emerald-400',
  partial: 'text-amber-400',
  exposed: 'text-slate-400', // Neutral, not alarming
}

const statusBgColors: Record<CoverageStatus, string> = {
  covered: 'bg-emerald-500/10 hover:bg-emerald-500/20',
  partial: 'bg-amber-500/10 hover:bg-amber-500/20',
  exposed: 'bg-slate-500/10 hover:bg-slate-500/20',
}

const events: StressEvent[] = [
  'cancer',
  'accident',
  'stroke',
  'death',
  'severe_disability',
]
const timeframes: StressTimeframe[] = ['6_months', '2_years', '5_years', 'lifetime']

/**
 * StressTestMatrix - Event-based stress test visualization
 *
 * Shows how user's coverage responds to life events across timeframes.
 * This is how Singaporeans think about risk - concrete scenarios,
 * not abstract percentage gaps.
 */
export function StressTestMatrix({ matrix, className }: StressTestMatrixProps) {
  const [selectedCell, setSelectedCell] = useState<{
    event: StressEvent
    timeframe: StressTimeframe
  } | null>(null)

  const selectedCellData = selectedCell
    ? matrix.results[selectedCell.event][selectedCell.timeframe]
    : null

  return (
    <div className={cn('space-y-4', className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-white">
            What happens if...
          </h3>
          <p className="text-sm text-slate-400">
            How your coverage responds to life events
          </p>
        </div>
        {/* Summary chips */}
        <div className="flex gap-2">
          {matrix.summary.coveredCount > 0 && (
            <span className="flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-1 text-xs text-emerald-400">
              <CheckCircle2 className="h-3 w-3" />
              {matrix.summary.coveredCount}
            </span>
          )}
          {matrix.summary.partialCount > 0 && (
            <span className="flex items-center gap-1 rounded-full bg-amber-500/15 px-2 py-1 text-xs text-amber-400">
              <AlertCircle className="h-3 w-3" />
              {matrix.summary.partialCount}
            </span>
          )}
          {matrix.summary.exposedCount > 0 && (
            <span className="flex items-center gap-1 rounded-full bg-slate-500/15 px-2 py-1 text-xs text-slate-400">
              <Circle className="h-3 w-3" />
              {matrix.summary.exposedCount}
            </span>
          )}
        </div>
      </div>

      {/* Matrix grid */}
      <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4">
        {/* Header row */}
        <div className="mb-2 grid grid-cols-5 gap-2">
          <div /> {/* Empty corner */}
          {timeframes.map((tf) => (
            <div
              key={tf}
              className="text-center text-xs font-medium text-slate-400"
            >
              {stressTimeframeConfig[tf].shortLabel}
            </div>
          ))}
        </div>

        {/* Event rows */}
        <div className="space-y-2">
          {events.map((event) => {
            const EventIcon = eventIcons[event]
            const config = stressEventConfig[event]

            return (
              <div key={event} className="grid grid-cols-5 gap-2">
                {/* Event label */}
                <div className="flex items-center gap-2">
                  <EventIcon
                    className={cn('h-4 w-4', `text-${config.color}-400`)}
                  />
                  <span className="text-sm text-white">{config.shortLabel}</span>
                </div>

                {/* Cells */}
                {timeframes.map((tf) => {
                  const cell = matrix.results[event][tf]
                  const StatusIcon = statusIcons[cell.status]
                  const isSelected =
                    selectedCell?.event === event &&
                    selectedCell?.timeframe === tf

                  return (
                    <button
                      key={`${event}-${tf}`}
                      type="button"
                      onClick={() =>
                        setSelectedCell(
                          isSelected ? null : { event, timeframe: tf }
                        )
                      }
                      className={cn(
                        'flex items-center justify-center rounded-lg p-2 transition-all',
                        statusBgColors[cell.status],
                        isSelected && 'ring-2 ring-white/20'
                      )}
                    >
                      <StatusIcon
                        className={cn('h-5 w-5', statusColors[cell.status])}
                      />
                    </button>
                  )
                })}
              </div>
            )
          })}
        </div>

        {/* Legend */}
        <div className="mt-4 flex items-center justify-center gap-4 border-t border-white/[0.06] pt-3">
          <div className="flex items-center gap-1.5 text-xs text-slate-400">
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
            Protected
          </div>
          <div className="flex items-center gap-1.5 text-xs text-slate-400">
            <AlertCircle className="h-3.5 w-3.5 text-amber-400" />
            At Risk
          </div>
          <div className="flex items-center gap-1.5 text-xs text-slate-400">
            <Circle className="h-3.5 w-3.5 text-slate-400" />
            Exposed
          </div>
        </div>
      </div>

      {/* Selected cell detail */}
      {selectedCellData && selectedCell && (
        <StressTestCellDetail
          cell={selectedCellData}
          onClose={() => setSelectedCell(null)}
        />
      )}

      {/* Hint when no cell selected */}
      {!selectedCell && (
        <div className="flex items-center gap-2 rounded-xl bg-blue-500/5 border border-blue-500/10 p-3">
          <Info className="h-4 w-4 shrink-0 text-blue-400" />
          <p className="text-xs text-slate-400">
            Click any cell to see detailed breakdown of costs and coverage
          </p>
        </div>
      )}
    </div>
  )
}

// Detail view for selected cell
function StressTestCellDetail({
  cell,
  onClose,
}: {
  cell: StressTestCell
  onClose: () => void
}) {
  const eventConfig = stressEventConfig[cell.event]
  const timeConfig = stressTimeframeConfig[cell.timeframe]
  const EventIcon = eventIcons[cell.event]

  return (
    <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4">
      {/* Header */}
      <div className="mb-4 flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div
            className={cn(
              'flex h-10 w-10 items-center justify-center rounded-xl',
              `bg-${eventConfig.color}-500/15`
            )}
          >
            <EventIcon className={cn('h-5 w-5', `text-${eventConfig.color}-400`)} />
          </div>
          <div>
            <h4 className="font-medium text-white">
              {eventConfig.label} - {timeConfig.label}
            </h4>
            <p className="text-sm text-slate-400">{cell.riskStatement}</p>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg p-1.5 text-slate-400 hover:bg-white/[0.05] hover:text-white"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Financial breakdown */}
      <div className="grid gap-4 sm:grid-cols-2">
        {/* Impact */}
        <div className="rounded-xl bg-slate-500/10 p-3">
          <h5 className="mb-2 text-xs font-medium uppercase tracking-wider text-slate-500">
            Financial Impact
          </h5>
          <div className="space-y-1.5">
            {cell.impact.medicalCosts > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">Medical costs</span>
                <span className="font-mono text-slate-300">
                  {formatCoverageAmount(cell.impact.medicalCosts)}
                </span>
              </div>
            )}
            {cell.impact.careCosts > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">Care/rehab costs</span>
                <span className="font-mono text-slate-300">
                  {formatCoverageAmount(cell.impact.careCosts)}
                </span>
              </div>
            )}
            {cell.impact.incomeLoss > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">Income loss</span>
                <span className="font-mono text-slate-300">
                  {formatCoverageAmount(cell.impact.incomeLoss)}
                </span>
              </div>
            )}
            {cell.impact.debtSettlement > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">Debt settlement</span>
                <span className="font-mono text-slate-300">
                  {formatCoverageAmount(cell.impact.debtSettlement)}
                </span>
              </div>
            )}
            {cell.impact.otherCosts > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">Other costs</span>
                <span className="font-mono text-slate-300">
                  {formatCoverageAmount(cell.impact.otherCosts)}
                </span>
              </div>
            )}
            <div className="flex justify-between border-t border-white/[0.06] pt-1.5 text-sm">
              <span className="font-medium text-white">Total need</span>
              <span className="font-mono font-medium text-white">
                {formatCoverageAmount(cell.impact.totalNeed)}
              </span>
            </div>
          </div>
        </div>

        {/* Resources */}
        <div className="rounded-xl bg-emerald-500/5 p-3">
          <h5 className="mb-2 text-xs font-medium uppercase tracking-wider text-slate-500">
            Coverage Available
          </h5>
          <div className="space-y-1.5">
            {cell.resources.insurancePayout > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">Insurance payout</span>
                <span className="font-mono text-emerald-400">
                  {formatCoverageAmount(cell.resources.insurancePayout)}
                </span>
              </div>
            )}
            {cell.resources.governmentPayouts > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">Government schemes</span>
                <span className="font-mono text-blue-400">
                  {formatCoverageAmount(cell.resources.governmentPayouts)}
                </span>
              </div>
            )}
            {cell.resources.savingsAvailable > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">Savings</span>
                <span className="font-mono text-slate-300">
                  {formatCoverageAmount(cell.resources.savingsAvailable)}
                </span>
              </div>
            )}
            {cell.resources.cpfWithdrawable > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">CPF MediSave</span>
                <span className="font-mono text-slate-300">
                  {formatCoverageAmount(cell.resources.cpfWithdrawable)}
                </span>
              </div>
            )}
            <div className="flex justify-between border-t border-white/[0.06] pt-1.5 text-sm">
              <span className="font-medium text-white">Total resources</span>
              <span className="font-mono font-medium text-emerald-400">
                {formatCoverageAmount(cell.resources.totalResources)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Shortfall and insight */}
      {cell.shortfall > 0 && (
        <div className="mt-3 flex items-start gap-2 rounded-xl bg-slate-500/10 p-3">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
          <div>
            <p className="text-sm text-slate-300">
              Gap of {formatCoverageAmount(cell.shortfall)} (
              {Math.round(100 - cell.coveragePercentage)}% shortfall)
            </p>
            <p className="mt-1 text-xs text-slate-500">{cell.keyInsight}</p>
          </div>
        </div>
      )}

      {cell.status === 'covered' && (
        <div className="mt-3 flex items-start gap-2 rounded-xl bg-emerald-500/10 p-3">
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
          <p className="text-sm text-emerald-300">{cell.keyInsight}</p>
        </div>
      )}
    </div>
  )
}

// Preview/collapsed version for Overview tab
export function StressTestPreview({
  matrix,
  onExpand,
  className,
}: {
  matrix: StressTestMatrixType
  onExpand: () => void
  className?: string
}) {
  return (
    <button
      type="button"
      onClick={onExpand}
      className={cn(
        'w-full rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4 text-left transition-all hover:border-white/[0.12]',
        className
      )}
    >
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-medium text-white">Event Stress Test</h3>
          <p className="text-sm text-slate-400">
            See how your coverage responds to life events
          </p>
        </div>
        <div className="flex gap-1">
          {matrix.summary.coveredCount > 0 && (
            <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-xs text-emerald-400">
              {matrix.summary.coveredCount} protected
            </span>
          )}
          {matrix.summary.exposedCount > 0 && (
            <span className="rounded-full bg-slate-500/15 px-2 py-0.5 text-xs text-slate-400">
              {matrix.summary.exposedCount} exposed
            </span>
          )}
        </div>
      </div>

      {/* Mini matrix preview */}
      <div className="mt-3 flex gap-1">
        {events.map((event) => (
          <div key={event} className="flex flex-1 flex-col gap-1">
            {timeframes.slice(0, 3).map((tf) => {
              const cell = matrix.results[event][tf]
              return (
                <div
                  key={`${event}-${tf}`}
                  className={cn(
                    'h-1.5 rounded-full',
                    cell.status === 'covered' && 'bg-emerald-400',
                    cell.status === 'partial' && 'bg-amber-400',
                    cell.status === 'exposed' && 'bg-slate-500'
                  )}
                />
              )
            })}
          </div>
        ))}
      </div>
    </button>
  )
}

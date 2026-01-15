'use client'

import { formatCurrency } from '@/lib/format'
import { BarChart3, Info } from 'lucide-react'
import * as Tooltip from '@radix-ui/react-tooltip'

interface AggregateStats {
  activeCount: number
  draftCount: number
  totalCpfUsed: number
  totalAccruedInterest: number
  totalGrants: number
  mustRefundAtSale: number
  oaBalanceAvailable: number
  perPersonUsage: Array<{
    id: string
    name: string
    cpfUsed: number
    accruedInterest: number
  }>
}

interface AggregateBarProps {
  stats: AggregateStats
}

/**
 * Fixed bottom bar showing aggregate CPF stats across all active properties
 * Matches the spec design with per-person breakdowns
 */
export function AggregateBar({ stats }: AggregateBarProps) {
  const hasData = stats.activeCount > 0

  return (
    <div>
      <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
        {/* Header */}
        <div className="flex items-center gap-2 mb-4">
          <BarChart3 className="h-4 w-4 text-slate-400" />
          <span className="text-xs font-medium text-slate-400 uppercase tracking-wide">
            Across All Active Properties
          </span>
          <span className="text-xs text-slate-500">({stats.activeCount})</span>

          {hasData && (
            <Tooltip.Provider delayDuration={200}>
              <Tooltip.Root>
                <Tooltip.Trigger asChild>
                  <button type="button" className="ml-auto flex items-center gap-1 text-slate-500 hover:text-slate-400 transition">
                    <Info className="h-3.5 w-3.5" />
                  </button>
                </Tooltip.Trigger>
                <Tooltip.Portal>
                  <Tooltip.Content
                    side="bottom"
                    align="end"
                    className="z-50 rounded-lg bg-slate-800 border border-white/[0.08] px-3 py-2 text-xs shadow-xl"
                    sideOffset={4}
                  >
                    <p className="text-slate-400 mb-1">Must Refund at Sale</p>
                    <p className="text-white font-medium font-mono tabular-nums">
                      {formatCurrency(stats.mustRefundAtSale)}
                    </p>
                    <p className="text-[10px] text-slate-500 mt-1">CPF Used + Accrued Interest</p>
                    <Tooltip.Arrow className="fill-slate-800" />
                  </Tooltip.Content>
                </Tooltip.Portal>
              </Tooltip.Root>
            </Tooltip.Provider>
          )}
        </div>

        {!hasData ? (
          <p className="text-sm text-slate-500 text-center py-2">
            No active properties to aggregate.
          </p>
        ) : (
          <div className="grid grid-cols-3 gap-6">
            {/* Total CPF Used */}
            <div>
              <p className="text-xs text-slate-500 mb-1">Total CPF Used</p>
              <p className="text-lg font-semibold text-white font-mono tabular-nums">
                {formatCurrency(stats.totalCpfUsed)}
              </p>
              {/* Per-person breakdown */}
              {stats.perPersonUsage.length > 0 && (
                <div className="mt-2 space-y-1">
                  {stats.perPersonUsage.map(person => (
                    <div key={person.id} className="flex items-center gap-1.5 text-[10px]">
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-400 flex-shrink-0" />
                      <span className="text-slate-500 truncate">{person.name}:</span>
                      <span className="text-slate-300 font-mono tabular-nums">{formatCurrency(person.cpfUsed)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Total Accrued Interest */}
            <div>
              <p className="text-xs text-slate-500 mb-1">Total Accrued Interest</p>
              <p className="text-lg font-semibold text-amber-400 font-mono tabular-nums">
                {formatCurrency(stats.totalAccruedInterest)}
              </p>
              {/* Per-person breakdown */}
              {stats.perPersonUsage.length > 0 && (
                <div className="mt-2 space-y-1">
                  {stats.perPersonUsage.map(person => (
                    <div key={person.id} className="flex items-center gap-1.5 text-[10px]">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-400 flex-shrink-0" />
                      <span className="text-slate-500 truncate">{person.name}:</span>
                      <span className="text-amber-400/70 font-mono tabular-nums">{formatCurrency(person.accruedInterest)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Total Grants */}
            <div>
              <p className="text-xs text-slate-500 mb-1">Total Grants</p>
              <p className="text-lg font-semibold text-emerald-400 font-mono tabular-nums">
                {formatCurrency(stats.totalGrants)}
              </p>
            </div>
          </div>
        )}

      </div>
    </div>
  )
}

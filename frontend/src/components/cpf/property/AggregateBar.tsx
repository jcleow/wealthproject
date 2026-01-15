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
 * Aggregate stats bar showing CPF totals across all active properties
 * Follows Financial UI Standards for readability and contrast
 */
export function AggregateBar({ stats }: AggregateBarProps) {
  const hasData = stats.activeCount > 0

  return (
    <div className="rounded-xl border border-gray-700 bg-gray-900/60 p-4">
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <BarChart3 className="h-4 w-4 text-gray-400" />
        <span className="text-sm font-medium text-gray-300 uppercase tracking-wide">
          Across All Active Properties
        </span>
        <span className="text-sm text-gray-500">({stats.activeCount})</span>

        {hasData && (
          <Tooltip.Provider delayDuration={200}>
            <Tooltip.Root>
              <Tooltip.Trigger asChild>
                <button type="button" className="ml-auto flex items-center gap-1 text-gray-500 hover:text-gray-300 transition">
                  <Info className="h-3.5 w-3.5" />
                </button>
              </Tooltip.Trigger>
              <Tooltip.Portal>
                <Tooltip.Content
                  side="bottom"
                  align="end"
                  className="z-50 rounded-lg bg-gray-800 border border-gray-600 px-3 py-2.5 shadow-xl"
                  sideOffset={4}
                >
                  <p className="text-sm font-medium text-gray-300 mb-1">Must Refund at Sale</p>
                  <p className="text-base text-white font-semibold font-mono tabular-nums">
                    {formatCurrency(stats.mustRefundAtSale)}
                  </p>
                  <p className="text-sm text-gray-400 mt-1.5">CPF Used + Accrued Interest</p>
                  <Tooltip.Arrow className="fill-gray-800" />
                </Tooltip.Content>
              </Tooltip.Portal>
            </Tooltip.Root>
          </Tooltip.Provider>
        )}
      </div>

      {!hasData ? (
        <p className="text-sm text-gray-400 text-center py-3">
          No active properties to aggregate.
        </p>
      ) : (
        <div className="grid grid-cols-3 gap-6">
          {/* Total CPF Used */}
          <div>
            <p className="text-sm font-medium text-gray-400 mb-1">Total CPF Used</p>
            <p className="text-xl font-semibold text-white font-mono tabular-nums">
              {formatCurrency(stats.totalCpfUsed)}
            </p>
            {/* Per-person breakdown */}
            {stats.perPersonUsage.length > 0 && (
              <div className="mt-2 space-y-1">
                {stats.perPersonUsage.map(person => (
                  <div key={person.id} className="flex items-center gap-1.5 text-sm">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-400 flex-shrink-0" />
                    <span className="text-gray-500">{person.name}:</span>
                    <span className="text-gray-200 font-mono tabular-nums">{formatCurrency(person.cpfUsed)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Total Accrued Interest */}
          <div>
            <p className="text-sm font-medium text-gray-400 mb-1">Total Accrued Interest</p>
            <p className="text-xl font-semibold text-amber-400 font-mono tabular-nums">
              {formatCurrency(stats.totalAccruedInterest)}
            </p>
            {/* Per-person breakdown */}
            {stats.perPersonUsage.length > 0 && (
              <div className="mt-2 space-y-1">
                {stats.perPersonUsage.map(person => (
                  <div key={person.id} className="flex items-center gap-1.5 text-sm">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400 flex-shrink-0" />
                    <span className="text-gray-500">{person.name}:</span>
                    <span className="text-amber-300 font-mono tabular-nums">{formatCurrency(person.accruedInterest)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Total Grants */}
          <div>
            <p className="text-sm font-medium text-gray-400 mb-1">Total Grants</p>
            <p className="text-xl font-semibold text-emerald-400 font-mono tabular-nums">
              {formatCurrency(stats.totalGrants)}
            </p>
          </div>
        </div>
      )}
    </div>
  )
}

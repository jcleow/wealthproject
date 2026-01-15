'use client'

import { Info } from 'lucide-react'
import * as Tooltip from '@radix-ui/react-tooltip'
import { formatCurrency } from '@/lib/format'
import type { PropertySGGrant } from '@/types/propertyPlannerV2'

interface GrantsDisplayProps {
  grants: PropertySGGrant[]
  isPrivateProperty?: boolean
}

// Full grant name mapping
const GRANT_NAMES: Record<string, string> = {
  EHG: 'Enhanced CPF Housing Grant',
  FHG: 'Family Grant',
  PHG: 'Proximity Housing Grant',
  STEP_UP: 'Step-Up CPF Housing Grant',
}

export function GrantsDisplay({ grants, isPrivateProperty = false }: GrantsDisplayProps) {
  const totalGrants = grants.reduce((sum, g) => sum + parseFloat(g.amount || '0'), 0)

  return (
    <Tooltip.Provider delayDuration={200}>
      <div className="rounded-xl border border-white/[0.06] p-4">
        {/* Header with tooltip */}
        <div className="flex items-center gap-1.5 mb-4">
          <h4 className="text-base font-medium text-gray-200">Housing Grants</h4>
          <Tooltip.Root>
            <Tooltip.Trigger asChild>
              <button type="button" className="text-slate-500 hover:text-slate-300 cursor-help">
                <Info className="h-3.5 w-3.5" />
              </button>
            </Tooltip.Trigger>
            <Tooltip.Portal>
              <Tooltip.Content
                side="top"
                align="start"
                className="rounded-lg bg-gray-900 border border-white/10 px-3 py-2 text-xs text-slate-300 shadow-xl max-w-[280px] leading-relaxed"
                sideOffset={4}
              >
                Grants are refunded to your CPF OA upon sale, but <strong className="text-white">without accrued interest</strong> (unlike CPF contributions which accrue 2.5% interest).
                <Tooltip.Arrow className="fill-gray-900" />
              </Tooltip.Content>
            </Tooltip.Portal>
          </Tooltip.Root>
        </div>

      {/* Grants List */}
      {grants.length === 0 ? (
        <div className="py-4 text-center">
          {isPrivateProperty ? (
            <p className="text-sm text-gray-400">
              Housing grants are not available for private properties.
            </p>
          ) : (
            <p className="text-sm text-gray-400">
              No grants configured. Edit the property to add housing grants.
            </p>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {grants.map((grant) => {
            const fullName = GRANT_NAMES[grant.name] || grant.name
            return (
              <div
                key={grant.id}
                className="flex items-center justify-between py-2 border-b border-white/[0.06] last:border-0"
              >
                <div>
                  <p className="text-sm font-medium text-white">{fullName}</p>
                  <p className="text-sm text-gray-500">{grant.name}</p>
                </div>
                <span className="text-base font-medium text-emerald-400 font-mono tabular-nums">
                  {formatCurrency(parseFloat(grant.amount || '0'))}
                </span>
              </div>
            )
          })}

          {/* Total */}
          <div className="flex items-center justify-between pt-2 mt-2 border-t border-white/[0.06]">
            <span className="text-sm font-medium text-gray-300">Total Grants</span>
            <span className="text-xl font-semibold text-emerald-400 font-mono tabular-nums">
              {formatCurrency(totalGrants)}
            </span>
          </div>
        </div>
      )}

      </div>
    </Tooltip.Provider>
  )
}

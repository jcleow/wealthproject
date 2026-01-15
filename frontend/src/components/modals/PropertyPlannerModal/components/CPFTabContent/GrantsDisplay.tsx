'use client'

import { Info } from 'lucide-react'
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
    <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
      {/* Header */}
      <h4 className="text-sm font-medium text-slate-300 mb-4">Housing Grants</h4>

      {/* Grants List */}
      {grants.length === 0 ? (
        <div className="py-4 text-center">
          {isPrivateProperty ? (
            <p className="text-xs text-slate-500">
              Housing grants are not available for private properties.
            </p>
          ) : (
            <p className="text-xs text-slate-500">
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
                className="flex items-center justify-between py-2 border-b border-white/[0.04] last:border-0"
              >
                <div>
                  <p className="text-xs font-medium text-white">{fullName}</p>
                  <p className="text-[10px] text-slate-500">{grant.name}</p>
                </div>
                <span className="text-sm font-medium text-emerald-400 font-mono tabular-nums">
                  {formatCurrency(parseFloat(grant.amount || '0'))}
                </span>
              </div>
            )
          })}

          {/* Total */}
          <div className="flex items-center justify-between pt-2 mt-2 border-t border-white/[0.06]">
            <span className="text-xs font-medium text-slate-300">Total Grants</span>
            <span className="text-base font-semibold text-emerald-400 font-mono tabular-nums">
              {formatCurrency(totalGrants)}
            </span>
          </div>
        </div>
      )}

      {/* Info Note */}
      <div className="flex items-start gap-2 p-3 mt-4 rounded-lg bg-blue-500/5 border border-blue-500/10">
        <Info className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-blue-400" />
        <p className="text-[10px] text-slate-400 leading-relaxed">
          Grants reduce your loan amount but are <strong className="text-slate-300">NOT refunded</strong> to CPF upon sale
          (unlike your CPF contributions which must be refunded with interest).
        </p>
      </div>
    </div>
  )
}

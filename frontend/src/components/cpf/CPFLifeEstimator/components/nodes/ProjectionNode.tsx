'use client'

import { Handle, Position } from '@xyflow/react'
import { Loader2 } from 'lucide-react'

import { formatCurrency } from '@/lib/format'
import type { ProjectionNodeData } from '../../types'

interface ProjectionNodeProps {
  data: ProjectionNodeData
}

export function ProjectionNode({ data }: ProjectionNodeProps) {
  const years = [5, 10, 15, 20, 25, 30]

  const calculateCumulative = (years: number) => {
    if (data.planType === 'escalating') {
      let total = 0
      let currentPayout = data.monthlyPayout
      for (let y = 0; y < years; y++) {
        total += currentPayout * 12
        currentPayout *= 1.02
      }
      return total
    }
    return data.monthlyPayout * 12 * years
  }

  return (
    <div className={`min-w-[200px]
p-4
rounded-xl border border-green-500/30
bg-green-500/10
shadow-xl backdrop-blur`}>
      <Handle type="target" position={Position.Left} className="!bg-green-500 !w-3 !h-3" />

      <div className={`mb-2
text-xs font-medium tracking-wide text-green-400
uppercase`}>
        Lifetime Projection
      </div>

      {data.isLoading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
        </div>
      ) : (
        <>
          <div className="space-y-2 text-xs">
            <div className="grid grid-cols-2 gap-2 text-slate-400">
              <span>After</span>
              <span className="text-right">Received</span>
            </div>

            {years.map((y) => {
              const age = data.startAge + y
              return (
                <div key={y} className="grid grid-cols-2 gap-2">
                  <span className="text-slate-300">{y}y (age {age})</span>
                  <span className="text-right text-white font-medium">
                    {formatCurrency(calculateCumulative(y))}
                  </span>
                </div>
              )
            })}
          </div>

          {data.planType === 'escalating' && data.payoutAt75 && data.payoutAt85 && (
            <div className="mt-3 pt-2 border-t border-white/10 space-y-1">
              <div className="text-xs text-amber-400">Payouts increase 2% yearly:</div>
              <div className="text-xs text-slate-300">
                Age 75: <span className="text-white font-medium">{formatCurrency(data.payoutAt75)}/mo</span>
              </div>
              <div className="text-xs text-slate-300">
                Age 85: <span className="text-white font-medium">{formatCurrency(data.payoutAt85)}/mo</span>
              </div>
            </div>
          )}

          <div className="mt-3 pt-2 border-t border-white/10 text-xs text-slate-500">
            Payouts continue for life
          </div>
        </>
      )}
    </div>
  )
}

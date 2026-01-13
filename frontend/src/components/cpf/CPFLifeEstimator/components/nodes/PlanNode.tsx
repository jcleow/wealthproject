'use client'

import { Handle, Position } from '@xyflow/react'
import { Loader2 } from 'lucide-react'

import { formatCurrency } from '@/lib/format'
import type { PlanNodeData } from '../../types'

interface PlanNodeProps {
  data: PlanNodeData
}

export function PlanNode({ data }: PlanNodeProps) {
  const colorClasses = {
    blue: data.isSelected ? 'border-blue-500 bg-blue-500/20' : 'border-blue-500/30 bg-blue-500/10',
    green: data.isSelected ? 'border-emerald-500 bg-emerald-500/20' : 'border-emerald-500/30 bg-emerald-500/10',
    amber: data.isSelected ? 'border-amber-500 bg-amber-500/20' : 'border-amber-500/30 bg-amber-500/10',
  }[data.color] || 'border-white/10 bg-white/5'

  const textColor = {
    blue: 'text-blue-400',
    green: 'text-emerald-400',
    amber: 'text-amber-400',
  }[data.color] || 'text-white'

  return (
    <div
      onClick={data.onClick}
      className={`rounded-xl border-2 p-4 shadow-xl backdrop-blur min-w-[180px] cursor-pointer transition-all hover:scale-105 ${colorClasses}`}
    >
      <Handle type="target" position={Position.Left} className="!bg-current !w-3 !h-3" />

      <div className={`mb-1 text-xs font-medium uppercase tracking-wide ${textColor}`}>
        {data.planType.charAt(0).toUpperCase() + data.planType.slice(1)} Plan
      </div>

      {data.isLoading ? (
        <div className="flex items-center gap-2 py-2">
          <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
          <span className="text-sm text-slate-400">Loading...</span>
        </div>
      ) : (
        <div className="text-2xl font-bold text-white">
          {formatCurrency(data.payout)}
          <span className="text-sm text-slate-400">/mo</span>
        </div>
      )}

      <div className="mt-2 text-xs text-slate-400">
        {data.description}
      </div>

      <div className="mt-3 space-y-1">
        {data.pros.map((pro, i) => (
          <div key={i} className="text-xs text-emerald-400">+ {pro}</div>
        ))}
        {data.cons.map((con, i) => (
          <div key={i} className="text-xs text-red-400">- {con}</div>
        ))}
      </div>

      {data.isSelected && (
        <div className="mt-2 text-xs text-center text-white/80 font-medium">
          Selected
        </div>
      )}

      <Handle type="source" position={Position.Right} className="!bg-current !w-3 !h-3" />
    </div>
  )
}

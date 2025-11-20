'use client'

import { Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ExecutionProgressProps {
  actionCount: number
  className?: string
}

export function ExecutionProgress({ actionCount, className }: ExecutionProgressProps) {
  return (
    <div
      className={cn(
        'rounded-2xl border border-white/10 bg-gradient-to-r from-blue-600/20 via-indigo-600/20 to-blue-600/10 p-4 text-sm text-white shadow-lg shadow-black/30',
        className
      )}
    >
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10">
          <Loader2 className="h-4 w-4 animate-spin text-blue-100" />
        </div>
        <div>
          <p className="font-semibold">Executing actions</p>
          <p className="text-xs text-gray-200">
            Dispatching {actionCount} {actionCount === 1 ? 'action' : 'actions'}...
          </p>
        </div>
      </div>
      <div className="mt-4 h-2.5 overflow-hidden rounded-full bg-white/10">
        <div className="h-full w-2/3 animate-pulse bg-gradient-to-r from-blue-400 via-indigo-400 to-blue-600" />
      </div>
    </div>
  )
}

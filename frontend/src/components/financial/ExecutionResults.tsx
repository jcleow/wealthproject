'use client'

import { AlertTriangle, CheckCircle2, Loader2, XCircle } from 'lucide-react'
import { ExecutionResult } from '@/types/chat'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

interface ExecutionResultsProps {
  execution: ExecutionResult
}

const statusCopy: Record<
  ExecutionResult['status'],
  { label: string; tone: string; icon: React.ReactNode }
> = {
  running: {
    label: 'In progress',
    tone: 'border-amber-400/30 bg-amber-500/10 text-amber-100',
    icon: <Loader2 className="h-4 w-4 animate-spin" />,
  },
  completed: {
    label: 'Completed',
    tone: 'border-emerald-400/30 bg-emerald-500/10 text-emerald-50',
    icon: <CheckCircle2 className="h-4 w-4" />,
  },
  failed: {
    label: 'Failed',
    tone: 'border-rose-400/30 bg-rose-500/10 text-rose-50',
    icon: <XCircle className="h-4 w-4" />,
  },
}

export function ExecutionResults({ execution }: ExecutionResultsProps) {
  const status = statusCopy[execution.status]

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-5 text-sm text-gray-100 shadow-lg shadow-black/30">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-wide text-gray-400">
            Execution Results
          </p>
          <p className="font-semibold text-white">
            {execution.actions.length} {execution.actions.length === 1 ? 'action' : 'actions'}
          </p>
        </div>
        <span
          className={cn(
            'inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold',
            status.tone
          )}
        >
          {status.icon}
          {status.label}
        </span>
      </div>

      {execution.summary && (
        <div className="mt-4 grid grid-cols-3 gap-3 rounded-xl border border-white/5 bg-black/20 p-3 text-xs text-gray-200">
          <div>
            <p className="text-gray-400">Succeeded</p>
            <p className="font-semibold text-emerald-200">{execution.summary.successful}</p>
          </div>
          <div>
            <p className="text-gray-400">Failed</p>
            <p className="font-semibold text-rose-200">{execution.summary.failed}</p>
          </div>
          <div>
            <p className="text-gray-400">Elapsed</p>
            <p className="font-semibold text-blue-200">
              {execution.summary.total_execution_time_ms
                ? `${Math.max(1, Math.round(execution.summary.total_execution_time_ms / 1000))}s`
                : 'Moments ago'}
            </p>
          </div>
        </div>
      )}

      <div className="mt-4 space-y-3">
        {execution.actions.map((action) => {
          const actionStatus = getActionStatus(action.success, execution.status)

          return (
            <div
              key={action.call_id}
              className="rounded-xl border border-white/10 bg-black/20 px-3 py-2"
            >
              <div className="flex flex-wrap items-center gap-2">
                <Badge className="text-[10px] uppercase" variant="secondary">
                  {action.tool_name}
                </Badge>
                <span className="text-gray-300">{action.friendly_description}</span>
                <span
                  className={cn(
                    'ml-auto inline-flex items-center gap-1 rounded-full px-2 py-1 text-[10px] font-semibold',
                    actionStatus.tone
                  )}
                >
                  {actionStatus.icon}
                  {actionStatus.label}
                </span>
              </div>

              {action.error && (
                <div className="mt-2 inline-flex items-center gap-2 rounded-lg bg-rose-500/10 px-2 py-1 text-[11px] text-rose-100">
                  <AlertTriangle className="h-3 w-3" />
                  {action.error}
                </div>
              )}

              {action.entity_id && (
                <p className="mt-2 text-[11px] text-gray-400">
                  Reference: <span className="text-gray-200">{action.entity_id}</span>
                </p>
              )}
            </div>
          )
        })}
      </div>

      {execution.status === 'failed' && execution.errorMessage && (
        <div className="mt-4 rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-100">
          {execution.errorMessage}
        </div>
      )}
    </div>
  )
}

function getActionStatus(
  success: boolean | undefined,
  parentStatus: ExecutionResult['status']
): { label: string; tone: string; icon: React.ReactNode } {
  if (parentStatus === 'running') {
    return {
      label: 'Running',
      tone: 'bg-amber-500/10 text-amber-100',
      icon: <Loader2 className="h-3 w-3 animate-spin" />,
    }
  }

  if (success === false) {
    return {
      label: 'Failed',
      tone: 'bg-rose-500/10 text-rose-100',
      icon: <XCircle className="h-3 w-3" />,
    }
  }

  return {
    label: 'Succeeded',
    tone: 'bg-emerald-500/10 text-emerald-100',
    icon: <CheckCircle2 className="h-3 w-3" />,
  }
}

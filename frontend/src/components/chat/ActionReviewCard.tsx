import { useState } from 'react'
import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Loader2,
  XCircle
} from 'lucide-react'
import { ActionReview } from '@/types/chat'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

interface ActionReviewCardProps {
  review: ActionReview
  onConfirm?: (id: string) => void
  onCancel?: (id: string) => void
  isProcessing?: boolean
}

export default function ActionReviewCard({
  review,
  onConfirm,
  onCancel,
  isProcessing = false,
}: ActionReviewCardProps) {
  const [showDiagnostics, setShowDiagnostics] = useState(false)
  const isPending = review.status === 'pending'

  const statusCopy: Record<
    typeof review.status,
    { label: string; tone: string; icon: React.ReactNode }
  > = {
    pending: {
      label: "Awaiting confirmation",
      tone: "bg-amber-500/15 text-amber-300 border-amber-500/30",
      icon: <AlertTriangle className="size-4" />,
    },
    confirmed: {
      label: "Dispatched",
      tone: "text-grey-500 bg-white/5 /15 text-emerald-300 border-emerald-500/30",
      icon: <CheckCircle2 className="size-4" />,
    },
    cancelled: {
      label: "Cancelled",
      tone: "bg-rose-500/15 text-rose-200 border-rose-500/30",
      icon: <XCircle className="size-4" />,
    },
  }

  const status = statusCopy[review.status]

  return (
    <div className={`p-5
rounded-2xl border border-white/10
bg-white/5
text-sm
shadow-lg shadow-black/30`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-xs uppercase tracking-wide text-gray-400">
            Action Preview
          </p>
          <p className="font-semibold text-white">
            {review.actions.length}{" "}
            {review.actions.length === 1 ? "action" : "actions"} detected
          </p>
        </div>
        <span
          className={cn(
            `inline-flex items-center
gap-1 px-3 py-1
rounded-full border
font-medium text-xs`,
            status.tone
          )}
        >
          {status.icon}
          {status.label}
        </span>
      </div>

      <div className="mt-4 space-y-2">
        {review.actions.map((action) => (
          <div
            className={`px-3 py-2
rounded-xl border border-white/10
bg-black/20
text-sm text-gray-200`}
            key={action.call_id}
          >
            <div className="flex flex-wrap items-center gap-2">
              <Badge className="text-[10px] uppercase" variant="secondary">
                {action.tool_name}
              </Badge>
              <span className="text-gray-400">
                {action.friendly_description}
              </span>
            </div>
            {action.estimated_impact && (
              <div className="mt-1 text-xs text-gray-400">
                Impact:{" "}
                <span className="font-medium text-white">
                  {formatCurrency(action.estimated_impact.net_worth_change)}
                </span>{" "}
                - {action.estimated_impact.description}
              </div>
            )}
            {action.warnings && action.warnings.length > 0 && (
              <div className="mt-1 space-y-1">
                {action.warnings.map((warning, idx) => (
                  <div key={idx} className={cn(
                    "text-xs px-2 py-1 rounded",
                    warning.severity === 'high' && "bg-destructive/15 text-destructive-foreground",
                    warning.severity === 'medium' && "bg-amber-500/15 text-amber-300",
                    warning.severity === 'low' && "bg-blue-500/15 text-blue-300"
                  )}>
                    {warning.message}
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {isPending && (
        <div className="mt-4 flex flex-wrap gap-2">
          <Button
            className="min-w-[120px] flex-1"
            disabled={isProcessing}
            onClick={() => onConfirm?.(review.id)}
            size="sm"
          >
            {isProcessing ? (
              <>
                <Loader2 className="mr-2 size-3 animate-spin" />
                Dispatching...
              </>
            ) : (
              "Confirm & dispatch"
            )}
          </Button>
          <Button
            className="min-w-[120px] flex-1 text-black bg-gray-100"
            disabled={isProcessing}
            onClick={() => onCancel?.(review.id)}
            size="sm"
            variant="outline"
          >
            Cancel
          </Button>
        </div>
      )}

      <button
        className={`flex items-center justify-between
w-full
mt-4 px-3 py-2
rounded-lg border border-white/10
bg-black/30 hover:bg-black/50
font-medium text-xs text-gray-300
transition`}
        onClick={() => setShowDiagnostics((value) => !value)}
        type="button"
      >
        Diagnostics
        {showDiagnostics ? (
          <ChevronUp className="size-4" />
        ) : (
          <ChevronDown className="size-4" />
        )}
      </button>

      {showDiagnostics && (
        <pre className={`overflow-auto
max-h-64
mt-2 px-3 py-2
rounded-lg
bg-black/50
text-xs text-gray-300`}>
          {JSON.stringify(
            {
              review_id: review.id,
              message: review.message,
              actions: review.actions,
              status: review.status,
            },
            null,
            2
          )}
        </pre>
      )}
    </div>
  )
}

function formatCurrency(amount: number): string {
  const formatter = new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  })
  return formatter.format(amount)
}

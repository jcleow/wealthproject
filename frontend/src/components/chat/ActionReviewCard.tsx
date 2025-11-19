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
      tone: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
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
    <div className="rounded-2xl border border-border/60 bg-muted/10 p-4 text-sm shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-muted-foreground text-xs uppercase tracking-wide">
            Action Preview
          </p>
          <p className="font-semibold text-foreground">
            {review.actions.length}{" "}
            {review.actions.length === 1 ? "action" : "actions"} detected
          </p>
        </div>
        <span
          className={cn(
            "inline-flex items-center gap-1 rounded-full border px-3 py-1 font-medium text-xs",
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
            className="rounded-xl border border-border/50 bg-background/70 px-3 py-2 text-sm"
            key={action.call_id}
          >
            <div className="flex flex-wrap items-center gap-2">
              <Badge className="text-[10px] uppercase" variant="secondary">
                {action.tool_name}
              </Badge>
              <span className="text-muted-foreground">
                {action.friendly_description}
              </span>
            </div>
            {action.estimated_impact && (
              <div className="mt-1 text-muted-foreground text-xs">
                Impact:{" "}
                <span className="font-medium text-foreground">
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
            className="min-w-[120px] flex-1"
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
        className="mt-4 flex w-full items-center justify-between rounded-lg border border-border/50 bg-background/40 px-3 py-2 font-medium text-muted-foreground text-xs transition hover:bg-background/70"
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
        <pre className="mt-2 max-h-64 overflow-auto rounded-lg bg-black/40 px-3 py-2 text-muted-foreground text-xs">
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
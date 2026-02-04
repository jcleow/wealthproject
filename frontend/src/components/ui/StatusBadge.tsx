"use client"

import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

// TODO(human): Define the statusBadgeVariants using CVA.
//
// Base classes (already provided):
//   "inline-flex items-center gap-1.5 rounded-full border font-medium"
//
// You need to define two variant axes:
//
// 1. `status` — each maps to a color using the opacity pattern:
//      bg-{color}-500/15, text-{color}-400, border-{color}-500/20
//    Statuses: success (emerald), warning (amber), danger (rose),
//              info (blue), neutral (slate), purple (violet)
//
// 2. `size` — sm, md (default), lg:
//      sm:  "px-2 py-0.5 text-[10px]"
//      md:  "px-3 py-1 text-xs"
//      lg:  "px-4 py-1.5 text-sm"
//
// Default variants: status → "neutral", size → "md"
//
const statusBadgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-full border font-medium",
  {
    variants: {
      // TODO(human): Replace these placeholder classes with proper color mappings.
      // Each status should use the opacity pattern: bg-{color}-500/15, text-{color}-400, border-{color}-500/20
      // Statuses → color: success→emerald, warning→amber, danger→rose, info→blue, neutral→slate, purple→violet
      status: {
        success: "",  // e.g. "bg-emerald-500/15 text-emerald-400 border-emerald-500/20"
        warning: "",  // e.g. "bg-amber-500/15 text-amber-400 border-amber-500/20"
        danger: "",   // e.g. "bg-rose-500/15 text-rose-400 border-rose-500/20"
        info: "",     // e.g. "bg-blue-500/15 text-blue-400 border-blue-500/20"
        neutral: "",  // e.g. "bg-slate-500/15 text-slate-400 border-slate-500/20"
        purple: "",   // e.g. "bg-violet-500/15 text-violet-400 border-violet-500/20"
      },
      // Sizes: sm, md (default), lg
      size: {
        sm: "",   // e.g. "px-2 py-0.5 text-[10px]"
        md: "",   // e.g. "px-3 py-1 text-xs"
        lg: "",   // e.g. "px-4 py-1.5 text-sm"
      },
    },
    defaultVariants: {
      status: "neutral",
      size: "md",
    },
  }
)

export interface StatusBadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof statusBadgeVariants> {
  icon?: React.ReactNode
}

function StatusBadge({ className, status, size, icon, children, ...props }: StatusBadgeProps) {
  return (
    <span className={cn(statusBadgeVariants({ status, size, className }))} {...props}>
      {icon && <span className="[&_svg]:h-3 [&_svg]:w-3">{icon}</span>}
      {children}
    </span>
  )
}

export { StatusBadge, statusBadgeVariants }

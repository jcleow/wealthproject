"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { useTheme } from "@/lib/theme"

export interface SegmentedControlOption {
  value: string
  label: string
  icon?: React.ReactNode
}

export interface SegmentedControlProps {
  options: SegmentedControlOption[]
  value: string
  onChange: (value: string) => void
  size?: "sm" | "default"
  className?: string
}

function SegmentedControl({
  options,
  value,
  onChange,
  size = "default",
  className,
}: SegmentedControlProps) {
  const { isMonet } = useTheme()

  const containerClasses = cn(
    "inline-flex p-0.5 border",
    size === "sm" ? "rounded-md" : "rounded-lg",
    isMonet
      ? "bg-white/60 border-[var(--monet-lavender)]/20"
      : "bg-white/[0.03] border-white/[0.08]",
    className
  )

  return (
    <div className={containerClasses}>
      {options.map((option) => {
        const isActive = option.value === value

        const buttonClasses = cn(
          "flex items-center gap-1.5 font-medium transition-all duration-150",
          size === "sm"
            ? "px-2 py-0.5 rounded text-[11px]"
            : "px-2.5 py-1 rounded-md text-xs",
          isActive
            ? isMonet
              ? "bg-[var(--monet-lavender)]/15 text-[var(--monet-text-primary)] shadow-sm"
              : "bg-white/[0.1] text-white shadow-sm"
            : isMonet
              ? "text-slate-500 hover:text-slate-700"
              : "text-slate-500 hover:text-slate-300"
        )

        return (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            className={buttonClasses}
          >
            {option.icon && (
              <span className="[&_svg]:h-3.5 [&_svg]:w-3.5">{option.icon}</span>
            )}
            {option.label}
          </button>
        )
      })}
    </div>
  )
}

export { SegmentedControl }

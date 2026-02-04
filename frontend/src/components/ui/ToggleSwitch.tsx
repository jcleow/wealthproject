"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { useTheme } from "@/lib/theme"

export interface ToggleSwitchProps {
  checked: boolean
  onChange: (checked: boolean) => void
  label?: string
  description?: string
  disabled?: boolean
  className?: string
}

function ToggleSwitch({
  checked,
  onChange,
  label,
  description,
  disabled = false,
  className,
}: ToggleSwitchProps) {
  const { isMonet } = useTheme()

  const trackClasses = cn(
    "relative inline-flex h-6 w-11 items-center rounded-full transition-colors shrink-0",
    disabled && "opacity-50 cursor-not-allowed",
    checked
      ? isMonet
        ? "bg-[var(--monet-lavender)]"
        : "bg-blue-600"
      : isMonet
        ? "bg-slate-300"
        : "bg-slate-600"
  )

  const thumbClasses = cn(
    "inline-block h-4 w-4 transform rounded-full bg-white transition-transform",
    checked ? "translate-x-6" : "translate-x-1"
  )

  const toggle = (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={trackClasses}
    >
      <span className={thumbClasses} />
    </button>
  )

  if (!label) {
    return toggle
  }

  return (
    <div className={cn("flex items-center justify-between", className)}>
      <div>
        <label
          className={cn(
            "block text-sm font-medium",
            isMonet ? "text-slate-700" : "text-slate-300"
          )}
        >
          {label}
        </label>
        {description && (
          <p
            className={cn(
              "text-xs mt-1",
              isMonet ? "text-slate-500" : "text-slate-500"
            )}
          >
            {description}
          </p>
        )}
      </div>
      {toggle}
    </div>
  )
}

export { ToggleSwitch }

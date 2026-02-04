"use client"

import * as React from "react"
import type { UseFormRegisterReturn } from "react-hook-form"
import { cn } from "@/lib/utils"
import { useTheme } from "@/lib/theme"

export interface FormFieldProps {
  label: string
  hint?: string
  error?: string
  required?: boolean
  type?: "text" | "number" | "date" | "email" | "password"
  registration?: UseFormRegisterReturn
  placeholder?: string
  step?: string
  defaultValue?: string | number
  suffix?: string
  layout?: "vertical" | "horizontal"
  className?: string
  inputClassName?: string
  disabled?: boolean
  min?: number | string
  max?: number | string
  value?: string | number
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void
}

const FormField = React.forwardRef<HTMLInputElement, FormFieldProps>(
  (
    {
      label,
      hint,
      error,
      required,
      type = "text",
      registration,
      placeholder,
      step,
      defaultValue,
      suffix,
      layout = "vertical",
      className,
      inputClassName,
      disabled,
      min,
      max,
      value,
      onChange,
    },
    ref
  ) => {
    const { isMonet, theme } = useTheme()

    const inputBaseClasses = cn(
      "w-full px-3 py-2 rounded-lg border text-sm focus:outline-none transition-colors",
      isMonet
        ? "border-[var(--monet-lavender)]/20 bg-white/80 text-slate-700 placeholder:text-slate-400 focus:border-[var(--monet-lavender)]/40"
        : "border-white/10 bg-white/5 text-white placeholder:text-gray-500 focus:border-emerald-400",
      error && "border-rose-400/50 focus:border-rose-400",
      disabled && "opacity-50 cursor-not-allowed",
      inputClassName
    )

    const labelClasses = cn(
      "block text-sm font-medium",
      isMonet ? "text-slate-700" : "text-gray-200"
    )

    const hintClasses = cn(
      "text-xs",
      isMonet ? "text-slate-500" : "text-slate-500"
    )

    const inputElement = (
      <div className={cn("relative", suffix && "flex items-center gap-2")}>
        <input
          ref={ref}
          type={type}
          step={step}
          placeholder={placeholder}
          defaultValue={defaultValue}
          required={required}
          disabled={disabled}
          min={min}
          max={max}
          value={value}
          onChange={onChange}
          className={inputBaseClasses}
          style={
            isMonet
              ? {
                  background: theme.inputBg,
                  color: theme.inputText,
                }
              : undefined
          }
          {...registration}
        />
        {suffix && (
          <span className={cn("text-sm shrink-0", isMonet ? "text-slate-500" : "text-slate-400")}>
            {suffix}
          </span>
        )}
      </div>
    )

    if (layout === "horizontal") {
      return (
        <div className={cn("flex items-center justify-between gap-4", className)}>
          <div className="flex-1">
            <label className={labelClasses}>
              {label}
              {required && <span className="ml-1 text-rose-400">*</span>}
            </label>
            {hint && !error && <p className={cn(hintClasses, "mt-0.5")}>{hint}</p>}
          </div>
          <div className="w-auto shrink-0">{inputElement}</div>
          {error && <p className="text-xs text-rose-300 w-full">{error}</p>}
        </div>
      )
    }

    return (
      <div className={cn("space-y-1.5", className)}>
        <label className={labelClasses}>
          {label}
          {required && <span className="ml-1 text-rose-400">*</span>}
        </label>
        {hint && !error && <p className={hintClasses}>{hint}</p>}
        {inputElement}
        {error && <p className="text-xs text-rose-300">{error}</p>}
      </div>
    )
  }
)
FormField.displayName = "FormField"

export { FormField }

"use client"

import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"
import { useTheme } from "@/lib/theme"
import { Loader2 } from "lucide-react"

const glassButtonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/20 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        primary:
          "bg-emerald-500 hover:bg-emerald-600 text-white",
        secondary:
          "border border-white/10 bg-white/5 hover:bg-white/10 text-gray-200",
        destructive:
          "bg-rose-500/15 text-rose-400 hover:bg-rose-500/25 border border-rose-500/20",
        ghost:
          "text-slate-400 hover:bg-white/5 hover:text-slate-300",
        icon:
          "h-8 w-8 rounded-full bg-white/5 hover:bg-white/10 text-slate-300",
      },
      size: {
        sm: "py-1.5 px-3 text-xs",
        default: "py-2 px-4 text-sm",
        lg: "py-2.5 px-5 text-sm",
        full: "w-full py-2.5 px-4 text-sm",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "default",
    },
    compoundVariants: [
      {
        variant: "icon",
        className: "p-0",
      },
    ],
  }
)

export interface GlassButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof glassButtonVariants> {
  loading?: boolean
  icon?: React.ReactNode
}

const GlassButton = React.forwardRef<HTMLButtonElement, GlassButtonProps>(
  ({ className, variant, size, loading, icon, children, disabled, style, ...props }, ref) => {
    const { isMonet, theme } = useTheme()

    const monetStyles: React.CSSProperties | undefined = isMonet
      ? getMonetStyleOverrides(variant ?? "primary", theme)
      : undefined

    return (
      <button
        className={cn(glassButtonVariants({ variant, size, className }))}
        ref={ref}
        disabled={disabled || loading}
        style={{ ...monetStyles, ...style }}
        {...props}
      >
        {loading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : icon ? (
          <span className="[&_svg]:h-4 [&_svg]:w-4">{icon}</span>
        ) : null}
        {children}
      </button>
    )
  }
)
GlassButton.displayName = "GlassButton"

function getMonetStyleOverrides(
  variant: string,
  theme: ReturnType<typeof useTheme>["theme"]
): React.CSSProperties {
  switch (variant) {
    case "primary":
      return {
        background: theme.buttonPrimaryBg,
        color: theme.buttonPrimaryText,
        border: "none",
      }
    case "secondary":
      return {
        background: theme.buttonSecondaryBg,
        color: theme.buttonSecondaryText,
        borderColor: theme.buttonSecondaryBorder,
      }
    case "ghost":
      return {
        color: theme.textSecondary,
      }
    case "icon":
      return {
        background: theme.controlBg,
        color: theme.textSecondary,
      }
    default:
      return {}
  }
}

export { GlassButton, glassButtonVariants }

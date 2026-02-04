"use client"

import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"
import { useTheme } from "@/lib/theme"

// --- Status color mapping ---
const statusColorMap = {
  emerald: {
    dark: "border-emerald-500/20 bg-emerald-500/5",
    monet: "border-emerald-400/30 bg-emerald-50",
  },
  amber: {
    dark: "border-amber-500/20 bg-amber-500/5",
    monet: "border-amber-400/30 bg-amber-50",
  },
  rose: {
    dark: "border-rose-500/20 bg-rose-500/5",
    monet: "border-rose-400/30 bg-rose-50",
  },
  blue: {
    dark: "border-blue-500/20 bg-blue-500/5",
    monet: "border-blue-400/30 bg-blue-50",
  },
} as const

export type StatusColor = keyof typeof statusColorMap

// --- Card variants ---
const glassCardVariants = cva("rounded-2xl border transition-all", {
  variants: {
    variant: {
      surface: "border-white/[0.08] bg-[#0a0a0a]/40",
      elevated: "border-white/[0.08] bg-[#0a0a0a]/60",
      glass: "border-white/[0.06] bg-white/[0.02] backdrop-blur-xl",
      status: "", // handled dynamically via statusColor prop
    },
    padding: {
      none: "",
      compact: "p-3",
      default: "p-4",
      spacious: "p-6",
    },
    hover: {
      true: "",
      false: "",
    },
  },
  compoundVariants: [
    {
      variant: "surface",
      hover: true,
      className: "hover:border-white/[0.12]",
    },
    {
      variant: "elevated",
      hover: true,
      className: "hover:border-white/[0.12]",
    },
    {
      variant: "glass",
      hover: true,
      className: "hover:border-white/[0.1]",
    },
  ],
  defaultVariants: {
    variant: "surface",
    padding: "default",
    hover: false,
  },
})

export interface GlassCardProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof glassCardVariants> {
  statusColor?: StatusColor
}

function GlassCard({
  className,
  variant,
  padding,
  hover,
  statusColor,
  style,
  children,
  ...props
}: GlassCardProps) {
  const { isMonet, theme } = useTheme()

  const monetStyleOverrides: React.CSSProperties | undefined = isMonet
    ? variant === "status" && statusColor
      ? undefined // use Tailwind classes for status colors in monet
      : {
          background: variant === "glass" ? theme.cardBg : theme.cardBg,
          borderColor: theme.cardBorder,
        }
    : undefined

  const statusClasses =
    variant === "status" && statusColor
      ? statusColorMap[statusColor][isMonet ? "monet" : "dark"]
      : undefined

  return (
    <div
      className={cn(
        glassCardVariants({ variant: variant === "status" ? "status" : variant, padding, hover }),
        statusClasses,
        className
      )}
      style={{ ...monetStyleOverrides, ...style }}
      {...props}
    >
      {children}
    </div>
  )
}

// --- Compound sub-components ---

function GlassCardHeader({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("flex items-center justify-between pb-3 border-b border-white/[0.06]", className)}
      {...props}
    >
      {children}
    </div>
  )
}

function GlassCardContent({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("py-3", className)} {...props}>
      {children}
    </div>
  )
}

function GlassCardFooter({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("flex items-center gap-3 pt-3 border-t border-white/[0.06]", className)}
      {...props}
    >
      {children}
    </div>
  )
}

// Attach sub-components
GlassCard.displayName = "GlassCard"
GlassCardHeader.displayName = "GlassCard.Header"
GlassCardContent.displayName = "GlassCard.Content"
GlassCardFooter.displayName = "GlassCard.Footer"

export {
  GlassCard,
  GlassCardHeader,
  GlassCardContent,
  GlassCardFooter,
  glassCardVariants,
}

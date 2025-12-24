'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { AccordionColor } from '../types'

const accordionColors: Record<AccordionColor, { border: string; indicator: string; hover: string }> = {
  rose: {
    border: 'border-l-rose-500/50',
    indicator: 'bg-rose-500',
    hover: 'hover:bg-rose-500/5',
  },
  violet: {
    border: 'border-l-violet-500/50',
    indicator: 'bg-violet-500',
    hover: 'hover:bg-violet-500/5',
  },
  emerald: {
    border: 'border-l-emerald-500/50',
    indicator: 'bg-emerald-500',
    hover: 'hover:bg-emerald-500/5',
  },
  amber: {
    border: 'border-l-amber-500/50',
    indicator: 'bg-amber-500',
    hover: 'hover:bg-amber-500/5',
  },
}

interface FormAccordionProps {
  title: string
  subtitle?: string
  children: React.ReactNode
  defaultOpen?: boolean
  badge?: React.ReactNode
  color?: AccordionColor
}

/**
 * FormAccordion - A collapsible section component for grouping form fields.
 * Features animated expand/collapse, color theming, and optional badges.
 */
export function FormAccordion({
  title,
  subtitle,
  children,
  defaultOpen = true,
  badge,
  color = 'violet',
}: FormAccordionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen)
  const colorStyles = accordionColors[color]

  return (
    <div className={cn(
      "rounded-xl border border-white/[0.06] bg-white/[0.02] overflow-hidden",
      "border-l-2",
      colorStyles.border
    )}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "w-full px-4 py-3 flex items-center justify-between transition-colors",
          colorStyles.hover
        )}
      >
        <div className="flex items-center gap-3">
          <div className={cn("w-1.5 h-1.5 rounded-full", colorStyles.indicator)} />
          <div className="text-left">
            <span className="text-sm font-medium text-white">{title}</span>
            {subtitle && (
              <span className="text-xs text-slate-500 ml-2">{subtitle}</span>
            )}
          </div>
          {badge}
        </div>
        <motion.div
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.2 }}
        >
          <ChevronDown className="w-4 h-4 text-slate-500" />
        </motion.div>
      </button>
      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 pt-1 border-t border-white/[0.04]">
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

'use client'

import { HelpCircle } from 'lucide-react'

interface InfoTooltipProps {
  title: string
  description: string
}

/**
 * InfoTooltip - A help icon with hover tooltip for displaying helpful information.
 * Uses glassmorphic styling consistent with the design system.
 */
export function InfoTooltip({ title, description }: InfoTooltipProps) {
  return (
    <div className="group relative inline-flex">
      <HelpCircle className="w-3.5 h-3.5 text-slate-600 cursor-help" />
      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 p-3 rounded-xl bg-gray-900/95 border border-white/10 text-xs text-slate-300 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50 shadow-xl backdrop-blur-xl">
        <p className="font-medium text-white mb-1">{title}</p>
        <p className="leading-relaxed">{description}</p>
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 rotate-45 w-2 h-2 bg-gray-900/95 border-r border-b border-white/10" />
      </div>
    </div>
  )
}

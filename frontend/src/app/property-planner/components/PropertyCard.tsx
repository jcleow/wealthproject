'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { CheckCircle2, Banknote } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { PropertyOption } from '../types'

interface PropertyCardProps {
  option: PropertyOption
  isSelected: boolean
  onClick: () => void
}

/**
 * PropertyCard - A selectable card for property type selection.
 * Features hover animations, selection state, and property highlights.
 */
export function PropertyCard({
  option,
  isSelected,
  onClick,
}: PropertyCardProps) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      className={cn(
        "relative group text-left w-full rounded-2xl border transition-all duration-200",
        "bg-white/[0.02] backdrop-blur-xl p-6",
        isSelected
          ? "border-white/20 bg-white/[0.05] shadow-lg shadow-black/40"
          : "border-white/[0.06] hover:border-white/[0.12] hover:bg-white/[0.04]"
      )}
      whileHover={{ y: -4, transition: { duration: 0.2 } }}
      whileTap={{ scale: 0.98 }}
    >
      {/* Icon with gradient background */}
      <div className={cn(
        "w-12 h-12 rounded-xl flex items-center justify-center mb-4",
        "bg-gradient-to-br shadow-lg",
        option.color
      )}>
        <span className={option.accentColor}>
          {option.icon}
        </span>
      </div>

      <h3 className="text-lg font-semibold text-white mb-1 tracking-tight">
        {option.title}
      </h3>
      <p className={cn("text-sm font-medium mb-3", option.accentColor)}>
        {option.subtitle}
      </p>
      <p className="text-sm text-slate-400 mb-4 leading-relaxed line-clamp-2">
        {option.description}
      </p>

      {/* Price range badge */}
      <div className="flex items-center gap-2 mb-4">
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/[0.04] text-xs font-medium text-slate-300">
          <Banknote className="w-3.5 h-3.5 text-slate-500" />
          {option.priceRange}
        </span>
      </div>

      {/* Highlights */}
      <div className="flex flex-wrap gap-1.5">
        {option.highlights.map((highlight, index) => (
          <span
            key={index}
            className="text-xs px-2 py-0.5 rounded-md bg-white/[0.03] text-slate-500 border border-white/[0.04]"
          >
            {highlight}
          </span>
        ))}
      </div>

      {/* Selected indicator */}
      <AnimatePresence>
        {isSelected && (
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            className="absolute top-4 right-4"
          >
            <div className={cn(
              "w-6 h-6 rounded-full flex items-center justify-center",
              "bg-gradient-to-br shadow-lg",
              option.color
            )}>
              <CheckCircle2 className="w-4 h-4 text-white" />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.button>
  )
}

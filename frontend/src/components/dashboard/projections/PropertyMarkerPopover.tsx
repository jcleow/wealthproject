'use client'

import { useEffect, useRef, useState, useCallback, type ComponentType } from 'react'
import { createPortal } from 'react-dom'
import * as LucideIcons from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import type { PropertyMarkerData, PropertyMilestone } from './chartjs/types'

const EditIcon = LucideIcons.Pencil as ComponentType<{ className?: string }>
const KeyIcon = LucideIcons.Key as ComponentType<{ className?: string }>
const BanknoteIcon = LucideIcons.Banknote as ComponentType<{ className?: string }>
const ReceiptIcon = LucideIcons.Receipt as ComponentType<{ className?: string }>

// Build a map of icon name to component for dynamic rendering
const ICON_MAP: Record<string, ComponentType<{ className?: string; style?: React.CSSProperties }>> = {}
Object.entries(LucideIcons).forEach(([key, component]) => {
  if (key === 'default' || key === 'createLucideIcon') return
  const type = typeof component
  if (type !== 'function' && type !== 'object') return
  // Convert PascalCase to kebab-case
  const kebab = key
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .replace(/_/g, '-')
    .toLowerCase()
  ICON_MAP[kebab] = component as ComponentType<{ className?: string; style?: React.CSSProperties }>
})

function getIconComponent(iconName: string): ComponentType<{ className?: string; style?: React.CSSProperties }> {
  return ICON_MAP[iconName] || LucideIcons.HelpCircle as ComponentType<{ className?: string; style?: React.CSSProperties }>
}

function getMilestoneIcon(type: PropertyMilestone['type']): ComponentType<{ className?: string }> {
  switch (type) {
    case 'purchase':
      return KeyIcon
    case 'sale':
      return BanknoteIcon
    case 'fee':
      return ReceiptIcon
    default:
      return KeyIcon
  }
}

function formatMilestoneDate(date: string): string {
  // date is in YYYY-MM format
  const [year, month] = date.split('-')
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  const monthIndex = parseInt(month, 10) - 1
  return `${monthNames[monthIndex]} ${year}`
}

interface PropertyMarkerPopoverProps {
  marker: PropertyMarkerData
  position: { x: number; y: number }
  chartContainerRef: React.RefObject<HTMLDivElement>
  onClose: () => void
  onMilestoneClick?: (milestone: PropertyMilestone) => void
  onEditScenario: () => void
}

export function PropertyMarkerPopover({
  marker,
  position,
  chartContainerRef,
  onClose,
  onMilestoneClick,
  onEditScenario,
}: PropertyMarkerPopoverProps) {
  const popoverRef = useRef<HTMLDivElement>(null)
  const [adjustedPosition, setAdjustedPosition] = useState({ x: 0, y: 0 })

  // Calculate position relative to viewport for portal
  useEffect(() => {
    if (!chartContainerRef.current) {
      setAdjustedPosition(position)
      return
    }

    const containerRect = chartContainerRef.current.getBoundingClientRect()

    // Convert chart-relative position to viewport position
    let viewportX = containerRect.left + position.x
    let viewportY = containerRect.top + position.y

    // Adjust for popover size (estimate 240px wide, 200px tall)
    const popoverWidth = 240
    const popoverHeight = 200
    const padding = 16

    // Keep within viewport horizontally
    if (viewportX + popoverWidth > window.innerWidth - padding) {
      viewportX = viewportX - popoverWidth - 30 // Show to the left of marker
    } else {
      viewportX = viewportX + 30 // Show to the right of marker
    }

    // Keep within viewport vertically
    if (viewportY + popoverHeight > window.innerHeight - padding) {
      viewportY = window.innerHeight - popoverHeight - padding
    }
    if (viewportY < padding) {
      viewportY = padding
    }

    setAdjustedPosition({ x: viewportX, y: viewportY })
  }, [position, chartContainerRef])

  // Close on click outside
  const handleClickOutside = useCallback((event: MouseEvent) => {
    if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
      onClose()
    }
  }, [onClose])

  // Close on escape key
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (event.key === 'Escape') {
      onClose()
    }
  }, [onClose])

  useEffect(() => {
    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [handleClickOutside, handleKeyDown])

  const IconComponent = getIconComponent(marker.icon)

  if (typeof document === 'undefined') return null

  return createPortal(
    <AnimatePresence>
      <motion.div
        ref={popoverRef}
        initial={{ opacity: 0, scale: 0.95, y: 4 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 4 }}
        transition={{ duration: 0.15 }}
        style={{
          position: 'fixed',
          left: adjustedPosition.x,
          top: adjustedPosition.y,
          zIndex: 9999,
        }}
        className="min-w-[220px] rounded-xl border border-white/10 bg-[#0c1119]/95 shadow-2xl backdrop-blur-xl"
      >
        {/* Header with scenario name and edit button */}
        <div className="flex items-center gap-3 border-b border-white/[0.06] px-4 py-3">
          <div
            className="flex h-8 w-8 items-center justify-center rounded-lg"
            style={{ backgroundColor: `${marker.iconColor}20` }}
          >
            <IconComponent
              className="h-4 w-4"
              style={{ color: marker.iconColor }}
            />
          </div>
          <div className="flex-1 min-w-0">
            <p className="truncate text-sm font-medium text-white">{marker.name}</p>
            <p className="text-[10px] uppercase tracking-wider text-slate-500">
              Property Scenario
            </p>
          </div>
          <button
            type="button"
            onClick={onEditScenario}
            className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 transition-all hover:bg-white/[0.08] hover:text-white"
            title="Edit scenario"
          >
            <EditIcon className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Milestones list */}
        <div className="p-2">
          {marker.nestedMilestones.length === 0 ? (
            <div className="px-2 py-3 text-center text-xs text-slate-500">
              No milestones
            </div>
          ) : (
            <div className="space-y-0.5">
              {marker.nestedMilestones.map((milestone) => {
                const MilestoneIcon = getMilestoneIcon(milestone.type)
                return (
                  <button
                    key={milestone.id}
                    type="button"
                    onClick={() => onMilestoneClick?.(milestone)}
                    className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left transition-all hover:bg-white/[0.05]"
                  >
                    <div
                      className="flex h-7 w-7 items-center justify-center rounded-md"
                      style={{ backgroundColor: `${milestone.iconColor}15` }}
                    >
                      <MilestoneIcon className="h-3.5 w-3.5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-slate-200">{milestone.label}</p>
                    </div>
                    <span className="text-[10px] font-medium text-slate-500">
                      {formatMilestoneDate(milestone.date)}
                    </span>
                  </button>
                )
              })}
            </div>
          )}
        </div>

        {/* Action footer */}
        <div className="border-t border-white/[0.06] px-3 py-2">
          <button
            type="button"
            onClick={onEditScenario}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-white/[0.05] py-2 text-xs font-medium text-slate-300 transition-all hover:bg-white/[0.1] hover:text-white"
          >
            <EditIcon className="h-3 w-3" />
            Edit Property Scenario
          </button>
        </div>
      </motion.div>
    </AnimatePresence>,
    document.body
  )
}

export default PropertyMarkerPopover

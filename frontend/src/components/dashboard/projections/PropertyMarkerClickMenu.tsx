'use client'

import { useEffect, useRef, useState, type ComponentType } from 'react'
import { createPortal } from 'react-dom'
import { ChevronDown, ChevronUp, Settings, X } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import type { PropertyMarkerData } from './chartjs/types'
import * as LucideIcons from 'lucide-react'

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
  if (!iconName) return LucideIcons.HelpCircle as ComponentType<{ className?: string; style?: React.CSSProperties }>
  const normalized = iconName.toLowerCase()
  return ICON_MAP[normalized] || LucideIcons.HelpCircle as ComponentType<{ className?: string; style?: React.CSSProperties }>
}

interface PropertyMarkerClickMenuProps {
  marker: PropertyMarkerData
  position: { x: number; y: number }
  isExpanded: boolean
  onToggleExpand: () => void
  onOpenModal: () => void
  onClose: () => void
  chartContainerRef: React.RefObject<HTMLDivElement | null>
}

export function PropertyMarkerClickMenu({
  marker,
  position,
  isExpanded,
  onToggleExpand,
  onOpenModal,
  onClose,
  chartContainerRef,
}: PropertyMarkerClickMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null)
  const [adjustedPosition, setAdjustedPosition] = useState({ x: 0, y: 0 })

  // Calculate position relative to viewport for portal
  useEffect(() => {
    // If position values are large (> 100), assume they're already viewport coordinates
    const isViewportCoords = position.x > 100 || position.y > 100

    if (isViewportCoords) {
      setAdjustedPosition({ x: position.x + 12, y: position.y - 40 })
      return
    }

    if (!chartContainerRef.current) {
      setAdjustedPosition(position)
      return
    }

    const containerRect = chartContainerRef.current.getBoundingClientRect()
    const viewportX = containerRect.left + position.x + 20
    const viewportY = containerRect.top + position.y - 40

    setAdjustedPosition({ x: viewportX, y: viewportY })
  }, [position, chartContainerRef])

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose()
      }
    }

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose()
      }
    }

    // Delay to prevent immediate close from the click that opened the menu
    const timeoutId = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside)
      document.addEventListener('keydown', handleEscape)
    }, 50)

    return () => {
      clearTimeout(timeoutId)
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [onClose])

  const milestoneCount = marker.nestedMilestones.length
  const IconComponent = getIconComponent(marker.icon)

  if (typeof document === 'undefined') return null

  return createPortal(
    <AnimatePresence>
      <motion.div
        ref={menuRef}
        initial={{ opacity: 0, scale: 0.95, y: 4 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 4 }}
        transition={{ duration: 0.12 }}
        style={{
          position: 'fixed',
          left: adjustedPosition.x,
          top: adjustedPosition.y,
          zIndex: 9999,
        }}
        className="min-w-[180px] overflow-hidden rounded-lg border border-white/10 bg-[#0c1119]/95 shadow-xl backdrop-blur-md"
      >
        {/* Header with marker info */}
        <div className="flex items-center gap-2 border-b border-white/[0.06] px-3 py-2">
          <div
            className="flex h-5 w-5 items-center justify-center rounded"
            style={{ backgroundColor: `${marker.iconColor}25` }}
          >
            <IconComponent
              className="h-3 w-3"
              style={{ color: marker.iconColor }}
            />
          </div>
          <span className="flex-1 text-xs font-medium text-slate-200 truncate">
            {marker.name}
          </span>
          <button
            type="button"
            onClick={onClose}
            className="flex h-5 w-5 items-center justify-center rounded text-slate-500 transition-colors hover:bg-white/[0.06] hover:text-slate-300"
          >
            <X className="h-3 w-3" />
          </button>
        </div>

        {/* Menu options */}
        <div className="p-1">
          {/* Open Modal option */}
          <button
            type="button"
            onClick={() => {
              onOpenModal()
              onClose()
            }}
            className="flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-left text-xs text-slate-300 transition-colors hover:bg-white/[0.06] hover:text-white"
          >
            <Settings className="h-3.5 w-3.5 text-slate-500" />
            <span>Edit Property Scenario</span>
          </button>

          {/* Toggle expand/collapse option */}
          {milestoneCount > 0 && (
            <button
              type="button"
              onClick={() => {
                onToggleExpand()
                onClose()
              }}
              className="flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-left text-xs text-slate-300 transition-colors hover:bg-white/[0.06] hover:text-white"
            >
              {isExpanded ? (
                <>
                  <ChevronUp className="h-3.5 w-3.5 text-slate-500" />
                  <span>Hide {milestoneCount} {milestoneCount === 1 ? 'milestone' : 'milestones'}</span>
                </>
              ) : (
                <>
                  <ChevronDown className="h-3.5 w-3.5 text-slate-500" />
                  <span>Show {milestoneCount} {milestoneCount === 1 ? 'milestone' : 'milestones'}</span>
                </>
              )}
            </button>
          )}
        </div>
      </motion.div>
    </AnimatePresence>,
    document.body
  )
}

export default PropertyMarkerClickMenu

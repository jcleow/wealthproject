'use client'

import { useEffect, useRef, useState, type ComponentType } from 'react'
import { createPortal } from 'react-dom'
import { ChevronDown, ChevronUp } from 'lucide-react'
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
  return ICON_MAP[iconName] || LucideIcons.HelpCircle as ComponentType<{ className?: string; style?: React.CSSProperties }>
}

interface PropertyMarkerHoverOverlayProps {
  marker: PropertyMarkerData
  position: { x: number; y: number }
  isExpanded: boolean
  onToggleExpand: () => void
  chartContainerRef: React.RefObject<HTMLDivElement | null>
}

export function PropertyMarkerHoverOverlay({
  marker,
  position,
  isExpanded,
  onToggleExpand,
  chartContainerRef,
}: PropertyMarkerHoverOverlayProps) {
  const overlayRef = useRef<HTMLDivElement>(null)
  const [adjustedPosition, setAdjustedPosition] = useState({ x: 0, y: 0 })

  // Calculate position relative to viewport for portal
  useEffect(() => {
    // If position values are large (> 100), assume they're already viewport coordinates
    // This handles the Recharts case where getBoundingClientRect is used directly
    const isViewportCoords = position.x > 100 || position.y > 100

    if (isViewportCoords) {
      // Position is already in viewport coords, just add small offset
      setAdjustedPosition({ x: position.x + 10, y: position.y - 15 })
      return
    }

    if (!chartContainerRef.current) {
      setAdjustedPosition(position)
      return
    }

    const containerRect = chartContainerRef.current.getBoundingClientRect()

    // Convert chart-relative position to viewport position
    // Position to the right of the marker
    const viewportX = containerRect.left + position.x + 20
    const viewportY = containerRect.top + position.y - 15

    setAdjustedPosition({ x: viewportX, y: viewportY })
  }, [position, chartContainerRef])

  const milestoneCount = marker.nestedMilestones.length
  const IconComponent = getIconComponent(marker.icon)

  if (typeof document === 'undefined') return null

  return createPortal(
    <AnimatePresence>
      <motion.div
        ref={overlayRef}
        initial={{ opacity: 0, x: -4 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -4 }}
        transition={{ duration: 0.15 }}
        style={{
          position: 'fixed',
          left: adjustedPosition.x,
          top: adjustedPosition.y,
          zIndex: 9998,
          // Container is pointer-events: none so it doesn't block chart hover detection
          pointerEvents: 'none',
        }}
        className="flex items-center gap-1.5"
      >
        {/* Expand/Collapse button - needs pointer events for clicking */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            onToggleExpand()
          }}
          style={{ pointerEvents: 'auto' }}
          className="flex h-6 w-6 items-center justify-center rounded-md border border-white/10 bg-[#0c1119]/90 text-slate-300 shadow-lg backdrop-blur-sm transition-all hover:border-white/20 hover:bg-[#0c1119] hover:text-white"
          title={isExpanded ? 'Collapse milestones' : 'Expand milestones'}
        >
          {isExpanded ? (
            <ChevronUp className="h-3.5 w-3.5" />
          ) : (
            <ChevronDown className="h-3.5 w-3.5" />
          )}
        </button>

        {/* Tooltip showing milestone count - no pointer events needed */}
        <div className="flex items-center gap-1.5 rounded-md border border-white/10 bg-[#0c1119]/90 px-2 py-1 shadow-lg backdrop-blur-sm">
          <div
            className="flex h-4 w-4 items-center justify-center rounded"
            style={{ backgroundColor: `${marker.iconColor}20` }}
          >
            <IconComponent
              className="h-2.5 w-2.5"
              style={{ color: marker.iconColor }}
            />
          </div>
          <span className="text-[10px] font-medium text-slate-300">
            {milestoneCount} {milestoneCount === 1 ? 'milestone' : 'milestones'}
          </span>
        </div>
      </motion.div>
    </AnimatePresence>,
    document.body
  )
}

export default PropertyMarkerHoverOverlay

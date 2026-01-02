"use client"

import * as LucideIcons from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { PropertyMarkerData } from './projections/chartjs/types'

type PropertyScenarioMarkerProps = {
  cx?: number
  cy?: number
  marker: PropertyMarkerData
  /** Called when marker is clicked - opens click menu with options */
  onClick?: (marker: PropertyMarkerData, x: number, y: number) => void
  isExpanded?: boolean
  visible?: boolean
  animate?: boolean
}

/**
 * Property scenario marker for Recharts.
 * Displays a simple marker showing property purchase events (no outer rings).
 * On click, opens a menu with options to edit or expand/collapse milestones.
 */
export default function PropertyScenarioMarker({
  cx = 0,
  cy = 0,
  marker,
  onClick,
  isExpanded: _isExpanded = false,
  visible = true,
  animate = true,
}: PropertyScenarioMarkerProps) {
  const innerRadius = 14
  const iconSize = innerRadius * 1.2
  const baseLift = innerRadius * 1.5 + 10

  const handleClick = (event: React.MouseEvent) => {
    if (onClick) {
      // Get position relative to viewport for the menu
      const rect = (event.currentTarget as SVGGElement).getBoundingClientRect()
      onClick(marker, rect.right, rect.top + rect.height / 2)
    }
  }

  const Icon = getIconByName(marker.icon)
  const isDisabled = marker.isIncluded === false
  const opacity = visible ? (isDisabled ? 0.45 : 1) : 0
  const transition = animate ? 'opacity 380ms ease-in-out 140ms' : 'none'
  const pointerEvents = visible ? 'auto' : 'none'

  return (
    <g
      transform={`translate(${cx}, ${cy - baseLift})`}
      role="button"
      tabIndex={0}
      style={{ cursor: 'pointer', transition, pointerEvents, willChange: 'opacity' }}
      opacity={opacity}
      onClick={handleClick}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          handleClick(event as unknown as React.MouseEvent)
        }
      }}
    >
      {/* Filled circle (no outer rings - matching Chart.js style) */}
      <circle
        r={innerRadius}
        fill={marker.iconColor}
        stroke="rgba(255,255,255,0.3)"
        strokeWidth={1}
      />

      {/* Icon - pointer-events: none so mouse events bubble to parent <g> */}
      {Icon ? (
        <foreignObject
          x={-iconSize / 2}
          y={-iconSize / 2}
          width={iconSize}
          height={iconSize}
          style={{ pointerEvents: 'none' }}
        >
          <Icon
            aria-hidden
            className="text-white"
            width={iconSize}
            height={iconSize}
            stroke="rgba(255,255,255,0.9)"
            strokeWidth={1.5}
            fill="none"
            style={{ pointerEvents: 'none' }}
          />
        </foreignObject>
      ) : (
        <text
          x={0}
          y={3}
          textAnchor="middle"
          fill="#ffffff"
          fontSize={11}
          fontWeight={700}
          style={{ pointerEvents: 'none' }}
        >
          {(marker.icon ?? 'H').slice(0, 1).toUpperCase()}
        </text>
      )}
    </g>
  )
}

const iconLookup = Object.entries(LucideIcons).reduce<Record<string, LucideIcon>>((acc, [key, component]) => {
  if (key === 'default' || key === 'createLucideIcon') return acc
  const kebab = key
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .replace(/_/g, '-')
    .toLowerCase()
  acc[kebab] = component as LucideIcon
  return acc
}, {})

export function getIconByName(name: string): LucideIcon | undefined {
  if (!name) return undefined
  const normalized = name.toLowerCase()
  return iconLookup[normalized]
}

/**
 * Nested milestone marker data with chart positioning
 */
export interface NestedMilestoneData {
  id: string
  type: 'purchase' | 'sale' | 'fee'
  label: string
  icon: string
  iconColor: string
  yearIndex: number
  netWorth: number
  propertyScenarioId: string
  /** Vertical offset for stacking multiple milestones at the same position */
  stackOffset?: number
}

type NestedMilestoneMarkerProps = {
  cx?: number
  cy?: number
  milestone: NestedMilestoneData
  visible?: boolean
  animate?: boolean
}

/**
 * Smaller marker for nested milestones (fees, sales) when expanded.
 * Uses a simpler single-circle design with icon.
 */
export function NestedMilestoneMarker({
  cx = 0,
  cy = 0,
  milestone,
  visible = true,
  animate = true,
}: NestedMilestoneMarkerProps) {
  const radius = 10
  const iconSize = radius * 1.2
  const baseLift = radius * 1.5 + 6
  // Stack offset: each additional milestone at same position shifts up by (radius * 2 + 4)
  const stackOffset = (milestone.stackOffset ?? 0) * (radius * 2 + 4)

  const Icon = getIconByName(milestone.icon)
  const opacity = visible ? 1 : 0
  const transition = animate ? 'opacity 280ms ease-in-out 80ms' : 'none'
  const pointerEvents = visible ? 'auto' : 'none'

  return (
    <g
      transform={`translate(${cx}, ${cy - baseLift - stackOffset})`}
      style={{ cursor: 'default', transition, pointerEvents, willChange: 'opacity' }}
      opacity={opacity}
    >
      {/* Filled circle (no outer ring - matching Chart.js style) */}
      <circle
        r={radius}
        fill={milestone.iconColor}
        stroke="rgba(255,255,255,0.25)"
        strokeWidth={1}
      />

      {/* Icon */}
      {Icon ? (
        <foreignObject
          x={-iconSize / 2}
          y={-iconSize / 2}
          width={iconSize}
          height={iconSize}
        >
          <Icon
            aria-hidden
            className="text-white"
            width={iconSize}
            height={iconSize}
            stroke="rgba(255,255,255,0.9)"
            strokeWidth={1.5}
            fill="none"
          />
        </foreignObject>
      ) : (
        <text
          x={0}
          y={3}
          textAnchor="middle"
          fill="#ffffff"
          fontSize={9}
          fontWeight={700}
        >
          {(milestone.icon ?? 'F').slice(0, 1).toUpperCase()}
        </text>
      )}
    </g>
  )
}

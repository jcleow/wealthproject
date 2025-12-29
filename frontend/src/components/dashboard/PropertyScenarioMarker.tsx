"use client"

import * as LucideIcons from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { PropertyMarkerData } from './projections/chartjs/types'

type PropertyScenarioMarkerProps = {
  cx?: number
  cy?: number
  marker: PropertyMarkerData
  onPropertyScenarioEdit?: (scenarioId: string) => void
  onToggleExpand?: (scenarioId: string) => void
  isExpanded?: boolean
  visible?: boolean
  animate?: boolean
}

/**
 * Property scenario marker with double-ring design for Recharts.
 * Displays a compound marker showing property purchase events.
 */
export default function PropertyScenarioMarker({
  cx = 0,
  cy = 0,
  marker,
  onPropertyScenarioEdit,
  onToggleExpand,
  isExpanded = false,
  visible = true,
  animate = true,
}: PropertyScenarioMarkerProps) {
  const innerRadius = 14
  const ring1Radius = 19
  const ring2Radius = 24
  const ringStrokeWidth = 2
  const iconSize = innerRadius * 1.2
  const baseLift = innerRadius * 1.5 + 10

  const handleClick = () => {
    if (onPropertyScenarioEdit && marker.propertyScenarioId) {
      onPropertyScenarioEdit(marker.propertyScenarioId)
    }
  }

  const handleDoubleClick = (event: React.MouseEvent) => {
    event.stopPropagation()
    if (onToggleExpand && marker.propertyScenarioId) {
      onToggleExpand(marker.propertyScenarioId)
    }
  }

  const Icon = getIconByName(marker.icon)
  const isDisabled = marker.isIncluded === false
  const opacity = visible ? (isDisabled ? 0.45 : 1) : 0
  const transition = animate ? 'opacity 380ms ease-in-out 140ms' : 'none'
  const pointerEvents = visible ? 'auto' : 'none'

  // Create semi-transparent version of marker color for outer ring
  const outerRingColor = marker.iconColor + '99' // 60% opacity

  // Visual indicator for expanded state
  const expandedRingRadius = ring2Radius + 4
  const expandedRingColor = isExpanded ? marker.iconColor + '40' : 'transparent'

  return (
    <g
      transform={`translate(${cx}, ${cy - baseLift})`}
      role="button"
      tabIndex={0}
      style={{ cursor: 'pointer', transition, pointerEvents, willChange: 'opacity' }}
      opacity={opacity}
      onClick={handleClick}
      onDoubleClick={handleDoubleClick}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          handleClick()
        }
      }}
    >
      {/* Expanded indicator ring (only visible when expanded) */}
      {isExpanded && (
        <circle
          r={expandedRingRadius}
          fill="none"
          stroke={expandedRingColor}
          strokeWidth={3}
          strokeDasharray="4 4"
          style={{ animation: 'spin 8s linear infinite' }}
        />
      )}
      {/* Outer ring 2 (colored with marker color) */}
      <circle
        r={ring2Radius}
        fill="none"
        stroke={outerRingColor}
        strokeWidth={ringStrokeWidth}
      />

      {/* Outer ring 1 (neutral white) */}
      <circle
        r={ring1Radius}
        fill="none"
        stroke="rgba(255,255,255,0.15)"
        strokeWidth={ringStrokeWidth}
      />

      {/* Inner filled circle */}
      <circle
        r={innerRadius}
        fill={marker.iconColor}
        stroke="rgba(255,255,255,0.3)"
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
          fontSize={11}
          fontWeight={700}
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

  const Icon = getIconByName(milestone.icon)
  const opacity = visible ? 1 : 0
  const transition = animate ? 'opacity 280ms ease-in-out 80ms' : 'none'
  const pointerEvents = visible ? 'auto' : 'none'

  return (
    <g
      transform={`translate(${cx}, ${cy - baseLift})`}
      style={{ cursor: 'default', transition, pointerEvents, willChange: 'opacity' }}
      opacity={opacity}
    >
      {/* Outer glow ring */}
      <circle
        r={radius + 3}
        fill="none"
        stroke={milestone.iconColor + '30'}
        strokeWidth={2}
      />

      {/* Inner filled circle */}
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

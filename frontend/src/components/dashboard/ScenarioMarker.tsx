"use client"

import type { ScenarioEvent } from '@/types/scenario'
import * as LucideIcons from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

type ScenarioMarkerProps = {
  cx?: number
  cy?: number
  events: ScenarioEvent[]
  yearIndex: number
  onSelectYear?: (year: number) => void
  onScenarioSelect?: (event: ScenarioEvent) => void
  visible?: boolean
  animate?: boolean
}

export default function ScenarioMarker({
  cx = 0,
  cy = 0,
  events,
  yearIndex,
  onSelectYear,
  onScenarioSelect,
  visible = true,
  animate = true,
}: ScenarioMarkerProps) {
  const markerRadius = 14
  const baseLift = markerRadius * 1.5 + 10
  const stackSpacing = markerRadius * 2 + 8
  const iconSize = markerRadius * 1.2

  const handleClick = (primary?: ScenarioEvent) => {
    if (primary && onScenarioSelect) {
      onScenarioSelect(primary)
    } else if (onSelectYear) {
      onSelectYear(yearIndex)
    }
  }

  return (
    <g transform={`translate(${cx}, ${cy})`} role="button" tabIndex={0} style={{ cursor: 'pointer' }}>
      {events.map((evt, idx) => {
        const color = evt.displayColor || '#0ea5e9'
        const iconName = evt.displayIcon ?? ''
        const Icon = getIconByName(iconName)
        const offsetY = -(baseLift + idx * stackSpacing)
        const isDisabled = evt.isIncluded === false
        const opacity = visible ? (isDisabled ? 0.45 : 1) : 0
        const transition = animate ? 'opacity 380ms ease-in-out 140ms' : 'none'
        const pointerEvents = visible ? 'auto' : 'none'
        return (
          <g
            key={`${evt.id ?? idx}-${idx}`}
            transform={`translate(0, ${offsetY})`}
            onClick={() => handleClick(evt)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault()
                handleClick(evt)
              }
            }}
            opacity={opacity}
            style={{ cursor: 'pointer', transition, pointerEvents, willChange: 'opacity' }}
          >
            <circle
              r={markerRadius}
              fill={color}
              stroke="rgba(255,255,255,0.3)"
              strokeWidth={1}
            />
            {Icon ? (
              <Icon
                aria-hidden
                className="text-white"
                width={iconSize}
                height={iconSize}
                style={{ transform: `translate(-${iconSize / 2}px, -${iconSize / 2}px)` }}
                stroke="rgba(255,255,255,0.9)"
                strokeWidth={1.5}
                fill="none"
              />
            ) : (
              <text
                x={0}
                y={3}
                textAnchor="middle"
                fill="#ffffff"
                fontSize={11}
                fontWeight={700}
              >
                {(evt.displayIcon ?? '✦').slice(0, 1).toUpperCase()}
              </text>
            )}
          </g>
        )
      })}
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

function getIconByName(name: string): LucideIcon | undefined {
  if (!name) return undefined
  const normalized = name.toLowerCase()
  return iconLookup[normalized]
}

import * as LucideIcons from 'lucide-react'

import type { ScenarioEvent } from '@/types/scenario'

type ScenarioMarkerProps = {
  cx?: number
  cy?: number
  events: ScenarioEvent[]
  onSelectYear?: (yearIndex: number) => void
  yearIndex: number
}

const toPascalCase = (value: string) =>
  value
    .split(/[-_]/)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join('')

export function ScenarioMarker({ cx = 0, cy = 0, events, onSelectYear, yearIndex }: ScenarioMarkerProps) {
  if (!events || events.length === 0) return null

  const primary = events[0]
  const getIcon = (iconName?: string) => {
    if (!iconName) return null
    const pascal = toPascalCase(iconName)
    const IconComp = (LucideIcons as Record<string, React.ComponentType<{ className?: string; width?: number; height?: number }>>)[pascal]
    return IconComp ?? null
  }

  const IconComp = getIcon(primary.display_icon ?? 'sparkles')
  const color = primary.display_color || '#0ea5e9'
  const extraCount = events.length - 1

  // Size math tied together for consistent centering/scaling.
  const markerRadius = 14
  const lift = markerRadius + 2
  const iconSize = markerRadius * 0.75
  const iconOffset = iconSize / 2

  return (
    <g
      data-testid={`scenario-marker-${yearIndex}`}
      transform={`translate(${cx}, ${cy - lift})`}
      className="cursor-pointer"
      onClick={() => onSelectYear?.(yearIndex)}
      aria-label={`Scenario marker year ${yearIndex}`}
    >
      <circle r={markerRadius} fill={color} fillOpacity={0.9} stroke={color} strokeWidth={markerRadius / 8} />
      <g transform={`translate(${-iconOffset}, ${-iconOffset})`}>
        {IconComp ? (
          <IconComp
            className="text-white"
            stroke="white"
            fill="none"
            width={iconSize}
            height={iconSize}
            preserveAspectRatio="xMidYMid meet"
            vectorEffect="non-scaling-stroke"
          />
        ) : (
          <text x={0} y={0} textAnchor="middle" dominantBaseline="middle" fontSize={11} fill="#ffffff">
            {(primary.display_icon ?? '✦').slice(0, 1).toUpperCase()}
          </text>
        )}
      </g>
      {extraCount > 0 && (
        <rect
          x={markerRadius - 8}
          y={-markerRadius - 2}
          width={16}
          height={16}
          rx={4}
          fill="#0f172a"
          stroke={color}
          strokeWidth={1}
        />
      )}
      {extraCount > 0 && (
        <text x={markerRadius} y={-markerRadius / 2} textAnchor="middle" fontSize={10} fill="#e2e8f0" fontWeight={600}>
          +{extraCount}
        </text>
      )}
      <title>{primary.name}</title>
    </g>
  )
}


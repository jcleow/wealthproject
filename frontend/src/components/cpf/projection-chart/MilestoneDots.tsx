import type { ThresholdAges } from './types'
import { THRESHOLD_COLORS } from './types'

const ICON_PATHS: Record<string, string> = {
  shield: 'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z',
  'shield-check': 'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z M9 12l2 2 4-4',
  star: 'M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z',
  heart:
    'M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z',
}

interface RetirementSavingsDotProps {
  cx?: number
  cy?: number
  payload?: { age: number; retirementSavings: number | null }
  thresholdAges: ThresholdAges
}

export function RetirementSavingsDot({ cx, cy, payload, thresholdAges }: RetirementSavingsDotProps) {
  if (!cx || !cy || !payload || payload.retirementSavings === null) return null

  const markers: Array<{ label: string; color: string; icon: string }> = []

  if (payload.age === thresholdAges.brs) {
    markers.push({ label: 'BRS', color: THRESHOLD_COLORS.brs, icon: 'shield' })
  }
  if (payload.age === thresholdAges.frs) {
    markers.push({ label: 'FRS', color: THRESHOLD_COLORS.frs, icon: 'shield-check' })
  }
  if (payload.age === thresholdAges.ers) {
    markers.push({ label: 'ERS', color: THRESHOLD_COLORS.ers, icon: 'star' })
  }

  if (markers.length === 0) return null

  return (
    <g>
      {markers.map((m, idx) => (
        <MilestoneMarker key={m.label} cx={cx} cy={cy} yOffset={idx * 26} {...m} />
      ))}
    </g>
  )
}

interface MADotProps {
  cx?: number
  cy?: number
  payload?: { age: number }
  thresholdAges: ThresholdAges
}

export function MADot({ cx, cy, payload, thresholdAges }: MADotProps) {
  if (!cx || !cy || !payload || payload.age !== thresholdAges.bhs) return null

  return (
    <MilestoneMarker
      cx={cx}
      cy={cy}
      yOffset={0}
      label="BHS"
      color={THRESHOLD_COLORS.bhs}
      icon="heart"
    />
  )
}

function MilestoneMarker({
  cx,
  cy,
  yOffset,
  label,
  color,
  icon,
}: {
  cx: number
  cy: number
  yOffset: number
  label: string
  color: string
  icon: string
}) {
  return (
    <g transform={`translate(${cx}, ${cy - yOffset})`}>
      <circle r={11} fill={color} stroke="rgba(0,0,0,0.5)" strokeWidth={1.5} />
      <g transform="translate(-5.5, -5.5) scale(0.46)">
        <path
          d={ICON_PATHS[icon]}
          fill="none"
          stroke="white"
          strokeWidth={2.5}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </g>
      <text x={16} y={4} fill={color} fontSize={10} fontWeight={600}>
        {label}
      </text>
    </g>
  )
}

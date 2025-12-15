'use client'

import { useState, useMemo, useEffect, useRef } from 'react'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import { cn } from '@/lib/utils'

interface DemoScenario {
  id: string
  label: string
  icon: string
  color: string
  enabled: boolean
  impacts: {
    year: number
    netWorthDelta: number
  }[]
}

interface ProjectionPoint {
  year: number
  netWorth: number
  label: string
}

const initialScenarios: DemoScenario[] = [
  {
    id: 'car',
    label: 'Buy a Car',
    icon: '🚗',
    color: '#F97316',
    enabled: false,
    impacts: [
      { year: 5, netWorthDelta: -120000 },
      { year: 10, netWorthDelta: -180000 },
      { year: 15, netWorthDelta: -200000 },
      { year: 20, netWorthDelta: -220000 },
    ],
  },
  {
    id: 'kids',
    label: 'Have Children',
    icon: '👶',
    color: '#EC4899',
    enabled: false,
    impacts: [
      { year: 5, netWorthDelta: -150000 },
      { year: 10, netWorthDelta: -350000 },
      { year: 15, netWorthDelta: -500000 },
      { year: 20, netWorthDelta: -600000 },
    ],
  },
  {
    id: 'property',
    label: 'Buy Property',
    icon: '🏠',
    color: '#3B82F6',
    enabled: false,
    impacts: [
      { year: 5, netWorthDelta: 50000 },
      { year: 10, netWorthDelta: 200000 },
      { year: 15, netWorthDelta: 400000 },
      { year: 20, netWorthDelta: 650000 },
    ],
  },
  {
    id: 'sidehustle',
    label: 'Side Hustle',
    icon: '💼',
    color: '#10B981',
    enabled: false,
    impacts: [
      { year: 5, netWorthDelta: 80000 },
      { year: 10, netWorthDelta: 250000 },
      { year: 15, netWorthDelta: 500000 },
      { year: 20, netWorthDelta: 850000 },
    ],
  },
]

// Base projection without any scenarios
const baseProjection: ProjectionPoint[] = [
  { year: 0, netWorth: 50000, label: 'Today' },
  { year: 5, netWorth: 280000, label: 'Year 5' },
  { year: 10, netWorth: 650000, label: 'Year 10' },
  { year: 15, netWorth: 1100000, label: 'Year 15' },
  { year: 20, netWorth: 1800000, label: 'Year 20' },
]

function formatCurrency(value: number): string {
  if (value >= 1000000) {
    return `$${(value / 1000000).toFixed(1)}M`
  }
  return `$${(value / 1000).toFixed(0)}K`
}

interface AnimatedNumberProps {
  value: number
  className?: string
  style?: React.CSSProperties
}

function AnimatedNumber({ value, className, style }: AnimatedNumberProps) {
  const [displayValue, setDisplayValue] = useState(value)
  const prevValueRef = useRef(value)

  useEffect(() => {
    const prevValue = prevValueRef.current
    const diff = value - prevValue
    const steps = 20
    const stepValue = diff / steps
    let current = 0

    const interval = setInterval(() => {
      current++
      if (current >= steps) {
        setDisplayValue(value)
        clearInterval(interval)
      } else {
        setDisplayValue(prevValue + stepValue * current)
      }
    }, 25)

    prevValueRef.current = value

    return () => clearInterval(interval)
  }, [value])

  return <span className={className} style={style}>{formatCurrency(displayValue)}</span>
}

interface CustomTooltipProps {
  active?: boolean
  payload?: Array<{ value: number }>
  label?: string
}

function CustomTooltip({ active, payload, label }: CustomTooltipProps) {
  if (active && payload && payload.length) {
    return (
      <div
        className="rounded-lg border px-4 py-3 shadow-xl backdrop-blur-md"
        style={{
          background: 'rgba(12, 17, 25, 0.95)',
          borderColor: 'var(--landing-border)',
        }}
      >
        <p
          className="landing-body text-xs uppercase tracking-wider"
          style={{ color: 'var(--landing-text-muted)' }}
        >
          Year {label}
        </p>
        <p
          className="landing-display mt-1 text-xl"
          style={{ color: 'var(--landing-gold)' }}
        >
          {formatCurrency(payload[0].value)}
        </p>
      </div>
    )
  }
  return null
}

export function ScenarioDemoWidget() {
  const [scenarios, setScenarios] = useState(initialScenarios)

  const toggleScenario = (id: string) => {
    setScenarios((prev) =>
      prev.map((s) => (s.id === id ? { ...s, enabled: !s.enabled } : s))
    )
  }

  // Calculate projection based on enabled scenarios
  const projection = useMemo(() => {
    return baseProjection.map((point) => {
      let adjustedNetWorth = point.netWorth

      scenarios.forEach((scenario) => {
        if (scenario.enabled) {
          const impact = scenario.impacts.find((i) => i.year === point.year)
          if (impact) {
            adjustedNetWorth += impact.netWorthDelta
          }
        }
      })

      return {
        ...point,
        netWorth: Math.max(0, adjustedNetWorth),
      }
    })
  }, [scenarios])

  // Get values for stats
  const year10Value = projection.find((p) => p.year === 10)?.netWorth || 0
  const year20Value = projection.find((p) => p.year === 20)?.netWorth || 0

  return (
    <div className="p-6">
      {/* Scenario Toggles */}
      <div className="mb-8 flex flex-wrap justify-center gap-3">
        {scenarios.map((scenario) => (
          <button
            key={scenario.id}
            onClick={() => toggleScenario(scenario.id)}
            className={cn(
              'landing-body flex items-center gap-2 rounded-full border px-4 py-2 text-sm transition-all duration-300',
              scenario.enabled
                ? 'scale-[1.02]'
                : 'hover:border-[var(--landing-border-accent)]'
            )}
            style={{
              borderColor: scenario.enabled ? scenario.color : 'var(--landing-border)',
              backgroundColor: scenario.enabled ? `${scenario.color}15` : 'transparent',
              color: scenario.enabled ? scenario.color : 'var(--landing-text-secondary)',
            }}
          >
            <span>{scenario.icon}</span>
            <span>{scenario.label}</span>
          </button>
        ))}
      </div>

      {/* Interactive Chart */}
      <div className="h-56">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={projection}
            margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
          >
            <defs>
              <linearGradient id="netWorthGradientDemo" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#C9A962" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#C9A962" stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis
              dataKey="year"
              stroke="var(--landing-text-muted)"
              tickFormatter={(v) => `Y${v}`}
              fontSize={11}
              tickLine={false}
              axisLine={false}
              fontFamily="var(--font-body)"
            />
            <YAxis
              stroke="var(--landing-text-muted)"
              tickFormatter={(v) => formatCurrency(v)}
              fontSize={11}
              width={55}
              tickLine={false}
              axisLine={false}
              fontFamily="var(--font-body)"
            />
            <Tooltip content={<CustomTooltip />} />
            <Area
              type="monotone"
              dataKey="netWorth"
              stroke="#C9A962"
              fill="url(#netWorthGradientDemo)"
              strokeWidth={2}
              animationDuration={500}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Summary Stats */}
      <div className="mt-8 grid grid-cols-2 gap-4">
        <div
          className="rounded-xl p-5 text-center"
          style={{ background: 'rgba(255, 255, 255, 0.03)' }}
        >
          <p
            className="landing-body text-xs font-medium uppercase tracking-wider"
            style={{ color: 'var(--landing-text-muted)' }}
          >
            Year 10
          </p>
          <AnimatedNumber
            value={year10Value}
            className="landing-display mt-2 block text-2xl"
            style={{ color: 'var(--landing-text-primary)' } as React.CSSProperties}
          />
        </div>
        <div
          className="rounded-xl p-5 text-center"
          style={{ background: 'rgba(255, 255, 255, 0.03)' }}
        >
          <p
            className="landing-body text-xs font-medium uppercase tracking-wider"
            style={{ color: 'var(--landing-text-muted)' }}
          >
            Year 20
          </p>
          <AnimatedNumber
            value={year20Value}
            className="landing-display mt-2 block text-2xl"
            style={{ color: 'var(--landing-gold)' } as React.CSSProperties}
          />
        </div>
      </div>

      {/* Active scenarios indicator */}
      {scenarios.some((s) => s.enabled) && (
        <div
          className="mt-6 flex flex-wrap items-center justify-center gap-2 text-xs"
          style={{ color: 'var(--landing-text-muted)' }}
        >
          <span className="landing-body">Active:</span>
          {scenarios
            .filter((s) => s.enabled)
            .map((s) => (
              <span
                key={s.id}
                className="landing-body rounded-full px-2 py-0.5"
                style={{
                  backgroundColor: `${s.color}15`,
                  color: s.color,
                }}
              >
                {s.icon} {s.label}
              </span>
            ))}
        </div>
      )}
    </div>
  )
}

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
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

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
    color: '#f97316',
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
    color: '#ec4899',
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
    color: '#3b82f6',
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
    color: '#22c55e',
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
}

function AnimatedNumber({ value, className }: AnimatedNumberProps) {
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

  return <span className={className}>{formatCurrency(displayValue)}</span>
}

interface CustomTooltipProps {
  active?: boolean
  payload?: Array<{ value: number }>
  label?: string
}

function CustomTooltip({ active, payload, label }: CustomTooltipProps) {
  if (active && payload && payload.length) {
    return (
      <div className="rounded-lg border border-white/10 bg-[#0f1728]/95 px-3 py-2 shadow-xl backdrop-blur-sm">
        <p className="text-xs text-slate-400">Year {label}</p>
        <p className="text-lg font-semibold text-white">
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
    <Card className="border-white/10 bg-[#0c1322]">
      <CardContent className="p-6">
        {/* Scenario Toggles */}
        <div className="mb-6 flex flex-wrap justify-center gap-2">
          {scenarios.map((scenario) => (
            <Button
              key={scenario.id}
              variant={scenario.enabled ? 'default' : 'outline'}
              size="sm"
              onClick={() => toggleScenario(scenario.id)}
              className={cn(
                'gap-2 transition-all',
                scenario.enabled && 'ring-2 ring-offset-2 ring-offset-[#0c1322]'
              )}
              style={{
                borderColor: scenario.enabled ? scenario.color : undefined,
                backgroundColor: scenario.enabled ? `${scenario.color}20` : undefined,
                color: scenario.enabled ? scenario.color : undefined,
              }}
            >
              <span>{scenario.icon}</span>
              <span>{scenario.label}</span>
            </Button>
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
                <linearGradient id="netWorthGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#4f81ff" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#4f81ff" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis
                dataKey="year"
                stroke="#aeb6c9"
                tickFormatter={(v) => `Y${v}`}
                fontSize={11}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                stroke="#aeb6c9"
                tickFormatter={(v) => formatCurrency(v)}
                fontSize={11}
                width={55}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip content={<CustomTooltip />} />
              <Area
                type="monotone"
                dataKey="netWorth"
                stroke="#7db0ff"
                fill="url(#netWorthGradient)"
                strokeWidth={2}
                animationDuration={500}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Summary Stats */}
        <div className="mt-6 grid grid-cols-2 gap-4">
          <div className="rounded-lg bg-white/5 p-4 text-center">
            <p className="text-xs uppercase tracking-wide text-slate-500">
              Year 10
            </p>
            <AnimatedNumber
              value={year10Value}
              className="text-xl font-semibold text-white"
            />
          </div>
          <div className="rounded-lg bg-white/5 p-4 text-center">
            <p className="text-xs uppercase tracking-wide text-slate-500">
              Year 20
            </p>
            <AnimatedNumber
              value={year20Value}
              className="text-xl font-semibold text-white"
            />
          </div>
        </div>

        {/* Active scenarios indicator */}
        {scenarios.some((s) => s.enabled) && (
          <div className="mt-4 flex flex-wrap justify-center gap-2 text-xs text-slate-500">
            <span>Active:</span>
            {scenarios
              .filter((s) => s.enabled)
              .map((s) => (
                <span
                  key={s.id}
                  className="rounded px-1.5 py-0.5"
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
      </CardContent>
    </Card>
  )
}

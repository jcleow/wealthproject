'use client'

import { useState, useMemo, useEffect, useRef } from 'react'
import { motion, useInView } from 'framer-motion'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import { cn } from '@/lib/utils'
import { SpotlightCard } from './SpotlightCard'

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
      <div className="rounded-lg border border-white/[0.1] bg-[#0a0a0c]/95 backdrop-blur-md px-4 py-3 shadow-xl">
        <p className="text-xs font-mono uppercase tracking-wider text-[#8A8F98]">
          Year {label}
        </p>
        <p className="mt-1 text-xl font-semibold text-blue-400">
          {formatCurrency(payload[0].value)}
        </p>
      </div>
    )
  }
  return null
}

export function DemoSection() {
  const sectionRef = useRef<HTMLDivElement>(null)
  const isInView = useInView(sectionRef, { once: true, margin: '-100px' })
  const [scenarios, setScenarios] = useState(initialScenarios)

  const toggleScenario = (id: string) => {
    setScenarios((prev) =>
      prev.map((s) => (s.id === id ? { ...s, enabled: !s.enabled } : s))
    )
  }

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

  const year10Value = projection.find((p) => p.year === 10)?.netWorth || 0
  const year20Value = projection.find((p) => p.year === 20)?.netWorth || 0

  return (
    <section
      id="demo"
      ref={sectionRef}
      className="relative py-24 md:py-32 px-4 sm:px-6 lg:px-8"
    >
      {/* Section divider */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />

      <div className="max-w-4xl mx-auto">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <span className="inline-block text-xs font-mono font-medium tracking-widest text-blue-400 uppercase mb-4">
            Interactive Demo
          </span>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-semibold tracking-tight text-[#EDEDEF] mb-4">
            See your future,
            <br />
            <span className="linear-text-accent">clearly</span>
          </h2>
          <p className="max-w-xl mx-auto text-lg text-[#8A8F98]">
            Toggle scenarios on and off. Watch your net worth projection update instantly.
          </p>
        </motion.div>

        {/* Demo Widget */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8, delay: 0.2 }}
        >
          <SpotlightCard className="p-6 md:p-8">
            {/* Scenario Toggles */}
            <div className="mb-8 flex flex-wrap justify-center gap-3">
              {scenarios.map((scenario) => (
                <button
                  key={scenario.id}
                  onClick={() => toggleScenario(scenario.id)}
                  className={cn(
                    'flex items-center gap-2 px-4 py-2 rounded-full border text-sm transition-all duration-200',
                    scenario.enabled
                      ? 'scale-[1.02]'
                      : 'hover:border-white/[0.15]'
                  )}
                  style={{
                    borderColor: scenario.enabled ? scenario.color : 'rgba(255,255,255,0.06)',
                    backgroundColor: scenario.enabled ? `${scenario.color}15` : 'transparent',
                    color: scenario.enabled ? scenario.color : '#8A8F98',
                  }}
                >
                  <span>{scenario.icon}</span>
                  <span>{scenario.label}</span>
                </button>
              ))}
            </div>

            {/* Chart */}
            <div className="h-64 mb-6">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={projection}
                  margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="netWorthGradientLinear" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis
                    dataKey="year"
                    stroke="#8A8F98"
                    tickFormatter={(v) => `Y${v}`}
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    stroke="#8A8F98"
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
                    stroke="#3B82F6"
                    fill="url(#netWorthGradientLinear)"
                    strokeWidth={2}
                    animationDuration={500}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* Summary Stats */}
            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-xl bg-white/[0.03] border border-white/[0.06] p-5 text-center">
                <p className="text-xs font-mono font-medium uppercase tracking-wider text-[#8A8F98]">
                  Year 10
                </p>
                <AnimatedNumber
                  value={year10Value}
                  className="mt-2 block text-2xl font-semibold text-[#EDEDEF]"
                />
              </div>
              <div className="rounded-xl bg-white/[0.03] border border-white/[0.06] p-5 text-center">
                <p className="text-xs font-mono font-medium uppercase tracking-wider text-[#8A8F98]">
                  Year 20
                </p>
                <AnimatedNumber
                  value={year20Value}
                  className="mt-2 block text-2xl font-semibold text-blue-400"
                />
              </div>
            </div>

            {/* Active scenarios indicator */}
            {scenarios.some((s) => s.enabled) && (
              <div className="flex flex-wrap items-center justify-center mt-6 gap-2 text-xs text-[#8A8F98]">
                <span>Active:</span>
                {scenarios
                  .filter((s) => s.enabled)
                  .map((s) => (
                    <span
                      key={s.id}
                      className="rounded-full px-2 py-0.5"
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
          </SpotlightCard>
        </motion.div>

        {/* Footer text */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={isInView ? { opacity: 1 } : {}}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="mt-8 text-center"
        >
          <p className="text-sm text-[#8A8F98]">
            What takes hours in spreadsheets,
          </p>
          <p className="mt-1 text-lg font-medium text-blue-400">
            Assetra does in seconds.
          </p>
        </motion.div>
      </div>
    </section>
  )
}

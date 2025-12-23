'use client'

import { useRef } from 'react'
import { motion, useInView } from 'framer-motion'
import {
  TrendingUp,
  GitBranch,
  Calculator,
  Target,
  Sparkles,
  PieChart,
} from 'lucide-react'
import { SpotlightCard } from './SpotlightCard'

const features = [
  {
    icon: TrendingUp,
    title: 'Net Worth Projections',
    description: '20-year forecasts that update as you model different life scenarios.',
    span: 'col-span-1 md:col-span-2 row-span-1',
    accent: true,
  },
  {
    icon: GitBranch,
    title: 'Scenario Branching',
    description: 'Toggle decisions on and off to compare outcomes side by side.',
    span: 'col-span-1 row-span-1',
  },
  {
    icon: Calculator,
    title: 'CPF Integration',
    description: 'Model OA, SA, MA contributions, top-ups, and withdrawal strategies.',
    span: 'col-span-1 row-span-1',
  },
  {
    icon: Target,
    title: 'Goal Tracking',
    description: 'Set financial milestones and see exactly when you\'ll reach them.',
    span: 'col-span-1 md:col-span-2 row-span-1',
  },
  {
    icon: Sparkles,
    title: 'AI Insights',
    description: 'Smart suggestions tailored to your unique financial situation.',
    span: 'col-span-1 row-span-1',
  },
  {
    icon: PieChart,
    title: 'Asset Allocation',
    description: 'Track investments, property, and other assets in one unified view.',
    span: 'col-span-1 row-span-1',
  },
]

export function FeaturesBento() {
  const sectionRef = useRef<HTMLDivElement>(null)
  const isInView = useInView(sectionRef, { once: true, margin: '-100px' })

  return (
    <section
      id="features"
      ref={sectionRef}
      className="relative py-24 md:py-32 px-4 sm:px-6 lg:px-8"
    >
      {/* Section divider */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />

      <div className="max-w-7xl mx-auto">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <span className="inline-block text-xs font-mono font-medium tracking-widest text-blue-400 uppercase mb-4">
            Features
          </span>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-semibold tracking-tight text-[#EDEDEF] mb-4">
            Everything you need to
            <br />
            <span className="linear-text-accent">plan with confidence</span>
          </h2>
          <p className="max-w-2xl mx-auto text-lg text-[#8A8F98]">
            Purpose-built tools for Singapore&apos;s unique financial landscape.
          </p>
        </motion.div>

        {/* Bento Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 md:gap-6">
          {features.map((feature, index) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 30 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.6, delay: 0.1 + index * 0.08 }}
              className={feature.span}
            >
              <SpotlightCard className="h-full p-6 md:p-8">
                <div className="flex flex-col h-full">
                  {/* Icon */}
                  <div
                    className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 ${
                      feature.accent
                        ? 'bg-blue-500/20 border border-blue-500/30'
                        : 'bg-white/[0.05] border border-white/[0.06]'
                    }`}
                  >
                    <feature.icon
                      className={`w-6 h-6 ${
                        feature.accent ? 'text-blue-400' : 'text-[#EDEDEF]'
                      }`}
                    />
                  </div>

                  {/* Content */}
                  <h3 className="text-lg md:text-xl font-semibold text-[#EDEDEF] mb-2">
                    {feature.title}
                  </h3>
                  <p className="text-sm md:text-base text-[#8A8F98] leading-relaxed">
                    {feature.description}
                  </p>
                </div>
              </SpotlightCard>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}

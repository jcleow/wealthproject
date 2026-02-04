'use client'

import { useRef } from 'react'
import Link from 'next/link'
import { motion, useInView } from 'framer-motion'
import { ArrowRight, BarChart3, Target, Sparkles } from 'lucide-react'
import { SpotlightCard } from './SpotlightCard'

const features = [
  {
    icon: BarChart3,
    label: 'Projections',
    description: '20-year forecasts with scenario modeling',
  },
  {
    icon: Target,
    label: 'Goals',
    description: 'Track milestones and stay on course',
  },
  {
    icon: Sparkles,
    label: 'AI Insights',
    description: 'Smart suggestions tailored to you',
  },
]

export function CTASection() {
  const sectionRef = useRef<HTMLDivElement>(null)
  const isInView = useInView(sectionRef, { once: true, margin: '-100px' })

  return (
    <section
      ref={sectionRef}
      className="relative py-24 md:py-32 px-4 sm:px-6 lg:px-8"
    >
      {/* Section divider */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />

      {/* Background glow */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse at center bottom, rgba(59, 130, 246, 0.08) 0%, transparent 60%)',
        }}
      />

      <div className="relative z-10 max-w-4xl mx-auto text-center">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="mb-10"
        >
          <span className="inline-block text-xs font-mono font-medium tracking-widest text-blue-400 uppercase mb-4">
            Get Started
          </span>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-semibold tracking-tight text-[#EDEDEF] mb-4">
            Take control of your
            <br />
            <span className="linear-text-accent">financial future</span>
          </h2>
        </motion.div>

        {/* CTA Button */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="mb-6"
        >
          <Link
            href="/dashboard"
            className="linear-button-primary inline-flex items-center gap-3 px-10 py-5 text-base font-semibold group"
          >
            Start Planning Free
            <ArrowRight className="w-5 h-5 transition-transform duration-200 group-hover:translate-x-1" />
          </Link>
        </motion.div>

        {/* Social Proof */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={isInView ? { opacity: 1 } : {}}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="text-sm text-[#8A8F98] mb-16"
        />                  

        {/* Feature Cards */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="grid grid-cols-1 md:grid-cols-3 gap-4"
        >
          {features.map((feature, index) => (
            <motion.div
              key={feature.label}
              initial={{ opacity: 0, y: 20 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.5, delay: 0.5 + index * 0.1 }}
            >
              <SpotlightCard className="p-6 text-center h-full">
                <div className="w-12 h-12 rounded-xl bg-blue-500/15 border border-blue-500/20 flex items-center justify-center mx-auto mb-4">
                  <feature.icon className="w-5 h-5 text-blue-400" />
                </div>
                <h3 className="text-lg font-semibold text-[#EDEDEF] mb-2">
                  {feature.label}
                </h3>
                <p className="text-sm text-[#8A8F98]">{feature.description}</p>
              </SpotlightCard>
            </motion.div>
          ))}
        </motion.div>
      </div>

      {/* Footer */}
      <footer className="relative z-10 mt-24 md:mt-32 text-center">
        <div className="linear-rule mx-auto mb-6 w-24" />
        <p className="text-sm text-[#8A8F98]">
          &copy; {new Date().getFullYear()} WealthProject. All rights reserved.
        </p>
      </footer>
    </section>
  )
}

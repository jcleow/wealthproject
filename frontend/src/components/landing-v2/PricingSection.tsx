'use client'

import { useRef } from 'react'
import Link from 'next/link'
import { motion, useInView } from 'framer-motion'
import { Check, Sparkles } from 'lucide-react'
import { SpotlightCard } from './SpotlightCard'

const plans = [
  {
    name: 'Free',
    price: '$0',
    period: 'forever',
    description: 'Perfect for getting started with financial planning',
    features: [
      '5-year net worth projection',
      'Basic scenario modeling',
      'CPF calculator',
      'Single user',
    ],
    cta: 'Get Started',
    href: '/dashboard',
    popular: false,
  },
  {
    name: 'Pro',
    price: '$9',
    period: '/month',
    description: 'For serious planners who want the full picture',
    features: [
      '20-year net worth projection',
      'Unlimited scenarios',
      'Advanced CPF strategies',
      'Goal tracking & milestones',
      'AI-powered insights',
      'Export to PDF/Excel',
      'Priority support',
    ],
    cta: 'Start Free Trial',
    href: '/dashboard',
    popular: true,
  },
  {
    name: 'Family',
    price: '$19',
    period: '/month',
    description: 'Plan together with your partner or family',
    features: [
      'Everything in Pro',
      'Up to 4 family members',
      'Joint finances view',
      'Family goal tracking',
      'Shared scenarios',
      'Legacy planning tools',
    ],
    cta: 'Start Free Trial',
    href: '/dashboard',
    popular: false,
  },
]

export function PricingSection() {
  const sectionRef = useRef<HTMLDivElement>(null)
  const isInView = useInView(sectionRef, { once: true, margin: '-100px' })

  return (
    <section
      id="pricing"
      ref={sectionRef}
      className="relative py-24 md:py-32 px-4 sm:px-6 lg:px-8"
    >
      {/* Section divider */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />

      <div className="max-w-6xl mx-auto">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <span className="inline-block text-xs font-mono font-medium tracking-widest text-blue-400 uppercase mb-4">
            Pricing
          </span>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-semibold tracking-tight text-[#EDEDEF] mb-4">
            Simple, transparent
            <br />
            <span className="linear-text-accent">pricing</span>
          </h2>
          <p className="max-w-xl mx-auto text-lg text-[#8A8F98]">
            Start free, upgrade when you need more. No hidden fees.
          </p>
        </motion.div>

        {/* Pricing Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
          {plans.map((plan, index) => (
            <motion.div
              key={plan.name}
              initial={{ opacity: 0, y: 30 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.6, delay: 0.1 + index * 0.1 }}
              className={plan.popular ? 'md:-mt-4 md:mb-4' : ''}
            >
              <SpotlightCard
                className={`relative h-full p-6 md:p-8 ${
                  plan.popular ? 'border-blue-500/30' : ''
                }`}
              >
                {/* Popular badge */}
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/20 border border-blue-500/30">
                      <Sparkles className="w-3 h-3 text-blue-400" />
                      <span className="text-xs font-medium text-blue-400">
                        Most Popular
                      </span>
                    </div>
                  </div>
                )}

                <div className="flex flex-col h-full">
                  {/* Plan name */}
                  <h3 className="text-lg font-semibold text-[#EDEDEF] mb-2">
                    {plan.name}
                  </h3>

                  {/* Price */}
                  <div className="flex items-baseline gap-1 mb-2">
                    <span className="text-4xl font-semibold text-[#EDEDEF]">
                      {plan.price}
                    </span>
                    <span className="text-sm text-[#8A8F98]">{plan.period}</span>
                  </div>

                  {/* Description */}
                  <p className="text-sm text-[#8A8F98] mb-6">
                    {plan.description}
                  </p>

                  {/* Features */}
                  <ul className="flex-1 space-y-3 mb-8">
                    {plan.features.map((feature) => (
                      <li key={feature} className="flex items-start gap-3">
                        <Check className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />
                        <span className="text-sm text-[#8A8F98]">{feature}</span>
                      </li>
                    ))}
                  </ul>

                  {/* CTA Button */}
                  <Link
                    href={plan.href}
                    className={`w-full py-3 px-4 text-center text-sm font-medium rounded-lg transition-all duration-200 ${
                      plan.popular
                        ? 'linear-button-primary'
                        : 'linear-button-secondary'
                    }`}
                  >
                    {plan.cta}
                  </Link>
                </div>
              </SpotlightCard>
            </motion.div>
          ))}
        </div>

        {/* FAQ or note */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={isInView ? { opacity: 1 } : {}}
          transition={{ duration: 0.6, delay: 0.5 }}
          className="mt-12 text-center text-sm text-[#8A8F98]"
        >
          All plans include a 14-day free trial. Cancel anytime.
          <br />
          <span className="text-[#EDEDEF]">Questions?</span>{' '}
          <a href="mailto:hello@assetra.sg" className="text-blue-400 hover:text-blue-300 transition-colors">
            Get in touch
          </a>
        </motion.p>
      </div>
    </section>
  )
}

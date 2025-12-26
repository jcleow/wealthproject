'use client'

import { useRef } from 'react'
import { motion, useInView } from 'framer-motion'
import {
  ArrowRight,
  Building2,
  Calculator,
  Check,
  ChevronRight,
  LineChart,
  Lock,
  Menu,
  PiggyBank,
  Play,
  Sparkles,
  Target,
  TrendingUp,
} from 'lucide-react'
import Link from 'next/link'
import './styles.css'

// Animation variants
const fadeInUp = {
  hidden: { opacity: 0, y: 28 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.7, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] },
  },
}

const stagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.1, delayChildren: 0.1 } },
}

// Section Label Component
function SectionLabel({ text, pulse = false, inverted = false }: { text: string; pulse?: boolean; inverted?: boolean }) {
  return (
    <div
      className={`section-label ${inverted ? 'border-white/20 bg-white/5' : ''}`}
    >
      <span className={`section-label-dot ${pulse ? 'pulse-dot' : ''}`} />
      <span className={`section-label-text ${inverted ? 'text-white/80' : ''}`}>{text}</span>
    </div>
  )
}

// Navigation Component
function Navigation() {
  return (
    <header className="fixed left-0 right-0 top-0 z-50 border-b border-[var(--lm-border)] bg-[var(--lm-background)]/80 backdrop-blur-lg">
      <nav className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
        <Link href="/" className="flex items-center gap-3">
          <div className="gradient-bg flex h-9 w-9 items-center justify-center rounded-lg">
            <LineChart className="h-5 w-5 text-white" />
          </div>
          <span className="font-display text-xl text-[var(--lm-foreground)]">Assetra</span>
        </Link>

        <div className="hidden items-center gap-8 md:flex">
          <a href="#features" className="font-body text-sm text-[var(--lm-muted-foreground)] transition-colors hover:text-[var(--lm-foreground)]">
            Features
          </a>
          <a href="#how-it-works" className="font-body text-sm text-[var(--lm-muted-foreground)] transition-colors hover:text-[var(--lm-foreground)]">
            How It Works
          </a>
          <a href="#pricing" className="font-body text-sm text-[var(--lm-muted-foreground)] transition-colors hover:text-[var(--lm-foreground)]">
            Pricing
          </a>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/login"
            className="font-body hidden text-sm font-medium text-[var(--lm-foreground)] transition-colors hover:text-[var(--lm-accent)] md:block"
          >
            Log in
          </Link>
          <Link
            href="/signup"
            className="btn-lift gradient-bg font-body rounded-xl px-5 py-2.5 text-sm font-medium text-white"
          >
            Get Started
          </Link>
          <button className="flex h-10 w-10 items-center justify-center rounded-lg text-[var(--lm-foreground)] md:hidden">
            <Menu className="h-5 w-5" />
          </button>
        </div>
      </nav>
    </header>
  )
}

// Hero Section
function HeroSection() {
  return (
    <section className="relative overflow-hidden pb-28 pt-32 md:pb-44 md:pt-40">
      {/* Background glow */}
      <div className="radial-glow -right-64 -top-64" />
      <div className="radial-glow -bottom-64 -left-64" />

      <div className="mx-auto max-w-6xl px-6">
        <div className="grid items-center gap-12 lg:grid-cols-[1.1fr_0.9fr] lg:gap-16">
          {/* Text Content */}
          <motion.div
            initial="hidden"
            animate="visible"
            variants={stagger}
            className="max-w-2xl"
          >
            <motion.div variants={fadeInUp} className="mb-6">
              <SectionLabel text="Financial Planning" pulse />
            </motion.div>

            <motion.h1
              variants={fadeInUp}
              className="font-display text-[2.75rem] leading-[1.05] tracking-[-0.02em] text-[var(--lm-foreground)] md:text-6xl lg:text-[5.25rem]"
            >
              Model Your Financial{' '}
              <span className="relative inline-block">
                <span className="gradient-text">Future</span>
                <span className="gradient-underline" />
              </span>
            </motion.h1>

            <motion.p
              variants={fadeInUp}
              className="font-body mt-6 text-lg leading-relaxed text-[var(--lm-muted-foreground)] md:text-xl"
            >
              Simulate life events, visualize outcomes, and make confident financial decisions.
              From property purchases to career changes—see how every choice shapes your wealth.
            </motion.p>

            <motion.div
              variants={fadeInUp}
              className="mt-10 flex flex-col gap-4 sm:flex-row sm:items-center"
            >
              <Link
                href="/signup"
                className="btn-lift gradient-bg group inline-flex h-14 items-center justify-center gap-3 rounded-xl px-8 text-base font-medium text-white"
              >
                <span>Start Planning Free</span>
                <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
              </Link>
              <button className="group inline-flex h-14 items-center justify-center gap-3 rounded-xl border border-[var(--lm-border)] bg-[var(--lm-card)] px-8 text-base font-medium text-[var(--lm-foreground)] shadow-sm transition-all hover:border-[var(--lm-accent)]/30 hover:shadow-md">
                <Play className="h-5 w-5 text-[var(--lm-accent)]" />
                <span>Watch Demo</span>
              </button>
            </motion.div>

            <motion.div
              variants={fadeInUp}
              className="mt-10 flex items-center gap-6"
            >
              <div className="flex -space-x-3">
                {[1, 2, 3, 4].map((i) => (
                  <div
                    key={i}
                    className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-[var(--lm-background)] bg-gradient-to-br from-slate-200 to-slate-300 text-xs font-medium text-slate-600"
                  >
                    {['JD', 'MK', 'AS', 'LT'][i - 1]}
                  </div>
                ))}
              </div>
              <div>
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <svg
                      key={i}
                      className="h-4 w-4 fill-amber-400 text-amber-400"
                      viewBox="0 0 20 20"
                    >
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                  ))}
                </div>
                <p className="font-body mt-0.5 text-sm text-[var(--lm-muted-foreground)]">
                  <span className="font-semibold text-[var(--lm-foreground)]">2,847</span> people modeling their future
                </p>
              </div>
            </motion.div>
          </motion.div>

          {/* Hero Graphic */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="relative hidden lg:block"
          >
            <div className="hero-graphic">
              {/* Rotating ring */}
              <div className="hero-ring rotate-ring" />

              {/* Floating cards */}
              <motion.div
                animate={{ y: [0, -10, 0] }}
                transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
                className="hero-card left-0 top-1/4"
                style={{ width: 180 }}
              >
                <div className="mb-2 flex items-center gap-2">
                  <div className="gradient-bg flex h-8 w-8 items-center justify-center rounded-lg">
                    <TrendingUp className="h-4 w-4 text-white" />
                  </div>
                  <span className="font-body text-sm font-semibold text-[var(--lm-foreground)]">Net Worth</span>
                </div>
                <p className="font-mono text-2xl font-bold text-[var(--lm-foreground)]">$1.2M</p>
                <p className="font-body mt-1 text-xs text-emerald-500">+12.4% projected</p>
              </motion.div>

              <motion.div
                animate={{ y: [0, 10, 0] }}
                transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
                className="hero-card bottom-1/4 right-0"
                style={{ width: 200 }}
              >
                <div className="mb-2 flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-100">
                    <Building2 className="h-4 w-4 text-violet-600" />
                  </div>
                  <span className="font-body text-sm font-semibold text-[var(--lm-foreground)]">Property Purchase</span>
                </div>
                <p className="font-mono text-lg font-bold text-[var(--lm-foreground)]">2026</p>
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-[var(--lm-muted)]">
                  <div className="gradient-bg h-full w-3/4 rounded-full" />
                </div>
              </motion.div>

              {/* Center element */}
              <div className="absolute left-1/2 top-1/2 flex h-32 w-32 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-3xl bg-gradient-to-br from-[var(--lm-accent)] to-[var(--lm-accent-secondary)] shadow-[var(--lm-shadow-accent-lg)]">
                <Sparkles className="h-12 w-12 text-white" />
              </div>

              {/* Dot grid */}
              <div className="absolute bottom-12 left-12 grid grid-cols-3 gap-2">
                {[...Array(9)].map((_, i) => (
                  <div
                    key={i}
                    className="h-2 w-2 rounded-full bg-[var(--lm-accent)]"
                    style={{ opacity: 0.2 + (i * 0.08) }}
                  />
                ))}
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  )
}

// Features Section
function FeaturesSection() {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, amount: 0.15, margin: '-60px' })

  const features = [
    {
      icon: <Calculator className="h-6 w-6" />,
      title: 'Scenario Modeling',
      description: 'Create unlimited "what-if" scenarios. See how major life decisions—property, marriage, children—impact your trajectory.',
      span: 'lg:col-span-2',
    },
    {
      icon: <LineChart className="h-6 w-6" />,
      title: 'Visual Projections',
      description: 'Watch your net worth grow over 35+ years with interactive charts that respond to every change.',
    },
    {
      icon: <PiggyBank className="h-6 w-6" />,
      title: 'CPF Integration',
      description: 'Singapore-specific CPF calculations including OA, SA, MA allocations and property usage.',
    },
    {
      icon: <Target className="h-6 w-6" />,
      title: 'Goal Tracking',
      description: 'Set milestones and track progress. Get alerts when scenarios affect your target dates.',
    },
    {
      icon: <Lock className="h-6 w-6" />,
      title: 'Bank-Level Security',
      description: 'Your data stays encrypted and private. We never sell your information to third parties.',
    },
  ]

  return (
    <section id="features" ref={ref} className="bg-[var(--lm-muted)] py-28 md:py-44">
      <div className="mx-auto max-w-6xl px-6">
        <motion.div
          initial="hidden"
          animate={isInView ? 'visible' : 'hidden'}
          variants={stagger}
          className="mb-16 text-center"
        >
          <motion.div variants={fadeInUp} className="mb-4 flex justify-center">
            <SectionLabel text="Features" />
          </motion.div>
          <motion.h2
            variants={fadeInUp}
            className="font-display text-3xl tracking-tight text-[var(--lm-foreground)] md:text-[3.25rem]"
          >
            Everything You Need to{' '}
            <span className="gradient-text">Plan Ahead</span>
          </motion.h2>
          <motion.p
            variants={fadeInUp}
            className="font-body mx-auto mt-4 max-w-2xl text-lg text-[var(--lm-muted-foreground)]"
          >
            Powerful tools designed for the complexity of real financial planning.
          </motion.p>
        </motion.div>

        <motion.div
          initial="hidden"
          animate={isInView ? 'visible' : 'hidden'}
          variants={stagger}
          className="grid gap-5 md:grid-cols-2 lg:grid-cols-3"
        >
          {features.map((feature, index) => (
            <motion.div
              key={index}
              variants={fadeInUp}
              className={`card-hover relative overflow-hidden rounded-2xl border border-[var(--lm-border)] bg-[var(--lm-card)] p-8 shadow-[var(--lm-shadow-md)] ${feature.span || ''}`}
            >
              <div className="card-gradient-overlay" />
              <div className="relative z-10">
                <div className="gradient-bg mb-6 inline-flex h-14 w-14 items-center justify-center rounded-xl text-white shadow-[var(--lm-shadow-accent)]">
                  {feature.icon}
                </div>
                <h3 className="font-body mb-3 text-xl font-semibold text-[var(--lm-foreground)]">
                  {feature.title}
                </h3>
                <p className="font-body text-[var(--lm-muted-foreground)] leading-relaxed">
                  {feature.description}
                </p>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  )
}

// How It Works Section
function HowItWorksSection() {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, amount: 0.15, margin: '-60px' })

  const steps = [
    {
      number: '01',
      title: 'Add Your Finances',
      description: 'Input your assets, income, expenses, and debts. Our smart forms make data entry quick and painless.',
    },
    {
      number: '02',
      title: 'Create Scenarios',
      description: 'Model life events like buying property, changing careers, or starting a family. See the instant impact.',
    },
    {
      number: '03',
      title: 'Compare & Decide',
      description: 'View multiple futures side-by-side. Make decisions backed by data, not guesswork.',
    },
  ]

  return (
    <section id="how-it-works" ref={ref} className="py-28 md:py-44">
      <div className="mx-auto max-w-6xl px-6">
        <motion.div
          initial="hidden"
          animate={isInView ? 'visible' : 'hidden'}
          variants={stagger}
          className="mb-16 text-center"
        >
          <motion.div variants={fadeInUp} className="mb-4 flex justify-center">
            <SectionLabel text="How It Works" />
          </motion.div>
          <motion.h2
            variants={fadeInUp}
            className="font-display text-3xl tracking-tight text-[var(--lm-foreground)] md:text-[3.25rem]"
          >
            Three Steps to{' '}
            <span className="gradient-text">Clarity</span>
          </motion.h2>
        </motion.div>

        <motion.div
          initial="hidden"
          animate={isInView ? 'visible' : 'hidden'}
          variants={stagger}
          className="relative"
        >
          {/* Connecting line (desktop) */}
          <div className="absolute left-0 right-0 top-20 hidden h-0.5 bg-gradient-to-r from-transparent via-[var(--lm-accent)]/30 to-transparent md:block" />

          <div className="grid gap-8 md:grid-cols-3">
            {steps.map((step, index) => (
              <motion.div
                key={index}
                variants={fadeInUp}
                className="relative text-center"
              >
                {/* Number circle */}
                <div className="relative z-10 mx-auto mb-8 flex h-16 w-16 items-center justify-center rounded-full border-4 border-[var(--lm-background)] bg-gradient-to-br from-[var(--lm-accent)] to-[var(--lm-accent-secondary)] shadow-[var(--lm-shadow-accent-lg)]">
                  <span className="font-mono text-xl font-bold text-white">{step.number}</span>
                </div>

                {/* Arrow connector */}
                {index < steps.length - 1 && (
                  <div className="absolute right-0 top-8 hidden translate-x-1/2 md:block">
                    <div className="timeline-connector h-8 w-8">
                      <ChevronRight className="h-4 w-4 text-white" />
                    </div>
                  </div>
                )}

                <h3 className="font-body mb-3 text-xl font-semibold text-[var(--lm-foreground)]">
                  {step.title}
                </h3>
                <p className="font-body mx-auto max-w-xs text-[var(--lm-muted-foreground)]">
                  {step.description}
                </p>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  )
}

// Stats Section (Inverted)
function StatsSection() {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, amount: 0.15, margin: '-60px' })

  const stats = [
    { value: '$2.4B', label: 'Assets Modeled' },
    { value: '12,500+', label: 'Scenarios Created' },
    { value: '98%', label: 'User Satisfaction' },
    { value: '35yr', label: 'Projection Horizon' },
  ]

  return (
    <section ref={ref} className="inverted-section relative overflow-hidden py-20 md:py-28">
      <div className="dot-pattern" />
      <div className="radial-glow -left-64 -top-32" />
      <div className="radial-glow -bottom-32 -right-64" />

      <div className="relative z-10 mx-auto max-w-6xl px-6">
        <motion.div
          initial="hidden"
          animate={isInView ? 'visible' : 'hidden'}
          variants={stagger}
          className="grid gap-8 md:grid-cols-4"
        >
          {stats.map((stat, index) => (
            <motion.div
              key={index}
              variants={fadeInUp}
              className="relative text-center"
            >
              <p className="font-display text-4xl text-white md:text-5xl">{stat.value}</p>
              <p className="font-mono mt-2 text-sm uppercase tracking-wider text-white/50">
                {stat.label}
              </p>

              {/* Divider */}
              {index < stats.length - 1 && (
                <div className="stats-divider absolute -right-4 bottom-0 top-0 hidden md:block" />
              )}
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  )
}

// Testimonials Section
function TestimonialsSection() {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, amount: 0.15, margin: '-60px' })

  const testimonials = [
    {
      quote: "Finally, a tool that understands the complexity of Singapore's financial landscape. The CPF integration alone is worth it.",
      author: 'Marcus Tan',
      role: 'Software Engineer',
      avatar: 'MT',
    },
    {
      quote: "I modeled 5 different property scenarios before making my decision. The visual clarity gave me the confidence to act.",
      author: 'Sarah Chen',
      role: 'Marketing Director',
      avatar: 'SC',
    },
    {
      quote: "The scenario comparison feature is a game-changer. Seeing my financial future side-by-side made everything clear.",
      author: 'David Lim',
      role: 'Business Owner',
      avatar: 'DL',
    },
  ]

  return (
    <section ref={ref} className="py-28 md:py-44">
      <div className="mx-auto max-w-6xl px-6">
        <motion.div
          initial="hidden"
          animate={isInView ? 'visible' : 'hidden'}
          variants={stagger}
          className="mb-16 text-center"
        >
          <motion.div variants={fadeInUp} className="mb-4 flex justify-center">
            <SectionLabel text="Testimonials" />
          </motion.div>
          <motion.h2
            variants={fadeInUp}
            className="font-display text-3xl tracking-tight text-[var(--lm-foreground)] md:text-[3.25rem]"
          >
            Trusted by{' '}
            <span className="gradient-text">Planners</span>
          </motion.h2>
        </motion.div>

        <motion.div
          initial="hidden"
          animate={isInView ? 'visible' : 'hidden'}
          variants={stagger}
          className="grid gap-6 md:grid-cols-3"
        >
          {testimonials.map((testimonial, index) => (
            <motion.div
              key={index}
              variants={fadeInUp}
              className={`card-hover relative overflow-hidden rounded-2xl border border-[var(--lm-border)] bg-[var(--lm-card)] p-8 shadow-[var(--lm-shadow-md)] ${
                index === 1 ? 'md:-translate-y-4' : ''
              }`}
            >
              <div className="card-gradient-overlay" />

              {/* Quote mark */}
              <span className="quote-mark -left-2 -top-4">"</span>

              <div className="relative z-10">
                {/* Accent bar */}
                <div className="gradient-bg mb-6 h-1 w-12 rounded-full" />

                <p className="font-body mb-6 text-[var(--lm-foreground)] leading-relaxed">
                  "{testimonial.quote}"
                </p>

                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-[var(--lm-accent)] to-[var(--lm-accent-secondary)] text-sm font-semibold text-white">
                    {testimonial.avatar}
                  </div>
                  <div>
                    <p className="font-body text-sm font-semibold text-[var(--lm-foreground)]">
                      {testimonial.author}
                    </p>
                    <p className="font-body text-xs text-[var(--lm-muted-foreground)]">
                      {testimonial.role}
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  )
}

// Pricing Section
function PricingSection() {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, amount: 0.15, margin: '-60px' })

  const plans = [
    {
      name: 'Free',
      price: '$0',
      description: 'Perfect for exploring',
      features: ['1 scenario', 'Basic projections', 'Core financial tools', '5-year horizon'],
      cta: 'Get Started',
      featured: false,
    },
    {
      name: 'Pro',
      price: '$12',
      period: '/month',
      description: 'For serious planners',
      features: [
        'Unlimited scenarios',
        'Advanced projections',
        'CPF integration',
        '35-year horizon',
        'Scenario comparison',
        'Priority support',
      ],
      cta: 'Start Free Trial',
      featured: true,
    },
    {
      name: 'Family',
      price: '$24',
      period: '/month',
      description: 'Plan together',
      features: [
        'Everything in Pro',
        'Up to 5 family members',
        'Shared scenarios',
        'Combined projections',
        'Family goals tracking',
      ],
      cta: 'Start Free Trial',
      featured: false,
    },
  ]

  return (
    <section id="pricing" ref={ref} className="bg-[var(--lm-muted)] py-28 md:py-44">
      <div className="mx-auto max-w-6xl px-6">
        <motion.div
          initial="hidden"
          animate={isInView ? 'visible' : 'hidden'}
          variants={stagger}
          className="mb-16 text-center"
        >
          <motion.div variants={fadeInUp} className="mb-4 flex justify-center">
            <SectionLabel text="Pricing" />
          </motion.div>
          <motion.h2
            variants={fadeInUp}
            className="font-display text-3xl tracking-tight text-[var(--lm-foreground)] md:text-[3.25rem]"
          >
            Simple, Transparent{' '}
            <span className="gradient-text">Pricing</span>
          </motion.h2>
          <motion.p
            variants={fadeInUp}
            className="font-body mx-auto mt-4 max-w-2xl text-lg text-[var(--lm-muted-foreground)]"
          >
            Start free, upgrade when you need more power.
          </motion.p>
        </motion.div>

        <motion.div
          initial="hidden"
          animate={isInView ? 'visible' : 'hidden'}
          variants={stagger}
          className="grid items-center gap-6 lg:grid-cols-3"
        >
          {plans.map((plan, index) => (
            <motion.div
              key={index}
              variants={fadeInUp}
              className={plan.featured ? 'pricing-featured' : ''}
            >
              {plan.featured ? (
                <div className="gradient-border">
                  <div className="gradient-border-inner p-8">
                    <PricingCardContent plan={plan} featured />
                  </div>
                </div>
              ) : (
                <div className="card-hover rounded-2xl border border-[var(--lm-border)] bg-[var(--lm-card)] p-8 shadow-[var(--lm-shadow-md)]">
                  <PricingCardContent plan={plan} />
                </div>
              )}
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  )
}

function PricingCardContent({ plan, featured = false }: { plan: { name: string; price: string; period?: string; description: string; features: string[]; cta: string }; featured?: boolean }) {
  return (
    <>
      {featured && (
        <div className="gradient-bg mb-6 inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium text-white">
          <Sparkles className="h-3 w-3" />
          Most Popular
        </div>
      )}
      <h3 className="font-body text-xl font-semibold text-[var(--lm-foreground)]">{plan.name}</h3>
      <p className="font-body mt-1 text-sm text-[var(--lm-muted-foreground)]">{plan.description}</p>
      <div className="mt-6 flex items-baseline gap-1">
        <span className="font-display text-4xl text-[var(--lm-foreground)]">{plan.price}</span>
        {plan.period && (
          <span className="font-body text-[var(--lm-muted-foreground)]">{plan.period}</span>
        )}
      </div>
      <ul className="mt-8 space-y-4">
        {plan.features.map((feature, i) => (
          <li key={i} className="flex items-center gap-3">
            <div className={`flex h-5 w-5 items-center justify-center rounded-full ${featured ? 'bg-[var(--lm-accent)]' : 'bg-[var(--lm-muted)]'}`}>
              <Check className={`h-3 w-3 ${featured ? 'text-white' : 'text-[var(--lm-accent)]'}`} />
            </div>
            <span className="font-body text-sm text-[var(--lm-foreground)]">{feature}</span>
          </li>
        ))}
      </ul>
      <button
        className={`mt-8 w-full rounded-xl py-3.5 text-sm font-medium transition-all ${
          featured
            ? 'btn-lift gradient-bg text-white'
            : 'border border-[var(--lm-border)] bg-[var(--lm-card)] text-[var(--lm-foreground)] hover:border-[var(--lm-accent)]/30 hover:shadow-md'
        }`}
      >
        {plan.cta}
      </button>
    </>
  )
}

// CTA Section
function CTASection() {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, amount: 0.15, margin: '-60px' })

  return (
    <section ref={ref} className="inverted-section relative overflow-hidden py-28 md:py-44">
      <div className="dot-pattern" />
      <div className="radial-glow left-1/2 top-0 -translate-x-1/2" />

      <div className="relative z-10 mx-auto max-w-3xl px-6 text-center">
        <motion.div
          initial="hidden"
          animate={isInView ? 'visible' : 'hidden'}
          variants={stagger}
        >
          <motion.div variants={fadeInUp} className="mb-6 flex justify-center">
            <SectionLabel text="Get Started" pulse inverted />
          </motion.div>

          <motion.h2
            variants={fadeInUp}
            className="font-display text-3xl tracking-tight text-white md:text-[3.25rem]"
          >
            Ready to See Your{' '}
            <span className="gradient-text">Future?</span>
          </motion.h2>

          <motion.p
            variants={fadeInUp}
            className="font-body mx-auto mt-6 max-w-xl text-lg text-white/70"
          >
            Join thousands of people making smarter financial decisions with Assetra.
          </motion.p>

          <motion.div
            variants={fadeInUp}
            className="mt-10"
          >
            <div className="mx-auto flex max-w-md flex-col gap-4 sm:flex-row">
              <input
                type="email"
                placeholder="Enter your email"
                className="input-focus font-body h-14 flex-1 rounded-xl border border-white/20 bg-white/10 px-5 text-white placeholder:text-white/40"
              />
              <button className="btn-lift gradient-bg group inline-flex h-14 items-center justify-center gap-2 whitespace-nowrap rounded-xl px-8 font-medium text-white">
                <span>Start Free</span>
                <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
              </button>
            </div>
            <p className="font-body mt-4 text-sm text-white/50">
              No credit card required. Free plan available forever.
            </p>
          </motion.div>
        </motion.div>
      </div>
    </section>
  )
}

// Footer
function Footer() {
  return (
    <footer className="border-t border-[var(--lm-border)] py-16">
      <div className="mx-auto max-w-6xl px-6">
        <div className="grid gap-12 md:grid-cols-4">
          <div>
            <Link href="/" className="flex items-center gap-3">
              <div className="gradient-bg flex h-9 w-9 items-center justify-center rounded-lg">
                <LineChart className="h-5 w-5 text-white" />
              </div>
              <span className="font-display text-xl text-[var(--lm-foreground)]">Assetra</span>
            </Link>
            <p className="font-body mt-4 text-sm text-[var(--lm-muted-foreground)]">
              Financial clarity for life's biggest decisions.
            </p>
          </div>

          <div>
            <h4 className="font-body mb-4 text-sm font-semibold text-[var(--lm-foreground)]">Product</h4>
            <ul className="space-y-3">
              {['Features', 'Pricing', 'Security', 'Roadmap'].map((item) => (
                <li key={item}>
                  <a href="#" className="font-body text-sm text-[var(--lm-muted-foreground)] transition-colors hover:text-[var(--lm-foreground)]">
                    {item}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="font-body mb-4 text-sm font-semibold text-[var(--lm-foreground)]">Company</h4>
            <ul className="space-y-3">
              {['About', 'Blog', 'Careers', 'Contact'].map((item) => (
                <li key={item}>
                  <a href="#" className="font-body text-sm text-[var(--lm-muted-foreground)] transition-colors hover:text-[var(--lm-foreground)]">
                    {item}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="font-body mb-4 text-sm font-semibold text-[var(--lm-foreground)]">Legal</h4>
            <ul className="space-y-3">
              {['Privacy', 'Terms', 'Cookies'].map((item) => (
                <li key={item}>
                  <a href="#" className="font-body text-sm text-[var(--lm-muted-foreground)] transition-colors hover:text-[var(--lm-foreground)]">
                    {item}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-16 flex flex-col items-center justify-between gap-4 border-t border-[var(--lm-border)] pt-8 md:flex-row">
          <p className="font-body text-sm text-[var(--lm-muted-foreground)]">
            &copy; {new Date().getFullYear()} Assetra. All rights reserved.
          </p>
          <div className="flex gap-4">
            {['Twitter', 'LinkedIn', 'GitHub'].map((social) => (
              <a
                key={social}
                href="#"
                className="font-body text-sm text-[var(--lm-muted-foreground)] transition-colors hover:text-[var(--lm-foreground)]"
              >
                {social}
              </a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  )
}

// Main Landing Page Component
export function LandingPageV3() {
  return (
    <div className="landing-v3 font-body min-h-screen bg-[var(--lm-background)]">
      <Navigation />
      <main>
        <HeroSection />
        <FeaturesSection />
        <HowItWorksSection />
        <StatsSection />
        <TestimonialsSection />
        <PricingSection />
        <CTASection />
      </main>
      <Footer />
    </div>
  )
}

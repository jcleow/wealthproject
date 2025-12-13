'use client'

import { useEffect, useRef } from 'react'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { TrendingDown, TrendingUp } from 'lucide-react'

gsap.registerPlugin(ScrollTrigger)

export function FirstSplitPanel() {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      container.querySelectorAll('[data-animate]').forEach((el) => {
        ;(el as HTMLElement).style.opacity = '1'
        ;(el as HTMLElement).style.transform = 'none'
      })
      return
    }

    const ctx = gsap.context(() => {
      // Title animation
      gsap.fromTo(
        '.split-title',
        { opacity: 0, y: 40 },
        {
          opacity: 1,
          y: 0,
          duration: 0.8,
          scrollTrigger: {
            trigger: container,
            start: 'top 75%',
            toggleActions: 'play none none reverse',
          },
        }
      )

      // Cards with staggered asymmetric entrance
      gsap.fromTo(
        '.split-card-left',
        { opacity: 0, x: -60, rotateY: 5 },
        {
          opacity: 1,
          x: 0,
          rotateY: 0,
          duration: 1,
          ease: 'power3.out',
          scrollTrigger: {
            trigger: '.split-cards',
            start: 'top 70%',
            toggleActions: 'play none none reverse',
          },
        }
      )

      gsap.fromTo(
        '.split-card-right',
        { opacity: 0, x: 60, rotateY: -5 },
        {
          opacity: 1,
          x: 0,
          rotateY: 0,
          duration: 1,
          delay: 0.2,
          ease: 'power3.out',
          scrollTrigger: {
            trigger: '.split-cards',
            start: 'top 70%',
            toggleActions: 'play none none reverse',
          },
        }
      )

      // Difference reveal
      gsap.fromTo(
        '.split-difference',
        { opacity: 0, scale: 0.9 },
        {
          opacity: 1,
          scale: 1,
          duration: 0.8,
          scrollTrigger: {
            trigger: '.split-difference',
            start: 'top 85%',
            toggleActions: 'play none none reverse',
          },
        }
      )
    }, container)

    return () => ctx.revert()
  }, [])

  return (
    <div
      ref={containerRef}
      className="landing-panel relative flex min-h-screen flex-col items-center justify-center px-6 py-24"
    >
      {/* Section header */}
      <div className="split-title mb-20 max-w-3xl text-center opacity-0" data-animate>
        <span
          className="landing-body mb-4 block text-xs font-medium uppercase tracking-[0.25em]"
          style={{ color: 'var(--landing-gold)' }}
        >
          The Butterfly Effect
        </span>
        <h2
          className="landing-display text-4xl md:text-5xl lg:text-6xl"
          style={{ color: 'var(--landing-text-primary)' }}
        >
          Every decision creates
          <br />
          <span className="landing-display-italic landing-gold-text">
            a new future
          </span>
        </h2>
      </div>

      {/* Asymmetric card layout */}
      <div className="split-cards relative grid w-full max-w-5xl gap-8 md:grid-cols-2 md:gap-6">
        {/* Left card - Expense */}
        <div
          className="split-card-left landing-card group relative overflow-hidden rounded-2xl p-8 opacity-0 md:-mt-8"
          data-animate
        >
          {/* Glow effect */}
          <div
            className="absolute -right-20 -top-20 h-40 w-40 rounded-full opacity-20 blur-3xl transition-opacity duration-500 group-hover:opacity-40"
            style={{ background: 'var(--landing-rose)' }}
          />

          <div className="relative z-10">
            <div className="mb-6 flex items-center justify-between">
              <span className="text-4xl">🚗</span>
              <div
                className="flex items-center gap-1 rounded-full px-3 py-1"
                style={{ background: 'rgba(244, 63, 94, 0.15)' }}
              >
                <TrendingDown className="h-3 w-3" style={{ color: 'var(--landing-rose)' }} />
                <span
                  className="landing-body text-xs font-medium"
                  style={{ color: 'var(--landing-rose)' }}
                >
                  Expense
                </span>
              </div>
            </div>

            <h3
              className="landing-display mb-2 text-2xl"
              style={{ color: 'var(--landing-text-primary)' }}
            >
              Buy a Car
            </h3>
            <p
              className="landing-body mb-8 text-sm"
              style={{ color: 'var(--landing-text-muted)' }}
            >
              COE, depreciation, insurance, road tax, maintenance, parking...
            </p>

            <div className="space-y-3">
              <div className="flex items-baseline justify-between border-b border-[var(--landing-border)] pb-3">
                <span
                  className="landing-body text-sm"
                  style={{ color: 'var(--landing-text-secondary)' }}
                >
                  10-Year Impact
                </span>
                <span
                  className="landing-display text-3xl"
                  style={{ color: 'var(--landing-rose)' }}
                >
                  -$150K
                </span>
              </div>
              <p
                className="landing-body text-xs"
                style={{ color: 'var(--landing-text-muted)' }}
              >
                Including opportunity cost of invested capital
              </p>
            </div>
          </div>
        </div>

        {/* Right card - Investment */}
        <div
          className="split-card-right landing-card group relative overflow-hidden rounded-2xl p-8 opacity-0 md:mt-8"
          data-animate
        >
          {/* Glow effect */}
          <div
            className="absolute -left-20 -top-20 h-40 w-40 rounded-full opacity-20 blur-3xl transition-opacity duration-500 group-hover:opacity-40"
            style={{ background: 'var(--landing-emerald)' }}
          />

          <div className="relative z-10">
            <div className="mb-6 flex items-center justify-between">
              <span className="text-4xl">💰</span>
              <div
                className="flex items-center gap-1 rounded-full px-3 py-1"
                style={{ background: 'rgba(16, 185, 129, 0.15)' }}
              >
                <TrendingUp className="h-3 w-3" style={{ color: 'var(--landing-emerald)' }} />
                <span
                  className="landing-body text-xs font-medium"
                  style={{ color: 'var(--landing-emerald)' }}
                >
                  Growth
                </span>
              </div>
            </div>

            <h3
              className="landing-display mb-2 text-2xl"
              style={{ color: 'var(--landing-text-primary)' }}
            >
              Keep Saving
            </h3>
            <p
              className="landing-body mb-8 text-sm"
              style={{ color: 'var(--landing-text-muted)' }}
            >
              Invest the difference, let compound interest work its magic...
            </p>

            <div className="space-y-3">
              <div className="flex items-baseline justify-between border-b border-[var(--landing-border)] pb-3">
                <span
                  className="landing-body text-sm"
                  style={{ color: 'var(--landing-text-secondary)' }}
                >
                  10-Year Growth
                </span>
                <span
                  className="landing-display text-3xl"
                  style={{ color: 'var(--landing-emerald)' }}
                >
                  +$180K
                </span>
              </div>
              <p
                className="landing-body text-xs"
                style={{ color: 'var(--landing-text-muted)' }}
              >
                At 7% annual returns, reinvesting dividends
              </p>
            </div>
          </div>
        </div>

        {/* Connecting line */}
        <div className="pointer-events-none absolute left-1/2 top-1/2 hidden h-px w-16 -translate-x-1/2 -translate-y-1/2 md:block">
          <div className="landing-rule-gold h-full w-full" />
        </div>
      </div>

      {/* Difference callout */}
      <div
        className="split-difference mt-16 rounded-2xl border px-12 py-8 text-center opacity-0"
        style={{
          borderColor: 'var(--landing-border-accent)',
          background: 'var(--landing-gold-muted)',
        }}
        data-animate
      >
        <span
          className="landing-body mb-2 block text-xs font-medium uppercase tracking-[0.2em]"
          style={{ color: 'var(--landing-text-muted)' }}
        >
          Net Worth Difference
        </span>
        <span className="landing-display landing-gold-shimmer text-5xl md:text-6xl">
          $330,000
        </span>
        <span
          className="landing-body mt-3 block text-sm"
          style={{ color: 'var(--landing-text-secondary)' }}
        >
          A single choice. A lifetime of difference.
        </span>
      </div>
    </div>
  )
}

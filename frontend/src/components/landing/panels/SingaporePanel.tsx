'use client'

import { useEffect, useRef } from 'react'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger)

export function SingaporePanel() {
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
        '.sg-title',
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

      // Cards with staggered entrance
      gsap.fromTo(
        '.sg-card',
        { opacity: 0, y: 50 },
        {
          opacity: 1,
          y: 0,
          duration: 0.8,
          stagger: 0.2,
          ease: 'power3.out',
          scrollTrigger: {
            trigger: '.sg-grid',
            start: 'top 70%',
            toggleActions: 'play none none reverse',
          },
        }
      )

      // CPF card
      gsap.fromTo(
        '.sg-cpf-card',
        { opacity: 0, y: 40 },
        {
          opacity: 1,
          y: 0,
          duration: 0.8,
          scrollTrigger: {
            trigger: '.sg-cpf-card',
            start: 'top 80%',
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
      <div className="sg-title mb-20 max-w-3xl text-center opacity-0" data-animate>
        <div className="mb-6 flex items-center justify-center gap-4">
          <div className="landing-rule w-12" />
          <span
            className="landing-body text-xs font-medium uppercase tracking-[0.25em]"
            style={{ color: 'var(--landing-gold)' }}
          >
            Singapore Context
          </span>
          <div className="landing-rule w-12" />
        </div>
        <h2
          className="landing-display text-4xl md:text-5xl lg:text-6xl"
          style={{ color: 'var(--landing-text-primary)' }}
        >
          Here, the stakes
          <br />
          <span className="landing-display-italic landing-gold-text">
            are uniquely high
          </span>
        </h2>
        <p
          className="landing-body mx-auto mt-6 max-w-lg text-base"
          style={{ color: 'var(--landing-text-muted)' }}
        >
          COE, BTO, CPF — policies unique to Singapore that can swing your net worth
          by hundreds of thousands.
        </p>
      </div>

      {/* Two-column luxury cards */}
      <div className="sg-grid grid w-full max-w-5xl gap-6 md:grid-cols-2">
        {/* Housing Card */}
        <div
          className="sg-card landing-card group relative overflow-hidden rounded-2xl p-8 opacity-0"
          data-animate
        >
          {/* Decorative corner */}
          <div className="absolute right-0 top-0 h-16 w-16">
            <div
              className="absolute right-4 top-4 h-px w-8"
              style={{ background: 'var(--landing-gold)' }}
            />
            <div
              className="absolute right-4 top-4 h-8 w-px"
              style={{ background: 'var(--landing-gold)' }}
            />
          </div>

          <div className="relative z-10">
            <span className="mb-4 block text-3xl">🏠</span>
            <h3
              className="landing-display mb-6 text-2xl"
              style={{ color: 'var(--landing-text-primary)' }}
            >
              Housing Decision
            </h3>

            <div className="space-y-4">
              {/* BTO Option */}
              <div
                className="group/option relative overflow-hidden rounded-xl p-5 transition-all duration-300"
                style={{ background: 'rgba(16, 185, 129, 0.08)' }}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-lg">🏗️</span>
                    <div>
                      <p
                        className="landing-body text-sm font-medium"
                        style={{ color: 'var(--landing-text-primary)' }}
                      >
                        BTO Route
                      </p>
                      <p
                        className="landing-body text-xs"
                        style={{ color: 'var(--landing-text-muted)' }}
                      >
                        3-5 year wait
                      </p>
                    </div>
                  </div>
                  <span
                    className="landing-display text-2xl"
                    style={{ color: 'var(--landing-emerald)' }}
                  >
                    +$200K
                  </span>
                </div>
              </div>

              {/* Resale Option */}
              <div
                className="group/option relative overflow-hidden rounded-xl p-5 transition-all duration-300"
                style={{ background: 'rgba(244, 63, 94, 0.08)' }}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-lg">🏠</span>
                    <div>
                      <p
                        className="landing-body text-sm font-medium"
                        style={{ color: 'var(--landing-text-primary)' }}
                      >
                        Resale HDB
                      </p>
                      <p
                        className="landing-body text-xs"
                        style={{ color: 'var(--landing-text-muted)' }}
                      >
                        Move in now
                      </p>
                    </div>
                  </div>
                  <span
                    className="landing-display text-2xl"
                    style={{ color: 'var(--landing-rose)' }}
                  >
                    -$200K
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* COE Card */}
        <div
          className="sg-card landing-card group relative overflow-hidden rounded-2xl p-8 opacity-0"
          data-animate
        >
          {/* Decorative corner */}
          <div className="absolute right-0 top-0 h-16 w-16">
            <div
              className="absolute right-4 top-4 h-px w-8"
              style={{ background: 'var(--landing-gold)' }}
            />
            <div
              className="absolute right-4 top-4 h-8 w-px"
              style={{ background: 'var(--landing-gold)' }}
            />
          </div>

          <div className="relative z-10">
            <span className="mb-4 block text-3xl">🚗</span>
            <h3
              className="landing-display mb-6 text-2xl"
              style={{ color: 'var(--landing-text-primary)' }}
            >
              COE Timing
            </h3>

            <div className="space-y-4">
              {/* Low COE */}
              <div
                className="group/option relative overflow-hidden rounded-xl p-5 transition-all duration-300"
                style={{ background: 'rgba(16, 185, 129, 0.08)' }}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-lg">📉</span>
                    <div>
                      <p
                        className="landing-body text-sm font-medium"
                        style={{ color: 'var(--landing-text-primary)' }}
                      >
                        COE at $50K
                      </p>
                      <p
                        className="landing-body text-xs"
                        style={{ color: 'var(--landing-text-muted)' }}
                      >
                        Market low
                      </p>
                    </div>
                  </div>
                  <span
                    className="landing-display text-2xl"
                    style={{ color: 'var(--landing-emerald)' }}
                  >
                    $120K
                  </span>
                </div>
              </div>

              {/* High COE */}
              <div
                className="group/option relative overflow-hidden rounded-xl p-5 transition-all duration-300"
                style={{ background: 'rgba(244, 63, 94, 0.08)' }}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-lg">📈</span>
                    <div>
                      <p
                        className="landing-body text-sm font-medium"
                        style={{ color: 'var(--landing-text-primary)' }}
                      >
                        COE at $100K
                      </p>
                      <p
                        className="landing-body text-xs"
                        style={{ color: 'var(--landing-text-muted)' }}
                      >
                        Market high
                      </p>
                    </div>
                  </div>
                  <span
                    className="landing-display text-2xl"
                    style={{ color: 'var(--landing-rose)' }}
                  >
                    $170K
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* CPF Strategy Card - Full width */}
      <div
        className="sg-cpf-card mt-6 w-full max-w-5xl rounded-2xl border p-10 opacity-0"
        style={{
          borderColor: 'var(--landing-border-accent)',
          background: 'linear-gradient(135deg, rgba(201, 169, 98, 0.08) 0%, rgba(12, 17, 25, 0.9) 100%)',
        }}
        data-animate
      >
        <div className="flex flex-col items-center text-center">
          <span className="mb-4 text-4xl">💎</span>
          <h3
            className="landing-display mb-2 text-2xl"
            style={{ color: 'var(--landing-text-primary)' }}
          >
            CPF Strategy at 55
          </h3>
          <p
            className="landing-body mb-8 text-sm"
            style={{ color: 'var(--landing-text-muted)' }}
          >
            The OA vs SA allocation decision
          </p>

          <div className="flex w-full max-w-md items-center justify-center gap-8">
            <div className="flex-1 text-center">
              <p
                className="landing-body mb-2 text-xs font-medium uppercase tracking-wider"
                style={{ color: 'var(--landing-text-muted)' }}
              >
                Max OA
              </p>
              <p
                className="landing-display text-4xl"
                style={{ color: '#3B82F6' }}
              >
                $800K
              </p>
              <p
                className="landing-body mt-1 text-xs"
                style={{ color: 'var(--landing-text-muted)' }}
              >
                2.5% interest
              </p>
            </div>

            <div className="flex flex-col items-center gap-2">
              <div
                className="h-12 w-px"
                style={{ background: 'var(--landing-border)' }}
              />
              <span
                className="landing-body text-xs"
                style={{ color: 'var(--landing-text-muted)' }}
              >
                vs
              </span>
              <div
                className="h-12 w-px"
                style={{ background: 'var(--landing-border)' }}
              />
            </div>

            <div className="flex-1 text-center">
              <p
                className="landing-body mb-2 text-xs font-medium uppercase tracking-wider"
                style={{ color: 'var(--landing-text-muted)' }}
              >
                Max SA
              </p>
              <p
                className="landing-display text-4xl"
                style={{ color: 'var(--landing-emerald)' }}
              >
                $1.2M
              </p>
              <p
                className="landing-body mt-1 text-xs"
                style={{ color: 'var(--landing-text-muted)' }}
              >
                4% interest
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

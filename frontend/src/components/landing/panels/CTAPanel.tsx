'use client'

import { useEffect, useRef } from 'react'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { ArrowRight, BarChart3, Target, Sparkles } from 'lucide-react'
import Link from 'next/link'

gsap.registerPlugin(ScrollTrigger)

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

export function CTAPanel() {
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
        '.cta-header',
        { opacity: 0, y: 40 },
        {
          opacity: 1,
          y: 0,
          duration: 0.8,
          scrollTrigger: {
            trigger: container,
            start: 'top 70%',
            toggleActions: 'play none none reverse',
          },
        }
      )

      // CTA button
      gsap.fromTo(
        '.cta-button',
        { opacity: 0, scale: 0.95 },
        {
          opacity: 1,
          scale: 1,
          duration: 0.6,
          delay: 0.3,
          scrollTrigger: {
            trigger: container,
            start: 'top 70%',
            toggleActions: 'play none none reverse',
          },
        }
      )

      // Social proof
      gsap.fromTo(
        '.cta-social',
        { opacity: 0 },
        {
          opacity: 1,
          duration: 0.5,
          delay: 0.5,
          scrollTrigger: {
            trigger: container,
            start: 'top 70%',
            toggleActions: 'play none none reverse',
          },
        }
      )

      // Feature cards stagger
      gsap.fromTo(
        '.cta-feature',
        { opacity: 0, y: 30 },
        {
          opacity: 1,
          y: 0,
          duration: 0.6,
          stagger: 0.15,
          scrollTrigger: {
            trigger: '.cta-features',
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
      className={`relative
flex flex-col items-center justify-center
min-h-screen
px-6 py-24
landing-panel`}
    >
      {/* Background gradient */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background: 'radial-gradient(ellipse at center bottom, rgba(201, 169, 98, 0.08) 0%, transparent 60%)',
        }}
      />

      {/* Decorative corners */}
      <div className={`absolute left-8 top-8
h-24 w-24
pointer-events-none
border-l border-t border-[var(--landing-border-accent)]
opacity-30`} />
      <div className={`absolute right-8 top-8
h-24 w-24
pointer-events-none
border-r border-t border-[var(--landing-border-accent)]
opacity-30`} />

      <div className="relative z-10 max-w-4xl text-center">
        {/* Header */}
        <div className="cta-header mb-12 opacity-0" data-animate>
          <span
            className={`block
mb-6
text-xs font-medium tracking-[0.25em]
landing-body uppercase`}
            style={{ color: 'var(--landing-gold)' }}
          >
            Start Today
          </span>
          <h2
            className="landing-display text-4xl md:text-5xl lg:text-6xl"
            style={{ color: 'var(--landing-text-primary)' }}
          >
            Take control of your
            <br />
            <span className="landing-display-italic landing-gold-text">
              financial future
            </span>
          </h2>
        </div>

        {/* CTA Button */}
        <div className="cta-button mb-8 opacity-0" data-animate>
          <Link
            href="/dashboard"
            className={`relative
inline-flex items-center overflow-hidden
gap-4 px-10 py-5
rounded-full
transition-all duration-500
group`}
            style={{
              background: 'linear-gradient(135deg, var(--landing-gold) 0%, #A8893D 100%)',
              boxShadow: '0 4px 30px rgba(201, 169, 98, 0.3)',
            }}
          >
            {/* Shimmer effect */}
            <div
              className={`absolute inset-0
opacity-0 group-hover:opacity-100
transition-opacity duration-500`}
              style={{
                background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent)',
                animation: 'landing-shimmer 2s infinite',
              }}
            />
            <span
              className={`relative
text-base font-semibold tracking-[0.1em]
landing-body uppercase`}
              style={{ color: 'var(--landing-bg)' }}
            >
              Start Planning Free
            </span>
            <ArrowRight
              className={`relative
h-5 w-5
transition-transform duration-300 group-hover:translate-x-1`}
              style={{ color: 'var(--landing-bg)' }}
            />
          </Link>
        </div>

        {/* Social proof */}
        <p
          className="cta-social landing-body mb-20 text-sm opacity-0"
          style={{ color: 'var(--landing-text-muted)' }}
          data-animate
        >
          Join{' '}
          <span style={{ color: 'var(--landing-text-primary)' }}>1,000+ Singaporeans</span>{' '}
          mapping their financial futures
        </p>

        {/* Features */}
        <div className="cta-features grid gap-6 md:grid-cols-3">
          {features.map((feature) => (
            <div
              key={feature.label}
              className={`p-6
rounded-xl
text-center
opacity-0
cta-feature landing-card group`}
              data-animate
            >
              <div
                className={`flex items-center justify-center
h-12 w-12
mx-auto mb-4
rounded-xl
transition-transform duration-300 group-hover:scale-110`}
                style={{ background: 'var(--landing-gold-muted)' }}
              >
                <feature.icon
                  className="h-5 w-5"
                  style={{ color: 'var(--landing-gold)' }}
                />
              </div>
              <h3
                className="landing-display mb-2 text-lg"
                style={{ color: 'var(--landing-text-primary)' }}
              >
                {feature.label}
              </h3>
              <p
                className="landing-body text-sm"
                style={{ color: 'var(--landing-text-muted)' }}
              >
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Footer */}
      <footer className="absolute bottom-8 left-0 right-0 text-center">
        <div className="landing-rule mx-auto mb-6 w-24" />
        <p
          className="landing-body text-xs"
          style={{ color: 'var(--landing-text-muted)' }}
        >
          &copy; {new Date().getFullYear()} Assetra
        </p>
        <p
          className="landing-body mt-1 text-xs"
          style={{ color: 'var(--landing-text-muted)' }}
        >
          Built for Singaporeans, by Singaporeans
        </p>
      </footer>
    </div>
  )
}

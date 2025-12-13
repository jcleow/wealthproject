'use client'

import { useEffect, useRef } from 'react'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger)

export function ChaosPanel() {
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
      // Main question with dramatic reveal
      gsap.fromTo(
        '.chaos-question',
        { opacity: 0, scale: 0.95 },
        {
          opacity: 1,
          scale: 1,
          duration: 1,
          ease: 'power2.out',
          scrollTrigger: {
            trigger: container,
            start: 'top 60%',
            toggleActions: 'play none none reverse',
          },
        }
      )

      // Subtitle fade in
      gsap.fromTo(
        '.chaos-subtitle',
        { opacity: 0, y: 20 },
        {
          opacity: 1,
          y: 0,
          duration: 0.8,
          delay: 0.3,
          scrollTrigger: {
            trigger: container,
            start: 'top 60%',
            toggleActions: 'play none none reverse',
          },
        }
      )

      // Answer reveal with gold shimmer
      gsap.fromTo(
        '.chaos-answer',
        { opacity: 0, y: 30 },
        {
          opacity: 1,
          y: 0,
          duration: 0.8,
          delay: 0.6,
          scrollTrigger: {
            trigger: container,
            start: 'top 60%',
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
      {/* Decorative lines */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div
          className="absolute left-1/4 top-1/4 h-px w-32 -rotate-45 opacity-20"
          style={{ background: 'var(--landing-border)' }}
        />
        <div
          className="absolute right-1/4 top-1/3 h-px w-48 rotate-12 opacity-20"
          style={{ background: 'var(--landing-border)' }}
        />
        <div
          className="absolute bottom-1/3 left-1/3 h-px w-24 -rotate-12 opacity-20"
          style={{ background: 'var(--landing-border)' }}
        />
        <div
          className="absolute bottom-1/4 right-1/3 h-px w-40 rotate-45 opacity-20"
          style={{ background: 'var(--landing-border)' }}
        />
      </div>

      <div className="relative z-10 max-w-4xl text-center">
        {/* Main question */}
        <h2
          className="chaos-question landing-display mb-8 text-4xl opacity-0 md:text-6xl lg:text-7xl"
          style={{ color: 'var(--landing-text-primary)' }}
          data-animate
        >
          How do you make sense
          <br />
          <span className="landing-display-italic" style={{ color: 'var(--landing-text-secondary)' }}>
            of it all?
          </span>
        </h2>

        {/* Subtitle */}
        <p
          className="chaos-subtitle landing-body mx-auto mb-16 max-w-xl text-lg opacity-0"
          style={{ color: 'var(--landing-text-muted)' }}
          data-animate
        >
          Too many variables. Too many unknowns.
          <br />
          The more you plan, the more overwhelming it gets.
        </p>

        {/* Answer */}
        <div className="chaos-answer opacity-0" data-animate>
          <div className="landing-rule-gold mx-auto mb-8 w-24" />
          <p className="landing-display landing-gold-shimmer text-3xl md:text-4xl">
            You need clarity.
          </p>
        </div>
      </div>
    </div>
  )
}

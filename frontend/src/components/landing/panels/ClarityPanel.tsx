'use client'

import { useEffect, useRef } from 'react'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { ScenarioDemoWidget } from '../demo/ScenarioDemoWidget'

gsap.registerPlugin(ScrollTrigger)

export function ClarityPanel() {
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
        '.clarity-header',
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

      // Demo widget with scale entrance
      gsap.fromTo(
        '.clarity-demo',
        { opacity: 0, y: 60, scale: 0.98 },
        {
          opacity: 1,
          y: 0,
          scale: 1,
          duration: 1,
          ease: 'power3.out',
          scrollTrigger: {
            trigger: '.clarity-demo',
            start: 'top 75%',
            toggleActions: 'play none none reverse',
          },
        }
      )

      // Footer text
      gsap.fromTo(
        '.clarity-footer',
        { opacity: 0 },
        {
          opacity: 1,
          duration: 0.6,
          scrollTrigger: {
            trigger: '.clarity-footer',
            start: 'top 90%',
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
      {/* Section header */}
      <div className="clarity-header mb-16 max-w-3xl text-center opacity-0" data-animate>
        <div className="mb-6 flex items-center justify-center gap-4">
          <div className="landing-rule w-12" />
          <span
            className={`text-xs font-medium tracking-[0.25em]
landing-body uppercase`}
            style={{ color: 'var(--landing-gold)' }}
          >
            The Solution
          </span>
          <div className="landing-rule w-12" />
        </div>
        <h2
          className="landing-display text-4xl md:text-5xl lg:text-6xl"
          style={{ color: 'var(--landing-text-primary)' }}
        >
          See your future,
          <br />
          <span className="landing-display-italic landing-gold-text">clearly</span>
        </h2>
        <p
          className="landing-body mx-auto mt-6 max-w-lg text-base"
          style={{ color: 'var(--landing-text-muted)' }}
        >
          Toggle scenarios on and off. Watch your net worth projection update
          instantly.
        </p>
      </div>

      {/* Demo widget container */}
      <div
        className={`w-full max-w-2xl
p-1
rounded-2xl border
opacity-0
clarity-demo`}
        style={{
          borderColor: 'var(--landing-border-accent)',
          background: 'linear-gradient(180deg, rgba(201, 169, 98, 0.05) 0%, transparent 100%)',
        }}
        data-animate
      >
        <div
          className="rounded-xl"
          style={{ background: 'var(--landing-surface)' }}
        >
          <ScenarioDemoWidget />
        </div>
      </div>

      {/* Footer */}
      <div className="clarity-footer mt-12 text-center opacity-0" data-animate>
        <p
          className="landing-body text-sm"
          style={{ color: 'var(--landing-text-muted)' }}
        >
          What takes hours in spreadsheets,
        </p>
        <p className="landing-display-italic mt-1 text-lg" style={{ color: 'var(--landing-gold)' }}>
          Assetra does in seconds.
        </p>
      </div>
    </div>
  )
}

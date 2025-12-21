'use client'

import { useEffect, useRef } from 'react'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger)

const scenarios = [
  {
    icon: '👶',
    label: 'Have Children',
    impact: '$800K',
    direction: 'swing',
    color: '#EC4899',
    description: 'Education, childcare, activities',
  },
  {
    icon: '🏠',
    label: 'Buy Property',
    impact: '$1.2M',
    direction: 'swing',
    color: '#3B82F6',
    description: 'Appreciation vs opportunity cost',
  },
  {
    icon: '🧭',
    label: 'Career Break',
    impact: '$350K',
    direction: 'swing',
    color: '#F97316',
    description: 'Lost income + career momentum',
  },
  {
    icon: '💼',
    label: 'Switch to Tech',
    impact: '$1.1M',
    direction: 'swing',
    color: '#10B981',
    description: 'Higher earning potential',
  },
]

export function MultipleFuturesPanel() {
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
        '.futures-title',
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

      // Staggered grid items with kinetic entrance
      gsap.fromTo(
        '.futures-item',
        { opacity: 0, y: 60, scale: 0.95 },
        {
          opacity: 1,
          y: 0,
          scale: 1,
          duration: 0.8,
          stagger: 0.15,
          ease: 'power3.out',
          scrollTrigger: {
            trigger: '.futures-grid',
            start: 'top 70%',
            toggleActions: 'play none none reverse',
          },
        }
      )

      // Footer text
      gsap.fromTo(
        '.futures-footer',
        { opacity: 0 },
        {
          opacity: 1,
          duration: 0.6,
          scrollTrigger: {
            trigger: '.futures-footer',
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
      <div className="futures-title mb-20 max-w-3xl text-center opacity-0" data-animate>
        <span
          className={`block
mb-4
text-xs font-medium tracking-[0.25em]
landing-body uppercase`}
          style={{ color: 'var(--landing-gold)' }}
        >
          Compounding Complexity
        </span>
        <h2
          className="landing-display text-4xl md:text-5xl lg:text-6xl"
          style={{ color: 'var(--landing-text-primary)' }}
        >
          Life doesn&apos;t stop
          <br />
          <span className="landing-display-italic" style={{ color: 'var(--landing-text-secondary)' }}>
            at one decision
          </span>
        </h2>
        <p
          className="landing-body mx-auto mt-6 max-w-lg text-base"
          style={{ color: 'var(--landing-text-muted)' }}
        >
          Each choice branches into more. Kids, property, career shifts—each move
          reshapes the entire arc.
        </p>
      </div>

      {/* Kinetic grid */}
      <div className="futures-grid grid w-full max-w-4xl gap-4 md:grid-cols-2">
        {scenarios.map((s, index) => (
          <div
            key={s.label}
            className={`relative
overflow-hidden
p-6
rounded-xl border border-[var(--landing-border)] hover:border-[var(--landing-border-accent)]
opacity-0
transition-all duration-500
futures-item group`}
            style={{
              background: 'linear-gradient(180deg, rgba(17, 24, 32, 0.6) 0%, rgba(12, 17, 25, 0.8) 100%)',
              transform: index % 2 === 1 ? 'translateY(20px)' : 'translateY(0)',
            }}
            data-animate
          >
            {/* Hover glow */}
            <div
              className={`absolute
h-24 w-24
rounded-full
opacity-0 blur-2xl group-hover:opacity-30
transition-opacity duration-500
-right-12 -top-12`}
              style={{ background: s.color }}
            />

            <div className="relative z-10 flex items-start gap-5">
              {/* Icon */}
              <div
                className={`flex items-center justify-center
h-14 w-14
rounded-xl
text-2xl
transition-transform duration-300 group-hover:scale-110
shrink-0`}
                style={{ background: `${s.color}15` }}
              >
                {s.icon}
              </div>

              {/* Content */}
              <div className="flex-1">
                <div className="mb-1 flex items-baseline justify-between">
                  <h3
                    className="landing-body text-sm font-medium"
                    style={{ color: 'var(--landing-text-secondary)' }}
                  >
                    {s.label}
                  </h3>
                  <span
                    className="landing-body text-xs uppercase tracking-wider"
                    style={{ color: 'var(--landing-text-muted)' }}
                  >
                    {s.direction}
                  </span>
                </div>

                <p
                  className="landing-display text-3xl"
                  style={{ color: s.color }}
                >
                  {s.impact}
                </p>

                <p
                  className="landing-body mt-2 text-xs"
                  style={{ color: 'var(--landing-text-muted)' }}
                >
                  {s.description}
                </p>
              </div>
            </div>

            {/* Decorative line */}
            <div
              className={`absolute bottom-0 left-0
h-px w-0 group-hover:w-full
transition-all duration-500`}
              style={{ background: `linear-gradient(90deg, transparent, ${s.color}, transparent)` }}
            />
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="futures-footer mt-16 text-center opacity-0" data-animate>
        <div className="landing-rule mx-auto mb-6 w-24" />
        <p
          className="landing-display-italic text-xl"
          style={{ color: 'var(--landing-text-secondary)' }}
        >
          And that&apos;s just the beginning...
        </p>
      </div>
    </div>
  )
}

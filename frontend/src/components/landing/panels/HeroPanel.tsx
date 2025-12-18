'use client'

import { useEffect, useRef } from 'react'
import { gsap } from 'gsap'
import { ArrowDown } from 'lucide-react'

export function HeroPanel() {
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

    const tl = gsap.timeline({ defaults: { ease: 'power3.out' } })

    // Staggered reveal sequence
    tl.fromTo(
      '.hero-overline',
      { opacity: 0, y: 20 },
      { opacity: 1, y: 0, duration: 0.8 },
      0.3
    )
    tl.fromTo(
      '.hero-title-line-1',
      { opacity: 0, y: 60, skewY: 3 },
      { opacity: 1, y: 0, skewY: 0, duration: 1.2 },
      0.5
    )
    tl.fromTo(
      '.hero-title-line-2',
      { opacity: 0, y: 60, skewY: 3 },
      { opacity: 1, y: 0, skewY: 0, duration: 1.2 },
      0.7
    )
    tl.fromTo(
      '.hero-rule',
      { scaleX: 0 },
      { scaleX: 1, duration: 1, ease: 'power2.inOut' },
      1.2
    )
    tl.fromTo(
      '.hero-subtitle',
      { opacity: 0, y: 20 },
      { opacity: 1, y: 0, duration: 0.8 },
      1.4
    )
    tl.fromTo(
      '.hero-cta',
      { opacity: 0, scale: 0.9 },
      { opacity: 1, scale: 1, duration: 0.6 },
      1.6
    )
    tl.fromTo(
      '.hero-scroll',
      { opacity: 0 },
      { opacity: 1, duration: 0.5 },
      2
    )

    // Floating animation for scroll indicator
    gsap.to('.hero-scroll', {
      y: 12,
      duration: 2,
      repeat: -1,
      yoyo: true,
      ease: 'power1.inOut',
    })

    return () => {
      tl.kill()
    }
  }, [])

  return (
    <div
      ref={containerRef}
      className={`relative
flex flex-col items-center justify-center
min-h-screen
px-6 py-20
landing-panel`}
    >
      {/* Decorative corner accents */}
      <div className={`absolute left-8 top-8
h-20 w-20
pointer-events-none
border-l border-t border-[var(--landing-border)]
opacity-40`} />
      <div className={`absolute right-8 top-8
h-20 w-20
pointer-events-none
border-r border-t border-[var(--landing-border)]
opacity-40`} />
      <div className={`absolute bottom-8 left-8
h-20 w-20
pointer-events-none
border-b border-l border-[var(--landing-border)]
opacity-40`} />
      <div className={`absolute bottom-8 right-8
h-20 w-20
pointer-events-none
border-b border-r border-[var(--landing-border)]
opacity-40`} />

      {/* Content */}
      <div className="relative z-10 max-w-5xl text-center">
        {/* Overline */}
        <div
          data-animate
          className={`flex items-center justify-center
mb-8 gap-3
opacity-0
hero-overline`}
        >
          <span className="h-px w-8 bg-[var(--landing-gold)]" />
          <span
            className={`text-xs font-medium tracking-[0.25em]
landing-body uppercase`}
            style={{ color: 'var(--landing-gold)' }}
          >
            Financial Clarity
          </span>
          <span className="h-px w-8 bg-[var(--landing-gold)]" />
        </div>

        {/* Main headline - Split into dramatic lines */}
        <h1 className="mb-8">
          <span
            data-animate
            className={`block
text-5xl md:text-7xl lg:text-8xl
opacity-0
hero-title-line-1 landing-display`}
            style={{ color: 'var(--landing-text-primary)' }}
          >
            Your Future
          </span>
          <span
            data-animate
            className={`block
mt-2
text-5xl md:text-7xl lg:text-8xl
opacity-0
hero-title-line-2 landing-display-italic`}
          >
            <span className="landing-gold-text">Is Not Written</span>
            <span style={{ color: 'var(--landing-text-secondary)' }}> Yet</span>
          </span>
        </h1>

        {/* Decorative rule */}
        <div
          data-animate
          className={`w-32
mx-auto mb-10
origin-center
hero-rule landing-rule-gold`}
          style={{ transform: 'scaleX(0)' }}
        />

        {/* Subtitle */}
        <p
          data-animate
          className={`max-w-xl
mx-auto
text-lg md:text-xl
opacity-0
hero-subtitle landing-body`}
          style={{ color: 'var(--landing-text-secondary)' }}
        >
          Every decision branches into a different outcome.
          <br />
          <span style={{ color: 'var(--landing-text-muted)' }}>
            See where each path leads.
          </span>
        </p>

        {/* CTA Badge */}
        <div data-animate className="hero-cta mt-12 opacity-0">
          <a
            href="/dashboard"
            className={`inline-flex items-center
gap-3 px-8 py-4
rounded-full border
transition-all duration-500
group`}
            style={{
              borderColor: 'var(--landing-border-accent)',
              background: 'var(--landing-gold-muted)',
            }}
          >
            <span
              className={`text-sm font-medium tracking-[0.15em]
landing-body uppercase`}
              style={{ color: 'var(--landing-gold)' }}
            >
              Start Planning
            </span>
            <span
              className={`flex items-center justify-center
h-6 w-6
rounded-full
transition-transform duration-300 group-hover:translate-x-1`}
              style={{ background: 'var(--landing-gold)' }}
            >
              <ArrowDown
                className="h-3 w-3 -rotate-90"
                style={{ color: 'var(--landing-bg)' }}
              />
            </span>
          </a>
        </div>
      </div>

      {/* Scroll indicator */}
      <div
        data-animate
        className={`absolute bottom-16
flex flex-col items-center
gap-4
opacity-0
hero-scroll`}
      >
        <span
          className="landing-body text-xs font-medium uppercase tracking-[0.2em]"
          style={{ color: 'var(--landing-text-muted)' }}
        >
          Scroll to explore
        </span>
        <div
          className={`flex items-start justify-center
h-10 w-6
p-1.5
rounded-full border`}
          style={{ borderColor: 'var(--landing-border)' }}
        >
          <div
            className="h-2 w-1 rounded-full"
            style={{ background: 'var(--landing-gold)' }}
          />
        </div>
      </div>
    </div>
  )
}

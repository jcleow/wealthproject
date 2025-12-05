'use client'

import { useEffect, useRef } from 'react'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger)

const scenarios = [
  { icon: '👶', label: 'Have Children', impact: '$800K swing', color: '#ec4899' },
  { icon: '🏠', label: 'Buy Property', impact: '$1.2M swing', color: '#3b82f6' },
  { icon: '🧭', label: 'Career Break', impact: '$350K swing', color: '#f97316' },
  { icon: '💼', label: 'Switch to Tech', impact: '$1.1M swing', color: '#22c55e' },
]

export function MultipleFuturesPanel() {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      container.querySelectorAll('.future-item').forEach((el) => el.classList.remove('opacity-0'))
      return
    }

    const items = container.querySelectorAll('.future-item')

    gsap.set(items, { opacity: 0, x: -20 })

    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: container,
        start: 'top 70%',
        end: 'bottom 30%',
        toggleActions: 'play none none reverse',
      },
    })

    tl.to(items, {
      opacity: 1,
      x: 0,
      duration: 0.5,
      stagger: 0.1,
      ease: 'power2.out',
    })

    return () => {
      tl.kill()
    }
  }, [])

  return (
    <div
      ref={containerRef}
      className="landing-panel relative flex min-h-screen flex-col items-center justify-center px-4 py-20"
    >
      <h2 className="mb-4 text-center text-2xl font-semibold text-white md:text-4xl">
        Life doesn&apos;t stop there
      </h2>
      <p className="mb-16 max-w-lg text-center text-slate-500">
        Each decision branches into more. Kids, property, career shifts — each
        move reshapes the entire arc.
      </p>

      <div className="grid w-full max-w-2xl gap-4 md:grid-cols-2">
        {scenarios.map((s) => (
          <div
            key={s.label}
            className="future-item flex items-center gap-4 rounded-lg border border-white/5 bg-white/[0.02] p-4"
          >
            <span className="text-2xl">{s.icon}</span>
            <div className="flex-1">
              <p className="text-sm text-slate-400">{s.label}</p>
              <p className="text-lg font-semibold" style={{ color: s.color }}>
                {s.impact}
              </p>
            </div>
          </div>
        ))}
      </div>

      <p className="mt-12 text-center text-slate-600">
        And that&apos;s just the start...
      </p>
    </div>
  )
}

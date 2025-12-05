'use client'

import { useEffect, useRef } from 'react'
import { gsap } from 'gsap'
import { ChevronDown } from 'lucide-react'

export function HeroPanel() {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      container.querySelectorAll('.hero-title, .hero-subtitle, .scroll-indicator').forEach((el) => {
        el.classList.remove('opacity-0')
      })
      return
    }

    const tl = gsap.timeline({ defaults: { ease: 'power3.out' } })

    tl.fromTo(
      '.hero-title',
      { opacity: 0, y: 40 },
      { opacity: 1, y: 0, duration: 1.2 }
    )
    tl.fromTo(
      '.hero-subtitle',
      { opacity: 0, y: 20 },
      { opacity: 1, y: 0, duration: 0.8 },
      '-=0.6'
    )
    tl.fromTo(
      '.scroll-indicator',
      { opacity: 0 },
      { opacity: 1, duration: 0.5 },
      '+=0.5'
    )

    // Continuous bounce for scroll indicator
    gsap.to('.scroll-indicator', {
      y: 10,
      duration: 1.5,
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
      className="landing-panel relative flex min-h-screen flex-col items-center justify-center px-4"
    >
      <div className="mb-6 flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold uppercase tracking-[0.15em] text-slate-400">
        <span className="h-2 w-2 rounded-full bg-emerald-400" />
        You are here — the decision point
      </div>

      <h1 className="hero-title mb-6 text-center text-4xl font-bold tracking-tight text-white opacity-0 md:text-6xl lg:text-7xl">
        Your Financial Future
        <br />
        <span className="text-slate-400">Is Not Written Yet</span>
      </h1>

      <p className="hero-subtitle max-w-xl text-center text-lg text-slate-500 opacity-0">
        Every decision branches into a different outcome.
        <br />
        See where each path leads.
      </p>

      <div className="scroll-indicator absolute bottom-12 flex flex-col items-center gap-2 opacity-0">
        <span className="text-sm text-slate-600">Scroll to explore</span>
        <ChevronDown className="h-5 w-5 text-slate-600" />
      </div>
    </div>
  )
}

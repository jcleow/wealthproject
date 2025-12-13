'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { FlowField } from './background/FlowField'
import { HeroPanel } from './panels/HeroPanel'
import { FirstSplitPanel } from './panels/FirstSplitPanel'
import { MultipleFuturesPanel } from './panels/MultipleFuturesPanel'
import { SingaporePanel } from './panels/SingaporePanel'
import { ChaosPanel } from './panels/ChaosPanel'
import { ClarityPanel } from './panels/ClarityPanel'
import { CTAPanel } from './panels/CTAPanel'

gsap.registerPlugin(ScrollTrigger)

export function LandingPage() {
  const containerRef = useRef<HTMLDivElement>(null)
  const [scrollProgress, setScrollProgress] = useState(0)

  // Track scroll progress for FlowField color/convergence transition
  const handleScroll = useCallback(() => {
    if (!containerRef.current) return
    const scrollTop = window.scrollY
    const docHeight = document.documentElement.scrollHeight - window.innerHeight
    const progress = Math.min(1, Math.max(0, scrollTop / docHeight))
    setScrollProgress(progress)
  }, [])

  useEffect(() => {
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [handleScroll])

  // Check for reduced motion preference
  const prefersReducedMotion = typeof window !== 'undefined'
    ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
    : false

  return (
    <div
      ref={containerRef}
      className="landing-wrapper landing-grain relative min-h-screen overflow-x-hidden"
      style={{ background: 'var(--landing-bg)' }}
    >
      {/* Flow Field Background - the Loki timeline effect */}
      {!prefersReducedMotion && (
        <div className="fixed inset-0 z-0">
          <FlowField scrollProgress={scrollProgress} />
        </div>
      )}

      {/* Gradient overlays for depth and text readability */}
      <div className="pointer-events-none fixed inset-0 z-[1]">
        {/* Central vignette */}
        <div
          className="absolute inset-0"
          style={{
            background:
              'radial-gradient(ellipse at center, transparent 0%, rgba(7, 11, 20, 0.5) 50%, rgba(7, 11, 20, 0.9) 100%)',
          }}
        />
        {/* Top gradient for header area */}
        <div
          className="absolute inset-x-0 top-0 h-40"
          style={{
            background:
              'linear-gradient(180deg, rgba(7, 11, 20, 0.8) 0%, transparent 100%)',
          }}
        />
        {/* Subtle gold ambient glow */}
        <div
          className="absolute bottom-0 left-1/2 h-[600px] w-[800px] -translate-x-1/2 translate-y-1/2 rounded-full opacity-[0.03] blur-3xl"
          style={{ background: 'var(--landing-gold)' }}
        />
      </div>

      {/* Main content */}
      <div className="landing-content relative z-10">
        <HeroPanel />
        <FirstSplitPanel />
        <MultipleFuturesPanel />
        <SingaporePanel />
        <ChaosPanel />
        <ClarityPanel />
        <CTAPanel />
      </div>
    </div>
  )
}

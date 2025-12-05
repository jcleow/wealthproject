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
      container.querySelectorAll('.clarity-title, .clarity-subtitle, .demo-container').forEach((el) =>
        el.classList.remove('opacity-0')
      )
      return
    }

    const title = container.querySelector('.clarity-title')
    const subtitle = container.querySelector('.clarity-subtitle')
    const demo = container.querySelector('.demo-container')

    gsap.set([title, subtitle], { opacity: 0, y: 30 })
    gsap.set(demo, { opacity: 0, y: 40 })

    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: container,
        start: 'top 70%',
        end: 'bottom 30%',
        toggleActions: 'play none none reverse',
      },
    })

    tl.to(title, { opacity: 1, y: 0, duration: 0.6 })
    tl.to(subtitle, { opacity: 1, y: 0, duration: 0.5 }, '-=0.3')
    tl.to(demo, { opacity: 1, y: 0, duration: 0.8 }, '-=0.2')

    return () => {
      tl.kill()
    }
  }, [])

  return (
    <div
      ref={containerRef}
      className="landing-panel relative flex min-h-screen flex-col items-center justify-center px-4 py-20"
    >
      <h2 className="clarity-title mb-4 text-center text-2xl font-semibold text-white opacity-0 md:text-4xl">
        See your future, clearly
      </h2>
      <p className="clarity-subtitle mb-12 max-w-lg text-center text-slate-500 opacity-0">
        Toggle scenarios on and off. Watch your net worth projection update
        instantly.
      </p>

      <div className="demo-container w-full max-w-2xl opacity-0">
        <ScenarioDemoWidget />
      </div>

      <p className="mt-8 text-center text-sm text-slate-600">
        What takes hours in spreadsheets, Assetra does in seconds.
      </p>
    </div>
  )
}

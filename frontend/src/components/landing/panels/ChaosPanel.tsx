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
      container.querySelectorAll('.chaos-title, .chaos-subtitle').forEach((el) => {
        el.classList.remove('opacity-0')
      })
      return
    }

    const title = container.querySelector('.chaos-title')
    const subtitle = container.querySelector('.chaos-subtitle')

    gsap.set([title, subtitle], { opacity: 0, y: 30 })

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

    return () => {
      tl.kill()
    }
  }, [])

  return (
    <div
      ref={containerRef}
      className="landing-panel relative flex min-h-screen flex-col items-center justify-center px-4 py-20"
    >
      <h2 className="chaos-title mb-6 text-center text-2xl font-semibold text-white opacity-0 md:text-4xl">
        How do you make sense of it all?
      </h2>

      <p className="chaos-subtitle max-w-lg text-center text-slate-500 opacity-0">
        Too many variables. Too many unknowns. The more you plan, the more
        overwhelming it gets.
      </p>

      <p className="mt-12 text-xl font-medium text-white">You need clarity.</p>
    </div>
  )
}

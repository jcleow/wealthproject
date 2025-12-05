'use client'

import { useEffect, useRef } from 'react'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { Card, CardContent } from '@/components/ui/card'

gsap.registerPlugin(ScrollTrigger)

export function FirstSplitPanel() {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      container.querySelectorAll('.scenario-card').forEach((el) => el.classList.remove('opacity-0'))
      return
    }

    const cards = container.querySelectorAll('.scenario-card')

    gsap.set(cards, { opacity: 0, y: 40 })

    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: container,
        start: 'top 70%',
        end: 'bottom 30%',
        toggleActions: 'play none none reverse',
      },
    })

    tl.to(cards, {
      opacity: 1,
      y: 0,
      duration: 0.6,
      stagger: 0.2,
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
        Every decision creates a new future
      </h2>
      <p className="mb-16 max-w-lg text-center text-slate-500">
        A single choice today can mean hundreds of thousands in difference over
        time.
      </p>

      <div className="flex w-full max-w-3xl flex-col gap-6 md:flex-row">
        <Card className="scenario-card flex-1 border-orange-500/20 bg-[#0c1322]">
          <CardContent className="p-6">
            <div className="mb-4 text-3xl">🚗</div>
            <h3 className="mb-2 text-lg font-semibold text-white">Buy a Car</h3>
            <p className="mb-4 text-sm text-slate-500">
              COE, depreciation, insurance, maintenance...
            </p>
            <div className="text-2xl font-bold text-orange-400">-$150,000</div>
            <p className="text-xs text-slate-600">over 10 years</p>
          </CardContent>
        </Card>

        <Card className="scenario-card flex-1 border-green-500/20 bg-[#0c1322]">
          <CardContent className="p-6">
            <div className="mb-4 text-3xl">💰</div>
            <h3 className="mb-2 text-lg font-semibold text-white">
              Keep Saving
            </h3>
            <p className="mb-4 text-sm text-slate-500">
              Invest the difference, compound growth...
            </p>
            <div className="text-2xl font-bold text-green-400">+$180,000</div>
            <p className="text-xs text-slate-600">over 10 years</p>
          </CardContent>
        </Card>
      </div>

      <div className="mt-12 text-center">
        <p className="text-sm text-slate-600">Net worth difference</p>
        <p className="text-3xl font-bold text-white">$330,000</p>
      </div>
    </div>
  )
}

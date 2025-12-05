'use client'

import { useEffect, useRef } from 'react'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { Card, CardContent } from '@/components/ui/card'

gsap.registerPlugin(ScrollTrigger)

export function SingaporePanel() {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      container.querySelectorAll('.sg-card').forEach((el) => el.classList.remove('opacity-0'))
      return
    }

    const cards = container.querySelectorAll('.sg-card')

    gsap.set(cards, { opacity: 0, y: 30 })

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
      stagger: 0.15,
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
        In Singapore, the stakes are high
      </h2>
      <p className="mb-16 max-w-lg text-center text-slate-500">
        COE, BTO, CPF — unique policies that can swing your net worth by
        hundreds of thousands.
      </p>

      <div className="grid w-full max-w-4xl gap-6 md:grid-cols-2">
        {/* Housing */}
        <Card className="sg-card border-white/5 bg-[#0c1322]">
          <CardContent className="p-6">
            <h3 className="mb-4 text-lg font-semibold text-white">
              Housing Decision
            </h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between rounded-lg bg-green-500/10 p-3">
                <span className="text-sm text-slate-300">🏗️ BTO Route</span>
                <span className="font-semibold text-green-400">Save $200K</span>
              </div>
              <div className="flex items-center justify-between rounded-lg bg-orange-500/10 p-3">
                <span className="text-sm text-slate-300">🏠 Resale HDB</span>
                <span className="font-semibold text-orange-400">
                  Pay $200K more
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* COE */}
        <Card className="sg-card border-white/5 bg-[#0c1322]">
          <CardContent className="p-6">
            <h3 className="mb-4 text-lg font-semibold text-white">COE Timing</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between rounded-lg bg-green-500/10 p-3">
                <span className="text-sm text-slate-300">🚗 COE at $50K</span>
                <span className="font-semibold text-green-400">Total $120K</span>
              </div>
              <div className="flex items-center justify-between rounded-lg bg-red-500/10 p-3">
                <span className="text-sm text-slate-300">🚗 COE at $100K</span>
                <span className="font-semibold text-red-400">Total $170K</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* CPF */}
      <Card className="sg-card mt-8 w-full max-w-2xl border-white/5 bg-[#0c1322]">
        <CardContent className="p-6 text-center">
          <h3 className="mb-2 text-lg font-semibold text-white">
            CPF Strategy at 55
          </h3>
          <div className="mt-4 flex justify-center gap-12">
            <div>
              <p className="text-sm text-slate-500">Max OA</p>
              <p className="text-xl font-bold text-blue-400">$800K</p>
            </div>
            <div className="h-12 w-px bg-white/10" />
            <div>
              <p className="text-sm text-slate-500">Max SA</p>
              <p className="text-xl font-bold text-green-400">$1.2M</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

'use client'

import { useEffect, useRef } from 'react'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { Button } from '@/components/ui/button'
import { BarChart3, Target, Bot } from 'lucide-react'
import Link from 'next/link'

gsap.registerPlugin(ScrollTrigger)

const features = [
  {
    icon: BarChart3,
    label: 'Projections',
    description: '20-year forecasts',
  },
  {
    icon: Target,
    label: 'Goals',
    description: 'Track milestones',
  },
  {
    icon: Bot,
    label: 'AI Insights',
    description: 'Smart suggestions',
  },
]

export function CTAPanel() {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      container
        .querySelectorAll('.cta-title, .cta-button, .social-proof, .feature-card')
        .forEach((el) => el.classList.remove('opacity-0'))
      return
    }

    const title = container.querySelector('.cta-title')
    const button = container.querySelector('.cta-button')
    const socialProof = container.querySelector('.social-proof')
    const featureCards = container.querySelectorAll('.feature-card')

    gsap.set([title, button, socialProof], { opacity: 0, y: 30 })
    gsap.set(featureCards, { opacity: 0, y: 20 })

    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: container,
        start: 'top 70%',
        end: 'bottom 30%',
        toggleActions: 'play none none reverse',
      },
    })

    tl.to(title, { opacity: 1, y: 0, duration: 0.6 })
    tl.to(button, { opacity: 1, y: 0, duration: 0.5 }, '-=0.3')
    tl.to(socialProof, { opacity: 1, y: 0, duration: 0.4 }, '-=0.2')
    tl.to(
      featureCards,
      {
        opacity: 1,
        y: 0,
        duration: 0.4,
        stagger: 0.1,
      },
      '-=0.2'
    )

    return () => {
      tl.kill()
    }
  }, [])

  return (
    <div
      ref={containerRef}
      className="landing-panel relative flex min-h-screen flex-col items-center justify-center px-4 py-20"
    >
      <h2 className="cta-title mb-8 text-center text-3xl font-bold text-white opacity-0 md:text-5xl">
        Take control of your financial future
      </h2>

      <Link href="/dashboard" className="cta-button opacity-0">
        <Button size="lg" className="px-8 text-base">
          Start Planning Free
        </Button>
      </Link>

      <p className="social-proof mt-8 text-center text-slate-500 opacity-0">
        Join <span className="text-white">1,000+ Singaporeans</span> mapping
        their financial futures
      </p>

      <div className="mt-16 grid grid-cols-1 gap-6 md:grid-cols-3">
        {features.map((feature) => (
          <div
            key={feature.label}
            className="feature-card flex flex-col items-center rounded-lg border border-white/5 bg-white/[0.02] p-6 text-center opacity-0"
          >
            <feature.icon className="mb-3 h-8 w-8 text-blue-400" />
            <h3 className="mb-1 font-semibold text-white">{feature.label}</h3>
            <p className="text-sm text-slate-500">{feature.description}</p>
          </div>
        ))}
      </div>

      <footer className="mt-20 text-center text-sm text-slate-700">
        <p>&copy; {new Date().getFullYear()} Assetra. Built for Singaporeans.</p>
      </footer>
    </div>
  )
}

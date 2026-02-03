'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { motion } from 'framer-motion'

export function HeroSection() {
  const heroRef = useRef<HTMLDivElement>(null)
  const [scrollY, setScrollY] = useState(0)

  // Parallax scroll effect
  useEffect(() => {
    const handleScroll = () => {
      if (heroRef.current) {
        const rect = heroRef.current.getBoundingClientRect()
        const scrollProgress = Math.max(0, Math.min(1, -rect.top / (rect.height * 0.5)))
        setScrollY(scrollProgress)
      }
    }
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const parallaxStyle = {
    opacity: 1 - scrollY * 0.8,
    transform: `translateY(${scrollY * 100}px) scale(${1 - scrollY * 0.05})`,
  }

  return (
    <section
      ref={heroRef}
      className="relative min-h-screen flex flex-col items-center justify-center px-4 sm:px-6 lg:px-8 pt-20"
    >
      <div
        className="relative z-10 max-w-5xl mx-auto text-center"
        style={parallaxStyle}
      >
        {/* Main Headline */}
        <motion.h1
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl xl:text-8xl font-semibold tracking-[-0.03em] leading-[1.1] mb-6"
        >
          <span className="linear-text-gradient">See every future</span>
          <br />
          <span className="linear-text-accent">before you choose</span>
        </motion.h1>

        {/* Subheadline */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="max-w-2xl mx-auto text-lg sm:text-xl text-[#8A8F98] leading-relaxed mb-10"
        >
          Model life decisions—property, career, family—and watch your net worth
          projection update in real-time. Built for Singapore&apos;s unique financial landscape.
        </motion.p>

        {/* CTAs */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.5 }}
          className="flex flex-col sm:flex-row items-center justify-center gap-4"
        >
          <Link
            href="/dashboard"
            className="linear-button-primary px-8 py-4 text-base font-medium inline-flex items-center gap-3 group"
          >
            Start Planning Free
            <ArrowRight className="w-5 h-5 transition-transform duration-200 group-hover:translate-x-1" />
          </Link>
          <a
            href="#demo"
            className="linear-button-secondary px-8 py-4 text-base font-medium"
          >
            See Demo
          </a>
        </motion.div>

        {/* Social Proof */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.7 }}
          className="mt-8 text-sm text-[#8A8F98]"
        >          
        </motion.p>
      </div>    
    </section>
  )
}

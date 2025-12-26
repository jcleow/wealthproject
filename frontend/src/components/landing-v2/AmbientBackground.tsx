'use client'

import { useEffect, useState } from 'react'

interface AmbientBackgroundProps {
  className?: string
}

export function AmbientBackground({ className = '' }: AmbientBackgroundProps) {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false)

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    setPrefersReducedMotion(mediaQuery.matches)

    const handler = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches)
    mediaQuery.addEventListener('change', handler)
    return () => mediaQuery.removeEventListener('change', handler)
  }, [])

  return (
    <div className={`fixed inset-0 overflow-hidden pointer-events-none ${className}`}>
      {/* Layer 1: Base radial gradient */}
      <div
        className="absolute inset-0"
        style={{
          background: 'radial-gradient(ellipse at top, #0a0a0f 0%, #050506 50%, #020203 100%)',
        }}
      />

      {/* Layer 2: Animated gradient blobs */}
      {!prefersReducedMotion && (
        <>
          {/* Primary blob - top center, blue accent */}
          <div
            className="absolute -top-[200px] left-1/2 -translate-x-1/2 w-[1400px] h-[900px] rounded-full blur-[150px] opacity-25"
            style={{
              background: 'linear-gradient(180deg, #3B82F6 0%, #1D4ED8 100%)',
              animation: 'linear-blob-float 10s ease-in-out infinite',
            }}
          />

          {/* Secondary blob - left side, cyan/blue mix */}
          <div
            className="absolute top-[30%] -left-[200px] w-[800px] h-[600px] rounded-full blur-[120px] opacity-15"
            style={{
              background: 'linear-gradient(135deg, #0EA5E9 0%, #3B82F6 100%)',
              animation: 'linear-blob-float-reverse 8s ease-in-out infinite',
            }}
          />

          {/* Tertiary blob - right side, softened indigo/purple */}
          <div
            className="absolute top-[20%] -right-[250px] w-[600px] h-[400px] rounded-full blur-[150px] opacity-[0.06]"
            style={{
              background: 'linear-gradient(225deg, #818CF8 0%, #6366F1 100%)',
              animation: 'linear-blob-float 12s ease-in-out infinite',
              animationDelay: '-3s',
            }}
          />

          {/* Bottom accent blob - pulsing */}
          <div
            className="absolute bottom-[10%] left-1/2 -translate-x-1/2 w-[1000px] h-[400px] rounded-full blur-[120px]"
            style={{
              background: 'radial-gradient(ellipse at center, #3B82F6 0%, transparent 70%)',
              animation: 'linear-pulse-glow 6s ease-in-out infinite',
            }}
          />
        </>
      )}

      {/* Layer 3: Static fallback for reduced motion */}
      {prefersReducedMotion && (
        <div
          className="absolute inset-0"
          style={{
            background: 'radial-gradient(ellipse at top, rgba(59, 130, 246, 0.15) 0%, transparent 50%)',
          }}
        />
      )}

      {/* Layer 4: Subtle vignette for depth */}
      <div
        className="absolute inset-0"
        style={{
          background: 'radial-gradient(ellipse at center, transparent 0%, rgba(2, 2, 3, 0.4) 100%)',
        }}
      />
    </div>
  )
}

'use client'

import { useEffect, useRef, useCallback } from 'react'

interface FlowFieldProps {
  scrollProgress?: number // 0 to 1, controls chaos → clarity transition
  className?: string
}

// Perlin noise implementation
class PerlinNoise {
  private permutation: number[]

  constructor() {
    const p = Array.from({ length: 256 }, (_, i) => i)
    // Shuffle
    for (let i = 255; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[p[i], p[j]] = [p[j], p[i]]
    }
    this.permutation = [...p, ...p]
  }

  private fade(t: number): number {
    return t * t * t * (t * (t * 6 - 15) + 10)
  }

  private lerp(a: number, b: number, t: number): number {
    return a + t * (b - a)
  }

  private grad(hash: number, x: number, y: number, z: number): number {
    const h = hash & 15
    const u = h < 8 ? x : y
    const v = h < 4 ? y : h === 12 || h === 14 ? x : z
    return ((h & 1) === 0 ? u : -u) + ((h & 2) === 0 ? v : -v)
  }

  noise(x: number, y: number, z: number): number {
    const X = Math.floor(x) & 255
    const Y = Math.floor(y) & 255
    const Z = Math.floor(z) & 255

    x -= Math.floor(x)
    y -= Math.floor(y)
    z -= Math.floor(z)

    const u = this.fade(x)
    const v = this.fade(y)
    const w = this.fade(z)

    const p = this.permutation
    const A = p[X] + Y
    const AA = p[A] + Z
    const AB = p[A + 1] + Z
    const B = p[X + 1] + Y
    const BA = p[B] + Z
    const BB = p[B + 1] + Z

    return this.lerp(
      this.lerp(
        this.lerp(this.grad(p[AA], x, y, z), this.grad(p[BA], x - 1, y, z), u),
        this.lerp(this.grad(p[AB], x, y - 1, z), this.grad(p[BB], x - 1, y - 1, z), u),
        v
      ),
      this.lerp(
        this.lerp(this.grad(p[AA + 1], x, y, z - 1), this.grad(p[BA + 1], x - 1, y, z - 1), u),
        this.lerp(this.grad(p[AB + 1], x, y - 1, z - 1), this.grad(p[BB + 1], x - 1, y - 1, z - 1), u),
        v
      ),
      w
    )
  }
}

interface Particle {
  x: number
  y: number
  vx: number
  vy: number
  size: number
  hue: number
  baseHue: number
  trail: { x: number; y: number }[]
}

export function FlowField({ scrollProgress = 0, className = '' }: FlowFieldProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const particlesRef = useRef<Particle[]>([])
  const noiseRef = useRef<PerlinNoise | null>(null)
  const frameRef = useRef(0)
  const animationRef = useRef<number>()
  const scrollProgressRef = useRef(scrollProgress)

  // Update scroll progress ref
  useEffect(() => {
    scrollProgressRef.current = scrollProgress
  }, [scrollProgress])

  const initParticles = useCallback((width: number, height: number) => {
    const chaosPaletteHues = [219, 259, 238] // #3b82f6, #8b5cf6, #6366f1
    const baseCount = width < 768 ? 420 : 800
    const numParticles = Math.min(800, baseCount)
    const particles: Particle[] = []

    for (let i = 0; i < numParticles; i++) {
      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: 0,
        vy: 0,
        size: Math.random() * 2 + 1,
        baseHue: chaosPaletteHues[i % chaosPaletteHues.length],
        hue: chaosPaletteHues[i % chaosPaletteHues.length],
        trail: [],
      })
    }

    particlesRef.current = particles
  }, [])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d', { alpha: true })
    if (!ctx) return

    noiseRef.current = new PerlinNoise()

    const resize = () => {
      const dpr = window.devicePixelRatio || 1
      const rect = canvas.getBoundingClientRect()
      canvas.width = rect.width * dpr
      canvas.height = rect.height * dpr
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      canvas.style.width = `${rect.width}px`
      canvas.style.height = `${rect.height}px`
      initParticles(rect.width, rect.height)
    }

    resize()
    window.addEventListener('resize', resize)

    ctx.globalCompositeOperation = 'lighter'

    const noiseScale = 0.003
    const maxSpeed = 2.5
    const forceMultiplier = 0.12
    const clarityHue = 142 // #22c55e

    const animate = () => {
      const rect = canvas.getBoundingClientRect()
      const width = rect.width
      const height = rect.height
      const progress = scrollProgressRef.current
      const easedProgress = Math.min(1, Math.pow(progress, 1.1))
      const noise = noiseRef.current!

      // Fade effect - darker for more visible trails
      ctx.fillStyle = 'rgba(5, 9, 20, 0.08)'
      ctx.fillRect(0, 0, width, height)

      frameRef.current += 0.002

      // Calculate convergence point (center-bottom as we approach clarity)
      const convergenceX = width / 2
      const convergenceY = height * 0.7
      const convergenceStrength = easedProgress * 0.035 // Increases as we scroll

      // Color transition: cosmic blues/purples → green
      const hueTransitionSpeed = 0.03

      particlesRef.current.forEach((particle) => {
        // Multi-octave Perlin noise for flow field
        const angle1 = noise.noise(
          particle.x * noiseScale,
          particle.y * noiseScale,
          frameRef.current
        ) * Math.PI * 4

        const angle2 = noise.noise(
          particle.x * noiseScale * 2,
          particle.y * noiseScale * 2,
          frameRef.current * 1.5
        ) * Math.PI * 2

        // Blend noise layers - more chaotic at start, smoother at end
        const noiseBlend = 1 - easedProgress * 0.5
        const angle = angle1 + angle2 * 0.5 * noiseBlend

        // Calculate force from noise
        let fx = Math.cos(angle) * forceMultiplier
        let fy = Math.sin(angle) * forceMultiplier

        // Add convergence force toward center as progress increases
        if (easedProgress > 0.25) {
          const dx = convergenceX - particle.x
          const dy = convergenceY - particle.y
          const dist = Math.sqrt(dx * dx + dy * dy)
          if (dist > 0) {
            fx += (dx / dist) * convergenceStrength
            fy += (dy / dist) * convergenceStrength
          }
        }

        // Apply forces
        particle.vx += fx
        particle.vy += fy

        // Damping - increases with progress for smoother flow
        const damping = 0.96 - progress * 0.02
        particle.vx *= damping
        particle.vy *= damping

        // Limit speed - decreases with progress
        const currentMaxSpeed = maxSpeed * (1 - easedProgress * 0.35)
        const speed = Math.sqrt(particle.vx * particle.vx + particle.vy * particle.vy)
        if (speed > currentMaxSpeed) {
          particle.vx = (particle.vx / speed) * currentMaxSpeed
          particle.vy = (particle.vy / speed) * currentMaxSpeed
        }

        // Update position
        particle.x += particle.vx
        particle.y += particle.vy

        // Store trail
        particle.trail.push({ x: particle.x, y: particle.y })
        const maxTrailLength = Math.floor(18 + easedProgress * 18) // Longer trails as we gain clarity
        if (particle.trail.length > maxTrailLength) {
          particle.trail.shift()
        }

        // Wrap edges
        if (particle.x < 0) particle.x = width
        if (particle.x > width) particle.x = 0
        if (particle.y < 0) particle.y = height
        if (particle.y > height) particle.y = 0

        // Transition hue toward target
        const targetHue = particle.baseHue + (clarityHue - particle.baseHue) * easedProgress
        const hueDiff = targetHue - particle.hue
        particle.hue += hueDiff * hueTransitionSpeed

        // Draw particle trail
        if (particle.trail.length > 1) {
          ctx.beginPath()
          ctx.moveTo(particle.trail[0].x, particle.trail[0].y)

          for (let i = 1; i < particle.trail.length; i++) {
            ctx.lineTo(particle.trail[i].x, particle.trail[i].y)
          }

          // Alpha based on progress - more visible as we approach clarity
          const alpha = 0.28 + easedProgress * 0.45
          const saturation = 78 - easedProgress * 18 // Less saturated green
          const lightness = 52 + easedProgress * 14 // Brighter green

          ctx.strokeStyle = `hsla(${particle.hue}, ${saturation}%, ${lightness}%, ${alpha})`
          ctx.lineWidth = particle.size * (0.8 + easedProgress * 0.6)
          ctx.lineCap = 'round'
          ctx.lineJoin = 'round'
          ctx.stroke()
        }
      })

      animationRef.current = requestAnimationFrame(animate)
    }

    animate()

    return () => {
      window.removeEventListener('resize', resize)
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [initParticles])

  return (
    <canvas
      ref={canvasRef}
      className={`pointer-events-none absolute inset-0 ${className}`}
      style={{ mixBlendMode: 'screen' }}
    />
  )
}

'use client'

import { AmbientBackground } from './AmbientBackground'
import { Navigation } from './Navigation'
import { HeroSection } from './HeroSection'
import { FeaturesBento } from './FeaturesBento'
import { SingaporeSection } from './SingaporeSection'
import { DemoSection } from './DemoSection'
import { PricingSection } from './PricingSection'
import { CTASection } from './CTASection'

export function LandingPage() {
  return (
    <div className="linear-landing linear-noise linear-grid relative min-h-screen overflow-x-hidden bg-[#050506]">
      {/* Ambient Background with animated blobs */}
      <AmbientBackground />

      {/* Navigation */}
      <Navigation />

      {/* Main Content */}
      <main className="relative z-10">
        <HeroSection />
        <FeaturesBento />
        <SingaporeSection />
        <DemoSection />
        <PricingSection />
        <CTASection />
      </main>
    </div>
  )
}

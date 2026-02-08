'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Shield, X } from 'lucide-react'
import clsx from 'clsx'
import {
  InsuranceTabs,
  type InsuranceTabId,
} from '@/components/insurance/InsuranceTabs'
import { PoliciesTab } from '@/components/insurance/tabs/PoliciesTab'
import { GuidelinesTab } from '@/components/insurance/tabs/GuidelinesTab'
import { JourneyTab } from '@/components/insurance/tabs/JourneyTab'
import { MyCoverageTab } from '@/components/insurance/tabs/MyCoverageTab'
import { useColorScheme } from '@/stores'

// ============================================================================
// THEME-AWARE DESIGN SYSTEM
// Supports both dark mode and Monet (impressionist) mode
// ============================================================================

const monetColors = {
  // Backgrounds - warm cream to pale blue like his canvases
  bgCream: '#FAF8F5',
  bgPaleBlue: '#F0F4F8',
  bgWarmWhite: '#FFFEF9',

  // Primary - Wisteria/Lavender (from his garden paintings)
  lavender: '#9B8BB4',
  lavenderLight: '#C4B8D9',
  lavenderDark: '#7A6B94',

  // Accent - Coral Rose (water lily pinks)
  coralRose: '#E8A898',
  coralRoseLight: '#F5D4CC',
  coralRoseDark: '#D4847A',

  // Success - Sage Green (lily pads, gardens)
  sage: '#7FB285',
  sageLight: '#B5D4B8',
  sageDark: '#5A8A5E',

  // Gold - Sunlight on water
  sunlightGold: '#D4C5A9',
  sunlightGoldLight: '#EDE6D8',
  sunlightGoldDark: '#B8A87D',

  // Text
  textPrimary: '#3D3D3D',
  textSecondary: '#6B6B6B',
  textMuted: '#9B9B9B',

  // Soft shadows
  shadowSoft: 'rgba(155, 139, 180, 0.12)',
  shadowMedium: 'rgba(155, 139, 180, 0.18)',
}

const darkColors = {
  // Backgrounds
  bgPrimary: '#0a0a0a',
  bgSecondary: '#111111',
  bgTertiary: '#1a1a1a',

  // Primary - Purple accent
  primary: '#a78bfa',
  primaryLight: '#c4b5fd',
  primaryDark: '#7c3aed',

  // Accent - Coral/Rose
  accent: '#fb7185',
  accentLight: '#fda4af',
  accentDark: '#e11d48',

  // Success - Emerald
  success: '#34d399',
  successLight: '#6ee7b7',
  successDark: '#059669',

  // Gold
  gold: '#fbbf24',
  goldLight: '#fcd34d',
  goldDark: '#d97706',

  // Text
  textPrimary: '#f1f5f9',
  textSecondary: '#94a3b8',
  textMuted: '#64748b',

  // Shadows
  shadowSoft: 'rgba(0, 0, 0, 0.3)',
  shadowMedium: 'rgba(0, 0, 0, 0.5)',
}

// Painterly noise texture overlay (subtle canvas effect)
const canvasTexture = `url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`

// Embedded view component for use within Dashboard
export function InsurancePlannerView({ onClose }: { onClose?: () => void }) {
  const [activeTab, setActiveTab] = useState<InsuranceTabId>('overview')
  const colorScheme = useColorScheme()
  const isMonet = colorScheme === 'monet'
  const colors = isMonet ? monetColors : darkColors

  const handleNavigateToPolicy = () => {
    setActiveTab('policies')
  }

  return (
    <div
      className={clsx(
        'flex h-full flex-col overflow-hidden relative transition-colors duration-300',
        !isMonet && 'bg-[#0a0a0a]'
      )}
      style={isMonet ? {
        background: `linear-gradient(135deg, ${monetColors.bgCream} 0%, ${monetColors.bgPaleBlue} 50%, ${monetColors.bgWarmWhite} 100%)`,
      } : undefined}
    >
      {/* Canvas/noise texture overlay */}
      <div
        className={clsx(
          'absolute inset-0 pointer-events-none',
          isMonet ? 'opacity-[0.03] mix-blend-multiply' : 'opacity-[0.02]'
        )}
        style={{ backgroundImage: canvasTexture }}
      />

      {/* Ambient light effects */}
      <div
        className="absolute -top-32 -left-32 w-96 h-96 rounded-full pointer-events-none"
        style={{
          background: isMonet
            ? `radial-gradient(circle, ${monetColors.sunlightGoldLight} 0%, transparent 70%)`
            : `radial-gradient(circle, ${darkColors.primary}20 0%, transparent 70%)`,
          filter: 'blur(60px)',
          opacity: isMonet ? 0.6 : 0.4,
        }}
      />

      {/* Header */}
      <header className="shrink-0 relative z-10">
        <div
          className="px-6 py-5 backdrop-blur-sm"
          style={{
            background: isMonet
              ? `linear-gradient(to bottom, rgba(255,255,255,0.8), rgba(255,255,255,0.4))`
              : `linear-gradient(to bottom, rgba(17,17,17,0.9), rgba(17,17,17,0.7))`,
            borderBottom: isMonet
              ? `1px solid rgba(155, 139, 180, 0.15)`
              : `1px solid rgba(255, 255, 255, 0.06)`,
          }}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div
                className="flex h-12 w-12 items-center justify-center rounded-2xl relative overflow-hidden"
                style={{
                  background: isMonet
                    ? `linear-gradient(145deg, ${monetColors.lavender}, ${monetColors.lavenderDark})`
                    : `linear-gradient(145deg, ${darkColors.primary}, ${darkColors.primaryDark})`,
                  boxShadow: isMonet
                    ? `0 8px 32px ${monetColors.shadowMedium}, inset 0 1px 0 rgba(255,255,255,0.3)`
                    : `0 8px 32px ${darkColors.shadowMedium}, inset 0 1px 0 rgba(255,255,255,0.1)`,
                }}
              >
                <Shield className="h-6 w-6 text-white drop-shadow-sm" />
              </div>
              <div>
                <h1
                  className="text-xl font-semibold tracking-tight"
                  style={{
                    color: colors.textPrimary,
                    fontFamily: isMonet ? "'Cormorant Garamond', Georgia, serif" : 'inherit',
                  }}
                >
                  Insurance Planner
                </h1>
                <p
                  className="text-sm mt-0.5"
                  style={{ color: colors.textSecondary }}
                >
                  Analyze scenarios and explore coverage options
                </p>
              </div>
            </div>
            {onClose && (
              <button
                type="button"
                onClick={onClose}
                className="flex h-10 w-10 items-center justify-center rounded-xl transition-all duration-300 hover:scale-105"
                style={{
                  background: isMonet ? 'rgba(255,255,255,0.6)' : 'rgba(255,255,255,0.05)',
                  color: colors.textSecondary,
                  boxShadow: `0 2px 8px ${colors.shadowSoft}`,
                }}
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Tab Navigation */}
      <InsuranceTabs activeTab={activeTab} onTabChange={setActiveTab} />

      {/* Main Content - scrollable */}
      <main className="flex-1 overflow-y-auto relative z-10">
        {activeTab === 'overview' && <GuidelinesTab onNavigateToPolicy={handleNavigateToPolicy} />}
        {activeTab === 'journey' && <JourneyTab />}
        {activeTab === 'policies' && <PoliciesTab />}
      </main>
    </div>
  )
}

// Standalone page for direct navigation
export default function InsurancePlannerPage() {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<InsuranceTabId>('overview')
  const colorScheme = useColorScheme()
  const isMonet = colorScheme === 'monet'
  const colors = isMonet ? monetColors : darkColors

  const handleClose = () => {
    router.push('/dashboard')
  }

  const handleNavigateToPolicy = () => {
    setActiveTab('policies')
  }

  return (
    <div
      className={clsx(
        'flex h-screen flex-col overflow-hidden relative transition-colors duration-300',
        !isMonet && 'bg-[#050505]'
      )}
      style={isMonet ? {
        background: `linear-gradient(135deg, ${monetColors.bgCream} 0%, ${monetColors.bgPaleBlue} 50%, ${monetColors.bgWarmWhite} 100%)`,
      } : undefined}
    >
      {/* Canvas/noise texture overlay */}
      <div
        className={clsx(
          'absolute inset-0 pointer-events-none',
          isMonet ? 'opacity-[0.03] mix-blend-multiply' : 'opacity-[0.02]'
        )}
        style={{ backgroundImage: canvasTexture }}
      />

      {/* Atmospheric light effects */}
      <div
        className="absolute -top-40 -left-40 w-[500px] h-[500px] rounded-full pointer-events-none"
        style={{
          background: isMonet
            ? `radial-gradient(circle, ${monetColors.sunlightGoldLight} 0%, transparent 70%)`
            : `radial-gradient(circle, ${darkColors.primary}15 0%, transparent 70%)`,
          filter: 'blur(80px)',
          opacity: isMonet ? 0.5 : 0.4,
        }}
      />
      <div
        className="absolute top-1/3 -right-32 w-80 h-80 rounded-full pointer-events-none"
        style={{
          background: isMonet
            ? `radial-gradient(circle, ${monetColors.coralRoseLight} 0%, transparent 70%)`
            : `radial-gradient(circle, ${darkColors.accent}10 0%, transparent 70%)`,
          filter: 'blur(60px)',
          opacity: isMonet ? 0.3 : 0.3,
        }}
      />
      <div
        className="absolute bottom-0 left-1/4 w-96 h-64 rounded-full pointer-events-none"
        style={{
          background: isMonet
            ? `radial-gradient(circle, ${monetColors.sageLight} 0%, transparent 70%)`
            : `radial-gradient(circle, ${darkColors.success}10 0%, transparent 70%)`,
          filter: 'blur(70px)',
          opacity: 0.25,
        }}
      />

      {/* Header */}
      <header className="shrink-0 relative z-10">
        <div
          className="mx-auto max-w-7xl px-8 py-6 backdrop-blur-sm"
          style={{
            background: isMonet
              ? `linear-gradient(to bottom, rgba(255,255,255,0.85), rgba(255,255,255,0.5))`
              : `linear-gradient(to bottom, rgba(10,10,10,0.9), rgba(10,10,10,0.7))`,
            borderBottom: isMonet
              ? `1px solid rgba(155, 139, 180, 0.12)`
              : `1px solid rgba(255, 255, 255, 0.06)`,
          }}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-5">
              <div
                className="flex h-14 w-14 items-center justify-center rounded-2xl relative overflow-hidden transform hover:scale-105 transition-transform duration-500"
                style={{
                  background: isMonet
                    ? `linear-gradient(145deg, ${monetColors.lavender}, ${monetColors.lavenderDark})`
                    : `linear-gradient(145deg, ${darkColors.primary}, ${darkColors.primaryDark})`,
                  boxShadow: isMonet
                    ? `0 12px 40px ${monetColors.shadowMedium}, 0 4px 12px rgba(155, 139, 180, 0.2), inset 0 1px 0 rgba(255,255,255,0.35)`
                    : `0 12px 40px ${darkColors.shadowMedium}, inset 0 1px 0 rgba(255,255,255,0.1)`,
                }}
              >
                <Shield className="h-7 w-7 text-white drop-shadow-sm" />
              </div>

              <div>
                <h1
                  className="text-2xl font-semibold tracking-tight"
                  style={{
                    color: colors.textPrimary,
                    fontFamily: isMonet ? "'Cormorant Garamond', Georgia, serif" : 'inherit',
                    letterSpacing: '-0.01em',
                  }}
                >
                  Insurance Planner
                </h1>
                <p
                  className="text-sm mt-1"
                  style={{
                    color: colors.textSecondary,
                    fontFamily: isMonet ? "'DM Sans', system-ui, sans-serif" : 'inherit',
                  }}
                >
                  Analyze scenarios and explore coverage options
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleClose}
              className="flex h-11 w-11 items-center justify-center rounded-xl transition-all duration-300 hover:scale-105 group"
              style={{
                background: isMonet ? 'rgba(255,255,255,0.7)' : 'rgba(255,255,255,0.05)',
                color: colors.textSecondary,
                boxShadow: `0 4px 16px ${colors.shadowSoft}`,
                backdropFilter: 'blur(8px)',
              }}
              title="Return to Dashboard"
            >
              <X className="h-5 w-5 group-hover:rotate-90 transition-transform duration-300" />
            </button>
          </div>
        </div>
      </header>

      {/* Tab Navigation */}
      <InsuranceTabs activeTab={activeTab} onTabChange={setActiveTab} />

      {/* Main Content - scrollable */}
      <main className="flex-1 overflow-y-auto relative z-10">
        <div className="mx-auto max-w-7xl">
          {activeTab === 'overview' && <GuidelinesTab onNavigateToPolicy={handleNavigateToPolicy} />}
          {activeTab === 'journey' && <JourneyTab />}
          {activeTab === 'policies' && <PoliciesTab />}
        </div>
      </main>
    </div>
  )
}

// Export colors for use in child components
export { monetColors, darkColors, canvasTexture }

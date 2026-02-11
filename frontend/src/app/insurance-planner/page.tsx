'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, RotateCcw, X } from 'lucide-react'
import clsx from 'clsx'
import {
  InsuranceTabs,
  type InsuranceTabId,
} from '@/components/insurance/InsuranceTabs'
import { PoliciesTab } from '@/components/insurance/tabs/PoliciesTab'
import { JourneyTab } from '@/components/insurance/tabs/JourneyTab'
import { MyCoverageTab } from '@/components/insurance/tabs/MyCoverageTab'
import { GuidelinesTab } from '@/components/insurance/tabs/GuidelinesTab'
import { Modal } from '@/components/ui/Modal'
import { useColorScheme } from '@/stores'
import { useCoverageGuidelinesStore } from '@/stores/coverageGuidelinesStore'

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
  const [addPolicyTrigger, setAddPolicyTrigger] = useState(0)
  const [editPolicyRecord, setEditPolicyRecord] = useState<import('@/api/financial/insurance').InsurancePolicyRecord | null>(null)
  const [isGuidelinesModalOpen, setIsGuidelinesModalOpen] = useState(false)
  const colorScheme = useColorScheme()
  const isMonet = colorScheme === 'monet'
  const colors = isMonet ? monetColors : darkColors

  const resetToDefaults = useCoverageGuidelinesStore((s) => s.resetToDefaults)

  const handleNavigateToPolicy = () => {
    setActiveTab('policies')
  }

  const handleAddPolicy = () => {
    setActiveTab('policies')
    setAddPolicyTrigger((prev) => prev + 1)
  }

  const handleEditPolicy = (policy: import('@/api/financial/insurance').InsurancePolicyRecord) => {
    setEditPolicyRecord(policy)
    setActiveTab('policies')
  }

  const handleResetTargets = () => {
    resetToDefaults()
    setActiveTab('overview')
    setIsGuidelinesModalOpen(true)
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

      {/* Title Section: title row + underline tabs */}
      <div className="shrink-0 relative z-10 px-8 pt-6">
        {/* Title Row */}
        <div className="flex items-center justify-between mb-5">
          <h1
            className="text-2xl font-semibold tracking-tight"
            style={{
              color: colors.textPrimary,
              fontFamily: isMonet ? "'Cormorant Garamond', Georgia, serif" : 'inherit',
            }}
          >
            Insurance Planner
          </h1>
          <div className="flex items-center gap-3">
            {/* Action button slot — grid overlay keeps width stable across tabs */}
            <div className="grid">
              <button
                type="button"
                onClick={handleResetTargets}
                className={clsx(
                  'col-start-1 row-start-1 flex items-center gap-2 rounded-sm px-[18px] py-[10px] text-[13px] font-medium transition-all duration-200 hover:brightness-110',
                  activeTab !== 'overview' && 'invisible'
                )}
                style={{
                  color: isMonet ? '#6B7280' : '#A1A1AA',
                  border: `1px solid ${isMonet ? '#E8E6E1' : '#2D2D33'}`,
                }}
                tabIndex={activeTab === 'overview' ? 0 : -1}
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Reset Targets
              </button>
              <button
                type="button"
                onClick={handleAddPolicy}
                className={clsx(
                  'col-start-1 row-start-1 flex items-center gap-2 rounded-sm px-[18px] py-[10px] text-[13px] font-medium text-white transition-all duration-200 hover:brightness-110',
                  activeTab !== 'policies' && 'invisible'
                )}
                style={{ background: '#C53D43' }}
                tabIndex={activeTab === 'policies' ? 0 : -1}
              >
                <Plus className="h-3.5 w-3.5" />
                Add Policy
              </button>
            </div>
            {onClose && (
              <button
                type="button"
                onClick={onClose}
                className="flex h-9 w-9 items-center justify-center rounded-lg transition-all duration-200 hover:scale-105"
                style={{
                  background: isMonet ? 'rgba(255,255,255,0.6)' : 'rgba(255,255,255,0.05)',
                  color: colors.textSecondary,
                }}
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>

        {/* Tab Navigation */}
        <InsuranceTabs activeTab={activeTab} onTabChange={setActiveTab} />
      </div>

      {/* Main Content - scrollable */}
      <main className="flex-1 overflow-y-auto relative z-10">
        {activeTab === 'overview' && <MyCoverageTab onNavigateToPolicy={handleNavigateToPolicy} onEditTargets={() => setIsGuidelinesModalOpen(true)} onEditPolicy={handleEditPolicy} />}
        {activeTab === 'journey' && <JourneyTab />}
        {activeTab === 'policies' && <PoliciesTab addPolicyTrigger={addPolicyTrigger} editPolicyRecord={editPolicyRecord} onEditPolicyConsumed={() => setEditPolicyRecord(null)} />}
      </main>

      {/* Guidelines Modal */}
      <Modal
        isOpen={isGuidelinesModalOpen}
        onClose={() => setIsGuidelinesModalOpen(false)}
        overlayClassName="bg-black/60 backdrop-blur-sm"
        className="w-full max-w-3xl max-h-[85vh] overflow-y-auto rounded-lg"
      >
        <div
          className="rounded-lg"
          style={{ background: isMonet ? monetColors.bgCream : '#111113', border: `1px solid ${isMonet ? 'rgba(155, 139, 180, 0.15)' : '#2D2D33'}` }}
        >
          <GuidelinesTab onClose={() => setIsGuidelinesModalOpen(false)} />
        </div>
      </Modal>
    </div>
  )
}

// Standalone page for direct navigation
export default function InsurancePlannerPage() {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<InsuranceTabId>('overview')
  const [addPolicyTrigger, setAddPolicyTrigger] = useState(0)
  const [editPolicyRecord, setEditPolicyRecord] = useState<import('@/api/financial/insurance').InsurancePolicyRecord | null>(null)
  const [isGuidelinesModalOpen, setIsGuidelinesModalOpen] = useState(false)
  const colorScheme = useColorScheme()
  const isMonet = colorScheme === 'monet'
  const colors = isMonet ? monetColors : darkColors

  const resetToDefaults = useCoverageGuidelinesStore((s) => s.resetToDefaults)

  const handleClose = () => {
    router.push('/dashboard')
  }

  const handleNavigateToPolicy = () => {
    setActiveTab('policies')
  }

  const handleAddPolicy = () => {
    setActiveTab('policies')
    setAddPolicyTrigger((prev) => prev + 1)
  }

  const handleEditPolicy = (policy: import('@/api/financial/insurance').InsurancePolicyRecord) => {
    setEditPolicyRecord(policy)
    setActiveTab('policies')
  }

  const handleResetTargets = () => {
    resetToDefaults()
    setActiveTab('overview')
    setIsGuidelinesModalOpen(true)
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

      {/* Title Section: title row + underline tabs */}
      <div className="shrink-0 relative z-10 mx-auto max-w-7xl px-8 pt-6">
        {/* Title Row */}
        <div className="flex items-center justify-between mb-5">
          <h1
            className="text-2xl font-semibold tracking-tight"
            style={{
              color: colors.textPrimary,
              fontFamily: isMonet ? "'Cormorant Garamond', Georgia, serif" : 'inherit',
            }}
          >
            Insurance Planner
          </h1>
          <div className="flex items-center gap-3">
            {/* Action button slot — grid overlay keeps width stable across tabs */}
            <div className="grid">
              <button
                type="button"
                onClick={handleResetTargets}
                className={clsx(
                  'col-start-1 row-start-1 flex items-center gap-2 rounded-sm px-[18px] py-[10px] text-[13px] font-medium transition-all duration-200 hover:brightness-110',
                  activeTab !== 'overview' && 'invisible'
                )}
                style={{
                  color: isMonet ? '#6B7280' : '#A1A1AA',
                  border: `1px solid ${isMonet ? '#E8E6E1' : '#2D2D33'}`,
                }}
                tabIndex={activeTab === 'overview' ? 0 : -1}
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Reset Targets
              </button>
              <button
                type="button"
                onClick={handleAddPolicy}
                className={clsx(
                  'col-start-1 row-start-1 flex items-center gap-2 rounded-sm px-[18px] py-[10px] text-[13px] font-medium text-white transition-all duration-200 hover:brightness-110',
                  activeTab !== 'policies' && 'invisible'
                )}
                style={{ background: '#C53D43' }}
                tabIndex={activeTab === 'policies' ? 0 : -1}
              >
                <Plus className="h-3.5 w-3.5" />
                Add Policy
              </button>
            </div>
            <button
              type="button"
              onClick={handleClose}
              className="flex h-9 w-9 items-center justify-center rounded-lg transition-all duration-200 hover:scale-105"
              style={{
                background: isMonet ? 'rgba(255,255,255,0.6)' : 'rgba(255,255,255,0.05)',
                color: colors.textSecondary,
              }}
              title="Return to Dashboard"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <InsuranceTabs activeTab={activeTab} onTabChange={setActiveTab} />
      </div>

      {/* Main Content - scrollable */}
      <main className="flex-1 overflow-y-auto relative z-10">
        <div className="mx-auto max-w-7xl">
          {activeTab === 'overview' && <MyCoverageTab onNavigateToPolicy={handleNavigateToPolicy} onEditTargets={() => setIsGuidelinesModalOpen(true)} onEditPolicy={handleEditPolicy} />}
          {activeTab === 'journey' && <JourneyTab />}
          {activeTab === 'policies' && <PoliciesTab addPolicyTrigger={addPolicyTrigger} editPolicyRecord={editPolicyRecord} />}
        </div>
      </main>

      {/* Guidelines Modal */}
      <Modal
        isOpen={isGuidelinesModalOpen}
        onClose={() => setIsGuidelinesModalOpen(false)}
        overlayClassName="bg-black/60 backdrop-blur-sm"
        className="w-full max-w-3xl max-h-[85vh] overflow-y-auto rounded-lg"
      >
        <div
          className="rounded-lg"
          style={{ background: isMonet ? monetColors.bgCream : '#111113', border: `1px solid ${isMonet ? 'rgba(155, 139, 180, 0.15)' : '#2D2D33'}` }}
        >
          <GuidelinesTab onClose={() => setIsGuidelinesModalOpen(false)} />
        </div>
      </Modal>
    </div>
  )
}

// Export colors for use in child components
export { monetColors, darkColors, canvasTexture }

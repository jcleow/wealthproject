'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { X } from 'lucide-react'
import clsx from 'clsx'

import { VehiclePlannerTabs } from '@/components/vehicle-planner/VehiclePlannerTabs'
import { VehicleFinancingTab } from '@/components/vehicle-planner/tabs/VehicleFinancingTab'
import { CostBreakdownTab } from '@/components/vehicle-planner/tabs/CostBreakdownTab'
import { DepreciationTab } from '@/components/vehicle-planner/tabs/DepreciationTab'
import { TotalCostTab } from '@/components/vehicle-planner/tabs/TotalCostTab'
import { ScenariosTab } from '@/components/vehicle-planner/tabs/ScenariosTab'
import { useColorScheme } from '@/stores'
import {
  useVehiclePlannerStore,
  useVehiclePlannerActions,
  useVehicleActiveTab,
  useActiveVehicleScenario,
} from '@/stores/vehiclePlannerStore'

// ============================================================================
// THEME-AWARE DESIGN (reuses insurance planner theme palette)
// ============================================================================

const monetColors = {
  bgCream: '#FAF8F5',
  bgPaleBlue: '#F0F4F8',
  bgWarmWhite: '#FFFEF9',
  textPrimary: '#3D3D3D',
  textSecondary: '#6B6B6B',
  amber: '#D4A574',
  amberLight: '#E8D4BC',
  sunlightGoldLight: '#EDE6D8',
}

const darkColors = {
  textPrimary: '#f1f5f9',
  textSecondary: '#94a3b8',
  primary: '#fbbf24',
  accent: '#f59e0b',
}

const canvasTexture = `url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`

// ─── Embedded view (Dashboard takeover) ──────────────

export function VehiclePlannerView({ onClose }: { onClose?: () => void }) {
  const activeTab = useVehicleActiveTab()
  const activeScenario = useActiveVehicleScenario()
  const scenarios = useVehiclePlannerStore((s) => s.scenarios)
  const { setActiveTab, addScenario } = useVehiclePlannerActions()
  const colorScheme = useColorScheme()
  const isMonet = colorScheme === 'monet'
  const colors = isMonet ? monetColors : darkColors

  // Auto-create first scenario if none exist
  useEffect(() => {
    if (scenarios.length === 0) {
      addScenario('My Vehicle')
    }
  }, [scenarios.length, addScenario])

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
      {/* Canvas texture overlay */}
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
            ? `radial-gradient(circle, ${monetColors.amberLight} 0%, transparent 70%)`
            : `radial-gradient(circle, ${darkColors.primary}20 0%, transparent 70%)`,
          filter: 'blur(60px)',
          opacity: isMonet ? 0.6 : 0.4,
        }}
      />

      {/* Title + Tabs */}
      <div className="shrink-0 relative z-10 px-8 pt-6">
        <div className="flex items-center justify-between mb-5">
          <h1
            className="text-2xl font-semibold tracking-tight"
            style={{
              color: colors.textPrimary,
              fontFamily: isMonet ? "'Cormorant Garamond', Georgia, serif" : 'inherit',
            }}
          >
            Vehicle Planner
          </h1>
          <div className="flex items-center gap-3">
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

        <VehiclePlannerTabs activeTab={activeTab} onTabChange={setActiveTab} />
      </div>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto relative z-10">
        {activeTab === 'vehicle' && <VehicleFinancingTab />}
        {activeTab === 'costs' && <CostBreakdownTab />}
        {activeTab === 'depreciation' && <DepreciationTab />}
        {activeTab === 'tco' && <TotalCostTab />}
        {activeTab === 'scenarios' && <ScenariosTab />}
        {!activeScenario && scenarios.length === 0 && (
          <div className="flex items-center justify-center h-full">
            <p style={{ color: colors.textSecondary }}>Loading...</p>
          </div>
        )}
      </main>
    </div>
  )
}

// ─── Standalone page ─────────────────────────────────

export default function VehiclePlannerPage() {
  const router = useRouter()
  const activeTab = useVehicleActiveTab()
  const activeScenario = useActiveVehicleScenario()
  const scenarios = useVehiclePlannerStore((s) => s.scenarios)
  const { setActiveTab, addScenario } = useVehiclePlannerActions()
  const colorScheme = useColorScheme()
  const isMonet = colorScheme === 'monet'
  const colors = isMonet ? monetColors : darkColors

  const handleClose = () => {
    router.push('/dashboard')
  }

  useEffect(() => {
    if (scenarios.length === 0) {
      addScenario('My Vehicle')
    }
  }, [scenarios.length, addScenario])

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
      {/* Canvas texture overlay */}
      <div
        className={clsx(
          'absolute inset-0 pointer-events-none',
          isMonet ? 'opacity-[0.03] mix-blend-multiply' : 'opacity-[0.02]'
        )}
        style={{ backgroundImage: canvasTexture }}
      />

      {/* Ambient light effects */}
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
            ? `radial-gradient(circle, ${monetColors.amberLight} 0%, transparent 70%)`
            : `radial-gradient(circle, ${darkColors.accent}10 0%, transparent 70%)`,
          filter: 'blur(60px)',
          opacity: isMonet ? 0.3 : 0.3,
        }}
      />

      {/* Title + Tabs */}
      <div className="shrink-0 relative z-10 mx-auto max-w-7xl px-8 pt-6">
        <div className="flex items-center justify-between mb-5">
          <h1
            className="text-2xl font-semibold tracking-tight"
            style={{
              color: colors.textPrimary,
              fontFamily: isMonet ? "'Cormorant Garamond', Georgia, serif" : 'inherit',
            }}
          >
            Vehicle Planner
          </h1>
          <div className="flex items-center gap-3">
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

        <VehiclePlannerTabs activeTab={activeTab} onTabChange={setActiveTab} />
      </div>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto relative z-10">
        <div className="mx-auto max-w-7xl">
          {activeTab === 'vehicle' && <VehicleFinancingTab />}
          {activeTab === 'costs' && <CostBreakdownTab />}
          {activeTab === 'depreciation' && <DepreciationTab />}
          {activeTab === 'tco' && <TotalCostTab />}
          {activeTab === 'scenarios' && <ScenariosTab />}
          {!activeScenario && scenarios.length === 0 && (
            <div className="flex items-center justify-center h-64">
              <p style={{ color: colors.textSecondary }}>Loading...</p>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}

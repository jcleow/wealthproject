'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { X, Plus, Save, Car, ArrowLeft, Trash2 } from 'lucide-react'
import clsx from 'clsx'

import { useColorScheme } from '@/stores'
import {
  useVehiclePlannerStore,
  useActiveVehicleScenario,
  useVehicleScenarios,
  useVehicleActiveTab,
  useVehiclePlannerActions,
} from '@/stores/vehiclePlannerStore'
import { calculateVehicle } from '@/lib/vehicle/calculations'
import { formatCurrency } from '@/lib/format'
import { formatVehicleCategory, formatFuelType } from '@/lib/vehicle/formatting'
import { VehiclePlannerTabs } from '@/components/vehicle-planner/VehiclePlannerTabs'
import { VehicleFinancingTab } from '@/components/vehicle-planner/tabs/VehicleFinancingTab'
import { CostBreakdownTab } from '@/components/vehicle-planner/tabs/CostBreakdownTab'
import { DepreciationTab } from '@/components/vehicle-planner/tabs/DepreciationTab'
import { TotalCostTab } from '@/components/vehicle-planner/tabs/TotalCostTab'
import { ScenariosTab } from '@/components/vehicle-planner/tabs/ScenariosTab'
import { AddVehicleScenarioModal } from '@/components/vehicle-planner/AddVehicleScenarioModal'
import type { VehicleTabId } from '@/types/vehicle'

const TAB_BREADCRUMB_LABELS: Record<VehicleTabId, string> = {
  vehicle: 'VEHICLE & FINANCING',
  costs: 'COST BREAKDOWN',
  depreciation: 'DEPRECIATION',
  tco: 'TOTAL COST OF OWNERSHIP',
  scenarios: 'SCENARIOS',
}

// ─── Vehicle Selection Screen (Landing) ─────────────────

function VehicleSelectionScreen({
  onSelectScenario,
  onAddScenario,
  isMonet,
}: {
  onSelectScenario: (id: string) => void
  onAddScenario: () => void
  isMonet: boolean
}) {
  const scenarios = useVehicleScenarios()
  const ownershipYears = useVehiclePlannerStore((s) => s.ownershipYears)
  const { deleteScenario, toggleIncluded } = useVehiclePlannerActions()

  return (
    <div className={clsx(
      'flex-1 overflow-y-auto',
      isMonet ? 'bg-[#F7F6F3]' : 'bg-[#121214]'
    )}>
      <div className="max-w-3xl mx-auto px-8 py-10">
        {/* Heading */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className={clsx(
              'text-lg font-semibold',
              isMonet ? 'text-[#2D2D2D]' : 'text-[#E8E6E1]'
            )}>
              Your Vehicles
            </h2>
            <p className={clsx(
              'text-sm mt-1',
              isMonet ? 'text-[#9CA3AF]' : 'text-[#6B7280]'
            )}>
              Select a vehicle to analyze or add a new one
            </p>
          </div>
          <button
            type="button"
            onClick={onAddScenario}
            className="flex items-center gap-2 rounded-sm bg-[#C53D43] px-4 py-2.5 text-[13px] font-medium text-white transition-colors hover:bg-[#B33038]"
          >
            <Plus className="h-3.5 w-3.5" />
            Add Vehicle
          </button>
        </div>

        {/* Scenario List */}
        {scenarios.length === 0 ? (
          <div className={clsx(
            'rounded-sm border text-center py-16',
            isMonet ? 'bg-white border-[#E8E6E1]' : 'bg-[#1A1A1D] border-[#2D2D33]'
          )}>
            <Car className={clsx('h-10 w-10 mx-auto mb-3', isMonet ? 'text-[#D1D5DB]' : 'text-[#3F3F46]')} />
            <p className={clsx(
              'text-sm font-medium',
              isMonet ? 'text-[#2D2D2D]' : 'text-[#E8E6E1]'
            )}>
              No vehicles yet
            </p>
            <p className={clsx(
              'text-xs mt-1 mb-4',
              isMonet ? 'text-[#9CA3AF]' : 'text-[#6B7280]'
            )}>
              Add your first vehicle to start comparing ownership costs
            </p>
            <button
              type="button"
              onClick={onAddScenario}
              className="inline-flex items-center gap-1.5 rounded-sm bg-[#C53D43] px-4 py-2 text-xs font-medium text-white transition-colors hover:bg-[#B33038]"
            >
              <Plus className="h-3 w-3" />
              Add Vehicle
            </button>
          </div>
        ) : (
          <div className={clsx(
            'rounded-sm border overflow-hidden',
            isMonet ? 'bg-white border-[#E8E6E1]' : 'bg-[#1A1A1D] border-[#2D2D33]'
          )}>
            {scenarios.map((scenario, index) => {
              const result = calculateVehicle(scenario.inputs, scenario.recurringCosts, ownershipYears)
              return (
                <button
                  key={scenario.id}
                  type="button"
                  onClick={() => onSelectScenario(scenario.id)}
                  className={clsx(
                    'flex items-center gap-4 w-full px-5 py-4 text-left transition-colors',
                    index < scenarios.length - 1 && (isMonet ? 'border-b border-[#E8E6E1]' : 'border-b border-[#2D2D33]'),
                    isMonet ? 'hover:bg-[#F7F6F3]' : 'hover:bg-[#242428]'
                  )}
                >
                  {/* Include toggle */}
                  <div
                    role="checkbox"
                    aria-checked={scenario.isIncluded}
                    onClick={(e) => { e.stopPropagation(); toggleIncluded(scenario.id) }}
                    className={clsx(
                      'shrink-0 flex items-center justify-center rounded-sm h-5 w-5 border transition-colors',
                      scenario.isIncluded
                        ? 'bg-[#22C55E]/15 border-[#22C55E]/30 text-[#22C55E]'
                        : isMonet
                          ? 'border-[#D1D5DB] text-transparent'
                          : 'border-[#3F3F46] text-transparent'
                    )}
                  >
                    {scenario.isIncluded && (
                      <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </div>

                  {/* Icon */}
                  <div className={clsx(
                    'shrink-0 flex items-center justify-center rounded-lg h-9 w-9',
                    isMonet ? 'bg-amber-100 text-amber-600' : 'bg-amber-500/10 text-amber-400'
                  )}>
                    <Car className="h-4 w-4" />
                  </div>

                  {/* Name + details */}
                  <div className="flex-1 min-w-0">
                    <div className={clsx(
                      'text-sm font-medium truncate',
                      isMonet ? 'text-[#2D2D2D]' : 'text-[#E8E6E1]'
                    )}>
                      {scenario.name}
                    </div>
                    <div className={clsx(
                      'text-xs mt-0.5',
                      isMonet ? 'text-[#9CA3AF]' : 'text-[#6B7280]'
                    )}>
                      {formatVehicleCategory(scenario.inputs.vehicleCategory)} · {formatFuelType(scenario.inputs.fuelType)}
                    </div>
                  </div>

                  {/* Cost summary */}
                  <div className="text-right shrink-0">
                    <div className={clsx(
                      'font-mono text-sm font-medium tabular-nums',
                      isMonet ? 'text-[#2D2D2D]' : 'text-[#E8E6E1]'
                    )}>
                      {formatCurrency(result.totalCostOfOwnership.netTotalCost)}
                    </div>
                    <div className={clsx(
                      'font-mono text-xs tabular-nums mt-0.5',
                      isMonet ? 'text-[#9CA3AF]' : 'text-[#6B7280]'
                    )}>
                      {formatCurrency(result.totalCostOfOwnership.costPerMonth)}/mo
                    </div>
                  </div>

                  {/* Delete button */}
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); deleteScenario(scenario.id) }}
                    className={clsx(
                      'shrink-0 p-1.5 rounded transition-colors opacity-0 group-hover:opacity-100',
                      isMonet ? 'text-[#9CA3AF] hover:text-[#C53D43] hover:bg-[#C53D43]/5' : 'text-[#6B7280] hover:text-[#C53D43] hover:bg-[#C53D43]/10'
                    )}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </button>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Embedded View (used inside Dashboard) ──────────────

export function VehiclePlannerView({ onClose }: { onClose?: () => void }) {
  const colorScheme = useColorScheme()
  const isMonet = colorScheme === 'monet'
  const activeScenario = useActiveVehicleScenario()
  const activeTab = useVehicleActiveTab()
  const ownershipYears = useVehiclePlannerStore((s) => s.ownershipYears)
  const { setActiveTab, setActiveScenario } = useVehiclePlannerActions()

  const [showAddModal, setShowAddModal] = useState(false)

  const isInDetailView = activeScenario !== null

  const calculationResult = useMemo(() => {
    if (!activeScenario) return null
    return calculateVehicle(activeScenario.inputs, activeScenario.recurringCosts, ownershipYears)
  }, [activeScenario, ownershipYears])

  const handleSelectScenario = (id: string) => {
    setActiveScenario(id)
    setActiveTab('vehicle')
  }

  const handleBackToList = () => {
    setActiveScenario(null)
  }

  const breadcrumbLabel = isInDetailView
    ? TAB_BREADCRUMB_LABELS[activeTab]
    : 'SELECT VEHICLE'

  return (
    <div className={clsx(
      'flex h-full flex-col overflow-hidden',
      isMonet ? 'bg-white' : 'bg-[#1A1A1D]'
    )}>
      {/* Top Header Bar */}
      <div
        className={clsx(
          'flex items-center justify-between shrink-0',
          isMonet ? 'border-b border-[#E8E6E1]' : 'border-b border-[#2D2D33]'
        )}
        style={{ height: 56, padding: '0 32px' }}
      >
        {/* Left: Logo + Breadcrumb */}
        <div className="flex items-center gap-4">
          {isInDetailView && (
            <button
              type="button"
              onClick={handleBackToList}
              className={clsx(
                'flex items-center justify-center rounded-sm transition-colors -ml-1 mr-1',
                isMonet ? 'text-[#9CA3AF] hover:text-[#2D2D2D]' : 'text-[#6B7280] hover:text-[#E8E6E1]'
              )}
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
          )}
          <div className="flex items-center justify-center rounded bg-[#C53D43]" style={{ width: 28, height: 28 }}>
            <span className="text-white text-sm font-bold" style={{ fontFamily: 'Sora, sans-serif' }}>W</span>
          </div>
          <span className="text-[#9CA3AF] text-[11px] font-normal tracking-wider" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>
            VEHICLE
          </span>
          <span className={clsx('text-xs font-normal', isMonet ? 'text-[#D1D5DB]' : 'text-[#6B7280]')}>
            /
          </span>
          <span
            className={clsx(
              'text-[11px] font-medium tracking-wider',
              isMonet ? 'text-[#2D2D2D]' : 'text-[#E8E6E1]'
            )}
            style={{ fontFamily: "'IBM Plex Mono', monospace" }}
          >
            {breadcrumbLabel}
          </span>
        </div>

        {/* Right: Close Button */}
        <div className="flex items-center gap-3">
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="flex items-center gap-1.5 rounded-sm bg-[#C53D43] px-3.5 py-2 text-white text-xs font-medium transition-colors hover:bg-[#B33038]"
            >
              <X className="h-3.5 w-3.5" />
              Close
            </button>
          )}
        </div>
      </div>

      {isInDetailView ? (
        /* ─── Detail View (Tabs) ─── */
        <>
          {/* Title Section */}
          <div style={{ padding: '24px 32px 0 32px' }} className="shrink-0 space-y-5">
            <div className="flex items-center justify-between">
              <h1 className={clsx('text-2xl font-semibold', isMonet ? 'text-[#2D2D2D]' : 'text-[#E8E6E1]')}>
                Vehicle Planner
              </h1>
              <div className="flex items-center gap-3">
                {isMonet ? (
                  activeScenario && (
                    <div className="flex items-center gap-2 rounded-sm border border-[#E8E6E1] bg-[#F7F6F3] px-4 py-2">
                      <Car className="h-3.5 w-3.5 text-[#6B7280]" />
                      <span className="text-[13px] font-medium text-[#2D2D2D]">{activeScenario.name}</span>
                    </div>
                  )
                ) : (
                  <>
                    <button
                      type="button"
                      className="flex items-center gap-2 rounded-sm border border-[#2D2D33] px-[18px] py-2.5 text-[13px] font-medium text-[#6B7280] transition-colors hover:text-[#9CA3AF]"
                    >
                      <Save className="h-3.5 w-3.5" />
                      Save Scenario
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowAddModal(true)}
                      className="flex items-center gap-2 rounded-sm bg-[#C53D43] px-[18px] py-2.5 text-[13px] font-medium text-white transition-colors hover:bg-[#B33038]"
                    >
                      <Plus className="h-3.5 w-3.5 text-[#1A1A1D]" />
                      New Vehicle
                    </button>
                  </>
                )}
              </div>
            </div>
            <VehiclePlannerTabs activeTab={activeTab} onTabChange={setActiveTab} />
          </div>

          {/* Tab Content */}
          <div className="relative flex-1 overflow-y-auto">
            <div style={{ display: activeTab === 'scenarios' ? 'block' : 'none' }}>
              <ScenariosTab onAddScenario={() => setShowAddModal(true)} />
            </div>
            {activeScenario && calculationResult && (
              <div className="grid" style={{ gridTemplateColumns: '1fr', gridTemplateRows: '1fr' }}>
                <div style={{ gridArea: '1 / 1', display: activeTab === 'vehicle' ? 'block' : 'none' }}>
                  <VehicleFinancingTab scenario={activeScenario} result={calculationResult} />
                </div>
                <div style={{ gridArea: '1 / 1', display: activeTab === 'costs' ? 'block' : 'none' }}>
                  <CostBreakdownTab scenario={activeScenario} result={calculationResult} />
                </div>
                <div style={{ gridArea: '1 / 1', display: activeTab === 'depreciation' ? 'block' : 'none' }}>
                  <DepreciationTab scenario={activeScenario} result={calculationResult} />
                </div>
                <div style={{ gridArea: '1 / 1', display: activeTab === 'tco' ? 'block' : 'none' }}>
                  <TotalCostTab scenario={activeScenario} result={calculationResult} />
                </div>
              </div>
            )}
          </div>
        </>
      ) : (
        /* ─── Selection Screen (Landing) ─── */
        <>
          {/* Title Section (no tabs) */}
          <div style={{ padding: '24px 32px 0 32px' }} className="shrink-0">
            <h1 className={clsx('text-2xl font-semibold', isMonet ? 'text-[#2D2D2D]' : 'text-[#E8E6E1]')}>
              Vehicle Planner
            </h1>
          </div>

          <VehicleSelectionScreen
            onSelectScenario={handleSelectScenario}
            onAddScenario={() => setShowAddModal(true)}
            isMonet={isMonet}
          />
        </>
      )}

      {/* Add Vehicle Scenario Modal */}
      <AddVehicleScenarioModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
      />
    </div>
  )
}

// ─── Standalone Page ────────────────────────────────────

export default function VehiclePlannerPage() {
  const router = useRouter()
  const handleClose = () => router.push('/dashboard')

  return (
    <div className="h-screen w-full">
      <VehiclePlannerView onClose={handleClose} />
    </div>
  )
}

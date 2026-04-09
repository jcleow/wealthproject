import { create } from 'zustand'
import { devtools, persist } from 'zustand/middleware'
import { useShallow } from 'zustand/react/shallow'
import type {
  VehicleScenario,
  VehicleTabId,
  VehicleInputs,
  VehicleRecurringCosts,
} from '@/types/vehicle'
import { generateUUID } from '@/lib/utils'
import { DEFAULT_DEPRECIATION_PERIODS, DEFAULT_RECURRING_COSTS } from '@/lib/vehicle/constants'

// ============================================
// TYPES
// ============================================

export interface VehiclePlannerState {
  scenarios: VehicleScenario[]
  activeScenarioId: string | null
  activeTab: VehicleTabId
  ownershipYears: number

  // Actions
  setActiveTab: (tab: VehicleTabId) => void
  setOwnershipYears: (years: number) => void
  addScenario: (name?: string) => void
  updateScenarioInputs: (id: string, updates: Partial<VehicleInputs>) => void
  updateScenarioRecurringCosts: (id: string, updates: Partial<VehicleRecurringCosts>) => void
  updateScenarioName: (id: string, name: string) => void
  deleteScenario: (id: string) => void
  setActiveScenario: (id: string | null) => void
  duplicateScenario: (id: string) => void
  toggleIncluded: (id: string) => void
}

// ============================================
// DEFAULTS
// ============================================

function createDefaultInputs(): VehicleInputs {
  const now = new Date()
  const purchaseMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`

  return {
    vehicleCategory: 'car_cat_a',
    fuelType: 'petrol',
    condition: 'new',
    engineCapacityCc: 1600,
    powerKw: null,
    co2EmissionsGkm: 120,

    vehicleAge: 0,
    remainingCoeMonths: 120,
    isPafrEligible: true,

    omv: 20000,
    listPrice: 0,
    coePrice: 100000,
    vesPeriod: '2026',

    useFinancing: false,
    loanAmount: 0,
    loanTenureYears: 7,
    interestRateFlat: 2.78,

    purchaseMonth,
    depreciationPeriods: [...DEFAULT_DEPRECIATION_PERIODS],
    downpaymentCashAccountId: null,
  }
}

function createDefaultRecurringCosts(): VehicleRecurringCosts {
  return { ...DEFAULT_RECURRING_COSTS.car }
}

function createDefaultScenario(name?: string): VehicleScenario {
  const now = Date.now()
  return {
    id: generateUUID(),
    name: name ?? 'New Vehicle',
    inputs: createDefaultInputs(),
    recurringCosts: createDefaultRecurringCosts(),
    isIncluded: false,
    createdAt: now,
    updatedAt: now,
  }
}

// ============================================
// STORE
// ============================================

const initialState = {
  scenarios: [] as VehicleScenario[],
  activeScenarioId: null as string | null,
  activeTab: 'vehicle' as VehicleTabId,
  ownershipYears: 10,
}

export const useVehiclePlannerStore = create<VehiclePlannerState>()(
  devtools(
    persist(
      (set) => ({
        ...initialState,

        setActiveTab: (tab) => set({ activeTab: tab }),

        setOwnershipYears: (years) => set({ ownershipYears: Math.max(1, Math.min(10, years)) }),

        addScenario: (name) =>
          set((state) => {
            const newScenario = createDefaultScenario(name)
            return {
              scenarios: [...state.scenarios, newScenario],
              activeScenarioId: newScenario.id,
            }
          }),

        updateScenarioInputs: (id, updates) =>
          set((state) => ({
            scenarios: state.scenarios.map((scenario) =>
              scenario.id === id
                ? {
                    ...scenario,
                    inputs: { ...scenario.inputs, ...updates },
                    updatedAt: Date.now(),
                  }
                : scenario
            ),
          })),

        updateScenarioRecurringCosts: (id, updates) =>
          set((state) => ({
            scenarios: state.scenarios.map((scenario) =>
              scenario.id === id
                ? {
                    ...scenario,
                    recurringCosts: { ...scenario.recurringCosts, ...updates },
                    updatedAt: Date.now(),
                  }
                : scenario
            ),
          })),

        updateScenarioName: (id, name) =>
          set((state) => ({
            scenarios: state.scenarios.map((scenario) =>
              scenario.id === id
                ? { ...scenario, name, updatedAt: Date.now() }
                : scenario
            ),
          })),

        deleteScenario: (id) =>
          set((state) => {
            const remaining = state.scenarios.filter((s) => s.id !== id)
            const activeScenarioId =
              state.activeScenarioId === id
                ? remaining[0]?.id ?? null
                : state.activeScenarioId
            return { scenarios: remaining, activeScenarioId }
          }),

        setActiveScenario: (id) => set({ activeScenarioId: id }),

        duplicateScenario: (id) =>
          set((state) => {
            const source = state.scenarios.find((s) => s.id === id)
            if (!source) return state
            const now = Date.now()
            const duplicate: VehicleScenario = {
              ...source,
              id: generateUUID(),
              name: `${source.name} (Copy)`,
              isIncluded: false,
              createdAt: now,
              updatedAt: now,
            }
            return {
              scenarios: [...state.scenarios, duplicate],
              activeScenarioId: duplicate.id,
            }
          }),

        toggleIncluded: (id) =>
          set((state) => ({
            scenarios: state.scenarios.map((scenario) =>
              scenario.id === id
                ? { ...scenario, isIncluded: !scenario.isIncluded, updatedAt: Date.now() }
                : scenario
            ),
          })),
      }),
      {
        name: 'vehicle-planner-storage',
        partialize: (state) => ({
          scenarios: state.scenarios,
          activeScenarioId: state.activeScenarioId,
          activeTab: state.activeTab,
          ownershipYears: state.ownershipYears,
        }),
      }
    ),
    { name: 'vehicle-planner-store' }
  )
)

// ============================================
// SELECTORS
// ============================================

export const useVehicleScenarios = () =>
  useVehiclePlannerStore((s) => s.scenarios)

export const useActiveVehicleScenario = () =>
  useVehiclePlannerStore((s) =>
    s.scenarios.find((scenario) => scenario.id === s.activeScenarioId) ?? null
  )

export const useVehicleActiveTab = () =>
  useVehiclePlannerStore((s) => s.activeTab)

export const useVehicleOwnershipYears = () =>
  useVehiclePlannerStore((s) => s.ownershipYears)

export const useVehiclePlannerActions = () =>
  useVehiclePlannerStore(
    useShallow((s) => ({
      setActiveTab: s.setActiveTab,
      setOwnershipYears: s.setOwnershipYears,
      addScenario: s.addScenario,
      updateScenarioInputs: s.updateScenarioInputs,
      updateScenarioRecurringCosts: s.updateScenarioRecurringCosts,
      updateScenarioName: s.updateScenarioName,
      deleteScenario: s.deleteScenario,
      setActiveScenario: s.setActiveScenario,
      duplicateScenario: s.duplicateScenario,
      toggleIncluded: s.toggleIncluded,
    }))
  )

import { create } from 'zustand'
import { devtools } from 'zustand/middleware'
import type { DashboardLayout } from '@/types/financial'

/**
 * Feature Modules UI State - manages visibility of feature panels and modals.
 *
 * This store eliminates the callback prop drilling from Dashboard through
 * FinancialWorkspace for opening/closing feature modules.
 */
export interface FeatureModulesState {
  // Feature panel visibility (full-screen takeovers)
  showCPFView: boolean
  showTaxPlanner: boolean
  showInsurancePlanner: boolean
  showVehiclePlanner: boolean

  // Modal visibility
  showPropertyPlanner: boolean
  propertyScenarioToEdit: string | null
  showLayoutModal: boolean
  showOnboardingWizard: boolean
  showPostResetChoice: boolean

  // Chat sidebar state
  isChatCollapsed: boolean
  isHistoryOpen: boolean

  // Dashboard layout (persisted to user settings separately)
  dashboardLayout: DashboardLayout
  hasUserChangedLayout: boolean

  // Actions - Feature panels
  openCPFView: () => void
  closeCPFView: () => void
  openTaxPlanner: () => void
  closeTaxPlanner: () => void
  openInsurancePlanner: () => void
  closeInsurancePlanner: () => void
  openVehiclePlanner: () => void
  closeVehiclePlanner: () => void

  // Actions - Property Planner Modal
  openPropertyPlanner: (scenarioId?: string) => void
  closePropertyPlanner: () => void

  // Actions - Layout Modal
  openLayoutModal: () => void
  closeLayoutModal: () => void

  // Actions - Onboarding Wizard
  openOnboardingWizard: () => void
  closeOnboardingWizard: () => void

  // Actions - Post-reset choice (Start Fresh flow)
  openPostResetChoice: () => void
  closePostResetChoice: () => void

  // Actions - Chat sidebar
  toggleChat: () => void
  collapseChat: () => void
  expandChat: () => void
  toggleHistory: () => void

  // Actions - Dashboard layout
  setDashboardLayout: (layout: DashboardLayout) => void
  initializeLayout: (layout: DashboardLayout) => void

  // Reset
  reset: () => void
}

const initialState = {
  showCPFView: false,
  showTaxPlanner: false,
  showInsurancePlanner: false,
  showVehiclePlanner: false,
  showPropertyPlanner: false,
  propertyScenarioToEdit: null,
  showLayoutModal: false,
  showOnboardingWizard: false,
  showPostResetChoice: false,
  isChatCollapsed: true,
  isHistoryOpen: false,
  dashboardLayout: 'stacked' as DashboardLayout,
  hasUserChangedLayout: false,
}

export const useFeatureModulesStore = create<FeatureModulesState>()(
  devtools(
    (set) => ({
      ...initialState,

      // Feature panels
      openCPFView: () => set({ showCPFView: true }),
      closeCPFView: () => set({ showCPFView: false }),

      openTaxPlanner: () => set({ showTaxPlanner: true }),
      closeTaxPlanner: () => set({ showTaxPlanner: false }),

      openInsurancePlanner: () => set({ showInsurancePlanner: true }),
      closeInsurancePlanner: () => set({ showInsurancePlanner: false }),

      openVehiclePlanner: () => set({ showVehiclePlanner: true }),
      closeVehiclePlanner: () => set({ showVehiclePlanner: false }),

      // Property Planner Modal
      openPropertyPlanner: (scenarioId) =>
        set({
          showPropertyPlanner: true,
          propertyScenarioToEdit: scenarioId ?? null,
        }),
      closePropertyPlanner: () =>
        set({
          showPropertyPlanner: false,
          propertyScenarioToEdit: null,
        }),

      // Layout Modal
      openLayoutModal: () => set({ showLayoutModal: true }),
      closeLayoutModal: () => set({ showLayoutModal: false }),

      // Onboarding Wizard
      openOnboardingWizard: () => set({ showOnboardingWizard: true }),
      closeOnboardingWizard: () => set({ showOnboardingWizard: false }),

      // Post-reset choice
      openPostResetChoice: () => set({ showPostResetChoice: true }),
      closePostResetChoice: () => set({ showPostResetChoice: false }),

      // Chat sidebar
      toggleChat: () => set((state) => ({ isChatCollapsed: !state.isChatCollapsed })),
      collapseChat: () => set({ isChatCollapsed: true }),
      expandChat: () => set({ isChatCollapsed: false }),
      toggleHistory: () => set((state) => ({ isHistoryOpen: !state.isHistoryOpen })),

      // Dashboard layout
      setDashboardLayout: (layout) =>
        set({ dashboardLayout: layout, hasUserChangedLayout: true }),
      initializeLayout: (layout) =>
        set((state) => {
          // Only initialize if user hasn't manually changed it
          if (!state.hasUserChangedLayout) {
            return { dashboardLayout: layout }
          }
          return state
        }),

      reset: () => set(initialState),
    }),
    { name: 'feature-modules-store' }
  )
)

/**
 * Selector for feature panel visibility
 */
export const useFeaturePanelVisibility = () =>
  useFeatureModulesStore((state) => ({
    showCPFView: state.showCPFView,
    showTaxPlanner: state.showTaxPlanner,
    showInsurancePlanner: state.showInsurancePlanner,
    showVehiclePlanner: state.showVehiclePlanner,
  }))

/**
 * Selector for feature panel actions (use in FinancialWorkspace header)
 */
export const useFeaturePanelActions = () =>
  useFeatureModulesStore((state) => ({
    openCPFView: state.openCPFView,
    openTaxPlanner: state.openTaxPlanner,
    openInsurancePlanner: state.openInsurancePlanner,
    openVehiclePlanner: state.openVehiclePlanner,
    openPropertyPlanner: state.openPropertyPlanner,
    openLayoutModal: state.openLayoutModal,
  }))

/**
 * Selector for chat sidebar state
 */
export const useChatSidebarState = () =>
  useFeatureModulesStore((state) => ({
    isChatCollapsed: state.isChatCollapsed,
    isHistoryOpen: state.isHistoryOpen,
    toggleChat: state.toggleChat,
    collapseChat: state.collapseChat,
    expandChat: state.expandChat,
    toggleHistory: state.toggleHistory,
  }))

/**
 * Selector for dashboard layout
 */
export const useDashboardLayout = () =>
  useFeatureModulesStore((state) => ({
    dashboardLayout: state.dashboardLayout,
    setDashboardLayout: state.setDashboardLayout,
    initializeLayout: state.initializeLayout,
  }))

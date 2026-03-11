'use client'

import { useRef, useEffect, useCallback } from 'react'
import dynamic from 'next/dynamic'
import { PanelLeftOpen, Loader2 } from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import clsx from 'clsx'

import { Chat } from '../chat/Chat'
import { ChatFloatingLauncher } from './ChatFloatingLauncher'
import { FinancialDataSection } from './FinancialDataSection'
import { FinancialWorkspace } from './FinancialWorkspace'
import { MiniChart } from './MiniChart'
import { ResizableChartSection } from './ResizableChartSection'
import { PropertyPlannerModal } from '@/components/modals/PropertyPlannerModal/PropertyPlannerModal'
import { LayoutPreviewModal } from '@/components/modals/LayoutPreviewModal'
import { OnboardingWizardModal } from '@/components/modals/OnboardingWizardModal/OnboardingWizardModal'
import { PostResetChoiceModal } from '@/components/modals/PostResetChoiceModal'

// Loading skeleton for feature modules
function FeatureModuleLoading() {
  return (
    <div className="flex h-full items-center justify-center">
      <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
    </div>
  )
}

// Dynamically import heavy feature modules (only loaded when shown)
const CPFSimulationView = dynamic(
  () => import('../cpf/CPFSimulationView').then(mod => ({ default: mod.CPFSimulationView })),
  { ssr: false, loading: FeatureModuleLoading }
)

const InsurancePlannerView = dynamic(
  () => import('@/app/insurance-planner/page').then(mod => ({ default: mod.InsurancePlannerView })),
  { ssr: false, loading: FeatureModuleLoading }
)

const VehiclePlannerView = dynamic(
  () => import('@/app/vehicle-planner/page').then(mod => ({ default: mod.VehiclePlannerView })),
  { ssr: false, loading: FeatureModuleLoading }
)

import { usePersonsQuery } from '@/hooks/queries/usePersonsQuery'
import { useTimeline } from '@/hooks/useTimeline'
import { usePictureInPicture } from '@/hooks/usePictureInPicture'
import { useScenarioEvents } from '@/hooks/useScenarioEvents'
import { useWindowWidth } from '@/hooks/useWindowWidth'
import { generateUUID } from '@/lib/utils'
import { settingsApi } from '@/api/financial'
import { QUERY_KEYS } from '@/lib/queryKeys'
import { useTimelineStore, useFeatureModulesStore, useColorScheme } from '@/stores'
import { useShallow } from 'zustand/react/shallow'

export function Dashboard() {
  const chatIdRef = useRef<string>(generateUUID())
  const chatId = chatIdRef.current
  const queryClient = useQueryClient()
  const windowWidth = useWindowWidth()
  const colorScheme = useColorScheme()

  // Feature modules state from Zustand store (batched with shallow comparison)
  const {
    showCPFView,
    closeCPFView,
    showInsurancePlanner,
    closeInsurancePlanner,
    showVehiclePlanner,
    closeVehiclePlanner,
    showPropertyPlanner,
    propertyScenarioToEdit,
    openPropertyPlanner,
    closePropertyPlanner,
    showLayoutModal,
    closeLayoutModal,
    showOnboardingWizard,
    openOnboardingWizard,
    closeOnboardingWizard,
    showPostResetChoice,
    closePostResetChoice,
    isChatCollapsed,
    isHistoryOpen,
    toggleChat,
    collapseChat,
    expandChat,
    toggleHistory,
    dashboardLayout,
    setDashboardLayout,
    initializeLayout,
  } = useFeatureModulesStore(
    useShallow((s) => ({
      showCPFView: s.showCPFView,
      closeCPFView: s.closeCPFView,
      showInsurancePlanner: s.showInsurancePlanner,
      closeInsurancePlanner: s.closeInsurancePlanner,
      showVehiclePlanner: s.showVehiclePlanner,
      closeVehiclePlanner: s.closeVehiclePlanner,
      showPropertyPlanner: s.showPropertyPlanner,
      propertyScenarioToEdit: s.propertyScenarioToEdit,
      openPropertyPlanner: s.openPropertyPlanner,
      closePropertyPlanner: s.closePropertyPlanner,
      showLayoutModal: s.showLayoutModal,
      closeLayoutModal: s.closeLayoutModal,
      showOnboardingWizard: s.showOnboardingWizard,
      openOnboardingWizard: s.openOnboardingWizard,
      closeOnboardingWizard: s.closeOnboardingWizard,
      showPostResetChoice: s.showPostResetChoice,
      closePostResetChoice: s.closePostResetChoice,
      isChatCollapsed: s.isChatCollapsed,
      isHistoryOpen: s.isHistoryOpen,
      toggleChat: s.toggleChat,
      collapseChat: s.collapseChat,
      expandChat: s.expandChat,
      toggleHistory: s.toggleHistory,
      dashboardLayout: s.dashboardLayout,
      setDashboardLayout: s.setDashboardLayout,
      initializeLayout: s.initializeLayout,
    }))
  )

  // Get timeline setters from store for PropertyPlannerModal
  const { setSelectedYear, setSelectedMonth } = useTimelineStore(
    useShallow((s) => ({
      setSelectedYear: s.setSelectedYear,
      setSelectedMonth: s.setSelectedMonth,
    }))
  )

  // Initialize timeline hook (triggers data fetch and store sync)
  // Also get chart data for MiniChart component
  const timeline = useTimeline({ resolution: 'monthly' })

  // Fetch user settings for PiP preference and layout
  const { data: userSettings } = useQuery({
    queryKey: QUERY_KEYS.settings.user,
    queryFn: () => settingsApi.getUserSettings(),
    staleTime: 5 * 60 * 1000,
  })

  // Initialize layout from settings (only on first load, not after user changes)
  useEffect(() => {
    if (userSettings?.dashboardLayout) {
      initializeLayout(userSettings.dashboardLayout)
    }
  }, [userSettings?.dashboardLayout, initializeLayout])

  // ─── Onboarding wizard auto-trigger ─────────────────────────────────────
  // Show wizard when: user has zero persons AND hasn't completed/dismissed onboarding.
  // Uses a ref guard to prevent re-triggering during the same "session" (avoids race
  // condition where the dismiss mutation hasn't round-tripped yet).
  // The guard resets when onboardingCompleted flips back to false (e.g., after "Start Fresh").
  const { data: personsData } = usePersonsQuery()
  const onboardingTriggeredRef = useRef(false)

  // Reset the guard when onboardingCompleted is explicitly set back to false
  // (happens after "Delete All Data" / "Start Fresh")
  useEffect(() => {
    if (userSettings && !userSettings.onboardingCompleted) {
      onboardingTriggeredRef.current = false
    }
  }, [userSettings?.onboardingCompleted])

  useEffect(() => {
    if (
      !onboardingTriggeredRef.current &&
      !showPostResetChoice &&
      personsData !== undefined &&
      userSettings !== undefined &&
      personsData.length === 0 &&
      !userSettings.onboardingCompleted
    ) {
      onboardingTriggeredRef.current = true
      openOnboardingWizard()
    }
  }, [personsData, userSettings, showPostResetChoice, openOnboardingWizard])

  // Mutation for updating layout preference
  const updateLayoutMutation = useMutation({
    mutationFn: (layout: typeof dashboardLayout) =>
      settingsApi.updateUserSettings({
        ...userSettings!,
        dashboardLayout: layout,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.settings.user })
    },
    onError: () => {
      // Silently fail - layout state already updated optimistically
    },
  })

  // Handle layout change with optimistic update
  const handleLayoutChange = useCallback(
    (layout: typeof dashboardLayout) => {
      setDashboardLayout(layout)
      if (userSettings) {
        updateLayoutMutation.mutate(layout)
      }
    },
    [userSettings, updateLayoutMutation, setDashboardLayout]
  )

  // Force stacked layout on smaller screens
  const effectiveLayout = windowWidth >= 1280 ? dashboardLayout : 'stacked'
  const isSideBySide = effectiveLayout !== 'stacked'

  // Fetch scenario events for mini chart
  const { events: scenarioEvents } = useScenarioEvents()

  // Picture-in-picture chart functionality
  const { targetRef: chartRef, showPiP, dismissPiP } = usePictureInPicture({
    enabled: userSettings?.chartPictureInPicture ?? false,
    threshold: 0.2, // Show PiP when less than 20% of chart is visible
  })

  // Scroll back to the main chart
  const scrollToChart = useCallback(() => {
    chartRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    dismissPiP()
  }, [chartRef, dismissPiP])

  // Handle property scenario edit from chart marker click
  const handlePropertyScenarioEdit = useCallback((scenarioId: string) => {
    openPropertyPlanner(scenarioId)
  }, [openPropertyPlanner])

  // Keyboard shortcut: Cmd+B to toggle chat
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'b') {
        e.preventDefault()
        toggleChat()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [toggleChat])

  // Theme-aware styles
  const isMonet = colorScheme === 'monet'

  return (
    <>
      <div
        className={clsx(
          'relative overflow-hidden h-screen w-full font-sans transition-colors duration-300',
          isMonet
            ? 'text-[var(--monet-text-primary)]'
            : 'bg-[#050505] text-slate-200'
        )}
        style={isMonet ? {
          background: 'linear-gradient(135deg, var(--monet-bg-cream) 0%, var(--monet-bg-pale-blue) 50%, var(--monet-bg-warm-white) 100%)',
        } : undefined}
      >
        {/* Ambient background orbs - theme aware */}
        <div
          className={clsx(
            'fixed left-[-10%] top-[-20%] h-[800px] w-[800px] pointer-events-none rounded-full blur-[120px]',
            isMonet ? 'bg-[var(--monet-lavender-light)] opacity-30' : 'bg-zinc-800/20 opacity-40'
          )}
        />
        <div
          className={clsx(
            'fixed bottom-[-20%] right-[-10%] h-[600px] w-[600px] pointer-events-none rounded-full blur-[100px]',
            isMonet ? 'bg-[var(--monet-sage-light)] opacity-25' : 'bg-slate-800/10 opacity-30'
          )}
        />
        <div
          className={clsx(
            'fixed right-[20%] top-[20%] h-[400px] w-[400px] pointer-events-none rounded-full blur-[80px]',
            isMonet ? 'bg-[var(--monet-gold-light)] opacity-40' : 'bg-white/5 opacity-20'
          )}
        />

        {/* Main content - side by side layout */}
        <div className="relative z-10 flex h-screen w-full overflow-hidden">
          {/* Left sidebar area */}
          <div
            className="hidden h-screen shrink-0 lg:block"
            style={{
              width: isChatCollapsed ? '64px' : '520px',
              transition: 'width 250ms cubic-bezier(0.4, 0, 0.2, 1)',
            }}
          >
            {/* Chat panel */}
            <div
              className="absolute left-0 top-0 h-screen w-[520px] p-6 pr-3"
              style={{
                opacity: isChatCollapsed ? 0 : 1,
                pointerEvents: isChatCollapsed ? 'none' : 'auto',
                transition: 'opacity 250ms cubic-bezier(0.4, 0, 0.2, 1)',
              }}
            >
              <div
                className={clsx(
                  'flex flex-col overflow-hidden h-full rounded-2xl border transition-colors duration-300',
                  isMonet
                    ? 'border-[var(--monet-lavender)]/20 bg-white/60 backdrop-blur-xl'
                    : 'border-white/[0.06] bg-[#0a0a0a]/80'
                )}
              >
                <Chat
                  chatId={chatId}
                  className="h-full min-h-0"
                  onToggleHistory={toggleHistory}
                  isHistoryOpen={isHistoryOpen}
                  onCollapse={collapseChat}
                />
              </div>
            </div>

            {/* Collapsed sidebar */}
            <div
              className={clsx(
                'absolute left-0 top-0 flex flex-col items-center h-screen w-16 pt-7 border-r transition-colors duration-300',
                isMonet
                  ? 'border-[var(--monet-lavender)]/15 bg-white/40'
                  : 'border-white/[0.06] bg-[#0a0a0a]/40'
              )}
              style={{
                opacity: isChatCollapsed ? 1 : 0,
                pointerEvents: isChatCollapsed ? 'auto' : 'none',
                transition: 'opacity 250ms cubic-bezier(0.4, 0, 0.2, 1)',
              }}
            >
              <button
                type="button"
                onClick={expandChat}
                className={clsx(
                  'p-1 transition-colors',
                  isMonet
                    ? 'text-[var(--monet-text-muted)] hover:text-[var(--monet-text-primary)]'
                    : 'text-slate-500 hover:text-white'
                )}
                title="Show chat"
              >
                <PanelLeftOpen className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Right side - Dashboard */}
          <div className={`flex flex-1 flex-col overflow-y-auto
h-screen
gap-6 p-6`}>
            {showCPFView ? (
              /* CPF Simulation View - takes over entire area */
              <div
                className={clsx(
                  'flex flex-1 flex-col overflow-hidden min-h-0 rounded-2xl border transition-colors duration-300',
                  isMonet
                    ? 'border-[var(--monet-lavender)]/20 bg-white/60 backdrop-blur-xl'
                    : 'border-white/[0.06] bg-[#0a0a0a]/80'
                )}
              >
                <CPFSimulationView onClose={closeCPFView} />
              </div>
            ) : showInsurancePlanner ? (
              /* Insurance Planner View - takes over entire area */
              <div
                className={clsx(
                  'flex flex-1 flex-col overflow-hidden min-h-0 rounded-2xl border transition-colors duration-300',
                  isMonet
                    ? 'border-[var(--monet-lavender)]/20 bg-white/60 backdrop-blur-xl'
                    : 'border-white/[0.06] bg-[#0a0a0a]/80'
                )}
              >
                <InsurancePlannerView onClose={closeInsurancePlanner} />
              </div>
            ) : showVehiclePlanner ? (
              /* Vehicle Planner View - takes over entire area */
              <div
                className={clsx(
                  'flex flex-1 flex-col overflow-hidden min-h-0 rounded-2xl border transition-colors duration-300',
                  isMonet
                    ? 'border-[var(--monet-lavender)]/20 bg-white/60 backdrop-blur-xl'
                    : 'border-white/[0.06] bg-[#0a0a0a]/80'
                )}
              >
                <VehiclePlannerView onClose={closeVehiclePlanner} />
              </div>
            ) : isSideBySide ? (
              /* Side-by-side layout: chart-left or chart-right */
              <>
                {/* Full-width header/navbar */}
                <div className="shrink-0">
                  <FinancialWorkspace headerOnly />
                </div>

                {/* Side-by-side content area */}
                <div
                  className={clsx(
                    'flex gap-4 -mt-2 h-[70vh]',
                    effectiveLayout === 'chart-right' && 'flex-row-reverse'
                  )}
                >
                  {/* Chart section */}
                  <div
                    ref={chartRef}
                    className="flex w-[65%] shrink-0 flex-col overflow-hidden rounded-2xl bg-transparent"
                  >
                    <FinancialWorkspace
                      onPropertyScenarioEdit={handlePropertyScenarioEdit}
                      chartOnly
                    />
                  </div>

                  {/* Cards section - compact mode */}
                  <div className="w-[35%] overflow-y-auto h-full">
                    <FinancialDataSection compact />
                  </div>
                </div>
              </>
            ) : (
              /* Stacked layout (default) */
              <>
                {/* Top workspace with chart - resizable */}
                <ResizableChartSection chartRef={chartRef}>
                  <FinancialWorkspace
                    onPropertyScenarioEdit={handlePropertyScenarioEdit}
                  />
                </ResizableChartSection>

                {/* Financial data cards + Tax Mode Panel */}
                <FinancialDataSection
                />
              </>
            )}
          </div>
        </div>
      </div>

      <div className="lg:hidden">
        <ChatFloatingLauncher chatId={chatId} />
      </div>

      {/* Picture-in-Picture mini chart - disabled in side-by-side layouts */}
      {showPiP && !showCPFView && !showInsurancePlanner && !showVehiclePlanner && !isSideBySide && (
        <MiniChart
          timelineYears={timeline.chartYears}
          timelineMonths={timeline.chartMonths}
          scenarioEvents={scenarioEvents}
          onDismiss={dismissPiP}
          onScrollToChart={scrollToChart}
        />
      )}

      {/* Property Planner Modal */}
      <PropertyPlannerModal
        isOpen={showPropertyPlanner}
        onClose={closePropertyPlanner}
        initialScenarioId={propertyScenarioToEdit ?? undefined}
        onJumpToDate={(year, month) => {
          setSelectedYear(year)
          setSelectedMonth(month)
          closePropertyPlanner()
        }}
      />

      {/* Layout Preview Modal */}
      <LayoutPreviewModal
        isOpen={showLayoutModal}
        onClose={closeLayoutModal}
        currentLayout={dashboardLayout}
        onLayoutChange={handleLayoutChange}
      />

      {/* Post-reset choice: Dashboard vs Wizard */}
      <PostResetChoiceModal
        isOpen={showPostResetChoice}
        onDashboard={() => {
          closePostResetChoice()
          // Mark onboarding completed so the auto-trigger doesn't reopen the wizard
          onboardingTriggeredRef.current = true
          if (userSettings) {
            const updated = { ...userSettings, onboardingCompleted: true }
            queryClient.setQueryData(QUERY_KEYS.settings.user, updated)
            settingsApi.updateUserSettings(updated)
          }
        }}
        onWizard={() => {
          closePostResetChoice()
          openOnboardingWizard()
        }}
      />

      {/* Onboarding Wizard Modal */}
      <OnboardingWizardModal
        isOpen={showOnboardingWizard}
        onClose={closeOnboardingWizard}
      />
    </>
  )
}

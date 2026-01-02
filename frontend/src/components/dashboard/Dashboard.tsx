'use client'

import { useRef, useEffect, useCallback } from 'react'
import { PanelLeftOpen } from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import clsx from 'clsx'

import { Chat } from '../chat/Chat'
import { ChatFloatingLauncher } from './ChatFloatingLauncher'
import { FinancialDataSection } from './FinancialDataSection'
import { FinancialWorkspace } from './FinancialWorkspace'
import { MiniChart } from './MiniChart'
import { ResizableChartSection } from './ResizableChartSection'
import { CPFSimulationView } from '../cpf/CPFSimulationView'
import { PropertyPlannerModal } from '@/components/modals/PropertyPlannerModal/PropertyPlannerModal'
import { LayoutPreviewModal } from '@/components/modals/LayoutPreviewModal'
import { TaxPlannerV2View } from '@/app/tax-planner/page'
import { InsurancePlannerView } from '@/app/insurance-planner/page'
import { useTimeline } from '@/hooks/useTimeline'
import { usePictureInPicture } from '@/hooks/usePictureInPicture'
import { useScenarioEvents } from '@/hooks/useScenarioEvents'
import { useWindowWidth } from '@/hooks/useWindowWidth'
import { generateUUID } from '@/lib/utils'
import { settingsApi } from '@/api/financial'
import { QUERY_KEYS } from '@/lib/queryKeys'
import { useTimelineStore, useFeatureModulesStore } from '@/stores'

export function Dashboard() {
  const chatIdRef = useRef<string>(generateUUID())
  const chatId = chatIdRef.current
  const queryClient = useQueryClient()
  const windowWidth = useWindowWidth()

  // Feature modules state from Zustand store
  const showCPFView = useFeatureModulesStore((s) => s.showCPFView)
  const closeCPFView = useFeatureModulesStore((s) => s.closeCPFView)
  const showTaxPlanner = useFeatureModulesStore((s) => s.showTaxPlanner)
  const closeTaxPlanner = useFeatureModulesStore((s) => s.closeTaxPlanner)
  const showInsurancePlanner = useFeatureModulesStore((s) => s.showInsurancePlanner)
  const closeInsurancePlanner = useFeatureModulesStore((s) => s.closeInsurancePlanner)
  const showPropertyPlanner = useFeatureModulesStore((s) => s.showPropertyPlanner)
  const propertyScenarioToEdit = useFeatureModulesStore((s) => s.propertyScenarioToEdit)
  const openPropertyPlanner = useFeatureModulesStore((s) => s.openPropertyPlanner)
  const closePropertyPlanner = useFeatureModulesStore((s) => s.closePropertyPlanner)
  const showLayoutModal = useFeatureModulesStore((s) => s.showLayoutModal)
  const closeLayoutModal = useFeatureModulesStore((s) => s.closeLayoutModal)

  // Chat sidebar state from Zustand store
  const isChatCollapsed = useFeatureModulesStore((s) => s.isChatCollapsed)
  const isHistoryOpen = useFeatureModulesStore((s) => s.isHistoryOpen)
  const toggleChat = useFeatureModulesStore((s) => s.toggleChat)
  const collapseChat = useFeatureModulesStore((s) => s.collapseChat)
  const expandChat = useFeatureModulesStore((s) => s.expandChat)
  const toggleHistory = useFeatureModulesStore((s) => s.toggleHistory)

  // Dashboard layout from Zustand store
  const dashboardLayout = useFeatureModulesStore((s) => s.dashboardLayout)
  const setDashboardLayout = useFeatureModulesStore((s) => s.setDashboardLayout)
  const initializeLayout = useFeatureModulesStore((s) => s.initializeLayout)

  // Get timeline setters from store for PropertyPlannerModal
  const setSelectedYear = useTimelineStore((s) => s.setSelectedYear)
  const setSelectedMonth = useTimelineStore((s) => s.setSelectedMonth)

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

  return (
    <>
      <div className={`relative
overflow-hidden
h-screen w-full
bg-[#050505]
font-sans text-slate-200`}>
        {/* Ambient background orbs */}
        <div className={`fixed left-[-10%] top-[-20%]
h-[800px] w-[800px]
pointer-events-none
rounded-full
bg-zinc-800/20
opacity-40 blur-[120px]`} />
        <div className={`fixed bottom-[-20%] right-[-10%]
h-[600px] w-[600px]
pointer-events-none
rounded-full
bg-slate-800/10
opacity-30 blur-[100px]`} />
        <div className={`fixed right-[20%] top-[20%]
h-[400px] w-[400px]
pointer-events-none
rounded-full
bg-white/5
opacity-20 blur-[80px]`} />

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
              className={`absolute left-0 top-0
h-screen w-[520px]
p-6 pr-3`}
              style={{
                opacity: isChatCollapsed ? 0 : 1,
                pointerEvents: isChatCollapsed ? 'none' : 'auto',
                transition: 'opacity 250ms cubic-bezier(0.4, 0, 0.2, 1)',
              }}
            >
              <div className={`flex flex-col overflow-hidden
h-full
rounded-2xl border border-white/[0.06]
bg-[#0a0a0a]/80`}>
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
              className={`absolute left-0 top-0
flex flex-col items-center
h-screen w-16
pt-7
border-r border-white/[0.06]
bg-[#0a0a0a]/40`}
              style={{
                opacity: isChatCollapsed ? 1 : 0,
                pointerEvents: isChatCollapsed ? 'auto' : 'none',
                transition: 'opacity 250ms cubic-bezier(0.4, 0, 0.2, 1)',
              }}
            >
              <button
                type="button"
                onClick={expandChat}
                className="p-1 text-slate-500 transition-colors hover:text-white"
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
              <div className={`flex flex-1 flex-col overflow-hidden
min-h-0
rounded-2xl border border-white/[0.06]
bg-[#0a0a0a]/80`}>
                <CPFSimulationView onClose={closeCPFView} />
              </div>
            ) : showTaxPlanner ? (
              /* Tax Planner View - shows header + tax planner */
              <>
                {/* Header bar only - no chart */}
                <div className="shrink-0">
                  <FinancialWorkspace headerOnly />
                </div>
                {/* Tax Planner content */}
                <div className={`flex flex-1 flex-col overflow-hidden
min-h-0
rounded-2xl border border-white/[0.06]
bg-[#0a0a0a]/80`}>
                  <TaxPlannerV2View onClose={closeTaxPlanner} />
                </div>
              </>
            ) : showInsurancePlanner ? (
              /* Insurance Planner View - shows header + insurance planner */
              <>
                {/* Header bar only - no chart */}
                <div className="shrink-0">
                  <FinancialWorkspace headerOnly />
                </div>
                {/* Insurance Planner content */}
                <div className={`flex flex-1 flex-col overflow-hidden
min-h-0
rounded-2xl border border-white/[0.06]
bg-[#0a0a0a]/80`}>
                  <InsurancePlannerView onClose={closeInsurancePlanner} />
                </div>
              </>
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
                    'flex flex-1 gap-4 overflow-hidden -mt-2',
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
                  <div className="w-[35%] overflow-y-auto">
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
      {showPiP && !showCPFView && !showTaxPlanner && !showInsurancePlanner && !isSideBySide && (
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
    </>
  )
}

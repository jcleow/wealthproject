'use client'

import { useRef, useState, useEffect, useCallback } from 'react'
import { PanelLeftOpen } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'

import { Chat } from '../chat/Chat'
import { ChatFloatingLauncher } from './ChatFloatingLauncher'
import { FinancialDataManagement } from './FinancialDataManagement'
import { FinancialWorkspace } from './FinancialWorkspace'
import { MiniChart } from './MiniChart'
import { CPFSimulationView } from '../cpf/CPFSimulationView'
import { PropertyPlannerV2View } from '@/app/property-planner/page'
import { useTimeline } from '@/hooks/useTimeline'
import { usePictureInPicture } from '@/hooks/usePictureInPicture'
import { useScenarioEvents } from '@/hooks/useScenarioEvents'
import { generateUUID } from '@/lib/utils'
import { FinancialDataProvider } from '@/contexts/FinancialDataContext'
import { settingsApi } from '@/api/financial'
import { QUERY_KEYS } from '@/lib/queryKeys'
import type { ZoomLevel } from '@/components/timeline/ZoomControls'

export function Dashboard() {
  const chatIdRef = useRef<string>(generateUUID())
  const chatId = chatIdRef.current
  const [isHistoryOpen, setIsHistoryOpen] = useState(false)
  const [isChatCollapsed, setIsChatCollapsed] = useState(true)
  const [showCPFView, setShowCPFView] = useState(false)
  const [showPropertyPlannerV2, setShowPropertyPlannerV2] = useState(false)
  const [zoomLevel, setZoomLevel] = useState<ZoomLevel>('yearly')
  const timeline = useTimeline({ resolution: 'monthly' })
  const timelineError =
    timeline.timelineQuery.error instanceof Error
      ? timeline.timelineQuery.error.message
      : null

  // Fetch user settings for PiP preference
  const { data: userSettings } = useQuery({
    queryKey: QUERY_KEYS.settings.user,
    queryFn: () => settingsApi.getUserSettings(),
    staleTime: 5 * 60 * 1000,
  })

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

  // Keyboard shortcut: Cmd+B to toggle chat
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'b') {
        e.preventDefault()
        setIsChatCollapsed((prev) => !prev)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  return (
    <FinancialDataProvider>
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
                  onToggleHistory={() => setIsHistoryOpen((prev) => !prev)}
                  isHistoryOpen={isHistoryOpen}
                  onCollapse={() => setIsChatCollapsed(true)}
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
                onClick={() => setIsChatCollapsed(false)}
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
                <CPFSimulationView onClose={() => setShowCPFView(false)} />
              </div>
            ) : showPropertyPlannerV2 ? (
              /* Property Planner V2 View - shows header + property planner */
              <>
                {/* Header bar only - no chart */}
                <div className="shrink-0">
                  <FinancialWorkspace
                    selectedYear={timeline.selectedYear}
                    onSelectYear={timeline.setSelectedYear}
                    onSelectMonth={timeline.setSelectedMonth}
                    timelineYears={timeline.chartYears}
                    timelineMonths={timeline.chartMonths}
                    resolution={timeline.resolution}
                    zoomLevel={zoomLevel}
                    onZoomLevelChange={setZoomLevel}
                    overrideYears={timeline.overrideYears}
                    timelineError={timelineError}
                    onOpenCPF={() => setShowCPFView(true)}
                    onOpenPropertyPlannerV2={() => setShowPropertyPlannerV2(true)}
                    anchorYear={timeline.anchorYear}
                    anchorMonth={timeline.anchorMonth}
                    headerOnly
                  />
                </div>
                {/* Property Planner content */}
                <div className={`flex flex-1 flex-col overflow-hidden
min-h-0
rounded-2xl border border-white/[0.06]
bg-[#0a0a0a]/80`}>
                  <PropertyPlannerV2View onClose={() => setShowPropertyPlannerV2(false)} />
                </div>
              </>
            ) : (
              <>
                {/* Top workspace with chart */}
                <div
                  ref={chartRef}
                  className={`flex flex-col overflow-hidden
min-h-[60vh] min-w-0
rounded-2xl
bg-transparent
shrink-0`}
                >
                  <FinancialWorkspace
                    selectedYear={timeline.selectedYear}
                    onSelectYear={timeline.setSelectedYear}
                    onSelectMonth={timeline.setSelectedMonth}
                    timelineYears={timeline.chartYears}
                    timelineMonths={timeline.chartMonths}
                    resolution={timeline.resolution}
                    zoomLevel={zoomLevel}
                    onZoomLevelChange={setZoomLevel}
                    overrideYears={timeline.overrideYears}
                    timelineError={timelineError}
                    onOpenCPF={() => setShowCPFView(true)}
                    onOpenPropertyPlannerV2={() => setShowPropertyPlannerV2(true)}
                    anchorYear={timeline.anchorYear}
                    anchorMonth={timeline.anchorMonth}
                  />
                </div>

                {/* Financial data cards */}
                <div className="min-h-0 min-w-0 shrink-0">
                  <FinancialDataManagement
                    selectedYear={timeline.selectedYear}
                    onSelectYear={timeline.setSelectedYear}
                    selectedMonth={timeline.selectedMonth}
                    onSelectMonth={timeline.setSelectedMonth}
                    timelineYear={timeline.selectedYearData}
                    timelineMonth={timeline.selectedMonthData}
                    timelineMonths={timeline.sliderMonths}
                    timelineMonthV2={timeline.selectedMonthDataV2}
                    timelineYears={timeline.sliderYears}
                    anchorYear={timeline.anchorYear}
                    anchorMonth={timeline.anchorMonth}
                    resolution={timeline.resolution}
                    zoomLevel={zoomLevel}
                    isTimelineLoading={timeline.isLoading}
                    onSaveTimelineEdits={timeline.saveEdits}
                  />
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="lg:hidden">
        <ChatFloatingLauncher chatId={chatId} />
      </div>

      {/* Picture-in-Picture mini chart */}
      {showPiP && !showCPFView && !showPropertyPlannerV2 && (
        <MiniChart
          timelineYears={timeline.chartYears}
          timelineMonths={timeline.chartMonths}
          scenarioEvents={scenarioEvents}
          onDismiss={dismissPiP}
          onScrollToChart={scrollToChart}
        />
      )}
    </FinancialDataProvider>
  )
}

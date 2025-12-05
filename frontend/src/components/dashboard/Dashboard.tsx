'use client'

import { useRef, useState, useEffect } from 'react'
import { PanelLeftOpen } from 'lucide-react'

import { Chat } from '../chat/Chat'
import { ChatFloatingLauncher } from './ChatFloatingLauncher'
import { FinancialDataManagement } from './FinancialDataManagement'
import { FinancialWorkspace } from './FinancialWorkspace'
import { CPFSimulationView } from '../cpf/CPFSimulationView'
import { useTimeline } from '@/hooks/useTimeline'
import { generateUUID } from '@/lib/utils'
import { FinancialDataProvider } from '@/contexts/FinancialDataContext'
import type { ZoomLevel } from '@/components/timeline/ZoomControls'

export function Dashboard() {
  const chatIdRef = useRef<string>(generateUUID())
  const chatId = chatIdRef.current
  const [isHistoryOpen, setIsHistoryOpen] = useState(false)
  const [isChatCollapsed, setIsChatCollapsed] = useState(true)
  const [showCPFView, setShowCPFView] = useState(false)
  const [zoomLevel, setZoomLevel] = useState<ZoomLevel>('yearly')
  const timeline = useTimeline({ resolution: 'monthly' })
  const timelineError =
    timeline.timelineQuery.error instanceof Error
      ? timeline.timelineQuery.error.message
      : null

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
      <div className="relative h-screen w-full overflow-hidden bg-[#050505] font-sans text-slate-200">
        {/* Ambient background orbs */}
        <div className="pointer-events-none fixed left-[-10%] top-[-20%] h-[800px] w-[800px] rounded-full bg-zinc-800/20 opacity-40 blur-[120px]" />
        <div className="pointer-events-none fixed bottom-[-20%] right-[-10%] h-[600px] w-[600px] rounded-full bg-slate-800/10 opacity-30 blur-[100px]" />
        <div className="pointer-events-none fixed right-[20%] top-[20%] h-[400px] w-[400px] rounded-full bg-white/5 opacity-20 blur-[80px]" />

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
              <div className="flex h-full flex-col overflow-hidden rounded-2xl border border-white/[0.06] bg-[#0a0a0a]/80">
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
              className="absolute left-0 top-0 flex h-screen w-16 flex-col items-center border-r border-white/[0.06] bg-[#0a0a0a]/40 pt-7"
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
          <div className="flex h-screen flex-1 flex-col gap-6 overflow-y-auto p-6">
            {showCPFView ? (
              /* CPF Simulation View */
              <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-white/[0.06] bg-[#0a0a0a]/80">
                <CPFSimulationView onClose={() => setShowCPFView(false)} />
              </div>
            ) : (
              <>
                {/* Top workspace with chart */}
                <div className="flex min-h-[60vh] min-w-0 shrink-0 flex-col overflow-hidden rounded-2xl bg-transparent">
                  <FinancialWorkspace
                    selectedYear={timeline.selectedYear}
                    onSelectYear={timeline.setSelectedYear}
                    timelineYears={timeline.timelineQuery.data?.years}
                    timelineMonths={timeline.timelineQuery.data?.months}
                    resolution={timeline.resolution}
                    zoomLevel={zoomLevel}
                    onZoomLevelChange={setZoomLevel}
                    overrideYears={timeline.overrideYears}
                    timelineError={timelineError}
                    onOpenCPF={() => setShowCPFView(true)}
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
                    timelineYears={timeline.timelineQuery.data?.years}
                    resolution={timeline.resolution}
                    zoomLevel={zoomLevel}
                    isTimelineLoading={timeline.timelineQuery.isLoading}
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
    </FinancialDataProvider>
  )
}

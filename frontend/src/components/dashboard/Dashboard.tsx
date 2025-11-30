'use client'

import { useRef, useState } from 'react'
import { Menu, X } from 'lucide-react'

import { Chat } from '../chat/Chat'
import { ChatFloatingLauncher } from './ChatFloatingLauncher'
import { FinancialDataManagement } from './FinancialDataManagement'
import { FinancialWorkspace } from './FinancialWorkspace'
import { AppSidebar } from '../sidebar/AppSidebar'
import { useTimeline } from '@/hooks/useTimeline'
import { cn, generateUUID } from '@/lib/utils'
import { FinancialDataProvider } from '@/contexts/FinancialDataContext'

export function Dashboard() {
  const chatIdRef = useRef<string>(generateUUID())
  const chatId = chatIdRef.current
  const [isHistoryOpen, setIsHistoryOpen] = useState(false)
  const [isChatCollapsed, setIsChatCollapsed] = useState(false)
  const timeline = useTimeline()
  const timelineError =
    timeline.timelineQuery.error instanceof Error
      ? timeline.timelineQuery.error.message
      : null

  return (
    <FinancialDataProvider>
      <div className="relative min-h-screen w-full bg-black text-white">
        {/* Top bar with chat toggle */}
        <div className="fixed left-4 top-4 z-50">
          <button
            type="button"
            onClick={() => setIsChatCollapsed((prev) => !prev)}
            aria-pressed={!isChatCollapsed}
            aria-label={isChatCollapsed ? 'Open chat sidebar' : 'Collapse chat sidebar'}
            className="hidden items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-2 text-sm font-semibold text-white transition hover:border-white/30 hover:bg-white/10 lg:flex"
          >
            {isChatCollapsed ? <Menu className="h-4 w-4" /> : <X className="h-4 w-4" />}
          </button>
        </div>

        <div className="hidden lg:block">
          <div
            className={cn(
              'fixed left-0 top-0 z-30 h-screen py-8 transition-all duration-300 ease-out',
              isChatCollapsed ? 'w-[56px] px-1' : 'w-[440px] px-4'
            )}
          >
            <div
              className={cn(
                'relative h-full transition-opacity duration-300 ease-out',
                isChatCollapsed ? 'pointer-events-none opacity-0' : 'opacity-100'
              )}
              aria-hidden={isChatCollapsed}
            >
              <Chat
                chatId={chatId}
                className="h-full min-h-0"
                onToggleHistory={() => setIsHistoryOpen((prev) => !prev)}
                isHistoryOpen={isHistoryOpen}
              />

              <div
                className={cn(
                  'pointer-events-auto absolute inset-y-0 left-[-320px] w-[280px] rounded-2xl border border-white/10 bg-[#02040a] shadow-[0_25px_70px_rgba(3,3,4,0.65)] transition-all duration-300 ease-out',
                  isHistoryOpen
                    ? 'translate-x-[320px] opacity-100'
                    : 'pointer-events-none opacity-0'
                )}
              >
                <AppSidebar />
              </div>
            </div>
          </div>
        </div>

        <div
          className={cn(
            'relative w-full',
            isChatCollapsed ? 'lg:pl-[72px]' : 'lg:pl-[460px]'
          )}
        >
          <div className="relative flex min-h-screen w-full flex-col gap-6 p-4 pl-0 lg:flex-row lg:items-stretch">
            <div className="flex w-full flex-col gap-6 lg:min-w-0 lg:flex-1">
              <div className="flex min-h-[320px] min-w-0 flex-col overflow-hidden rounded-3xl border border-white/5 bg-[#0b1222] shadow-[0_30px_80px_rgba(3,3,4,0.45)]">
                <FinancialWorkspace
                  selectedYear={timeline.selectedYear}
                  onSelectYear={timeline.setSelectedYear}
                  timelineYears={timeline.timelineQuery.data?.years}
                  overrideYears={timeline.overrideYears}
                  timelineError={timelineError}
                />
              </div>

              <div className="min-h-0 min-w-0 flex-1 overflow-hidden rounded-3xl border border-white/5 bg-[#0b1222] shadow-[0_30px_80px_rgba(3,3,4,0.45)]">
                <FinancialDataManagement
                  selectedYear={timeline.selectedYear}
                  onSelectYear={timeline.setSelectedYear}
                  timelineYear={timeline.selectedYearData}
                  isTimelineLoading={timeline.timelineQuery.isLoading}
                  onSaveTimelineEdits={timeline.saveEdits}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="lg:hidden">
        <ChatFloatingLauncher chatId={chatId} />
      </div>
    </FinancialDataProvider>
  )
}

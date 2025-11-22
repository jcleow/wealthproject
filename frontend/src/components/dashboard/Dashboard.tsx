'use client'

import { useMemo, useState } from 'react'

import { Chat } from '../chat/Chat'
import { ChatFloatingLauncher } from './ChatFloatingLauncher'
import { FinancialDataManagement } from './FinancialDataManagement'
import { FinancialWorkspace } from './FinancialWorkspace'
import { AppSidebar } from '../sidebar/AppSidebar'
import { useTimeline } from '@/hooks/useTimeline'
import { cn, generateUUID } from '@/lib/utils'

export function Dashboard() {
  const chatId = useMemo(() => generateUUID(), [])
  const [isHistoryOpen, setIsHistoryOpen] = useState(false)
  const timeline = useTimeline()
  const timelineError =
    timeline.timelineQuery.error instanceof Error
      ? timeline.timelineQuery.error.message
      : null

  return (
    <>
      <div className="relative min-h-screen w-full bg-black text-white">
        <div className="hidden lg:block">
          <div className="fixed left-0 top-0 z-30 h-screen w-[440px] px-4 py-8">
            <div className="relative h-full">
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

        <div className="relative w-full lg:pl-[460px]">
          <div className="relative mx-auto flex min-h-screen w-full max-w-[1600px] flex-col gap-6 p-4 lg:flex-row lg:items-stretch">
            <div className="flex w-full flex-col gap-6 lg:min-w-0 lg:flex-1">
              <div className="flex min-h-[320px] min-w-0 flex-col overflow-hidden rounded-3xl border border-white/5 bg-[#0b1222] shadow-[0_30px_80px_rgba(3,3,4,0.45)]">
                <FinancialWorkspace
                  selectedYear={timeline.selectedYear}
                  onSelectYear={timeline.setSelectedYear}
                  timelineYears={timeline.timelineQuery.data?.years}
                  timelineYear={timeline.selectedYearData}
                  overrideYears={timeline.overrideYears}
                  onSaveTimelineEdits={timeline.saveEdits}
                  isTimelineLoading={timeline.timelineQuery.isLoading}
                  isSavingTimeline={timeline.saving}
                  timelineError={timelineError}
                />
              </div>

              <div className="min-h-0 min-w-0 flex-1 overflow-hidden rounded-3xl border border-white/5 bg-[#0b1222] shadow-[0_30px_80px_rgba(3,3,4,0.45)]">
                <FinancialDataManagement
                  selectedYear={timeline.selectedYear}
                  onSelectYear={timeline.setSelectedYear}
                  timelineYear={timeline.selectedYearData}
                  isTimelineLoading={timeline.timelineQuery.isLoading}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="lg:hidden">
        <ChatFloatingLauncher chatId={chatId} />
      </div>
    </>
  )
}

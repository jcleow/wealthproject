'use client'

import { useState } from 'react'
import { PanelLeftOpen, PanelLeftClose } from 'lucide-react'

import { Chat } from '../chat/Chat'
import { ChatFloatingLauncher } from './ChatFloatingLauncher'
import { FinancialDataManagement } from './FinancialDataManagement'
import { FinancialWorkspace } from './FinancialWorkspace'
import { AppSidebar } from '../sidebar/AppSidebar'
import { cn } from '@/lib/utils'

export function Dashboard() {
  const [chatId] = useState(() => `chat-${Date.now()}`)
  const [isHistoryOpen, setIsHistoryOpen] = useState(false)

  return (
    <>
      <div className="relative min-h-screen w-full bg-[#04060f] text-white">
        {/* Desktop chat */}
        <div className="hidden lg:block">
          <div className="fixed left-0 top-0 z-30 h-screen w-[520px] px-6 py-8">
            <div className="relative h-full">
              <Chat chatId={chatId} className="h-full min-h-0" />

              <button
                type="button"
                aria-label={isHistoryOpen ? 'Hide chat history' : 'Show chat history'}
                className="absolute left-6 top-6 z-10 flex h-10 w-10 items-center justify-center rounded-full border border-white/20 bg-black/40 text-white shadow-lg backdrop-blur transition-colors hover:bg-black/70"
                onClick={() => setIsHistoryOpen((prev) => !prev)}
              >
                {isHistoryOpen ? (
                  <PanelLeftClose className="h-5 w-5" />
                ) : (
                  <PanelLeftOpen className="h-5 w-5" />
                )}
              </button>

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

        <div className="relative w-full lg:pl-[540px]">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(32,101,255,0.12),_transparent_55%)]" />
          <div className="relative mx-auto flex min-h-screen w-full max-w-[1600px] flex-col gap-6 p-4 lg:flex-row lg:items-stretch">
            <div className="flex w-full flex-col gap-6 lg:min-w-0 lg:flex-1">
              <div className="flex min-h-[360px] min-w-0 flex-col overflow-hidden rounded-3xl border border-white/5 bg-[#0b1222] shadow-[0_30px_80px_rgba(3,3,4,0.45)]">
                <FinancialWorkspace />
              </div>

              <div className="min-h-0 min-w-0 flex-1 overflow-hidden rounded-3xl border border-white/5 bg-[#0b1222] shadow-[0_30px_80px_rgba(3,3,4,0.45)]">
                <FinancialDataManagement />
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

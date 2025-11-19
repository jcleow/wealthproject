'use client'

import { useState } from 'react'

import { Chat } from '../chat/Chat'
import { ChatFloatingLauncher } from './ChatFloatingLauncher'
import { FinancialDataManagement } from './FinancialDataManagement'
import { FinancialWorkspace } from './FinancialWorkspace'
import { AppSidebar } from '../sidebar/AppSidebar'

export function Dashboard() {
  const [chatId] = useState(() => `chat-${Date.now()}`)

  return (
    <>
      <div className="flex min-h-screen w-full bg-[#04060f] text-white">
        <div className="hidden w-80 border-r border-white/5 lg:block">
          <AppSidebar />
        </div>

        <div className="relative flex-1 overflow-hidden">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(32,101,255,0.12),_transparent_55%)]" />
          <div className="relative mx-auto flex min-h-screen w-full max-w-[1600px] flex-col gap-6 p-4 lg:flex-row lg:items-stretch">
            <div className="hidden w-full shrink-0 lg:flex lg:w-[420px] lg:max-w-[520px] lg:flex-col">
              <div className="lg:sticky lg:top-4 lg:h-[calc(100vh-2rem)] lg:min-h-[600px]">
                <Chat chatId={chatId} className="h-full min-h-0" />
              </div>
            </div>

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

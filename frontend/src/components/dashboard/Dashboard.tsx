'use client'

import { useState } from 'react'
import { Chat } from '../chat/Chat'
import { FinancialWorkspace } from './FinancialWorkspace'
import { FinancialDataManagement } from './FinancialDataManagement'
import { ChatFloatingLauncher } from './ChatFloatingLauncher'
import { SidebarTrigger } from '@/components/ui/sidebar'

export function Dashboard() {
  const [chatId] = useState(() => `chat-${Date.now()}`)

  return (
    <>
      {/* Main Layout with Chat on LEFT */}
      <div className="flex min-h-screen w-full bg-[#0a0a0f]">
        {/* Chat Area - Fixed width on LEFT side - BLACK background like assetra2 */}
        <div className="hidden w-full shrink-0 lg:flex lg:h-full lg:w-[380px] lg:max-w-[420px]">
          <div className="flex h-full min-h-screen w-full flex-col relative bg-[#0a0a0f]">
            {/* Sidebar trigger pinned to chat */}
            <div className="absolute top-4 left-4 z-20">
              <SidebarTrigger />
            </div>
            <Chat
              chatId={chatId}
              className="h-full"
            />
          </div>
        </div>

        {/* Financial Workspace Area - on RIGHT side */}
        <div className="flex w-full flex-col gap-4 p-4 lg:min-w-0 lg:flex-1">
          {/* Financial Workspace - Net Worth Projection */}
          <div className="flex min-h-[500px] min-w-0 flex-col overflow-hidden rounded-2xl border border-gray-700 bg-gray-900 shadow-[0_20px_60px_rgba(0,0,0,0.15)]">
            <FinancialWorkspace />
          </div>

          {/* Financial Data Management - Cards */}
          <div className="min-h-[300px] min-w-0 flex-1 overflow-hidden rounded-2xl border border-gray-700 bg-gray-900 shadow-[0_20px_60px_rgba(0,0,0,0.15)]">
            <FinancialDataManagement />
          </div>
        </div>
      </div>

      {/* Mobile Chat Launcher - always visible on mobile */}
      <div className="lg:hidden">
        <ChatFloatingLauncher chatId={chatId} />
      </div>
    </>
  )
}
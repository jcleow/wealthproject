'use client'

import { useState } from 'react'
import { Chat } from '../chat/Chat'
import { FinancialWorkspace } from './FinancialWorkspace'
import { FinancialDataManagement } from './FinancialDataManagement'
import { ChatFloatingLauncher } from './ChatFloatingLauncher'
import { AppSidebar } from '../sidebar/AppSidebar'

export function Dashboard() {
  const [chatId] = useState(() => `chat-${Date.now()}`)

  return (
    <>
      <div className="flex min-h-screen w-full bg-[#0a0a0f]">
        {/* Sidebar - Hidden on mobile */}
        <div className="hidden lg:block w-80 h-screen">
          <AppSidebar />
        </div>

        <div className="flex w-full flex-col gap-6 p-4 lg:flex-row lg:items-stretch lg:flex-1">
          {/* Chat Area - Hidden on mobile, shown in sidebar on desktop */}
          <div className="hidden w-full shrink-0 lg:flex lg:h-full lg:w-[380px] lg:max-w-[420px]">
            <div className="flex h-full min-h-[85vh] flex-col">
              <Chat
                chatId={chatId}
                className="h-full"
              />
            </div>
          </div>

          {/* Main Content Area */}
          <div className="flex w-full flex-col gap-4 lg:min-w-0 lg:flex-1">
            {/* Financial Workspace - Net Worth Projection */}
            <div className="flex min-h-[400px] min-w-0 flex-col overflow-hidden rounded-3xl border border-gray-700 bg-gray-900 shadow-[0_30px_80px_rgba(3,3,4,0.45)]">
              <FinancialWorkspace />
            </div>

            {/* Financial Data Management - Cards */}
            <div className="min-h-0 min-w-0 flex-1 overflow-hidden rounded-3xl border border-gray-700 bg-gray-900 shadow-[0_30px_80px_rgba(3,3,4,0.45)]">
              <FinancialDataManagement />
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Chat Launcher */}
      <div className="lg:hidden">
        <ChatFloatingLauncher chatId={chatId} />
      </div>
    </>
  )
}
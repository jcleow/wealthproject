import React from 'react'
import Link from 'next/link'
import { PlusIcon, TrashIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface AppSidebarProps {
  user?: any
}

export function AppSidebar({ user }: AppSidebarProps) {
  return (
    <div className="flex h-full w-full flex-col bg-gray-950 border-r border-gray-800">
      {/* Sidebar Header */}
      <div className="flex flex-row items-center justify-between p-4 border-b border-gray-800">
        <Link className="flex flex-row items-center gap-3" href="/">
          <span className="cursor-pointer rounded-md px-2 font-semibold text-lg text-white hover:bg-gray-800">
            Chatbot
          </span>
        </Link>
        <div className="flex flex-row gap-1">
          {user && (
            <Button
              className="h-8 p-1 text-gray-400 hover:text-white hover:bg-gray-800"
              onClick={() => {}}
              type="button"
              variant="ghost"
            >
              <TrashIcon className="h-4 w-4" />
            </Button>
          )}
          <Button
            className="h-8 p-1 text-gray-400 hover:text-white hover:bg-gray-800"
            onClick={() => {
              // TODO: Implement new chat functionality
            }}
            type="button"
            variant="ghost"
          >
            <PlusIcon className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Sidebar Content */}
      <div className="flex-1 overflow-auto p-4">
        <div className="text-gray-500 text-sm">
          Your conversations will appear here once you start chatting!
        </div>
      </div>

      {/* Sidebar Footer */}
      <div className="border-t border-gray-800 p-4">
        {user && (
          <div className="text-gray-400 text-sm">
            Signed in as {user.name || user.email}
          </div>
        )}
      </div>
    </div>
  )
}
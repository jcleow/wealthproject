'use client'

import React from 'react'
import Link from 'next/link'
import { PlusIcon, TrashIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Sidebar } from '@/components/ui/sidebar'

interface AppSidebarProps {
  user?: any
}

export function AppSidebar({ user }: AppSidebarProps) {
  return (
    <Sidebar variant="inset">
      {/* Sidebar Header */}
      <div className="flex flex-row items-center justify-between p-4 border-b border-sidebar-border">
        <Link className="flex flex-row items-center gap-3" href="/">
          <span className="cursor-pointer rounded-md px-2 font-semibold text-lg text-sidebar-foreground hover:bg-sidebar-accent">
            Chatbot
          </span>
        </Link>
        <div className="flex flex-row gap-1">
          {user && (
            <Button
              className="h-8 p-1 text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent"
              onClick={() => {}}
              type="button"
              variant="ghost"
            >
              <TrashIcon className="h-4 w-4" />
            </Button>
          )}
          <Button
            className="h-8 p-1 text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent"
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
        <div className="text-sidebar-foreground/60 text-sm">
          Your conversations will appear here once you start chatting!
        </div>
      </div>

      {/* Sidebar Footer */}
      <div className="border-t border-sidebar-border p-4">
        {user && (
          <div className="text-sidebar-foreground/60 text-sm">
            Signed in as {user.name || user.email}
          </div>
        )}
      </div>
    </Sidebar>
  )
}
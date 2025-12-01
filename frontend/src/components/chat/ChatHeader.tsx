import { useState } from 'react'
import { Sparkles, LayoutDashboard, History, PanelLeftClose } from 'lucide-react'

interface ChatHeaderProps {
  chatId: string
  onToggleHistory?: () => void
  isHistoryOpen?: boolean
  onCollapse?: () => void
}

export default function ChatHeader({ onToggleHistory, isHistoryOpen: _isHistoryOpen, onCollapse }: ChatHeaderProps) {
  const [activeTab, setActiveTab] = useState<'chat' | 'history'>('chat')

  return (
    <div className="relative z-10 p-6 pb-2">
      {/* Header with branding */}
      <div className="mb-6 flex items-start justify-between">
        <div className="flex items-center gap-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-white/5 bg-gradient-to-br from-zinc-800 to-black shadow-glow">
            <Sparkles className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight text-white">Assetra Chat</h1>            
          </div>
        </div>
        {onCollapse && (
          <button
            onClick={onCollapse}
            className="p-1 text-slate-500 transition-colors hover:text-white"
            title="Collapse chat"
          >
            <PanelLeftClose className="h-5 w-5" />
          </button>
        )}
      </div>

      {/* Navigation tabs */}
      <nav className="flex gap-1 rounded-xl border border-white/5 bg-white/5 p-1 backdrop-blur-md">
        <button
          type="button"
          onClick={() => setActiveTab('chat')}
          className={`flex flex-1 items-center justify-center gap-2 rounded-lg py-2 text-xs font-medium transition ${
            activeTab === 'chat'
              ? 'border border-white/5 bg-white/10 text-white shadow-sm'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <LayoutDashboard className="h-3 w-3" />
          Chat
        </button>
        <button
          type="button"
          onClick={() => {
            setActiveTab('history')
            onToggleHistory?.()
          }}
          className={`flex flex-1 items-center justify-center gap-2 rounded-lg py-2 text-xs font-medium transition ${
            activeTab === 'history'
              ? 'border border-white/5 bg-white/10 text-white shadow-sm'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <History className="h-3 w-3" />
          History
        </button>
      </nav>
    </div>
  )
}

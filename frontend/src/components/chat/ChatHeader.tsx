import { PanelLeftOpen, PanelLeftClose } from 'lucide-react'

interface ChatHeaderProps {
  chatId: string
  onToggleHistory?: () => void
  isHistoryOpen?: boolean
}

export default function ChatHeader({ chatId, onToggleHistory, isHistoryOpen }: ChatHeaderProps) {
  return (
    <div className="border-b border-white/5 px-6 py-6">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-2">
          <h2 className="text-3xl font-semibold text-white">Hello there!</h2>
          <p className="text-base text-gray-400">How can I help you today?</p>
        </div>
        {onToggleHistory && (
          <button
            type="button"
            onClick={onToggleHistory}
            aria-label={isHistoryOpen ? 'Hide chat history' : 'Show chat history'}
            className="rounded-full border border-white/15 bg-black/40 p-2 text-white shadow-md transition-colors hover:bg-black/70"
          >
            {isHistoryOpen ? (
              <PanelLeftClose className="h-5 w-5" />
            ) : (
              <PanelLeftOpen className="h-5 w-5" />
            )}
          </button>
        )}
      </div>
      {/* Chat ID hidden label removed to avoid hydration mismatch */}
    </div>
  )
}

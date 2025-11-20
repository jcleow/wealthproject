import { PanelLeftOpen, PanelLeftClose } from 'lucide-react'

interface ChatHeaderProps {
  chatId: string
  onToggleHistory?: () => void
  isHistoryOpen?: boolean
}

export default function ChatHeader({ chatId, onToggleHistory, isHistoryOpen }: ChatHeaderProps) {
  return (
    <div className="border-b border-white/5 px-6 py-6">
      <div className="relative">
        {onToggleHistory && (
          <button
            type="button"
            onClick={onToggleHistory}
            aria-label={isHistoryOpen ? 'Hide chat history' : 'Show chat history'}
            className="absolute left-0 top-0 z-10 flex h-9 w-9 items-center justify-center rounded-full border border-white/20 bg-black/60 text-white shadow-lg backdrop-blur transition-colors hover:bg-black/80"
          >
            {isHistoryOpen ? (
              <PanelLeftClose className="h-4 w-4" />
            ) : (
              <PanelLeftOpen className="h-4 w-4" />
            )}
          </button>
        )}

        <div className="space-y-2 pt-1 pl-12">
          <h2 className="text-3xl font-semibold text-white">Hello there!</h2>
          <p className="text-base text-gray-400">How can I help you today?</p>
        </div>
      </div>
      {/* Chat ID hidden label removed to avoid hydration mismatch */}
    </div>
  )
}

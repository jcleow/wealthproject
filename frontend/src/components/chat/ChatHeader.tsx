import { History } from 'lucide-react'

interface ChatHeaderProps {
  chatId: string
  isHistoryVisible: boolean
  onToggleHistory: () => void
}

export default function ChatHeader({
  chatId,
  isHistoryVisible,
  onToggleHistory,
}: ChatHeaderProps) {
  return (
    <div className="border-b border-white/5 px-6 py-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-blue-200">
            <span className="text-base" aria-hidden="true">
              🏦
            </span>
            Financial Copilot
          </div>
          <div>
            <h2 className="text-3xl font-semibold text-white">Hello there!</h2>
            <p className="text-base text-gray-400">
              How can I help you today?
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onToggleHistory}
          className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-gray-200 transition hover:bg-white/10"
          aria-pressed={isHistoryVisible}
          aria-label={
            isHistoryVisible
              ? 'Hide conversation history'
              : 'Show conversation history'
          }
        >
          <History className="h-4 w-4" aria-hidden="true" />
          {isHistoryVisible ? 'Hide history' : 'Show history'}
        </button>
      </div>

      {chatId && <span className="sr-only">Chat ID: {chatId}</span>}
    </div>
  )
}

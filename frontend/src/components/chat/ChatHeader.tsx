interface ChatHeaderProps {
  chatId: string
}

export default function ChatHeader({ chatId }: ChatHeaderProps) {
  return (
    <div className="border-b border-white/5 px-6 py-6">
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-blue-200">
          <span className="text-base" aria-hidden="true">
            🏦
          </span>
          Financial Copilot
        </div>
        <div>
          <h2 className="text-3xl font-semibold text-white">Hello there!</h2>
          <p className="text-base text-gray-400">How can I help you today?</p>
        </div>
      </div>
      {chatId && <span className="sr-only">Chat ID: {chatId}</span>}
    </div>
  )
}

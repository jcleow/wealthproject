interface ChatHeaderProps {
  chatId: string
  onToggleHistory?: () => void
  isHistoryOpen?: boolean
}

export default function ChatHeader({ chatId, onToggleHistory, isHistoryOpen }: ChatHeaderProps) {
  return (
    <div className="border-b border-white/5 px-6 py-6">
      <div className="relative">
        {/* <div className="space-y-2 pt-1 pl-12">
          <h2 className="text-3xl font-semibold text-white">Hello there!</h2>
          <p className="text-base text-gray-400">How can I help you today?</p>
        </div> */}
      </div>
      {/* Chat ID hidden label removed to avoid hydration mismatch */}
    </div>
  )
}

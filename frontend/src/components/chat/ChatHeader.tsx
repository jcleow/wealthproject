
interface ChatHeaderProps {
  chatId: string
}

export default function ChatHeader({ chatId }: ChatHeaderProps) {
  return (
    <div className="bg-transparent p-6">
      <h2 className="text-2xl font-semibold text-white mb-1">Hello there!</h2>
      <p className="text-base text-gray-400">How can I help you today?</p>
    </div>
  )
}
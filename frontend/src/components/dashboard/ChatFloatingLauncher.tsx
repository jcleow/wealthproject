import { MessageCircle, X } from 'lucide-react'
import { useState } from 'react'
import { Chat } from '../chat/Chat'

interface ChatFloatingLauncherProps {
  chatId: string
}

export function ChatFloatingLauncher({ chatId }: ChatFloatingLauncherProps) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <>
      {/* Floating Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-white shadow-lg transition-transform hover:scale-110"
          aria-label="Open chat"
        >
          <MessageCircle className="h-6 w-6" />
        </button>
      )}

      {/* Full Screen Chat Modal */}
      {isOpen && (
        <div className="fixed inset-0 z-50 bg-background">
          <div className="relative h-full">
            <button
              onClick={() => setIsOpen(false)}
              className="absolute right-4 top-4 z-10 rounded-full bg-gray-700 p-2 text-white hover:bg-gray-600"
              aria-label="Close chat"
            >
              <X className="h-5 w-5" />
            </button>
            <Chat chatId={chatId} className="h-full" />
          </div>
        </div>
      )}
    </>
  )
}
import { useState } from 'react'
import { useChat } from '@/hooks/useChat'
import { generateUUID, cn } from '@/lib/utils'
import ChatHeader from './ChatHeader'
import Messages from './Messages'
import ChatInput from './ChatInput'

interface ChatProps {
  chatId: string
  className?: string
}

export default function Chat({ chatId, className }: ChatProps) {
  const [sessionId] = useState(() => generateUUID())

  const {
    messages,
    actionReviews,
    status,
    sendMessage,
    confirmAction,
    cancelAction,
    isLoading,
    isDispatching,
  } = useChat({ chatId, sessionId })

  return (
    <div
      className={cn(
        "overscroll-behavior-contain flex h-dvh min-h-0 min-w-0 touch-pan-y flex-col bg-background",
        className
      )}
    >
      <ChatHeader chatId={chatId} />

      <Messages
        messages={messages}
        actionReviews={actionReviews}
        onConfirmAction={confirmAction}
        onCancelAction={cancelAction}
        isDispatching={isDispatching}
      />

      <div className="sticky bottom-0 z-1 mx-auto flex w-full max-w-4xl gap-2 border-t-0 bg-background px-2 pb-3 md:px-4 md:pb-4">
        <ChatInput
          onSendMessage={sendMessage}
          isLoading={isLoading}
          status={status}
        />
      </div>
    </div>
  )
}
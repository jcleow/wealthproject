'use client'

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

const suggestedQuestions = [
  "How much money do I need to retire?",
  "Can I plan a career change?",
  "How much do I need to save for my children's education?",
  "Can I afford to buy a house?"
]

export function Chat({ chatId, className }: ChatProps) {
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

  const handleSuggestedQuestion = (question: string) => {
    sendMessage(question)
  }

  return (
    <div
      className={cn(
        "overscroll-behavior-contain flex h-dvh min-h-0 min-w-0 touch-pan-y flex-col bg-transparent",
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

      {/* Suggested questions - show only when no messages */}
      {messages.length === 0 && (
        <div className="flex-1 flex items-end px-4 pb-4">
          <div className="w-full grid grid-cols-2 gap-2">
            {suggestedQuestions.map((question, index) => (
              <button
                key={index}
                onClick={() => handleSuggestedQuestion(question)}
                className="text-left rounded-2xl border border-gray-800 bg-gray-900/80 px-4 py-3 text-sm text-gray-300 transition-all hover:bg-gray-800 hover:text-white hover:border-gray-700"
              >
                {question}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="sticky bottom-0 z-1 flex w-full gap-2 border-t-0 bg-transparent px-4 pb-4">
        <ChatInput
          onSendMessage={sendMessage}
          isLoading={isLoading}
          status={status}
        />
      </div>
    </div>
  )
}
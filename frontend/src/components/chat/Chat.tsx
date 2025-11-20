'use client'

import { useState } from 'react'
import { useChat } from '@/hooks/useChat'
import { generateUUID, cn } from '@/lib/utils'
import { ToastViewport } from '@/components/ui/toast'
import ChatHeader from './ChatHeader'
import Messages from './Messages'
import ChatInput from './ChatInput'

interface ChatProps {
  chatId: string
  className?: string
  onToggleHistory?: () => void
  isHistoryOpen?: boolean
}

const suggestedQuestions = [
  "How much money do I need to retire?",
  "Can I plan a career change?",
  "How much do I need to save for my children's education?",
  "Can I afford to buy a house?"
]

export function Chat({ chatId, className, onToggleHistory, isHistoryOpen }: ChatProps) {
  const [sessionId] = useState(() => generateUUID())

  const {
    messages,
    actionReviews,
    executionResults,
    notifications,
    status,
    sendMessage,
    confirmAction,
    cancelAction,
    isLoading,
    isDispatching,
    dismissNotification,
  } = useChat({ chatId, sessionId })

  const handleSuggestedQuestion = (question: string) => {
    sendMessage(question)
  }

  return (
    <div
      className={cn(
        "overscroll-behavior-contain flex h-full min-h-0 min-w-0 touch-pan-y flex-col rounded-3xl bg-black text-white shadow-[0_30px_80px_rgba(3,3,4,0.45)] backdrop-blur-xl",
        className
      )}
    >
      <ChatHeader
        chatId={chatId}
        onToggleHistory={onToggleHistory}
        isHistoryOpen={isHistoryOpen}
      />

      <div className="flex min-h-0 flex-1 flex-col px-4 pb-8">
        <Messages
          messages={messages}
          actionReviews={actionReviews}
          executionResults={executionResults}
          onConfirmAction={confirmAction}
          onCancelAction={cancelAction}
          isDispatching={isDispatching}
        />

        {messages.length === 0 && (
          <div className="mt-auto w-full pt-4">
            <div className="grid gap-2 sm:grid-cols-2">
              {suggestedQuestions.map((question, index) => (
                <button
                  key={question}
                  onClick={() => handleSuggestedQuestion(question)}
                  className="text-left rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-gray-200 transition hover:bg-white/10"
                  type="button"
                  style={{ animationDelay: `${index * 60}ms` }}
                >
                  {question}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="px-4 pb-4 pt-4">
        <ChatInput
          onSendMessage={sendMessage}
          isLoading={isLoading}
          status={status}
        />
      </div>

      <ToastViewport
        toasts={notifications}
        onDismiss={dismissNotification}
      />
    </div>
  )
}

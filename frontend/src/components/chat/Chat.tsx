'use client'

import { useEffect, useRef, useState } from 'react'
import { useChat } from '@/hooks/useChat'
import { generateUUID, cn } from '@/lib/utils'
import { ToastViewport } from '@/components/ui/toast'
import ChatHeader from './ChatHeader'
import Messages from './Messages'
import ChatInput, { ChatInputHandle } from './ChatInput'

interface ChatProps {
  chatId: string
  className?: string
  onToggleHistory?: () => void
  isHistoryOpen?: boolean
  onCollapse?: () => void
}

const suggestedQuestions = [
  "How much money do I need to retire?",
  "Can I plan a career change?",
  "How much do I need to save for my children's education?",
  "Can I afford to buy a house?"
]

export function Chat({ chatId, className, onToggleHistory, isHistoryOpen, onCollapse }: ChatProps) {
  const [sessionId] = useState(() => generateUUID())
  const inputRef = useRef<ChatInputHandle>(null)

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

  const focusInput = () => {
    inputRef.current?.focus()
  }

  const lastMessageId = messages[messages.length - 1]?.id ?? ''
  const lastReviewId = actionReviews[actionReviews.length - 1]?.id ?? ''
  const lastExecutionId = executionResults[executionResults.length - 1]?.id ?? ''
  const focusKey = `${messages.length}-${actionReviews.length}-${executionResults.length}-${lastMessageId}-${lastReviewId}-${lastExecutionId}`

  useEffect(() => {
    focusInput()
  }, [focusKey])

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
        onCollapse={onCollapse}
      />

      {/* Chat Area */}
      <div className="custom-scrollbar relative z-10 flex-1 space-y-6 overflow-y-auto px-4 py-4">
        <Messages
          messages={messages}
          actionReviews={actionReviews}
          executionResults={executionResults}
          onConfirmAction={confirmAction}
          onCancelAction={cancelAction}
          isDispatching={isDispatching}
        />
      </div>

      {/* Input Area */}
      <div className="relative z-10 px-4 pb-4 pt-2">
        {/* Suggested prompts as wrapped pills - shown when no messages */}
        {messages.length === 0 && (
          <div className="mb-3 flex flex-wrap gap-2">
            {suggestedQuestions.map((question) => (
              <button
                key={question}
                onClick={() => handleSuggestedQuestion(question)}
                className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-slate-300 shadow-sm backdrop-blur-sm transition-all hover:border-white/20 hover:bg-white/10 hover:text-white hover:shadow-glow"
                type="button"
              >
                {question}
              </button>
            ))}
          </div>
        )}

        <ChatInput
          ref={inputRef}
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

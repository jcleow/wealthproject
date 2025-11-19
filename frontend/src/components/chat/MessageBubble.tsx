'use client'

import { Message } from '@/types/chat'
import { cn } from '@/lib/utils'
import { format } from 'date-fns'
import { Copy, ThumbsUp, ThumbsDown, Sparkles } from 'lucide-react'
import { useState } from 'react'

interface MessageBubbleProps {
  message: Message
}

export default function MessageBubble({ message }: MessageBubbleProps) {
  const isUser = message.role === 'user'
  const [showActions, setShowActions] = useState(false)

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(message.content)
    } catch (err) {
      console.error('Failed to copy text: ', err)
    }
  }

  return (
    <div className="group/message w-full" data-role={message.role}>
      <div className={cn(
        "flex w-full items-start gap-2 md:gap-3",
        {
          "justify-end": message.role === "user",
          "justify-start": message.role === "assistant",
        }
      )}>
        {message.role === "assistant" && (
          <div className="-mt-1 flex size-8 shrink-0 items-center justify-center rounded-full bg-background ring-1 ring-border">
            <Sparkles size={14} className="text-blue-500" />
          </div>
        )}

        <div className={cn(
          "flex flex-col",
          {
            "w-full": message.role === "assistant",
            "max-w-[calc(100%-2.5rem)] sm:max-w-[min(fit-content,80%)]": message.role === "user",
          }
        )}>
          <div className={cn(
            "w-fit break-words rounded-2xl px-3 py-2",
            message.role === "user"
              ? "bg-[#006cff] text-white text-right"
              : "bg-transparent px-0 py-0 text-left text-white"
          )}>
            <div className="whitespace-pre-wrap">
              {message.content}
            </div>
          </div>

          {/* Message Actions */}
          {!isUser && (
            <div className="flex items-center gap-1 mt-1 opacity-0 group-hover/message:opacity-100 transition-opacity">
              <button
                onClick={handleCopy}
                className="flex items-center justify-center w-7 h-7 rounded-lg hover:bg-gray-800 text-gray-400 hover:text-white transition-colors"
                title="Copy"
              >
                <Copy size={14} />
              </button>
              <button
                className="flex items-center justify-center w-7 h-7 rounded-lg hover:bg-gray-800 text-gray-400 hover:text-white transition-colors"
                title="Like"
              >
                <ThumbsUp size={14} />
              </button>
              <button
                className="flex items-center justify-center w-7 h-7 rounded-lg hover:bg-gray-800 text-gray-400 hover:text-white transition-colors"
                title="Dislike"
              >
                <ThumbsDown size={14} />
              </button>
            </div>
          )}

          {isUser && (
            <div className="flex items-center justify-end gap-1 mt-1 opacity-0 group-hover/message:opacity-100 transition-opacity">
              <button
                onClick={handleCopy}
                className="flex items-center justify-center w-7 h-7 rounded-lg hover:bg-gray-800 text-gray-400 hover:text-white transition-colors"
                title="Copy"
              >
                <Copy size={14} />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
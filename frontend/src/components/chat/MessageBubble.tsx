'use client'

import { format } from 'date-fns'
import { Sparkles } from 'lucide-react'

import { cn } from '@/lib/utils'
import { Message } from '@/types/chat'

interface MessageBubbleProps {
  message: Message
}

export default function MessageBubble({ message }: MessageBubbleProps) {
  const isUser = message.role === 'user'

  return (
    <div
      className={cn(
        'flex max-w-full gap-3',
        isUser ? 'justify-end' : 'justify-start'
      )}
    >
      {!isUser && (
        <div className="mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/5">
          <Sparkles className="h-4 w-4 text-blue-200" />
        </div>
      )}

      <div
        className={cn(
          'group relative max-w-[85%] sm:max-w-2xl',
          isUser && 'flex flex-col items-end'
        )}
      >
        <div
          className={cn(
            'rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-lg shadow-black/40',
            isUser
              ? 'bg-[#006cff] text-white'
              : 'border border-white/10 bg-white/5 text-gray-100'
          )}
        >
          <div className="whitespace-pre-wrap break-words">
            {message.content || (!isUser && (
              <span className="italic text-gray-400">
                Sorry, something went wrong. Please try again.
              </span>
            ))}
          </div>
        </div>

        <div
          className={cn(
            'mt-1 text-[11px] text-gray-500 transition-opacity group-hover:opacity-100',
            isUser ? 'text-right' : 'text-left'
          )}
        >
          {format(message.timestamp, 'HH:mm')}
        </div>
      </div>
    </div>
  )
}

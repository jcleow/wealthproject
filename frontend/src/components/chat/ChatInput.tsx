'use client'

import { useState, useRef, KeyboardEvent } from 'react'
import { Square, ArrowUp, Paperclip } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { ChatStatus } from '@/types/chat'
import { cn } from '@/lib/utils'

interface ChatInputProps {
  onSendMessage: (content: string) => void
  isLoading: boolean
  status: ChatStatus
}

export default function ChatInput({
  onSendMessage,
  isLoading,
  status
}: ChatInputProps) {
  const [input, setInput] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const handleSubmit = () => {
    if (!input.trim() || isLoading) return

    onSendMessage(input)
    setInput('')

    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = '44px'
    }
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  const adjustHeight = () => {
    const textarea = textareaRef.current
    if (textarea) {
      textarea.style.height = '44px'
      const scrollHeight = textarea.scrollHeight
      textarea.style.height = `${Math.min(scrollHeight, 200)}px`
    }
  }

  return (
    <div className="relative flex w-full flex-col gap-4">
      <div className="rounded-xl border border-gray-700 bg-gray-900 p-3 shadow-sm transition-all duration-200 focus-within:border-gray-600 hover:border-gray-600">
        <div className="flex flex-row items-start gap-1 sm:gap-2">
          <Textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => {
              setInput(e.target.value)
              adjustHeight()
            }}
            onKeyDown={handleKeyDown}
            placeholder="Send a message..."
            className={cn(
              'flex-grow resize-none border-0 bg-transparent p-2 text-sm text-white outline-none ring-0 placeholder:text-gray-400',
              'focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0',
              'min-h-[44px] max-h-[200px]',
              status === 'loading' && 'opacity-50'
            )}
            disabled={isLoading}
            rows={1}
          />
        </div>

        <div className="flex items-center justify-between pt-2 border-t-0">
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 rounded-lg p-1 text-gray-400 hover:bg-gray-800 hover:text-white"
              disabled={isLoading}
            >
              <Paperclip size={14} />
            </Button>
          </div>

          {status === 'loading' ? (
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 rounded-full bg-gray-700 p-1 text-gray-300 hover:bg-gray-600"
              onClick={() => {}}
            >
              <Square size={14} />
            </Button>
          ) : (
            <Button
              variant="ghost"
              size="sm"
              className={cn(
                "h-8 w-8 rounded-full p-1 transition-colors duration-200",
                input.trim()
                  ? "bg-blue-600 text-white hover:bg-blue-700"
                  : "bg-gray-700 text-gray-400"
              )}
              onClick={handleSubmit}
              disabled={!input.trim() || isLoading}
            >
              <ArrowUp size={14} />
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
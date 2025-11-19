'use client'

import { useState, useRef, KeyboardEvent } from 'react'
import { Send, Square as StopIcon } from 'lucide-react'

import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'
import { ChatStatus } from '@/types/chat'

interface ChatInputProps {
  onSendMessage: (content: string) => void
  isLoading: boolean
  status: ChatStatus
}

export default function ChatInput({
  onSendMessage,
  isLoading,
  status,
}: ChatInputProps) {
  const [input, setInput] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const handleSubmit = () => {
    if (!input.trim() || isLoading) return

    onSendMessage(input)
    setInput('')

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
      textarea.style.height = `${Math.min(textarea.scrollHeight, 200)}px`
    }
  }

  return (
    <div className="flex w-full items-end gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 shadow-xl shadow-black/30">
      <Textarea
        ref={textareaRef}
        value={input}
        onChange={(e) => {
          setInput(e.target.value)
          adjustHeight()
        }}
        onKeyDown={handleKeyDown}
        placeholder={
          status === 'loading' ? 'Processing...' : 'Ask about your finances...'
        }
        className={cn(
          '!min-h-[44px] max-h-[160px] flex-1 resize-none rounded-none border-none bg-transparent px-0 py-0 text-base text-white placeholder:text-gray-500 focus-visible:ring-0',
          status === 'loading' && 'opacity-50'
        )}
        disabled={isLoading}
        rows={1}
      />

      <div className="flex items-center gap-2">
        {status === 'loading' ? (
          <button
            className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 text-gray-300 transition hover:bg-white/10"
            onClick={() => {}}
            type="button"
          >
            <StopIcon className="h-4 w-4" />
          </button>
        ) : (
          <button
            className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-indigo-500 text-white transition disabled:opacity-40"
            onClick={handleSubmit}
            disabled={!input.trim() || isLoading}
            type="button"
          >
            <Send className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  )
}

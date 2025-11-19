import { useState, useRef, KeyboardEvent } from 'react'
import { Send, Square } from 'lucide-react'
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
    <div className="flex w-full items-end gap-2">
      <div className="relative flex-1">
        <Textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => {
            setInput(e.target.value)
            adjustHeight()
          }}
          onKeyDown={handleKeyDown}
          placeholder={
            status === 'loading'
              ? 'Processing...'
              : 'Send a message...'
          }
          className={cn(
            'min-h-[44px] max-h-[200px] resize-none rounded-xl bg-gray-800 border border-gray-700 py-3 pr-12 transition-all text-white placeholder-gray-500',
            'focus:border-gray-600 focus:outline-none',
            status === 'loading' && 'opacity-50'
          )}
          disabled={isLoading}
          rows={1}
        />

        <div className="absolute right-2 bottom-2">
          {status === 'loading' ? (
            <button
              className="h-8 w-8 rounded-full flex items-center justify-center text-gray-400 hover:text-white transition-colors"
              onClick={() => {}}
            >
              <Square className="h-4 w-4" />
            </button>
          ) : (
            <button
              className="h-8 w-8 rounded-full flex items-center justify-center text-gray-400 hover:text-white transition-colors disabled:opacity-50"
              onClick={handleSubmit}
              disabled={!input.trim()}
            >
              <Send className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
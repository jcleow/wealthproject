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
              ? 'Processing your message...'
              : 'Tell me about your financial goals or ask a question...'
          }
          className={cn(
            'min-h-[44px] max-h-[200px] resize-none rounded-2xl border-2 py-3 pr-12 transition-all',
            'focus:border-ring focus:ring-2 focus:ring-ring/20',
            status === 'loading' && 'opacity-50'
          )}
          disabled={isLoading}
          rows={1}
        />

        <div className="absolute right-2 bottom-2">
          {status === 'loading' ? (
            <Button
              size="icon"
              variant="ghost"
              className="h-8 w-8 rounded-full"
              onClick={() => {}}
            >
              <Square className="h-4 w-4" />
            </Button>
          ) : (
            <Button
              size="icon"
              variant="ghost"
              className="h-8 w-8 rounded-full hover:bg-primary hover:text-primary-foreground"
              onClick={handleSubmit}
              disabled={!input.trim()}
            >
              <Send className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
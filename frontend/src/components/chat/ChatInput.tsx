'use client'

import { forwardRef, useState, useRef, KeyboardEvent, useImperativeHandle } from 'react'
import { Send, Square as StopIcon } from 'lucide-react'

import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'
import { ChatStatus } from '@/types/chat'

interface ChatInputProps {
  onSendMessage: (content: string) => void
  isLoading: boolean
  status: ChatStatus
}

function ChatInputBase({
  onSendMessage,
  isLoading,
  status,
}: ChatInputProps, ref: React.Ref<{ focus: () => void }>) {
  const [input, setInput] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useImperativeHandle(ref, () => ({
    focus: () => {
      if (textareaRef.current) {
        textareaRef.current.focus()
      }
    }
  }))

  const handleSubmit = () => {
    if (!input.trim() || isLoading) return

    onSendMessage(input)
    setInput('')

    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.focus()
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
      textarea.style.height = 'auto'
      textarea.style.height = `${Math.min(textarea.scrollHeight, 200)}px`
    }
  }

  return (
    <div className={`flex items-center
w-full
gap-3 px-4 py-3
rounded-2xl border border-white/10
bg-white/5
shadow-xl shadow-black/30`}>
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
          `flex-1
min-h-0 max-h-[160px]
px-0 py-0
rounded-none border-none focus-visible:outline-none focus:outline-none focus-visible:ring-0 focus:ring-0 focus-visible:ring-offset-0 focus:ring-offset-0 focus-visible:outline-offset-0
bg-transparent
text-sm leading-8 text-white placeholder:text-slate-500
resize-none`,
          status === 'loading' && 'opacity-50'
        )}
        disabled={isLoading}
        rows={1}
      />

      <div className="flex items-center gap-2">
        {status === 'loading' ? (
          <button
            className={`p-2
rounded-lg
bg-white/10 hover:bg-white
text-slate-300 hover:text-black
transition-all`}
            onClick={() => {}}
            type="button"
          >
            <StopIcon className="h-4 w-4" />
          </button>
        ) : (
          <button
            className={`p-2
rounded-lg
bg-white/10 hover:bg-white disabled:hover:bg-white/10
text-slate-300 hover:text-black disabled:hover:text-slate-300
disabled:opacity-50
transition-all`}
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

export type ChatInputHandle = { focus: () => void }

const ChatInput = forwardRef<ChatInputHandle, ChatInputProps>(ChatInputBase)
ChatInput.displayName = 'ChatInput'

export default ChatInput

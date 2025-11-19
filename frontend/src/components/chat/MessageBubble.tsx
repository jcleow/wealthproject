import { Message } from '@/types/chat'
import { cn } from '@/lib/utils'
import { format } from 'date-fns'

interface MessageBubbleProps {
  message: Message
}

export default function MessageBubble({ message }: MessageBubbleProps) {
  const isUser = message.role === 'user'

  return (
    <div className={cn(
      "flex gap-3 max-w-full",
      isUser ? "justify-end" : "justify-start"
    )}>
      {!isUser && (
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
          <span className="text-sm font-medium">AI</span>
        </div>
      )}

      <div className={cn(
        "group relative max-w-[85%] sm:max-w-2xl",
        isUser && "flex flex-col items-end"
      )}>
        <div className={cn(
          "rounded-2xl px-4 py-2 text-sm",
          isUser
            ? "bg-primary text-primary-foreground"
            : "bg-muted text-muted-foreground"
        )}>
          <div className="whitespace-pre-wrap break-words">
            {message.content}
          </div>
        </div>

        <div className={cn(
          "mt-1 text-xs text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity",
          isUser && "text-right"
        )}>
          {format(message.timestamp, 'HH:mm')}
        </div>
      </div>

      {isUser && (
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-secondary text-secondary-foreground">
          <span className="text-sm font-medium">You</span>
        </div>
      )}
    </div>
  )
}
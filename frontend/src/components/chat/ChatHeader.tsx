
interface ChatHeaderProps {
  chatId: string
}

export default function ChatHeader({ chatId }: ChatHeaderProps) {
  return (
    <div className="border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="mx-auto flex w-full max-w-4xl items-center justify-between px-2 py-3 md:px-4">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground">
            <span className="text-sm font-medium">$</span>
          </div>
          <div>
            <h1 className="text-lg font-semibold">Financial Chat</h1>
            <p className="text-sm text-muted-foreground">AI-powered financial planning assistant</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="hidden md:flex text-xs text-muted-foreground">
            Chat ID: {chatId.split('-')[1]?.slice(-6) || 'Unknown'}
          </div>
        </div>
      </div>
    </div>
  )
}
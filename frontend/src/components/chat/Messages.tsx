import { Message, ActionReview } from '@/types/chat'
import MessageBubble from './MessageBubble'
import ActionReviewCard from './ActionReviewCard'

interface MessagesProps {
  messages: Message[]
  actionReviews: ActionReview[]
  onConfirmAction: (reviewId: string) => void
  onCancelAction: (reviewId: string) => void
  isDispatching: boolean
}

export default function Messages({
  messages,
  actionReviews,
  onConfirmAction,
  onCancelAction,
  isDispatching
}: MessagesProps) {
  // Combine and sort messages with action reviews by timestamp
  const combinedItems = [
    ...messages.map(msg => ({
      type: 'message' as const,
      data: msg,
      timestamp: msg.timestamp.getTime(),
    })),
    ...actionReviews.map(review => ({
      type: 'review' as const,
      data: review,
      timestamp: review.createdAt,
    }))
  ].sort((a, b) => a.timestamp - b.timestamp)

  return (
    <div className="flex-1 overflow-auto">
      <div className="mx-auto w-full max-w-4xl px-2 py-4 md:px-4">
        <div className="space-y-4">
          {combinedItems.length === 0 && (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <div className="mb-2 text-2xl">💰</div>
                <h3 className="text-lg font-semibold">Welcome to Financial Chat</h3>
                <p className="text-muted-foreground">
                  Start by telling me about your financial goals or asking questions about your finances.
                </p>
              </div>
            </div>
          )}

          {combinedItems.map((item, index) => (
            <div key={`${item.type}-${index}`}>
              {item.type === 'message' ? (
                <MessageBubble message={item.data} />
              ) : (
                <ActionReviewCard
                  review={item.data}
                  onConfirm={onConfirmAction}
                  onCancel={onCancelAction}
                  isProcessing={isDispatching}
                />
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
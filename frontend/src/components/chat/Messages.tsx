import { Message, ActionReview, ExecutionResult } from '@/types/chat'
import { ExecutionResults } from '@/components/financial/ExecutionResults'
import { ExecutionProgress } from '@/components/financial/ExecutionProgress'
import MessageBubble from './MessageBubble'
import ActionReviewCard from './ActionReviewCard'

interface MessagesProps {
  messages: Message[]
  actionReviews: ActionReview[]
  executionResults: ExecutionResult[]
  onConfirmAction: (reviewId: string) => void
  onCancelAction: (reviewId: string) => void
  isDispatching: boolean
}

export default function Messages({
  messages,
  actionReviews,
  executionResults,
  onConfirmAction,
  onCancelAction,
  isDispatching
}: MessagesProps) {
  const combinedItems = [
    ...messages.map((msg) => ({
      type: 'message' as const,
      data: msg,
      timestamp: msg.timestamp.getTime(),
    })),
    ...actionReviews.map((review) => ({
      type: 'review' as const,
      data: review,
      timestamp: review.createdAt,
    })),
    ...executionResults.map((execution) => ({
      type: 'execution' as const,
      data: execution,
      timestamp: execution.createdAt,
    })),
  ].sort((a, b) => a.timestamp - b.timestamp)

  const runningExecution = executionResults.find(result => result.status === 'running')

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-4 px-2 py-4 md:gap-6 md:px-4">
        {combinedItems.length === 0 && (
          <div className="flex items-center justify-center py-12 text-center">
            <div className="space-y-2">
              <div className="text-3xl">💡</div>
              <h3 className="text-xl font-semibold text-white">Welcome to Financial Chat</h3>
              <p className="text-sm text-gray-400">
                Tell me about your financial goals or ask questions about your finances to get started.
              </p>
            </div>
          </div>
        )}

        {runningExecution && (
          <ExecutionProgress
            actionCount={runningExecution.actions.length}
          />
        )}

        {combinedItems.map((item, index) => (
          <div key={`${item.type}-${index}`}>
            {item.type === 'message' ? (
              <MessageBubble message={item.data} />
            ) : item.type === 'review' ? (
              <ActionReviewCard
                review={item.data}
                onConfirm={onConfirmAction}
                onCancel={onCancelAction}
                isProcessing={isDispatching}
              />
            ) : (
              <ExecutionResults execution={item.data} />
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

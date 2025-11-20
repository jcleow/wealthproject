import { useState, useCallback } from 'react'
import { useMutation } from '@tanstack/react-query'
import { apiService, ApiError } from '@/services/api'
import { Message, ActionReview, ChatStatus } from '@/types/chat'
import { generateUUID } from '@/lib/utils'

interface UseChatProps {
  chatId: string
  sessionId: string
  initialMessages?: Message[]
}

export function useChat({ chatId, sessionId, initialMessages = [] }: UseChatProps) {
  const [messages, setMessages] = useState<Message[]>(initialMessages)
  const [actionReviews, setActionReviews] = useState<ActionReview[]>([])
  const [status, setStatus] = useState<ChatStatus>('idle')

  const sendMessageMutation = useMutation({
    mutationFn: async (content: string) => {
      return apiService.sendMessage({
        message: content,
        chat_id: chatId,
        session_id: sessionId,
      })
    },
    onSuccess: (response, content) => {
      // Add assistant response to messages
      setMessages(prev => [
        ...prev,
        {
          id: response.message_id,
          role: 'assistant',
          content: response.content,
          timestamp: new Date(),
        }
      ])

      // If there are proposed actions, create action review
      const proposedActions = Array.isArray(response?.proposed_actions) ? response.proposed_actions : []
      if (proposedActions.length > 0) {
        setActionReviews(prev => [
          ...prev,
          {
            id: generateUUID(),
            message: content,
            actions: proposedActions,
            status: 'pending',
            createdAt: Date.now(),
          }
        ])
      }
    },
    onError: (error: ApiError) => {
      // Add error message to chat
      setMessages(prev => [
        ...prev,
        {
          id: generateUUID(),
          role: 'assistant',
          content: `Error: ${error.message}`,
          timestamp: new Date(),
        }
      ])
    },
  })

  const dispatchActionsMutation = useMutation({
    mutationFn: async (reviewId: string) => {
      const review = actionReviews.find(r => r.id === reviewId)
      if (!review) throw new Error('Review not found')

      return apiService.dispatchActions({
        selected_actions: review.actions.map(action => ({
          call_id: action.call_id,
          approved: true,
        })),
        session_id: sessionId,
      })
    },
    onSuccess: (response, reviewId) => {
      // Mark review as confirmed
      setActionReviews(prev =>
        prev.map(review =>
          review.id === reviewId
            ? { ...review, status: 'confirmed' as const }
            : review
        )
      )

      // Add confirmation message
      const successCount = response.summary.successful
      const totalCount = response.summary.successful + response.summary.failed

      setMessages(prev => [
        ...prev,
        {
          id: generateUUID(),
          role: 'assistant',
          content: `Successfully applied ${successCount}/${totalCount} changes to your financial plan.`,
          timestamp: new Date(),
        }
      ])
    },
    onError: (error: ApiError) => {
      // Add error message
      setMessages(prev => [
        ...prev,
        {
          id: generateUUID(),
          role: 'assistant',
          content: `Failed to apply changes: ${error.message}`,
          timestamp: new Date(),
        }
      ])
    },
  })

  const sendMessage = useCallback((content: string) => {
    if (!content.trim()) return

    // Add user message immediately
    const userMessage: Message = {
      id: generateUUID(),
      role: 'user',
      content: content.trim(),
      timestamp: new Date(),
    }

    setMessages(prev => [...prev, userMessage])
    setStatus('loading')

    // Send to backend
    sendMessageMutation.mutate(content.trim(), {
      onSettled: () => {
        setStatus('idle')
      },
    })
  }, [sendMessageMutation])

  const confirmAction = useCallback((reviewId: string) => {
    dispatchActionsMutation.mutate(reviewId)
  }, [dispatchActionsMutation])

  const cancelAction = useCallback((reviewId: string) => {
    setActionReviews(prev =>
      prev.map(review =>
        review.id === reviewId
          ? { ...review, status: 'cancelled' as const }
          : review
      )
    )

    // Add cancellation message
    setMessages(prev => [
      ...prev,
      {
        id: generateUUID(),
        role: 'assistant',
        content: "I've cancelled those changes. Feel free to rephrase your request if needed.",
        timestamp: new Date(),
      }
    ])
  }, [])

  return {
    messages,
    actionReviews,
    status,
    sendMessage,
    confirmAction,
    cancelAction,
    isLoading: sendMessageMutation.isPending || dispatchActionsMutation.isPending,
    isDispatching: dispatchActionsMutation.isPending,
  }
}

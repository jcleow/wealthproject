import { useState, useCallback } from 'react'
import { useMutation } from '@tanstack/react-query'
import { apiService, ApiError } from '@/services/api'
import { Message, ActionReview, ChatStatus, ExecutionResult, ChatNotification } from '@/types/chat'
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
  const [executionResults, setExecutionResults] = useState<ExecutionResult[]>([])
  const [notifications, setNotifications] = useState<ChatNotification[]>([])

  const addNotification = useCallback((notification: Omit<ChatNotification, 'id'>) => {
    setNotifications(prev => [...prev, { ...notification, id: generateUUID() }])
  }, [])

  const dismissNotification = useCallback((id: string) => {
    setNotifications(prev => prev.filter(note => note.id !== id))
  }, [])

  const sendMessageMutation = useMutation({
    mutationFn: async (content: string) => {
      return apiService.sendMessage({
        message: content,
        chat_id: chatId,
        session_id: sessionId,
      })
    },
    onSuccess: (response, content) => {
      const now = Date.now()

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
            createdAt: now,
          }
        ])
      }

      // Add assistant response to messages after preview so it appears below
      setMessages(prev => [
        ...prev,
        {
          id: response.message_id,
          role: 'assistant',
          content: response.content,
          timestamp: new Date(proposedActions.length > 0 ? now + 1 : now),
        }
      ])
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
    onMutate: (reviewId: string) => {
      setStatus('loading')

      const review = actionReviews.find(r => r.id === reviewId)
      if (!review) return

      setExecutionResults(prev => {
        const alreadyExists = prev.some(exec => exec.reviewId === reviewId)
        if (alreadyExists) {
          return prev.map(exec =>
            exec.reviewId === reviewId
              ? { ...exec, status: 'running', createdAt: Date.now() }
              : exec
          )
        }

        return [
          ...prev,
          {
            id: generateUUID(),
            reviewId,
            status: 'running',
            createdAt: Date.now(),
            actions: review.actions.map(action => ({ ...action })),
          }
        ]
      })
    },
    onSuccess: (response, reviewId) => {
      setStatus('idle')
      const summary = response.summary
      const totalCount = summary.successful + summary.failed
      const failureCount = summary.failed

      setActionReviews(prev =>
        prev.map(review =>
          review.id === reviewId
            ? { ...review, status: 'confirmed' as const }
            : review
        )
      )

      setExecutionResults(prev =>
        prev.map(exec =>
          exec.reviewId === reviewId
            ? {
                ...exec,
                status: 'completed' as const,
                summary,
                actions: exec.actions.map(action => {
                  const result = response.results.find(r => r.call_id === action.call_id)
                  return {
                    ...action,
                    success: result?.success ?? true,
                    entity_id: result?.entity_id,
                    error: result?.error,
                  }
                }),
              }
            : exec
        )
      )

      setMessages(prev => [
        ...prev,
        {
          id: generateUUID(),
          role: 'assistant',
          content: failureCount > 0
            ? `Dispatched ${summary.successful}/${totalCount} actions. ${failureCount} failed: please review the results.`
            : `Successfully applied ${summary.successful}/${totalCount} changes to your financial plan.`,
          timestamp: new Date(),
        }
      ])

      addNotification({
        type: failureCount > 0 ? 'error' : 'success',
        title: failureCount > 0 ? 'Dispatch completed with issues' : 'Actions dispatched',
        description: failureCount > 0
          ? `${summary.successful} succeeded, ${failureCount} failed`
          : `All ${totalCount} actions succeeded`,
      })

      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('financial-data-refresh'))
      }
    },
    onError: (error: ApiError, reviewId) => {
      setStatus('error')

      setExecutionResults(prev =>
        prev.map(exec =>
          exec.reviewId === reviewId
            ? { ...exec, status: 'failed' as const, errorMessage: error.message }
            : exec
        )
      )

      setMessages(prev => [
        ...prev,
        {
          id: generateUUID(),
          role: 'assistant',
          content: `Failed to apply changes: ${error.message}`,
          timestamp: new Date(),
        }
      ])
      addNotification({
        type: 'error',
        title: 'Action dispatch failed',
        description: error.message,
      })
    },
    onSettled: () => {
      setStatus('idle')
    }
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
    executionResults,
    notifications,
    status,
    sendMessage,
    confirmAction,
    cancelAction,
    dismissNotification,
    isLoading: sendMessageMutation.isPending || dispatchActionsMutation.isPending,
    isDispatching: dispatchActionsMutation.isPending,
  }
}

import { ProposedAction } from './api'

export interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
}

export interface ActionReview {
  id: string
  message: string
  actions: ProposedAction[]
  status: 'pending' | 'confirmed' | 'cancelled'
  createdAt: number
}

export interface ActionExecution extends ProposedAction {
  success?: boolean
  entity_id?: string
  error?: string
}

export interface ExecutionResult {
  id: string
  reviewId: string
  status: 'running' | 'completed' | 'failed'
  createdAt: number
  summary?: {
    successful: number
    failed: number
    total_execution_time_ms?: number
  }
  actions: ActionExecution[]
  errorMessage?: string
}

export type ChatStatus = 'idle' | 'loading' | 'error'

export interface ChatNotification {
  id: string
  type: 'success' | 'error' | 'info'
  title: string
  description?: string
}

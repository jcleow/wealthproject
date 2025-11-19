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

export type ChatStatus = 'idle' | 'loading' | 'error'
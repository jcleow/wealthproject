// API Types for Go Backend Integration

export interface ChatRequest {
  message: string
  chat_id: string
  session_id: string
}

export interface ChatResponse {
  message_id: string
  content: string
  proposed_actions: ProposedAction[]
  requires_approval: boolean
  actions_executed?: number
}

export interface ProposedAction {
  call_id: string
  tool_name: string
  friendly_description: string
  parameters: Record<string, unknown>
  estimated_impact: {
    net_worth_change: number
    description: string
  }
  warnings?: Array<{
    type: string
    message: string
    severity: "low" | "medium" | "high"
  }>
}

export interface DispatchRequest {
  selected_actions: Array<{
    call_id: string
    approved: boolean
    modified_args?: Record<string, unknown>
  }>
  session_id: string
}

export interface DispatchResponse {
  results: Array<{
    call_id: string
    success: boolean
    entity_id?: string
    error?: string
  }>
  summary: {
    successful: number
    failed: number
    total_execution_time_ms: number
  }
}
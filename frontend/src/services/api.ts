import { ChatRequest, ChatResponse, DispatchRequest, DispatchResponse } from '@/types/api'

function getApiBaseUrl() {
  // Use relative path - requests go through Next.js BFF at /api/v1/*
  // which handles auth and proxies to the Go backend
  return '/api/v1'
}

const API_BASE_URL = getApiBaseUrl()


class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message)
    this.name = 'ApiError'
  }
}

async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`

  const response = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  })

  if (!response.ok) {
    let errorMessage = `HTTP ${response.status}`
    try {
      const errorData = await response.json()
      errorMessage = errorData.message || errorMessage
    } catch {
      // If we can't parse the error, use status text
      errorMessage = response.statusText || errorMessage
    }
    throw new ApiError(response.status, errorMessage)
  }

  return response.json()
}

export const apiService = {
  async sendMessage(request: ChatRequest): Promise<ChatResponse> {
    return apiRequest<ChatResponse>('/chat', {
      method: 'POST',
      body: JSON.stringify(request),
    })
  },

  async dispatchActions(request: DispatchRequest): Promise<DispatchResponse> {
    return apiRequest<DispatchResponse>('/financial/actions/dispatch', {
      method: 'POST',
      body: JSON.stringify(request),
    })
  },
}

export { ApiError }

import { ChatRequest, ChatResponse, DispatchRequest, DispatchResponse } from '@/types/api'

const API_BASE_URL =
  process.env.NEXT_PUBLIC_GO_BACKEND_BASE_URL?.trim() || '/api/v1'

console.log('Environment variable NEXT_PUBLIC_GO_BACKEND_BASE_URL:', process.env.NEXT_PUBLIC_GO_BACKEND_BASE_URL)
console.log('Using API_BASE_URL:', API_BASE_URL)

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

  console.log('Making API request to:', url)
  console.log('Request options:', options)

  try {
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    })

    console.log('Response status:', response.status)
    console.log('Response headers:', response.headers)

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
  } catch (error) {
    console.error('Fetch error:', error)
    throw error
  }
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

import type { TimelineEditRequest, TimelineResponse } from '@/types/timeline'

function getApiBaseUrl() {
  const envURL = process.env.NEXT_PUBLIC_GO_BACKEND_BASE_URL?.trim()
  if (envURL) {
    return envURL.endsWith('/api/v1') ? envURL : `${envURL.replace(/\/$/, '')}/api/v1`
  }

  // Default to local Go server
  return 'http://localhost:8080/api/v1'
}

const API_BASE = getApiBaseUrl()

async function jsonRequest<T>(path: string, options: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  })

  if (!res.ok) {
    const fallbackMessage = res.statusText || `HTTP ${res.status}`
    try {
      const errorData = await res.json()
      const message = (errorData as { message?: string }).message ?? fallbackMessage
      throw new Error(message)
    } catch {
      throw new Error(fallbackMessage)
    }
  }

  if (res.status === 204) {
    return undefined as unknown as T
  }

  return res.json() as Promise<T>
}

export const timelineApi = {
  async getTimeline(): Promise<TimelineResponse> {
    return jsonRequest<TimelineResponse>('/financial/timeline', { method: 'GET' })
  },

  async putTimeline(year: number, payload: TimelineEditRequest): Promise<TimelineResponse> {
    return jsonRequest<TimelineResponse>(`/financial/timeline/${year}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    })
  },
}

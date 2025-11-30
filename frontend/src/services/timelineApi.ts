import type { TimelineEditRequest, TimelineResponse } from '@/types/timeline'

function getApiBaseUrl() {
  // Use relative path - requests go through Next.js BFF at /api/v1/*
  // which handles auth and proxies to the Go backend
  return '/api/v1'
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
  async getTimeline(options?: { includeScenarios?: boolean; scenarioIds?: string[] }): Promise<TimelineResponse> {
    const params = new URLSearchParams()
    if (options?.includeScenarios) {
      params.set('include_scenarios', 'true')
    }
    if (options?.scenarioIds?.length) {
      params.set('scenario_ids', options.scenarioIds.join(','))
    }
    const query = params.toString() ? `?${params.toString()}` : ''
    return jsonRequest<TimelineResponse>(`/financial/timeline${query}`, { method: 'GET' })
  },

  async putTimeline(year: number, payload: TimelineEditRequest): Promise<TimelineResponse> {
    return jsonRequest<TimelineResponse>(`/financial/timeline/${year}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    })
  },
}

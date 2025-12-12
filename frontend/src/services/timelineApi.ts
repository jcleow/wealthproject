import type { TimelineEditRequest, TimelineResponse, TimelineV2Response } from '@/types/timeline'

function getApiBaseUrl(version: 'v1' | 'v2' = 'v1') {
  // Use relative path - requests go through Next.js BFF at /api/v1/* or /api/v2/*
  // which handles auth and proxies to the Go backend
  return `/api/${version}`
}

const API_BASE = getApiBaseUrl('v1')
const API_BASE_V2 = getApiBaseUrl('v2')

async function jsonRequest<T>(
  path: string,
  options: RequestInit,
  baseUrl: string = API_BASE
): Promise<T> {
  const res = await fetch(`${baseUrl}${path}`, {
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
  async getTimeline(options?: {
    resolution?: 'yearly' | 'monthly'
    includeScenarios?: boolean
    scenarioIds?: string[]
  }): Promise<TimelineResponse> {
    const params = new URLSearchParams()
    if (options?.resolution) {
      params.set('resolution', options.resolution)
    }
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

  /**
   * Get V2 timeline snapshot for a date range
   * @param startDate - Start date in DD-MM-YYYY format
   * @param endDate - End date in DD-MM-YYYY format (optional, defaults to startDate)
   */
  async getTimelineV2Snapshot(options: {
    startDate: string
    endDate?: string
  }): Promise<TimelineV2Response> {
    const params = new URLSearchParams()
    params.set('startDate', options.startDate)
    if (options.endDate) {
      params.set('endDate', options.endDate)
    }
    return jsonRequest<TimelineV2Response>(
      `/financial/timeline/snapshot?${params.toString()}`,
      { method: 'GET' },
      API_BASE_V2
    )
  },
}

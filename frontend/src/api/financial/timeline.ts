import { apiClient } from '../client'
import type { TimelineEditRequest, TimelineResponse } from '@/types/timeline'
import type { TimelineResponse as ApiTimelineResponse } from '@/types/api.aliases'

export async function getTimeline(options: { includeScenarios?: boolean } = {}): Promise<TimelineResponse> {
  const params = new URLSearchParams()
  if (options.includeScenarios ?? true) {
    params.set('include_scenarios', 'true')
  }
  const query = params.toString() ? `?${params.toString()}` : ''
  // Cast from API response type to frontend type (same shape but frontend type has stricter requirements)
  return apiClient.get<ApiTimelineResponse>(`/financial/timeline${query}`) as Promise<TimelineResponse>
}

export async function updateTimelineYear(request: TimelineEditRequest): Promise<TimelineResponse> {
  return apiClient.put<TimelineResponse>(`/financial/timeline/${request.year}`, {
    edits: request.edits,
    note: request.note,
  })
}

export const timelineApi = {
  getTimeline,
  updateTimelineYear,
}

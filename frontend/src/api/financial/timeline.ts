import { apiClient } from '../client'
import type { TimelineEditRequest, TimelineResponse } from '@/types/timeline'

export async function getTimeline(options: { includeScenarios?: boolean } = {}): Promise<TimelineResponse> {
  const params = new URLSearchParams()
  if (options.includeScenarios ?? true) {
    params.set('include_scenarios', 'true')
  }
  const query = params.toString() ? `?${params.toString()}` : ''
  return apiClient.get<TimelineResponse>(`/financial/timeline${query}`)
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

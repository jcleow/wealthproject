import type { PaginationParams, SortParams } from '@/types/financial'

export function buildPaginatedPath(path: string, params?: PaginationParams & SortParams): string {
  if (!params) return path
  const search = new URLSearchParams()
  if (params.limit !== undefined) search.set('limit', params.limit.toString())
  if (params.offset !== undefined) search.set('offset', params.offset.toString())
  if (params.sortBy) search.set('sortBy', params.sortBy)
  if (params.sortDir) search.set('sortDir', params.sortDir)
  const query = search.toString()
  return query ? `${path}?${query}` : path
}

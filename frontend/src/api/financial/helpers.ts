import type { PaginationParams } from '@/types/financial'

export function buildPaginatedPath(path: string, params?: PaginationParams): string {
  if (!params) return path
  const search = new URLSearchParams()
  if (params.limit !== undefined) search.set('limit', params.limit.toString())
  if (params.offset !== undefined) search.set('offset', params.offset.toString())
  const query = search.toString()
  return query ? `${path}?${query}` : path
}

export class ApiError extends Error {
  status: number
  data?: unknown

  constructor(status: number, message: string, data?: unknown) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.data = data
  }
}

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'

export interface ApiRequestOptions {
  method?: HttpMethod
  params?: Record<string, unknown>
  body?: unknown
  headers?: Record<string, string>
  baseUrl?: string
}

const DEFAULT_BASE_URL = '/api/v1'

function buildUrl(path: string, params?: Record<string, unknown>, baseUrl: string = DEFAULT_BASE_URL): string {
  const url = new URL(path, 'http://local-placeholder')
  const search = new URLSearchParams(url.searchParams)

  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value === undefined || value === null) return
      if (Array.isArray(value)) {
        search.set(key, JSON.stringify(value))
        return
      }
      search.set(key, String(value))
    })
  }

  const searchString = search.toString()
  const fullPath = `${baseUrl}${url.pathname}${searchString ? `?${searchString}` : ''}`
  return fullPath
}

export async function apiFetch<T>(path: string, options: ApiRequestOptions = {}): Promise<T> {
  const { method = 'GET', params, body, headers, baseUrl = DEFAULT_BASE_URL } = options
  const url = buildUrl(path, params, baseUrl)
  const mergedHeaders = {
    'Content-Type': 'application/json',
    ...headers,
  }

  const response = await fetch(url, {
    method,
    headers: mergedHeaders,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  } satisfies RequestInit)

  if (!response.ok) {
    const status = response.status
    const fallbackMessage = response.statusText || `HTTP ${status}`
    try {
      const data = await response.json()
      const message = (data as { message?: string; error?: string }).message ?? (data as any).error ?? fallbackMessage
      throw new ApiError(status, message, data)
    } catch {
      throw new ApiError(status, fallbackMessage)
    }
  }

  if (response.status === 204) {
    return undefined as unknown as T
  }

  return response.json() as Promise<T>
}

export const apiClient = {
  get: <T>(path: string, params?: Record<string, unknown>, opts?: Omit<ApiRequestOptions, 'method' | 'params'>) =>
    apiFetch<T>(path, { ...opts, params, method: 'GET' }),
  post: <T>(path: string, body?: unknown, opts?: Omit<ApiRequestOptions, 'method' | 'body'>) =>
    apiFetch<T>(path, { ...opts, body, method: 'POST' }),
  put: <T>(path: string, body?: unknown, opts?: Omit<ApiRequestOptions, 'method' | 'body'>) =>
    apiFetch<T>(path, { ...opts, body, method: 'PUT' }),
  patch: <T>(path: string, body?: unknown, opts?: Omit<ApiRequestOptions, 'method' | 'body'>) =>
    apiFetch<T>(path, { ...opts, body, method: 'PATCH' }),
  delete: <T>(path: string, opts?: Omit<ApiRequestOptions, 'method'>) =>
    apiFetch<T>(path, { ...opts, method: 'DELETE' }),
}

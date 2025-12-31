import { SignJWT } from 'jose'
import { getSession } from './auth-client'

// SECURITY: Enforce HTTPS in production to prevent man-in-the-middle attacks
function getBackendUrl(): string {
  const url = process.env.GO_BACKEND_URL

  if (process.env.NODE_ENV === 'production') {
    if (!url) {
      throw new Error('SECURITY ERROR: GO_BACKEND_URL must be configured in production')
    }
    if (!url.startsWith('https://')) {
      throw new Error('SECURITY ERROR: GO_BACKEND_URL must use HTTPS in production')
    }
  }

  return url || 'http://localhost:8080'
}

const BACKEND_URL = getBackendUrl()
const BACKEND_SECRET = process.env.BACKEND_SHARED_SECRET || ''

/**
 * Creates a signed token for authenticating with the Go backend.
 * Uses HMAC-SHA256 to sign the user_id and timestamp.
 */
async function createBackendToken(userId: string): Promise<string> {
  const secret = new TextEncoder().encode(BACKEND_SECRET)

  const token = await new SignJWT({
    sub: userId,
    iat: Math.floor(Date.now() / 1000),
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('5m') // Token valid for 5 minutes
    .sign(secret)

  return token
}

interface BackendRequestOptions extends RequestInit {
  userId?: string
}

/**
 * Makes an authenticated request to the Go backend.
 * Automatically includes HMAC-signed headers for the authenticated user.
 */
export async function backendFetch(
  path: string,
  options: BackendRequestOptions = {}
): Promise<Response> {
  const { userId, headers: customHeaders, ...fetchOptions } = options

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(customHeaders as Record<string, string>),
  }

  // If userId provided, sign the request
  if (userId) {
    const token = await createBackendToken(userId)
    headers['X-Auth-Token'] = token
  }

  const url = `${BACKEND_URL}${path}`

  return fetch(url, {
    ...fetchOptions,
    headers,
  })
}

/**
 * Makes an authenticated request using the current session.
 * Use this in API routes where you have access to the session.
 */
export async function authenticatedBackendFetch(
  path: string,
  options: Omit<BackendRequestOptions, 'userId'> = {}
): Promise<Response> {
  // Get session from BetterAuth
  const session = await getSession()

  if (!session?.data?.user?.id) {
    throw new Error('Not authenticated')
  }

  return backendFetch(path, {
    ...options,
    userId: session.data.user.id,
  })
}

// Convenience methods
export const backend = {
  get: (path: string, userId?: string) =>
    backendFetch(path, { method: 'GET', userId }),

  post: (path: string, body: unknown, userId?: string) =>
    backendFetch(path, {
      method: 'POST',
      body: JSON.stringify(body),
      userId,
    }),

  put: (path: string, body: unknown, userId?: string) =>
    backendFetch(path, {
      method: 'PUT',
      body: JSON.stringify(body),
      userId,
    }),

  delete: (path: string, userId?: string) =>
    backendFetch(path, { method: 'DELETE', userId }),
}

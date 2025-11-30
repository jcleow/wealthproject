import { NextRequest } from 'next/server'
import { auth } from '@/lib/auth'
import { headers } from 'next/headers'
import { SignJWT } from 'jose'

const BACKEND_URL = process.env.GO_BACKEND_URL || 'http://localhost:8080'
const BACKEND_SECRET = process.env.BACKEND_SHARED_SECRET || ''

/**
 * Creates a signed HMAC token for authenticating with the Go backend.
 */
async function createBackendToken(userId: string): Promise<string> {
  const secret = new TextEncoder().encode(BACKEND_SECRET)

  const token = await new SignJWT({
    sub: userId,
    iat: Math.floor(Date.now() / 1000),
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('5m')
    .sign(secret)

  return token
}

/**
 * Proxies authenticated requests to the Go backend.
 * Validates the session, signs the request with HMAC, and forwards it.
 */
async function proxyToBackend(
  request: NextRequest,
  path: string
): Promise<Response> {
  console.log(`[BFF] ${request.method} /api/v1/${path}`)

  // Get session from BetterAuth
  const session = await auth.api.getSession({ headers: await headers() })

  if (!session?.user?.id) {
    return Response.json(
      { error: 'Unauthorized', message: 'Authentication required' },
      { status: 401 }
    )
  }

  // Create HMAC-signed token
  const token = await createBackendToken(session.user.id)

  // Build backend URL with query parameters
  const queryString = request.nextUrl.search
  const backendUrl = `${BACKEND_URL}/api/v1/${path}${queryString}`

  // Forward the request with auth headers
  const backendHeaders: Record<string, string> = {
    'Content-Type': request.headers.get('Content-Type') || 'application/json',
    'X-User-ID': session.user.id,
    'X-Auth-Token': token,
  }

  // Copy other relevant headers
  const forwardHeaders = ['Accept', 'Accept-Language']
  for (const header of forwardHeaders) {
    const value = request.headers.get(header)
    if (value) {
      backendHeaders[header] = value
    }
  }

  const fetchOptions: RequestInit = {
    method: request.method,
    headers: backendHeaders,
  }

  // Include body for non-GET requests
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    fetchOptions.body = await request.text()
  }

  try {
    const response = await fetch(backendUrl, fetchOptions)

    // Create response with backend's status and headers
    const responseHeaders = new Headers()
    response.headers.forEach((value, key) => {
      // Skip headers that shouldn't be forwarded
      if (!['transfer-encoding', 'connection'].includes(key.toLowerCase())) {
        responseHeaders.set(key, value)
      }
    })

    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: responseHeaders,
    })
  } catch (error) {
    console.error('Backend proxy error:', error)
    return Response.json(
      { error: 'Bad Gateway', message: 'Failed to connect to backend' },
      { status: 502 }
    )
  }
}

// Route handlers for all HTTP methods
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params
  return proxyToBackend(request, path.join('/'))
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params
  return proxyToBackend(request, path.join('/'))
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params
  return proxyToBackend(request, path.join('/'))
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params
  return proxyToBackend(request, path.join('/'))
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params
  return proxyToBackend(request, path.join('/'))
}

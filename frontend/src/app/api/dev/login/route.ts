import { NextRequest } from 'next/server'
import { auth } from '@/lib/auth'

/**
 * Dev-only login endpoint for curl/API testing.
 * Returns the session token in JSON instead of just Set-Cookie.
 *
 * Usage:
 *   curl -X POST http://localhost:3000/api/dev/login \
 *     -H "Content-Type: application/json" \
 *     -d '{"email":"dev@test.com","password":"password123"}'
 *
 * Response: { "token": "...", "userId": "...", "email": "..." }
 *
 * Then use the token:
 *   curl -b "better-auth.session_token=<token>" http://localhost:3000/api/v2/cash-accounts
 */

export async function POST(request: NextRequest) {
  // Block in production
  if (process.env.NODE_ENV === 'production') {
    return new Response(null, { status: 404 })
  }

  try {
    const body = await request.json()
    const { email, password } = body

    if (!email || !password) {
      return Response.json(
        { error: 'Missing email or password' },
        { status: 400 }
      )
    }

    // Call BetterAuth sign-in API
    const signInResponse = await auth.api.signInEmail({
      body: { email, password },
    })

    if (!signInResponse?.token) {
      return Response.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      )
    }

    // Return token and user info in JSON
    return Response.json({
      token: signInResponse.token,
      userId: signInResponse.user.id,
      email: signInResponse.user.email,
      cookieName: 'better-auth.session_token',
      usage: `curl -b "better-auth.session_token=${signInResponse.token}" http://localhost:3000/api/v2/...`,
    })
  } catch (error) {
    console.error('[Dev Login] Error:', error)
    return Response.json(
      { error: error instanceof Error ? error.message : 'Login failed' },
      { status: 401 }
    )
  }
}

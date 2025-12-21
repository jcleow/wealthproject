import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'

// Public routes - no auth required
const publicRoutes = ['/', '/home', '/api/auth']

// Auth routes - redirect to dashboard if already authenticated
const authRoutes = ['/login', '/signup']

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  console.log('[Proxy] Request:', pathname)

  // Validate session server-side
  let isAuthenticated = false
  try {
    const session = await auth.api.getSession({
      headers: request.headers,
    })
    isAuthenticated = !!session?.user
    console.log('[Proxy] Session:', isAuthenticated ? 'authenticated' : 'not authenticated')
  } catch (error) {
    console.error('[Proxy] Session check failed:', error)
  }

  // Auth routes - redirect authenticated users to dashboard
  if (authRoutes.some((route) => pathname === route)) {
    if (isAuthenticated) {
      console.log('[Proxy] Redirecting authenticated user to dashboard')
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }
    return NextResponse.next()
  }

  // Allow public routes without auth
  if (publicRoutes.some((route) => pathname.startsWith(route))) {
    return NextResponse.next()
  }

  // Protected routes - redirect to login if not authenticated
  if (!isAuthenticated) {
    console.log('[Proxy] Redirecting to login, callbackUrl:', pathname)
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('callbackUrl', pathname)
    return NextResponse.redirect(loginUrl)
  }

  return NextResponse.next()
}

export const config = {
  // Match all routes except static files
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)'],
}

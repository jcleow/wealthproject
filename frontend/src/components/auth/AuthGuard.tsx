'use client'

import { useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useAuth } from './AuthProvider'

const PUBLIC_ROUTES = ['/', '/home', '/login', '/signup', '/reset-password']

function isPublicRoute(pathname: string): boolean {
  return PUBLIC_ROUTES.some(route => pathname === route || pathname.startsWith(route + '/'))
}

export function AuthenticationGuard({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth()
  const pathname = usePathname()
  const router = useRouter()

  useEffect(() => {
    if (!isLoading && !isAuthenticated && !isPublicRoute(pathname)) {
      router.replace('/login')
    }
  }, [isLoading, isAuthenticated, pathname, router])

  // For public routes, always render children
  if (isPublicRoute(pathname)) {
    return <>{children}</>
  }

  // For protected routes, block rendering until auth check completes
  if (isLoading) {
    return null // Or a loading spinner
  }

  // If not authenticated on a protected route, don't render (redirect will happen)
  if (!isAuthenticated) {
    return null
  }

  return <>{children}</>
}

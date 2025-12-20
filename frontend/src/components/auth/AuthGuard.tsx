'use client'

import { useEffect } from 'react'
import { redirect, usePathname } from 'next/navigation'
import { useAuth } from './AuthProvider'

const PUBLIC_ROUTES = ['/', '/home', '/login', '/signup', '/reset-password']

export function AuthenticationGuard() {
  const { isAuthenticated, isLoading } = useAuth()
  const pathname = usePathname()

  useEffect(() => {
    if (!isLoading && !isAuthenticated && !PUBLIC_ROUTES.includes(pathname)) {
      redirect('/login')
    }
  }, [isLoading, isAuthenticated, pathname])

  return null
}

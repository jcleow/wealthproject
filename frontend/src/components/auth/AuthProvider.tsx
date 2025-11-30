'use client'

import { createContext, useContext, type ReactNode } from 'react'
import { useSession } from '@/lib/auth-client'

interface AuthContextType {
  user: {
    id: string
    email: string
    name: string
    image?: string | null
  } | null
  isLoading: boolean
  isAuthenticated: boolean
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  isLoading: true,
  isAuthenticated: false,
})

export function AuthProvider({ children }: { children: ReactNode }) {
  const { data: session, isPending } = useSession()

  const value: AuthContextType = {
    user: session?.user ?? null,
    isLoading: isPending,
    isAuthenticated: !!session?.user,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

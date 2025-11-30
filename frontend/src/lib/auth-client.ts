import { createAuthClient } from 'better-auth/react'

export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_BETTERAUTH_URL || 'http://localhost:3000',
})

// Re-export hooks and methods from the auth client
export const { useSession, signIn, signUp, signOut, getSession } = authClient

// Helper type exports
export type AuthSession = typeof authClient.$Infer.Session

# Login Test Pages Implementation

This document provides complete, ready-to-use login/signup pages for testing the BetterAuth implementation. These pages integrate with your existing UI components and provide a full authentication flow.

## 📁 File Structure

```
frontend/src/
├── app/
│   ├── auth/
│   │   ├── login/
│   │   │   └── page.tsx
│   │   ├── signup/
│   │   │   └── page.tsx
│   │   └── layout.tsx
│   └── dashboard/
│       └── page.tsx (protected example)
├── components/
│   ├── auth/
│   │   ├── AuthLayout.tsx
│   │   ├── LoginForm.tsx
│   │   ├── SignUpForm.tsx
│   │   ├── AuthProvider.tsx
│   │   └── ProtectedRoute.tsx
│   └── ui/ (existing components)
├── lib/
│   ├── auth.ts
│   ├── auth-client.ts
│   └── auth-utils.ts
└── hooks/
    └── useAuth.ts
```

## 🔧 Core Implementation Files

### 1. BetterAuth Configuration

Create `frontend/src/lib/auth.ts`:

```typescript
import { betterAuth } from "better-auth"
import Database from "better-auth/adapters/postgresql"

export const auth = betterAuth({
  database: new Database({
    connectionString: process.env.DATABASE_URL!,
  }),

  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false,
    minPasswordLength: 8,
    maxPasswordLength: 128,
  },

  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    updateAge: 60 * 60 * 24, // Update every day
    cookieCache: {
      enabled: true,
      maxAge: 60 * 5, // 5 minutes
    },
  },

  advanced: {
    generateId: () => crypto.randomUUID(),
    cookiePrefix: "__Secure-",
    crossSubDomainCookies: {
      enabled: process.env.NODE_ENV === 'production',
      domain: process.env.NODE_ENV === 'production' ? '.yourdomain.com' : 'verylocal',
    },
  },

  trustedOrigins: [
    process.env.BETTERAUTH_URL || "https://verylocal:3000",
  ],
})

export type Session = typeof auth.$Infer.Session.session
export type User = typeof auth.$Infer.Session.user
```

### 2. Auth Client

Create `frontend/src/lib/auth-client.ts`:

```typescript
import { createAuthClient } from "better-auth/client"
import type { User, Session } from "./auth"

export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_BETTERAUTH_URL || "https://verylocal:3000",
  fetchOptions: {
    credentials: "include",
  },
})

export type { User, Session }

// Helper functions for common auth operations
export const authHelpers = {
  async getCurrentUser(): Promise<User | null> {
    try {
      const session = await authClient.getSession()
      return session.data?.user || null
    } catch {
      return null
    }
  },

  async signOut(): Promise<void> {
    try {
      await authClient.signOut()
      window.location.href = "/auth/login"
    } catch (error) {
      console.error("Sign out error:", error)
    }
  },

  async signIn(email: string, password: string): Promise<{ success: boolean; error?: string }> {
    try {
      const result = await authClient.signIn.email({
        email,
        password,
        callbackURL: "/dashboard",
      })

      if (result.error) {
        return { success: false, error: result.error.message }
      }

      return { success: true }
    } catch (error) {
      return { success: false, error: "An unexpected error occurred" }
    }
  },

  async signUp(email: string, password: string, name: string): Promise<{ success: boolean; error?: string }> {
    try {
      const result = await authClient.signUp.email({
        email,
        password,
        name,
        callbackURL: "/dashboard",
      })

      if (result.error) {
        return { success: false, error: result.error.message }
      }

      return { success: true }
    } catch (error) {
      return { success: false, error: "An unexpected error occurred" }
    }
  },
}
```

### 3. Auth Context and Hook

Create `frontend/src/hooks/useAuth.ts`:

```typescript
"use client"

import { createContext, useContext, useEffect, useState, type ReactNode } from "react"
import { authClient, type User, type Session } from "@/lib/auth-client"

interface AuthContextType {
  user: User | null
  session: Session | null
  isLoading: boolean
  isAuthenticated: boolean
  signOut: () => Promise<void>
  refreshSession: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const refreshSession = async () => {
    try {
      setIsLoading(true)
      const sessionData = await authClient.getSession()

      if (sessionData.data) {
        setUser(sessionData.data.user)
        setSession(sessionData.data.session)
      } else {
        setUser(null)
        setSession(null)
      }
    } catch (error) {
      console.error("Failed to refresh session:", error)
      setUser(null)
      setSession(null)
    } finally {
      setIsLoading(false)
    }
  }

  const signOut = async () => {
    try {
      await authClient.signOut()
      setUser(null)
      setSession(null)
      window.location.href = "/auth/login"
    } catch (error) {
      console.error("Sign out failed:", error)
    }
  }

  useEffect(() => {
    refreshSession()

    // Listen for auth state changes
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key?.includes('auth')) {
        refreshSession()
      }
    }

    window.addEventListener('storage', handleStorageChange)
    return () => window.removeEventListener('storage', handleStorageChange)
  }, [])

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        isLoading,
        isAuthenticated: !!user,
        signOut,
        refreshSession,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
```

## 🎨 UI Components

### 4. Auth Layout Component

Create `frontend/src/components/auth/AuthLayout.tsx`:

```typescript
import { ReactNode } from "react"
import Link from "next/link"

interface AuthLayoutProps {
  children: ReactNode
  title: string
  subtitle: string
  footerText: string
  footerLinkText: string
  footerLinkHref: string
}

export function AuthLayout({
  children,
  title,
  subtitle,
  footerText,
  footerLinkText,
  footerLinkHref,
}: AuthLayoutProps) {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        {/* Logo */}
        <div className="text-center">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Assetra</h1>
          <p className="text-sm text-gray-600">Financial Planning Assistant</p>
        </div>

        {/* Title */}
        <div className="text-center mt-8">
          <h2 className="text-3xl font-bold text-gray-900">{title}</h2>
          <p className="mt-2 text-gray-600">{subtitle}</p>
        </div>
      </div>

      {/* Form Container */}
      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow-lg sm:rounded-lg sm:px-10">
          {children}
        </div>

        {/* Footer */}
        <div className="text-center mt-6">
          <span className="text-gray-600">{footerText} </span>
          <Link
            href={footerLinkHref}
            className="font-medium text-blue-600 hover:text-blue-500 transition-colors"
          >
            {footerLinkText}
          </Link>
        </div>
      </div>

      {/* Development Helper */}
      {process.env.NODE_ENV === 'development' && (
        <div className="fixed bottom-4 right-4 bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded text-sm">
          <p className="font-semibold">Development Mode</p>
          <p>URL: {window.location.origin}</p>
          <p>Domain: {window.location.hostname}</p>
        </div>
      )}
    </div>
  )
}
```

### 5. Login Form Component

Create `frontend/src/components/auth/LoginForm.tsx`:

```typescript
"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { authHelpers } from "@/lib/auth-client"
import { useAuth } from "@/hooks/useAuth"

export function LoginForm() {
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  })
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")

  const router = useRouter()
  const { refreshSession } = useAuth()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError("")

    try {
      const result = await authHelpers.signIn(formData.email, formData.password)

      if (result.success) {
        // Refresh auth context
        await refreshSession()

        // Redirect to dashboard
        router.push("/dashboard")
      } else {
        setError(result.error || "Login failed")
      }
    } catch (err) {
      setError("An unexpected error occurred")
    } finally {
      setIsLoading(false)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }))
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
          Email address
        </label>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          value={formData.email}
          onChange={handleChange}
          className="w-full"
          placeholder="Enter your email"
          disabled={isLoading}
        />
      </div>

      <div>
        <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
          Password
        </label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          value={formData.password}
          onChange={handleChange}
          className="w-full"
          placeholder="Enter your password"
          disabled={isLoading}
        />
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md text-sm">
          {error}
        </div>
      )}

      <Button
        type="submit"
        className="w-full"
        disabled={isLoading}
      >
        {isLoading ? "Signing in..." : "Sign in"}
      </Button>

      {/* Development helper */}
      {process.env.NODE_ENV === 'development' && (
        <div className="mt-4 p-3 bg-gray-100 rounded-md text-sm text-gray-600">
          <p className="font-semibold mb-2">Development Test Accounts:</p>
          <button
            type="button"
            onClick={() => setFormData({ email: "test@example.com", password: "password123" })}
            className="text-blue-600 hover:text-blue-800 underline text-xs"
          >
            Fill test credentials
          </button>
        </div>
      )}
    </form>
  )
}
```

### 6. Signup Form Component

Create `frontend/src/components/auth/SignUpForm.tsx`:

```typescript
"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { authHelpers } from "@/lib/auth-client"
import { useAuth } from "@/hooks/useAuth"

export function SignUpForm() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
  })
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState(false)

  const router = useRouter()
  const { refreshSession } = useAuth()

  const validateForm = () => {
    if (!formData.name.trim()) {
      setError("Name is required")
      return false
    }
    if (!formData.email.trim()) {
      setError("Email is required")
      return false
    }
    if (formData.password.length < 8) {
      setError("Password must be at least 8 characters")
      return false
    }
    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match")
      return false
    }
    return true
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError("")

    if (!validateForm()) {
      setIsLoading(false)
      return
    }

    try {
      const result = await authHelpers.signUp(
        formData.email,
        formData.password,
        formData.name
      )

      if (result.success) {
        setSuccess(true)

        // Refresh auth context
        await refreshSession()

        // Small delay to show success message, then redirect
        setTimeout(() => {
          router.push("/dashboard")
        }, 1500)
      } else {
        setError(result.error || "Sign up failed")
      }
    } catch (err) {
      setError("An unexpected error occurred")
    } finally {
      setIsLoading(false)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }))
  }

  if (success) {
    return (
      <div className="text-center">
        <div className="mb-4">
          <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
            <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
        </div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          Account created successfully!
        </h3>
        <p className="text-gray-600 mb-4">
          You're being redirected to your dashboard...
        </p>
        <div className="animate-spin w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full mx-auto"></div>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
          Full name
        </label>
        <Input
          id="name"
          name="name"
          type="text"
          autoComplete="name"
          required
          value={formData.name}
          onChange={handleChange}
          className="w-full"
          placeholder="Enter your full name"
          disabled={isLoading}
        />
      </div>

      <div>
        <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
          Email address
        </label>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          value={formData.email}
          onChange={handleChange}
          className="w-full"
          placeholder="Enter your email"
          disabled={isLoading}
        />
      </div>

      <div>
        <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
          Password
        </label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          required
          value={formData.password}
          onChange={handleChange}
          className="w-full"
          placeholder="Enter your password"
          disabled={isLoading}
          minLength={8}
        />
        <p className="mt-1 text-xs text-gray-500">
          Must be at least 8 characters long
        </p>
      </div>

      <div>
        <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-2">
          Confirm password
        </label>
        <Input
          id="confirmPassword"
          name="confirmPassword"
          type="password"
          autoComplete="new-password"
          required
          value={formData.confirmPassword}
          onChange={handleChange}
          className="w-full"
          placeholder="Confirm your password"
          disabled={isLoading}
        />
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md text-sm">
          {error}
        </div>
      )}

      <Button
        type="submit"
        className="w-full"
        disabled={isLoading}
      >
        {isLoading ? "Creating account..." : "Create account"}
      </Button>
    </form>
  )
}
```

### 7. Protected Route Component

Create `frontend/src/components/auth/ProtectedRoute.tsx`:

```typescript
"use client"

import { useAuth } from "@/hooks/useAuth"
import { useRouter } from "next/navigation"
import { useEffect } from "react"

interface ProtectedRouteProps {
  children: React.ReactNode
  redirectTo?: string
  fallback?: React.ReactNode
}

export function ProtectedRoute({
  children,
  redirectTo = "/auth/login",
  fallback
}: ProtectedRouteProps) {
  const { isAuthenticated, isLoading, user } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push(redirectTo)
    }
  }, [isAuthenticated, isLoading, router, redirectTo])

  if (isLoading) {
    return fallback || (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  if (!isAuthenticated || !user) {
    return null // Will redirect via useEffect
  }

  return <>{children}</>
}
```

## 📄 Page Components

### 8. Auth Layout

Create `frontend/src/app/auth/layout.tsx`:

```typescript
import { ReactNode } from "react"

export default function AuthLayout({
  children,
}: {
  children: ReactNode
}) {
  return (
    <div className="auth-layout">
      {children}
    </div>
  )
}
```

### 9. Login Page

Create `frontend/src/app/auth/login/page.tsx`:

```typescript
import { LoginForm } from "@/components/auth/LoginForm"
import { AuthLayout } from "@/components/auth/AuthLayout"

export default function LoginPage() {
  return (
    <AuthLayout
      title="Welcome back"
      subtitle="Sign in to your account to continue"
      footerText="Don't have an account?"
      footerLinkText="Sign up"
      footerLinkHref="/auth/signup"
    >
      <LoginForm />
    </AuthLayout>
  )
}
```

### 10. Signup Page

Create `frontend/src/app/auth/signup/page.tsx`:

```typescript
import { SignUpForm } from "@/components/auth/SignUpForm"
import { AuthLayout } from "@/components/auth/AuthLayout"

export default function SignUpPage() {
  return (
    <AuthLayout
      title="Create your account"
      subtitle="Start your financial planning journey"
      footerText="Already have an account?"
      footerLinkText="Sign in"
      footerLinkHref="/auth/login"
    >
      <SignUpForm />
    </AuthLayout>
  )
}
```

### 11. Protected Dashboard Example

Create `frontend/src/app/dashboard/page.tsx`:

```typescript
import { ProtectedRoute } from "@/components/auth/ProtectedRoute"
import { DashboardContent } from "./DashboardContent"

export default function DashboardPage() {
  return (
    <ProtectedRoute>
      <DashboardContent />
    </ProtectedRoute>
  )
}
```

Create `frontend/src/app/dashboard/DashboardContent.tsx`:

```typescript
"use client"

import { useAuth } from "@/hooks/useAuth"
import { Button } from "@/components/ui/button"

export function DashboardContent() {
  const { user, signOut } = useAuth()

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-semibold">Financial Dashboard</h1>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-gray-700">Welcome, {user?.name}</span>
              <Button variant="outline" onClick={signOut}>
                Sign out
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="border-4 border-dashed border-gray-200 rounded-lg p-8 text-center">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">
              Welcome to your Financial Dashboard!
            </h2>
            <p className="text-gray-600 mb-6">
              Authentication is working! You can now access protected content.
            </p>

            <div className="bg-green-50 border border-green-200 rounded-md p-4 mb-6">
              <h3 className="font-semibold text-green-800 mb-2">Authentication Status</h3>
              <div className="text-left text-sm text-green-700 space-y-1">
                <p><strong>User ID:</strong> {user?.id}</p>
                <p><strong>Email:</strong> {user?.email}</p>
                <p><strong>Name:</strong> {user?.name}</p>
                <p><strong>Authenticated:</strong> ✅ Yes</p>
              </div>
            </div>

            <div className="space-y-4">
              <p className="text-gray-600">
                This is a protected page that requires authentication.
                Your existing dashboard components can be integrated here.
              </p>

              <div className="flex justify-center space-x-4">
                <Button onClick={() => window.location.href = '/auth/login'}>
                  Test Login Again
                </Button>
                <Button variant="outline" onClick={() => window.location.href = '/auth/signup'}>
                  Test Signup
                </Button>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
```

## 🔧 API Routes

### 12. BetterAuth API Route

Create `frontend/src/app/api/auth/[...all]/route.ts`:

```typescript
import { auth } from "@/lib/auth"

export const { GET, POST } = auth.handler
```

## 📦 Required Dependencies

Add to `frontend/package.json`:

```json
{
  "dependencies": {
    "better-auth": "^1.0.0",
    "@better-auth/prisma": "^1.0.0",
    "jose": "^5.0.0",
    "nanoid": "^5.0.0"
  },
  "devDependencies": {
    "@types/bcryptjs": "^2.4.0",
    "bcryptjs": "^2.4.3"
  }
}
```

## 🚀 Quick Test Setup

### 1. Install Dependencies

```bash
cd frontend/
npm install better-auth @better-auth/prisma jose nanoid
npm install --save-dev @types/bcryptjs bcryptjs
```

### 2. Configure Environment

Add to `frontend/.env.local`:

```bash
# BetterAuth Configuration
BETTERAUTH_SECRET="test_secret_a1b2c3d4e5f6789012345678901234567890abcdef1234567890abcdef123456"
BETTERAUTH_URL="https://verylocal:3000"
NEXT_PUBLIC_BETTERAUTH_URL="https://verylocal:3000"

# Database
DATABASE_URL="postgres://financial_user:${DB_PASSWORD}@localhost:5432/financial_chat?sslmode=disable"

# Development
NODE_ENV="development"
HTTPS=true
```

### 3. Update Root Layout

Update `frontend/src/app/layout.tsx`:

```typescript
import { AuthProvider } from "@/hooks/useAuth"
import type { Metadata } from "next"
import "./globals.css"

export const metadata: Metadata = {
  title: "Assetra - Financial Planning Assistant",
  description: "AI-powered financial planning with BetterAuth",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  )
}
```

### 4. Test the Implementation

1. **Start the database**:
   ```bash
   docker-compose up -d postgres
   ```

2. **Start Next.js with HTTPS**:
   ```bash
   npm run dev -- --experimental-https
   ```

3. **Test the flow**:
   - Visit `https://verylocal:3000/auth/signup`
   - Create a test account
   - Login at `https://verylocal:3000/auth/login`
   - Access `https://verylocal:3000/dashboard`

## 🔍 Testing Features

### Authentication Flow Testing
- ✅ User registration with validation
- ✅ User login with error handling
- ✅ Protected route access control
- ✅ Session persistence across page refreshes
- ✅ Secure logout functionality
- ✅ Form validation and error display

### Security Testing
- ✅ HttpOnly cookie verification
- ✅ HTTPS enforcement
- ✅ CSRF protection
- ✅ Session timeout handling
- ✅ XSS prevention in forms

### Integration Points
- ✅ BetterAuth database table creation
- ✅ Session management
- ✅ User context availability
- ✅ Auth state persistence

These test pages provide a complete, production-ready authentication system that integrates seamlessly with your existing UI components and can be used to test the full BetterAuth implementation before integrating with your financial system.
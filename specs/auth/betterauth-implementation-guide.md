# BetterAuth Implementation Guide

## Prerequisites

- Node.js 18+
- Next.js 16+ (App Router)
- PostgreSQL database
- Go 1.21+ backend
- `verylocal` domain configured in `/etc/hosts`

## Phase 1: Next.js BetterAuth Setup

### Step 1: Install BetterAuth Packages

```bash
cd frontend/
npm install better-auth @better-auth/prisma
npm install --save-dev @types/bcryptjs bcryptjs
```

### Step 2: Create BetterAuth Configuration

Create `frontend/src/lib/auth.ts`:

```typescript
import { betterAuth } from "better-auth"
import { prismaAdapter } from "@better-auth/prisma"
import Database from "better-auth/adapters/postgresql"

export const auth = betterAuth({
  database: new Database({
    connectionString: process.env.DATABASE_URL!,
  }),
  // Alternative: Use existing Prisma setup if available
  // adapter: prismaAdapter(prisma),

  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false, // Start simple, add later
    minPasswordLength: 8,
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
  },

  trustedOrigins: [
    "https://verylocal:3000",
    "http://localhost:3000", // Fallback for development
  ],
})

export type Session = typeof auth.$Infer.Session.session
export type User = typeof auth.$Infer.Session.user
```

### Step 3: Set up Auth API Routes

Create `frontend/src/app/api/auth/[...all]/route.ts`:

```typescript
import { auth } from "@/lib/auth"

export const { GET, POST } = auth.handler
```

### Step 4: Create Auth Client

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
```

### Step 5: Environment Configuration

Add to `frontend/.env.local`:

```bash
# BetterAuth Configuration
BETTERAUTH_SECRET="your-super-secret-256-bit-key-change-this-in-production"
BETTERAUTH_URL="https://verylocal:3000"
NEXT_PUBLIC_BETTERAUTH_URL="https://verylocal:3000"

# Database (existing)
DATABASE_URL="postgres://financial_user:financial_pass_dev_2024@localhost:5432/financial_chat?sslmode=disable"

# HTTPS for development (required for secure cookies)
HTTPS=true
```

### Step 6: Run Database Migrations

BetterAuth will automatically create tables. Start your app:

```bash
npm run dev -- --experimental-https
```

Check that these tables were created:
- `user`
- `session`
- `account`
- `verificationToken`

## Phase 2: Frontend Auth UI Integration

### Step 7: Create Authentication Components

Create `frontend/src/components/auth/LoginForm.tsx`:

```typescript
"use client"

import { useState } from "react"
import { authClient } from "@/lib/auth-client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card } from "@/components/ui/card"

export function LoginForm() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError("")

    try {
      const result = await authClient.signIn.email({
        email,
        password,
        callbackURL: "/dashboard",
      })

      if (result.error) {
        setError(result.error.message || "Login failed")
      }
    } catch (err) {
      setError("An unexpected error occurred")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card className="w-full max-w-md mx-auto p-6">
      <form onSubmit={handleLogin} className="space-y-4">
        <div>
          <label htmlFor="email" className="block text-sm font-medium mb-1">
            Email
          </label>
          <Input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>

        <div>
          <label htmlFor="password" className="block text-sm font-medium mb-1">
            Password
          </label>
          <Input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>

        {error && (
          <div className="text-red-500 text-sm">{error}</div>
        )}

        <Button type="submit" className="w-full" disabled={isLoading}>
          {isLoading ? "Signing in..." : "Sign In"}
        </Button>
      </form>
    </Card>
  )
}
```

Create `frontend/src/components/auth/SignUpForm.tsx`:

```typescript
"use client"

import { useState } from "react"
import { authClient } from "@/lib/auth-client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card } from "@/components/ui/card"

export function SignUpForm() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [name, setName] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState(false)

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError("")

    try {
      const result = await authClient.signUp.email({
        email,
        password,
        name,
        callbackURL: "/dashboard",
      })

      if (result.error) {
        setError(result.error.message || "Sign up failed")
      } else {
        setSuccess(true)
      }
    } catch (err) {
      setError("An unexpected error occurred")
    } finally {
      setIsLoading(false)
    }
  }

  if (success) {
    return (
      <Card className="w-full max-w-md mx-auto p-6 text-center">
        <h2 className="text-xl font-semibold text-green-600 mb-2">
          Account Created Successfully!
        </h2>
        <p className="text-gray-600">
          You can now sign in with your credentials.
        </p>
      </Card>
    )
  }

  return (
    <Card className="w-full max-w-md mx-auto p-6">
      <form onSubmit={handleSignUp} className="space-y-4">
        <div>
          <label htmlFor="name" className="block text-sm font-medium mb-1">
            Full Name
          </label>
          <Input
            id="name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </div>

        <div>
          <label htmlFor="email" className="block text-sm font-medium mb-1">
            Email
          </label>
          <Input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>

        <div>
          <label htmlFor="password" className="block text-sm font-medium mb-1">
            Password
          </label>
          <Input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={8}
          />
        </div>

        {error && (
          <div className="text-red-500 text-sm">{error}</div>
        )}

        <Button type="submit" className="w-full" disabled={isLoading}>
          {isLoading ? "Creating Account..." : "Create Account"}
        </Button>
      </form>
    </Card>
  )
}
```

### Step 8: Create Auth Context and Hooks

Create `frontend/src/lib/auth-context.tsx`:

```typescript
"use client"

import { createContext, useContext, useEffect, useState, type ReactNode } from "react"
import { authClient } from "@/lib/auth-client"
import type { User, Session } from "@/lib/auth-client"

interface AuthContextType {
  user: User | null
  session: Session | null
  isLoading: boolean
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
      const sessionData = await authClient.getSession()
      setUser(sessionData.data?.user || null)
      setSession(sessionData.data?.session || null)
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
      window.location.href = "/login"
    } catch (error) {
      console.error("Sign out failed:", error)
    }
  }

  useEffect(() => {
    refreshSession()
  }, [])

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        isLoading,
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

### Step 9: Create Protected Route Component

Create `frontend/src/components/auth/ProtectedRoute.tsx`:

```typescript
"use client"

import { useAuth } from "@/lib/auth-context"
import { useRouter } from "next/navigation"
import { useEffect } from "react"

interface ProtectedRouteProps {
  children: React.ReactNode
  redirectTo?: string
}

export function ProtectedRoute({
  children,
  redirectTo = "/login"
}: ProtectedRouteProps) {
  const { user, isLoading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!isLoading && !user) {
      router.push(redirectTo)
    }
  }, [user, isLoading, router, redirectTo])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">Loading...</div>
      </div>
    )
  }

  if (!user) {
    return null // Will redirect via useEffect
  }

  return <>{children}</>
}
```

### Step 10: Update Root Layout

Update `frontend/src/app/layout.tsx`:

```typescript
import { AuthProvider } from "@/lib/auth-context"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Financial Chat System",
  description: "AI-powered financial planning assistant",
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

### Step 11: Create Auth Pages

Create `frontend/src/app/login/page.tsx`:

```typescript
import { LoginForm } from "@/components/auth/LoginForm"
import Link from "next/link"

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Sign In</h1>
          <p className="text-gray-600 mt-2">
            Access your financial dashboard
          </p>
        </div>

        <LoginForm />

        <div className="text-center mt-6">
          <span className="text-gray-600">Don't have an account? </span>
          <Link
            href="/signup"
            className="text-blue-600 hover:text-blue-800 font-medium"
          >
            Sign up
          </Link>
        </div>
      </div>
    </div>
  )
}
```

Create `frontend/src/app/signup/page.tsx`:

```typescript
import { SignUpForm } from "@/components/auth/SignUpForm"
import Link from "next/link"

export default function SignUpPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Create Account</h1>
          <p className="text-gray-600 mt-2">
            Start your financial planning journey
          </p>
        </div>

        <SignUpForm />

        <div className="text-center mt-6">
          <span className="text-gray-600">Already have an account? </span>
          <Link
            href="/login"
            className="text-blue-600 hover:text-blue-800 font-medium"
          >
            Sign in
          </Link>
        </div>
      </div>
    </div>
  )
}
```

## Phase 3: Backend Integration

### Step 12: Update Go Auth Middleware

Update `backend/internal/middleware/auth.go`:

```go
package middleware

import (
    "context"
    "crypto/hmac"
    "crypto/sha256"
    "encoding/hex"
    "encoding/json"
    "fmt"
    "net/http"
    "os"
    "strconv"
    "strings"
    "time"
)

type userContextKey struct{}

type UserContext struct {
    UserID    string
    SessionID string
    Token     string
    IsVerified bool
}

type SessionTokenPayload struct {
    UserID    string `json:"userId"`
    SessionID string `json:"sessionId"`
    Exp       int64  `json:"exp"`
}

func Authenticate(next http.Handler) http.Handler {
    return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        // Check for BetterAuth session token (from Next.js BFF)
        sessionToken := r.Header.Get("X-Session-Token")
        userID := r.Header.Get("X-User-ID")

        userCtx := UserContext{
            UserID: userID,
            Token:  sessionToken,
            IsVerified: false,
        }

        // Verify BetterAuth session token if present
        if sessionToken != "" && userID != "" {
            if payload, valid := verifyBetterAuthToken(sessionToken, userID); valid {
                userCtx.UserID = payload.UserID
                userCtx.SessionID = payload.SessionID
                userCtx.IsVerified = true
            }
        } else {
            // Fallback to old auth for backward compatibility
            authHeader := r.Header.Get("Authorization")
            token := parseBearerToken(authHeader)
            if token == "" {
                token = "anonymous"
            }

            if userID == "" {
                userID = r.Header.Get("X-Session-ID")
            }

            userCtx = UserContext{
                UserID: userID,
                Token:  token,
                IsVerified: false, // Old auth is not verified
            }
        }

        ctx := context.WithValue(r.Context(), userContextKey{}, userCtx)
        next.ServeHTTP(w, r.WithContext(ctx))
    })
}

func verifyBetterAuthToken(token, expectedUserID string) (SessionTokenPayload, bool) {
    secret := os.Getenv("BETTERAUTH_SECRET")
    if secret == "" {
        return SessionTokenPayload{}, false
    }

    // Parse the token (basic JWT-like structure)
    parts := strings.Split(token, ".")
    if len(parts) != 3 {
        return SessionTokenPayload{}, false
    }

    // Verify signature
    message := parts[0] + "." + parts[1]
    expectedSig := generateHMAC(message, secret)
    if !hmac.Equal([]byte(parts[2]), []byte(expectedSig)) {
        return SessionTokenPayload{}, false
    }

    // Decode payload
    payload, err := base64Decode(parts[1])
    if err != nil {
        return SessionTokenPayload{}, false
    }

    var tokenPayload SessionTokenPayload
    if err := json.Unmarshal(payload, &tokenPayload); err != nil {
        return SessionTokenPayload{}, false
    }

    // Verify expiration
    if time.Now().Unix() > tokenPayload.Exp {
        return SessionTokenPayload{}, false
    }

    // Verify user ID matches
    if tokenPayload.UserID != expectedUserID {
        return SessionTokenPayload{}, false
    }

    return tokenPayload, true
}

func generateHMAC(message, secret string) string {
    h := hmac.New(sha256.New, []byte(secret))
    h.Write([]byte(message))
    return hex.EncodeToString(h.Sum(nil))
}

// RequireAuth middleware ensures request is from verified BetterAuth session
func RequireAuth(next http.Handler) http.Handler {
    return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        userCtx := GetUserContext(r.Context())
        if !userCtx.IsVerified {
            http.Error(w, "Authentication required", http.StatusUnauthorized)
            return
        }
        next.ServeHTTP(w, r)
    })
}

func GetUserContext(ctx context.Context) UserContext {
    if ctx == nil {
        return UserContext{}
    }
    if val, ok := ctx.Value(userContextKey{}).(UserContext); ok {
        return val
    }
    return UserContext{}
}

func parseBearerToken(header string) string {
    if header == "" {
        return ""
    }
    if strings.HasPrefix(strings.ToLower(header), "bearer ") {
        return strings.TrimSpace(header[7:])
    }
    return strings.TrimSpace(header)
}

// Helper function for base64 decoding
func base64Decode(s string) ([]byte, error) {
    // Add padding if necessary
    switch len(s) % 4 {
    case 2:
        s += "=="
    case 3:
        s += "="
    }

    return base64.URLEncoding.DecodeString(s)
}
```

### Step 13: Update Go Configuration

Update `backend/internal/config/config.go` to include BetterAuth secret:

```go
type Config struct {
    // ... existing fields ...

    // BetterAuth Integration
    BetterAuthSecret string
}

func New() *Config {
    return &Config{
        // ... existing config ...

        BetterAuthSecret: getEnv("BETTERAUTH_SECRET", ""),
    }
}
```

### Step 14: Update Go Main Server

Update `backend/cmd/server/main.go` to add auth requirements:

```go
// Add to route setup - require auth for protected endpoints
v1Router.Use(middleware.Authenticate)

// Chat endpoints - require verified auth
chatRouter := v1Router.PathPrefix("/chat").Subrouter()
chatRouter.Use(middleware.RequireAuth)
chatRouter.HandleFunc("", chatHandler.HandleChat).Methods("POST", "OPTIONS")
chatRouter.HandleFunc("/history/{sessionId}", chatHandler.GetChatHistory).Methods("GET")

// Financial endpoints - require verified auth
financialRouter := v1Router.PathPrefix("/financial").Subrouter()
financialRouter.Use(middleware.RequireAuth)
financialRouter.HandleFunc("/actions/dispatch", dispatchHandler.HandleDispatch).Methods("POST", "OPTIONS")
financialRouter.HandleFunc("/timeline", timelineHandler.HandleGetTimeline).Methods("GET")
// ... other financial routes
```

## Phase 4: BFF Implementation

### Step 15: Create Next.js API Proxy Routes

Create `frontend/src/app/api/v1/chat/route.ts`:

```typescript
import { auth } from "@/lib/auth"
import { NextRequest } from "next/server"
import { generateSessionToken } from "@/lib/token-utils"

export async function POST(request: NextRequest) {
  try {
    // 1. Validate BetterAuth session
    const session = await auth.api.getSession({
      headers: request.headers
    })

    if (!session) {
      return Response.json(
        { error: "Authentication required" },
        { status: 401 }
      )
    }

    // 2. Get request body
    const body = await request.json()

    // 3. Generate session token for Go backend
    const sessionToken = generateSessionToken({
      userId: session.user.id,
      sessionId: session.session.id,
    })

    // 4. Call Go backend
    const response = await fetch(`${process.env.GO_BACKEND_URL}/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Session-Token': sessionToken,
        'X-User-ID': session.user.id,
        'X-Request-ID': crypto.randomUUID(),
      },
      body: JSON.stringify(body),
    })

    if (!response.ok) {
      const errorText = await response.text()
      return Response.json(
        { error: errorText || 'Backend request failed' },
        { status: response.status }
      )
    }

    // 5. Forward response
    const data = await response.json()
    return Response.json(data)

  } catch (error) {
    console.error('Chat API error:', error)
    return Response.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
```

Create `frontend/src/lib/token-utils.ts`:

```typescript
import { SignJWT } from 'jose'

interface SessionTokenPayload {
  userId: string
  sessionId: string
}

export function generateSessionToken(payload: SessionTokenPayload): string {
  const secret = new TextEncoder().encode(process.env.BETTERAUTH_SECRET!)

  return new SignJWT({
    userId: payload.userId,
    sessionId: payload.sessionId,
    exp: Math.floor(Date.now() / 1000) + (5 * 60), // 5 minutes
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('5m')
    .sign(secret)
}
```

### Step 16: Create More BFF Routes

Create similar proxy routes for all backend endpoints:
- `frontend/src/app/api/v1/financial/actions/dispatch/route.ts`
- `frontend/src/app/api/v1/financial/timeline/route.ts`
- `frontend/src/app/api/v1/assets/route.ts`
- etc.

### Step 17: Update Frontend API Service

Update `frontend/src/services/api.ts`:

```typescript
import { ChatRequest, ChatResponse, DispatchRequest, DispatchResponse } from '@/types/api'

// Remove direct backend URL - always use Next.js BFF
const API_BASE_URL = '/api/v1'

class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message)
    this.name = 'ApiError'
  }
}

async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`

  const response = await fetch(url, {
    credentials: 'include', // Important: Include BetterAuth cookies
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  })

  if (!response.ok) {
    let errorMessage = `HTTP ${response.status}`
    try {
      const errorData = await response.json()
      errorMessage = errorData.error || errorMessage
    } catch {
      errorMessage = response.statusText || errorMessage
    }
    throw new ApiError(response.status, errorMessage)
  }

  return response.json()
}

export const apiService = {
  async sendMessage(request: ChatRequest): Promise<ChatResponse> {
    return apiRequest<ChatResponse>('/chat', {
      method: 'POST',
      body: JSON.stringify(request),
    })
  },

  async dispatchActions(request: DispatchRequest): Promise<DispatchResponse> {
    return apiRequest<DispatchResponse>('/financial/actions/dispatch', {
      method: 'POST',
      body: JSON.stringify(request),
    })
  },

  // Add more methods as needed
}

export { ApiError }
```

## Phase 5: Testing and Verification

### Step 18: Test Complete Auth Flow

1. **Start services:**
   ```bash
   # Terminal 1: Start Go backend
   cd backend/
   go run cmd/server/main.go

   # Terminal 2: Start Next.js with HTTPS
   cd frontend/
   npm run dev -- --experimental-https
   ```

2. **Test registration:**
   - Visit `https://verylocal:3000/signup`
   - Create a new account
   - Verify user is created in database

3. **Test login:**
   - Visit `https://verylocal:3000/login`
   - Sign in with new account
   - Check that cookies are set

4. **Test API calls:**
   - Make authenticated requests to `/api/v1/chat`
   - Verify Go backend receives proper headers
   - Check that responses work end-to-end

### Step 19: Verify Security

1. **Cookie inspection:**
   ```bash
   # Check cookies in browser dev tools
   # Should see: __Secure-better-auth-session (HttpOnly, Secure)
   ```

2. **Token verification:**
   ```bash
   # Monitor Go backend logs for successful token verification
   ```

3. **CORS testing:**
   ```bash
   # All requests should work without CORS issues
   ```

## Environment Variables Summary

### Frontend (`.env.local`)
```bash
BETTERAUTH_SECRET="your-super-secret-256-bit-key"
BETTERAUTH_URL="https://verylocal:3000"
NEXT_PUBLIC_BETTERAUTH_URL="https://verylocal:3000"
DATABASE_URL="postgres://financial_user:financial_pass_dev_2024@localhost:5432/financial_chat?sslmode=disable"
GO_BACKEND_URL="http://verylocal:8080/api/v1"
HTTPS=true
```

### Backend (`.env`)
```bash
BETTERAUTH_SECRET="your-super-secret-256-bit-key"
DATABASE_URL="postgres://financial_user:financial_pass_dev_2024@localhost:5432/financial_chat?sslmode=disable"
PORT=8080
# ... other existing vars
```

## Common Issues and Solutions

### Issue: Cookies not working
**Solution:** Ensure HTTPS is enabled and domain is set to `verylocal`

### Issue: Token verification failing
**Solution:** Check that `BETTERAUTH_SECRET` is identical in both frontend and backend

### Issue: CORS errors
**Solution:** Verify all requests go through Next.js BFF, not directly to Go backend

### Issue: Database connection errors
**Solution:** Ensure PostgreSQL is running and DATABASE_URL is correct

## Next Steps

1. **Add OAuth providers** (Google, GitHub)
2. **Implement email verification**
3. **Add password reset functionality**
4. **Set up rate limiting**
5. **Add session management UI**
6. **Implement audit logging**
7. **Add two-factor authentication**
8. **Set up monitoring and alerts**

This implementation provides a secure, scalable authentication system following the BFF pattern with BetterAuth handling all authentication concerns in the Next.js layer while keeping the Go backend focused on business logic.
# Auth State Management: Migrate to Zustand Store

## Background: How Auth State Works in React Apps

When a user logs in, we need to store their session information (user ID, email, etc.) somewhere so the entire app knows "who is logged in." There are several ways to do this:

1. **React Context** - Built into React, creates a "provider" that wraps the app
2. **Global State Libraries** - Zustand, Redux, Jotai, etc.
3. **Server-side only** - Check auth on every request (slower)

## Current Implementation (React Context + Hook)

```typescript
// AuthProvider.tsx
export function AuthProvider({ children }) {
  const { data: session, isPending } = useSession()  // Hook that fetches session

  return (
    <AuthContext.Provider value={{ user: session?.user, isLoading: isPending }}>
      {children}
    </AuthContext.Provider>
  )
}

// Usage in components
function Dashboard() {
  const { user, isLoading } = useAuth()  // Reads from context
}
```

**How it works:**
1. `useSession()` is a React Query hook from better-auth
2. It makes an HTTP request to `/api/auth/get-session`
3. The response is stored in React Query's cache
4. Context passes this data down to all children

## Problems with Current Approach

### 1. Re-fetching on Component Remounts

React Query hooks can re-fetch when components remount (depending on staleTime config). Even with good caching, there's overhead:

```
User navigates: /dashboard → /settings → /dashboard
                    ↓            ↓            ↓
              useSession()  useSession()  useSession()
                    ↓            ↓            ↓
              (cache hit)   (cache hit)  (might refetch if stale)
```

### 2. Only Works Inside React Components

Context requires you to be inside the React tree:

```typescript
// ❌ This doesn't work - outside React component
// api/client.ts
function apiFetch(url) {
  const { user } = useAuth()  // ERROR: Hooks can't be called here
}

// ❌ Also doesn't work
// utils/analytics.ts
function trackEvent(event) {
  const { user } = useAuth()  // ERROR: Not in a React component
}
```

### 3. Provider Nesting Complexity

Every context needs a provider wrapper:

```tsx
// layout.tsx - "Provider Hell"
<QueryProvider>
  <AuthProvider>
    <ThemeProvider>
      <ToastProvider>
        {children}
      </ToastProvider>
    </ThemeProvider>
  </AuthProvider>
</QueryProvider>
```

### 4. Prop Drilling Alternative is Verbose

Without context, you'd pass user through every component:

```tsx
<Dashboard user={user} />
  <Sidebar user={user} />
    <UserMenu user={user} />  // Tedious!
```

## Better Approach: Zustand Store (Rybbit Pattern)

```typescript
// lib/userStore.ts
import { create } from 'zustand'
import { authClient } from './auth-client'

export const userStore = create<{
  user: User | null
  isPending: boolean
  setUser: (user: User | null) => void
}>((set) => ({
  user: null,
  isPending: true,
  setUser: (user) => set({ user }),
}))

// Fetch session ONCE when module loads (not on every component mount)
authClient.getSession().then(({ data: session }) => {
  userStore.setState({
    user: session?.user ?? null,
    isPending: false,
  })
})
```

**How it works:**
1. When the JS bundle loads, `authClient.getSession()` runs ONCE
2. Result is stored in Zustand (a simple global object)
3. Any component or function can read from the store

## Why Zustand is Better for Auth

### 1. Single Fetch on App Load

```
App loads → authClient.getSession() → store.user = result
                     ↓
            (never fetches again until logout/refresh)
```

No matter how many times components mount/unmount, the session is fetched exactly once.

### 2. Works Anywhere - React or Not

```typescript
// ✅ Works in API utilities
// api/client.ts
function apiFetch(url) {
  const user = userStore.getState().user  // Synchronous access!
  if (!user) throw new Error('Not authenticated')
}

// ✅ Works in event handlers
function handleExport() {
  const user = userStore.getState().user
  analytics.track('export', { userId: user?.id })
}

// ✅ Works in React components too
function Dashboard() {
  const user = userStore((state) => state.user)  // Subscribes to changes
}
```

### 3. No Provider Wrapper Needed

```tsx
// layout.tsx - Cleaner!
<QueryProvider>
  <AuthenticationGuard />  {/* Just reads from store */}
  {children}
</QueryProvider>
```

### 4. Simpler Mental Model

```
Context:  Provider wraps → Context created → useContext reads → re-renders on change
Zustand:  Store exists → read/write anywhere → subscribe for re-renders
```

## Performance Comparison

| Aspect | React Context | Zustand |
|--------|--------------|---------|
| Initial fetch | On first render | On module load (earlier) |
| Re-renders | All consumers re-render on any context change | Only subscribed components re-render |
| Memory | Context + React Query cache | Single store object |
| Bundle size | 0 (built-in) | ~1.5kb (tiny) |
| Access outside React | ❌ Not possible | ✅ `store.getState()` |

## Architecture Diagram

### Current (Context)

```
┌─────────────────────────────────────────┐
│  AuthProvider                           │
│  ┌─────────────────────────────────┐   │
│  │  useSession() → HTTP request    │   │
│  │       ↓                         │   │
│  │  React Query Cache              │   │
│  │       ↓                         │   │
│  │  AuthContext.Provider           │   │
│  │       ↓                         │   │
│  │  ┌─────────────────────────┐   │   │
│  │  │  Components             │   │   │
│  │  │  useAuth() → context    │   │   │
│  │  └─────────────────────────┘   │   │
│  └─────────────────────────────────┘   │
└─────────────────────────────────────────┘
     ❌ API utils can't access
     ❌ Event handlers can't access
```

### Proposed (Zustand)

```
┌────────────────────────────────────────────┐
│  Module Load                               │
│  authClient.getSession() ──→ userStore     │
└────────────────────────────────────────────┘
                    ↓
         ┌─────────────────────┐
         │     userStore       │  ← Global singleton
         │  { user, isPending }│
         └─────────────────────┘
          ↙        ↓         ↘
    Components  API Utils  Event Handlers
    (subscribe) (getState)  (getState)
         ✅         ✅          ✅
```

## When to Use Which

| Use Case | Recommendation |
|----------|----------------|
| Auth state | Zustand (need access everywhere) |
| Theme/UI preferences | Either (usually React-only) |
| Form state | React state (local to form) |
| Server data (lists, etc.) | React Query (handles caching, refetch) |
| Complex app state | Zustand or Redux |

## Implementation Steps

### 1. Install Zustand

```bash
cd frontend && pnpm add zustand
```

### 2. Create user store

```typescript
// lib/userStore.ts
import { create } from 'zustand'
import { authClient } from './auth-client'

interface UserState {
  user: { id: string; email: string; name: string } | null
  isPending: boolean
  setUser: (user: UserState['user']) => void
  logout: () => void
}

export const userStore = create<UserState>((set) => ({
  user: null,
  isPending: true,
  setUser: (user) => set({ user, isPending: false }),
  logout: () => set({ user: null, isPending: false }),
}))

// Fetch once on module load
if (typeof window !== 'undefined') {
  authClient.getSession().then(({ data: session }) => {
    userStore.getState().setUser(session?.user ?? null)
  })
}
```

### 3. Update AuthenticationGuard

```typescript
// components/auth/AuthGuard.tsx
'use client'

import { useEffect } from 'react'
import { redirect, usePathname } from 'next/navigation'
import { userStore } from '@/lib/userStore'

const PUBLIC_ROUTES = ['/', '/home', '/login', '/signup', '/reset-password']

export function AuthenticationGuard() {
  const { user, isPending } = userStore()
  const pathname = usePathname()

  useEffect(() => {
    if (!isPending && !user && !PUBLIC_ROUTES.includes(pathname)) {
      redirect('/login')
    }
  }, [isPending, user, pathname])

  return null
}
```

### 4. Remove AuthProvider from layout

Optional - can keep for backwards compatibility during migration.

### 5. Update components to use store

```typescript
// Before
const { user } = useAuth()

// After
const user = userStore((state) => state.user)
```

## Gotchas & Edge Cases

### SSR Hydration

Zustand works on client only. Initial server render will have `user: null`. This is fine since auth check happens client-side anyway.

### Login/Logout

After login, manually update the store:

```typescript
await authClient.signIn(...)
const { data } = await authClient.getSession()
userStore.getState().setUser(data?.user ?? null)
```

### Session Expiry

If session expires mid-use, API will return 401. Handle in API client:

```typescript
if (response.status === 401) {
  userStore.getState().logout()
  window.location.href = '/login'
}
```

## References

- [Zustand docs](https://github.com/pmndrs/zustand)
- [Rybbit's userStore implementation](https://github.com/rybbit-io/rybbit)

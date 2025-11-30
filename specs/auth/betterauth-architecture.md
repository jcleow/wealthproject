# BetterAuth Architecture Specification

## Overview

This document specifies the implementation of **BetterAuth** authentication for the Assetra financial chat system, following the **Backend for Frontend (BFF)** pattern where Next.js serves as the authentication layer and gateway to the Go backend.

## Architecture Model

### BFF (Backend for Frontend) Authentication Pattern

```
Browser (Frontend Client)
   ↓ (HTTPS + HttpOnly Cookies)
Next.js App (BetterAuth + API Routes) ← BFF Authentication Layer
   ↓ (Server-to-Server with Signed Tokens)
Go Backend API (Internal, Trusted Service)
```

### Component Responsibilities

#### 🔵 Next.js (BetterAuth BFF Layer)
**Source of Truth for Authentication**

**Handles:**
- User registration, sign-in, sign-out
- Session creation and management
- Secure cookie handling (HttpOnly, Secure, SameSite=None)
- Refresh token management
- CSRF protection and rate limiting
- Device/session management
- Social OAuth flows (future)

**Also:**
- Validates sessions for every API call from browser
- Generates signed session tokens for Go backend communication
- Proxies authenticated requests to Go backend
- Never exposes raw tokens to browser

#### 🟡 Browser (Frontend Client)
**Zero-Trust Client**

**Behavior:**
- Never stores auth tokens or JWTs
- Only receives HttpOnly BetterAuth cookies
- Calls ONLY Next.js `/api/*` routes (never Go backend directly)
- Zero CORS issues, maximum security

#### 🟢 Go Backend (Internal API Service)
**Stateless Business Logic**

**Responsibilities:**
- Accept authenticated requests from Next.js BFF only
- Verify session tokens via HMAC or BetterAuth verification
- Load user context from verified tokens
- Execute business logic and return JSON
- NO authentication, NO cookies, NO session management

### Current System Integration

#### Existing Components to Leverage
- **PostgreSQL Database**: Already configured, will store BetterAuth tables
- **Session Management**: Existing `session.Store` can be adapted or replaced
- **Go Middleware**: `middleware/auth.go` will be updated for token verification
- **API Structure**: Existing `/api/v1` routes will remain, accessed via BFF
- **Domain Setup**: `verylocal` domain already configured for development

#### Migration Strategy
1. **Parallel Implementation**: Add BetterAuth alongside existing auth
2. **Gradual Migration**: Move endpoints one by one to BFF pattern
3. **Backward Compatibility**: Maintain existing APIs during transition
4. **Clean Cutover**: Remove old auth once BetterAuth is fully tested

## Request Flow Architecture

### 1. User Authentication
```
Browser → Next.js BetterAuth → PostgreSQL
```
- User submits credentials to `/api/auth/sign-in`
- BetterAuth validates credentials against database
- Sets secure cookies: `__Secure-better-auth-session=<token>`
- Browser never sees the raw token

### 2. Session Validation (Server-Side)
```
Next.js Server → BetterAuth
```
- React Server Components call `await auth.getSession()`
- BetterAuth reads HttpOnly cookies server-side
- Returns user session data for rendering

### 3. API Requests (Browser to Backend)
```
Browser → Next.js BFF → Go Backend
```

**Step 3a: Browser calls Next.js**
```typescript
// Browser makes request to Next.js
fetch('/api/v1/user/profile', {
  method: 'GET',
  credentials: 'include' // Includes HttpOnly cookies
})
```

**Step 3b: Next.js validates and proxies**
```typescript
// Next.js API route handler
export async function GET(request: Request) {
  // 1. Validate BetterAuth session
  const session = await auth.getSession()
  if (!session) return Response.json({error: 'Unauthorized'}, {status: 401})

  // 2. Generate signed token for Go backend
  const sessionToken = generateSignedToken(session)

  // 3. Call Go backend with headers
  const response = await fetch('http://verylocal:8080/user/profile', {
    headers: {
      'X-Session-Token': sessionToken,
      'X-User-ID': session.userId,
      'X-Request-ID': nanoid(),
    }
  })

  // 4. Return response to browser
  return response
}
```

**Step 3c: Go backend processes request**
```go
// Go backend verifies token and processes
func (h *Handler) GetProfile(w http.ResponseWriter, r *http.Request) {
    // 1. Verify session token
    token := r.Header.Get("X-Session-Token")
    userID := r.Header.Get("X-User-ID")

    if !verifySessionToken(token, userID) {
        http.Error(w, "Invalid session", http.StatusUnauthorized)
        return
    }

    // 2. Load user context and execute business logic
    profile := loadUserProfile(userID)
    json.NewEncoder(w).Encode(profile)
}
```

### 4. Response Flow
```
Go Backend → Next.js → Browser
```
- Go backend returns JSON to Next.js
- Next.js forwards response to browser
- Browser receives clean JSON (no auth metadata)

## Database Schema

### BetterAuth Tables
BetterAuth will create these tables automatically:

```sql
-- Users table
CREATE TABLE "user" (
    "id" TEXT PRIMARY KEY,
    "email" TEXT UNIQUE NOT NULL,
    "emailVerified" TIMESTAMP,
    "name" TEXT,
    "image" TEXT,
    "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Sessions table
CREATE TABLE "session" (
    "id" TEXT PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP NOT NULL,
    "token" TEXT NOT NULL,
    "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY ("userId") REFERENCES "user" ("id") ON DELETE CASCADE
);

-- Accounts table (for OAuth providers)
CREATE TABLE "account" (
    "id" TEXT PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "access_token" TEXT,
    "refresh_token" TEXT,
    "expires_at" INTEGER,
    "token_type" TEXT,
    "scope" TEXT,
    "id_token" TEXT,
    "session_state" TEXT,
    "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY ("userId") REFERENCES "user" ("id") ON DELETE CASCADE
);

-- Verification tokens (email verification, password reset)
CREATE TABLE "verificationToken" (
    "id" TEXT PRIMARY KEY,
    "identifier" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" TIMESTAMP NOT NULL,
    "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Integration with Existing Schema
- Link existing financial data to `user.id`
- Migrate existing session data to BetterAuth sessions
- Update foreign keys in financial tables

## Security Considerations

### Cookie Security
```javascript
// BetterAuth cookie configuration
{
  httpOnly: true,           // Prevents XSS access
  secure: true,            // HTTPS only
  sameSite: 'none',        // Cross-origin support for verylocal
  maxAge: 7 * 24 * 60 * 60, // 7 days
  domain: 'verylocal',     // Match development domain
}
```

### Token Security
```typescript
// Server-to-server token signing
function generateSignedToken(session: Session): string {
  const payload = {
    userId: session.userId,
    sessionId: session.id,
    exp: Date.now() + (5 * 60 * 1000), // 5 minutes
  }
  return jwt.sign(payload, process.env.BETTERAUTH_SECRET!)
}
```

### Environment Variables
```bash
# Required for BetterAuth
BETTERAUTH_SECRET="your-256-bit-secret-key"
BETTERAUTH_URL="https://verylocal:3000"
DATABASE_URL="postgres://user:pass@localhost:5432/financial_chat"

# Optional for OAuth
GOOGLE_CLIENT_ID=""
GOOGLE_CLIENT_SECRET=""
GITHUB_CLIENT_ID=""
GITHUB_CLIENT_SECRET=""
```

## Development Setup

### Domain Configuration
```bash
# Add to /etc/hosts (already configured)
127.0.0.1 verylocal
```

### Local URLs
- **Frontend (Next.js)**: `https://verylocal:3000`
- **Backend (Go)**: `http://verylocal:8080`
- **Auth Routes**: `https://verylocal:3000/api/auth/*`

### HTTPS for Development
Required for secure cookies in development:
```bash
# Using mkcert or Next.js built-in HTTPS
npm run dev -- --experimental-https
```

## Implementation Phases

### Phase 1: BetterAuth Foundation
1. Install and configure BetterAuth in Next.js
2. Set up database integration
3. Create auth API routes
4. Configure cookies and sessions

### Phase 2: Frontend Integration
5. Build authentication UI components
6. Create auth hooks and context
7. Implement protected routes
8. Add logout and profile management

### Phase 3: Backend Integration
9. Update Go middleware for token verification
10. Create HMAC token verification
11. Modify user context handling
12. Test internal API security

### Phase 4: BFF Implementation
13. Create Next.js API proxy routes
14. Implement secure header injection
15. Update frontend to use BFF routes
16. Remove direct Go backend calls

### Phase 5: Production Readiness
17. Implement rate limiting
18. Add monitoring and logging
19. Set up session cleanup
20. Performance optimization

## Benefits of This Architecture

### Security
✅ **No token exposure**: Browser never sees JWTs or session tokens
✅ **HttpOnly cookies**: Immune to XSS attacks
✅ **Server-to-server trust**: Go backend only accepts verified requests
✅ **CSRF protection**: Built into BetterAuth
✅ **Rate limiting**: Centralized in Next.js layer

### Developer Experience
✅ **No CORS issues**: Browser only talks to same-origin Next.js
✅ **Clean backend**: Go focuses purely on business logic
✅ **Type safety**: Full TypeScript integration
✅ **Hot reloading**: Development works seamlessly

### Scalability
✅ **Stateless backend**: Go can scale horizontally
✅ **Session management**: Centralized in PostgreSQL
✅ **Caching**: Next.js can cache authenticated responses
✅ **Load balancing**: BFF layer handles auth complexity

### Maintenance
✅ **Single auth source**: All auth logic in Next.js
✅ **Clean separation**: Frontend auth vs backend business logic
✅ **Easy testing**: Mock auth in development
✅ **Future-proof**: Easy to add OAuth, MFA, etc.

## Migration Path

### Current State
```
Browser → Go Backend (minimal auth)
```

### Target State
```
Browser → Next.js BFF (BetterAuth) → Go Backend (verified requests)
```

### Migration Steps
1. **Parallel deployment**: Add BetterAuth without breaking existing auth
2. **Route by route**: Migrate API endpoints incrementally
3. **Feature flags**: Control which users see new auth
4. **Gradual rollout**: Monitor and adjust during migration
5. **Clean removal**: Delete old auth once fully migrated

This architecture provides maximum security, developer experience, and scalability while maintaining the clean separation between authentication concerns and business logic.
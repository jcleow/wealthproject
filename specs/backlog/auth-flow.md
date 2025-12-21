# Authenticated API Flow: Client → Backend → User Data

## Overview

This document illustrates the complete flow of an authenticated API request from browser to database, and how Row-Level Security (RLS) integrates with the existing auth architecture.

> **Important:** Authentication is mandatory. All API requests require a valid session. There is no anonymous fallback — users must log in to access any `/api/v1/*` endpoints.

---

## Current Architecture: BFF (Backend-for-Frontend) Pattern

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                              BROWSER                                          │
│  1. User logs in via BetterAuth                                              │
│  2. Receives HttpOnly session cookie (never sees JWT)                        │
│  3. Makes API call: GET /api/v1/assets                                       │
└─────────────────────────────────┬────────────────────────────────────────────┘
                                  │
                                  │ Request includes HttpOnly cookie
                                  │ Cookie: better-auth.session_token=abc123...
                                  ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│                         NEXT.JS BFF (Port 3000)                              │
│                                                                               │
│  1. Extract session token from cookie                                        │
│  2. Query database to validate session:                                      │
│     ┌─────────────────────────────────────────────────────────────────────┐  │
│     │ SELECT s.*, u.id as user_id, u.email                                │  │
│     │ FROM auth.session s                                                 │  │
│     │ JOIN auth.user u ON s."userId" = u.id                               │  │
│     │ WHERE s.token = 'abc123...'                                         │──┼──┐
│     │   AND s."expiresAt" > NOW()                                         │  │  │
│     └─────────────────────────────────────────────────────────────────────┘  │  │
│                                                                               │  │
│  3. If valid, extract user.id from result                                    │  │
│  4. Create HMAC-signed JWT (5min expiry):                                    │  │
│     ┌─────────────────────────────────────────┐                              │  │
│     │ const token = await new SignJWT({       │                              │  │
│     │   sub: userId,                          │                              │  │
│     │   iat: now                              │                              │  │
│     │ }).setExpirationTime('5m')              │                              │  │
│     │   .sign(BACKEND_SHARED_SECRET)          │                              │  │
│     └─────────────────────────────────────────┘                              │  │
│  5. Proxy request to Go backend with headers:                                │  │
│     - X-User-ID: "user-uuid-123"                                             │  │
│     - X-Auth-Token: "eyJhbGciOiJIUzI1NiIs..."                                │  │
└─────────────────────────────────┬────────────────────────────────────────────┘  │
                                  │                                               │
                                  │ GET /api/v1/assets                            │
                                  │ X-User-ID: user-uuid-123                      │
                                  │ X-Auth-Token: <HMAC-signed JWT>               │
                                  ▼                                               │
┌──────────────────────────────────────────────────────────────────────────────┐  │
│                         GO BACKEND (Port 8080)                               │  │
│                                                                               │  │
│  middleware.Authenticate:                                                    │  │
│  ┌─────────────────────────────────────────────────────────────────────────┐ │  │
│  │ 1. Extract X-User-ID and X-Auth-Token from headers                      │ │  │
│  │ 2. Verify HMAC signature using BACKEND_SHARED_SECRET                    │ │  │
│  │ 3. Validate JWT claims (sub == X-User-ID, not expired)                  │ │  │
│  │ 4. Store UserContext in request context                                 │ │  │
│  └─────────────────────────────────────────────────────────────────────────┘ │  │
│                                                                               │  │
│  AssetHandler.list():                                                        │  │
│  ┌─────────────────────────────────────────────────────────────────────────┐ │  │
│  │ userID, ok := requireUserID(w, r)  // Extract from context              │ │  │
│  │ if !ok { return }                  // 401 if missing                    │ │  │
│  │                                                                         │ │  │
│  │ items, err := h.store.ListAssets(ctx, userID)                           │ │  │
│  └─────────────────────────────────────────────────────────────────────────┘ │  │
└─────────────────────────────────┬────────────────────────────────────────────┘  │
                                  │                                               │
                                  │ SELECT * FROM finance_assets                  │
                                  │ WHERE user_id = 'user-uuid-123'               │
                                  ▼                                               │
┌──────────────────────────────────────────────────────────────────────────────┐  │
│                            POSTGRESQL                                         │  │
│                                                                               │  │
│  ┌─────────────────────────────────────────────────────────────────────────┐ │  │
│  │                        auth schema (BetterAuth)                         │ │  │
│  │  ┌───────────────┐      ┌───────────────┐      ┌───────────────┐       │ │  │
│  │  │ auth.user     │      │ auth.session  │      │ auth.account  │       │◄├──┘
│  │  │ - id          │◄─────│ - userId      │      │ - userId      │       │ │
│  │  │ - email       │      │ - token       │      │ - password    │       │ │
│  │  │ - name        │      │ - expiresAt   │      │ - providerId  │       │ │
│  │  └───────────────┘      └───────────────┘      └───────────────┘       │ │
│  └─────────────────────────────────────────────────────────────────────────┘ │
│                                                                               │
│  ┌─────────────────────────────────────────────────────────────────────────┐ │
│  │                     public schema (Financial Data)                      │ │
│  │  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐         │ │
│  │  │ finance_assets  │  │ finance_incomes │  │ finance_expenses│         │ │
│  │  │ - id            │  │ - id            │  │ - id            │         │ │
│  │  │ - user_id ──────┼──┼─► RLS policy    │  │ - user_id       │         │ │
│  │  │ - name          │  │ - user_id       │  │ - name          │         │ │
│  │  │ - current_value │  │ - amount        │  │ - amount        │         │ │
│  │  └─────────────────┘  └─────────────────┘  └─────────────────┘         │ │
│  └─────────────────────────────────────────────────────────────────────────┘ │
│                                                                               │
│  With RLS enabled:                                                           │
│  ┌─────────────────────────────────────────────────────────────────────────┐ │
│  │ BEGIN;                                                                  │ │
│  │ SET LOCAL app.current_user_id = 'user-uuid-123';                        │ │
│  │                                                                         │ │
│  │ SELECT * FROM finance_assets;  -- No WHERE needed                       │ │
│  │                                                                         │ │
│  │ -- RLS policy evaluates:                                                │ │
│  │ -- user_id = current_setting('app.current_user_id') → 'user-uuid-123'   │ │
│  │ -- Only matching rows returned                                          │ │
│  │                                                                         │ │
│  │ COMMIT;  -- Clears app.current_user_id automatically                    │ │
│  └─────────────────────────────────────────────────────────────────────────┘ │
│                                                                               │
│  Returns: Only rows where user_id = 'user-uuid-123'                          │
└─────────────────────────────────┬────────────────────────────────────────────┘
                                  │
                                  │ JSON array of user's assets
                                  ▼
                         Response flows back up
```

---

## Go Backend JWT Validation

The Go backend validates the HMAC-signed JWT in `backend/internal/middleware/auth.go`:

```go
func verifyBFFToken(tokenString, expectedUserID string) (bool, error) {
    // 1. Get shared secret from environment
    secret := os.Getenv("BACKEND_SHARED_SECRET")

    // 2. Parse and verify JWT signature
    token, err := jwt.Parse(tokenString, func(token *jwt.Token) (interface{}, error) {
        // 3. Ensure signing method is HMAC (reject RSA/none attacks)
        if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
            return nil, fmt.Errorf("unexpected signing method: %v", token.Header["alg"])
        }
        return []byte(secret), nil
    })

    // 4. Check token is valid (signature + expiry)
    if !token.Valid {
        return false, fmt.Errorf("invalid token")
    }

    // 5. Verify subject claim matches X-User-ID header
    claims := token.Claims.(jwt.MapClaims)
    sub := claims["sub"].(string)
    if sub != expectedUserID {
        return false, fmt.Errorf("user ID mismatch")
    }

    return true, nil
}
```

### Validation Steps

| Step | Check | Rejects If |
|------|-------|------------|
| 1 | Secret configured | `BACKEND_SHARED_SECRET` is empty |
| 2 | Signature valid | HMAC doesn't match (token tampered or wrong secret) |
| 3 | Algorithm is HMAC | Attacker tries RSA/none algorithm attack |
| 4 | Token not expired | `exp` claim < current time (handled by jwt library) |
| 5 | Subject matches header | `sub` claim ≠ `X-User-ID` header |

**Key security property**: Even if an attacker knows their own user ID, they cannot forge a token for another user without knowing `BACKEND_SHARED_SECRET`.

### How HMAC Verification Works

Inside `jwt.Parse()`, the library performs:

```
1. Split token: "eyJhbG...".split('.') → [header, payload, signature]

2. Decode signature from token:
   receivedSig = base64Decode(signature)

3. Compute expected signature:
   expectedSig = HMAC-SHA256(header + "." + payload, secret)

4. Compare (constant-time to prevent timing attacks):
   if hmac.Equal(receivedSig, expectedSig) {
       token.Valid = true
   } else {
       return error("signature invalid")
   }
```

### JWT Structure

**Header** (set by jose library):
```json
{
  "alg": "HS256",
  "typ": "JWT"
}
```

**Payload** (set by BFF in `backend-client.ts`):
```json
{
  "sub": "user-uuid-123",
  "iat": 1701234567,
  "exp": 1701234867
}
```

| Field | Meaning | Source |
|-------|---------|--------|
| `alg` | Algorithm (HMAC-SHA256) | Library default |
| `typ` | Token type | Library default |
| `sub` | Subject (user ID) | Your code: `sub: userId` |
| `iat` | Issued at (unix timestamp) | `.setIssuedAt()` |
| `exp` | Expires at (unix timestamp) | `.setExpirationTime('5m')` |

**Encoded token:**
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ1c2VyLXV1aWQtMTIzIiwiaWF0IjoxNzAxMjM0NTY3LCJleHAiOjE3MDEyMzQ4Njd9.SIGNATURE
│                                      │                                                                              │
└──────── header (base64) ─────────────┴──────────────────────── payload (base64) ────────────────────────────────────┴── signature
```

---

## Why Go Backend Doesn't Query Auth Database

The BFF pattern means auth database queries only happen once:

| Component | Queries auth DB? | Why |
|-----------|------------------|-----|
| **Next.js BFF** | ✅ Yes | Validates session cookie against `auth.session` table |
| **Go Backend** | ❌ No | Trusts the HMAC signature — if valid, BFF already verified the user |

**Trust chain:**
```
Browser cookie → BFF validates in DB → BFF signs JWT → Backend trusts signature
                        │                                      │
                   DB query here                          No DB query needed
```

**Benefits:**
- Go backend is stateless — no session store, scales horizontally
- Faster requests — one less DB round-trip per API call
- Separation of concerns — auth logic stays in Next.js/BetterAuth
- Backend can't leak sessions — it never sees them

**Short-lived tokens (5 min)**: If a user logs out or gets banned, the BFF stops issuing new tokens, and existing tokens expire quickly.

---

## Shared Secret Requirement

Both BFF and Go backend must have the same `BACKEND_SHARED_SECRET`:

```
┌─────────────────────────┐         ┌─────────────────────────┐
│     Next.js BFF         │         │      Go Backend         │
│                         │         │                         │
│  BACKEND_SHARED_SECRET  │   ===   │  BACKEND_SHARED_SECRET  │
│  (used to SIGN)         │         │  (used to VERIFY)       │
└─────────────────────────┘         └─────────────────────────┘
```

**Environment configuration:**
```bash
# frontend/.env.local
BACKEND_SHARED_SECRET=your-secret-key-here

# backend/.env
BACKEND_SHARED_SECRET=your-secret-key-here   # Must be identical
```

**If secrets don't match:** BFF signs with secret A, backend verifies with secret B → HMAC mismatch → 401 Unauthorized

**Security rules:**

| Rule | Why |
|------|-----|
| Never commit to git | Use `.env` files or secrets manager |
| Make it long & random | 32+ chars: `openssl rand -base64 32` |
| Rotate periodically | If compromised, change on both sides simultaneously |
| Never send to browser | Browser only sees session cookie, never this secret |

---

## Key Files in the Flow

| Step | File | Purpose |
|------|------|---------|
| Login | `frontend/src/lib/auth.ts` | BetterAuth config |
| Session | `frontend/src/lib/auth-client.ts` | Browser auth client |
| BFF Proxy | `frontend/src/app/api/v1/[...path]/route.ts` | Validates session, signs HMAC JWT, proxies to backend |
| Validate | `backend/internal/middleware/auth.go` | Verifies HMAC token |
| Extract | `backend/cmd/server/handlers/common.go` | `requireUserID()` |
| Query | `backend/internal/financial/repository/store.go` | SQL with user_id |

> **Note:** `frontend/src/lib/backend-client.ts` contains reusable HMAC signing utilities but the main proxy flow uses the API route.

---

## Adding RLS: What Changes

### Current Flow (Application-Layer Filtering)
```go
// Handler
userID := requireUserID(w, r)
items := store.ListAssets(ctx, userID)

// Repository
query := "SELECT * FROM finance_assets WHERE user_id = $1"
rows := db.Query(query, userID)
```

### With RLS (Database-Layer Filtering)
```go
// Handler
userID := requireUserID(w, r)
tx := database.BeginScopedTx(ctx, db, userID)  // Sets RLS context
defer tx.Rollback()
items := store.ListAssets(ctx, tx)
tx.Commit()

// Repository (simplified - no user_id in WHERE)
query := "SELECT * FROM finance_assets"  // RLS handles filtering
rows := tx.Query(query)
```

### Database Migration
```sql
ALTER TABLE finance_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE finance_assets FORCE ROW LEVEL SECURITY;

CREATE POLICY user_isolation ON finance_assets
  FOR ALL
  USING (user_id = current_setting('app.current_user_id', true))
  WITH CHECK (user_id = current_setting('app.current_user_id', true));
```

---

## Security Layers

| Layer | Protection | Bypass Risk |
|-------|------------|-------------|
| BetterAuth | Session validation | Cookie theft (mitigated by HttpOnly) |
| HMAC Token | Request signing | Shared secret compromise |
| Auth Middleware | Token verification | Code bug in middleware |
| requireUserID() | Context extraction | Forgetting to call it |
| WHERE user_id | Query filtering | Forgetting in new queries |
| **RLS** | **Database enforcement** | **None (DB-level)** |

RLS is the final safety net — even if all application code is buggy, the database will never return wrong user's data.

---

## Implementation Plan

### Phase 1: Add RLS Policies (Defense in Depth)
1. Create migration enabling RLS on all user-scoped tables
2. Keep existing `WHERE user_id = $1` clauses as-is
3. RLS acts as second layer of protection

### Phase 2: Add ScopedTx Wrapper
1. Create `database.BeginScopedTx(ctx, db, userID)`
2. Sets `SET LOCAL app.current_user_id` automatically
3. Handlers use ScopedTx instead of raw db

### Phase 3: Simplify Repository (Optional)
1. Remove redundant `WHERE user_id = $1` from queries
2. RLS handles all filtering
3. Reduces code duplication and human error risk

---

## Files to Modify

1. **New migration**: `backend/migrations/XXXXXX_enable_rls.up.sql`
2. **New file**: `backend/internal/database/scoped.go` (ScopedTx)
3. **Modify**: `backend/cmd/server/handlers/*.go` (use ScopedTx)
4. **Modify**: `backend/internal/financial/repository/store.go` (accept tx interface)

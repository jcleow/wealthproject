# BetterAuth Database Migration Guide

## Overview

This guide covers database migration strategies for integrating BetterAuth with your existing financial chat system. BetterAuth will automatically create its required tables, but you need to plan how to integrate with existing data.

## BetterAuth Tables

BetterAuth automatically creates these tables when first initialized:

### Core Authentication Tables

```sql
-- Users table (BetterAuth managed)
CREATE TABLE "user" (
    "id" TEXT PRIMARY KEY,           -- UUID format
    "email" TEXT UNIQUE NOT NULL,
    "emailVerified" TIMESTAMP,
    "name" TEXT,
    "image" TEXT,
    "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Sessions table (BetterAuth managed)
CREATE TABLE "session" (
    "id" TEXT PRIMARY KEY,           -- UUID format
    "userId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP NOT NULL,
    "token" TEXT NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY ("userId") REFERENCES "user" ("id") ON DELETE CASCADE
);

-- Accounts table (for OAuth providers)
CREATE TABLE "account" (
    "id" TEXT PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,           -- "email" or "oauth"
    "provider" TEXT NOT NULL,       -- "credential", "google", "github", etc.
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
    FOREIGN KEY ("userId") REFERENCES "user" ("id") ON DELETE CASCADE,
    UNIQUE("provider", "providerAccountId")
);

-- Verification tokens (email verification, password reset)
CREATE TABLE "verificationToken" (
    "id" TEXT PRIMARY KEY,
    "identifier" TEXT NOT NULL,     -- email or phone
    "token" TEXT NOT NULL,
    "expires" TIMESTAMP NOT NULL,
    "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE("identifier", "token")
);
```

## Existing System Analysis

### Current Tables (from your existing schema)

Based on your current implementation, you likely have these tables:

```sql
-- Current session management (to be replaced)
CREATE TABLE sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id VARCHAR(255) UNIQUE NOT NULL,
    user_id VARCHAR(255),           -- This needs to link to BetterAuth
    data JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP
);

-- Financial data tables (need user_id migration)
CREATE TABLE assets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id VARCHAR(255),           -- Link to BetterAuth user.id
    session_id VARCHAR(255),        -- Can be removed or kept for temp sessions
    name VARCHAR(255) NOT NULL,
    current_value DECIMAL(15,2),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE liabilities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id VARCHAR(255),           -- Link to BetterAuth user.id
    session_id VARCHAR(255),        -- Can be removed or kept for temp sessions
    name VARCHAR(255) NOT NULL,
    current_balance DECIMAL(15,2),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Other financial tables follow similar pattern...
```

## Migration Strategy

### Phase 1: Parallel Deployment (No Downtime)

#### Step 1: Allow BetterAuth Table Creation

Let BetterAuth automatically create its tables by starting your Next.js app:

```bash
cd frontend/
npm run dev
```

This will create the `user`, `session`, `account`, and `verificationToken` tables.

#### Step 2: Create Migration Scripts

Create `migrations/001_add_betterauth_integration.sql`:

```sql
-- Add foreign key constraints to link existing data to BetterAuth users
-- BUT DON'T enable them yet (for parallel deployment)

-- 1. Add new user_id columns (nullable for now)
ALTER TABLE assets
ADD COLUMN betterauth_user_id TEXT REFERENCES "user"(id) ON DELETE SET NULL;

ALTER TABLE liabilities
ADD COLUMN betterauth_user_id TEXT REFERENCES "user"(id) ON DELETE SET NULL;

ALTER TABLE incomes
ADD COLUMN betterauth_user_id TEXT REFERENCES "user"(id) ON DELETE SET NULL;

ALTER TABLE expenses
ADD COLUMN betterauth_user_id TEXT REFERENCES "user"(id) ON DELETE SET NULL;

ALTER TABLE property_scenarios
ADD COLUMN betterauth_user_id TEXT REFERENCES "user"(id) ON DELETE SET NULL;

-- 2. Create mapping table for old sessions to new users (for migration)
CREATE TABLE session_user_mapping (
    old_session_id VARCHAR(255) PRIMARY KEY,
    betterauth_user_id TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. Add indexes for performance
CREATE INDEX idx_assets_betterauth_user_id ON assets(betterauth_user_id);
CREATE INDEX idx_liabilities_betterauth_user_id ON liabilities(betterauth_user_id);
CREATE INDEX idx_incomes_betterauth_user_id ON incomes(betterauth_user_id);
CREATE INDEX idx_expenses_betterauth_user_id ON expenses(betterauth_user_id);
CREATE INDEX idx_property_scenarios_betterauth_user_id ON property_scenarios(betterauth_user_id);
```

#### Step 3: Create User Migration Functions

Create `migrations/002_user_migration_functions.sql`:

```sql
-- Function to migrate anonymous session data to registered user
CREATE OR REPLACE FUNCTION migrate_session_to_user(
    old_session_id VARCHAR(255),
    new_user_id TEXT
) RETURNS VOID AS $$
BEGIN
    -- Record the mapping
    INSERT INTO session_user_mapping (old_session_id, betterauth_user_id)
    VALUES (old_session_id, new_user_id)
    ON CONFLICT (old_session_id) DO UPDATE
    SET betterauth_user_id = EXCLUDED.betterauth_user_id;

    -- Update all financial records for this session
    UPDATE assets
    SET betterauth_user_id = new_user_id
    WHERE session_id = old_session_id;

    UPDATE liabilities
    SET betterauth_user_id = new_user_id
    WHERE session_id = old_session_id;

    UPDATE incomes
    SET betterauth_user_id = new_user_id
    WHERE session_id = old_session_id;

    UPDATE expenses
    SET betterauth_user_id = new_user_id
    WHERE session_id = old_session_id;

    UPDATE property_scenarios
    SET betterauth_user_id = new_user_id
    WHERE session_id = old_session_id;

    -- Update chat history if you have it
    -- UPDATE chat_messages SET betterauth_user_id = new_user_id WHERE session_id = old_session_id;
END;
$$ LANGUAGE plpgsql;

-- Function to create user from existing session data
CREATE OR REPLACE FUNCTION create_user_from_session(
    old_session_id VARCHAR(255),
    email TEXT,
    name TEXT DEFAULT NULL
) RETURNS TEXT AS $$
DECLARE
    new_user_id TEXT;
BEGIN
    -- Generate new user ID
    new_user_id := gen_random_uuid()::text;

    -- Create BetterAuth user
    INSERT INTO "user" (id, email, name, "emailVerified", "createdAt", "updatedAt")
    VALUES (
        new_user_id,
        email,
        COALESCE(name, split_part(email, '@', 1)), -- Use email prefix as fallback name
        CURRENT_TIMESTAMP, -- Mark as verified for migrated users
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP
    );

    -- Migrate session data
    PERFORM migrate_session_to_user(old_session_id, new_user_id);

    RETURN new_user_id;
END;
$$ LANGUAGE plpgsql;
```

### Phase 2: User Registration Flow Integration

#### Step 4: Update Registration to Handle Existing Sessions

In your Next.js registration flow, check for existing session data:

```typescript
// In your signup form handler
export async function signUpWithSessionMigration(
  email: string,
  password: string,
  name: string,
  oldSessionId?: string
) {
  try {
    // 1. Create BetterAuth user
    const result = await authClient.signUp.email({
      email,
      password,
      name,
    })

    if (result.error) throw new Error(result.error.message)

    // 2. If user had existing session data, migrate it
    if (oldSessionId && result.data?.user) {
      await migrateSessionData(oldSessionId, result.data.user.id)
    }

    return { success: true, user: result.data?.user }
  } catch (error) {
    return { success: false, error: error.message }
  }
}

async function migrateSessionData(oldSessionId: string, userId: string) {
  // Call your backend to migrate session data
  await fetch('/api/migrate-session', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ oldSessionId, userId }),
  })
}
```

#### Step 5: Create Session Migration API

Create `frontend/src/app/api/migrate-session/route.ts`:

```typescript
import { auth } from "@/lib/auth"
import { NextRequest } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: request.headers
    })

    if (!session) {
      return Response.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { oldSessionId } = await request.json()

    // Call database function to migrate data
    const response = await fetch(`${process.env.GO_BACKEND_URL}/migrate-session`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Session-Token': generateSessionToken({
          userId: session.user.id,
          sessionId: session.session.id,
        }),
        'X-User-ID': session.user.id,
      },
      body: JSON.stringify({
        oldSessionId,
        userId: session.user.id,
      }),
    })

    if (!response.ok) {
      throw new Error('Migration failed')
    }

    return Response.json({ success: true })
  } catch (error) {
    console.error('Session migration error:', error)
    return Response.json({ error: 'Migration failed' }, { status: 500 })
  }
}
```

### Phase 3: Backend Updates for Migration

#### Step 6: Add Migration Handler to Go Backend

Create `backend/cmd/server/handlers/migration.go`:

```go
package handlers

import (
    "database/sql"
    "encoding/json"
    "net/http"
    "financial-chat-system/backend/internal/middleware"
)

type MigrationHandler struct {
    db *sql.DB
}

func NewMigrationHandler(db *sql.DB) *MigrationHandler {
    return &MigrationHandler{db: db}
}

type MigrateSessionRequest struct {
    OldSessionID string `json:"oldSessionId"`
    UserID       string `json:"userId"`
}

func (h *MigrationHandler) HandleMigrateSession(w http.ResponseWriter, r *http.Request) {
    // Ensure request is from authenticated BetterAuth session
    userCtx := middleware.GetUserContext(r.Context())
    if !userCtx.IsVerified {
        http.Error(w, "Authentication required", http.StatusUnauthorized)
        return
    }

    var req MigrateSessionRequest
    if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
        http.Error(w, "Invalid request body", http.StatusBadRequest)
        return
    }

    // Verify the user ID matches the authenticated user
    if req.UserID != userCtx.UserID {
        http.Error(w, "User ID mismatch", http.StatusForbidden)
        return
    }

    // Call the migration function
    _, err := h.db.Exec(
        "SELECT migrate_session_to_user($1, $2)",
        req.OldSessionID,
        req.UserID,
    )
    if err != nil {
        http.Error(w, "Migration failed: "+err.Error(), http.StatusInternalServerError)
        return
    }

    w.Header().Set("Content-Type", "application/json")
    json.NewEncoder(w).Encode(map[string]bool{"success": true})
}
```

#### Step 7: Add Migration Route

Update `backend/cmd/server/main.go`:

```go
// Add migration handler
migrationHandler := handlers.NewMigrationHandler(db)

// Add route (protected by auth)
v1Router.HandleFunc("/migrate-session", migrationHandler.HandleMigrateSession).Methods("POST")
```

### Phase 4: Data Access Pattern Updates

#### Step 8: Update Repository Layer

Update your Go repository methods to use BetterAuth user IDs:

```go
// Example: Update asset repository
func (s *Store) GetAssetsByUserID(ctx context.Context, userID string) ([]Asset, error) {
    query := `
        SELECT id, name, current_value, created_at, updated_at
        FROM assets
        WHERE betterauth_user_id = $1
        ORDER BY created_at DESC
    `

    rows, err := s.db.QueryContext(ctx, query, userID)
    if err != nil {
        return nil, err
    }
    defer rows.Close()

    var assets []Asset
    for rows.Next() {
        var asset Asset
        err := rows.Scan(
            &asset.ID,
            &asset.Name,
            &asset.CurrentValue,
            &asset.CreatedAt,
            &asset.UpdatedAt,
        )
        if err != nil {
            return nil, err
        }
        assets = append(assets, asset)
    }

    return assets, rows.Err()
}

// Fallback method for backward compatibility during migration
func (s *Store) GetAssetsBySessionID(ctx context.Context, sessionID string) ([]Asset, error) {
    query := `
        SELECT id, name, current_value, created_at, updated_at
        FROM assets
        WHERE session_id = $1 AND betterauth_user_id IS NULL
        ORDER BY created_at DESC
    `

    // ... implementation
}
```

### Phase 5: Final Cutover

#### Step 9: Make BetterAuth User ID Required

After migration is complete and tested:

```sql
-- Migration 003: Make betterauth_user_id required
ALTER TABLE assets
    ALTER COLUMN betterauth_user_id SET NOT NULL;

ALTER TABLE liabilities
    ALTER COLUMN betterauth_user_id SET NOT NULL;

-- Continue for other tables...

-- Drop old columns after confirming migration success
-- ALTER TABLE assets DROP COLUMN session_id;
-- ALTER TABLE liabilities DROP COLUMN session_id;
```

#### Step 10: Clean Up Old Session Table

```sql
-- Migration 004: Clean up old session system
-- DROP TABLE sessions; -- Only after confirming everything works
-- DROP TABLE session_user_mapping; -- Keep for audit trail if needed
```

## Migration Testing Plan

### Test Data Scenarios

1. **Anonymous User with Financial Data**
   - Create assets/liabilities with session ID only
   - Register user account
   - Verify data migrates correctly

2. **Existing User Registration**
   - User with extensive financial data
   - Multiple property scenarios
   - Chat history

3. **Edge Cases**
   - Empty sessions
   - Duplicate email attempts
   - Concurrent registrations

### Verification Queries

```sql
-- Verify migration completeness
SELECT
    COUNT(*) as total_assets,
    COUNT(betterauth_user_id) as migrated_assets,
    COUNT(*) - COUNT(betterauth_user_id) as pending_assets
FROM assets;

-- Check for orphaned data
SELECT session_id, COUNT(*)
FROM assets
WHERE betterauth_user_id IS NULL
GROUP BY session_id;

-- Verify user linkage
SELECT
    u.email,
    COUNT(a.id) as asset_count,
    COUNT(l.id) as liability_count
FROM "user" u
LEFT JOIN assets a ON a.betterauth_user_id = u.id
LEFT JOIN liabilities l ON l.betterauth_user_id = u.id
GROUP BY u.id, u.email;
```

## Rollback Strategy

If migration fails, you can rollback:

```sql
-- Emergency rollback: remove BetterAuth columns
ALTER TABLE assets DROP COLUMN IF EXISTS betterauth_user_id;
ALTER TABLE liabilities DROP COLUMN IF EXISTS betterauth_user_id;
-- etc...

-- Keep old session system working
-- (Your existing session table remains intact)
```

## Performance Considerations

1. **Index Creation**: Add indexes before heavy migration
2. **Batch Processing**: Migrate users in batches for large datasets
3. **Connection Pooling**: Ensure database can handle migration load
4. **Monitoring**: Track migration progress and performance

This migration strategy provides a safe, testable path from your current session-based system to BetterAuth while preserving all existing user data.
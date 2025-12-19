# User ID Integration Plan for BetterAuth

This document provides a comprehensive analysis of which components in the Assetra financial system require `user_id` integration and detailed migration steps to implement proper user-scoped data access.

## 🔍 Analysis Summary

Based on code analysis, the system currently uses session-based data storage without proper user association. BetterAuth integration requires adding `user_id` to all financial data and implementing user-scoped access control.

## 📊 Complete Table Analysis

### Tables Requiring `user_id` Column (Currently Missing)

| Table | Impact | Current State | Required Change |
|-------|--------|---------------|-----------------|
| `finance_assets` | 🔴 High | No user_id | Add `user_id TEXT` column |
| `finance_liabilities` | 🔴 High | No user_id | Add `user_id TEXT` column |
| `finance_incomes` | 🔴 High | No user_id | Add `user_id TEXT` column |
| `finance_expenses` | 🔴 High | No user_id | Add `user_id TEXT` column |
| `property_scenarios` | 🔴 High | No user_id | Add `user_id TEXT` column |
| `growth_configs` | 🟡 Medium | Keyed by category only | Add `user_id TEXT`, change PK to `(user_id, category)` |

### Tables With `user_id` (Need Type Change)

| Table | Impact | Current State | Required Change |
|-------|--------|---------------|-----------------|
| `chat_sessions` | 🟡 Medium | `user_id UUID` | Change to `TEXT` for BetterAuth compatibility |
| `scenario_events` | 🟡 Medium | `user_id UUID` | Change to `TEXT` for BetterAuth compatibility |

### Tables Inheriting User Scope via Foreign Keys

| Table | Parent Table | Inheritance | Notes |
|-------|--------------|-------------|-------|
| `conversation_history` | `chat_sessions` | Via `session_id` FK | No direct change needed |
| `tool_execution_log` | `chat_sessions` | Via `session_id` FK | No direct change needed |
| `scenario_event_impacts` | `scenario_events` | Via `event_id` FK | No direct change needed |
| `property_links` | `property_scenarios` | Via `property_scenario_id` FK | No direct change needed |

### Components Requiring Code Updates

#### 1. **Financial Data Tables**
```sql
-- Current schema lacks user_id
finance_assets
finance_liabilities
finance_incomes
finance_expenses
property_scenarios
growth_configs
```

**Impact**: High - Core financial data must be user-scoped
**Required Changes**: Add `user_id` columns, update all queries
**Files Affected**: All repository and handler files

#### 2. **Session Management**
```sql
-- Already has user_id but needs type change
chat_sessions (user_id UUID → TEXT)
scenario_events (user_id UUID → TEXT)
conversation_history (via session_id)
```

**Impact**: Medium - Structure exists, needs BetterAuth integration
**Required Changes**: Change user_id type, link to BetterAuth user table
**Files Affected**: `session/store.go`, `handlers/chat.go`, `handlers/scenario_events.go`

#### 3. **Financial Tools & Actions**
```go
// Tools currently use session context
financial/tools.go
financial/client.go
financial/preview.go
```

**Impact**: High - All financial operations need user context
**Required Changes**: Replace session-based with user-based access
**Files Affected**: All financial operation files

#### 4. **Timeline and Growth Projections**
```go
financial/timeline/service.go
handlers/timeline.go
```

**Impact**: Medium - User-specific financial projections
**Required Changes**: Add user filtering to calculations, user-scoped growth_configs
**Files Affected**: Timeline service and handlers

#### 5. **Property Links and Scenarios**
```go
handlers/property_links.go
handlers/property_scenarios.go
```

**Impact**: Medium - Property planning is user-specific
**Required Changes**: User-scoped property management
**Files Affected**: Property-related handlers

#### 6. **Scenario Events**
```go
handlers/scenario_events.go
```

**Impact**: Medium - Already has user_id, needs type migration
**Required Changes**: Change user_id from UUID to TEXT
**Files Affected**: Scenario event handlers

#### 7. **API Request Context**
```go
middleware/auth.go
handlers/common.go
```

**Impact**: High - Core authentication flow
**Required Changes**: BetterAuth token verification
**Files Affected**: Middleware and common handlers

## 🗃️ Database Schema Changes

### Required Migrations

#### Migration 1: Add user_id columns to financial tables

```sql
-- Add BetterAuth user_id to all financial tables
ALTER TABLE finance_assets
ADD COLUMN user_id TEXT REFERENCES "user"(id) ON DELETE CASCADE;

ALTER TABLE finance_liabilities
ADD COLUMN user_id TEXT REFERENCES "user"(id) ON DELETE CASCADE;

ALTER TABLE finance_incomes
ADD COLUMN user_id TEXT REFERENCES "user"(id) ON DELETE CASCADE;

ALTER TABLE finance_expenses
ADD COLUMN user_id TEXT REFERENCES "user"(id) ON DELETE CASCADE;

ALTER TABLE property_scenarios
ADD COLUMN user_id TEXT REFERENCES "user"(id) ON DELETE CASCADE;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_finance_assets_user_id ON finance_assets(user_id);
CREATE INDEX IF NOT EXISTS idx_finance_liabilities_user_id ON finance_liabilities(user_id);
CREATE INDEX IF NOT EXISTS idx_finance_incomes_user_id ON finance_incomes(user_id);
CREATE INDEX IF NOT EXISTS idx_finance_expenses_user_id ON finance_expenses(user_id);
CREATE INDEX IF NOT EXISTS idx_property_scenarios_user_id ON property_scenarios(user_id);
```

#### Migration 2: Update growth_configs for user-scoped rates

```sql
-- Migrate growth_configs from category-only key to user+category key
-- Step 1: Create new table with user_id
CREATE TABLE growth_configs_new (
    user_id TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
    category TEXT NOT NULL,
    annual_rate_pct DOUBLE PRECISION NOT NULL,
    lower_bound_pct DOUBLE PRECISION NOT NULL,
    upper_bound_pct DOUBLE PRECISION NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (user_id, category)
);

-- Step 2: Keep old table as defaults template (renamed)
ALTER TABLE growth_configs RENAME TO growth_configs_defaults;

-- Step 3: Create function to initialize user growth configs from defaults
CREATE OR REPLACE FUNCTION initialize_user_growth_configs(p_user_id TEXT) RETURNS VOID AS $$
BEGIN
    INSERT INTO growth_configs_new (user_id, category, annual_rate_pct, lower_bound_pct, upper_bound_pct)
    SELECT p_user_id, category, annual_rate_pct, lower_bound_pct, upper_bound_pct
    FROM growth_configs_defaults
    ON CONFLICT (user_id, category) DO NOTHING;
END;
$$ LANGUAGE plpgsql;

-- Step 4: Rename new table to growth_configs
ALTER TABLE growth_configs_new RENAME TO growth_configs;

-- Step 5: Add index for user lookups
CREATE INDEX IF NOT EXISTS idx_growth_configs_user_id ON growth_configs(user_id);
```

#### Migration 3: Update session management for BetterAuth

```sql
-- Update chat_sessions user_id from UUID to TEXT
ALTER TABLE chat_sessions
ALTER COLUMN user_id SET DATA TYPE TEXT USING user_id::TEXT;

-- Update scenario_events user_id from UUID to TEXT
ALTER TABLE scenario_events
ALTER COLUMN user_id SET DATA TYPE TEXT USING user_id::TEXT;

-- Add foreign key constraints to BetterAuth user table
-- Note: Only add after BetterAuth tables exist and data is migrated
ALTER TABLE chat_sessions
ADD CONSTRAINT fk_chat_sessions_user
FOREIGN KEY (user_id) REFERENCES "user"(id) ON DELETE CASCADE;

ALTER TABLE scenario_events
ADD CONSTRAINT fk_scenario_events_user
FOREIGN KEY (user_id) REFERENCES "user"(id) ON DELETE CASCADE;

-- Add session mapping table for migration
CREATE TABLE session_user_mapping (
    old_session_id UUID PRIMARY KEY,
    betterauth_user_id TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### Migration 3: Create audit and timeline tables with user_id

```sql
-- Financial timeline table (user-specific)
CREATE TABLE IF NOT EXISTS financial_timeline (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
    year INTEGER NOT NULL,
    data JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(user_id, year)
);

CREATE INDEX IF NOT EXISTS idx_financial_timeline_user_year ON financial_timeline(user_id, year);

-- Audit log table
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT REFERENCES "user"(id) ON DELETE SET NULL,
    session_id TEXT,
    action VARCHAR(100) NOT NULL,
    resource_type VARCHAR(50),
    resource_id TEXT,
    old_values JSONB,
    new_values JSONB,
    ip_address INET,
    user_agent TEXT,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    metadata JSONB
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON audit_logs(timestamp);
```

## 🔧 Code Changes Required

### 1. Repository Layer Updates

#### File: `backend/internal/financial/repository/store.go`

**Current Issues**:
- No user_id filtering in queries
- Session-based data access
- Global data retrieval methods

**Required Changes**:

```go
// BEFORE: Session-based queries
func (s *Store) GetAssets(ctx context.Context) ([]Asset, error) {
    query := `SELECT id, name, category, current_value FROM finance_assets ORDER BY name`
    // ... returns all assets globally
}

// AFTER: User-scoped queries
func (s *Store) GetAssetsByUserID(ctx context.Context, userID string) ([]Asset, error) {
    query := `
        SELECT id, name, category, current_value, annual_growth_rate,
               frequency, start_year, end_year, notes, updated_at
        FROM finance_assets
        WHERE user_id = $1
        ORDER BY name`

    rows, err := s.db.QueryContext(ctx, query, userID)
    // ... user-scoped implementation
}

// Add user_id to all Create/Update operations
func (s *Store) CreateAsset(ctx context.Context, userID string, asset Asset) (*Asset, error) {
    query := `
        INSERT INTO finance_assets (user_id, name, category, current_value, annual_growth_rate, notes)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING id, updated_at`

    err := s.db.QueryRowContext(ctx, query,
        userID, asset.Name, asset.Category, asset.CurrentValue,
        asset.AnnualGrowthRate, asset.Notes).Scan(&asset.ID, &asset.UpdatedAt)

    return &asset, err
}
```

**Files to Update**:
- `repository/store.go` - All CRUD methods for assets, liabilities, incomes, expenses
- Add user_id parameter to all repository methods
- Update all SQL queries to include `WHERE user_id = $1`

### 2. Handler Layer Updates

#### File: `backend/cmd/server/handlers/assets.go`

**Current Issues**:
- Handlers don't extract user context
- No user-based access control
- Session-based operations

**Required Changes**:

```go
// BEFORE: No user context
func (h *AssetHandler) GetAssets(w http.ResponseWriter, r *http.Request) {
    assets, err := h.store.GetAssets(r.Context())
    // ... no user filtering
}

// AFTER: User-scoped operations
func (h *AssetHandler) GetAssets(w http.ResponseWriter, r *http.Request) {
    // Extract user from BetterAuth context
    userCtx := middleware.GetUserContext(r.Context())
    if !userCtx.IsVerified {
        http.Error(w, "Authentication required", http.StatusUnauthorized)
        return
    }

    assets, err := h.store.GetAssetsByUserID(r.Context(), userCtx.UserID)
    if err != nil {
        http.Error(w, "Failed to fetch assets", http.StatusInternalServerError)
        return
    }

    // Return user-specific assets
    json.NewEncoder(w).Encode(map[string]interface{}{
        "assets": assets,
        "user_id": userCtx.UserID,
    })
}

func (h *AssetHandler) CreateAsset(w http.ResponseWriter, r *http.Request) {
    userCtx := middleware.GetUserContext(r.Context())
    if !userCtx.IsVerified {
        http.Error(w, "Authentication required", http.StatusUnauthorized)
        return
    }

    var req CreateAssetRequest
    if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
        http.Error(w, "Invalid request", http.StatusBadRequest)
        return
    }

    // Create asset for authenticated user
    asset, err := h.store.CreateAsset(r.Context(), userCtx.UserID, Asset{
        Name:             req.Name,
        Category:         req.Category,
        CurrentValue:     req.CurrentValue,
        AnnualGrowthRate: req.AnnualGrowthRate,
        Notes:           req.Notes,
    })

    if err != nil {
        http.Error(w, "Failed to create asset", http.StatusInternalServerError)
        return
    }

    json.NewEncoder(w).Encode(asset)
}
```

**Files to Update**:
- `handlers/assets.go` - All asset operations
- `handlers/liabilities.go` - All liability operations
- `handlers/incomes.go` - All income operations
- `handlers/expenses.go` - All expense operations
- `handlers/property_scenarios.go` - Property scenario operations
- `handlers/timeline.go` - Timeline operations

### 3. Financial Tools Integration

#### File: `backend/internal/financial/tools.go`

**Current Issues**:
- Tools access session context but don't extract user_id
- Session-based financial operations
- No user validation in tool execution

**Required Changes**:

```go
// BEFORE: Session-based tool execution
func createAsset(params map[string]interface{}, client *Client, sessionID string) (interface{}, error) {
    // Creates asset without user association
    return client.CreateAsset(context.Background(), asset)
}

// AFTER: User-scoped tool execution
func createAsset(params map[string]interface{}, client *Client, userID string) (interface{}, error) {
    // Validate user context
    if userID == "" {
        return nil, fmt.Errorf("user authentication required")
    }

    asset := Asset{
        Name:         params["name"].(string),
        Category:     params["category"].(string),
        CurrentValue: params["currentValue"].(float64),
    }

    // Create asset for specific user
    return client.CreateAssetForUser(context.Background(), userID, asset)
}

// Update tool registry to pass user context
func (r *Registry) ExecuteTool(toolName string, params map[string]interface{}, userID string) (interface{}, error) {
    tool, exists := r.tools[toolName]
    if !exists {
        return nil, fmt.Errorf("tool not found: %s", toolName)
    }

    // Pass user ID to tool execution
    switch toolName {
    case "createAsset":
        return createAsset(params, r.client, userID)
    case "createLiability":
        return createLiability(params, r.client, userID)
    // ... all tools updated for user context
    default:
        return nil, fmt.Errorf("tool execution not implemented: %s", toolName)
    }
}
```

### 4. Chat and Session Management

#### File: `backend/cmd/server/handlers/chat.go`

**Current Issues**:
- Session management not integrated with BetterAuth users
- User context extraction needs BetterAuth token verification

**Required Changes**:

```go
// BEFORE: Basic session handling
func (h *ChatHandler) HandleChat(w http.ResponseWriter, r *http.Request) {
    // Get session without user verification
    userID := r.Header.Get("X-User-ID")
    sessionState, err := h.sessionStore.CreateSession(ctx, userID, req.SessionID)
}

// AFTER: BetterAuth integrated session handling
func (h *ChatHandler) HandleChat(w http.ResponseWriter, r *http.Request) {
    // Verify BetterAuth session
    userCtx := middleware.GetUserContext(r.Context())
    if !userCtx.IsVerified {
        http.Error(w, "Authentication required", http.StatusUnauthorized)
        return
    }

    // Use verified user ID from BetterAuth
    sessionState, err := h.sessionStore.CreateSession(ctx, userCtx.UserID, req.SessionID)

    // All subsequent operations use userCtx.UserID
    // Tool execution with user context
    result, err := h.toolRegistry.ExecuteTool(toolCall.Name, toolCall.Arguments, userCtx.UserID)
}
```

### 5. Middleware Updates

#### File: `backend/internal/middleware/auth.go`

**Current Updates Needed**:

```go
// Update UserContext struct
type UserContext struct {
    UserID     string
    SessionID  string
    Token      string
    IsVerified bool  // true only for BetterAuth verified sessions
    Email      string // from BetterAuth token
}

// Enhanced token verification
func Authenticate(next http.Handler) http.Handler {
    return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        sessionToken := r.Header.Get("X-Session-Token")
        userID := r.Header.Get("X-User-ID")

        userCtx := UserContext{
            UserID:     userID,
            Token:      sessionToken,
            IsVerified: false,
        }

        // Verify BetterAuth session token if present
        if sessionToken != "" && userID != "" {
            if payload, valid := verifyBetterAuthToken(sessionToken, userID); valid {
                userCtx.UserID = payload.UserID
                userCtx.SessionID = payload.SessionID
                userCtx.IsVerified = true
                userCtx.Email = payload.Email // from token
            }
        }

        ctx := context.WithValue(r.Context(), userContextKey{}, userCtx)
        next.ServeHTTP(w, r.WithContext(ctx))
    })
}
```

## 🔄 Migration Strategy

### Phase 1: Database Schema Updates (Zero Downtime)

1. **Add nullable user_id columns**:
   ```sql
   ALTER TABLE finance_assets ADD COLUMN user_id TEXT;
   ALTER TABLE finance_liabilities ADD COLUMN user_id TEXT;
   -- etc for all tables
   ```

2. **Create migration functions**:
   ```sql
   CREATE FUNCTION migrate_session_to_user(old_session_id UUID, new_user_id TEXT) RETURNS VOID AS $$
   BEGIN
       UPDATE finance_assets SET user_id = new_user_id WHERE session_id = old_session_id;
       UPDATE finance_liabilities SET user_id = new_user_id WHERE session_id = old_session_id;
       -- etc
   END;
   $$ LANGUAGE plpgsql;
   ```

### Phase 2: Code Updates (Backward Compatible)

1. **Update repository methods** to accept optional user_id
2. **Modify handlers** to extract user context but fallback to session
3. **Update middleware** to support both old and new auth

### Phase 3: BetterAuth Integration

1. **Deploy BetterAuth** with user registration
2. **Implement session migration** during user signup
3. **Test dual auth system** (old + new)

### Phase 4: Make user_id Required

1. **Add NOT NULL constraints**:
   ```sql
   ALTER TABLE finance_assets ALTER COLUMN user_id SET NOT NULL;
   ```

2. **Remove legacy session-based code**
3. **Remove old auth middleware**

### Phase 5: Cleanup

1. **Remove session_id columns** from financial tables
2. **Drop migration functions**
3. **Optimize indexes**

## 🧪 Testing Strategy

### Database Testing
```sql
-- Test user-scoped queries
SELECT * FROM finance_assets WHERE user_id = 'test-user-1';

-- Test data isolation
INSERT INTO finance_assets (user_id, name, current_value)
VALUES ('user-1', 'Asset 1', 1000), ('user-2', 'Asset 1', 2000);

-- Verify no cross-user data access
SELECT COUNT(*) FROM finance_assets WHERE user_id = 'user-1'; -- Should be 1
```

### API Testing
```bash
# Test authenticated endpoints
curl -H "Authorization: Bearer valid-token" \
     -H "X-User-ID: user-123" \
     https://verylocal:3000/api/v1/assets

# Test unauthorized access
curl https://verylocal:3000/api/v1/assets # Should return 401
```

### Integration Testing
- Test user registration and data migration
- Verify session-to-user data mapping
- Test cross-user data isolation
- Validate BetterAuth token verification

## 📋 Implementation Checklist

### Database Changes
- [ ] Create BetterAuth tables (automatic)
- [ ] Add user_id columns to financial tables
- [ ] Create migration functions
- [ ] Add indexes for performance
- [ ] Create audit log tables

### Backend Changes
- [ ] Update repository methods with user_id
- [ ] Modify all handlers for user context
- [ ] Update financial tools for user-scoping
- [ ] Enhance middleware for BetterAuth
- [ ] Update session management
- [ ] Add user-scoped timeline calculations

### Frontend Changes
- [ ] Implement BetterAuth login/signup
- [ ] Update API calls to include auth headers
- [ ] Add session migration on registration
- [ ] Update existing components for auth state

### Security & Testing
- [ ] Test user data isolation
- [ ] Verify token verification
- [ ] Test migration procedures
- [ ] Validate access control
- [ ] Performance test with user filtering

## 🚨 Critical Considerations

### Data Security
- **User Isolation**: All financial data must be strictly user-scoped
- **Migration Safety**: Existing anonymous data needs careful handling
- **Access Control**: No cross-user data leakage

### Performance
- **Database Indexes**: Essential for user_id filtering performance
- **Query Optimization**: User-scoped queries must remain fast
- **Connection Pooling**: Handle increased query complexity

### User Experience
- **Migration UX**: Smooth transition from anonymous to authenticated
- **Data Preservation**: No data loss during migration
- **Backward Compatibility**: Gradual transition for existing users

This comprehensive integration plan ensures that BetterAuth user authentication is properly implemented across all components while maintaining data security and system performance.
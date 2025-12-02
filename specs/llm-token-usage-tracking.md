# Plan: Add LLM Token Usage Tracking + Conversation Persistence

## Goal
1. Track per-request token usage to estimate costs and determine free tier limits
2. Persist conversation history (infrastructure exists but isn't being used)

## Current State

### Token Usage
- `ToolCallResponse` already captures: `Usage`, `Provider`, `Model`, `ProcessingTime`, `RequestID`
- Data is returned at `chat.go:240` but discarded after response
- Gemini provider only returns completion tokens (API limitation)
- Existing `tool_execution_log` table provides migration pattern

### Conversation History
- `conversation_history` table **already exists** (migration 20241121001)
- `SaveConversationHistory()` method **already exists** in `session/store.go:339`
- **Problem:** The method is never called - it's dead code
- Messages are stored in session JSONB blob, not the dedicated table

## Gemini 2.5 Flash Pricing (as of Dec 2024)
| Type | Cost per 1M tokens |
|------|-------------------|
| Input (text/image/video) | $0.30 |
| Output | $2.50 |
| Cached tokens | ~90% discount |

Typical conversation (5-10 exchanges): ~$0.01-0.05

---

## Implementation Plan

### Step 0: Fix Gemini Provider Token Extraction
Update `backend/internal/llm/providers/gemini.go` to use `response.UsageMetadata`:

**Current (broken):**
```go
if candidate.TokenCount > 0 {
    usage = &llm.TokenUsage{
        CompletionTokens: int(candidate.TokenCount),
        TotalTokens:      int(candidate.TokenCount),
    }
}
```

**Fixed:**
```go
if response.UsageMetadata != nil {
    usage = &llm.TokenUsage{
        PromptTokens:     int(response.UsageMetadata.PromptTokenCount),
        CompletionTokens: int(response.UsageMetadata.CandidatesTokenCount),
        CachedTokens:     int(response.UsageMetadata.CachedContentTokenCount),
        ThoughtsTokens:   int(response.UsageMetadata.ThoughtsTokenCount),
        TotalTokens:      int(response.UsageMetadata.TotalTokenCount),
    }
}
```

Also update `llm/types.go` TokenUsage struct to include new fields.

### Step 1: Database Migration
Create `backend/migrations/YYYYMMDD_llm_usage_log.up.sql`:

```sql
CREATE TABLE llm_usage_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    session_id UUID REFERENCES chat_sessions(session_id) ON DELETE SET NULL,
    request_id VARCHAR(255) NOT NULL,
    provider VARCHAR(50) NOT NULL,
    model VARCHAR(100) NOT NULL,

    -- Token counts (from Gemini UsageMetadata)
    prompt_tokens INTEGER DEFAULT 0,
    completion_tokens INTEGER DEFAULT 0,
    cached_tokens INTEGER DEFAULT 0,
    thoughts_tokens INTEGER DEFAULT 0,  -- for thinking models
    total_tokens INTEGER DEFAULT 0,

    -- Cost tracking
    input_cost_usd DECIMAL(12, 10) DEFAULT 0,
    output_cost_usd DECIMAL(12, 10) DEFAULT 0,
    total_cost_usd DECIMAL(12, 10) DEFAULT 0,

    -- Metadata
    processing_time_ms INTEGER,
    tool_calls_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_llm_usage_user_id ON llm_usage_log(user_id);
CREATE INDEX idx_llm_usage_created_at ON llm_usage_log(created_at);
CREATE INDEX idx_llm_usage_user_date ON llm_usage_log(user_id, created_at);
```

### Step 2: Usage Repository
Create `backend/internal/usage/repository.go`:
- `LogUsage(ctx, userID, sessionID, response *llm.ToolCallResponse) error`
- `GetUserDailyUsage(ctx, userID, date) (*DailyUsage, error)`
- `GetUserMonthlyUsage(ctx, userID, month) (*MonthlyUsage, error)`

### Step 3: Cost Calculator
Create `backend/internal/usage/cost.go`:

```go
// Pricing per million tokens (as of Dec 2024)
var GeminiPricing = map[string]ModelPricing{
    "gemini-2.5-flash": {
        InputPerMillion:  0.30,
        OutputPerMillion: 2.50,
        CachedPerMillion: 0.03, // 90% discount
    },
    "gemini-2.5-pro": {
        InputPerMillion:  1.25,
        OutputPerMillion: 10.00,
    },
    "gemini-2.0-flash": {
        InputPerMillion:  0.10,
        OutputPerMillion: 0.40,
    },
}

func CalculateCost(model string, usage *TokenUsage) Cost {
    pricing := GeminiPricing[model]
    inputCost := float64(usage.PromptTokens) / 1_000_000 * pricing.InputPerMillion
    outputCost := float64(usage.CompletionTokens) / 1_000_000 * pricing.OutputPerMillion
    return Cost{
        InputCost:  inputCost,
        OutputCost: outputCost,
        TotalCost:  inputCost + outputCost,
    }
}
```

### Step 4: Feature Flag Configuration
Add to `backend/internal/config/config.go` or environment:

```go
type UsageTrackingConfig struct {
    Enabled bool   `env:"USAGE_TRACKING_ENABLED" default:"true"`
    LogLevel string `env:"USAGE_TRACKING_LOG_LEVEL" default:"full"` // "full", "summary", "none"
}
```

Environment variables:
- `USAGE_TRACKING_ENABLED=true` - Enable/disable logging
- `USAGE_TRACKING_LOG_LEVEL=full` - Level of detail to log

### Step 5: Hook into Chat Handler
Modify `backend/cmd/server/handlers/chat.go` after line 240:

```go
response, err := h.llmClient.GenerateToolCalls(llmCtx, llmRequest)
if err != nil { ... }

// Log usage (non-blocking, respects feature flag)
if h.config.UsageTracking.Enabled {
    go h.usageRepo.LogUsage(ctx, authUserID, req.SessionID, response)
}
```

### Step 6: Enable Conversation Persistence
Call the existing `SaveConversationHistory()` method in chat.go after each exchange:

```go
// Save user message + assistant response to conversation_history table
messagesToSave := []llm.ChatMessage{
    {Role: "user", Content: req.Message},
    response.Message,
}
go h.sessionStore.SaveConversationHistory(ctx, req.SessionID, messagesToSave)
```

**Note:** This uses the existing infrastructure - no new tables or methods needed.

---

## Files to Modify
1. `backend/internal/llm/types.go` - extend TokenUsage struct with new fields
2. `backend/internal/llm/providers/gemini.go` - fix token extraction to use UsageMetadata
3. `backend/migrations/` - new migration file for `llm_usage_log`
4. `backend/internal/usage/` - new package (repository.go, cost.go, types.go)
5. `backend/internal/config/` - add UsageTrackingConfig with feature flag
6. `backend/cmd/server/handlers/chat.go` - add usage logging + conversation persistence calls
7. `backend/cmd/server/main.go` - wire up usage repository and config

## Useful Queries

### Daily Cost per User
```sql
SELECT
    user_id,
    DATE(created_at) as date,
    COUNT(*) as requests,
    SUM(prompt_tokens) as input_tokens,
    SUM(completion_tokens) as output_tokens,
    SUM(cached_tokens) as cached_tokens,
    SUM(total_cost_usd) as total_cost
FROM llm_usage_log
GROUP BY user_id, DATE(created_at)
ORDER BY date DESC;
```

### Monthly Cost Summary
```sql
SELECT
    DATE_TRUNC('month', created_at) as month,
    COUNT(DISTINCT user_id) as unique_users,
    COUNT(*) as total_requests,
    SUM(total_tokens) as total_tokens,
    SUM(total_cost_usd) as total_cost
FROM llm_usage_log
GROUP BY DATE_TRUNC('month', created_at);
```

### Cost per Conversation (Session)
```sql
SELECT
    session_id,
    COUNT(*) as exchanges,
    SUM(prompt_tokens) as input_tokens,
    SUM(completion_tokens) as output_tokens,
    SUM(total_cost_usd) as conversation_cost
FROM llm_usage_log
WHERE session_id IS NOT NULL
GROUP BY session_id;
```

### View Conversation History
```sql
SELECT role, content, created_at
FROM conversation_history
WHERE session_id = 'xxx'
ORDER BY created_at;
```

---

## Implementation Tickets

### Ticket 1: Fix Gemini Token Extraction
**Priority:** High | **Effort:** Small | **Depends on:** None

**Description:**
Update the Gemini provider to correctly extract all token counts from `response.UsageMetadata` instead of the incomplete `candidate.TokenCount`.

**Files:**
- `backend/internal/llm/types.go` - Add `CachedTokens`, `ThoughtsTokens` to TokenUsage struct
- `backend/internal/llm/providers/gemini.go` - Update `convertResponse()` function

**Acceptance Criteria:**
- [ ] TokenUsage struct includes: PromptTokens, CompletionTokens, CachedTokens, ThoughtsTokens, TotalTokens
- [ ] Gemini provider populates all fields from `response.UsageMetadata`
- [ ] Existing tests pass

---

### Ticket 2: Create LLM Usage Log Table
**Priority:** High | **Effort:** Small | **Depends on:** None

**Description:**
Create database migration for the `llm_usage_log` table to store per-request token usage and costs.

**Files:**
- `backend/migrations/YYYYMMDD_llm_usage_log.up.sql`
- `backend/migrations/YYYYMMDD_llm_usage_log.down.sql`

**Acceptance Criteria:**
- [ ] Migration creates table with all token columns (prompt, completion, cached, thoughts, total)
- [ ] Migration creates cost columns (input_cost_usd, output_cost_usd, total_cost_usd)
- [ ] Indexes created on user_id, created_at, (user_id, created_at)
- [ ] Down migration drops table cleanly

---

### Ticket 3: Implement Usage Repository & Cost Calculator
**Priority:** High | **Effort:** Medium | **Depends on:** Ticket 1, Ticket 2

**Description:**
Create the usage package with repository for logging/querying and cost calculation based on Gemini pricing.

**Files:**
- `backend/internal/usage/types.go` - Define UsageLog, DailyUsage, Cost structs
- `backend/internal/usage/repository.go` - LogUsage, GetUserDailyUsage, GetUserMonthlyUsage
- `backend/internal/usage/cost.go` - GeminiPricing map, CalculateCost function

**Acceptance Criteria:**
- [ ] LogUsage persists all token counts and calculated costs
- [ ] CalculateCost returns correct USD values for gemini-2.5-flash ($0.30/M in, $2.50/M out)
- [ ] GetUserDailyUsage returns aggregated stats for a user/date
- [ ] Unit tests for cost calculation

---

### Ticket 4: Add Feature Flag Configuration
**Priority:** Medium | **Effort:** Small | **Depends on:** None

**Description:**
Add configuration for enabling/disabling usage tracking via environment variables.

**Files:**
- `backend/internal/config/config.go` (or create `backend/internal/config/usage.go`)

**Acceptance Criteria:**
- [ ] `USAGE_TRACKING_ENABLED` env var (default: true)
- [ ] Config struct accessible from handlers
- [ ] Documentation in .env.example

---

### Ticket 5: Wire Up Usage Logging in Chat Handler
**Priority:** High | **Effort:** Small | **Depends on:** Ticket 3, Ticket 4

**Description:**
Integrate usage logging into the chat handler, respecting the feature flag.

**Files:**
- `backend/cmd/server/handlers/chat.go` - Add logging after LLM call
- `backend/cmd/server/main.go` - Wire up UsageRepository dependency

**Acceptance Criteria:**
- [ ] Usage logged after each successful LLM call (non-blocking goroutine)
- [ ] Logging skipped when feature flag is disabled
- [ ] No impact on response latency

---

### Ticket 6: Enable Conversation History Persistence
**Priority:** Medium | **Effort:** Small | **Depends on:** None

**Description:**
Wire up the existing `SaveConversationHistory()` method which is currently dead code.

**Files:**
- `backend/cmd/server/handlers/chat.go` - Call SaveConversationHistory after exchanges

**Acceptance Criteria:**
- [ ] User message + assistant response saved to `conversation_history` table
- [ ] Tool call messages included
- [ ] Non-blocking (goroutine)
- [ ] Verify data appears in database

---

## Ticket Dependency Graph

```
Ticket 1 ─────┐
              ├──→ Ticket 3 ──→ Ticket 5
Ticket 2 ─────┘                    ↑
                                   │
Ticket 4 ──────────────────────────┘

Ticket 6 (independent)
```

## Suggested Order
1. **Ticket 1** + **Ticket 2** + **Ticket 4** + **Ticket 6** (parallel - no dependencies)
2. **Ticket 3** (needs 1 & 2)
3. **Ticket 5** (needs 3 & 4)

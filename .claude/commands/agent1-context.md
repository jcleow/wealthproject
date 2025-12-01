# Agent 1: Context Injection & User Settings

You are implementing the context injection and user settings feature for the AI chat system.

## Git Workflow

**IMPORTANT**: Do NOT merge directly to main. Follow this workflow:

1. You are working on branch `feat/agent1-context`
2. When done, create a PR to the intermediary branch `feat/ai-scenario-handling`
3. Use: `gh pr create --base feat/ai-scenario-handling --title "Agent 1: Context Injection & User Settings" --body "..."`
4. The user will review and merge your PR to the intermediary branch
5. Final merge to main happens separately after all agents complete

## Your Tickets (9 points total)

| Ticket | Description | Points |
|--------|-------------|--------|
| B0.1 | GetFinancialContext | 3 |
| B0.2 | Inject context into chat | 2 |
| B0.3 | Update system prompt | 2 |
| B1.1 | Auto-execute setting (backend) | 3 |
| F1.1 | Auto-execute toggle (frontend) | 2 |

## Read First

Read the PRD at `/specs/ai-scenario-execution.md`, specifically:
- Section 3.5: Prompt Pipeline Architecture
- Section 4: API Contracts (Financial Context Response)
- Section 5: Implementation Tickets (B0.1, B0.2, B0.3, B1.1, F1.1)
- Section 7.5: Handling "What If" Questions

## Task 1: Create GetFinancialContext (B0.1)

**File**: `backend/internal/financial/client.go`

Add a method to fetch all user financial data:

```go
type FinancialContext struct {
    Assets      []AssetSummary      `json:"assets"`
    Liabilities []LiabilitySummary  `json:"liabilities"`
    Income      []IncomeSummary     `json:"income"`
    Expenses    []ExpenseSummary    `json:"expenses"`
    Scenarios   []ScenarioSummary   `json:"scenarios"`
    NetWorth    NetWorthSummary     `json:"netWorth"`
}

func (c *Client) GetFinancialContext(ctx context.Context, userID string) (*FinancialContext, error) {
    // 1. Fetch assets, liabilities, income, expenses in parallel
    // 2. Fetch scenarios
    // 3. Calculate net worth (sum assets - sum liabilities)
    // 4. Return structured context
}
```

Also create a `FormatFinancialContext(ctx *FinancialContext) string` function that outputs:

```
## Your Current Financial Snapshot

### Assets (Total: $850,000)
- [id: abc123] HDB Flat - $650,000 (property_real_estate)
- [id: def456] CPF OA - $120,000 (cpf_account)

### Liabilities (Total: $350,000)
- [id: jkl012] HDB Loan - $350,000 (mortgage_home)

### Income (Monthly: $8,500)
- [id: mno345] Salary - $8,000/month (salary)

### Expenses (Monthly: $4,200)
- [id: stu901] Mortgage Payment - $2,000/month (housing_mortgage)

### Existing Scenarios
- [id: sce001] "Buy a Car" - occurs 2025-06-01 (included: true)

### Net Worth
Current: $500,000
```

## Task 2: Inject Context into Chat Handler (B0.2)

**File**: `backend/cmd/server/handlers/chat.go`

Modify `prepareMessages()` to inject financial context:

```go
func (h *ChatHandler) prepareMessages(ctx context.Context, sessionState *session.SessionState, userMessage string, userID string) []llm.ChatMessage {
    messages := []llm.ChatMessage{}

    // Build dynamic system prompt
    systemPrompt := h.systemPrompt

    // Inject financial context
    financialContext, err := h.financialClient.GetFinancialContext(ctx, userID)
    if err == nil && financialContext != nil {
        systemPrompt += "\n\n" + financial.FormatFinancialContext(financialContext)
    }

    messages = append(messages, llm.ChatMessage{Role: "system", Content: systemPrompt})
    // ... rest of existing logic
}
```

You'll need to:
1. Add `financialClient` to ChatHandler struct
2. Pass it in NewChatHandler
3. Get userID from request context

## Task 3: Update System Prompt (B0.3)

**File**: `backend/internal/llm/prompts/system_prompt.txt`

Add these sections (see PRD for full content):

1. **Working with Scenarios** section
2. **System Capabilities & Boundaries** section
3. **Response Formatting** rules
4. **Handling "What If" Questions** section
5. **Intent Detection** patterns

## Task 4: Add Auto-Execute User Setting (B1.1)

**Migration file**: `backend/migrations/20241201001_add_ai_auto_execute.up.sql`
```sql
ALTER TABLE user_settings
ADD COLUMN allow_ai_auto_execute BOOLEAN NOT NULL DEFAULT false;
```

**Down migration**: `backend/migrations/20241201001_add_ai_auto_execute.down.sql`
```sql
ALTER TABLE user_settings DROP COLUMN allow_ai_auto_execute;
```

**Update struct** in `backend/internal/financial/repository/timeline.go`:
```go
type UserSettings struct {
    // ... existing fields
    AllowAIAutoExecute bool `json:"allowAIAutoExecute"`
}
```

**Check setting** in `chat.go`:
```go
// Before returning ProposedActions
settings, _ := h.settingsService.GetUserSettings(ctx, userID)
if settings.AllowAIAutoExecute {
    // Execute immediately instead of returning preview
} else {
    // Return preview for user approval (current behavior)
}
```

## Task 5: Add Settings Toggle UI (F1.1)

**File**: `frontend/src/types/financial.ts`
```typescript
export type UserSettings = {
  // ... existing fields
  allowAIAutoExecute: boolean
}
```

**File**: `frontend/src/components/modals/SettingsModal.tsx`

Add a toggle in the General Settings section:
```tsx
<div className="flex items-center justify-between">
  <div>
    <label className="text-sm font-medium text-slate-300">
      Allow AI to execute without approval
    </label>
    <p className="text-xs text-slate-500">
      When enabled, AI actions execute automatically
    </p>
  </div>
  <Switch
    checked={editedSettings.allowAIAutoExecute}
    onCheckedChange={(checked) => {
      setEditedSettings(prev => ({ ...prev, allowAIAutoExecute: checked }))
      setHasSettingsChanges(true)
    }}
  />
</div>
```

## Files You Own

- `backend/cmd/server/handlers/chat.go`
- `backend/internal/llm/prompts/system_prompt.txt`
- `backend/internal/financial/repository/timeline.go` (UserSettings only)
- `backend/migrations/` (new migration)
- `frontend/src/types/financial.ts`
- `frontend/src/components/modals/SettingsModal.tsx`

## Do NOT Modify

- `backend/internal/financial/tools.go` (Agent 2 owns this)
- `backend/internal/financial/preview.go` (Agent 2 owns this)
- Any analysis/projection logic (Agent 3 owns this)

## Testing

After each change:
```bash
cd backend && go build ./... && go test ./...
cd frontend && npm run type-check
```

## Section Marker for client.go

When adding to `client.go`, use this marker:
```go
// ============================================
// SECTION: Context (Agent 1)
// ============================================

func (c *Client) GetFinancialContext(...) { ... }
```

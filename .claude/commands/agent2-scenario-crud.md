# Agent 2: Scenario CRUD Tools

You are implementing scenario CRUD tools for the AI chat system.

## Git Workflow

**IMPORTANT**: Do NOT merge directly to main. Follow this workflow:

1. You are working on branch `feat/agent2-scenario-crud`
2. When done, create a PR to the intermediary branch `feat/ai-scenario-handling`
3. Use: `gh pr create --base feat/ai-scenario-handling --title "Agent 2: Scenario CRUD Tools" --body "..."`
4. The user will review and merge your PR to the intermediary branch
5. Final merge to main happens separately after all agents complete

## Your Tickets (10 points total)

| Ticket | Description | Points |
|--------|-------------|--------|
| B2.1 | createScenarioEvent tool | 3 |
| B2.2 | updateScenarioEvent tool | 2 |
| B2.3 | deleteScenarioEvent tool | 2 |
| B2.4 | listScenarioEvents tool | 2 |
| B2.5 | toggleScenarioIncluded tool | 1 |

## Read First

Read the PRD at `/specs/ai-scenario-execution.md`, specifically:
- Section 4: API Contracts (Tool Call Examples)
- Section 5: Implementation Tickets (B2.1-B2.5)
- Section 7.5: Handling "What If" Questions

Also study existing patterns in:
- `backend/internal/financial/tools.go` (createAsset, deleteAsset examples)
- `backend/internal/financial/repository/scenario_events.go` (existing CRUD)

## Task 1: Add Tool Definitions (tools.go)

**File**: `backend/internal/financial/tools.go`

Add 5 tool definitions. Example for createScenarioEvent:

```go
r.tools["createScenarioEvent"] = llm.ToolDefinition{
    Type: "function",
    Function: llm.FunctionSchema{
        Name:        "createScenarioEvent",
        Description: "Create a financial scenario to model future events like job changes, property purchases, or life events. Each scenario can have multiple impacts on assets, liabilities, income, or expenses.",
        Parameters: map[string]interface{}{
            "type": "object",
            "properties": map[string]interface{}{
                "name": map[string]interface{}{
                    "type":        "string",
                    "description": "Name of the scenario event",
                },
                "description": map[string]interface{}{
                    "type":        "string",
                    "description": "Detailed description of the scenario",
                },
                "occursOn": map[string]interface{}{
                    "type":        "string",
                    "description": "When this event occurs (YYYY-MM-DD format)",
                },
                "displayIcon": map[string]interface{}{
                    "type": "string",
                    "enum": []string{"briefcase", "home", "car", "baby", "graduation", "retirement", "travel", "health", "gift", "other"},
                },
                "tags": map[string]interface{}{
                    "type":  "array",
                    "items": map[string]interface{}{"type": "string"},
                },
                "isIncluded": map[string]interface{}{
                    "type":    "boolean",
                    "default": true,
                },
                "impacts": map[string]interface{}{
                    "type": "array",
                    "items": map[string]interface{}{
                        "type": "object",
                        "properties": map[string]interface{}{
                            "targetType": map[string]interface{}{
                                "type": "string",
                                "enum": []string{"asset", "liability", "income", "expense"},
                            },
                            "targetId": map[string]interface{}{
                                "type":        "string",
                                "description": "ID of existing item to impact (from financial snapshot)",
                            },
                            "targetName": map[string]interface{}{
                                "type":        "string",
                                "description": "Name for new item if targetId not provided",
                            },
                            "impactKind": map[string]interface{}{
                                "type": "string",
                                "enum": []string{"delta", "override", "start", "stop"},
                            },
                            "amount": map[string]interface{}{
                                "type": "number",
                            },
                            "cadence": map[string]interface{}{
                                "type": "string",
                                "enum": []string{"one_time", "monthly", "annual"},
                            },
                            "startMonth": map[string]interface{}{
                                "type":        "string",
                                "description": "Start date (YYYY-MM-DD)",
                            },
                            "endMonth": map[string]interface{}{
                                "type":        "string",
                                "description": "End date (YYYY-MM-DD), optional",
                            },
                            "notes": map[string]interface{}{
                                "type": "string",
                            },
                        },
                        "required": []string{"targetType", "impactKind", "amount", "cadence", "startMonth"},
                    },
                },
            },
            "required":             []string{"name", "occursOn", "impacts"},
            "additionalProperties": false,
        },
    },
}
```

Add similar definitions for:
- `updateScenarioEvent` - eventId/eventName + fields to update
- `deleteScenarioEvent` - eventId/eventName
- `listScenarioEvents` - year, includedOnly, tags, search filters
- `toggleScenarioIncluded` - eventId/eventName, isIncluded

## Task 2: Add Client Methods (client.go)

**File**: `backend/internal/financial/client.go`

Add execution methods that call the existing repository:

```go
// ============================================
// SECTION: Scenario CRUD (Agent 2)
// ============================================

type CreateScenarioEventParams struct {
    Name        string              `json:"name"`
    Description string              `json:"description"`
    OccursOn    string              `json:"occursOn"`
    DisplayIcon string              `json:"displayIcon"`
    Tags        []string            `json:"tags"`
    IsIncluded  bool                `json:"isIncluded"`
    Impacts     []ScenarioImpactParams `json:"impacts"`
}

type ScenarioImpactParams struct {
    TargetType string  `json:"targetType"`
    TargetID   string  `json:"targetId"`
    TargetName string  `json:"targetName"`
    ImpactKind string  `json:"impactKind"`
    Amount     float64 `json:"amount"`
    Cadence    string  `json:"cadence"`
    StartMonth string  `json:"startMonth"`
    EndMonth   string  `json:"endMonth"`
    Notes      string  `json:"notes"`
}

func (c *Client) CreateScenarioEvent(ctx context.Context, userID string, params CreateScenarioEventParams) (*string, error) {
    // Convert params to repository.ScenarioEvent
    // Call c.store.CreateScenarioEvent()
    // Return success message
}

func (c *Client) UpdateScenarioEvent(ctx context.Context, userID string, params UpdateScenarioEventParams) (*string, error) {
    // Resolve ID by eventId or eventName
    // Call c.store.UpdateScenarioEvent()
}

func (c *Client) DeleteScenarioEvent(ctx context.Context, userID string, params DeleteScenarioEventParams) (*string, error) {
    // Resolve ID by eventId or eventName
    // Call c.store.DeleteScenarioEvent()
}

func (c *Client) ListScenarioEvents(ctx context.Context, userID string, params ListScenarioEventsParams) (*string, error) {
    // Build filters from params
    // Call c.store.ListScenarioEvents()
    // Format as readable string for AI response
}

func (c *Client) ToggleScenarioIncluded(ctx context.Context, userID string, params ToggleScenarioParams) (*string, error) {
    // Resolve ID by eventId or eventName
    // Call c.store.ToggleScenarioIncluded()
}
```

## Task 3: Add Preview Generation (preview.go)

**File**: `backend/internal/financial/preview.go`

Add preview cases for each scenario tool:

```go
case "createScenarioEvent":
    var params CreateScenarioEventParams
    if err := json.Unmarshal([]byte(tc.Function.Arguments), &params); err != nil {
        return nil, err
    }

    impactSummary := fmt.Sprintf("%d impact(s)", len(params.Impacts))

    return &ProposedAction{
        CallID:              tc.ID,
        ToolName:            tc.Function.Name,
        FriendlyDescription: fmt.Sprintf("Create scenario '%s' occurring on %s with %s", params.Name, params.OccursOn, impactSummary),
        Parameters:          paramsMap,
        EstimatedImpact:     nil, // Could calculate net worth impact
    }, nil

case "deleteScenarioEvent":
    var params DeleteScenarioEventParams
    // ...
    return &ProposedAction{
        FriendlyDescription: fmt.Sprintf("Delete scenario '%s'", params.EventName),
        // ...
    }, nil

case "toggleScenarioIncluded":
    var params ToggleScenarioParams
    // ...
    action := "Enable"
    if !params.IsIncluded {
        action = "Disable"
    }
    return &ProposedAction{
        FriendlyDescription: fmt.Sprintf("%s scenario '%s'", action, params.EventName),
        // ...
    }, nil
```

## Task 4: Update Dispatch Handler (dispatch.go)

**File**: `backend/cmd/server/handlers/dispatch.go`

Add cases to execute the new tools:

```go
case "createScenarioEvent":
    var params financial.CreateScenarioEventParams
    if err := json.Unmarshal([]byte(tc.Function.Arguments), &params); err != nil {
        return "", fmt.Errorf("invalid params: %w", err)
    }
    return h.financialClient.CreateScenarioEvent(ctx, userID, params)

case "updateScenarioEvent":
    // ...

case "deleteScenarioEvent":
    // ...

case "listScenarioEvents":
    // ...

case "toggleScenarioIncluded":
    // ...
```

## Files You Own

- `backend/internal/financial/tools.go` (scenario tool definitions only)
- `backend/internal/financial/preview.go`
- `backend/cmd/server/handlers/dispatch.go` (scenario cases only)

## Do NOT Modify

- `backend/cmd/server/handlers/chat.go` (Agent 1 owns this)
- `backend/internal/llm/prompts/system_prompt.txt` (Agent 1 owns this)
- Analysis tools or net worth calculation (Agent 3 owns this)

## Testing

After each change:
```bash
cd backend && go build ./... && go test ./...
```

Test manually:
1. Start the server
2. Send a chat message: "Create a scenario for buying a car for $80k in June 2025"
3. Verify tool call is generated with correct parameters
4. Verify preview is generated correctly

## Section Marker for client.go

When adding to `client.go`, use this marker:
```go
// ============================================
// SECTION: Scenario CRUD (Agent 2)
// ============================================

func (c *Client) CreateScenarioEvent(...) { ... }
func (c *Client) UpdateScenarioEvent(...) { ... }
func (c *Client) DeleteScenarioEvent(...) { ... }
func (c *Client) ListScenarioEvents(...) { ... }
func (c *Client) ToggleScenarioIncluded(...) { ... }
```

## Reference: Existing Repository Methods

The repository already has these methods you should call:
- `store.CreateScenarioEvent(ctx, event)`
- `store.GetScenarioEvent(ctx, userID, eventID)`
- `store.ListScenarioEvents(ctx, userID, filters)`
- `store.UpdateScenarioEvent(ctx, event)`
- `store.DeleteScenarioEvent(ctx, userID, eventID)`
- `store.ToggleScenarioIncluded(ctx, userID, eventID, included)`

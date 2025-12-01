# Agent 3: Net Worth Analysis Tools

You are implementing net worth analysis tools for the AI chat system.

## Git Workflow

**IMPORTANT**: Do NOT merge directly to main. Follow this workflow:

1. You are working on branch `feat/agent3-analysis`
2. When done, create a PR to the intermediary branch `feat/ai-scenario-handling`
3. Use: `gh pr create --base feat/ai-scenario-handling --title "Agent 3: Net Worth Analysis Tools" --body "..."`
4. The user will review and merge your PR to the intermediary branch
5. Final merge to main happens separately after all agents complete

## Your Tickets (14 points total)

| Ticket | Description | Points |
|--------|-------------|--------|
| B1.2 | Real net worth calculation | 3 |
| B3.1 | getNetWorthSummary tool | 3 |
| B3.2 | analyzeNetWorthTrends tool | 3 |
| B3.3 | compareScenarioImpact tool | 3 |
| B3.4 | projectNetWorthAtYear tool | 2 |
| B3.5 | identifyNetWorthLevers tool | 3 |

## Read First

Read the PRD at `/specs/ai-scenario-execution.md`, specifically:
- Section 3: Technical Architecture (Data Flow for Net Worth Analysis)
- Section 4: API Contracts (getNetWorthSummary, compareScenarioImpact responses)
- Section 5: Implementation Tickets (B1.2, B3.1-B3.5)

Also study:
- `backend/internal/financial/timeline/service.go` - has projection logic
- `backend/internal/financial/client.go` - existing stubbed methods

## Task 1: Implement Real Net Worth Calculation (B1.2)

**File**: `backend/internal/financial/client.go`

Replace the stubbed implementation:

```go
// ============================================
// SECTION: Analysis (Agent 3)
// ============================================

// CalculateNetWorth calculates the current net worth from actual data
func (c *Client) CalculateNetWorth(ctx context.Context, userID string) (float64, error) {
    // Fetch all assets
    assets, err := c.store.ListAssets(ctx, userID, repository.PaginationParams{Limit: -1})
    if err != nil {
        return 0, err
    }

    // Fetch all liabilities
    liabilities, err := c.store.ListLiabilities(ctx, userID, repository.PaginationParams{Limit: -1})
    if err != nil {
        return 0, err
    }

    // Sum assets
    var totalAssets float64
    for _, asset := range assets.Items {
        totalAssets += asset.CurrentValue
    }

    // Sum liabilities
    var totalLiabilities float64
    for _, liability := range liabilities.Items {
        totalLiabilities += liability.CurrentBalance
    }

    return totalAssets - totalLiabilities, nil
}
```

## Task 2: Add Analysis Tool Definitions (tools.go)

**File**: `backend/internal/financial/tools.go`

Add 5 analysis tool definitions:

### getNetWorthSummary
```go
r.tools["getNetWorthSummary"] = llm.ToolDefinition{
    Type: "function",
    Function: llm.FunctionSchema{
        Name:        "getNetWorthSummary",
        Description: "Get current net worth with breakdown by category. Shows total assets, total liabilities, net worth, monthly income/expenses, and savings rate.",
        Parameters: map[string]interface{}{
            "type": "object",
            "properties": map[string]interface{}{
                "includeScenarios": map[string]interface{}{
                    "type":        "boolean",
                    "description": "Include active scenarios in calculation",
                    "default":     false,
                },
                "asOfYear": map[string]interface{}{
                    "type":        "integer",
                    "description": "Calculate as of specific year (0 = current)",
                    "default":     0,
                },
            },
        },
    },
}
```

### analyzeNetWorthTrends
```go
r.tools["analyzeNetWorthTrends"] = llm.ToolDefinition{
    Type: "function",
    Function: llm.FunctionSchema{
        Name:        "analyzeNetWorthTrends",
        Description: "Analyze net worth growth trajectory over the planning horizon. Returns projected values at key years and identifies milestones.",
        Parameters: map[string]interface{}{
            "type": "object",
            "properties": map[string]interface{}{
                "includeScenarios": map[string]interface{}{
                    "type":    "boolean",
                    "default": true,
                },
                "yearsToAnalyze": map[string]interface{}{
                    "type":    "integer",
                    "default": 30,
                },
            },
        },
    },
}
```

### compareScenarioImpact
```go
r.tools["compareScenarioImpact"] = llm.ToolDefinition{
    Type: "function",
    Function: llm.FunctionSchema{
        Name:        "compareScenarioImpact",
        Description: "Compare net worth trajectory with and without a specific scenario to understand its financial impact. Returns summary difference.",
        Parameters: map[string]interface{}{
            "type": "object",
            "properties": map[string]interface{}{
                "scenarioId": map[string]interface{}{
                    "type":        "string",
                    "description": "ID of scenario to analyze",
                },
                "scenarioName": map[string]interface{}{
                    "type":        "string",
                    "description": "Name of scenario (alternative to ID)",
                },
                "yearsToProject": map[string]interface{}{
                    "type":    "integer",
                    "default": 10,
                },
            },
        },
    },
}
```

### projectNetWorthAtYear
```go
r.tools["projectNetWorthAtYear"] = llm.ToolDefinition{
    Type: "function",
    Function: llm.FunctionSchema{
        Name:        "projectNetWorthAtYear",
        Description: "Project net worth at a specific year or age in the future.",
        Parameters: map[string]interface{}{
            "type": "object",
            "properties": map[string]interface{}{
                "targetYear": map[string]interface{}{
                    "type":        "integer",
                    "description": "Year number (0-30) to project to",
                },
                "targetAge": map[string]interface{}{
                    "type":        "integer",
                    "description": "Age to project to (alternative to targetYear)",
                },
                "includeScenarios": map[string]interface{}{
                    "type":    "boolean",
                    "default": true,
                },
            },
        },
    },
}
```

### identifyNetWorthLevers
```go
r.tools["identifyNetWorthLevers"] = llm.ToolDefinition{
    Type: "function",
    Function: llm.FunctionSchema{
        Name:        "identifyNetWorthLevers",
        Description: "Identify which assets, liabilities, income, or expenses have the biggest impact on net worth trajectory.",
        Parameters: map[string]interface{}{
            "type": "object",
            "properties": map[string]interface{}{
                "topN": map[string]interface{}{
                    "type":    "integer",
                    "default": 5,
                },
                "category": map[string]interface{}{
                    "type":    "string",
                    "enum":    []string{"all", "assets", "liabilities", "income", "expenses"},
                    "default": "all",
                },
            },
        },
    },
}
```

## Task 3: Add Analysis Client Methods (client.go)

**File**: `backend/internal/financial/client.go`

### GetNetWorthSummary
```go
type NetWorthSummaryResult struct {
    TotalAssets      float64            `json:"totalAssets"`
    TotalLiabilities float64            `json:"totalLiabilities"`
    NetWorth         float64            `json:"netWorth"`
    Breakdown        NetWorthBreakdown  `json:"breakdown"`
    MonthlyIncome    float64            `json:"monthlyIncome"`
    MonthlyExpenses  float64            `json:"monthlyExpenses"`
    MonthlySavings   float64            `json:"monthlySavings"`
    SavingsRate      float64            `json:"savingsRate"`
}

func (c *Client) GetNetWorthSummary(ctx context.Context, userID string, params GetNetWorthSummaryParams) (*string, error) {
    // 1. Get timeline (optionally with scenarios)
    // 2. Extract year 0 (current) or asOfYear
    // 3. Calculate totals by category
    // 4. Format as readable string for AI
}
```

### AnalyzeNetWorthTrends
```go
func (c *Client) AnalyzeNetWorthTrends(ctx context.Context, userID string, params AnalyzeNetWorthTrendsParams) (*string, error) {
    // 1. Get full timeline from timeline service
    // 2. Extract net worth at years 0, 5, 10, 20, 30
    // 3. Calculate average annual growth rate
    // 4. Find milestone years (e.g., when net worth crosses $500k, $1M, etc.)
    // 5. Format as readable string
}
```

### CompareScenarioImpact
```go
func (c *Client) CompareScenarioImpact(ctx context.Context, userID string, params CompareScenarioImpactParams) (*string, error) {
    // 1. Get timeline WITHOUT the scenario (baseline)
    // 2. Get timeline WITH the scenario
    // 3. Compare net worth at target year
    // 4. Calculate difference
    // 5. Format summary string like:
    //    "Buying the condo would reduce your net worth by $250k over 10 years."
}
```

### ProjectNetWorthAtYear
```go
func (c *Client) ProjectNetWorthAtYear(ctx context.Context, userID string, params ProjectNetWorthAtYearParams) (*string, error) {
    // 1. Convert targetAge to targetYear if needed (using user's startingAge)
    // 2. Get timeline
    // 3. Extract net worth at target year
    // 4. Format as readable string
}
```

### IdentifyNetWorthLevers
```go
type NetWorthLever struct {
    Type        string  `json:"type"`        // "income", "expense", "asset", "liability"
    Name        string  `json:"name"`
    AnnualImpact float64 `json:"annualImpact"`
    Description string  `json:"description"`
}

func (c *Client) IdentifyNetWorthLevers(ctx context.Context, userID string, params IdentifyNetWorthLeversParams) (*string, error) {
    // 1. Fetch all income, expenses, assets, liabilities
    // 2. Calculate annual impact:
    //    - Income: annual amount (positive)
    //    - Expense: annual amount (negative)
    //    - Asset: currentValue * growthRate (positive)
    //    - Liability: -currentBalance * interestRate (negative)
    // 3. Sort by absolute impact
    // 4. Return top N
    // 5. Format as readable string
}
```

## Task 4: Update Dispatch Handler (dispatch.go)

**File**: `backend/cmd/server/handlers/dispatch.go`

Add cases for analysis tools:

```go
case "getNetWorthSummary":
    var params financial.GetNetWorthSummaryParams
    if err := json.Unmarshal([]byte(tc.Function.Arguments), &params); err != nil {
        return "", fmt.Errorf("invalid params: %w", err)
    }
    return h.financialClient.GetNetWorthSummary(ctx, userID, params)

case "analyzeNetWorthTrends":
    // ...

case "compareScenarioImpact":
    // ...

case "projectNetWorthAtYear":
    // ...

case "identifyNetWorthLevers":
    // ...
```

## Using the Timeline Service

The timeline service already handles projections and scenario merging:

```go
// Get timeline without scenarios
timeline, err := c.timelineService.GetTimeline(ctx)

// Get timeline with specific scenarios
timeline, err := c.timelineService.GetTimelineWithScenarios(ctx, userID, true, []string{scenarioID})

// Access data
for _, year := range timeline.Years {
    year.NetWorth      // Net worth for this year
    year.Assets        // Assets breakdown
    year.Liabilities   // Liabilities breakdown
    year.Income        // Income items
    year.Expenses      // Expense items
}
```

## Files You Own

- `backend/internal/financial/tools.go` (analysis tool definitions only)
- `backend/internal/financial/client.go` (analysis methods only)
- `backend/cmd/server/handlers/dispatch.go` (analysis cases only)

## Do NOT Modify

- `backend/cmd/server/handlers/chat.go` (Agent 1 owns this)
- `backend/internal/llm/prompts/system_prompt.txt` (Agent 1 owns this)
- Scenario CRUD tools (Agent 2 owns this)
- `backend/internal/financial/preview.go` (Agent 2 owns this)

## Testing

After each change:
```bash
cd backend && go build ./... && go test ./...
```

Test manually:
1. Start the server
2. Send chat message: "What's my net worth?"
3. Verify getNetWorthSummary tool is called
4. Send: "How will my net worth grow over 10 years?"
5. Verify analyzeNetWorthTrends tool is called

## Section Marker for client.go

When adding to `client.go`, use this marker:
```go
// ============================================
// SECTION: Analysis (Agent 3)
// ============================================

func (c *Client) CalculateNetWorth(...) { ... }
func (c *Client) GetNetWorthSummary(...) { ... }
func (c *Client) AnalyzeNetWorthTrends(...) { ... }
func (c *Client) CompareScenarioImpact(...) { ... }
func (c *Client) ProjectNetWorthAtYear(...) { ... }
func (c *Client) IdentifyNetWorthLevers(...) { ... }
```

## Response Format

All analysis methods should return a `*string` that's formatted for the AI to present to the user. Keep it concise and scannable:

```
Your current net worth is **$500,000**.

**Breakdown:**
- Assets: $850,000
  - Property: $650,000
  - CPF: $120,000
  - Cash: $80,000
- Liabilities: $350,000
  - Mortgage: $350,000

**Monthly cash flow:**
- Income: $8,500
- Expenses: $4,200
- Savings: $4,300 (50.6% rate)
```

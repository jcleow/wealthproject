# Chat CRUD Tool Calls — Gap Analysis & Implementation Spec

## Overview

This document maps every frontend financial entity to its backend chat tool status, identifies gaps, and specifies what needs to be implemented so the chat AI can perform CRUD operations on all entity types.

---

## Current Architecture (How Chat Tool Calls Work)

```
User message
  │
  ▼
POST /api/v1/chat (ChatHandler)
  │
  ├─ Injects financial context (Agent 1)
  ├─ Sends to LLM with registered tool definitions
  │
  ▼
LLM responds with tool_calls[]
  │
  ├─ Read-only tools → auto-execute immediately, append results to response
  │   (getNetWorthSummary, analyzeNetWorthTrends, listScenarioEvents, etc.)
  │
  └─ Write tools → generate previews → store as pending actions
      │
      ▼
  ActionPreviewService.GeneratePreview()
      │  - Validates parameters against tool schema
      │  - Generates friendly description
      │  - Calculates financial impact
      │  - Detects warnings
      │  - Analyzes dependencies
      │
      ▼
  Frontend renders ActionReviewCard (approve / cancel)
      │
      ▼
  POST /api/v1/financial/actions/dispatch (DispatchHandler)
      │  - Resolves dependencies (Kahn's algorithm)
      │  - Executes via executeAction() switch
      │  - Rollback on failure
      │  - Returns ExecutionResult[]
```

### Files Involved Per Tool Call

| Layer | File | What to add |
|-------|------|-------------|
| **1. Tool Definition** | `backend/internal/financial/tools.go` | Register tool in `registerTools()` |
| **2. Parameter Types** | `backend/internal/financial/types.go` | Add `XxxParams` struct |
| **3. Financial Client** | `backend/internal/financial/client.go` | Add `CreateXxx()` / `UpdateXxx()` / `DeleteXxx()` methods |
| **4. FinancialExecutor Interface** | `backend/cmd/server/handlers/dispatch.go` | Add method to interface |
| **5. Dispatch Switch** | `backend/cmd/server/handlers/dispatch.go` | Add `case "createXxx":` in `executeAction()` |
| **6. Preview Descriptions** | `backend/internal/financial/preview.go` | Add `case "createXxx":` in `generateFriendlyDescription()` |
| **7. Preview Warnings** | `backend/internal/financial/preview.go` | Add warning detection cases |
| **8. Impact Calculation** | `backend/internal/financial/calculator.go` | Add impact estimation |
| **9. Read-Only Registry** | `backend/internal/financial/preview.go` | Add to `readOnlyTools` map if applicable |
| **10. Chat Handler** | `backend/cmd/server/handlers/chat.go` | Add to `executeReadOnlyTool()` or `executeWriteTool()` |

---

## Entity Inventory — Coverage Matrix

### FULLY COVERED (Have backend chat tools)

| Entity | Create | Update | Delete | List/Read | Notes |
|--------|--------|--------|--------|-----------|-------|
| **Asset** | `createAsset` | `updateAsset` | `deleteAsset` | via context | Tools 1-3 |
| **Liability** | `createLiability` | `updateLiability` | `deleteLiability` | via context | Tools 4-6 |
| **Income** | `createIncome` | `updateIncome` | `deleteIncome` | via context | Tools 7-9 |
| **Expense** | `createExpense` | `updateExpense` | `deleteExpense` | via context | Tools 10-12 |
| **Property Scenario** | `createPropertyScenario` | - | - | - | Tool 13 |
| **Scenario Event** | `createScenarioEvent` | `updateScenarioEvent` | `deleteScenarioEvent` | `listScenarioEvents` | Tools 19-26 |
| **Scenario (simplified)** | `startFinancialItem` | `modifyFinancialItem` | `stopFinancialItem` | - | Tools 20-22 |

### Analysis Tools (Read-only, auto-execute)

| Tool | Description | Status |
|------|-------------|--------|
| `getNetWorthSummary` | Net worth breakdown | Tool 14 |
| `analyzeNetWorthTrends` | Growth trajectory | Tool 15 |
| `compareScenarioImpact` | Scenario comparison | Tool 16 |
| `projectNetWorthAtYear` | Future projection | Tool 17 |
| `identifyNetWorthLevers` | Key financial drivers | Tool 18 |
| `toggleScenarioIncluded` | Enable/disable scenario | Tool 26 |

---

### NOT COVERED (Frontend CRUD exists, no chat tools)

| Entity | Frontend API | Backend Repository | Chat Tools | Priority |
|--------|-------------|-------------------|------------|----------|
| **Investment** | `investments.ts` — full CRUD (create, update, stop, delete) | `financial_v2/repository/investment.go` — full CRUD | NONE | **HIGH** |
| **Cash Account** | `cashAccounts.ts` — full CRUD (create, update, stop, delete, set-accumulator) | `financial_v2/repository/cash_account.go` — full CRUD | NONE | **HIGH** |
| **Person** | `persons.ts` — full CRUD (create, update, delete, toggle, bulk-update) | `financial_v2/repository/person.go` — full CRUD | NONE | **MEDIUM** |
| **Insurance Policy** | `insurance.ts` — full CRUD (create, update, delete) | NOT YET (see `spec/insurance-backend-persistence.md`) | NONE | **LOW** (blocked by backend) |
| **Fund Flow Rule** | `fundFlowRules.ts` — full CRUD (create, update, delete, stop) | `financial_v2/repository/fund_flow_rule.go` — full CRUD | NONE | **LOW** (internal/advanced) |
| **CPF Account** | `cpf.ts` — full CRUD (create, update, stop, delete) + projections | `financial/repository/` + `financial_v2/` — full CRUD | NONE | **MEDIUM** |

---

## Implementation Plan — New Chat Tool Calls

### Phase 1: Investment CRUD (HIGH priority)

Investments share the same shape as Assets (name, category, currentValue, annualGrowthRate) but use a separate table. The LLM should be able to distinguish between assets and investments.

#### Tool 27: `createInvestment`
```
Parameters:
  - category (string, required) — enum: stocks_portfolio, etf, unit_trust, bonds, reit, cryptocurrency, robo_advisor, other_investment
  - name (string, required) — e.g. "Syfe Core Growth", "CSPX S&P 500 ETF"
  - currentValue (number, required) — current market value in SGD
  - annualGrowthRate (number, optional) — expected return as decimal (0.07 = 7%)
  - notes (string, optional)
  - startDate (string, optional) — YYYY-MM-DD
```

#### Tool 28: `updateInvestment`
```
Parameters:
  - investmentId (string, optional)
  - investmentName (string, optional) — fuzzy name matching
  - name (string, optional) — updated name
  - currentValue (number, optional)
  - annualGrowthRate (number, optional)
  - notes (string, optional)
```

#### Tool 29: `deleteInvestment`
```
Parameters:
  - investmentId (string, optional)
  - investmentName (string, optional)
```

**Backend changes required:**
- `types.go`: `InvestmentParams`, `UpdateInvestmentParams`, `DeleteInvestmentParams`
- `client.go`: `CreateInvestment()`, `UpdateInvestment()`, `DeleteInvestment()`, `resolveInvestmentID()`
- `tools.go`: Register 3 tools with enum categories
- `dispatch.go`: Add to `FinancialExecutor` interface + `executeAction()` switch
- `preview.go`: Friendly descriptions + warnings (high value, extreme growth rate)
- `calculator.go`: Impact estimation (net worth change = currentValue)

---

### Phase 2: Cash Account CRUD (HIGH priority)

Cash accounts represent bank accounts, savings, emergency funds. The accumulator account is special (surplus cash flows here).

#### Tool 30: `createCashAccount`
```
Parameters:
  - name (string, required) — e.g. "DBS Multiplier", "OCBC 360"
  - balance (number, required) — current balance in SGD
  - interestRate (number, optional) — annual interest rate as decimal
  - bankName (string, optional)
  - accountType (string, optional) — enum: savings, current, fixed_deposit, high_yield, emergency_fund, other
  - isAccumulator (boolean, optional) — marks as the default cash accumulator
  - notes (string, optional)
```

#### Tool 31: `updateCashAccount`
```
Parameters:
  - cashAccountId (string, optional)
  - cashAccountName (string, optional) — fuzzy name matching
  - name (string, optional)
  - balance (number, optional)
  - interestRate (number, optional)
  - bankName (string, optional)
  - notes (string, optional)
```

#### Tool 32: `deleteCashAccount`
```
Parameters:
  - cashAccountId (string, optional)
  - cashAccountName (string, optional)
```

**Backend changes required:** Same pattern as Investment CRUD above.

---

### Phase 3: Person CRUD (MEDIUM priority)

Persons represent household members. Incomes, CPF accounts, and insurance policies are linked to persons.

#### Tool 33: `createPerson`
```
Parameters:
  - name (string, required) — e.g. "John", "Spouse"
  - dateOfBirth (string, required) — YYYY-MM-DD
  - relationship (string, required) — enum: self, spouse, child, parent, sibling, other
  - gender (string, optional) — enum: male, female
  - residencyStatus (string, optional) — enum: citizen, pr, foreigner (default: citizen)
```

#### Tool 34: `updatePerson`
```
Parameters:
  - personId (string, optional)
  - personName (string, optional) — fuzzy name matching
  - name (string, optional)
  - dateOfBirth (string, optional)
  - relationship (string, optional)
  - residencyStatus (string, optional)
```

#### Tool 35: `deletePerson`
```
Parameters:
  - personId (string, optional)
  - personName (string, optional)
```

**Backend changes required:** Same pattern. Note: persons use V2 API (`/api/v2/persons`).

---

### Phase 4: CPF Account CRUD (MEDIUM priority)

CPF accounts are Singapore-specific retirement accounts linked to persons with OA/SA/MA/RA balances.

#### Tool 36: `createCPFAccount`
```
Parameters:
  - personName (string, optional) — link to existing person by name
  - personId (string, optional)
  - oaBalance (number, required) — Ordinary Account balance
  - saBalance (number, required) — Special Account balance
  - maBalance (number, required) — MediSave Account balance
  - raBalance (number, optional) — Retirement Account balance (default 0)
```

#### Tool 37: `updateCPFAccount`
```
Parameters:
  - cpfAccountId (string, optional)
  - personName (string, optional)
  - oaBalance (number, optional)
  - saBalance (number, optional)
  - maBalance (number, optional)
  - raBalance (number, optional)
```

#### Tool 38: `deleteCPFAccount`
```
Parameters:
  - cpfAccountId (string, optional)
  - personName (string, optional)
```

**Backend changes required:** Same pattern. Decimal values sent as strings to avoid precision loss.

---

### Phase 5: Insurance Policy CRUD (LOW priority — blocked by backend)

Insurance policies are blocked pending backend persistence implementation (see `spec/insurance-backend-persistence.md`). Currently stored in localStorage only.

#### Tool 39: `createInsurancePolicy` (future)
```
Parameters:
  - personName (string, optional)
  - name (string, required)
  - category (string, required) — enum: life, critical_illness, hospitalization, disability, accident, custom
  - coverageAmount (number, required)
  - premiumAmount (number, required)
  - premiumFrequency (string, required) — monthly, quarterly, annually
  - insurerName (string, optional)
  - notes (string, optional)
```

---

### Phase 6: Fund Flow Rules (LOW priority — advanced feature)

Fund flow rules define how money moves between accounts (e.g., income → CPF → cash account → investment). These are complex relational entities not well-suited for natural language CRUD — better handled through the UI.

**Recommendation:** Skip chat tool integration. Too many foreign key references for the LLM to manage reliably.

---

## Context Injection Gaps

The `FinancialContext` struct (injected into the LLM system prompt) currently includes:
- Assets, Liabilities, Income, Expenses, Scenarios

**Missing from context** (LLM can't reference these entities):
- Investments (IDs, names, values)
- Cash Accounts (IDs, names, balances)
- Persons (IDs, names, relationships)
- CPF Accounts (IDs, balances by account type)

These must be added to `GetFinancialContext()` and `FormatContextForPrompt()` in `client.go` for the LLM to reference existing entities by name/ID when generating update/delete tool calls.

---

## Existing Pattern Reference

### Parameter Type Pattern (`types.go`)
```go
// CreateXxxParams — all required fields, no ID
type InvestmentParams struct {
    Category         string   `json:"category"`
    Name             string   `json:"name"`
    CurrentValue     float64  `json:"currentValue"`
    AnnualGrowthRate *float64 `json:"annualGrowthRate,omitempty"`
    Notes            string   `json:"notes,omitempty"`
    StartDate        string   `json:"startDate,omitempty"`
}

// UpdateXxxParams — ID + name fallback, all fields optional
type UpdateInvestmentParams struct {
    InvestmentID   string   `json:"investmentId,omitempty"`
    InvestmentName string   `json:"investmentName,omitempty"`
    Name           string   `json:"name,omitempty"`
    CurrentValue   *float64 `json:"currentValue,omitempty"`
    // ...
}

// DeleteXxxParams — ID + name fallback
type DeleteInvestmentParams struct {
    InvestmentID   string `json:"investmentId,omitempty"`
    InvestmentName string `json:"investmentName,omitempty"`
}
```

### Client Method Pattern (`client.go`)
```go
func (c *Client) CreateInvestment(ctx context.Context, params InvestmentParams) (*string, error) {
    userID := middleware.UserIDFromContext(ctx)
    // validate, transform, call store
    result, err := c.store.CreateInvestment(ctx, userID, repoModel)
    id := result.ID
    return &id, nil
}
```

### Tool Registration Pattern (`tools.go`)
```go
r.tools["createInvestment"] = llm.ToolDefinition{
    Type: "function",
    Function: llm.FunctionSchema{
        Name:        "createInvestment",
        Description: "Create an investment...",
        Parameters: llm.JSONSchema{
            Type: "object",
            Properties: map[string]*llm.PropertySchema{...},
            AdditionalProperties: llm.Bool(false),
        },
    },
}
```

### Dispatch Pattern (`dispatch.go`)
```go
// 1. Add to FinancialExecutor interface
CreateInvestment(ctx context.Context, params financial.InvestmentParams) (*string, error)

// 2. Add case in executeAction()
case "createInvestment":
    typed, err := financial.DecodeParams[financial.InvestmentParams](params)
    if err != nil {
        return nil, fmt.Errorf("invalid createInvestment parameters: %w", err)
    }
    return h.financialClient.CreateInvestment(ctx, typed)
```

---

## Summary

| Phase | Entity | Tools to Add | Backend Ready | Priority |
|-------|--------|-------------|---------------|----------|
| 1 | Investment | create, update, delete | YES | HIGH |
| 2 | Cash Account | create, update, delete | YES | HIGH |
| 3 | Person | create, update, delete | YES | MEDIUM |
| 4 | CPF Account | create, update, delete | YES | MEDIUM |
| 5 | Insurance | create, update, delete | NO (blocked) | LOW |
| 6 | Fund Flow Rules | — | YES | SKIP |

**Total new tools: 12** (Phases 1-4)
**Total new param types: 12** (3 per entity x 4 entities)
**Context injection additions: 4** (investments, cash accounts, persons, CPF)

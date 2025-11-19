# LLM-Native Tool Calling Architecture Documentation

## Overview
This document outlines the LLM-native tool calling architecture that replaces the complex intent parsing system with a simple, powerful, and semantic approach using native LLM function calling capabilities.

## 1. Architecture Overview

### Enhanced System Flow: Fresh Frontend → Go Backend → LLM
```
┌─────────────────────────────────────────────────────────────────────┐
│                      1. USER MESSAGE (Frontend)                    │
│   "My HDB is worth 1.2m and I have a 300k loan at 2.5%"           │
└─────────────────────────────────────────────────────────────────────┘
                                   │ HTTP POST
                                   ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      2. GO BACKEND RECEIVES                        │
│   ├── POST /api/v1/chat with user message                          │
│   ├── Authentication & session validation                          │
│   ├── Retrieve conversation history from database                  │
│   └── Load financial context (assets, liabilities, etc.)          │
└─────────────────────────────────────────────────────────────────────┘
                                   │
                                   ▼
┌─────────────────────────────────────────────────────────────────────┐
│                  3. GO BACKEND CALLS LLM WITH:                    │
│   ├── System prompt (ontology + business rules)                    │
│   ├── Financial tool definitions (JSON schemas)                    │
│   ├── Conversation history                                         │
│   └── Session state (lastAssetId, lastLiabilityId, etc.)          │
└─────────────────────────────────────────────────────────────────────┘
                                   │
                                   ▼
┌─────────────────────────────────────────────────────────────────────┐
│               4. LLM SEMANTIC PARSING (Internal)                   │
│   ├── Entity Extraction: HDB, loan, interest rate                 │
│   ├── Value Normalization: 1.2m → 1200000, 300k → 300000          │
│   ├── Intent Classification: asset + liability + property planning │
│   ├── Ontology Mapping: loan → financial + property modules       │
│   └── Tool Planning: multi-step sequence with relationships       │
└─────────────────────────────────────────────────────────────────────┘
                                   │
                                   ▼
┌─────────────────────────────────────────────────────────────────────┐
│            5. LLM OUTPUTS PROPOSED ACTIONS (JSON)                  │
│   [                                                                 │
│     {                                                               │
│       "type": "function_call",                                      │
│       "name": "create_asset",                                       │
│       "call_id": "c1",                                              │
│       "arguments": "{...}",                                         │
│       "description": "Add HDB property worth $1.2M to portfolio"   │
│     },                                                              │
│     {                                                               │
│       "type": "function_call",                                      │
│       "name": "create_liability",                                   │
│       "call_id": "c2",                                              │
│       "arguments": "{...}",                                         │
│       "description": "Add HDB loan of $300k at 2.5% interest"      │
│     },                                                              │
│     {                                                               │
│       "type": "function_call",                                      │
│       "name": "create_property_scenario",                          │
│       "call_id": "c3",                                              │
│       "arguments": "{...}",                                         │
│       "description": "Set up HDB property planning scenario"       │
│     }                                                               │
│   ]                                                                 │
└─────────────────────────────────────────────────────────────────────┘
                                   │
                                   ▼
┌─────────────────────────────────────────────────────────────────────┐
│              6. GO BACKEND GENERATES ACTION PREVIEWS              │
│   Backend transforms tool calls into user-friendly format:         │
│   ├── Calculate impact estimates (net worth, monthly payments)     │
│   ├── Generate friendly descriptions from raw parameters           │
│   ├── Identify warnings (high interest rates, MSR violations)     │
│   └── Detect dependencies between actions                          │
└─────────────────────────────────────────────────────────────────────┘
                                   │ JSON Response
                                   ▼
┌─────────────────────────────────────────────────────────────────────┐
│            7. FRONTEND DISPLAYS ACTION PREVIEW UI                  │
│                                                                     │
│   📋 Actions Preview:                                               │
│   ┌─────────────────────────────────────────────────────────────┐   │
│   │ ✅ Add Asset: HDB Property ($1.2M)                         │   │
│   │    └── Net worth +$1.2M, 3% annual growth                 │   │
│   │ ✅ Add Liability: HDB Loan ($300k)                         │   │
│   │    └── Net worth -$300k, 2.5% interest, ~$1,500/month     │   │
│   │ ✅ Create Property Plan: HDB Scenario                      │   │
│   │    └── Link loan to property for MSR calculations         │   │
│   │                                                             │   │
│   │ [✓] Select All    [Edit]    [Dispatch Actions]             │   │
│   └─────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
                                   │
                              USER REVIEWS
                                   │
                   ┌───────────────┼───────────────┐
                   │              │               │
                   ▼              ▼               ▼
              ┌─────────┐    ┌─────────┐    ┌─────────┐
              │ Approve │    │  Edit   │    │ Reject  │
              │   All   │    │ Some    │    │  All    │
              └─────────┘    └─────────┘    └─────────┘
                   │              │               │
                   └───────────────┼───────────────┘
                                   ▼
┌─────────────────────────────────────────────────────────────────────┐
│          8. FRONTEND SENDS SELECTED ACTIONS FOR EXECUTION          │
│   Selected actions (user can modify or remove):                    │
│   POST /api/financial/actions/dispatch                             │
│   [                                                                 │
│     { "call_id": "c1", "approved": true, "modified_args": null },  │
│     { "call_id": "c2", "approved": true, "modified_args": {...} },│
│     { "call_id": "c3", "approved": false }  // User skipped this  │
│   ]                                                                 │
└─────────────────────────────────────────────────────────────────────┘
                                   │ HTTP POST
                                   ▼
┌─────────────────────────────────────────────────────────────────────┐
│              9. GO BACKEND EXECUTES APPROVED ACTIONS              │
│   ├── Validate selected actions against original tool calls        │
│   ├── Execute actions in dependency order                          │
│   ├── Call database APIs (create asset, create liability, etc.)    │
│   ├── Handle partial failures gracefully                           │
│   └── Update session state (lastAssetId, lastLiabilityId)         │
└─────────────────────────────────────────────────────────────────────┘
                                   │ JSON Response
                                   ▼
┌─────────────────────────────────────────────────────────────────────┐
│            10. FRONTEND DISPLAYS EXECUTION RESULTS                 │
│   ✅ Success: HDB Property added to portfolio                      │
│   ✅ Success: HDB Loan added to liabilities                        │
│   ⚪ Skipped: Property scenario (user choice)                      │
│                                                                     │
│   💰 Net worth updated: +$900k                                     │
│   📊 Dashboard refreshed with new data                             │
└─────────────────────────────────────────────────────────────────────┘
                                   │
                                   ▼
┌─────────────────────────────────────────────────────────────────────┐
│                 7. BACKEND EXECUTES APPROVED ACTIONS               │
│   For each approved action:                                        │
│   ├── Validate parameters again                                    │
│   ├── Execute backend function                                     │
│   ├── Update database with new entities                            │
│   ├── Link related entities (asset ↔ liability ↔ property)        │
│   ├── Update session state with new IDs                           │
│   └── Return execution results                                     │
└─────────────────────────────────────────────────────────────────────┘
                                   │
                                   ▼
┌─────────────────────────────────────────────────────────────────────┐
│             8. BACKEND SENDS RESULTS TO CLIENT                     │
│   Execution Summary:                                               │
│   ┌─────────────────────────────────────────────────────────────┐   │
│   │ ✅ Successfully added HDB Property (Asset ID: A-1001)      │   │
│   │ ✅ Successfully added HDB Loan (Liability ID: L-2002)      │   │
│   │ ⏭️ Skipped property planning setup (as requested)          │   │
│   │                                                             │   │
│   │ 💡 You can set up property planning later in Settings      │   │
│   └─────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
```

## 2. Go Backend Architecture

### Backend Responsibilities
The Go backend handles all LLM interactions and business logic, providing clean REST APIs to the frontend.

#### Core Components:
```go
// LLM Client Interface
type LLMClient interface {
    GenerateToolCalls(ctx context.Context, req ChatRequest) (*ToolCallResponse, error)
}

// Tool Registry
type FinancialToolRegistry struct {
    tools map[string]FinancialTool
}

// Action Preview Generator
type ActionPreviewService struct {
    financialCalc *FinancialCalculator
    warningDetector *WarningDetector
}

// Action Executor
type ActionExecutor struct {
    dbClient *database.Client
    sessionManager *SessionManager
}
```

#### Key API Endpoints:

**POST /api/v1/chat**
- Receives user messages from fresh frontend
- Calls LLM with financial tools
- Returns chat response with action previews
```json
{
  "message_id": "msg_123",
  "content": "I'll help you add your HDB property and loan.",
  "proposed_actions": [
    {
      "call_id": "c1",
      "tool_name": "create_asset",
      "friendly_description": "Add HDB Property ($1.2M)",
      "estimated_impact": "Net worth +$1.2M",
      "warnings": [],
      "parameters": { "name": "HDB Property", "currentValue": 1200000 }
    }
  ],
  "requires_approval": true
}
```

**POST /api/financial/actions/dispatch**
- Executes approved actions from frontend
- Handles dependencies and failures
- Updates database and session state
```json
{
  "execution_results": [
    { "call_id": "c1", "success": true, "entity_id": "asset_123" },
    { "call_id": "c2", "success": false, "error": "Validation failed" }
  ],
  "summary": {
    "successful": 1,
    "failed": 1,
    "net_worth_change": "+900000"
  }
}
```

#### Frontend-Backend Communication:
- **Frontend**: Fresh React/TypeScript app, no Vercel AI SDK
- **Backend**: Go service handles all LLM communication
- **Protocol**: REST APIs with JSON, no streaming initially
- **State**: Backend manages session state and entity linking

## 3. Action Review and Dispatch Workflow

### Action Preview Interface

The client receives proposed actions in a structured format for user review:

```typescript
interface ProposedAction {
  call_id: string;
  tool_name: string;
  friendly_description: string;
  parameters: Record<string, any>;
  estimated_impact: string;
  warnings?: string[];
  dependencies?: string[]; // Other actions this depends on
}

interface ActionsPreview {
  actions: ProposedAction[];
  summary: {
    total_actions: number;
    estimated_duration: string;
    data_changes: string[];
  };
  recommendations: {
    safe_to_approve: boolean;
    concerns: string[];
    suggestions: string[];
  };
}
```

### Example Action Preview Response

```json
{
  "actions": [
    {
      "call_id": "c1",
      "tool_name": "create_asset",
      "friendly_description": "Add HDB Property worth $1.2M",
      "parameters": {
        "category": "hdb_property",
        "name": "HDB Property",
        "currentValue": 1200000,
        "annualGrowthRate": 0.03
      },
      "estimated_impact": "Increases net worth by $1.2M",
      "warnings": [],
      "dependencies": []
    },
    {
      "call_id": "c2",
      "tool_name": "create_liability",
      "friendly_description": "Add HDB loan of $300k at 2.5% interest",
      "parameters": {
        "category": "home_loan",
        "name": "HDB Loan",
        "currentBalance": 300000,
        "interestRateApr": 0.025,
        "minimumPayment": 1500
      },
      "estimated_impact": "Increases debt by $300k, monthly payment ~$1,500",
      "warnings": ["Interest rate seems low for current market"],
      "dependencies": []
    },
    {
      "call_id": "c3",
      "tool_name": "create_property_scenario",
      "friendly_description": "Set up HDB property planning scenario",
      "parameters": {
        "type": "hdb",
        "headline": "HDB Property Planning",
        "inputs": {...}
      },
      "estimated_impact": "Creates property planning calculations",
      "warnings": [],
      "dependencies": ["c1", "c2"]
    }
  ],
  "summary": {
    "total_actions": 3,
    "estimated_duration": "< 1 second",
    "data_changes": ["Add 1 asset", "Add 1 liability", "Create property plan"]
  },
  "recommendations": {
    "safe_to_approve": true,
    "concerns": ["Interest rate verification needed"],
    "suggestions": ["Review loan terms before approving"]
  }
}
```

### User Selection and Dispatch

The user can then review, modify, or reject actions before dispatch:

```typescript
interface ActionSelection {
  call_id: string;
  approved: boolean;
  modified_args?: Record<string, any>; // User can edit parameters
  user_notes?: string;
}

interface DispatchRequest {
  selected_actions: ActionSelection[];
  execution_mode: "sequential" | "parallel" | "user_controlled";
  require_confirmation: boolean;
}
```

### Example Dispatch Request

```json
{
  "selected_actions": [
    {
      "call_id": "c1",
      "approved": true,
      "modified_args": {
        "name": "Toa Payoh HDB 4-room",
        "notes": "Primary residence"
      }
    },
    {
      "call_id": "c2",
      "approved": true,
      "modified_args": {
        "interestRateApr": 0.026
      },
      "user_notes": "Updated to current HDB rate"
    },
    {
      "call_id": "c3",
      "approved": false,
      "user_notes": "Will set up property planning separately"
    }
  ],
  "execution_mode": "sequential",
  "require_confirmation": false
}
```

### UI/UX Considerations

**Action Preview Screen:**
- ✅ **Clear descriptions** in plain language (not technical tool names)
- ✅ **Impact summaries** showing financial effects
- ✅ **Warning indicators** for potentially problematic values
- ✅ **Dependency visualization** showing which actions depend on others
- ✅ **Edit functionality** allowing parameter modifications
- ✅ **Bulk selection** with "Select All", "Deselect All" options

**Execution Feedback:**
- ✅ **Real-time progress** showing which actions are executing
- ✅ **Success/error indicators** for each action
- ✅ **Rollback options** if something goes wrong
- ✅ **Final summary** with links to created entities

### Backend Implementation

#### Action Preview Generation

The backend needs to transform raw LLM tool calls into user-friendly previews:

```typescript
function generateActionPreview(toolCalls: ToolCall[]): ActionsPreview {
  const actions = toolCalls.map(call => ({
    call_id: call.call_id,
    tool_name: call.name,
    friendly_description: generateDescription(call),
    parameters: JSON.parse(call.arguments),
    estimated_impact: calculateImpact(call),
    warnings: validateParameters(call),
    dependencies: findDependencies(call, toolCalls)
  }));

  return {
    actions,
    summary: generateSummary(actions),
    recommendations: analyzeActions(actions)
  };
}
```

#### Selective Execution Engine

```typescript
async function executeSelectedActions(
  dispatchRequest: DispatchRequest,
  originalToolCalls: ToolCall[]
): Promise<ExecutionResults> {
  const results: ExecutionResult[] = [];

  // Filter and modify actions based on user selection
  const actionsToExecute = dispatchRequest.selected_actions
    .filter(selection => selection.approved)
    .map(selection => {
      const originalCall = originalToolCalls.find(call => call.call_id === selection.call_id);
      if (selection.modified_args) {
        // Merge user modifications with original arguments
        const originalArgs = JSON.parse(originalCall.arguments);
        const modifiedArgs = { ...originalArgs, ...selection.modified_args };
        return { ...originalCall, arguments: JSON.stringify(modifiedArgs) };
      }
      return originalCall;
    });

  // Execute in dependency order if sequential mode
  if (dispatchRequest.execution_mode === "sequential") {
    const orderedActions = resolveDependencyOrder(actionsToExecute);

    for (const action of orderedActions) {
      try {
        const result = await executeToolCall(action);
        results.push(result);

        // Update session state for dependent actions
        updateSessionState(result);
      } catch (error) {
        results.push({ success: false, call_id: action.call_id, error });

        // Stop execution on failure if dependencies exist
        if (hasDependentActions(action, actionsToExecute)) {
          break;
        }
      }
    }
  }

  return { results, summary: generateExecutionSummary(results) };
}
```

#### API Versioning Strategy

**Base URL:** `/api/v1/` - All endpoints use versioned URLs for backward compatibility
**Headers:** `API-Version: v1` - Client specifies API version
**Deprecation:** 6-month notice with `X-API-Deprecation-Warning` header

#### API Endpoints

```typescript
// POST /api/v1/chat
interface ChatRequest {
  message: string;
  chat_id: string;
  session_id: string;
}

interface ChatResponse {
  message_id: string;
  content: string;
  proposed_actions: ProposedAction[];
  requires_approval: boolean;
}

// POST /api/v1/financial/actions/dispatch
interface DispatchRequest {
  selected_actions: SelectedAction[];
  session_id: string;
}

interface ActionDispatchResponse {
  results: ExecutionResult[];
  summary: ExecutionSummary;
  session_state: SessionState;
}
```

## 3. Component Architecture

### System Components
```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   LLM Provider  │    │  Tool Registry  │    │ Session State   │
│   (OpenAI/etc)  │    │     Manager     │    │    Manager      │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────────────────────────────────────────────────────────┐
│                        Tool Execution Engine                       │
│                                                                     │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐     │
│  │   Validation    │  │    Execution    │  │   Entity        │     │
│  │     Layer       │  │     Layer       │  │   Linking       │     │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘     │
└─────────────────────────────────────────────────────────────────────┘
                                   │
                                   ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    Backend Modules                                  │
│                                                                     │
│  ┌─────────────────────────┐  ┌─────────────────────────┐           │
│  │   Financial Data        │  │   Property Planner      │           │
│  │   Module                │  │   Module                │           │
│  │                         │  │                         │           │
│  │  ├── create_asset       │  │  ├── set_loan_amount    │           │
│  │  ├── create_liability   │  │  ├── set_interest_rate  │           │
│  │  ├── create_income      │  │  ├── set_tenure         │           │
│  │  ├── create_expense     │  │  └── get_scenario       │           │
│  │  ├── update_*           │  │                         │           │
│  │  └── delete_*           │  │                         │           │
│  └─────────────────────────┘  └─────────────────────────┘           │
└─────────────────────────────────────────────────────────────────────┘
                                   │
                                   ▼
                          ┌─────────────────┐
                          │   Database      │
                          │   (Go Service)  │
                          └─────────────────┘
```

## 3. Complete Tool Registry Specification (OpenAI Format)

Following OpenAI's function calling best practices: clear naming, detailed descriptions, strict validation, and optimized function count.

### Core Financial Tools (5 Functions - Matching Backend Client)

#### 1. create_asset
```json
{
  "type": "function",
  "name": "create_asset",
  "description": "Create a financial asset using financialClient.assets.create(). Use this when the user mentions owning property, cash, investments, CPF, or any valuable item.",
  "parameters": {
    "type": "object",
    "properties": {
      "category": {
        "type": "string",
        "description": "Specific type of asset being added",
        "enum": ["hdb_property", "condo_property", "landed_property", "cash_savings", "cpf_account", "stocks_portfolio", "bonds_investment", "bank_account", "cryptocurrency", "other_asset"]
      },
      "name": {
        "type": "string",
        "description": "Descriptive name for the asset (e.g., 'Toa Payoh 4-room HDB', 'DBS Savings Account', 'STI ETF Portfolio')",
        "minLength": 1,
        "maxLength": 100
      },
      "currentValue": {
        "type": "number",
        "description": "Current market value of the asset in Singapore Dollars (SGD). Always use full numbers (e.g., 1200000 for 1.2M)",
        "minimum": 1,
        "maximum": 100000000
      },
      "annualGrowthRate": {
        "type": "number",
        "description": "Expected annual growth rate as decimal. Use 0.03 for 3%, 0.07 for 7%, etc. Default to reasonable rates: property=0.03, stocks=0.07, cash=0.01",
        "minimum": -0.5,
        "maximum": 1.0
      },
      "notes": {
        "type": "string",
        "description": "Any additional context about the asset (location, broker, special features, etc.)",
        "maxLength": 500
      }
    },
    "required": ["category", "name", "currentValue"],
    "additionalProperties": false
  },
  "strict": true
}
```

**Example Input:**
```json
{
  "category": "hdb_property",
  "name": "Toa Payoh 4-room HDB",
  "currentValue": 1200000,
  "annualGrowthRate": 0.03,
  "notes": "Near MRT station, recently renovated"
}
```

**Example Output:**
```json
{
  "success": true,
  "asset_id": "A-7f3d2a1b",
  "category": "hdb_property",
  "name": "Toa Payoh 4-room HDB",
  "current_value": 1200000,
  "annual_growth_rate": 0.03,
  "purchase_date": "2020-03-15",
  "additional_notes": "Near MRT station, recently renovated",
  "created_at": "2025-11-19T10:15:30Z",
  "updated_at": "2025-11-19T10:15:30Z"
}
```

#### 2. create_liability
```json
{
  "type": "function",
  "name": "create_liability",
  "description": "Create a financial liability using financialClient.liabilities.create(). Use this for home loans, mortgages, credit cards, personal loans, student loans, car loans, etc.",
  "parameters": {
    "type": "object",
    "properties": {
      "category": {
        "type": "string",
        "description": "Category of debt obligation",
        "enum": ["home_loan", "credit_card", "personal_loan", "student_loan", "car_loan", "business_loan", "other"]
      },
      "name": {
        "type": "string",
        "description": "Descriptive name for this debt (e.g., 'HDB Housing Loan', 'DBS Credit Card', 'UOB Car Loan')",
        "minLength": 1,
        "maxLength": 100
      },
      "currentBalance": {
        "type": "number",
        "description": "Current amount owed in Singapore Dollars (SGD). Use full numbers (e.g., 300000 for 300k)",
        "minimum": 1,
        "maximum": 50000000
      },
      "interestRateApr": {
        "type": "number",
        "description": "Annual interest rate as decimal. Use 0.026 for 2.6%, 0.035 for 3.5%, etc. HDB loans are typically 2.6%, bank loans 3-4%",
        "minimum": 0,
        "maximum": 0.5
      },
      "minimumPayment": {
        "type": "number",
        "description": "Required monthly payment amount in SGD",
        "minimum": 0,
        "maximum": 100000
      },
      "notes": {
        "type": "string",
        "description": "Additional notes about this liability",
        "maxLength": 500
      }
    },
    "required": ["category", "name", "currentBalance", "interestRateApr", "minimumPayment"],
    "additionalProperties": false
  },
  "strict": true
}
```

**Example Input:**
```json
{
  "debt_type": "hdb_home_loan",
  "debt_name": "HDB Housing Loan",
  "outstanding_balance": 300000,
  "annual_interest_rate": 0.026,
  "monthly_payment": 1800,
  "loan_tenure_years": 25,
  "loan_start_date": "2020-01-15"
}
```

**Example Output:**
```json
{
  "success": true,
  "debt_id": "D-9k2j8h1g",
  "debt_type": "hdb_home_loan",
  "debt_name": "HDB Housing Loan",
  "outstanding_balance": 300000,
  "annual_interest_rate": 0.026,
  "monthly_payment": 1800,
  "loan_tenure_years": 25,
  "loan_start_date": "2020-01-15",
  "property_plan_id": "PP-auto-generated",
  "created_at": "2025-11-19T10:15:31Z",
  "updated_at": "2025-11-19T10:15:31Z"
}
```

#### 3. create_income
```json
{
  "type": "function",
  "name": "create_income",
  "description": "Create an income source using financialClient.incomes.create(). Use this for salary, freelance work, business income, rental income, dividends, bonuses, etc.",
  "parameters": {
    "type": "object",
    "properties": {
      "source": {
        "type": "string",
        "description": "Source or description of the income (e.g., 'Primary Salary', 'Freelance Design Work', 'Rental from Condo', 'Wife Salary')",
        "minLength": 1,
        "maxLength": 100
      },
      "amount": {
        "type": "number",
        "description": "Income amount in SGD per frequency period. Use actual numbers (e.g., 8000 for $8k monthly salary)",
        "minimum": 1,
        "maximum": 1000000
      },
      "frequency": {
        "type": "string",
        "description": "How often this income is received",
        "enum": ["weekly", "biweekly", "monthly", "quarterly", "yearly"]
      },
      "category": {
        "type": "string",
        "description": "Type of income for planning purposes",
        "minLength": 1,
        "maxLength": 50
      },
      "startDate": {
        "type": "string",
        "description": "When this income started in ISO-8601 format (YYYY-MM-DDTHH:mm:ss.sssZ)",
        "pattern": "^\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}"
      },
      "notes": {
        "type": "string",
        "description": "Optional notes about this income",
        "maxLength": 500
      }
    },
    "required": ["source", "amount", "frequency", "category", "startDate"],
    "additionalProperties": false
  },
  "strict": true
}
```

#### 4. create_expense
```json
{
  "type": "function",
  "name": "create_expense",
  "description": "Create a recurring expense using financialClient.expenses.create(). Use this for rent, mortgage payments, utilities, food, transport, insurance, subscriptions, etc.",
  "parameters": {
    "type": "object",
    "properties": {
      "payee": {
        "type": "string",
        "description": "Who receives this payment (company, landlord, service provider, etc.)",
        "minLength": 1,
        "maxLength": 100
      },
      "amount": {
        "type": "number",
        "description": "Expense amount in SGD per frequency period. Use actual numbers (e.g., 2500 for monthly mortgage)",
        "minimum": 1,
        "maximum": 50000
      },
      "frequency": {
        "type": "string",
        "description": "How often this expense occurs",
        "enum": ["weekly", "biweekly", "monthly", "quarterly", "yearly"]
      },
      "category": {
        "type": "string",
        "description": "Category of expense for budgeting purposes",
        "minLength": 1,
        "maxLength": 50
      },
      "notes": {
        "type": "string",
        "description": "Optional notes about this expense",
        "maxLength": 500
      }
    },
    "required": ["payee", "amount", "frequency", "category"],
    "additionalProperties": false
  },
  "strict": true
}
```

#### 5. create_property_scenario
```json
{
  "type": "function",
  "name": "create_property_scenario",
  "description": "Create property planning scenario using financialClient.propertyPlanner.create(). Use this when user mentions property loan details, interest rates, or tenure. ONLY call this for property-related loans (HDB, condo, landed), not other types of debt.",
  "parameters": {
    "type": "object",
    "properties": {
      "type": {
        "type": "string",
        "description": "Type of property scenario being configured",
        "enum": ["hdb", "condo", "landed"]
      },
      "headline": {
        "type": "string",
        "description": "Descriptive headline for this scenario",
        "minLength": 1,
        "maxLength": 100
      },
      "inputs": {
        "type": "object",
        "description": "Mortgage calculation inputs",
        "properties": {
          "loanAmount": {
            "type": "number",
            "description": "Total loan amount in SGD",
            "minimum": 10000,
            "maximum": 20000000
          },
          "loanTermYears": {
            "type": "number",
            "description": "Loan term in years",
            "minimum": 1,
            "maximum": 35
          },
          "borrowerType": {
            "type": "string",
            "description": "Type of borrower",
            "minLength": 1,
            "maxLength": 50
          },
          "loanStartMonth": {
            "type": "string",
            "description": "When loan starts in YYYY-MM format",
            "pattern": "^\\d{4}-\\d{2}$"
          },
          "fixedYears": {
            "type": "number",
            "description": "Number of years with fixed rate",
            "minimum": 1,
            "maximum": 35
          },
          "fixedRate": {
            "type": "number",
            "description": "Fixed interest rate as decimal",
            "minimum": 0.01,
            "maximum": 0.15
          },
          "floatingRate": {
            "type": "number",
            "description": "Floating interest rate as decimal",
            "minimum": 0.01,
            "maximum": 0.15
          },
          "householdIncome": {
            "type": "number",
            "description": "Monthly household income in SGD",
            "minimum": 1000,
            "maximum": 500000
          },
          "otherDebt": {
            "type": "number",
            "description": "Other monthly debt payments in SGD",
            "minimum": 0,
            "maximum": 50000
          }
        },
        "required": ["loanAmount", "loanTermYears", "borrowerType", "loanStartMonth", "fixedYears", "fixedRate", "floatingRate", "householdIncome", "otherDebt"],
        "additionalProperties": false
      }
    },
    "required": ["type", "headline", "inputs"],
    "additionalProperties": false
  },
  "strict": true
}
```

### Function Count Optimization Summary

**Reduced from 7 to 5 functions matching existing backend client:**

1. ✅ **create_asset** - Maps to `financialClient.assets.create()`
2. ✅ **create_liability** - Maps to `financialClient.liabilities.create()`
3. ✅ **create_income** - Maps to `financialClient.incomes.create()`
4. ✅ **create_expense** - Maps to `financialClient.expenses.create()`
5. ✅ **create_property_scenario** - Maps to `financialClient.propertyPlanner.create()`

**Key Improvements:**
- **Strict validation** with `"strict": true` and `"additionalProperties": false`
- **Clear naming** following verb_noun pattern
- **Detailed descriptions** explaining when and how to use each function
- **Rich enums** to prevent invalid states
- **Pattern validation** for dates and formatted strings
- **Consolidated functions** that were always called together
- **Singapore-specific context** in descriptions and defaults

## 4. Enhanced System Prompt (OpenAI Best Practices)

### Complete System Prompt with Function Usage Guidelines
```
SYSTEM MESSAGE — Assetra Financial Planning Agent

You are Assetra, a Singapore-focused financial planning assistant with expertise in personal finance, property planning, and investment management.

Your ONLY job is to translate user messages into precise function calls using the 5 available functions. You must understand financial concepts and relationships to create accurate, complete financial profiles.

=== AVAILABLE FUNCTIONS & USAGE GUIDELINES ===

1. create_asset
   WHEN TO USE:
   - User mentions owning property, cash, investments, CPF, stocks, crypto
   - User provides asset values ("my house is worth X", "I have 50k in savings")
   - User discusses their net worth or asset portfolio

   WHEN NOT TO USE:
   - User only mentions loan amounts without asset values
   - User talks about income or expenses (use appropriate functions)
   - User mentions debts or liabilities

2. create_liability
   WHEN TO USE:
   - User mentions loans, mortgages, credit cards, debts of any kind
   - User provides outstanding balances, interest rates, monthly payments
   - User discusses debt consolidation or refinancing

   WHEN NOT TO USE:
   - User only mentions monthly payments without debt context
   - User talks about property values without mentioning loans
   - For expenses that aren't debt (use create_expense)

3. create_income
   WHEN TO USE:
   - User mentions salary, wages, freelance income, business profits
   - User discusses rental income, dividends, bonuses, commissions
   - User provides monthly/yearly income amounts

   WHEN NOT TO USE:
   - User mentions one-time payments or gifts (not regular income)
   - User talks about asset values or investment gains
   - For business revenue before expenses

4. create_expense
   WHEN TO USE:
   - User mentions recurring costs: rent, utilities, food, transport, insurance
   - User provides monthly/yearly spending amounts
   - User discusses budget or cost of living

   WHEN NOT TO USE:
   - User mentions one-time purchases or emergency expenses
   - For loan payments (debt is captured in create_liability)
   - For investment contributions (not expenses but asset transfers)

5. create_property_scenario
   WHEN TO USE:
   - User mentions property loan details: amount, tenure, interest rates
   - User discusses mortgage terms, refinancing, or loan restructuring
   - ALWAYS use when home loan is mentioned in create_liability

   WHEN NOT TO USE:
   - For non-property loans (car loans, personal loans, credit cards)
   - When user only mentions property value without loan details
   - For rental properties without loans

=== CRITICAL BUSINESS LOGIC ===

HOME LOAN INTEGRATION RULE:
When user mentions home loan/mortgage, you MUST make 3 calls:
1. create_asset (for property value)
2. create_liability (for loan debt)
3. create_property_scenario (for loan parameters)

SINGAPORE FINANCIAL CONTEXT:
- HDB loans: typically 2.6% interest, government-subsidized
- Bank loans: typically 3-4% interest for properties
- CPF: Central Provident Fund (retirement savings)
- Property types: HDB (public housing), condo, landed property
- All amounts in Singapore Dollars (SGD)

VALUE NORMALIZATION RULES:
- "300k" / "300K" → 300000
- "1.2m" / "1.2M" → 1200000
- "2.5%" → 0.025 (decimal)
- "25 years" → 25 (number)

ENUM MAPPING GUIDE:
Assets: "hdb_property", "condo_property", "landed_property", "cash_savings", "cpf_account", "stocks_portfolio"
Debts: "hdb_home_loan", "bank_home_loan", "credit_card_debt", "personal_loan", "student_loan", "car_loan"
Income: "employment_salary", "freelance_work", "business_profit", "rental_income", "investment_dividends"
Expenses: "housing_mortgage", "housing_rent", "utilities_electricity", "transport_car", "food_groceries"
Property: "hdb_scenario", "condo_scenario", "landed_property_scenario"

=== EXECUTION STANDARDS ===

ACCURACY REQUIREMENTS:
- Use exact enum values from function definitions
- Convert all percentages to decimals (3% = 0.03)
- Use full number amounts (no "k" or "m" abbreviations in function calls)
- Provide realistic defaults for optional fields

ERROR PREVENTION:
- Never invent asset/liability IDs (backend generates these)
- Never ask clarifying questions unless absolutely critical information is missing
- Never use invalid enum values
- Always validate dates use YYYY-MM-DD format

COMPLETENESS STANDARD:
- Process ALL financial information in user message
- Create comprehensive profiles, not partial ones
- Link related entities (property + loan scenarios)
- Capture both gross amounts and frequencies accurately

OUTPUT FORMAT:
- ONLY output function calls in JSON format
- OR a brief user-facing message if no functions needed
- NEVER output reasoning, thoughts, or explanations
- NEVER apologize or add commentary

=== EXAMPLE PATTERNS ===

Property Purchase: [create_asset, create_liability, create_property_scenario]
Income/Expenses: [create_income, create_expense]
Investment Portfolio: [create_asset] (for each investment type)
Debt Consolidation: [create_liability] (for each debt)

You are an expert at understanding complex financial situations and translating them into precise, complete function calls.
```

## 5. Session State Management

### Session State Structure
```typescript
interface SessionState {
  sessionId: string;
  userId?: string;

  // Entity linking for relationship management
  lastAssetId?: string;
  lastLiabilityId?: string;
  lastPropertyPlanId?: string;

  // Conversation flow tracking
  conversationFlow: Array<{
    toolName: string;
    callId: string;
    result: any;
    timestamp: string;
  }>;

  // Context for multi-step operations
  pendingOperations: {
    waitingForPropertyDetails?: boolean;
    currentScenarioType?: 'hdb' | 'condo' | 'landed';
  };

  // Cache for quick lookups
  entityCache: {
    assets: Map<string, any>;
    liabilities: Map<string, any>;
    propertyPlans: Map<string, any>;
  };
}
```

### Entity Linking Strategy
```
When tool execution occurs:

1. create_liability (category: "home_loan")
   └── Store liability_id in session.lastLiabilityId

2. create_property_scenario
   └── Link to session.lastLiabilityId
   └── Store property_plan_id in session.lastPropertyPlanId
   └── Create relationship: liability ↔ property_plan

3. create_asset (category: property type)
   └── Store asset_id in session.lastAssetId
   └── Link to property plan if exists (session.lastPropertyPlanId)
```

## 6. Real-World Examples and Flows

### Example 1: Complete Property Purchase Setup

**User Message:**
```
"I just bought a condo worth 1.5M. I took a bank loan of 1.2M at 3.2% for 30 years. My monthly payment is 5200."
```

**LLM Tool Calls:**
```json
[
  {
    "type": "function_call",
    "name": "create_asset",
    "call_id": "c1",
    "arguments": "{\"category\":\"condo_property\",\"name\":\"Condo Property\",\"current_value\":1500000,\"additional_notes\":\"Recently purchased\"}"
  },
  {
    "type": "function_call",
    "name": "create_liability",
    "call_id": "c2",
    "arguments": "{\"debt_type\":\"bank_home_loan\",\"debt_name\":\"Condo Bank Loan\",\"outstanding_balance\":1200000,\"annual_interest_rate\":0.032,\"monthly_payment\":5200,\"loan_tenure_years\":30}"
  },
  {
    "type": "function_call",
    "name": "create_property_scenario",
    "call_id": "c3",
    "arguments": "{\"scenario_type\":\"condo_scenario\",\"loan_principal\":1200000,\"loan_tenure_years\":30,\"interest_rate_annual\":0.032,\"monthly_household_income\":14500,\"borrower_type\":\"joint_borrowers\"}"
  }
]
```

**Backend Responses:**
```json
[
  {"call_id": "c1", "result": {"asset_id": "A-cd1ef2", "success": true}},
  {"call_id": "c2", "result": {"liability_id": "L-ab3gh4", "success": true}},
  {"call_id": "c3", "result": {"property_plan_id": "PP-xy7zw8", "linked_liability_id": "L-ab3gh4", "success": true}}
]
```

**Final LLM Response:**
```
"✅ I've added your condo (worth $1.5M) and bank loan ($1.2M at 3.2% over 30 years) to your financial profile. Your property planning scenario has been configured with these loan details."
```

### Example 2: Income and Expense Management

**User Message:**
```
"I earn 8000 monthly salary and my wife earns 6500. We spend 2500 on mortgage, 800 on groceries, and 600 on transport."
```

**LLM Tool Calls:**
```json
[
  {
    "type": "function_call",
    "name": "create_income",
    "call_id": "c1",
    "arguments": "{\"income_name\":\"My Salary\",\"gross_amount\":8000,\"payment_frequency\":\"monthly\",\"income_category\":\"employment_salary\"}"
  },
  {
    "type": "function_call",
    "name": "create_income",
    "call_id": "c2",
    "arguments": "{\"income_name\":\"Wife's Salary\",\"gross_amount\":6500,\"payment_frequency\":\"monthly\",\"income_category\":\"employment_salary\"}"
  },
  {
    "type": "function_call",
    "name": "create_expense",
    "call_id": "c3",
    "arguments": "{\"expense_name\":\"Mortgage Payment\",\"amount_per_period\":2500,\"payment_frequency\":\"monthly\",\"expense_category\":\"housing_mortgage\"}"
  },
  {
    "type": "function_call",
    "name": "create_expense",
    "call_id": "c4",
    "arguments": "{\"expense_name\":\"Groceries\",\"amount_per_period\":800,\"payment_frequency\":\"monthly\",\"expense_category\":\"food_groceries\"}"
  },
  {
    "type": "function_call",
    "name": "create_expense",
    "call_id": "c5",
    "arguments": "{\"expense_name\":\"Transport\",\"amount_per_period\":600,\"payment_frequency\":\"monthly\",\"expense_category\":\"transport_public\"}"
  }
]
```

### Example 3: Error Handling and Recovery

**User Message:**
```
"Update my HDB loan to 250k"
```

**Backend Response (No existing loan found):**
```json
[
  {"call_id": "c1", "error": {"type": "business_logic", "message": "No HDB loan found in your profile. Please provide loan details to create one."}}
]
```

**LLM Follow-up Response:**
```
"I don't see an existing HDB loan in your profile. Could you provide the loan details (amount, interest rate, tenure) so I can set it up for you?"
```

## 7. Error Response Formats

### Validation Error
```json
{
  "call_id": "c1",
  "success": false,
  "error": {
    "type": "validation",
    "message": "Invalid loan amount",
    "details": {
      "field": "amount",
      "value": -100000,
      "constraint": "minimum value is 1000"
    }
  }
}
```

### Business Logic Error
```json
{
  "call_id": "c2",
  "success": false,
  "error": {
    "type": "business_logic",
    "message": "Cannot set property interest rate without existing loan",
    "details": {
      "requirement": "create_liability with category 'home_loan' first"
    }
  }
}
```

### System Error
```json
{
  "call_id": "c3",
  "success": false,
  "error": {
    "type": "system",
    "message": "Database connection failed",
    "details": {
      "retry_after": 5000,
      "error_code": "DB_TIMEOUT"
    }
  }
}
```

## 8. OpenAI Best Practices Implementation Summary

### Applied OpenAI Guidelines

✅ **Function Definition Standards:**
- All functions use `"type": "function"` and `"strict": true`
- Clear, descriptive names following verb_noun pattern
- Detailed descriptions explaining purpose and usage
- Complete parameter documentation with examples

✅ **Schema Validation:**
- Rich enum usage to prevent invalid states
- Pattern validation for dates and formatted strings
- Strict boundaries with `"additionalProperties": false`
- Comprehensive min/max validation for numbers

✅ **Software Engineering Best Practices:**
- Obvious and intuitive function purposes
- Invalid states made unrepresentable through enums
- "Intern test" - functions are self-explanatory
- Burden offloaded from model to code

✅ **Function Optimization:**
- Reduced from 7 to 5 functions (well under 20 limit)
- Consolidated functions always called in sequence
- Combined property planning into single function call
- Removed redundant parameters model shouldn't fill

✅ **System Prompt Enhancement:**
- Explicit "WHEN TO USE" and "WHEN NOT TO USE" for each function
- Clear business rule enforcement
- Edge case handling instructions
- Specific examples for complex scenarios

### Comparison with Current System

| Aspect | Current Intent System | OpenAI-Optimized LLM Tools |
|--------|----------------------|------------------------------|
| **Function Count** | 7 tools + complex parser | 5 optimized functions |
| **Validation** | Manual TypeScript checks | Strict JSON Schema + enums |
| **Business Rules** | 200+ lines of code | Declarative system prompt |
| **Error Prevention** | Runtime error handling | Design-time invalid state prevention |
| **Documentation** | Scattered comments | Self-documenting function schemas |
| **Extensibility** | Requires parser modifications | Add function definition only |
| **Testing** | Complex integration tests | Simple function unit tests |
| **Maintenance** | High complexity | Prompt and schema updates |
| **Model Accuracy** | Pattern matching | Semantic understanding + strict validation |
| **Singapore Context** | Hardcoded in parser | Embedded in function descriptions |

### Performance and Accuracy Benefits

1. **Reduced Processing Steps**: User message → Function calls (2 steps vs 5+ steps)
2. **Strict Validation**: Prevents invalid calls before execution
3. **Semantic Understanding**: LLM naturally handles financial relationships
4. **Consolidated Operations**: Related functions combined for efficiency
5. **Context-Aware**: Singapore-specific financial knowledge in descriptions

### Developer Experience Benefits

1. **Clear Function Purpose**: Each function passes the "intern test"
2. **Rich Enums**: Prevent common mistakes with predefined categories
3. **Pattern Validation**: Automatic date/format checking
4. **Type Safety**: Comprehensive schemas catch errors early
5. **Self-Documenting**: Function definitions serve as complete API docs

### Production Readiness

This OpenAI-optimized architecture is production-ready with:
- ✅ Strict validation preventing runtime errors
- ✅ Comprehensive business rule enforcement
- ✅ Singapore financial market context
- ✅ Optimized function count for accuracy
- ✅ Clear usage guidelines preventing misuse
- ✅ Edge case handling built into system prompt
- ✅ Consolidated operations for efficiency

The system leverages OpenAI's function calling capabilities to their fullest while maintaining the sophisticated financial understanding required for Singapore's market context.
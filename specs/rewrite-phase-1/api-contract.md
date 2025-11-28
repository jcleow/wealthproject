# API Contract - Financial Chat System

**Version:** 1.0.0
**Backend:** Go HTTP Server
**Frontend:** React TypeScript Application
**Base URL:** `http://localhost:8080/api/v1` (development), `https://api.yourapp.com/api/v1` (production)

## API Versioning Strategy

**Versioning Scheme:** Semantic versioning (MAJOR.MINOR.PATCH)
- **MAJOR:** Breaking changes requiring client updates
- **MINOR:** New features, backward compatible
- **PATCH:** Bug fixes, backward compatible

**URL Versioning:** All endpoints include version prefix `/api/v1/`
**Header Versioning:** Optional `API-Version: v1` header support
**Deprecation:** 6-month notice for version deprecation

**Current Version:** v1.0.0
**Supported Versions:** v1.x.x
**Deprecated Versions:** None

## Authentication

All requests require authentication headers:

```http
Authorization: Bearer <jwt_token>
X-Session-ID: <session_id>
API-Version: v1
```

## Endpoints

### 1. Chat API

**Endpoint:** `POST /api/v1/chat`
**Purpose:** Send user message and receive AI response with potential action previews

#### Request

```typescript
interface ChatRequest {
  message: string;      // Required: User's chat message
  chat_id: string;      // Required: Unique chat conversation ID
  session_id: string;   // Required: User session identifier
}
```

**Example Request:**
```json
{
  "message": "I want to add my savings account with $10,000",
  "chat_id": "chat_123e4567-e89b-12d3-a456-426614174000",
  "session_id": "sess_987fcdeb-51a2-43d4-8b69-123456789abc"
}
```

#### Response

```typescript
interface ChatResponse {
  message_id: string;                    // Unique ID for this AI response
  content: string;                       // AI's text response to user
  proposed_actions: ProposedAction[];    // Actions AI wants to take (empty if none)
  requires_approval: boolean;            // True if user needs to approve actions
  conversation_flow?: ConversationStep[]; // Optional: conversation context
}

interface ProposedAction {
  call_id: string;                       // Unique identifier for this action
  tool_name: string;                     // e.g., "createAsset", "updateLiability"
  friendly_description: string;          // Human-readable description
  parameters: Record<string, any>;       // Tool parameters as JSON object
  estimated_impact: ImpactEstimate;      // Financial impact calculation
  warnings?: Warning[];                  // Optional warnings about the action
  dependencies?: string[];               // Optional list of call_ids this depends on
}

interface ImpactEstimate {
  net_worth_change: number;              // Change in net worth (positive/negative)
  monthly_change?: number;               // Change in monthly cash flow
  description: string;                   // Human-readable impact description
}

interface Warning {
  type: "high_risk" | "validation" | "recommendation"; // Warning category
  message: string;                       // Warning description
  severity: "low" | "medium" | "high";   // Warning severity level
}

interface ConversationStep {
  step_id: string;
  tool_name: string;
  result: any;
  timestamp: string;
}
```

**Example Response (with actions):**
```json
{
  "message_id": "msg_456e7890-f12b-34c5-d678-901234567def",
  "content": "I'll help you add your savings account. I can see you want to add $10,000 in savings. Let me create this asset for you.",
  "proposed_actions": [
    {
      "call_id": "action_789a0123-b45c-67d8-e901-234567890abc",
      "tool_name": "createAsset",
      "friendly_description": "Create savings account asset with $10,000",
      "parameters": {
        "name": "Savings Account",
        "assetType": "savings",
        "currentValue": 10000,
        "currency": "SGD"
      },
      "estimated_impact": {
        "net_worth_change": 10000,
        "description": "Increases net worth by $10,000"
      },
      "warnings": []
    }
  ],
  "requires_approval": true
}
```

**Example Response (no actions):**
```json
{
  "message_id": "msg_456e7890-f12b-34c5-d678-901234567def",
  "content": "Hello! I'm here to help you with your financial planning. You can ask me to add assets, liabilities, or create property planning scenarios.",
  "proposed_actions": [],
  "requires_approval": false
}
```

#### Error Responses

**400 Bad Request:**
```json
{
  "error": "validation_error",
  "message": "Invalid request format",
  "details": {
    "field": "message",
    "reason": "message cannot be empty"
  }
}
```

**500 Internal Server Error:**
```json
{
  "error": "llm_error",
  "message": "Failed to process message with LLM",
  "details": {
    "provider": "openai",
    "error_code": "rate_limit_exceeded"
  }
}
```

---

### 2. Action Dispatch API

**Endpoint:** `POST /api/v1/financial/actions/dispatch`
**Purpose:** Execute selected financial actions after user approval

#### Request

```typescript
interface DispatchRequest {
  selected_actions: SelectedAction[];    // Array of actions to execute
  session_id: string;                    // Required: User session identifier
}

interface SelectedAction {
  call_id: string;                       // Required: Action ID from chat response
  approved: boolean;                     // Required: Whether user approved this action
  modified_args?: Record<string, any>;   // Optional: User-modified parameters
}
```

**Example Request:**
```json
{
  "session_id": "sess_987fcdeb-51a2-43d4-8b69-123456789abc",
  "selected_actions": [
    {
      "call_id": "action_789a0123-b45c-67d8-e901-234567890abc",
      "approved": true,
      "modified_args": {
        "currentValue": 12000  // User increased the amount
      }
    },
    {
      "call_id": "action_234b5678-c90d-12e3-f456-789012345def",
      "approved": false
    }
  ]
}
```

#### Response

```typescript
interface DispatchResponse {
  results: ExecutionResult[];              // Result for each action
  summary: ExecutionSummary;              // Overall execution summary
  updated_session_state: SessionState;   // Updated session context
}

interface ExecutionResult {
  call_id: string;                        // Matches the action call_id
  success: boolean;                       // Whether execution succeeded
  entity_id?: string;                     // Created/updated entity ID (if successful)
  error?: string;                         // Error message (if failed)
  execution_time_ms: number;              // Time taken to execute in milliseconds
}

interface ExecutionSummary {
  total_actions: number;                  // Total actions processed
  successful: number;                     // Number of successful executions
  failed: number;                         // Number of failed executions
  skipped: number;                        // Number of unapproved actions
  total_execution_time_ms: number;        // Total time for all executions
}

interface SessionState {
  last_asset_id?: string;                 // ID of most recently created asset
  last_liability_id?: string;             // ID of most recently created liability
  last_property_plan_id?: string;         // ID of most recently created property plan
}
```

**Example Response:**
```json
{
  "results": [
    {
      "call_id": "action_789a0123-b45c-67d8-e901-234567890abc",
      "success": true,
      "entity_id": "asset_345c6789-d01e-23f4-g567-890123456hij",
      "execution_time_ms": 150
    },
    {
      "call_id": "action_234b5678-c90d-12e3-f456-789012345def",
      "success": false,
      "error": "Action was not approved by user",
      "execution_time_ms": 0
    }
  ],
  "summary": {
    "total_actions": 2,
    "successful": 1,
    "failed": 0,
    "skipped": 1,
    "total_execution_time_ms": 150
  },
  "updated_session_state": {
    "last_asset_id": "asset_345c6789-d01e-23f4-g567-890123456hij"
  }
}
```

#### Error Responses

**400 Bad Request:**
```json
{
  "error": "invalid_action",
  "message": "Action call_id not found in session",
  "details": {
    "call_id": "action_invalid-id",
    "session_id": "sess_987fcdeb-51a2-43d4-8b69-123456789abc"
  }
}
```

**409 Conflict:**
```json
{
  "error": "dependency_error",
  "message": "Cannot execute action due to failed dependency",
  "details": {
    "call_id": "action_dependent",
    "failed_dependency": "action_prerequisite"
  }
}
```

---

### 3. Financial Timeline API (Multiyear)

**Endpoints:**  
`GET /api/v1/financial/timeline`  
`PUT /api/v1/financial/timeline/{year}`

**Purpose:**  
Serve 0–20 year annualized timeline, allow year-specific edits/upserts (including new items), return refreshed timeline with override markers.

#### GET /api/v1/financial/timeline

**Response**

```typescript
interface TimelineResponse {
  years: TimelineYear[]; // ordered 0..20
  version: string;       // e.g., "v1"
}

interface TimelineYear {
  year: number;
  assets: TimelineItem[];
  liabilities: TimelineItem[];
  income: TimelineItem[];
  expenses: TimelineItem[];
  net_cash: number;
  net_worth: number;
  has_overrides: boolean;
  growth_applied: GrowthApplied[]; // category + rate used
}

interface TimelineItem {
  item_id: string;
  name: string;
  category: string;
  amount_annual: number;       // baseline annualized value used in projection
  adj_annual_amt: number;      // annualized value after scenario impacts (equals amount_annual when no scenarios)
  source_amount?: number;      // original amount if not annual
  source_frequency?: Frequency; // "annual" | "monthly" | "weekly" | "biweekly" | "quarterly" | "semiannual"
  item_type: "asset" | "liability" | "income" | "expense";
  created_year: number;        // first year the item exists
}

interface GrowthApplied {
  category: string;
  annual_rate_pct: number;
}
```
- When `include_scenarios=true`, `adj_annual_amt` reflects the post-scenario value and net_cash/net_worth use adjusted amounts. If no scenarios apply, `adj_annual_amt === amount_annual`.

**Example Response (truncated)**
```json
{
  "years": [
    {
      "year": 0,
      "assets": [
        {
          "item_id": "asset_1",
          "name": "Savings",
          "category": "asset_cash",
          "amount_annual": 12000,
          "source_amount": 1000,
          "source_frequency": "monthly",
          "item_type": "asset",
          "created_year": 0
        }
      ],
      "liabilities": [],
      "income": [],
      "expenses": [],
      "net_cash": 12000,
      "net_worth": 12000,
      "has_overrides": false,
      "growth_applied": [
        { "category": "asset_cash", "annual_rate_pct": 1.5 }
      ]
    }
  ],
  "version": "v1"
}
```

#### PUT /api/v1/financial/timeline/{year}

**Request**

```typescript
type Frequency = "annual" | "monthly" | "weekly" | "biweekly" | "quarterly" | "semiannual";

interface TimelineEditRequest {
  year: number; // matches path param
  edits: TimelineEdit[];
  note?: string;
}

interface TimelineEdit {
  itemId?: string;              // existing item; omit to create new
  name?: string;                // required when creating new
  itemType: "asset" | "liability" | "income" | "expense";
  category: string;
  amount: number;               // expressed in source frequency units
  frequency: Frequency;
}
```

**Response**

```typescript
type TimelinePutResponse = TimelineResponse; // refreshed 0..20 timeline
```

**Behavior / Validation**
- Upsert semantics: if `itemId` provided, override that item for the given year; otherwise create a new item (server assigns `item_id`, `created_year = {year}`) and project it forward.
- Annualization rules: annual x1, monthly x12, weekly x52, biweekly x26, quarterly x4, semiannual x2. Returned timeline always includes `amount_annual` plus `source_amount/frequency` when applicable.
- Overrides are latest-wins per item/year; has_overrides reflects applied edits.
- Validation errors on missing `itemType`, invalid frequency, or out-of-bounds growth/frequency values.

**Example Request**
```json
{
  "year": 3,
  "edits": [
    {
      "itemId": "asset_1",
      "itemType": "asset",
      "category": "asset_cash",
      "amount": 2000,
      "frequency": "monthly"
    },
    {
      "name": "Side Hustle Beta",
      "itemType": "income",
      "category": "income_other",
      "amount": 500,
      "frequency": "monthly"
    }
  ]
}
```

**Example Response (truncated)**
```json
{
  "years": [
    {
      "year": 3,
      "assets": [
        {
          "item_id": "asset_1",
          "name": "Savings",
          "category": "asset_cash",
          "amount_annual": 24000,
          "source_amount": 2000,
          "source_frequency": "monthly",
          "item_type": "asset",
          "created_year": 0
        }
      ],
      "income": [
        {
          "item_id": "income_new_1",
          "name": "Side Hustle Beta",
          "category": "income_other",
          "amount_annual": 6000,
          "source_amount": 500,
          "source_frequency": "monthly",
          "item_type": "income",
          "created_year": 3
        }
      ],
      "has_overrides": true
    }
  ],
  "version": "v1"
}
```

**Error Responses**
```json
{ "error": "validation_error", "message": "frequency must be one of: annual, monthly, weekly, biweekly, quarterly, semiannual" }
{ "error": "not_found", "message": "itemId not found for year", "details": { "itemId": "asset_missing", "year": 3 } }
```

---

### 4. Growth Config API

**Endpoints:**  
`GET /api/v1/financial/growth`  
`PUT /api/v1/financial/growth`

**Purpose:**  
Read/update bounded annual growth assumptions per category used by the projection engine.

**Request/Response Types**

```typescript
interface GrowthConfigEntry {
  category: "asset_cash" | "asset_equity" | "asset_property" | "liability_debt" | "income" | "expense";
  annual_rate_pct: number;    // e.g., 6.0 means +6%
  lower_bound_pct: number;    // e.g., -50
  upper_bound_pct: number;    // e.g., 50
  updated_at: string;
}

interface GrowthConfigResponse {
  growth: GrowthConfigEntry[];
  version: string;
}

interface GrowthConfigRequest {
  growth: Array<Pick<GrowthConfigEntry, "category" | "annual_rate_pct">>;
}
```

**Defaults (seeded)**
- asset_cash: +1.5%
- asset_equity: +6.0%
- asset_property: +3.0%
- liability_debt: -3.0%
- income: +3.0%
- expense: +2.0%
- Bounds: clamp/reject outside -50%..+50%.

**Error Responses**
```json
{ "error": "validation_error", "message": "annual_rate_pct must be between -50 and 50" }
{ "error": "unknown_category", "message": "category must be one of asset_cash, asset_equity, asset_property, liability_debt, income, expense" }
```

---

### 5. Health Check API

**Endpoint:** `GET /api/v1/health`
**Purpose:** Backend service health check

#### Response

```json
{
  "status": "healthy",
  "timestamp": "2024-01-15T10:30:00Z",
  "version": "1.0.0",
  "services": {
    "database": "connected",
    "llm_provider": "connected"
  }
}
```

---

## Financial Tools

The backend supports these financial tools that can be called by the LLM:

### 1. createAsset

**Purpose:** Create a new financial asset

**Parameters:**
```typescript
{
  name: string;           // Required: Asset name (e.g., "Savings Account")
  assetType: "savings" | "investment" | "real_estate" | "other"; // Required
  currentValue: number;   // Required: Current asset value
  currency: string;       // Optional: Currency code (default: "SGD")
  description?: string;   // Optional: Additional description
}
```

### 2. updateAsset

**Purpose:** Update existing financial asset

**Parameters:**
```typescript
{
  assetId: string;        // Required: ID of asset to update
  name?: string;          // Optional: New asset name
  currentValue?: number;  // Optional: New asset value
  description?: string;   // Optional: New description
}
```

### 3. createLiability

**Purpose:** Create a new liability (debt/loan)

**Parameters:**
```typescript
{
  name: string;           // Required: Liability name (e.g., "Car Loan")
  liabilityType: "loan" | "credit_card" | "mortgage" | "other"; // Required
  currentBalance: number; // Required: Current outstanding balance
  interestRate: number;   // Required: Annual interest rate (as decimal)
  monthlyPayment?: number; // Optional: Monthly payment amount
  currency: string;       // Optional: Currency code (default: "SGD")
}
```

### 4. updateLiability

**Purpose:** Update existing liability

**Parameters:**
```typescript
{
  liabilityId: string;    // Required: ID of liability to update
  currentBalance?: number; // Optional: New balance
  interestRate?: number;  // Optional: New interest rate
  monthlyPayment?: number; // Optional: New monthly payment
}
```

### 5. createPropertyScenario

**Purpose:** Create property planning scenario with mortgage calculations

**Parameters:**
```typescript
{
  propertyPrice: number;   // Required: Total property price
  downPayment: number;     // Required: Down payment amount
  loanAmount: number;      // Required: Loan amount needed
  interestRate: number;    // Required: Mortgage interest rate (annual)
  loanTenure: number;      // Required: Loan term in years
  propertyType: "hdb" | "condo" | "landed" | "commercial"; // Required
  currency: string;        // Optional: Currency (default: "SGD")
}
```

---

## Error Handling

### Standard Error Response Format

All API errors follow this format:

```typescript
interface ErrorResponse {
  error: string;           // Error type/code
  message: string;         // Human-readable error message
  details?: any;           // Additional error context
  timestamp: string;       // ISO timestamp of error
  request_id: string;      // Unique request identifier for debugging
}
```

### Error Types

- `validation_error` - Request validation failed
- `authentication_error` - Invalid or missing authentication
- `authorization_error` - User not authorized for action
- `not_found` - Requested resource not found
- `llm_error` - LLM provider error (OpenAI/Anthropic)
- `database_error` - Database operation failed
- `dependency_error` - Action dependency failed
- `business_logic_error` - Financial business rule violated
- `rate_limit_error` - API rate limit exceeded
- `internal_error` - Unexpected server error

### HTTP Status Codes

- `200` - Success
- `400` - Bad Request (validation error)
- `401` - Unauthorized (authentication required)
- `403` - Forbidden (authorization failed)
- `404` - Not Found
- `409` - Conflict (dependency/business logic error)
- `429` - Too Many Requests (rate limiting)
- `500` - Internal Server Error
- `502` - Bad Gateway (LLM provider error)
- `503` - Service Unavailable

---

## Development Guidelines

### Request/Response Headers

**Required Request Headers:**
```http
Content-Type: application/json
Authorization: Bearer <jwt_token>
X-Session-ID: <session_id>
X-Request-ID: <unique_request_id>
API-Version: v1
```

**Response Headers:**
```http
Content-Type: application/json
X-Request-ID: <matching_request_id>
X-Response-Time: <response_time_ms>
API-Version: v1
X-API-Deprecation-Warning: <optional_deprecation_notice>
```

### Data Validation

- All monetary amounts are in the specified currency's minor units (cents)
- Interest rates are decimal values (0.05 for 5%)
- UUIDs are used for all entity IDs
- Timestamps are in ISO 8601 format
- Currency codes follow ISO 4217 standard

### Rate Limiting

- Chat API: 10 requests per minute per user
- Dispatch API: 5 requests per minute per user
- Rate limit headers included in responses:
  ```http
  X-RateLimit-Limit: 10
  X-RateLimit-Remaining: 7
  X-RateLimit-Reset: 1642254600
  ```

### Testing

**Mock Endpoints for Development:**

- `POST /api/v1/mock/chat` - Returns fixed chat responses
- `POST /api/v1/mock/dispatch` - Returns mock execution results

**Environment Variables:**

- `BACKEND_URL` - Backend API base URL
- `API_TIMEOUT` - Request timeout in milliseconds
- `DEBUG_MODE` - Enable debug logging

---

## Implementation Notes

### Frontend Implementation

```typescript
// API Client Setup
const apiClient = new ApiService({
  baseURL: process.env.REACT_APP_BACKEND_URL,
  timeout: 10000,
});

// Chat Hook Usage
const { sendMessage, dispatchActions } = useChat(sessionId);

// Send message
const response = await sendMessage("Add my savings account");

// Handle action approval and dispatch
if (response.proposed_actions.length > 0) {
  const selectedActions = response.proposed_actions.map(action => ({
    call_id: action.call_id,
    approved: true, // or user selection
  }));

  const results = await dispatchActions(selectedActions);
}
```

### Backend Implementation

```go
// Handler Registration
router.POST("/api/chat", authMiddleware, chatHandler.HandleChat)
router.POST("/api/financial/actions/dispatch", authMiddleware, dispatchHandler.HandleDispatch)

// Error Response Helper
func writeErrorResponse(w http.ResponseWriter, statusCode int, errorType string, message string, details interface{}) {
    response := ErrorResponse{
        Error:     errorType,
        Message:   message,
        Details:   details,
        Timestamp: time.Now().UTC().Format(time.RFC3339),
        RequestID: getRequestID(r.Context()),
    }

    w.Header().Set("Content-Type", "application/json")
    w.WriteHeader(statusCode)
    json.NewEncoder(w).Encode(response)
}
```

This API contract serves as the definitive interface specification for both frontend and backend teams to develop against concurrently.

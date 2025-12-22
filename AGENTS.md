### Deprecation Notice
- backend/financial is deprecated unless working on maintenance issues.
- All new changes should be made in backend/financial_v2

### Testing
- After relevant changes on the backend, please ensure to add or update tests
- When adding or changing backend endpoints, regenerate Swagger (`swag init`) so docs stay in sync with the API
- **All tests must be structured using the 3As pattern:**
  1. **Arrange** - Set up test data, mocks, and preconditions
  2. **Act** - Execute the code under test
  3. **Assert** - Verify the expected outcomes
- **Before every commit**, run the test script to ensure all tests pass:
  ```bash
  cd backend && ./scripts/run-tests.sh
  ```
  This script automatically:
  1. Creates the `financial_chat_test` database (if needed)
  2. Runs migrations
  3. Runs unit tests
  4. Runs integration tests
  5. Drops the test database when done

### Sensitive Credentials - NEVER COMMIT

**CRITICAL: Never commit files containing secrets, passwords, or API keys.**

Files that must NEVER be committed:
- `.env.dev`, `.env.local`, `.env.production`, `.env.staging` - contain database passwords, API keys
- `credentials.json`, `secrets.json`, `*-credentials.json` - service account credentials
- `*.key`, `*.p12`, `*.pfx` - private keys and certificates
- Any file containing `PASSWORD`, `SECRET`, `API_KEY`, or connection strings with credentials

Before committing, always check:
1. Run `git diff --staged` to review what's being committed
2. Look for any hardcoded passwords, API keys, or connection strings
3. Ensure `.env*` files are in `.gitignore`

If credentials were accidentally committed:
1. Do NOT just delete and commit - the secret is already in history
2. Rewrite git history to remove the file entirely (use `git filter-branch` or `git filter-repo`)
3. Force push to update remote
4. **Rotate the exposed credentials immediately**

Safe to commit:
- `.env.example`, `.env.*.example` - templates without real values
- CA certificates (`.pem` files like `supabase-ca-chain.pem`) - these are public keys

### Safety and permissions

Allowed without prompt:

- read files, list files
- tsc single file, prettier, eslint,
- vitest single test
- go mod tidy
- go build

Ask first:

- package installs,
- git push
- git checkout
- deleting files, chmod
- running full build or end to end suites


### Ticket Creation
- When creating tickets
  - outline the background and problem trying to solve
  - be as detailed as possible on steps required, schema changes, detailing API contract schema, architectural implementation/ changes or design considerations
  - break it out into frontend and backend tasks
  - assign complexity points
  - outline tests required and acceptance criteria
  - if a single ticket is too complex (ie. > 5 points), do break it out into smaller tickets
  - always ask questions if in doubt

### When doing research
 - always look under the specs/ folder and see if any research was done before and use it as reference whenever possible

### PRD and Epic Creation Prompt

When asked to create epics, user stories, and implementation tickets for a feature, use this comprehensive approach:

```
Create a Product Requirements Document for [FEATURE_NAME] that includes:

## 1. Product Definition
- Executive summary with clear value proposition
- Problem statement identifying user pain points
- Product vision and success criteria

## 2. User Stories & Epics
Structure user stories using this format:

### Epic [X]: [Epic Name]
**As a [user type], I want [high-level capability] so that [business value].**

#### User Stories:
- **US[X].[Y]**: As a [user type], I want to [specific action] so that [specific benefit]
- Follow INVEST principles (Independent, Negotiable, Valuable, Estimable, Small, Testable)
- Focus on user value, not implementation details
- Include acceptance criteria in story format

## 3. User Experience Flows
Detail complete user journeys:
- **Flow 1: [Primary Flow]**: Step-by-step user actions from entry to completion
- **Flow 2: [Secondary Flow]**: Alternative paths and edge cases
- Include decision points, error scenarios, and system responses

## 4. Implementation Tickets
Break epics into implementable tickets using this structure:

### [TICKET_ID]: [Ticket Name]
**Priority**: P0/P1/P2 | **Complexity**: [1-8] points | **Sprint**: [Sprint Number]
**Objective**: [One sentence describing the technical goal]

**Requirements**:
- Specific technical requirements
- API contracts with example payloads
- Database schema changes
- Integration points with existing systems

**Acceptance Criteria**:
- [ ] Testable, specific criteria
- [ ] Include error handling requirements
- [ ] Performance and security considerations
- [ ] Test coverage expectations

## 5. Technical Architecture
- System integration points
- Data flow diagrams
- API design patterns
- Database design considerations

## 6. Success Metrics
- User engagement metrics
- Technical performance metrics
- Business impact measurements

## Guidelines:
- Start with user value, then work backwards to implementation
- Ensure tickets are independent and can be developed in parallel where possible
- Include explicit dependencies between tickets
- Consider mobile, accessibility, and performance from the start
- Plan for incremental delivery and feature flags
- Include testing strategy (unit, integration, e2e)
- Consider rollback and error scenarios
- Estimate complexity points: 1 (trivial), 2 (simple), 3 (moderate), 5 (complex), 8 (very complex)
- Break tickets >5 points into smaller chunks
- Include technical debt and refactoring considerations

### Testing: This is very important. Please state all tests (minimum unit tests) that will be implemented. If not tests are implemented, user will be harmed.
```

### Example Epic Structure:
```
Epic 1: User Authentication
As a user, I want to securely access my account so that my financial data is protected.

User Stories:
- US1.1: As a user, I want to log in with email/password so that I can access my account
- US1.2: As a user, I want to reset my password so that I can regain access if I forget it
- US1.3: As a user, I want 2FA protection so that my account is more secure

Implementation Tickets:
- B1: Authentication API endpoints (3 points)
- B2: Password reset flow (2 points)
- B3: 2FA integration (5 points)
- F1: Login form component (2 points)
- F2: Password reset UI (2 points)
- F3: 2FA setup interface (3 points)
```

This approach ensures:
- Clear user value proposition for each feature
- Comprehensive coverage from user need to technical implementation
- Proper prioritization and dependency management
- Testable and deliverable increments
- Technical excellence and maintainability

### When working on tasks

- refer to `specs/` folder for example tickets.
- always indicate the status of a ticket with `status: todo, in-progress, done`
- always indicate which are the corresponding frontend/backend tickets that are blocked for user to test
- Use TanStack Query for client-side data fetching/caching in modals and forms whenever feasible (adhere to existing guidelines for TanStack Query usage).

### Current Project Status

**✅ Frontend Implementation Complete (76% - 22/29 points):**
- F0-F5: All core components implemented ✅ DONE
- F6: Action results UI ⚠️ IN PROGRESS
- F7-F8: Integration & deployment ❌ BLOCKED by backend B6+B7+B8

**❌ Backend Implementation Required:**
- B6: Chat API (POST /api/v1/chat) - BLOCKS F7 testing
- B7: Dispatch API (POST /api/v1/financial/actions/dispatch) - BLOCKS F7 testing
- B8: Financial Data Models - BLOCKS F8 production

**🚀 Frontend Ready For:**
- Visual/component testing (works now)
- Backend API integration (once B6+B7 complete)
- Production deployment (once B8 complete)

### PR checklist

- title: `feat/(scope): short description`
- lint, type check, unit tests - all green before commit
- diff is small and focused. include a brief details from tickets of what changed and why. Else provide a summary of what you have done
- remove any excessive logs or comments before sending a PR
- if it is a bugfix do `fix/(scope):`,
- if it is a feature do `feat/(scope):`,
- if it is others do `chore/(scope):`

### When stuck

- ask a clarifying question, propose a short plan, or open a draft PR with notes
- do not push large speculative changes without confirmation

### Test first mode

- write or update tests first on new features, then code to green

### Design system

- Frontend: Uses Radix UI + Tailwind CSS matching assetra2 design exactly
- Backend: Standard Go patterns with clean REST APIs
- No AI SDK dependencies - custom hooks replace @ai-sdk/react
- Component library: Radix UI components with exact styling from current system
- Create/Edit modals: hide visible scrollbars; ensure content fits the viewport and manage overflow inside sections instead of showing a modal scrollbar

### ID Conventions (timeline & scenarios)
- Financial items may have both a concrete row `id` and a stable `parent_id` (used when a row is an override/child of another).
- The timeline uses the stable ID (parent_id if present, else id) for scenario matching. Impacts must target this stable ID.
- API responses expose the stable `item_id`; include `parent_id`/`row_id` if you need to disambiguate. Use `parentId ?? id` in the UI when saving `targetId`.

### Timeline Navigation Variable Naming Conventions

When working with timeline navigation (year/month selectors, sliders), use these naming conventions to avoid confusion:

**Year Variables:**
| Variable Name | Type | Description | Example |
|---------------|------|-------------|---------|
| `anchorAbsoluteYear` | number \| null | Absolute calendar year when timeline starts (from props) | `2024` |
| `resolvedAnchorYear` | number | Anchor year with fallback to current year | `2024` |
| `absoluteYear` | number | Current absolute calendar year being viewed | `2025` |
| `relativeYearIndex` | number | Year offset from anchor (0 = anchor year) | `0`, `1`, `2`... |
| `selectedYear` | number | Raw prop value (can be relative OR absolute - use `calculateActualYear` to normalize) | `0` or `2024` |

**Month Variables (Calendar Month Numbers 1-12):**
| Variable Name | Type | Description | Example |
|---------------|------|-------------|---------|
| `anchorCalendarMonth` | number \| null | Calendar month (1-12) when timeline starts | `12` (December) |
| `selectedCalendarMonth` | number \| undefined | Currently selected calendar month (1-12) | `6` (June) |
| `displayCalendarMonth` | number | Calendar month to display, clamped to valid range | `12` |
| `minCalendarMonthForYear` | number | Minimum allowed month for current year (anchor month if in anchor year, else 1) | `12` or `1` |

**Key Rules:**
1. **Calendar month numbers are always 1-12** (1=January, 12=December) - never 0-indexed
2. **Use `absoluteYear` for calculations**, not `selectedYear` (which may be relative)
3. **Use `relativeYearIndex` for UI display** (year selector shows 0, 1, 2...)
4. **Prefix with `calendar`** when referring to month numbers within a year (distinguishes from month indices or offsets)
5. **Use `resolved*` prefix** for values with null fallbacks applied

## API Contract

- API versioning should always be included
- API contract can be found in specs/rewrite-phase-1/api-contract.md
- Backend responses must emit camelCase field names for APIs (perform any snake_case → camelCase conversion server-side before returning JSON).

## API Design Best Practices

### Pagination
- **All list endpoints MUST support pagination** with consistent query parameters:
  - `limit` - Maximum items to return (default: 20, max: 100)
  - `offset` - Number of items to skip (default: 0)
  - `limit=-1` - Special value meaning "no limit" (return all results)
- **All paginated responses MUST include metadata**:
  ```json
  {
    "data": [...],
    "total": 100,
    "limit": 20,
    "offset": 0,
    "hasMore": true
  }
  ```
- Frontend should handle paginated responses defensively (check for `data` array existence)

### Avoiding N+1 API Calls
- **Prefer bulk/batch endpoints over per-item calls**:
  - BAD: Calling `/api/items/{id}` N times in a loop
  - GOOD: Single `/api/items?limit=-1` call, then client-side mapping
- When displaying related data, fetch all related items once and join client-side:
  ```typescript
  // BAD: N API calls
  for (const item of items) {
    const related = await api.getRelatedById(item.id)
  }

  // GOOD: 1 API call + client-side mapping
  const allRelated = await api.listAllRelated({ limit: -1 })
  const relatedMap = new Map(allRelated.data.map(r => [r.itemId, r]))
  ```

### Response Consistency
- All endpoints should return consistent response shapes
- Error responses should follow a standard format with `error` and `message` fields
- Empty lists should return `[]`, not `null`

## Files and documentation

- **Frontend specs:** `specs/rewrite-phase-1/frontend-tickets.txt` - Updated with completion status
- **Backend specs:** `specs/rewrite-phase-1/backend-tickets.txt` - Implementation needed
- **API contract:** `specs/rewrite-phase-1/api-contract.md` - Go backend REST APIs
- **Architecture:** `specs/rewrite-phase-1/architecture.txt` and `implementation-overview.txt`

## Repository Structure

```
financial-chat-system/
├── frontend/                    # ✅ COMPLETE React implementation
│   ├── src/
│   │   ├── components/chat/    # Chat UI matching assetra2 exactly
│   │   ├── hooks/useChat.ts    # Custom hook (replaces AI SDK)
│   │   ├── services/api.ts     # Go backend API client
│   │   └── types/              # TypeScript types for APIs
│   └── package.json            # NO AI SDK dependencies
├── backend/                     # ❌ NEEDS IMPLEMENTATION
│   └── cmd/server/             # B6+B7+B8 tickets required
├── specs/rewrite-phase-1/       # Project specifications
└── AGENTS.md                   # This file (updated)
```

## How to start

**Frontend (ready now):**
```bash
cd frontend
pnpm install
pnpm run dev    # http://localhost:3000
```

**Backend (needs implementation):**
```bash
cd backend
go mod tidy
go run cmd/server/main.go    # Needs B6+B7 implementation
```

**Full stack (once backend ready):**
```bash
./scripts/setup.sh    # Will work after backend implementation
```

## String Constants Convention

**Always use named constants for string literals that represent enums, modes, or statuses.**

This prevents typos, enables IDE autocompletion, and makes refactoring safer.

### Backend (Go)
```go
// Define constants at package level
const (
    UpdateModeInPlace   = "in_place"
    UpdateModeVersioned = "versioned"
)

// Use constants in code
if input.UpdateMode == UpdateModeVersioned { ... }
```

### Frontend (TypeScript)
```typescript
// Define constants with 'as const' for type narrowing
export const UPDATE_MODE_IN_PLACE = 'in_place' as const
export const UPDATE_MODE_VERSIONED = 'versioned' as const
export type UpdateMode = typeof UPDATE_MODE_IN_PLACE | typeof UPDATE_MODE_VERSIONED

// Use constants in code
const updateMode = applyFromThisMonthOnly ? UPDATE_MODE_VERSIONED : UPDATE_MODE_IN_PLACE
```

### When to use constants
- API request/response field values (e.g., `updateMode`, `status`, `type`)
- Database enum values
- Event types
- Any string compared with `===` or `==` in multiple places

### Naming conventions
- **Go**: PascalCase (e.g., `UpdateModeVersioned`)
- **TypeScript**: SCREAMING_SNAKE_CASE (e.g., `UPDATE_MODE_VERSIONED`)

## Golang best practice
When generating or modifying Go code, follow these principles:
- Enforce strict type safety — avoid interface{} unless absolutely necessary; prefer structs or generics.
- Write fully idiomatic Go that follows Go's conventions.
- Use clear architecture: handlers → services → repositories → models.
- Never ignore errors; never leave unsafe panics.
- Avoid unsafe type assertions; rewrite designs to eliminate them.
- Use proper concurrency patterns with context.Context.
- Maintain clean naming, meaningful types, and small readable functions.
- Avoid trivial flags/columns that can be computed on the fly — prefer computed values over storing redundant state (e.g., don't store `HasCashDeficit` when it can be derived from `AccumulatedCashEnd < 0`).

### Function Length & Organization
- **Functions should not exceed 30 lines** — if longer, extract logic into helper functions
- **Place helper functions ABOVE the functions that use them** in the same file
- Each function should do one thing well
- Use clear section headers to organize files:
  ```go
  // =============================================================================
  // Section Name (e.g., Types, Helpers, Public Methods)
  // =============================================================================
  ```
- Name helper functions descriptively (e.g., `buildNonCashAssetResponses`, `annualToMonthlyRate`)
- Helper functions should be private (lowercase) unless needed externally

### Interface Design Principles
- **Interfaces are for CONSUMERS, not CREATORS**: Return concrete types from functions; let consumers define interfaces they need
- **Avoid factory patterns**: Factory patterns from Java/C# have no place in Go; they create brittle code due to misuse of Go interface types
- **Return concrete types**: Functions should return concrete structs, not interfaces, unless absolutely necessary
- **Consumer-defined interfaces**: Let the code that uses your types define the interface it needs (accept interfaces, return structs)
- **Private interfaces for internal use**: If you must expose a public interface that could change, make it unimplementable externally by adding a private() method
- **Only expose immutable interfaces**: Public interfaces should NEVER change (like io.Reader, io.Writer) — if it might change, keep it internal
- **Testing without factories**: Concrete return types are still testable — consumers can define minimal interfaces for mocking only what they need

### Handler & Service Layer Separation
- **Handlers should only handle HTTP concerns**: parsing request bodies, validating input, calling services, and writing responses
- **Business logic belongs in the service layer**: all domain logic, orchestration of multiple repository calls, and complex operations should be in services under `internal/financial_v2/<domain>/`
- **Services should be stateless**: inject dependencies (like `*repo.Store`) via constructor
- **Keep handlers thin**: if a handler method exceeds ~20 lines of logic, move the business logic to a service

Example:
```go
// BAD: Business logic in handler
func (h *Handler) update(w http.ResponseWriter, r *http.Request, id string) {
    // ... parsing ...
    current, _ := h.store.GetItem(ctx, id)
    h.store.StopItem(ctx, id, endDate)
    existing, _ := h.store.FindByParent(ctx, id)
    if existing != nil {
        // update existing...
    } else {
        // create new version...
    }
}

// GOOD: Handler delegates to service
func (h *Handler) update(w http.ResponseWriter, r *http.Request, id string) {
    // Parse input
    var input updateInput
    json.NewDecoder(r.Body).Decode(&input)

    // Delegate to service
    result, err := h.service.Update(ctx, userID, id, input.toServiceInput())
    if err != nil {
        handleError(w, err)
        return
    }
    writeJSON(w, result)
}
```

Example:
```go
// BAD: Java-style factory pattern
type UserService interface {
    GetUser(id string) (*User, error)
    CreateUser(user *User) error
}

func NewUserService() UserService {
    return &userServiceImpl{}
}

// GOOD: Return concrete type, let consumer define interface
type UserService struct {
    db *DB
}

func NewUserService(db *DB) *UserService {
    return &UserService{db: db}
}

// Consumer defines what they need for testing
type userGetter interface {
    GetUser(id string) (*User, error)
}
```

## React and Typescript best practices to follow
TypeScript & React Coding Agent Rules

- Type safety first
  - **Never use `any`**; prefer `unknown` with proper narrowing.
  - Use generics, discriminated unions, and Zod schemas.
  - Validate API responses before use; avoid `// @ts-ignore` unless justified.
  - **Always use proper DTOs/types** - Import and use existing types from `types/` folder instead of inline type assertions or `any`.
  - When API response types don't exist, create them in the appropriate `types/*.ts` file before use.
- Predictable, clean architecture
  - Separate code under `types/`, `lib/`, `components/`, `hooks/`, `app/`.
  - Keep components free of heavy business logic; prefer pure functions.
- React/Next.js component practices
  - Default to Server Components; add `"use client"` only for hooks, event handlers, localStorage, or browser APIs.
  - Keep components small (<150 lines); extract reusable pieces; avoid deeply nested JSX.
- State management
  - Use Zustand/Jotai for app state; React Query for server state.
  - Avoid global context for everything; avoid unnecessary `useEffect`.
- Rendering performance
  - Do not store derived data in state; avoid heavy inline functions.
  - Use memoization sparingly; `React.memo` only when it helps.
- API integration
  - Wrap responses with Zod; prefer `z.infer` for types.
  - Do not assume JSON shapes; use `fetch` in server components and React Query in client components.
- Styling
  - Use Tailwind CSS and shadcn/ui; use `clsx`/`cn` for class merging.
  - Avoid inline styles unless required; stay consistent with the design system.
- Forms
  - Use react-hook-form with zodResolver for all form handling.
  - Define form schemas with Zod and use `z.infer` for TypeScript types.
- Error handling
- Always cover loading, error, and empty states; use error boundaries where appropriate.
- No over-engineering
- Avoid unnecessary generics/abstractions; keep solutions simple and maintainable.
- Automatic refactoring
- If generated TS/React code violates these rules, rewrite it to be idiomatic, type-safe, and minimal.
- Use TanStack Query for client-side data fetching and caching (including modals/forms) where feasible.

## TanStack Query Usage for Forms and Modals

- **All forms and modals** MUST use TanStack Query for data operations
  - Use `useQuery` for fetching initial data
  - Use `useMutation` for create/update/delete operations
  - Use `useQueryClient` for cache invalidation after mutations
- Form/Modal patterns:
  - Fetch data with `useQuery` when modal opens (using `enabled: isOpen && !!id`)
  - Use `useMutation` with `onSuccess` to close modal and invalidate relevant queries
  - Show loading states using `isLoading`/`isPending` from queries
  - Handle errors with `isError` and `error` from queries
  - Example pattern:
    ```typescript
    const { data, isLoading } = useQuery({
      queryKey: ['item', id],
      queryFn: () => api.getItem(id),
      enabled: isOpen && !!id
    })

    const mutation = useMutation({
      mutationFn: api.updateItem,
      onSuccess: () => {
        queryClient.invalidateQueries(['items'])
        onClose()
      }
    })
    ```
- Benefits:
  - Automatic caching and background refetching
  - Consistent loading and error states
  - Optimistic updates capability
  - Reduced boilerplate code
  - Better user experience with instant feedback

## Complex Modal/Component Folder Structure

When a modal or component exceeds ~250 lines and mixes multiple concerns (form state, API calls, UI rendering, domain logic), refactor into a co-located folder structure:

```
ComponentName/
├─ ComponentName.tsx      ← Orchestration only (~100-150 LOC max)
├─ hooks/
│  ├─ index.ts            ← Re-exports all hooks + types
│  ├─ useFormState.ts     ← Form state, hydration, field updates
│  ├─ useItemSelector.ts  ← Dropdown/selection state
│  └─ useDataFetching.ts  ← Data fetching, loading states
├─ components/
│  ├─ index.ts            ← Re-exports all components + utilities
│  ├─ Header.tsx          ← Modal/section header
│  ├─ Footer.tsx          ← Action buttons, save/cancel
│  ├─ FormFields.tsx      ← Input fields, form layout
│  └─ ItemEditor.tsx      ← Complex nested editor UI
└─ logic/
   ├─ index.ts            ← Re-exports all logic functions
   ├─ validation.ts       ← Pure validation functions
   └─ transformation.ts   ← Payload building, data transforms
```

### When to Apply
- Modal/component exceeds 250 lines
- File mixes 3+ concerns (state, UI, domain logic, API)
- Multiple developers touch the same file frequently
- Testing individual parts is difficult

### Principles
1. **Main file = orchestration only**: Import hooks, components, logic. Wire them together. No inline JSX beyond layout structure.
2. **Hooks handle state**: Form state, selection state, data fetching. Each hook returns typed state + handlers.
3. **Components are presentational**: Receive props, render UI. No direct API calls or complex state logic.
4. **Logic is pure functions**: Validation, payload building, transformations. Easy to test in isolation.
5. **Index files for clean imports**: Each subfolder has an index.ts that re-exports everything for single-line imports.

### Import Pattern
```typescript
// In main ComponentName.tsx
import { useFormState, useItemSelector, useDataFetching } from './hooks'
import { Header, Footer, FormFields, ItemEditor } from './components'
import { validateForm, buildPayload } from './logic'
```

### Skip index.ts When
- Folder contains only 1-2 exports (just import directly from the file)
- Re-export adds no value (single-line re-exports are unnecessary indirection)
- Import directly: `import { useFormState } from './hooks/useFormState'` instead of creating a hooks/index.ts

## TanStack Query Cache Update Pitfalls

**CRITICAL: When updating query caches after mutations, follow these rules:**

1. **Use `setQueryData` for immediate UI updates** - This updates the cache synchronously and triggers re-renders immediately
2. **Only invalidate queries that need server recalculation** - Don't invalidate queries you just set with `setQueryData`
3. **Include ALL data types in `setQueryData`** - If your mutation returns multiple data types (assets, liabilities, scenarioEvents, etc.), update ALL of them

**Common Bug Pattern:**
```typescript
// BAD: Missing some data types in setQueryData, then invalidating everything
onSuccess: (data) => {
  queryClient.setQueryData(QUERY_KEYS.financial.assets, data.assets)
  queryClient.setQueryData(QUERY_KEYS.financial.liabilities, data.liabilities)
  // MISSING: scenarioEvents - UI won't update for scenarios!

  queryClient.invalidateQueries({ queryKey: QUERY_KEYS.financial.all }) // Invalidates everything, causing stale state
}

// GOOD: Set ALL returned data, only invalidate derived queries
onSuccess: (data) => {
  queryClient.setQueryData(QUERY_KEYS.financial.assets, data.assets)
  queryClient.setQueryData(QUERY_KEYS.financial.liabilities, data.liabilities)
  queryClient.setQueryData(QUERY_KEYS.financial.incomes, data.incomes)
  queryClient.setQueryData(QUERY_KEYS.financial.expenses, data.expenses)
  queryClient.setQueryData(QUERY_KEYS.financial.scenarioEvents, data.scenarioEvents) // Don't forget this!

  // Only invalidate server-computed derived data
  queryClient.invalidateQueries({ queryKey: QUERY_KEYS.financial.timeline })
  queryClient.invalidateQueries({ queryKey: QUERY_KEYS.financial.netWorth })
}
```

**Why this matters:**
- `setQueryData` → Immediate UI update (synchronous)
- `invalidateQueries` → Marks data stale, triggers background refetch (async)
- If you call both on the same query key, the invalidate can cause UI to show loading state or wait for refetch


### Features
- For every CRUD action via the UI, the chat<->dispatch flow must support it as well.

### Database Schema
- If there are worktrees available, you must place the migration in the relevant worktree. If unsure, please ask the user.
- All IDs must use UUID()
- All database dates must use timestamptz
- Migration filenames must be timestamp-based (e.g., 20250101001_description.up/down.sql), placed under backend/migrations, and numbered after the latest timestamp.

---

# Backend-Specific Guidelines

## CRITICAL: Use financial_v2 Store, Not financial (v1)

**DO NOT use `internal/financial/repository/store.go` (v1 Store).**

The v1 Store is **DEPRECATED**. All new development and handler migrations MUST use the v2 Store:
- Import: `finRepoV2 "financial-chat-system/backend/internal/financial_v2/repository"`
- The v2 Store uses `decimal.Decimal` for monetary values (not `float64`)
- v2 methods return pointers for single-item queries (`*Type` instead of `Type`)

When migrating handlers from v1 to v2:
1. Change import from `internal/financial/repository` to `internal/financial_v2/repository`
2. Update handler constructor to accept `*finRepoV2.Store`
3. Use string types for decimal JSON inputs (see Decimal Handling below)
4. Handle pointer returns appropriately

## P0: Decimal Handling in API Handlers

**NEVER use `float64` for monetary values in JSON input structs.** Float64 causes precision loss.

**NEVER use `float64` for ANY numeric values in structs that represent financial data.** This includes:
- Monetary amounts (balances, amounts, payments)
- Rates and percentages (growth rates, interest rates, allocation percentages)
- Any numeric field that could be used in financial calculations

**Always use `decimal.Decimal` (or `*decimal.Decimal` for optional fields) from `internal/decimal`.**

```go
// WRONG: Never use float64 for any financial numeric field
type AppliedImpact struct {
    Amount     float64  `json:"amount"`
    GrowthRate *float64 `json:"growthRate"` // BAD - should be *decimal.Decimal
}

// CORRECT: Use decimal.Decimal for all financial numerics
type AppliedImpact struct {
    Amount     decimal.Decimal  `json:"amount"`
    GrowthRate *decimal.Decimal `json:"growthRate"` // GOOD - pointer for optional
}
```

### Correct Pattern for JSON Input Structs

Use `string` type for all decimal fields (amounts, rates, percentages):

```go
// CORRECT: Use string for decimal values
type createInput struct {
    Amount     string  `json:"amount"`      // Required decimal
    GrowthRate *string `json:"growthRate"`  // Optional decimal
}

// WRONG: Never use float64 for money
type createInput struct {
    Amount     float64 `json:"amount"`
    GrowthRate float64 `json:"growthRate"`
}
```

### Parsing Decimal Strings in Handlers

```go
// Required field
amount, err := decimal.NewFromString(input.Amount)
if err != nil {
    badRequest(w, err)
    return
}

// Optional field
var growthRate *decimal.Decimal
if input.GrowthRate != nil && *input.GrowthRate != "" {
    gr, err := decimal.NewFromString(*input.GrowthRate)
    if err != nil {
        badRequest(w, err)
        return
    }
    growthRate = gr
}

// Build repository struct
item := repo.Item{
    Amount: *amount,
}
if growthRate != nil {
    item.GrowthRate = *growthRate
}
```

### Reference: Decimal Package
- We NEVER USE shopspring/decimal
Located at `internal/decimal/decimal.go`, wraps `github.com/cockroachdb/apd/v3`:

- `decimal.NewFromString(s)` - Parse string to decimal (preferred)
- `decimal.Zero()` - Returns 0
- `decimal.One()` - Returns 1
- Methods: `.Add()`, `.Sub()`, `.Mul()`, `.Div()`, `.Round()`, `.Cmp()`
- Contexts: `MoneyContext` (2 decimal), `PercentageContext`, `GrowthContext`

## Repository Structure

### Deprecated vs Active Code

| Path | Status | Notes |
|------|--------|-------|
| `internal/financial/repository/store.go` | **DEPRECATED** | v1 repository - DO NOT USE for new features |
| `internal/financial_v2/repository/store.go` | **ACTIVE** | v2 repository - all new features go here |
| `internal/financial_v2/repository/expense.go` | **ACTIVE** | Expense CRUD operations (v2) |
| `cmd/server/handlers/` | **ACTIVE** | HTTP handlers (being migrated to v2 store) |

### Key Differences: v1 vs v2

| Feature | v1 (`financial/`) | v2 (`financial_v2/`) |
|---------|-------------------|----------------------|
| Decimal handling | `float64` | `decimal.Decimal` |
| Error handling | `repository.ErrNotFound` | `repository.ErrNotFound` |
| Return types | Direct structs | Pointer returns (`*Type`) |
| Query logging | None | `logQuery()` debug support |

## Database Schema Details

### Entity Relationships

See `/specs/income-relationships-schema.md` for full ERD documentation.

Key tables:
- `finance_incomes` - Income records with optional source (polymorphic FK)
- `finance_expenses` - Expense records with optional liability source
- `finance_investments` - Investment accounts
- `finance_cash_accounts` - Cash/bank accounts
- `finance_liabilities` - Loans/debts
- `income_allocations` - Distribution of income to destinations (v2 only)

### Foreign Key Patterns

1. **Direct FK** (DB-enforced): Used when target is single table
   - `income_allocations.target_cash_account_id -> finance_cash_accounts.id`
   - `income_allocations.target_investment_id -> finance_investments.id`

2. **Polymorphic FK** (App-enforced): Used when target can be multiple tables
   - `finance_incomes.source_type + source_id` -> investments OR cash_accounts
   - Requires app-level cascade delete

### Cascade Delete Behavior

| Relationship | Type | Cascade |
|--------------|------|---------|
| income -> allocations | DB FK | DB-level (ON DELETE CASCADE) |
| cash_account -> allocations | DB FK | DB-level (ON DELETE CASCADE) |
| investment -> allocations | DB FK | DB-level (ON DELETE CASCADE) |
| investment -> incomes (source) | Polymorphic | App-level (handler code) |
| cash_account -> incomes (source) | Polymorphic | App-level (handler code) |
| liability -> expenses | DB FK | DB-level (ON DELETE CASCADE) |

## Backend Development Guidelines

### Adding New Features

1. Add models and methods to `internal/financial_v2/repository/store.go`
2. Use `decimal.Decimal` for all monetary values
3. Return pointers for single-item queries
4. Use proper error wrapping with `fmt.Errorf`

### SQL Style

1. **Use CTEs over nested subqueries** - CTEs (`WITH` clauses) are more readable
   ```sql
   -- Good: CTE
   WITH paginated_events AS (
       SELECT * FROM scenario_events
       WHERE user_id = $1
       LIMIT $2 OFFSET $3
   )
   SELECT e.*, i.*
   FROM paginated_events e
   LEFT JOIN scenario_event_impacts i ON i.event_id = e.id

   -- Avoid: Nested subquery
   SELECT e.*, i.*
   FROM (SELECT * FROM scenario_events WHERE user_id = $1 LIMIT $2 OFFSET $3) e
   LEFT JOIN scenario_event_impacts i ON i.event_id = e.id
   ```

2. **Avoid N+1 queries** - Use JOINs or batch queries instead of looping
3. **Use pgx directly** - `financial_v2` uses `pgxpool`, not `database/sql`

### Testing Queries

Enable SQL logging by setting `repository.DebugSQL = true` in v2 store.

---

# Frontend-Specific Guidelines

## Package Manager

**Use pnpm only.** Do not use npm or yarn.

- Lockfiles are gitignored (`pnpm-lock.yaml`, `package-lock.json`)
- Install: `pnpm install`
- Add package: `pnpm add <package>`
- Run script: `pnpm run <script>`

## Frontend Reusable Components

### CollapsibleSection (`src/components/dashboard/FinancialDataManagement/components/CollapsibleSection.tsx`)

A reusable collapsible section component system with three exports:

#### `CollapsibleSection`
Container component for collapsible content with a clickable header.

**Props:**
- `title: string` - Section title (displayed uppercase)
- `total: number` - Total amount to display (formatted as currency)
- `totalSuffix?: string` - Optional suffix (e.g., `/mo`, `/yr`)
- `defaultCollapsed?: boolean` - Initial collapsed state (default: `true`)
- `children: ReactNode` - Content to show when expanded

**Usage:**
```tsx
<CollapsibleSection title="Bank Accounts" total={43000}>
  {/* Items here */}
</CollapsibleSection>
```

#### `CollapsibleItem`
A row component for items inside CollapsibleSection with click-to-select behavior.

**Props:**
- `id: string` - Unique identifier for the item
- `name: string` - Display name
- `amount: number` - Amount to display
- `amountSuffix?: string` - Optional suffix (e.g., `/mo`, `/yr`, `%`)
- `formatAsCurrency?: boolean` - Whether to format as currency (default: `true`, auto-disabled for `%` suffix)
- `isSelected: boolean` - Whether item is currently selected
- `onSelect: (id: string) => void` - Selection handler
- `onEdit?: () => void` - Optional edit handler (shows edit button when selected)
- `onDelete?: () => void` - Optional delete handler (shows delete button when selected)

**Usage:**
```tsx
<CollapsibleItem
  id="item-1"
  name="Savings Account"
  amount={25000}
  isSelected={selectedId === 'item-1'}
  onSelect={handleSelect}
  onEdit={() => handleEdit(item)}
  onDelete={() => handleDelete(item.id)}
/>
```

#### `useCollapsibleSelection`
A hook for managing selection state with click-outside handling.

**Returns:**
- `selectedId: string | null` - Currently selected item ID
- `handleSelect: (id: string) => void` - Toggle selection handler
- `sectionRef: RefObject<HTMLDivElement>` - Ref to attach to container for click-outside detection

**Usage:**
```tsx
function MySection() {
  const { selectedId, handleSelect, sectionRef } = useCollapsibleSelection()

  return (
    <div ref={sectionRef}>
      <CollapsibleSection title="Items" total={1000}>
        {items.map(item => (
          <CollapsibleItem
            key={item.id}
            id={item.id}
            name={item.name}
            amount={item.amount}
            isSelected={selectedId === item.id}
            onSelect={handleSelect}
          />
        ))}
      </CollapsibleSection>
    </div>
  )
}
```

### GroupedItemsSection (`src/components/dashboard/FinancialDataManagement/components/CategoryCard.tsx`)

A component that groups financial items by their `category` field and renders each group as a CollapsibleSection.

**Features:**
- Automatically groups items by `item.category`
- Hides categories with $0 total
- Sorts categories alphabetically (with "Other" at the end)
- Formats category names (e.g., `bank_account` → "Bank Accounts")

**Props:**
- `items: TimelineItem[]` - Items to group and display
- `financialCategory: FinancialCategory` - The financial type ('asset' | 'liability' | 'income' | 'expense')
- `summarizeAmount: (item: TimelineItem) => number` - Function to get display amount
- `selectedItemId`, `onSelectItem`, `onEditItem`, `onDeleteItem`, etc. - Standard item interaction handlers

**Usage:**
```tsx
<GroupedItemsSection
  items={assets}
  financialCategory="asset"
  summarizeAmount={summarizeAmount}
  selectedItemId={selectedItemId}
  onSelectItem={onSelectItem}
  onEditItem={onEditItem}
  onDeleteItem={onDeleteItem}
  // ... other props
/>
```

### `formatCategoryName` (internal helper)

Converts category field values to display names:
- `bank_account` → "Bank Accounts"
- `real_estate` → "Real Estate"
- `cpf` → "CPF"
- Unknown categories: converts snake_case/camelCase to Title Case

## Category Name Mappings

The following category values are mapped to friendly display names:

| Category Value | Display Name |
|---------------|--------------|
| `bank_account` | Bank Accounts |
| `bank` | Bank Accounts |
| `savings` | Savings |
| `cash` | Cash |
| `property` | Property |
| `real_estate` | Real Estate |
| `vehicle` | Vehicles |
| `other` | Other Assets |
| `investment` | Investments |
| `cpf` | CPF |
| `stocks` | Stocks |
| `bonds` | Bonds |
| `crypto` | Crypto |

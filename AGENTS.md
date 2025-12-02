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

- refer to `specs/rewrite-phase-1/frontend-tickets.txt` and `specs/rewrite-phase-1/backend-tickets.txt` for respective tickets
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
npm install
npm run dev    # http://localhost:3000
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

## React and Typescript best practices to follow
TypeScript & React Coding Agent Rules

- Type safety first
  - Never use `any`; prefer `unknown` with proper narrowing.
  - Use generics, discriminated unions, and Zod schemas.
  - Validate API responses before use; avoid `// @ts-ignore` unless justified.
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

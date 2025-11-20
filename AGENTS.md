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

### When working on tasks

- refer to `specs/rewrite-phase-1/frontend-tickets.txt` and `specs/rewrite-phase-1/backend-tickets.txt` for respective tickets
- always indicate the status of a ticket with `status: todo, in-progress, done`
- always indicate which are the corresponding frontend/backend tickets that are blocked for user to test

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

## Api contract

- API versioning should always be included
- API contract can be found in specs/rewrite-phase-1/api-contract.md

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
- Write fully idiomatic Go that follows Go’s conventions.
- Use clear architecture: handlers → services → repositories → models.=
- Never ignore errors; never leave unsafe panics.
- Avoid unsafe type assertions; rewrite designs to eliminate them.
- Use proper concurrency patterns with context.Context.
- Maintain clean naming, meaningful types, and small readable functions.

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
- Error handling
  - Always cover loading, error, and empty states; use error boundaries where appropriate.
- No over-engineering
  - Avoid unnecessary generics/abstractions; keep solutions simple and maintainable.
- Automatic refactoring
  - If generated TS/React code violates these rules, rewrite it to be idiomatic, type-safe, and minimal.

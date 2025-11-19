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

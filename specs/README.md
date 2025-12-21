# Specs Directory

Organized by lifecycle stage.

## Structure

```
specs/
├── backlog/      # Planned but not started (53 files)
├── in-progress/  # Currently being developed (8 files)
├── completed/    # Done and documented (21 files)
├── archived/     # Stale/historical reference (1 file)
└── assets/       # Non-doc files (scripts, data)
```

## Workflow

1. New specs start in `backlog/`
2. When work begins, move to `in-progress/`
3. When shipped, move to `completed/`
4. Obsolete docs go to `archived/`

## Naming Convention

Files are prefixed by domain for discoverability:

- `auth-*` — Authentication
- `ai-*` — AI/Agentic features
- `backend-*` — Backend infrastructure
- `financial-*` — Financial modeling
- `frontend-*` — Frontend/UI
- `growth-*` — Growth/pricing strategy
- `property-*` — Property planner
- `regional-sg-*` — Singapore-specific features
- `rewrite-p1-*` / `rewrite-p2-*` — Rewrite phases
- `scenarios-*` — Scenario planning
- `testing-*` — Testing infrastructure
- `timeline-*` — Timeline features

## Current In-Progress

| File | Description |
|------|-------------|
| `timeline-migrate-chart-to-v2.md` | Migrating chart to v2 API |
| `timeline-monthly-resolution-status.md` | Monthly resolution (83% complete) |
| `timeline-service-flows.md` | Timeline service analysis |
| `scenarios-impact-improvements.md` | Scenario impact enhancements |
| `growth-strategy-implementation.md` | Growth strategy package |
| `financial-allocation-versioning.md` | Timeline-aware allocations |
| `backend-apd-migration-plan.md` | APD decimal migration |
| `testing-bugs.md` | Active bug tracking |

## Recently Completed

| File | Description |
|------|-------------|
| `api-decimal-type-mismatch-fix.md` | Fixed frontend/backend type mismatch |
| `scenarios-scenario-events.md` | Scenario events feature |
| `financial-cash-accumulation-spec.md` | Cash accumulation feature |
| `backend-apd-decimal-poc-results.md` | APD decimal POC |
| `delete-all-data.md` | Delete all data feature |

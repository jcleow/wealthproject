Multiyear Financial Planning (status: todo)

Background / Context
- Problem: Home page Financial Data lacks a time dimension; users can’t reason about projected states across years. Need year selector and consistent projections.
- Requirement: Backend is the single source of truth; all projection/override computation must run server-side. Annual granularity for net worth.
- UX: Year dropdown/input (0–20) at Financial Data; net worth graph reflects edits. Non-annual inputs are normalized to annual for display and computation. Overrides should surface via markers on the graph and let users jump to that year’s data.

Questions Raised
- Growth assumptions source: static defaults vs user-editable config? (pending)
- Override semantics: latest-wins with revision? (proposed)
- API placement: projection and override application confirmed to live in backend.
- Graph behavior: annual series; markers for override presence; click-to-jump to selected year (confirmed).
- Frequency handling: normalize non-annual inputs to annual before projection/output (confirmed).

Scope
- Goal: support year-specific financial data editing (0–20), persist overrides, and recompute net worth annually on the backend only.
- Blocks frontend: Year selector + override markers + net worth sync (new frontend work, status: todo).

Assumptions
- Backend is the single source of truth for projections and override application.
- Annual granularity for projections and net worth graph.
- Non-annual user inputs must be normalized to annual amounts before projection/output.
- Growth assumptions are global; overrides at year N replace projected values for that year and influence downstream years.

Data Model (backend, status: todo)
- Year 0 snapshot: persisted assets, liabilities, income, expenses as current state (reuse existing entities).
- Growth config: global annual growth/decay assumptions per category (status: todo; can be a config table or static for now).
- Overrides table: user/session + year + item (id/type/category) + value + frequency + metadata (override reason, timestamps, revision). Needed to flag override presence per year for graph markers.

Projection Engine (backend, status: todo)
- Inputs: year 0 snapshot, growth config, overrides by year.
- Steps: normalize amounts to annual; project 0→20 applying growth; patch overrides at each year; re-run downstream years from overridden values; produce balance sheet + P&L + net worth per year; include hasOverrides flag per year.
- Output shape per year: assets, liabilities, income, expenses (annualized), net cash/NW, hasOverrides bool, growth inputs used.

APIs (backend, status: todo)
- GET /api/v1/financial/timeline: return years 0–20 with projected balance sheet, P&L, net worth series, and override flags.
- PUT /api/v1/financial/timeline/{year}: accept edits for that year (amount + frequency + item refs), store overrides, rerun projection, return refreshed timeline.
- (Optional) GET/PUT /api/v1/financial/growth: manage global growth assumptions.
- Versioned responses; responses should echo annualized values and override markers.

Frontend Integration Notes (status: todo)
- Shared year selector (0–20) near Financial Data header; uses GET timeline.
- Editing year N uses PUT timeline/{year}; updates Financial Data cards and net worth graph from returned timeline.
- Graph displays annual series; show a small blue triangle under x-axis for years where hasOverrides=true; clicking jumps to that year’s Financial Data.
- All displayed amounts are annualized; UI labels should reflect when non-annual inputs were normalized.

Risks / Decisions
- Growth config source (static vs editable) needs confirmation.
- Conflict resolution if multiple overrides for same item/year (latest-wins with revision?).
- Performance: projection should be deterministic and fast; consider caching per session/user with invalidation on overrides.

# Property Scenario Linking — Plan (status: todo)

## Decisions (confirmed)
- One loan per asset per scenario for now (future: relax to many-to-one if needed).
- Canonical category is `property` for both assets and liabilities in this flow.
- Always create a new property scenario when linking from planner/asset+loan creation (no reuse).
- Category conversion is in-place (mutate existing record when user confirms convert).
- `link_role` omitted for now; add later if multiple loans per asset are introduced.

## Background
- Need consistent linking between property assets, their liabilities (loans/mortgages), and property planner scenarios.
- When a property-related asset and liability are created together, set their categories to `property`, auto-create a property scenario, and link all three.
- Links must be editable from the Property Planner (asset dropdown), and linked assets/liabilities should be accessible from scenario views.

## Data Model
- Existing: `property_scenarios` (planner inputs/outputs).
- New: `property_links` bridge table
  - Columns: `id` (UUID PK), `property_scenario_id` FK → `property_scenarios`, `asset_id` FK → `assets`, `liability_id` FK → `liabilities`, `created_at`, `updated_at`.
  - Indexes: `idx_property_links_scenario`, `idx_property_links_asset`, `idx_property_links_liability`.
  - Uniqueness: `UNIQUE(property_scenario_id, asset_id)` (one loan per asset per scenario) and `UNIQUE(property_scenario_id, asset_id, liability_id)` (prevent dup rows, ease future relaxation).
  - Category defaults: assets/liabilities created via property flow must have `category = "property"`.
  - Derived access: scenarios should return linked asset/liability IDs for UI hydration; assets/liabilities should surface associated scenarios via links lookup.

## API Contract (versioned `/api/v1`)
- `POST /api/v1/property-links`
  - Body: `property_scenario_id?`, `asset_id`, `liability_id`.
  - Behavior: if scenario missing, create a new one (no reuse), enforce `property` category on asset/liability, enforce one-loan-per-asset-per-scenario (overwrite or reject via config), then create link.
  - Response: link payload (id, asset_id, liability_id, property_scenario_id, timestamps) + scenario summary.
- `PUT /api/v1/property-links/{id}`
  - Re-point asset/liability within same scenario; enforce categories remain `property`; keep one-loan-per-asset rule.
- `GET /api/v1/property-links?property_scenario_id=...`
  - List linked assets/liabilities for a scenario.
- `GET /api/v1/property-planner/scenarios/{id}`
  - Returns scenario with linked asset_ids, liability_ids for dropdown prefill.
- `POST /api/v1/property-planner/scenarios`
  - Planner inputs (price, downPayment, loanAmount, rate, tenure, propertyType, notes…); if `asset_id` and `liability_id` provided, enforce categories and create link.
- `PUT /api/v1/assets/{id}/convert-to-property`
  - Convert asset category to `property` (idempotent).
- `PUT /api/v1/liabilities/{id}/convert-to-property`
  - Convert liability category to `property` (idempotent).

## UX / Flows
- Asset dropdown in Property Planner lists all assets; non-property assets prompt “Convert to property?” before selection (calls convert endpoint).
- Liability dropdown (property loans) prompts “Convert to property?” for non-property liabilities.
- Property Planner modal: show the selected asset name beside “Currently modelling” to reflect which asset is active.
- Creating asset + liability from planner:
  - Defaults categories to `property`.
  - On save: backend creates asset and liability, auto-creates a new property scenario, writes `property_links`, returns scenario + link; UI refreshes planner state.
- Editing links in planner:
  - User can reassign asset or liability within a scenario; backend updates the link respecting one-loan-per-asset rule.
  - Scenario detail shows linked assets/liabilities with “View asset / View loan.”
- Discoverability:
  - Scenario view lists linked assets/liabilities with navigation.
  - Asset/liability detail shows associated property scenarios via property-links lookup.

## Tickets (frontend/backend, status: todo, phase P3)

- P3-B5: Dispatch upsert + link for property scenarios — complexity: 3 pts — depends on: P3-B1/P3-B2  
  - Implementation logic: When chat/dispatch calls `createPropertyScenario`, also upsert a property asset and liability, then link all three.  
    - Upsert rules: search by name + category `property`; if not found, create new asset/liability with defaults (category `property`, value/balance from request or fallback defaults).  
    - Scenario creation: use provided price/downPayment/loanAmount/interestRate/loanTenure; if missing, fill safe defaults (e.g., price/loan/downPayment >=1, rate>=0.01, tenure>=1) and mark defaults as system-filled.  
    - Linking: after scenario create/update, call property_links upsert (overwrite per asset per scenario).  
  - API support: extend property-links GET filters for `asset_id` and `liability_id` (in addition to `property_scenario_id`) to look up scenario by linked asset/loan.  
  - Acceptance Criteria: Dispatch path creates/updates asset+liability+scenario+link in one flow; existing asset/loan reused by name; link overwrite returns 200; property-links GET supports filtering by asset_id/liability_id.  
  - Tests: dispatch tool path happy flow; reuse vs create-new branches; property-links GET filters; overwrite semantics remain intact.

- P3-F3: Property link icon + scenario preload — complexity: 2 pts — blocked by: P3-B2, P3-B5  
  - Implementation: in asset/liability rows, render a house icon when a property link exists (fetched via `GET /property-links?asset_id=` or `?liability_id=`). Clicking opens the Property Planner modal preloaded with that scenario (fetch scenario by linked ID and hydrate fields).  
  - Defaults highlighting: when scenario fields are system-filled defaults (blank in DB / fallback), show them in orange to indicate defaulted values.  
  - Acceptance Criteria: Icon appears only when link exists; click opens modal with scenario data populated; defaulted fields highlighted; navigation works for both assets and liabilities.  
  - Tests: UI fetch/render of icon, modal preload with linked scenario, default-highlighting behavior.

- **P3-B1: Property link migration + repository** — complexity: 3 pts — blocks: P3-F1  
  - Implementation: add migration creating `property_links` with PK, FKs, indexes, uniques (`property_scenario_id, asset_id` and triple uniq). Add repo functions: `CreateLink(ctx, link)`, `UpdateLink(ctx, id, assetID, liabilityID)`, `ListLinksByScenario(ctx, scenarioID)`, `ListLinksByAsset(ctx, assetID)`, `ListLinksByLiability(ctx, liabilityID)`. Enforce one-loan-per-asset-per-scenario by delete/overwrite or returning conflict (config flag).  
  - Acceptance Criteria: migrations apply cleanly; repo enforces uniqueness; list calls return correct rows scoped; update respects rule; FK violations rejected.  
  - Tests: migration smoke, repo create/list/update, uniqueness/overwrite vs reject behavior, FK failure case.

- **P3-B2: Property link APIs** — complexity: 3 pts — blocks: P3-F1  
  - Implementation: handlers under `/api/v1`:  
    - `POST /property-links`: validate payload; if no `property_scenario_id`, create new scenario stub (minimal required fields); enforce asset/liability category `property` (convert or reject); apply one-loan-per-asset-per-scenario with overwrite/reject toggle; return link + scenario summary.  
    - `PUT /property-links/{id}`: allow re-point asset/liability within same scenario; enforce category; enforce one-loan-per-asset-per-scenario.  
    - `GET /property-links?property_scenario_id=...`: list by scenario.  
  - Acceptance Criteria: endpoints return 200 on happy paths with link payload; 400 on validation errors; 404 on missing IDs; enforcement of category and one-loan rule; new scenario auto-created when omitted.  
  - Tests: request validation, create with/without scenario, update re-point, list by scenario, category enforcement path, conflict overwrite/reject path.

- **P3-B3: Category convert endpoints** — complexity: 1 pt — blocks: P3-F1  
  - Implementation: `PUT /assets/{id}/convert-to-property`, `PUT /liabilities/{id}/convert-to-property`; fetch record, if not `property`, update; idempotent no-op if already property.  
  - Acceptance Criteria: endpoints return updated record with category `property`; noop if already property; 404 on missing ID; validation errors surfaced.  
  - Tests: convert success, already-property no-op, missing ID 404, bad ID validation.

- **P3-B4: Planner create-with-link flow** — complexity: 2 pts — blocks: P3-F1  
  - Implementation: extend `POST /property-planner/scenarios` to accept optional `asset_id`/`liability_id`; enforce categories `property`; create scenario then link via repo; include link info in response. Reuse validation for planner fields (price, downPayment, loanAmount, rate, tenure, propertyType).  
  - Acceptance Criteria: request with asset+liability creates scenario and link; response includes `property_scenario_id` and link; 400 if only one of asset/liability provided; category enforcement applied.  
  - Tests: create with both IDs, missing one ID error, category enforcement, link persisted.

- **P3-F1: Property planner linking UI** — complexity: 3 pts — blocked by: P3-B1/2/3/4  
  - Implementation: in Property Planner modal, show active asset name beside “Currently modelling”; asset dropdown (all assets) with convert-to-property prompt calling convert endpoint; liability dropdown with convert prompt; inline create asset+loan defaults category `property`; on save call scenario-create-with-link; enforce one-loan-per-asset rule per backend behavior (surface overwrite warning or conflict error). Refresh planner state and show linked records.  
  - Acceptance Criteria: selecting non-property asset triggers convert prompt and succeeds; selecting/creating liability triggers convert prompt if needed; save creates scenario+link and updates UI to show linked asset/liability and active asset name; conflict/overwrite behavior surfaced to user; no stale state after operations.  
  - Tests: interaction tests for select/convert/create, calls made to correct endpoints with category `property`, UI refresh shows linked items and active asset label, conflict/error handling.

- **P3-F2: Cross-entity discoverability** — complexity: 1 pt — blocked by: P3-B2  
  - Implementation: scenario view renders linked assets/liabilities with navigation; asset/liability detail pages fetch associated property scenarios via GET property-links; empty state messaging.  
  - Acceptance Criteria: linked lists display correct items; navigation targets resolve; empty state shows when no links; respects one-loan-per-asset-per-scenario data.  
  - Tests: render linked lists, empty states, navigation targets.

## Testing & Validation
- Backend: migration tests; repo unit tests; handler integration tests (category enforcement, auto-create scenario, link overwrite/reject behavior).
- Frontend: interaction tests for dropdown selection, conversion prompts, link creation/update, state refresh, navigation between scenarios and linked records.

# Property Asset/Liability Linking (status: todo)

## Background
- Need consistent linking between property assets, their liabilities (e.g., mortgages/loans), and property planner scenarios.
- When a property-related asset and liability are created together, their categories must be set to `property` and a property scenario is auto-created and linked.
- Links must be editable from the Property Planner, which should surface assets via dropdown and expose linked assets/liabilities from any scenario.
- Relationship: one loan per asset per scenario for now. Future relaxation to many-to-one is possible, but current rule enforces a single linked liability per asset within a scenario. A scenario can reference multiple assets (each with one linked liability), and an asset/liability can participate in multiple scenarios.

## Goals
- Enforce property category defaults for paired asset+liability creation and auto-create a new property scenario + link record.
- Allow planner UI to select existing assets (dropdown), attach liabilities, and edit links without data drift.
- Ensure linked assets/liabilities are discoverable and navigable from each property scenario.

## Data Model (backend)
- `property_scenarios` (exists from rewrite Phase 1): persisted planner inputs/outputs.
- New `property_links` table (bridge):
  - `id` (UUID PK)
  - `property_scenario_id` FK → `property_scenarios`
  - `asset_id` FK → `assets`
  - `liability_id` FK → `liabilities`
  - `created_at`, `updated_at`
  - Indexes: `idx_property_links_scenario`, `idx_property_links_asset`, `idx_property_links_liability`
  - Uniqueness:
    - `UNIQUE(property_scenario_id, asset_id)` to enforce one loan per asset per scenario (current rule).
    - `UNIQUE(property_scenario_id, asset_id, liability_id)` to block duplicate rows and ease future relaxations.
- Category defaults (enforced at creation/update):
  - Assets created via property flow → `category = "property"`
  - Liabilities created via property flow → `category = "property"` (single canonical category per guidance)
- Derived access:
  - `property_scenarios` should be returned with linked asset/liability IDs for planner UI hydration.

## API Contract (versioned `/api/v1`)
- `POST /api/v1/property-links`
  - Body: `property_scenario_id?`, `asset_id`, `liability_id`
  - Behavior: if `property_scenario_id` missing, create a new scenario (no reuse) and return it; enforce category defaults on asset/liability; create link record; enforce one-loan-per-asset-per-scenario (overwrite or reject by config flag).
  - Response: `property_link` (id, asset_id, liability_id, property_scenario_id, timestamps) + embedded scenario summary.
- `PUT /api/v1/property-links/{id}`
  - Re-point asset/liability within same scenario; enforce categories remain `property`; keep one-loan-per-asset rule.
- `GET /api/v1/property-links?property_scenario_id=...`
  - List linked assets/liabilities for a scenario.
- `GET /api/v1/property-planner/scenarios/{id}`
  - Returns scenario with linked asset_ids, liability_ids for dropdown prefill.
- `POST /api/v1/property-planner/scenarios`
  - Body: planner inputs (price, downPayment, loanAmount, rate, tenure, propertyType, notes…)
  - Behavior: if invoked with `asset_id` and `liability_id`, auto-create link with categories enforced.
- `PUT /api/v1/assets/{id}/convert-to-property`
  - Set `category = "property"`; used when selecting an existing non-property asset in the planner dropdown.
- `PUT /api/v1/liabilities/{id}/convert-to-property`
  - Set `category = "property"`; used when attaching an existing non-property liability.

## UX / Flows (frontend + backend)
- Asset dropdown in Property Planner lists all assets; non-property assets prompt “Convert to property?” before selection (calls convert endpoint).
- Liability dropdown filtered or labeled for property loans; non-property liabilities prompt “Convert to property?” before selection.
- Creating asset + liability from planner:
  - Categories default to `property`.
  - On save, backend creates both records, auto-creates a new property scenario, then writes `property_links` tying all three.
  - Planner reloads scenario with linked IDs.
- Editing links in planner:
  - User can reassign asset or liability within a scenario; backend updates link(s) accordingly.
  - Linked records are accessible from scenario details (e.g., “View asset” / “View loan” shortcuts).
- Discoverability:
  - Scenario detail view shows linked assets/liabilities; clicking navigates to their records.
  - Asset or liability detail shows associated property scenarios (via `property_links` lookup).

## Open Questions
- One loan per asset per scenario (current rule). Future: relax to many-to-one if needed.
- Canonical category: `property` for both assets and liabilities; keep consistent unless legacy enums are required.
- Always create a new property scenario when linking from planner/asset+loan creation (no reuse).
- `link_role` removed for now; can be added later if multiple loans per asset are introduced.
- Category conversion mutates the category on the existing record when the user confirms convert; audit/revision optional.

## Tickets

### Backend
- **P3-B1: Property link migration + repository** — status: todo — complexity: 3 pts — blocks: P3-F1 testing  
  - Add `property_links` table, repository, and models; include uniqueness/indexes above.  
  - Tests: migration smoke, repository upsert/list ensuring uniqueness.
- **P3-B2: Property link APIs** — status: todo — complexity: 3 pts — blocks: P3-F1 testing  
  - Implement `POST /api/v1/property-links`, `PUT /api/v1/property-links/{id}`, `GET /api/v1/property-links`.  
  - Enforce category defaults (`property` for asset and liability); auto-create scenario when missing.  
  - Tests: request/response validation, link creation, update, scenario auto-create.
- **P3-B3: Category convert endpoints** — status: todo — complexity: 1 pt — blocks: P3-F1 testing  
  - Implement `PUT /api/v1/assets/{id}/convert-to-property` and `PUT /api/v1/liabilities/{id}/convert-to-property`.  
  - Tests: convert success, idempotent no-op, validation errors.
- **P3-B4: Planner create-with-link flow** — status: todo — complexity: 2 pts — blocks: P3-F1 testing  
  - Extend `POST /api/v1/property-planner/scenarios` to accept optional `asset_id`, `liability_id`; on receipt, enforce `property` category for both and create `property_links`.  
  - Tests: scenario create with link, missing IDs error, category enforcement.

### Frontend
- **P3-F1: Property planner linking UI** — status: todo — complexity: 3 pts — blocked by: P3-B1, P3-B2, P3-B3, P3-B4  
  - Asset dropdown (all assets) with convert-to-property prompt; liability dropdown with convert-to-property prompt.  
  - Create asset+loan inline defaults categories to `property`.  
  - On save, call backend to create/update scenario and links; show linked records in scenario view.  
  - Tests: UI state flow, dropdown conversions, link creation/update calls.
- **P3-F2: Cross-entity discoverability** — status: todo — complexity: 1 pt — blocked by: P3-B2  
  - In scenario view, show linked assets/liabilities with navigation.  
  - In asset/liability detail, show associated property scenarios via GET property-links.  
  - Tests: render linked lists, navigation targets, empty state.

## Testing & Validation
- Backend: table migration tests, repository unit tests, handler integration tests covering category enforcement, auto-create, and link edits.
- Frontend: interaction tests for dropdown selection, conversion prompts, link creation, and navigation between scenarios and linked records.

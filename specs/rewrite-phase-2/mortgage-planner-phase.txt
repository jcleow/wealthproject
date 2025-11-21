# Mortgage Planner Linking — Phase 2

**Status:** todo  
**Goal:** Bind properties (assets), mortgages (liabilities), and planner scenarios with a single active loan per property, plus dropdown-driven UX that can create/convert assets and loans inline.

## Scope
- One active loan per property; replacing a loan overwrites the previous link (no history).
- Show all assets in dropdown (no filtering). If asset `category` is non-property, prompt to convert; on confirm, update category to property and continue.
- When asset + loan are set, auto create/update the property planner scenario and link all three.
- Allow creating a new loan inline if none exists; persist it to financial data and link immediately.
- Prompt to add a mortgage expense after linking; expense stores `liability_id` (and optionally `property_scenario_id`).

## Data Model
- `assets`: use `category` for property classification (e.g., `property_real_estate`); no `asset_type`.
- `liabilities`: mortgages identified by `liability_type`/`category` (e.g., `mortgage_home`).
- `property_scenarios`: planner inputs/outputs (price, loan amount, tenure, rates, property type, results).
- `property_links` (many-to-many, enforcing one active loan per property):
  - Columns: `id` (UUID PK), `property_scenario_id` FK → `property_scenarios`, `asset_id` FK → `assets`, `liability_id` FK → `liabilities`, timestamps.
  - Constraints: `UNIQUE (asset_id)`, `UNIQUE (liability_id)`, `UNIQUE (asset_id, liability_id, property_scenario_id)`.
  - Replacement rule: if a link exists for `asset_id`, delete/overwrite before inserting the new one.

## Backend Requirements
- LLM behavior: When chat mentions property + loan, propose `create_asset`, `create_liability`, `create_property_scenario`; backend executor captures IDs and writes `property_links` after creating the scenario.
- UI-driven flow: Expose endpoints to
  - Convert asset category to property.
  - Create/select liability (mortgage) and persist.
  - Create/update property scenario once asset + loan chosen.
  - Upsert `property_links` with the one-active-loan rule (overwrite existing link for that asset).
- Expenses: `create_expense` with `category = housing_mortgage`, storing `liability_id` (and optionally `property_scenario_id`) for reporting.

## Category Conventions (recommended)
- Property asset: `category = "property"` (use this when converting a non-property asset).
- Mortgage liability: `category = "mortgage_home"` (or aligned liability_type if present).
- Mortgage expense: `category = "housing_mortgage"`; include `liability_id` (and optional `property_scenario_id`).

## Frontend Requirements
- Asset dropdown: list all assets; if non-property, show “Convert to property?” prompt and convert on confirm.
- On property select: show asset info and currently linked loan (if any). If none, show loan dropdown + “add loan” form (mortgage type).
- On loan select/create: if another loan is linked, warn and replace. After selection, auto create/update property scenario and write link.
- Expense prompt: after linking, prompt to add recurring mortgage expense (monthly/yearly) tied to the loan.
- State feedback: success/error toasts for convert, create loan, scenario create/update, and linking operations.

## Assumptions / Out of Scope
- No inactive/history handling; replacing a loan removes the prior link.
- Multiple loans per property not needed now; can relax uniques later if required.

## Tickets (Phase 2)

### P2-F1: Asset/Loan Linking UI (Frontend)  
**Status:** todo — **Complexity:** medium (3 pts) — **Depends on:** P2-B1, P2-B3  
Create the dropdown-driven flow in the Mortgage Planner modal: asset selection (with convert-to-property prompt), loan selection/creation, auto scenario create/update, and link write.  
**Acceptance Criteria:**  
- Asset dropdown lists all assets; selecting a non-property asset shows a convert-to-property prompt.  
- If an asset has an active linked loan, it is displayed; otherwise a loan dropdown + “add loan” form appears.  
- Selecting/creating a loan triggers link + scenario update and shows toast feedback.  
- UI state reflects the new binding without manual refresh.  
- Testing/blockers: blocked until P2-B1 and P2-B3 are available.  
**Steps to execute:**  
- Add asset dropdown (list all assets); detect non-property category and surface “Convert to property?” prompt.  
- On select: fetch current linked loan (if any); display summary.  
- Add loan dropdown (mortgage liabilities) and inline “Add loan” form defaulting to mortgage category.  
- On asset + loan selection/create: call backend to link and refresh planner state; show success/error toasts.  
- Update state to reflect the new scenario/loan/asset binding in the UI.

### P2-F2: Category Defaults & Prompts (Frontend)  
**Status:** todo — **Complexity:** low (1 pt) — **Depends on:** none  
Apply the new category defaults (`property_real_estate`, `mortgage_home`, `housing_mortgage`) in the UI forms, with buttons to convert assets to property and default liabilities to mortgage.  
**Acceptance Criteria:**  
- Asset forms default category to `property_real_estate` and include “Set category to property.”  
- Liability forms default category to `mortgage_home` and include “Default to mortgage.”  
- Expenses launched from planner default to `housing_mortgage`.  
- All defaults propagate into API payloads.  
- Testing/blockers: none; UI-only defaults.  
**Steps to execute:**  
- Wire form selects to use predefined category options with defaults pre-selected.  
- Add “Set category to property” button on asset forms and “Default to mortgage” on liability forms.  
- Ensure expenses default to `housing_mortgage` when launched from the planner prompt.  
- Propagate defaults into React Query mutations/services payloads.

### P2-F3: Mortgage Expense Prompt (Frontend)  
**Status:** todo — **Complexity:** low (1 pt) — **Depends on:** P2-B4  
After linking a loan, prompt to add a mortgage expense with `category = housing_mortgage`, storing `liability_id` (and optional `property_scenario_id`).  
**Acceptance Criteria:**  
- Expense prompt triggers only after successful link creation.  
- Category prefilled to `housing_mortgage`, frequency defaults to monthly.  
- `liability_id` (and `property_scenario_id` if available) are included in the request.  
- Adds expense, shows toast, and refreshes expense list.  
- Testing/blockers: blocked until P2-B4 supports IDs on expenses.  
**Steps to execute:**  
- Trigger expense prompt after successful link creation.  
- Prefill category to `housing_mortgage`, amount empty, frequency monthly by default.  
- Pass `liability_id` (and `property_scenario_id` if available) in the create expense call.  
- Show confirmation toast and refresh expense list.

### P2-B1: Linking Endpoint & Overwrite Rule (Backend)  
**Status:** todo — **Complexity:** medium (3 pts) — **Depends on:** none  
Backend endpoint to upsert `property_links` with one-active-loan-per-asset enforcement (overwrite prior link for the asset, unique on asset_id/liability_id).  
**Acceptance Criteria:**  
- `POST /property-links/upsert` accepts `asset_id`, `liability_id`, `property_scenario_id`.  
- Overwrites prior link for the asset; enforces unique on `asset_id` and `liability_id`; unique on triple.  
- Returns link ID and bound IDs; includes tests for replace/conflict paths.  
- Testing/blockers: add unit/integration coverage for unique/overwrite behavior.  
**Steps to execute:**  
- Create handler (e.g., `POST /property-links/upsert`) accepting `asset_id`, `liability_id`, `property_scenario_id`.  
- Implement repository/service to delete/overwrite prior link for the asset, enforce unique on `asset_id` and `liability_id`, and insert new link (unique on triple).  
- Return link ID and echo bound IDs; add tests for replace and conflict paths.

### P2-B2: Asset Convert-to-Property (Backend)  
**Status:** todo — **Complexity:** low (1 pt) — **Depends on:** none  
Endpoint/logic to update an asset’s `category` to `property_real_estate` when user confirms conversion from a non-property asset.  
**Acceptance Criteria:**  
- Endpoint (e.g., `POST /assets/{id}/convert-to-property`) updates category to `property_real_estate`.  
- Validates asset exists; returns updated asset.  
- Tests cover convert success and already-property no-op.  
- Testing/blockers: add unit/integration tests for convert/no-op branches.  
**Steps to execute:**  
- Add handler/route (e.g., `POST /assets/{id}/convert-to-property`).  
- Validate asset exists; update `category` to `property_real_estate`; return updated asset.  
- Add tests for convert success and already-property no-op.

### P2-B3: Scenario Auto-Create/Update (Backend)  
**Status:** todo — **Complexity:** medium (3 pts) — **Depends on:** none  
Backend handler to create/update `property_scenarios` when asset + liability are chosen, returning `property_scenario_id` for linking.  
**Acceptance Criteria:**  
- `POST /property-scenarios` and `PUT /property-scenarios/{id}` validate required fields (price, downPayment, loanAmount, rate, tenure, propertyType).  
- Link flow creates or updates scenario and returns `property_scenario_id`.  
- Tests cover create/update flows and validation errors.  
- Testing/blockers: add unit/integration coverage for validation and create/update paths.  
**Steps to execute:**  
- Expose `POST /property-scenarios` and `PUT /property-scenarios/{id}` with required fields (price, downPayment, loanAmount, rate, tenure, propertyType).  
- On link request, create or update scenario using current asset/liability inputs; return `property_scenario_id`.  
- Add tests for create/update flows and validation errors.

### P2-B4: Mortgage Expense Persistence (Backend)  
**Status:** todo — **Complexity:** low (1 pt) — **Depends on:** none  
Ensure `create_expense` supports `housing_mortgage` category and accepts optional `liability_id`/`property_scenario_id`; expose via dispatch/API.  
**Acceptance Criteria:**  
- Expense model/DTO accepts optional `liability_id` and `property_scenario_id` when category is `housing_mortgage`.  
- Dispatch and REST paths persist these links.  
- Tests cover happy path and validation.  
- Testing/blockers: add unit/integration coverage for linked expenses.  
**Steps to execute:**  
- Update expense model/DTO to allow optional `liability_id` and `property_scenario_id`.  
- Validate category supports `housing_mortgage`; persist linked IDs.  
- Wire into dispatch handler for LLM-proposed expenses and into REST CRUD if present.  
- Add tests covering happy path and validation.

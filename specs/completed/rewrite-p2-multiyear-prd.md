# Multiyear Timeline Overrides PRD

## Problem
- Year-specific edits currently mutate the year-0 baseline via CRUD endpoints. Users editing year N expect an override at N that propagates forward while leaving year 0 unchanged.
- Annualization, growth, and net worth must remain backend-driven; the frontend should only fetch and render.

## Goals
- Add year-aware editing via timeline overrides and new-item persistence.
- Keep deterministic projection for years 0–20 with has_overrides markers, annualized amounts, and source metadata.
- Frontend never re-computes amounts; only calls GET/PUT timeline.

## Data Model
- **Base snapshot (year 0):** existing assets/liabilities/income/expenses tables.
- **Overrides:** `financial_overrides` table with fields like `id`, user/session, `year`, `item_id`, `item_type` (asset|liability|income|expense), `category`, `amount`, `frequency` (annual|monthly|weekly|biweekly|quarterly|semiannual), `source_amount`, `source_frequency`, `applied_at`, `revision`; latest per item/year wins.
- **New items:** `items_catalog` (or equivalent) with `id`, `name`, `item_type`, `category`, `base_amount` (annualized), `frequency_at_creation`, `created_year`, timestamps.
- **Growth config:** `growth_configs` with `category`, `annual_rate_pct`, `lower_bound_pct`, `upper_bound_pct`, `updated_at`.

## API
- **GET** `/api/v1/financial/timeline`: returns years 0–20 with items (annualized), source metadata, has_overrides, growth_applied, net_cash, net_worth, version.
- **PUT** `/api/v1/financial/timeline/{year}`:
  - Body: `{ year: int, edits: [{ itemId?, name?, itemType, category, amount, frequency }], note? }`
  - Behavior: if `itemId` present, create/replace override for that year; otherwise create a new item (assign id, `created_year = year`) and include it downstream. Re-run projection and return refreshed timeline.
  - Validation: frequency/category/bounds; errors on missing `itemType`/frequency/invalid values.
- **GET/PUT** `/api/v1/financial/growth`: read/update bounded growth assumptions; projection consumes stored config.

## Projection Engine
- Inputs: year-0 snapshot + growth config + overrides + items with `created_year`.
- Loop Y=0..20:
  1) Apply bounded growth per category to prior state.
  2) Apply overrides for Y (latest wins). New items get `created_year = Y` and are added to state.
  3) Compute assets/liabilities/income/expenses (annualized), net_cash, net_worth.
  4) Mark `has_overrides` for Y; attach `growth_applied` and source amount/frequency for UI.
  5) Carry updated state to Y+1.
- Deterministic and idempotent for identical inputs.

## Frontend Integration
- Use timeline GET/PUT only for year edits; no year-based CRUD mutations.
- Prefill edit modal from selected year’s timeline item (amount + source_frequency).
- On save, call PUT timeline/{year}; refresh timeline state; graph markers derive from `has_overrides`.
- Display rounded dollars; annualization hint via info tooltip only.

## Implementation Steps
1) Confirm/extend schemas for `financial_overrides` and `items_catalog` (`created_year`).
2) Implement projection engine with growth + overrides + new-item carry-forward + bounds.
3) Build GET/PUT timeline endpoints with validation and version headers; hook projection to growth config.
4) Tests: frequency annualization, growth bounds clamp, override latest-wins, new-item persistence, GET/PUT contract.
5) Frontend: load modal from timeline year; route saves to PUT timeline/{year}; keep CRUD for base year 0 only.

## Risks / Notes
- Projection performance (consider caching per user/session).
- Avoid mutating base snapshot when editing Y>0.
- Strict validation for frequency/category; reject invalid inputs.
- Frontend remains “dumb”; any computation drift is fixed server-side.

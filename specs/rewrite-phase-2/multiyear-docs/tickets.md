# Multiyear Planning Tickets

**Repository:** `financial-chat-system`
**Scope:** Multiyear planning (timeline 0–20y, overrides, growth config, frontend integration)
**Total Points:** 21 points
**Status:** mixed (backend done; frontend in progress)

---

## Backend Tickets

### Ticket B9: Projection Engine (Overrides + New-Item Persistence)
**Priority:** P0  
**Estimate:** 5 points  
**Dependencies:** Existing finance data models; growth config (B11)  
**Status:** done  
**Blocks:** B10; frontend F9/F10/F11

**Description:**  
Build deterministic annual projection engine (years 0–20) that annualizes inputs, applies bounded growth, applies overrides (latest-wins), and persists new items forward from their creation year.

**Acceptance Criteria:**
- [ ] Annualize inputs with frequency map (annual, monthly x12, weekly x52, biweekly x26, quarterly x4, semiannual x2).
- [ ] Apply category growth rates with bounds (default rates from multiyear-planning: cash 1.5%, equity 6%, property 3%, debt -3%, income 3%, expense 2%; clamp -50%..+50%).
- [ ] Overrides latest-wins per item/year; new items created at year N added to base and projected through N..20.
- [ ] Output timeline array 0–20 with assets/liabilities/income/expenses (annualized), net cash, net worth, hasOverrides flag, growth inputs used, source frequency/amount metadata for labeling.
- [ ] Deterministic results for same inputs; idempotent projection runs.

**Technical Details:**
- Use effective-dated rows instead of a separate overrides table:
  - Add `start_year` (default 0) and optional `end_year` to financial assets/liabilities/income/expenses (or a shared values table). Enforce uniqueness on `(user_id, item_id, start_year)`.
  - Baseline rows: `start_year = 0`, `end_year = null`.
  - Overrides: insert a new row with the same `item_id`, `start_year = N` (and optional `end_year` if bounded). Projection picks the row with the latest `start_year <= Y` for year Y.
  - New items: insert a new `item_id` row with `start_year = N` (end_year null). Optionally keep `created_year = start_year` on the same row.
  - Delete semantics: an override row with `amount = 0` and `start_year = N` means remove the item from year N forward (projection skips it for Y >= N). End-dating (`end_year = N-1`) is another option if preferred.
- Engine pipeline: load baseline (start_year=0), load override rows (start_year>0), load growth config; normalize; loop years 0..20; apply growth, overlay the latest row with `start_year <= Y` per item, skip items with delete marker (amount=0); compute aggregates; mark `has_overrides`; carry state forward.
- Enforce bounds before applying rates; reject invalid frequency/category.

**Tests (write first):**
- Frequency normalization table-driven tests.
- Growth bounds clamp and rate application per category.
- Override latest-wins behavior and new-item creation at year N appearing in N..20.
- Deterministic timeline snapshot test (golden) for a small fixture.
- Migration test: year-0 seed rows only; no projection rows persisted.
- Delete rule test: amount=0 at start_year=N removes item from N forward; bounded override with end_year honored if used.

---

### Ticket B10: Timeline API (GET/PUT)
**Priority:** P0  
**Estimate:** 4 points  
**Dependencies:** B9, B11  
**Status:** done  
**Blocks:** Frontend F9/F10/F11

**Description:**  
Expose versioned endpoints for timeline fetch and year upsert edits (including new items), returning refreshed 0–20 timeline.

**Acceptance Criteria:**
- [ ] GET `/api/v1/financial/timeline` returns 0–20 timeline from projection engine with hasOverrides, annualized amounts, source frequency metadata.
- [ ] PUT `/api/v1/financial/timeline/{year}` upserts edits: validates payload, stores effective-dated rows (unique `(user_id, item_id, start_year)`), allows new items (assign ID, `start_year=year`), re-runs projection, returns refreshed timeline.
- [ ] Validation errors for invalid frequency/category/bounds; version headers included.
- [ ] New items appear downstream after save; hasOverrides reflects mutations.

**Technical Details:**
- Request body (PUT): `{ year: int, edits: [{ itemId?, name?, itemType: asset|liability|income|expense, category: string, amount: number, frequency: enum }], note?: string }`.
- Writes to effective-dated rows in the entity tables (or a shared values table) with `start_year = {year}` and optional `end_year`. New items insert a new `item_id` row with `start_year = year`.
- Delete rule: `amount = 0` with `start_year = year` means remove from year `>= year` in projection (or use `end_year = year - 1` if you prefer bounded end-dating).
- Wire handlers under `/api/v1/financial/`.

**Tests (write first):**
- Contract tests for GET/PUT success paths.
- Validation failures (bad frequency, missing itemType, out-of-bounds amount/rate).
- New item creation surfaces in response timeline downstream; override update path; hasOverrides true when expected.
- Delete rule honored (amount=0 at start_year=N removes item from N forward).

---

### Ticket B11: Growth Config API
**Priority:** P0  
**Estimate:** 2 points  
**Dependencies:** None  
**Status:** done  
**Blocks:** B9 (needs config), frontend growth editing (future)

**Description:**  
Expose bounded growth assumptions per category with seed defaults.

**Acceptance Criteria:**
- [ ] Seed defaults (cash 1.5%, equity 6%, property 3%, debt -3%, income 3%, expense 2%; bounds -50%..+50%).
- [ ] GET/PUT `/api/v1/financial/growth` returns/updates rates with bounds enforcement.
- [ ] Projection engine (B9) reads stored config.

**Technical Details:**
- Table `growth_configs`: category enum, annual_rate_pct, lower_bound_pct, upper_bound_pct, updated_at.
- Validation clamps or rejects out-of-bound inputs; versioned response.

**Tests (write first):**
- Default seed readback.
- Bounds enforcement on PUT.
- Projection uses updated config (integration with B9 fixture).

---

## Frontend Tickets

### Ticket F9: Year Selector + Timeline Fetch
**Priority:** P0  
**Estimate:** 3 points  
**Dependencies:** B10  
**Status:** in-progress  
**Blocks Testing On:** B10 availability

**Description:**  
Add 0–20 selector and load timeline; bind Financial Data cards and graph series to fetched timeline.

**Acceptance Criteria:**
- [ ] Selector control (0–20) near Financial Data header; initializes from GET timeline.
- [ ] Cards reflect selected year; graph stays in sync; handles loading/error/empty states.
- [ ] Annualized amounts displayed; hasOverrides passed to graph for markers.

**Technical Details:**
- Use existing Radix/Tailwind patterns; consume `services/api.ts` client; store timeline in state; selector updates view only (no refetch unless needed).

**Tests (write first):**
- Selector state changes view.
- Fetch success/error rendering.
- Annualized amounts and hasOverrides propagate to graph props.

---

### Ticket F10: Edit Year Upsert (Existing + New Items)
**Priority:** P0  
**Estimate:** 4 points  
**Dependencies:** B10  
**Status:** in-progress  
**Blocks Testing On:** B10 availability

**Description:**  
Add edit/create UI for a year; call PUT timeline/{year}; show annualized sublabels and source frequency; new items persist downstream.

**Acceptance Criteria:**
- [ ] Drawer/form supports editing existing items and creating new items (name, type, category, amount, frequency).
- [ ] On save, call PUT; refresh timeline state; show annualized label “annualized from X” when frequency != annual.
- [ ] New items appear in lists for year N and downstream years after save.
- [ ] Error handling surfaced in UI.

**Technical Details:**
- Reuse component patterns from Financial Data forms; ensure type-safe payload; update local cache from response.

**Tests (write first):**
- Form validation; submission success paths.
- New item creation appears downstream; existing item override path.
- Annualized sublabel rendering; error state display.

---

### Ticket F11: Graph Override Markers & Jump
**Priority:** P0  
**Estimate:** 3 points  
**Dependencies:** B9, B10  
**Status:** in-progress  
**Blocks Testing On:** B9/B10 data

**Description:**  
Render override markers and enable click-to-jump to the selected year; show annualized tag in tooltips.

**Acceptance Criteria:**
- [ ] Blue triangle markers for years where hasOverrides=true.
- [ ] Clicking a marker sets selector year and scrolls/focuses Financial Data section.
- [ ] Tooltips show amounts and “annualized” tag when source frequency differs.

**Technical Details:**
- Consume timeline prop with hasOverrides and source frequency metadata; keep marker alignment with x-axis ticks.

**Tests (write first):**
- Marker rendering for override years.
- Click-to-jump updates selector and scrolls.
- Tooltip content includes annualized tag when applicable.

---

## Blocked Testing Summary
- Backend B9/B10/B11 delivered; frontend F9/F10/F11 can now integrate and validate against live timeline APIs.
- Future growth editing UI would depend on B11 (now available).

Cashflow Projection — Product Requirements + Technical Spec

Status: draft (todo)

Goal
- Provide a 0–20 year cashflow and net-worth projection using assets, liabilities, income, and expenses, with growth/interest assumptions and per-year overrides.

Users/Scenarios
- Individuals tracking surplus/deficit, debt payoff, and savings runway.
- Homebuyers seeing mortgage/property impact on cashflow and net worth.
- Investors comparing contributions vs market growth.

Problem
- Current app is point-in-time only; no recurring flow projection, amortization, or what-if changes. Users cannot plan multi-year outcomes or test assumptions.

Key Outcomes
- Per-year cashflow table: income, expenses, debt service, surplus/deficit.
- Net-worth trajectory with asset growth and liability amortization applied.
- Assumptions surfaced (growth, inflation, raises), with overrides for life events.
- Negative-cashflow years and payoff timelines are clearly visible.

Constraints
- Keep API versioning /api/v1 and reuse existing timeline endpoints/models.
- Use existing stack: Go backend, Radix + Tailwind frontend; no AI SDK.
- Deterministic, testable calculations; no hidden magic numbers.

Measures of Success
- 21-year projection returns without backend errors.
- Edits to assumptions/overrides update projections instantly.
- Debt payoff dates and deficit years visible from the UI.

Data Model (backend)
- Use existing tables: finance_assets, finance_liabilities, finance_incomes, finance_expenses.
- Use financial_overrides (year, item_id, item_type, category, amount, frequency, name).
- Optional (if needed): assumptions persisted per category; otherwise payload-only.

Computation Flow (backend)
- Normalize all flows to annual (frequency factors: weekly=52, biweekly=26, monthly=12, quarterly=4, yearly=1).
- For each year 0–20:
  1) Carry forward asset values and apply growth (category defaults; overridable).
  2) Amortize liabilities: if term exists, compute PMT and split principal/interest; else interest-only with min payment.
  3) Apply income raises and expense inflation (category defaults; overridable).
  4) Apply per-year overrides: replace amount/frequency/category/name where provided.
  5) Net cash = income – expenses – debt service + asset cash yield (if modeled).
  6) Update cash assets with surplus; if negative, draw down cash to zero and flag deficit.
  7) Net worth = sum(assets) – sum(liabilities) using updated values.
- Outputs per year:
  - income[], expenses[], debt_service[] (principal/interest), asset_income[] (optional),
  - net_cash, ending_cash, net_worth,
  - growth_applied[] (category, rate) for transparency.

API Contract (backend, v1)
- GET /api/v1/financial/timeline (existing): include cashflow fields net_cash, debt_service, ending_cash, growth_applied; keep versioned headers.
- PUT /api/v1/financial/timeline/{year} (existing): accept overrides; validate frequency and amount != 0.
- Optional: PUT /api/v1/financial/assumptions to set per-category growth/inflation (only if needed).

Defaults (overridable)
- Asset growth: cash 1.5%, equity 6%, property 3%.
- Expense inflation: 2%.
- Income raises: 3%.
- Liability rates from DB; if term missing, interest-only with provided min payment.

Frontend
- Use timelineApi to fetch projections.
- Render per-year cashflow table and net-worth chart.
- Show assumptions (pill/tooltip) and applied overrides.
- Currency formatting via formatCurrency; follow Radix + Tailwind styles.

Tickets (all status: todo)
1) Backend — feat/cashflow-projection (5 pts)
   - Implement projection engine using base data + overrides; expose via timeline endpoints.
   - Tests: normalization, growth, amortization, overrides; golden snapshot for multi-year projection.
   - Acceptance: GET timeline returns net_cash, net_worth, debt service; PUT overrides reflected.
2) Frontend — feat/cashflow-views (3 pts)
   - Render cashflow table and net-worth chart; show assumptions and override impacts.
   - Tests: component tests for rows, currency formatting, override application (mock API).
   - Acceptance: users see per-year surplus/deficit, net-worth trend, assumptions tooltip; updates after save.
3) Backend (optional) — feat/cashflow-assumptions (2 pts)
   - Endpoint to set/get category growth/inflation assumptions.
   - Acceptance: persisted assumptions adjust projections and are echoed in timeline response metadata.

Acceptance Criteria (overall)
- Projection covers years 0–20 with deterministic results.
- net_cash and net_worth returned and displayed.
- Overrides change targeted year and propagate forward appropriately.
- Negative cash years flagged; debt service split shown when term data exists.

Open Questions
- Do we need monthly granularity, or is annual sufficient?
- Should we split asset yield vs price growth per category?
- What default term to assume when a liability term is absent (interest-only vs synthetic 30-year)?

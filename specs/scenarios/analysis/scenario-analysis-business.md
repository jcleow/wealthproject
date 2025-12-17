# Scenario Analysis — Business Logic Guide (status: todo)

Guiding logic for scenario events (overlays, modal, financial_data impacts) using the unified event+impact schema. Month is our base resolution (YYYY-MM); no partial-month or weekly handling.

## Inputs
- Event meta: name, description, occurs_on, duration (instant/temporary/permanent), recurrence (one-time/monthly/annual/X-years), display_icon, tags, scenario_id?, is_included (defaults true).
- Impacts array: `{ target_type (asset|liability|income|expense), target_id?, impact_kind (delta|override|start|stop), amount, currency, cadence (one_time|monthly|annual), start_month, end_month?, notes? }` (end_month optional/open-ended but must be >= start_month); aggregates are derived, not targeted.
- Who is affected: household/user/kids/parents/spouse (for insights/narrative).
- Optional: probability/severity (future), not required for v1.

## Processing
- Normalization: derive start_month/end_month from occurs_on when absent; clamp/validate month ranges; single currency only.
- Ordering per entity/month: apply start/stop gates → overrides → deltas → aggregate summaries; deterministic every run; overlapping start/stop windows for the same entity within an event are invalid.
- Conflicts: within a scenario, overlapping overrides on the same entity/month are errors. Across scenarios, allow but resolve via deterministic precedence (default: latest `updated_at` wins) and surface warnings with suggested fix (e.g., convert one override to a delta). UI should let the user pick precedence if needed.
- Aggregation: roll per-entity impacts into financial_data rows; emit `event_impacts` with `event_id`, `impact_kind`, `amount`, `cadence`; empty-impact events do not alter projections; aggregates (cashflow/net worth) are computed on demand from entity-level impacts.
- Simulation toggle: include/exclude persists server-side; backend recomputes financial_data accordingly (authoritative).

## Outputs
- Graph overlay: icon at occurs_on month with tooltip (name + short description); click opens modal.
- Modal: grouped impacts (asset/liability/income/expense), net worth delta, monthly cashflow delta, “If this happens…” summary, conflict/empty-impact messaging.
- Financial item cards: when year is toggled, impacted rows show badges/tooltips sourced from `event_impacts`; empty state when none apply.
- Palette/search: searchable list (text + tags + year) with include/exclude toggle; hover highlights markers; conflict warnings appear when overrides overlap (icon + message + suggested resolution); click opens modal.
- Derived aggregates: net worth and cashflow are computed from entity impacts; users edit only assets/liabilities/income/expenses.

## Insights to surface
- Cashflow: deficit month, emergency-fund depletion timeline, savings rate change.
- Liability: DSR/repayment stress; interest-buffer risk when income drops.
- Liquidity: months of buffer < 3 flagged.
- Goals: retirement/education/major-goal delays or shortfalls after impacts.
- Protection: coverage gaps when expenses exceed payouts (CI/DI).
- Multi-event: cascading conflicts when overlapping events make another unaffordable.

## Guardrails
- Deterministic math; same inputs → same outputs.
- Traceability: each changed row in financial_data carries `event_id`.
- Graceful degradation: empty-impact events store and display but don’t mutate projections.
- Validation: require amount/cadence, valid month ranges, reject overlapping overrides per entity/month.

# Scenario Design Principles (status: todo)

Business context and logic is found in scenario-analysis-business.md.

Use these principles to evaluate and implement any scenario feature (including the event overlay + modal flow in `scenario-event-templates.md`). They emphasize a single schema, predictable math, and minimal UI friction.

## Goals
- One schema for all scenarios: event meta + impacts array → financial_data + insights.
- Deterministic math: same inputs always yield the same cashflow/balance-sheet outputs.
- Fast comprehension: overlays + modals show “what, when, how much, and to whom” at a glance.
- Composable: multiple events can stack without hidden side effects.

## Core Principles
- **Uniform structure**: Every scenario is just event meta plus a typed impact list (target_type, impact_kind, cadence, start/end year). No bespoke branches per scenario type.
- **Scope clarity**: Impacts must declare who/what they touch (asset/liability/income/expense/aggregate) and the time window (start/end year or occurs_on-derived year).
- **Deterministic ordering**: Apply overrides first, then deltas, then derived summaries so repeated runs are stable.
- **Separation of concerns**: Capture data once; render anywhere. The backend computes financial_data; the frontend renders overlays, cards, and modal views from the same payload.
- **Traceability**: Each impacted row in financial_data carries event_ids so users can see why a value changed.
- **Graceful degradation**: If an event lacks quantified impacts, show “no quantified impact yet” in modal; do not mutate projections.
- **Conflict hygiene**: Reject or surface conflicts when multiple overrides target the same entity/year; do not silently pick one.
- **Toggleable simulation**: Users can include/exclude events in the simulation without deleting them (persisted record, runtime toggle).
- **Searchable palette**: Provide search/filter (tags, year) and quick hover/preview to switch between events/scenarios.
- **Narrative pairing**: Pair numbers with insights (cashflow/DSR/liquidity/goal/protection) generated from the computed outputs.

## Required Inputs (per event)
- Event meta: name, description, occurs_on, display_icon, tags, scenario_id?.
- Impacts array: `{ target_type, target_id?, impact_kind (delta|override|start|stop), amount, currency, cadence (one_time|monthly|annual), start_month, end_month?, notes? }` where start/end are YYYY-MM (open-ended end_month allowed).
- Optional: probability/severity flags for future Monte Carlo; not required for v1.

## Required Outputs (per view)
- Graph overlay: icon + tooltip (name, date, short description); click → modal.
- Modal: grouped impacts with net worth delta, monthly cashflow delta, and “If this happens…” summary.
- financial_data rows: include `event_impacts` for impacted entities; cards show badges/tooltips when the selected year matches an impact window.
- Scenario/event palette: searchable list with tags, year, and include/exclude toggle; hover highlights markers.

## Implementation Guidance
- API: Align with P4-B9 shape (`/api/v1/scenario-events` CRUD with impacts; financial_data annotated with event_ids when year filter is present).
- UX: Year toggle refetches events + financial_data for that year and re-renders overlays/cards without stale badges; monthly resolution is supported by storing YYYY-MM and rolling up to year when needed.
- Validation: enforce non-overlapping overrides per entity/month window, require amount/cadence, and normalize occurs_on → start_month when unspecified.
- Testing: cover merging logic (override vs delta), month/year filtering, card badge rendering, and empty-impact cases.

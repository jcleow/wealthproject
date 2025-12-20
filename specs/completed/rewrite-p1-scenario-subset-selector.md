## Scenario Subset Selector (Backend query + API spec)

### Goal
Allow users to choose a subset of scenarios to apply. Only checked scenarios affect calculations; unchecked scenarios remain visible in UI but are ignored in merges.

### API updates
- `GET /api/v1/timeline?include_scenarios=true&scenario_ids=s1,s2`
  - `scenario_ids` (comma-delimited) optional; when empty, use all included scenarios.
- `POST /api/v1/scenario-analysis`
  - Body: `{ "scenario_ids": ["s1","s2"] }` optional; honors subset when provided.
- Responses:
  - `TimelineResponse.scenarios_applied` returns scenario IDs that actually contributed impacts (not event IDs).
- Scenario list for selector:
  - `GET /api/v1/scenarios` (or extend an existing list) returns user scenarios: `[{ id, name, icon, color, is_included }]`.

### Data + repository
- Extend `ScenarioFilters` with `ScenarioIDs []string`.
- In `ListScenarioEvents`, add `scenario_id = ANY($X)` when filter provided.
- Add `CREATE INDEX CONCURRENTLY idx_scenario_events_scenario_id ON scenario_events(scenario_id);`.

### Services
- `timeline.Service.GetTimelineWithScenarios` passes selected IDs to `scenario.Service.Apply`.
- `scenario.Service.Apply` already supports `SelectedIDs`; ensure it filters by scenario ID (not event ID).
- Collect `scenarios_applied` from scenario IDs that produced impacts.

### Handlers
- `timeline` handler: parse `scenario_ids` query param (comma-delimited) and forward.
- `scenario-analysis` handler: parse `scenario_ids` from body and forward.
- Scenario list handler: return minimal fields for selector hydration.

### Tests
- Repo tests: `ScenarioFilters.ScenarioIDs` honors subset; index existence.
- Handler tests: `scenario_ids` parsing and forwarding for timeline + scenario-analysis.
- Service tests: unchecked scenarios produce no impacts; `scenarios_applied` lists only applied scenario IDs.

### Notes for frontend consumption
- Inactive scenarios should still be returned for legend/UI but must not alter timeline values when unchecked.

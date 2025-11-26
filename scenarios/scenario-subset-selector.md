## Ticket: Scenario Subset Selector (multiselect + search)

- status: todo
- Blockers: frontend verification blocked until backend filter and scenario listing shape are available

### Background
Users need to compare financial timelines with only selected scenarios applied. Today, scenario merges are all-or-nothing. We need a UX that lets users quickly pick which scenarios are active, shows their icons, and keeps inactive scenarios visible but visually muted on the chart. The backend must expose scenario metadata and honor a selected-ID filter so inactive scenarios do not affect net worth calculations.

### Problem Statement
Provide a multiselect + search control to toggle scenarios on/off. Only checked scenarios should impact the timeline and scenario-analysis responses; unchecked scenarios remain visible in the legend/chart but are shaded and excluded from calculations.

### Scope & Approach
- Scenario-level filtering (not per-event) using scenario IDs.
- Update timeline and scenario-analysis APIs to accept `scenario_ids` and return which scenarios were applied.
- Deliver a reusable selector UI with overlapping scenario icons as the trigger, search-as-you-type, and checkbox rows.
- Chart/legend should show inactive scenarios in a muted style without affecting data series.

### Implementation Tickets

#### B9: Scenario filter support in timeline + analysis (Backend)
- status: todo
- Complexity: 3 points
- Requirements:
  - Extend `/api/v1/timeline?include_scenarios=true` to accept `scenario_ids` (comma-delimited) and pass through to scenario merge.
  - Extend `/api/v1/scenario-analysis` request body to accept `scenario_ids` and honor the subset in the merged response.
  - Ensure `TimelineResponse.ScenariosApplied` returns scenario IDs applied (not event IDs).
  - Add a list endpoint or field to retrieve user scenarios with `id`, `name`, `icon`, `color`, `is_included` for selector hydration.
  - Add index on `scenario_events.scenario_id` if missing.
- Acceptance Criteria:
  - [ ] Scenario subset filtering is enforced in both endpoints; unchecked IDs produce no impact.
  - [ ] `scenarios_applied` reflects only applied scenario IDs.
  - [ ] Scenario list endpoint returns icon/color/name for all user scenarios.
  - [ ] Unit tests cover filtering and applied metadata.

#### F9: Scenario selector UI and chart integration (Frontend)
- status: todo
- Complexity: 3 points
- Requirements:
  - Build a trigger showing the first three scenario icons overlapping horizontally; clicking opens a dropdown with a search box and checklist.
  - Dropdown rows: left icon, right name, checkbox to toggle. Support type-to-filter.
  - Persist selected IDs locally in view state; pass `scenario_ids` to timeline/scenario-analysis calls.
  - Unchecked scenarios remain visible in legend/net worth chart but are shaded/muted and excluded from calculations.
  - Tooltips/legend copy clarifies when scenarios are inactive.
- Acceptance Criteria:
  - [ ] Selector renders icon stack trigger, search, and checkbox list.
  - [ ] Typing filters scenarios; checking/unchecking updates selection state.
  - [ ] API calls include selected IDs; chart reflects only active scenarios’ impacts.
  - [ ] Inactive scenarios display in muted styling and show as inactive in legend/tooltips.
  - [ ] Integration test covers toggle behavior and filtered chart output.

### Dependencies & Risks
- Depends on backend delivering scenario list and subset filtering.
- Ensure icon assets/colors align with existing scenario metadata; fall back gracefully when missing.
- Avoid performance regressions when many scenarios exist (limit fetch fields, debounce search).

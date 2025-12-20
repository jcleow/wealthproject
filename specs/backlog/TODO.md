# TODO

## High Priority - UI/UX Bugs & Improvements

### P2: Growth Strategy Field Ordering and Conditional Display

**Problem:** In financial item forms, Growth Rate (%) is on the left and Growth Strategy is on the right. Growth Rate is always visible regardless of strategy selection.

**Solution:** Move Growth Strategy dropdown to the left. Only show Growth Rate input when a growth strategy other than "No Growth" is selected.

**Spec:** [testing-bugs.md](../in-progress/testing-bugs.md#p2-ui---growth-strategy-field-ordering-and-conditional-display)

---

### P2: Add Scenario Icons to Financial Items Created via Scenarios

**Problem:** Financial items created via scenario events (e.g., "starts" impact) don't show scenario icons in the financial data list. Users can't easily identify which items originated from scenarios.

**Solution:** Display scenario icons on all financial items that originated from scenario events. Make icons clickable to open the scenario modal.

**Spec:** [testing-bugs.md](../in-progress/testing-bugs.md#p2-feature---add-scenario-icons-to-financial-items-created-via-scenarios)

---

### P2: Bug - Timeline Slider Shows Future Scenarios in Past Dates

**Problem:** When moving the timeline slider backwards, future scenarios incorrectly appear as if applied in the past. Scenarios "leak" into earlier timeline positions.

**Solution:** Fix timeline service to correctly filter scenarios by the selected date. Scenarios should only appear from their occurrence date forward.

**Spec:** [testing-bugs.md](../in-progress/testing-bugs.md#p2-bug---timeline-slider-shows-future-scenarios-in-past-dates)

---

### P2: Deactivated Scenarios Should Show Grey Icon

**Problem:** Deactivating a scenario causes it to completely disappear from the chart/timeline.

**Solution:** Show a grey/muted icon for deactivated scenarios. Keep the icon clickable to re-activate or edit the scenario.

**Spec:** [testing-bugs.md](../in-progress/testing-bugs.md#p2-feature---deactivated-scenarios-should-show-grey-icon-not-disappear)

---

### P2: Add "Jump to Date" Button in Scenario Modal

**Problem:** The scenario modal shows the occurrence date but there's no way to quickly navigate the timeline to that date.

**Solution:** Add a "Go to date" button near the "Occurs On" field that navigates the timeline slider to the scenario's occurrence date.

**Spec:** [testing-bugs.md](../in-progress/testing-bugs.md#p2-feature---add-jump-to-date-button-in-scenario-modal)

---

## Technical Debt

### Compact Database Migrations

**Problem:** We have 63+ migration files that have accumulated over time. Many are small incremental changes (add column, alter constraint, etc.) that could be consolidated into clean base schemas.

**Solution:** Squash migrations into a single baseline migration per major table group, keeping only recent migrations that haven't been applied to production.

**Effort:** ~2-3 hours

**Spec:** [db-migration-compaction.md](./db-migration-compaction.md)

---

### Migrate Auth State from React Context to Zustand Store

**Problem:** Current auth uses `useSession()` hook which can re-fetch on remounts and only works inside React components.

**Solution:** Follow Rybbit's pattern - fetch session once at module load and store in Zustand.

**Effort:** ~1-2 hours

**Spec:** [auth-zustand-migration.md](./auth-zustand-migration.md)

---

### Implement OpenAPI TypeScript Codegen

**Problem:** Backend and frontend types can drift apart, causing runtime errors like `json: cannot unmarshal number into Go struct field X of type string`.

**Solution:** Generate TypeScript types from the existing `swagger.json`.

**Effort:** ~5 mins setup, 1-2 hours to migrate all API files (optional, can be gradual)

**Spec:** [api-openapi-codegen.md](./api-openapi-codegen.md)

---

### Remove Defensive Transformers After Codegen

**Problem:** `frontend/src/api/financial/transformers.ts` has mappers that check for `snake_case`, `camelCase`, AND `PascalCase` variations of every field (e.g., `item.id ?? item.ID`, `item.current_value ?? item.currentValue ?? item.CurrentValue`). This is defensive code to handle inconsistent API responses.

**Solution:** After implementing OpenAPI codegen, standardize the API response format (prefer `camelCase`) and remove the multi-case fallbacks from transformers.

**Effort:** ~1 hour (after codegen is in place)

**Depends on:** OpenAPI TypeScript Codegen

---

### Setup Pre-commit/Pre-push Hooks for Testing

**Problem:** Tests and linting are only run in CI after pushing, leading to failed builds and wasted CI minutes. Developers can accidentally push broken code.

**Solution:** Use `husky` + `lint-staged` to run tests and linting before commits/pushes.

**Effort:** ~30 mins

**Spec:** [dev-git-hooks.md](./dev-git-hooks.md)

---

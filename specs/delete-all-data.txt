# Delete-All (Financial + Property Scenario) – status: done

## Scope
- Add a top-level UI control to delete all financial data (assets, liabilities, incomes, expenses) and property planner data for the current user/session.
- Ensure the frontend uses worktree-local state and backend APIs; avoid cross-worktree coupling.

## Implementation (frontend)
- **FinancialWorkspace toolbar** (`frontend/src/components/dashboard/FinancialWorkspace.tsx`)
  - Replaced “Clear data” quick action with a confirmed “Delete all data” button.
  - Shows a spinner (`Loader2`) while clearing; blocks repeat clicks; alerts on failure.
  - Calls `deleteAllFinancialData()` (see hook) then clears property planner draft + scenario IDs from `localStorage`, and best-effort deletes the persisted scenario via API.
- **Financial data hook** (`frontend/src/hooks/useFinancialData.ts`)
  - Added `deleteAllFinancialData`:
    - Fetches current assets/incomes/liabilities/expenses.
    - Issues parallel DELETEs for each set.
    - Resets local state arrays and dispatches the existing `financial-data-refresh` event.
- **Property planner modal** (`frontend/src/components/modals/PropertyPlannerModal.tsx`)
  - Persists the created scenario ID to `localStorage` (`property_planner_scenario_id`) and restores it when reopening.
  - Helper message continues to reflect link/save state.
- **Financial API client** (`frontend/src/services/financialApi.ts`)
  - Added `deletePropertyScenario(id: string)` using `DELETE /api/v1/property-planner/scenarios/{id}` (best effort; no-op on falsy id).

## Behavior
- Clicking the trash icon prompts: “Delete all financial data and property scenarios for this user?”
- On confirm:
  1) Fetch all assets, incomes, liabilities, expenses.
  2) Issue per-item DELETEs in parallel for each list (no bulk backend endpoint exists yet).
  3) Clear local state + broadcast the existing financial-data-refresh event.
  4) Clear property planner draft + scenario ID from `localStorage`.
  5) If a scenario ID existed, best-effort `DELETE /api/v1/property-planner/scenarios/{id}` (links cascade). This does not delete assets/liabilities beyond step 2.
  6) Refresh financial data.
- If any step fails, the spinner stops and a user alert is shown; the scenario delete is best-effort (warns in console on failure).

## Testing
- Manual: open Financial Workspace → click trash (top toolbar) → confirm → verify lists empty and planner drafts cleared.
- No automated tests added; backend DELETE for scenarios assumed per API contract.

## Dependencies / Risks
- Backend must expose `DELETE /api/v1/property-planner/scenarios/{id}`; otherwise the best-effort call will no-op with a warning in console.
- Uses existing financial DELETE endpoints; respects current auth/session context.
- Local-only storage clearing (draft + scenario id) is immediate; backend deletion is best-effort.

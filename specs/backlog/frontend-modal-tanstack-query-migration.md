# Ticket: Migrate Financial Modals to TanStack Query Mutations
**Scope:** Frontend  
**Status:** todo  
**Blocks Testing For:** Frontend F11 (financial modals query integration); no backend dependency.

## Background / Problem
Modal save flows (`CpfBalanceModal`, `FinancialFormModal`, `PropertyPlannerModal`, `ScenarioEventModal`) currently hold local `submitting`/error state and call `financialApi` directly, relying on parent callbacks to refresh data. This bypasses TanStack Query’s mutation patterns and cache invalidation, increasing duplication and risk of stale data after multi-entity operations (e.g., CPF creating three assets).

## Objective
Adopt TanStack Query mutations for all modal save flows to unify loading/error handling and ensure automatic cache invalidation across financial data queries (assets, liabilities, incomes, expenses, scenarios, timeline).

## Requirements / Tasks
- Centralize query keys for financial data slices (assets, liabilities, incomes, expenses, scenarios, timeline) in a shared helper under `src/hooks` or `src/services`.
- Wrap each modal’s save logic in `useMutation`, including multi-entity creation (CPF) as a single mutation with one invalidate pass.
- On mutation success, invalidate affected query keys; remove redundant parent refetch callbacks when invalidation covers refresh. Keep `onClose` behavior intact.
- Surface errors via a consistent UX (toast or inline banner) sourced from mutation error state; avoid bespoke submit-error strings.
- Expose loading state from mutation instead of custom `submitting` booleans; ensure buttons/inputs respect disabled state.
- Preserve existing validation behavior; do not regress current form rules or visual styling.
- Add/adjust tests to cover mutation flow: success invalidates keys, errors surface to user, loading disables submit. Prefer unit tests for handlers or component tests with mocked QueryClient.

## Acceptance Criteria
- All four modals use TanStack Query `useMutation` for save flows; no custom submit flags remain.
- Query keys are defined in one place and used for invalidation; affected data refreshes after modal actions without parent plumbing.
- CPF multi-asset creation uses a single mutation and invalidates once.
- User-facing errors and loading states are consistent across modals and driven by mutation state.
- Tests updated/added to cover mutation success/error/loading behavior.

## Complexity
3 points (moderate).  

## Notes
- QueryClientProvider already exists in the app; no backend changes needed.  
- Maintain current assetra2-aligned styling; functional change only.

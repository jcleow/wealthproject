/**
 * Centralized query keys for React Query.
 * Using a namespace pattern allows invalidating all related queries at once.
 *
 * Example:
 *   queryClient.invalidateQueries({ queryKey: QUERY_KEYS.financial.all })
 *   // Invalidates all queries starting with ['financial']
 */

export const QUERY_KEYS = {
  // Financial data namespace - invalidate all with QUERY_KEYS.financial.all
  financial: {
    all: ['financial'] as const,
    assets: ['financial', 'assets'] as const,
    investments: ['financial', 'investments'] as const,
    liabilities: ['financial', 'liabilities'] as const,
    incomes: ['financial', 'incomes'] as const,
    incomeAllocations: ['financial', 'income-allocations'] as const,
    expenses: ['financial', 'expenses'] as const,
    cashAccounts: ['financial', 'cash-accounts'] as const,
    scenarioEvents: ['financial', 'scenario-events'] as const,
    timeline: ['financial', 'timeline'] as const,
    timelineV2: ['financial', 'timeline', 'v2'] as const,
    propertyLinks: ['financial', 'property-links'] as const,
    propertyScenarios: ['financial', 'property-scenarios'] as const,
    propertyPlannerV2: ['financial', 'property-planner-v2'] as const,
    fundFlowRules: ['financial', 'fund-flow-rules'] as const,
    netWorth: ['financial', 'net-worth'] as const,
    cashflow: ['financial', 'cashflow'] as const,
    growth: ['financial', 'growth'] as const,
    persons: ['financial', 'persons'] as const,
  },

  // Settings namespace
  settings: {
    all: ['settings'] as const,
    user: ['settings', 'user'] as const,
  },
} as const

// Type helpers for query keys
export type FinancialQueryKey = typeof QUERY_KEYS.financial[keyof typeof QUERY_KEYS.financial]
export type SettingsQueryKey = typeof QUERY_KEYS.settings[keyof typeof QUERY_KEYS.settings]

import { ApiError, apiClient } from '../client'
import type {
  FundFlowRule,
  FundFlowRuleCreatePayload,
  FundFlowRuleUpdatePayload,
  FundFlowRuleListFilters,
} from '@/types/fundFlowRules'

/**
 * Transform API response to FundFlowRule type
 */
function toFundFlowRule(data: Record<string, unknown>): FundFlowRule {
  return {
    id: String(data.id),
    userId: String(data.userId),
    name: String(data.name),
    ruleType: data.ruleType as FundFlowRule['ruleType'],
    sourceIncomeId: data.sourceIncomeId as string | null | undefined,
    sourceCpfAccountId: data.sourceCpfAccountId as string | null | undefined,
    sourceCashAccountId: data.sourceCashAccountId as string | null | undefined,
    sourceInvestmentId: data.sourceInvestmentId as string | null | undefined,
    targetCpfAccountId: data.targetCpfAccountId as string | null | undefined,
    targetCashAccountId: data.targetCashAccountId as string | null | undefined,
    targetInvestmentId: data.targetInvestmentId as string | null | undefined,
    targetLiabilityId: data.targetLiabilityId as string | null | undefined,
    targetPropertyId: data.targetPropertyId as string | null | undefined,
    amountType: data.amountType as FundFlowRule['amountType'],
    amountValue: data.amountValue as string | null | undefined,
    priority: Number(data.priority),
    fallbackCpfAccountId: data.fallbackCpfAccountId as string | null | undefined,
    fallbackCashAccountId: data.fallbackCashAccountId as string | null | undefined,
    fallbackInvestmentId: data.fallbackInvestmentId as string | null | undefined,
    startDate: String(data.startDate),
    endDate: data.endDate ? String(data.endDate) : null,
    createdAt: String(data.createdAt),
    updatedAt: String(data.updatedAt),
  }
}

/**
 * List fund flow rules with optional filtering and pagination
 */
export async function listFundFlowRules(
  filters?: FundFlowRuleListFilters
): Promise<FundFlowRule[]> {
  const params: Record<string, unknown> = {}
  if (filters?.ruleType) params.ruleType = filters.ruleType
  if (filters?.targetPropertyId) params.targetPropertyId = filters.targetPropertyId
  if (filters?.targetLiabilityId) params.targetLiabilityId = filters.targetLiabilityId
  if (filters?.limit !== undefined) params.limit = filters.limit
  if (filters?.offset !== undefined) params.offset = filters.offset

  const data = await apiClient.get<unknown[]>('/fund-flow-rules', params, {
    baseUrl: '/api/v2',
  })
  return data.map((item) => toFundFlowRule(item as Record<string, unknown>))
}

/**
 * Get a single fund flow rule by ID
 */
export async function getFundFlowRule(id: string): Promise<FundFlowRule> {
  const data = await apiClient.get<Record<string, unknown>>(`/fund-flow-rules/${id}`, undefined, {
    baseUrl: '/api/v2',
  })
  return toFundFlowRule(data)
}

/**
 * Create a new fund flow rule
 */
export async function createFundFlowRule(
  payload: FundFlowRuleCreatePayload
): Promise<FundFlowRule> {
  const data = await apiClient.post<Record<string, unknown>>('/fund-flow-rules', payload, {
    baseUrl: '/api/v2',
  })
  return toFundFlowRule(data)
}

/**
 * Update an existing fund flow rule
 */
export async function updateFundFlowRule(
  id: string,
  payload: FundFlowRuleUpdatePayload
): Promise<FundFlowRule> {
  const data = await apiClient.put<Record<string, unknown>>(`/fund-flow-rules/${id}`, payload, {
    baseUrl: '/api/v2',
  })
  return toFundFlowRule(data)
}

/**
 * Delete a fund flow rule
 */
export async function deleteFundFlowRule(id: string): Promise<void> {
  try {
    await apiClient.delete<void>(`/fund-flow-rules/${id}`, { baseUrl: '/api/v2' })
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) {
      return
    }
    throw error
  }
}

/**
 * Stop a fund flow rule (set end date without deleting)
 */
export async function stopFundFlowRule(id: string, endDate: string): Promise<FundFlowRule> {
  const data = await apiClient.post<Record<string, unknown>>(
    `/fund-flow-rules/${id}/stop`,
    { endDate },
    { baseUrl: '/api/v2' }
  )
  return toFundFlowRule(data)
}

/**
 * Delete all fund flow rules
 */
export async function deleteAllFundFlowRules(): Promise<void> {
  const response = await fetch('/api/v2/fund-flow-rules', { method: 'DELETE' })
  if (!response.ok && response.status !== 204) {
    const errorText = await response.text()
    throw new Error(`Failed to delete fund flow rules: ${response.status} ${errorText}`)
  }
}

/**
 * Get payment rules for a specific property
 * Convenience method for Phase 1
 */
export async function getPaymentRulesForProperty(propertyId: string): Promise<FundFlowRule[]> {
  return listFundFlowRules({
    ruleType: 'payment',
    targetPropertyId: propertyId,
  })
}

/**
 * Get payment rules for a specific liability
 * Convenience method for Phase 1
 */
export async function getPaymentRulesForLiability(liabilityId: string): Promise<FundFlowRule[]> {
  return listFundFlowRules({
    ruleType: 'payment',
    targetLiabilityId: liabilityId,
  })
}

export const fundFlowRulesApi = {
  listFundFlowRules,
  getFundFlowRule,
  createFundFlowRule,
  updateFundFlowRule,
  deleteFundFlowRule,
  stopFundFlowRule,
  deleteAllFundFlowRules,
  getPaymentRulesForProperty,
  getPaymentRulesForLiability,
}

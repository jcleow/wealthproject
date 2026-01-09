import { ApiError, apiClient } from '../client'
import type {
  FundFlowRuleDTO,
  StopFundFlowRuleDTO,
} from '@/types/api.aliases'
import type {
  FundFlowRule,
  FundFlowRuleCreatePayload,
  FundFlowRuleUpdatePayload,
  FundFlowRuleListFilters,
} from '@/types/fundFlowRules'

/**
 * Transform API response (FundFlowRuleDTO) to FundFlowRule type.
 * The generated DTO has all optional fields; we provide defaults for required ones.
 * Note: Fallback fields are defined in frontend types for Phase 2/3 but not yet in backend API.
 */
function toFundFlowRule(dto: FundFlowRuleDTO): FundFlowRule {
  return {
    id: dto.id ?? '',
    userId: dto.userId ?? '',
    name: dto.name ?? '',
    ruleType: (dto.ruleType as FundFlowRule['ruleType']) ?? 'payment',
    sourceIncomeId: dto.sourceIncomeId,
    sourceCpfAccountId: dto.sourceCpfAccountId,
    sourceCashAccountId: dto.sourceCashAccountId,
    sourceInvestmentId: dto.sourceInvestmentId,
    targetCpfAccountId: dto.targetCpfAccountId,
    targetCashAccountId: dto.targetCashAccountId,
    targetInvestmentId: dto.targetInvestmentId,
    targetLiabilityId: dto.targetLiabilityId,
    targetPropertyId: dto.targetPropertyId,
    amountType: (dto.amountType as FundFlowRule['amountType']) ?? 'fixed',
    amountValue: dto.amountValue,
    priority: dto.priority ?? 0,
    // Fallback fields - not yet implemented in backend API (Phase 2/3)
    fallbackCpfAccountId: undefined,
    fallbackCashAccountId: undefined,
    fallbackInvestmentId: undefined,
    startDate: dto.startDate ?? new Date().toISOString(),
    endDate: dto.endDate ?? null,
    createdAt: dto.createdAt ?? new Date().toISOString(),
    updatedAt: dto.updatedAt ?? new Date().toISOString(),
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

  const data = await apiClient.get<FundFlowRuleDTO[]>('/fund-flow-rules', params, {
    baseUrl: '/api/v2',
  })
  return data.map(toFundFlowRule)
}

/**
 * Get a single fund flow rule by ID
 */
export async function getFundFlowRule(id: string): Promise<FundFlowRule> {
  const data = await apiClient.get<FundFlowRuleDTO>(`/fund-flow-rules/${id}`, undefined, {
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
  const data = await apiClient.post<FundFlowRuleDTO>('/fund-flow-rules', payload, {
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
  const data = await apiClient.put<FundFlowRuleDTO>(`/fund-flow-rules/${id}`, payload, {
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
  const body: StopFundFlowRuleDTO = { endDate }
  const data = await apiClient.post<FundFlowRuleDTO>(
    `/fund-flow-rules/${id}/stop`,
    body,
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

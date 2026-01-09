import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

import { useApiAssumptions } from './useApiAssumptions'
import type { CPFAssumptionsResponse } from '@/types/cpf'
import { DEFAULT_CPF_ASSUMPTIONS } from '@/types/cpf'

// Mock the cpfApi module
vi.mock('@/api/financial/cpf', () => ({
  cpfApi: {
    getCPFAssumptions: vi.fn(),
    updateCPFAssumptions: vi.fn(),
  },
}))

// Import after mock to get the mocked version
import { cpfApi } from '@/api/financial/cpf'

// Mock API response with official defaults
const mockApiResponse: CPFAssumptionsResponse = {
  id: 'assumption-123',
  cpfAccountId: 'cpf-account-456',
  interestRates: {
    oa: '0.025',
    sa: '0.04',
    ma: '0.04',
    ra: '0.04',
    extraFirst60K: '0.01',
    extraFirst30KAbove55: '0.01',
  },
  growthRates: {
    frs: '0.035',
  },
  employment: {
    retirementAge: 65,
  },
  cpfLife: {
    plan: 'standard',
    payoutStartAge: 65,
    escalatingGrowth: '0.02',
  },
  presetName: 'official',
}

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  })

  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children)
}

describe('useApiAssumptions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('initial state', () => {
    it('returns default assumptions when no cpfAccountId provided', () => {
      const { result } = renderHook(
        () => useApiAssumptions({ cpfAccountId: undefined }),
        { wrapper: createWrapper() }
      )

      expect(result.current.assumptions).toEqual(DEFAULT_CPF_ASSUMPTIONS)
    })

    it('returns loading state while fetching', () => {
      // Setup a pending promise that never resolves
      vi.mocked(cpfApi.getCPFAssumptions).mockReturnValue(new Promise(() => {}))

      const { result } = renderHook(
        () => useApiAssumptions({ cpfAccountId: 'test-account' }),
        { wrapper: createWrapper() }
      )

      expect(result.current.isLoading).toBe(true)
    })
  })

  describe('API data conversion', () => {
    it('converts API response to local format correctly', async () => {
      vi.mocked(cpfApi.getCPFAssumptions).mockResolvedValue(mockApiResponse)

      const { result } = renderHook(
        () => useApiAssumptions({ cpfAccountId: 'test-account' }),
        { wrapper: createWrapper() }
      )

      await waitFor(() => expect(result.current.isLoading).toBe(false))

      // Check interest rates converted from strings to numbers
      expect(result.current.assumptions.interestRates.oa).toBe(0.025)
      expect(result.current.assumptions.interestRates.sa).toBe(0.04)
      expect(result.current.assumptions.interestRates.ma).toBe(0.04)
      expect(result.current.assumptions.interestRates.ra).toBe(0.04)
      expect(result.current.assumptions.interestRates.extraFirst60k).toBe(0.01)
      expect(result.current.assumptions.interestRates.extraFirst30kAbove55).toBe(0.01)

      // Check growth rates
      expect(result.current.assumptions.frsGrowthRate).toBe(0.035)

      // Check global assumptions (hardcoded)
      expect(result.current.assumptions.inflationRate).toBe(0.02)
      expect(result.current.assumptions.salaryGrowthRate).toBe(0.03)
      expect(result.current.assumptions.assumeContinuousEmployment).toBe(true)

      // Check employment
      expect(result.current.assumptions.retirementAge).toBe(65)

      // Check CPF LIFE
      expect(result.current.assumptions.cpfLifePlan).toBe('standard')
      expect(result.current.assumptions.payoutStartAge).toBe(65)
      expect(result.current.assumptions.escalatingPlanGrowth).toBe(0.02)

      // Check preset
      expect(result.current.presetName).toBe('official')
    })
  })

  describe('saving assumptions', () => {
    it('updates preset to custom when assumptions change', async () => {
      vi.mocked(cpfApi.getCPFAssumptions).mockResolvedValue(mockApiResponse)

      const { result } = renderHook(
        () => useApiAssumptions({ cpfAccountId: 'test-account' }),
        { wrapper: createWrapper() }
      )

      await waitFor(() => expect(result.current.isLoading).toBe(false))
      expect(result.current.presetName).toBe('official')

      // Update assumptions
      act(() => {
        result.current.setAssumptions({
          ...result.current.assumptions,
          retirementAge: 67,
        })
      })

      expect(result.current.presetName).toBe('custom')
    })

    it('calls onAssumptionsChange callback when assumptions update', async () => {
      const onChangeMock = vi.fn()
      vi.mocked(cpfApi.getCPFAssumptions).mockResolvedValue(mockApiResponse)

      const { result } = renderHook(
        () =>
          useApiAssumptions({
            cpfAccountId: 'test-account',
            onAssumptionsChange: onChangeMock,
          }),
        { wrapper: createWrapper() }
      )

      await waitFor(() => expect(result.current.isLoading).toBe(false))

      // Called once when initial data loaded
      expect(onChangeMock).toHaveBeenCalled()
      onChangeMock.mockClear()

      // Update assumptions
      act(() => {
        result.current.setAssumptions({
          ...result.current.assumptions,
          retirementAge: 67,
        })
      })

      // Called again when assumptions changed
      expect(onChangeMock).toHaveBeenCalledTimes(1)
      expect(onChangeMock).toHaveBeenCalledWith(
        expect.objectContaining({ retirementAge: 67 })
      )
    })

    it('sends save request with immediate debounce', async () => {
      vi.mocked(cpfApi.getCPFAssumptions).mockResolvedValue(mockApiResponse)
      vi.mocked(cpfApi.updateCPFAssumptions).mockResolvedValue(mockApiResponse)

      const { result } = renderHook(
        () => useApiAssumptions({ cpfAccountId: 'test-account', saveDebounceMs: 0 }),
        { wrapper: createWrapper() }
      )

      await waitFor(() => expect(result.current.isLoading).toBe(false))

      // Update assumptions
      act(() => {
        result.current.setAssumptions({
          ...result.current.assumptions,
          retirementAge: 67,
        })
      })

      await waitFor(() => expect(cpfApi.updateCPFAssumptions).toHaveBeenCalled())

      // Verify the payload format
      expect(cpfApi.updateCPFAssumptions).toHaveBeenCalledWith('test-account', {
        interestRates: {
          oa: '0.025',
          sa: '0.04',
          ma: '0.04',
          ra: '0.04',
          extraFirst60K: '0.01',
          extraFirst30KAbove55: '0.01',
        },
        growthRates: {
          frs: '0.035',
        },
        employment: {
          retirementAge: 67,
        },
        cpfLife: {
          plan: 'standard',
          payoutStartAge: 65,
          escalatingGrowth: '0.02',
        },
        presetName: 'custom',
      })
    })
  })

  describe('error handling', () => {
    it('exposes fetch error', async () => {
      const errorMessage = 'Not found'
      vi.mocked(cpfApi.getCPFAssumptions).mockRejectedValue(new Error(errorMessage))

      const { result } = renderHook(
        () => useApiAssumptions({ cpfAccountId: 'nonexistent-account' }),
        { wrapper: createWrapper() }
      )

      await waitFor(() => expect(result.current.error).not.toBeNull())
      expect(result.current.error?.message).toBe(errorMessage)
    })
  })

  describe('global assumptions (hardcoded values)', () => {
    it('returns hardcoded values for global assumptions not stored in CPF assumptions', async () => {
      vi.mocked(cpfApi.getCPFAssumptions).mockResolvedValue(mockApiResponse)

      const { result } = renderHook(
        () => useApiAssumptions({ cpfAccountId: 'test-account' }),
        { wrapper: createWrapper() }
      )

      await waitFor(() => expect(result.current.isLoading).toBe(false))

      // These are global assumptions, not stored in CPF assumptions
      expect(result.current.assumptions.inflationRate).toBe(0.02)
      expect(result.current.assumptions.salaryGrowthRate).toBe(0.03)
      expect(result.current.assumptions.assumeContinuousEmployment).toBe(true)
    })
  })
})

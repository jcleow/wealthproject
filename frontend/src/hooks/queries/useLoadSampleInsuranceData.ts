import { useMutation, useQueryClient } from '@tanstack/react-query'
import { insuranceApi } from '@/api/financial'
import type { InsurancePolicyCreateInput, InsurancePolicyRecord } from '@/api/financial/insurance'
import { INSURANCE_POLICIES_QUERY_KEY } from './useInsurancePoliciesQuery'
import type { Person } from '@/types/person'
import { PERSONS_QUERY_KEY } from './usePersonsQuery'

// ─────────────────────────────────────────────────────────────────────────────
// Young Family Scenario: Couple (early 30s) with 1 child
// Realistic Singapore insurance portfolio with common providers & products
// ─────────────────────────────────────────────────────────────────────────────

interface SamplePolicyConfig extends Omit<InsurancePolicyCreateInput, 'personId'> {
  /** 0 = primary person, 1 = spouse, 2 = child, etc. */
  personIndex: number
}

function generateYoungFamilySamplePolicies(): SamplePolicyConfig[] {
  const today = new Date()
  const oneYearAgo = new Date(today)
  oneYearAgo.setFullYear(today.getFullYear() - 1)
  const twoYearsAgo = new Date(today)
  twoYearsAgo.setFullYear(today.getFullYear() - 2)
  const threeYearsAgo = new Date(today)
  threeYearsAgo.setFullYear(today.getFullYear() - 3)

  const formatDate = (date: Date) => date.toISOString().split('T')[0]

  return [
    // ── Primary Person (Husband) ────────────────────────────────────────
    {
      personIndex: 0,
      name: 'AIA Pro Lifetime Protector',
      category: 'life',
      subcategory: 'whole_life',
      coverageAmount: '400000',
      deathBenefit: '400000',
      tpdBenefit: '400000',
      criticalIllnessBenefit: '100000',
      premiumAmount: '280',
      premiumFrequency: 'monthly',
      startDate: formatDate(threeYearsAgo),
      insurerName: 'AIA',
      policyNumber: 'L1034-5521',
      isActive: true,
      notes: JSON.stringify({
        userNotes: 'Primary breadwinner protection. Covers mortgage + 5 years expenses.',
      }),
    },
    {
      personIndex: 0,
      name: 'Prudential PRUShield Plus',
      category: 'hospitalization',
      subcategory: 'isp',
      coverageAmount: '1000000',
      premiumAmount: '45',
      premiumFrequency: 'monthly',
      startDate: formatDate(twoYearsAgo),
      insurerName: 'Prudential',
      policyNumber: 'H2201-8839',
      isActive: true,
      notes: JSON.stringify({
        wardClass: 'A',
        ispRider: true,
        deductible: '$1,500',
        userNotes: 'ISP rider covers deductible and co-insurance. Private ward class.',
      }),
    },
    {
      personIndex: 0,
      name: 'AIA CI Secure',
      category: 'critical_illness',
      subcategory: 'early_ci',
      coverageAmount: '200000',
      criticalIllnessBenefit: '200000',
      premiumAmount: '155',
      premiumFrequency: 'monthly',
      startDate: formatDate(twoYearsAgo),
      insurerName: 'AIA',
      policyNumber: 'CI3387-4412',
      isActive: true,
      notes: JSON.stringify({
        earlyCiCoverage: true,
        userNotes: 'Early CI payout of 50% ($100k). Covers 2-3 years income replacement.',
      }),
    },
    {
      personIndex: 0,
      name: 'NTUC PA Secure',
      category: 'accident',
      subcategory: 'pa',
      coverageAmount: '200000',
      dailyHospitalCash: '100',
      premiumAmount: '18',
      premiumFrequency: 'monthly',
      startDate: formatDate(oneYearAgo),
      insurerName: 'NTUC Income',
      policyNumber: 'PA8821-0093',
      isActive: true,
      notes: JSON.stringify({
        medicalExpenses: 10000,
        userNotes: 'Accident coverage with $100/day hospital cash benefit.',
      }),
    },

    // ── Spouse (Wife) ───────────────────────────────────────────────────
    {
      personIndex: 1,
      name: 'Great Eastern GREAT Life Advantage',
      category: 'life',
      subcategory: 'term_life',
      coverageAmount: '250000',
      deathBenefit: '250000',
      tpdBenefit: '250000',
      premiumAmount: '42',
      premiumFrequency: 'monthly',
      startDate: formatDate(oneYearAgo),
      endDate: formatDate(new Date(today.getFullYear() + 19, today.getMonth(), today.getDate())),
      insurerName: 'Great Eastern',
      policyNumber: 'TL9012-6678',
      isActive: true,
      notes: JSON.stringify({
        userNotes: 'Term life until child finishes university. Cost-efficient coverage.',
      }),
    },
    {
      personIndex: 1,
      name: 'AIA HealthShield Gold Max',
      category: 'hospitalization',
      subcategory: 'isp',
      coverageAmount: '1000000',
      premiumAmount: '38',
      premiumFrequency: 'monthly',
      startDate: formatDate(twoYearsAgo),
      insurerName: 'AIA',
      policyNumber: 'H5501-2233',
      isActive: true,
      notes: JSON.stringify({
        wardClass: 'A',
        ispRider: true,
        deductible: '$1,500',
        userNotes: 'Upgraded from MediShield Life. Full private hospital coverage.',
      }),
    },
    {
      personIndex: 1,
      name: 'FWD Early Critical Illness',
      category: 'critical_illness',
      subcategory: 'early_ci',
      coverageAmount: '150000',
      criticalIllnessBenefit: '150000',
      premiumAmount: '98',
      premiumFrequency: 'monthly',
      startDate: formatDate(oneYearAgo),
      insurerName: 'FWD',
      policyNumber: 'CI7782-3301',
      isActive: true,
      notes: JSON.stringify({
        earlyCiCoverage: true,
        userNotes: 'Standalone early CI plan. Covers income gap during treatment & recovery.',
      }),
    },

    // ── Child ───────────────────────────────────────────────────────────
    {
      personIndex: 2,
      name: 'Prudential PRUShield Junior',
      category: 'hospitalization',
      subcategory: 'isp',
      coverageAmount: '500000',
      premiumAmount: '22',
      premiumFrequency: 'monthly',
      startDate: formatDate(oneYearAgo),
      insurerName: 'Prudential',
      policyNumber: 'HJ1100-4455',
      isActive: true,
      notes: JSON.stringify({
        wardClass: 'B1',
        ispRider: true,
        userNotes: 'Child hospitalization plan. Ward B1 with rider.',
      }),
    },
  ]
}

/**
 * Mutation hook that loads a realistic "Young Family" insurance portfolio.
 *
 * It first clears any existing policies, then creates ~8 sample policies
 * linked to existing persons in the system (by index: 0=primary, 1=spouse, 2=child).
 *
 * If fewer persons exist than referenced, those policies are created without
 * a personId (they'll show as unlinked).
 */
export function useLoadSampleInsuranceData() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async () => {
      // 1. Get existing persons to link policies
      const personsData = queryClient.getQueryData<Person[]>(PERSONS_QUERY_KEY) ?? []
      console.debug('[loadSampleInsurance] Found persons:', personsData.map(p => ({ id: p.id, name: p.name })))

      // 2. Clear existing insurance policies
      try {
        await insuranceApi.deleteAllInsurancePolicies()
        console.debug('[loadSampleInsurance] Cleared existing policies')
      } catch (deleteError) {
        console.warn('[loadSampleInsurance] Failed to clear policies (may not exist yet):', deleteError)
      }

      // 3. Generate sample policies
      const samplePolicies = generateYoungFamilySamplePolicies()

      // 4. Create each policy, linking to persons by index
      const createdPolicies: InsurancePolicyRecord[] = []
      for (const policyConfig of samplePolicies) {
        const { personIndex, ...policyPayload } = policyConfig
        const linkedPerson = personsData[personIndex]

        try {
          const createdPolicy = await insuranceApi.createInsurancePolicy({
            ...policyPayload,
            personId: linkedPerson?.id,
          })
          createdPolicies.push(createdPolicy)
          console.debug(
            '[loadSampleInsurance] Created:',
            createdPolicy.name,
            linkedPerson ? `(linked to ${linkedPerson.name})` : '(unlinked)'
          )
        } catch (createError) {
          console.error('[loadSampleInsurance] Failed to create policy:', policyConfig.name, createError)
        }
      }

      return createdPolicies
    },
    onSuccess: (createdPolicies) => {
      // Update React Query cache directly for instant UI refresh
      queryClient.setQueryData<InsurancePolicyRecord[]>(
        INSURANCE_POLICIES_QUERY_KEY,
        createdPolicies
      )
      // Also invalidate to ensure fresh data from server
      queryClient.invalidateQueries({ queryKey: INSURANCE_POLICIES_QUERY_KEY })
    },
  })
}

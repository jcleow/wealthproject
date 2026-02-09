import { useMutation, useQueryClient } from '@tanstack/react-query'
import { insuranceApi, personsApi } from '@/api/financial'
import type { InsurancePolicyCreateInput, InsurancePolicyRecord } from '@/api/financial/insurance'
import { INSURANCE_POLICIES_QUERY_KEY } from './useInsurancePoliciesQuery'
import type { Person, PersonCreatePayload } from '@/types/person'
import { PERSONS_QUERY_KEY } from './usePersonsQuery'

// ─────────────────────────────────────────────────────────────────────────────
// Young Family Scenario: Couple (early 30s) with 2 young children
// Realistic Singapore insurance portfolio with common providers & products
// ─────────────────────────────────────────────────────────────────────────────

interface SamplePersonConfig extends PersonCreatePayload {
  /** Index used to link policies to this person */
  index: number
}

function generateSamplePersons(): SamplePersonConfig[] {
  return [
    {
      index: 0,
      name: 'James Tan',
      dateOfBirth: '1993-05-14',
      gender: 'male',
      residencyStatus: 'citizen',
      relationship: 'self',
      displayColor: '#3b82f6',
    },
    {
      index: 1,
      name: 'Sarah Tan',
      dateOfBirth: '1995-08-22',
      gender: 'female',
      residencyStatus: 'citizen',
      relationship: 'spouse',
      displayColor: '#ec4899',
    },
    {
      index: 2,
      name: 'Ethan Tan',
      dateOfBirth: '2021-03-10',
      gender: 'male',
      residencyStatus: 'citizen',
      relationship: 'child',
      displayColor: '#f59e0b',
    },
    {
      index: 3,
      name: 'Chloe Tan',
      dateOfBirth: '2023-11-28',
      gender: 'female',
      residencyStatus: 'citizen',
      relationship: 'child',
      displayColor: '#8b5cf6',
    },
  ]
}

interface SamplePolicyConfig extends Omit<InsurancePolicyCreateInput, 'personId'> {
  /** 0 = James, 1 = Sarah, 2 = Ethan, 3 = Chloe */
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
    // ── James Tan (Husband, primary earner) ──────────────────────────────
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

    // ── Sarah Tan (Wife) ─────────────────────────────────────────────────
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
        userNotes: 'Term life until children finish university. Cost-efficient coverage.',
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

    // ── Ethan Tan (Son, 3 yrs old) ──────────────────────────────────────
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

    // ── Chloe Tan (Daughter, 1 yr old) ───────────────────────────────────
    {
      personIndex: 3,
      name: 'Great Eastern Supreme Health Junior',
      category: 'hospitalization',
      subcategory: 'isp',
      coverageAmount: '500000',
      premiumAmount: '18',
      premiumFrequency: 'monthly',
      startDate: formatDate(oneYearAgo),
      insurerName: 'Great Eastern',
      policyNumber: 'HJ2200-7891',
      isActive: true,
      notes: JSON.stringify({
        wardClass: 'B1',
        ispRider: true,
        userNotes: 'Basic hospitalization for youngest. Ward B1 coverage.',
      }),
    },
  ]
}

/**
 * Mutation hook that loads a realistic "Young Family" insurance portfolio.
 *
 * Creates 4 sample persons (James, Sarah, Ethan, Chloe) and ~9 policies
 * linked to them. Clears existing persons and policies first.
 */
export function useLoadSampleInsuranceData() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async () => {
      // 1. Clear existing insurance policies
      try {
        await insuranceApi.deleteAllInsurancePolicies()
      } catch (deleteError) {
        console.warn('[loadSample] Failed to clear policies:', deleteError)
      }

      // 2. Clear existing persons
      const existingPersons = queryClient.getQueryData<Person[]>(PERSONS_QUERY_KEY) ?? []
      for (const person of existingPersons) {
        try {
          await personsApi.deletePerson(person.id)
        } catch (deleteError) {
          console.warn('[loadSample] Failed to delete person:', person.name, deleteError)
        }
      }

      // 3. Create sample persons
      const samplePersonConfigs = generateSamplePersons()
      const createdPersons: Person[] = []

      for (const personConfig of samplePersonConfigs) {
        const { index: _index, ...personPayload } = personConfig
        try {
          const createdPerson = await personsApi.createPerson(personPayload)
          createdPersons.push(createdPerson)
        } catch (createError) {
          console.error('[loadSample] Failed to create person:', personConfig.name, createError)
        }
      }

      // Update persons cache immediately
      queryClient.setQueryData<Person[]>(PERSONS_QUERY_KEY, createdPersons)

      // 4. Create sample policies linked to new persons
      const samplePolicies = generateYoungFamilySamplePolicies()
      const createdPolicies: InsurancePolicyRecord[] = []

      for (const policyConfig of samplePolicies) {
        const { personIndex, ...policyPayload } = policyConfig
        const linkedPerson = createdPersons[personIndex]

        try {
          const createdPolicy = await insuranceApi.createInsurancePolicy({
            ...policyPayload,
            personId: linkedPerson?.id,
          })
          createdPolicies.push(createdPolicy)
        } catch (createError) {
          console.error('[loadSample] Failed to create policy:', policyConfig.name, createError)
        }
      }

      return createdPolicies
    },
    onSuccess: (createdPolicies) => {
      queryClient.setQueryData<InsurancePolicyRecord[]>(
        INSURANCE_POLICIES_QUERY_KEY,
        createdPolicies
      )
      queryClient.invalidateQueries({ queryKey: INSURANCE_POLICIES_QUERY_KEY })
      queryClient.invalidateQueries({ queryKey: PERSONS_QUERY_KEY })
    },
  })
}

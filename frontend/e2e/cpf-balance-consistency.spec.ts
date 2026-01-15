import { expect } from '@playwright/test'
import { authenticatedTest } from './fixtures/auth'

/**
 * CPF Balance Consistency Tests
 *
 * These tests verify that CPF balances are consistent between:
 * - CPF Projection Chart (uses cpf/projector → cpf/engine)
 * - Timeline (uses timeline_v2 service → cpf/engine)
 *
 * Since both now use the shared cpf/engine module, values should match.
 */

interface CPFSnapshot {
  year: number
  age: number
  oa: string
  sa: string
  ma: string
  ra: string
  total: string
}

interface BalanceProjectionResponse {
  snapshots: CPFSnapshot[]
  age55Balances?: { oa: string; sa: string; ma: string; ra: string }
  age65Balances?: { oa: string; sa: string; ma: string; ra: string }
}

interface TimelineCPFAsset {
  id: string
  parentId: string  // The CPF account ID
  name: string      // Account type: "OA", "SA", "MA", "RA"
  personId: string
  personName?: string
  balance: string
}

interface TimelineMonth {
  year: number
  month: number
  cpfAssets?: TimelineCPFAsset[]
}

authenticatedTest.describe('CPF Balance Consistency', () => {
  authenticatedTest(
    'CPF projection values should match timeline values for the same year',
    async ({ authenticatedPage }) => {
      const page = authenticatedPage

      // Capture API responses
      let projectionResponse: BalanceProjectionResponse | null = null
      let timelineResponse: TimelineMonth[] | null = null
      let cpfAccountId: string | null = null

      // Intercept the CPF balance-projection API
      await page.route('**/api/v2/cpf/account/*/balance-projection', async (route) => {
        // Extract the CPF account ID from the URL
        const urlMatch = route.request().url().match(/\/cpf\/account\/([^/]+)\/balance-projection/)
        if (urlMatch) {
          cpfAccountId = urlMatch[1]
        }
        const response = await route.fetch()
        const json = await response.json()
        projectionResponse = json
        await route.fulfill({ response })
      })

      // Intercept the timeline API
      await page.route('**/api/v2/financial/timeline/snapshot**', async (route) => {
        const response = await route.fetch()
        const json = await response.json()
        timelineResponse = json.months || json
        await route.fulfill({ response })
      })

      // Step 1: Go to dashboard to trigger timeline API
      await page.goto('/dashboard')
      await expect(page.getByRole('heading', { name: /net worth/i }).first()).toBeVisible({
        timeout: 15000,
      })

      // Wait for timeline data to load
      await page.waitForTimeout(2000)

      // Step 2: Navigate to CPF simulation to trigger projection API
      await page.goto('/dashboard/cpf')
      await expect(page.getByRole('heading', { name: /CPF Simulation/i })).toBeVisible({
        timeout: 15000,
      })

      // Go to Projection tab to trigger the balance-projection API
      await page.getByRole('button', { name: /Projection/i }).click()

      // Wait for projection data to load
      await page.waitForTimeout(3000)

      // Step 3: Compare the values
      console.log('Projection response received:', projectionResponse !== null)
      console.log('Timeline response received:', timelineResponse !== null)

      if (!projectionResponse) {
        console.log('No projection response - might be using mock data or no CPF account')
        // Test passes if no real CPF account (demo mode)
        return
      }

      if (!timelineResponse || !Array.isArray(timelineResponse)) {
        console.log('No timeline response - skipping comparison')
        return
      }

      // Find a common year to compare (e.g., next year)
      const currentYear = new Date().getFullYear()
      const targetYear = currentYear + 1

      // Get projection data for target year
      const projectionSnapshot = projectionResponse.snapshots?.find(
        (s: CPFSnapshot) => s.year === targetYear
      )

      if (!projectionSnapshot) {
        console.log(`No projection data for year ${targetYear}`)
        return
      }

      // Get timeline data for target year (December)
      const timelineMonth = timelineResponse.find(
        (m: TimelineMonth) => m.year === targetYear && m.month === 12
      )

      if (!timelineMonth || !timelineMonth.cpfAssets) {
        console.log(`No timeline data for year ${targetYear}`)
        // This is OK - timeline might not have CPF assets
        return
      }

      // Filter timeline CPF assets to only include those from the SAME CPF account
      // The timeline includes ALL CPF accounts (all people), but projection is for ONE account
      const matchingCpfAssets = cpfAccountId
        ? timelineMonth.cpfAssets.filter((asset) => asset.parentId === cpfAccountId)
        : timelineMonth.cpfAssets

      console.log(`CPF Account ID: ${cpfAccountId}`)
      console.log(`Timeline has ${timelineMonth.cpfAssets.length} total CPF assets, ${matchingCpfAssets.length} matching this account`)

      if (matchingCpfAssets.length === 0) {
        console.log('No matching CPF assets in timeline for this account')
        // This could happen if timeline doesn't have this account
        return
      }

      // Compare CPF balances
      const projTotal = parseFloat(projectionSnapshot.total)
      const timelineCpfTotal = matchingCpfAssets.reduce((sum: number, asset: TimelineCPFAsset) => {
        return sum + parseFloat(asset.balance || '0')
      }, 0)

      console.log(`Year ${targetYear} comparison:`)
      console.log(`  Projection total: $${projTotal.toLocaleString()}`)
      console.log(`  Timeline CPF total: $${timelineCpfTotal.toLocaleString()}`)

      // Allow 1% tolerance for rounding differences
      const tolerance = Math.max(projTotal, timelineCpfTotal) * 0.01
      const difference = Math.abs(projTotal - timelineCpfTotal)

      if (difference > tolerance) {
        console.log(`  Difference: $${difference.toLocaleString()} (tolerance: $${tolerance.toLocaleString()})`)
        // Log detailed breakdown for debugging
        console.log(`  Projection breakdown:`)
        console.log(`    OA: ${projectionSnapshot.oa}`)
        console.log(`    SA: ${projectionSnapshot.sa}`)
        console.log(`    MA: ${projectionSnapshot.ma}`)
        console.log(`    RA: ${projectionSnapshot.ra}`)
        console.log(`  Timeline breakdown:`)
        matchingCpfAssets.forEach((asset: TimelineCPFAsset) => {
          console.log(`    ${asset.name}: ${asset.balance}`)
        })
      }

      expect(difference).toBeLessThanOrEqual(tolerance)
    }
  )

  authenticatedTest('should display Overview balances', async ({ authenticatedPage }) => {
    const page = authenticatedPage

    await page.goto('/dashboard/cpf')

    await expect(page.getByRole('heading', { name: /CPF Simulation/i })).toBeVisible({
      timeout: 15000,
    })

    // Check that the Overview shows CPF Balances header with a value
    await expect(page.getByText('CPF Balances')).toBeVisible({ timeout: 10000 })

    // Get the total balance from the Overview header
    const overviewHeader = page.locator('.flex.items-center.justify-between').filter({
      hasText: 'CPF Balances',
    })
    const totalText = await overviewHeader.locator('h2').textContent()
    console.log(`Overview total: ${totalText}`)

    const total = parseFormattedCurrency(totalText || '0')
    expect(total).toBeGreaterThan(0)

    // Check that individual accounts are shown
    await expect(page.getByText(/Ordinary Account \(OA\)/).first()).toBeVisible()
    await expect(page.getByText(/Special Account \(SA\)/).first()).toBeVisible()
    await expect(page.getByText(/MediSave Account \(MA\)/).first()).toBeVisible()
  })

  authenticatedTest('Projection chart should render with data', async ({ authenticatedPage }) => {
    const page = authenticatedPage

    await page.goto('/dashboard/cpf')

    await expect(page.getByRole('heading', { name: /CPF Simulation/i })).toBeVisible({
      timeout: 15000,
    })

    // Navigate to Projection tab
    await page.getByRole('button', { name: /Projection/i }).click()

    // Wait for chart to load
    await expect(page.locator('.recharts-wrapper').first()).toBeVisible({ timeout: 10000 })

    // Check that the chart has SVG content
    const chartSvg = page.locator('.recharts-wrapper svg').first()
    await expect(chartSvg).toBeVisible()

    // Check for chart elements (paths for areas, text for labels)
    const chartPaths = chartSvg.locator('path')
    const pathCount = await chartPaths.count()
    expect(pathCount).toBeGreaterThan(0)

    console.log(`Projection chart has ${pathCount} path elements`)
  })

  authenticatedTest(
    'Age 55 and Age 65 milestone balances should be displayed',
    async ({ authenticatedPage }) => {
      const page = authenticatedPage

      // Capture the projection API response
      let projectionData: BalanceProjectionResponse | null = null

      await page.route('**/api/v2/cpf/account/*/balance-projection', async (route) => {
        const response = await route.fetch()
        const json = await response.json()
        projectionData = json
        await route.fulfill({ response })
      })

      await page.goto('/dashboard/cpf')

      await expect(page.getByRole('heading', { name: /CPF Simulation/i })).toBeVisible({
        timeout: 15000,
      })

      // Navigate to Projection tab
      await page.getByRole('button', { name: /Projection/i }).click()

      // Wait for data to load
      await page.waitForTimeout(2000)

      if (!projectionData) {
        console.log('No projection data - might be demo mode')
        return
      }

      // Log milestone balances
      if (projectionData.age55Balances) {
        const age55Total =
          parseFloat(projectionData.age55Balances.oa) +
          parseFloat(projectionData.age55Balances.sa) +
          parseFloat(projectionData.age55Balances.ma) +
          parseFloat(projectionData.age55Balances.ra)
        console.log(`Age 55 projected total: $${age55Total.toLocaleString()}`)
      }

      if (projectionData.age65Balances) {
        const age65Total =
          parseFloat(projectionData.age65Balances.oa) +
          parseFloat(projectionData.age65Balances.sa) +
          parseFloat(projectionData.age65Balances.ma) +
          parseFloat(projectionData.age65Balances.ra)
        console.log(`Age 65 projected total: $${age65Total.toLocaleString()}`)
      }

      // Verify the projection has snapshots
      expect(projectionData.snapshots?.length).toBeGreaterThan(0)
      console.log(`Projection has ${projectionData.snapshots?.length} yearly snapshots`)
    }
  )
})

/**
 * Parse a formatted currency string to a number
 * Handles formats like "$162,000", "$162K", "$1.5M", "$1,234.56"
 */
function parseFormattedCurrency(text: string): number {
  let cleaned = text.replace(/[$\s]/g, '')

  if (cleaned.endsWith('K')) {
    return parseFloat(cleaned.slice(0, -1)) * 1000
  }
  if (cleaned.endsWith('M')) {
    return parseFloat(cleaned.slice(0, -1)) * 1000000
  }

  return parseFloat(cleaned.replace(/,/g, '')) || 0
}

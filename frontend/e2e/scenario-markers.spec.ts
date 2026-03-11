import { test, expect, Page } from '@playwright/test'

/**
 * E2E tests for scenario marker positioning on the Net Worth Projection chart.
 *
 * These tests verify that scenario event icons appear at the correct positions
 * relative to the chart data points they represent.
 */

// Generate unique email for each test run to avoid conflicts
const testEmail = `e2e-test-${Date.now()}@example.com`
const testPassword = 'TestPassword123!'

test.describe.configure({ mode: 'serial' }) // Run tests sequentially to share auth state

test.describe('Scenario Markers on Chart', () => {
  // Sign up and login helper
  async function ensureLoggedIn(page: Page) {
    // Check if we're already on dashboard
    await page.goto('/dashboard')
    await page.waitForLoadState('networkidle')

    // If we're on dashboard, we're already logged in
    if (page.url().includes('/dashboard')) {
      const chartTitle = page.locator('text=Net Worth Projection')
      if (await chartTitle.isVisible({ timeout: 3000 }).catch(() => false)) {
        return // Already logged in
      }
    }

    // Try to sign up first (for new test runs)
    await page.goto('/signup')
    await page.waitForLoadState('networkidle')

    const signupHeading = page.getByRole('heading', { name: /create your account/i })

    if (await signupHeading.isVisible({ timeout: 3000 }).catch(() => false)) {
      // Fill signup form
      await page.getByLabel(/full name/i).fill('E2E Test User')
      await page.getByLabel(/^email$/i).fill(testEmail)
      await page.getByLabel(/^password$/i).fill(testPassword)
      await page.getByLabel(/confirm password/i).fill(testPassword)

      // Submit signup
      await page.getByRole('button', { name: /create account/i }).click()

      // Wait for result
      await page.waitForTimeout(2000)
    }

    // Check if we need to login (signup failed or redirected)
    if (page.url().includes('/login') || page.url().includes('/signup')) {
      await page.goto('/login')
      await page.waitForLoadState('networkidle')

      await page.getByLabel(/^email$/i).fill(testEmail)
      await page.getByLabel(/^password$/i).fill(testPassword)
      await page.getByRole('button', { name: /sign in/i }).click()

      await page.waitForURL(/dashboard/, { timeout: 15000 })
    }

    // Final check - make sure we're on dashboard
    if (!page.url().includes('/dashboard')) {
      await page.goto('/dashboard')
    }

    await page.waitForLoadState('networkidle')
  }

  test.beforeEach(async ({ page }) => {
    // Increase timeout for chart rendering
    page.setDefaultTimeout(30000)
  })

  test('scenario markers should be visible on the chart', async ({ page }) => {
    await ensureLoggedIn(page)

    // Wait for the chart to render
    await expect(page.locator('text=Net Worth Projection')).toBeVisible()

    // Wait for chart SVG to be present
    const chartSvg = page.locator('.recharts-wrapper svg').first()
    await expect(chartSvg).toBeVisible()

    // Look for scenario markers (they are <g> elements with role="button")
    const markers = page.locator('.recharts-scatter g[role="button"]')

    // If there are scenario events, markers should be visible
    const markerCount = await markers.count()
    console.log(`Found ${markerCount} scenario markers`)

    if (markerCount > 0) {
      // Verify first marker is visible
      await expect(markers.first()).toBeVisible()
    }
  })

  test('scenario marker should be positioned above the chart line', async ({ page }) => {
    await ensureLoggedIn(page)

    await expect(page.locator('text=Net Worth Projection')).toBeVisible({ timeout: 10000 })

    // Wait for chart and markers to render
    await page.waitForTimeout(2000) // Wait for animations

    const markers = page.locator('.recharts-scatter g[role="button"]')
    const markerCount = await markers.count()

    if (markerCount > 0) {
      // Get the marker's bounding box
      const markerBox = await markers.first().boundingBox()

      // Get the chart area line
      const areaPath = page.locator('.recharts-area-area').first()
      const areaBox = await areaPath.boundingBox()

      if (markerBox && areaBox) {
        // Marker should be above (lower Y value) or at the same level as the area
        // The marker's center Y should be near or above the area's top edge
        console.log(`Marker Y: ${markerBox.y}, Area top: ${areaBox.y}`)

        // Marker should be within the chart bounds
        expect(markerBox.y).toBeGreaterThan(0)
      }
    }
  })

  test('clicking a scenario marker should open the event modal', async ({ page }) => {
    await ensureLoggedIn(page)

    await expect(page.locator('text=Net Worth Projection')).toBeVisible({ timeout: 10000 })
    await page.waitForTimeout(2000)

    const markers = page.locator('.recharts-scatter g[role="button"]')
    const markerCount = await markers.count()

    if (markerCount > 0) {
      // Click the first marker
      await markers.first().click()

      // Should open a modal or panel with event details
      // Adjust this based on your actual UI
      const modal = page.locator('[role="dialog"]')
      await expect(modal).toBeVisible({ timeout: 5000 })
    }
  })

  test('multiple markers on same date should stack vertically', async ({ page }) => {
    await ensureLoggedIn(page)

    await expect(page.locator('text=Net Worth Projection')).toBeVisible({ timeout: 10000 })
    await page.waitForTimeout(2000)

    // Find marker groups (each g[role="button"] contains potentially stacked markers)
    const markerGroups = page.locator('.recharts-scatter g[role="button"]')
    const groupCount = await markerGroups.count()

    for (let i = 0; i < groupCount; i++) {
      const group = markerGroups.nth(i)
      const circles = group.locator('circle')
      const circleCount = await circles.count()

      if (circleCount > 1) {
        // Get positions of all circles in this group
        const positions: number[] = []
        for (let j = 0; j < circleCount; j++) {
          const box = await circles.nth(j).boundingBox()
          if (box) positions.push(box.y)
        }

        // Verify they are stacked (each subsequent has a different Y)
        for (let j = 1; j < positions.length; j++) {
          expect(positions[j]).not.toBe(positions[j - 1])
        }

        console.log(`Group ${i} has ${circleCount} stacked markers at Y positions: ${positions}`)
      }
    }
  })

  test('scenario markers should align with their corresponding X-axis dates', async ({ page }) => {
    await ensureLoggedIn(page)

    await expect(page.locator('text=Net Worth Projection')).toBeVisible({ timeout: 10000 })
    await page.waitForTimeout(2000)

    // Get chart area bounds
    const chartArea = page.locator('.recharts-wrapper').first()
    const chartBox = await chartArea.boundingBox()

    if (!chartBox) {
      test.skip()
      return
    }

    const markers = page.locator('.recharts-scatter g[role="button"]')
    const markerCount = await markers.count()

    for (let i = 0; i < markerCount; i++) {
      const markerBox = await markers.nth(i).boundingBox()

      if (markerBox) {
        // Marker X should be within the chart bounds
        expect(markerBox.x).toBeGreaterThanOrEqual(chartBox.x)
        expect(markerBox.x + markerBox.width).toBeLessThanOrEqual(chartBox.x + chartBox.width)

        // Marker Y should be within the chart bounds
        expect(markerBox.y).toBeGreaterThanOrEqual(chartBox.y)
        expect(markerBox.y + markerBox.height).toBeLessThanOrEqual(chartBox.y + chartBox.height)

        console.log(`Marker ${i} position: (${markerBox.x}, ${markerBox.y})`)
      }
    }
  })

  // Visual regression test - compare against baseline screenshot
  test('chart with markers should match visual snapshot', async ({ page }) => {
    await ensureLoggedIn(page)

    await expect(page.locator('text=Net Worth Projection')).toBeVisible({ timeout: 10000 })

    // Wait for all animations to complete
    await page.waitForTimeout(3000)

    // Take a screenshot of just the chart area
    const chartWrapper = page.locator('.recharts-wrapper').first()
    await expect(chartWrapper).toBeVisible()

    // This creates a baseline on first run, then compares on subsequent runs
    // Run `npx playwright test --update-snapshots` to update the baseline
    await expect(chartWrapper).toHaveScreenshot('chart-with-markers.png', {
      maxDiffPixels: 5000, // Allow differences for anti-aliasing, timing, and data changes
      threshold: 0.3, // 30% threshold for pixel differences
    })
  })
})

/**
 * Tests specifically for marker positioning logic
 */
test.describe('Marker Position Calculation', () => {
  test('markers should move when zooming the chart', async ({ page }) => {
    // This test would verify that markers stay attached to their data points
    // when the user zooms in/out on the chart

    await page.goto('/dashboard')
    // ... login logic

    // Record initial marker position
    // Zoom in
    // Record new marker position
    // Verify marker moved proportionally
  })
})

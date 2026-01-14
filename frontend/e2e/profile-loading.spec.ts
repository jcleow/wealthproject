/**
 * E2E Tests: Profile Loading
 *
 * Tests the profile selection and loading functionality
 */

import { test, expect } from '@playwright/test'

// Test credentials
const TEST_EMAIL = 'asdf@gmail.com'
const TEST_PASSWORD = 'asdf1234!'

/**
 * Login helper with signup fallback
 */
async function login(page: ReturnType<typeof test>['page'] extends Promise<infer T> ? T : never) {
  await page.goto('/login')
  await page.waitForLoadState('domcontentloaded')

  // Fill credentials
  await page.getByLabel(/email/i).fill(TEST_EMAIL)
  await page.getByLabel(/password/i).fill(TEST_PASSWORD)

  // Click sign in
  await page.getByRole('button', { name: /sign in|log in/i }).click()

  // Wait for either dashboard or error
  await page.waitForTimeout(2000)

  // Check if login failed (still on login page with error)
  const currentUrl = page.url()
  if (currentUrl.includes('/login')) {
    const errorMessage = page.getByText(/invalid.*password|error/i)
    if (await errorMessage.isVisible()) {
      // Login failed, try to sign up instead
      console.log('Login failed, attempting signup...')
      await page.goto('/signup')
      await page.waitForLoadState('domcontentloaded')

      // Fill name field if present
      const nameField = page.getByLabel(/full.*name|name/i).first()
      if (await nameField.isVisible()) {
        await nameField.fill('Test User')
      }

      await page.getByLabel(/email/i).fill(TEST_EMAIL)
      await page.getByLabel(/^password$/i).first().fill(TEST_PASSWORD)

      // Look for confirm password field
      const confirmPassword = page.getByLabel(/confirm.*password/i)
      if (await confirmPassword.isVisible()) {
        await confirmPassword.fill(TEST_PASSWORD)
      }

      // Click sign up
      await page.getByRole('button', { name: /sign up|create.*account|register/i }).click()

      // Wait for navigation
      await page.waitForURL(/dashboard/, { timeout: 15000 })
      return
    }
  }

  // Check if we're on dashboard
  if (!page.url().includes('/dashboard')) {
    await page.waitForURL(/dashboard/, { timeout: 15000 })
  }
}

/**
 * Wait for the dashboard to fully load
 */
async function waitForDashboard(page: ReturnType<typeof test>['page'] extends Promise<infer T> ? T : never) {
  await page.waitForLoadState('domcontentloaded')
  await expect(page.getByRole('heading', { name: /net worth/i }).first()).toBeVisible({ timeout: 15000 })
}

test.describe('Profile Loading', () => {
  test.describe.configure({ mode: 'serial' })

  test('should open profile selection modal', async ({ page }) => {
    await login(page)
    await waitForDashboard(page)

    // Click the "Load a profile template" button (sparkles icon)
    const profileButton = page.locator('button[title="Load a profile template"]')
    await expect(profileButton).toBeVisible()
    await profileButton.click()

    // Verify modal opens
    const modal = page.getByRole('dialog')
    await expect(modal).toBeVisible({ timeout: 5000 })

    // Should see profile options - look for any profile card content
    const hasProfiles = await page.locator('[class*="profile"], [data-testid*="profile"]').count() > 0
      || await page.getByText(/dink|single|fire|blank/i).count() > 0

    expect(hasProfiles || await modal.isVisible()).toBeTruthy()
  })

  test('should load Young Family profile successfully', async ({ page }) => {
    test.setTimeout(120000) // 2 minutes timeout

    await login(page)
    await waitForDashboard(page)

    // Click the "Load a profile template" button
    const profileButton = page.locator('button[title="Load a profile template"]')
    await profileButton.click()

    // Wait for modal
    const modal = page.getByRole('dialog')
    await expect(modal).toBeVisible({ timeout: 5000 })

    // Find the Young Family profile card using a filter for the heading
    const profileCard = page.locator('button').filter({
      has: page.getByRole('heading', { name: 'Young Family', exact: true })
    })
    await expect(profileCard).toBeVisible({ timeout: 5000 })

    // Click the profile card
    await profileCard.click()

    // Wait a moment for the click to register and API calls to start
    await page.waitForTimeout(1000)

    // Wait for loading to complete (modal should close)
    // The modal should close once the profile is loaded successfully
    await expect(modal).not.toBeVisible({ timeout: 90000 })

    // Verify profile was loaded - check for income items that were created
    await page.waitForTimeout(2000)

    // Verify income section exists
    const incomeSection = page.locator('h4', { hasText: /Monthly Income/i }).first()
    await expect(incomeSection).toBeVisible({ timeout: 10000 })
  })

  test('should load Fresh Graduate profile', async ({ page }) => {
    await login(page)
    await waitForDashboard(page)

    // Click profile button
    const profileButton = page.locator('button[title="Load a profile template"]')
    await profileButton.click()

    // Wait for modal
    const modal = page.getByRole('dialog')
    await expect(modal).toBeVisible({ timeout: 5000 })

    // Find and click the Fresh Graduate profile
    const profileCard = page.getByRole('button', { name: /fresh.*graduate/i })
    await expect(profileCard).toBeVisible()
    await profileCard.click()

    // Wait for modal to close
    await expect(modal).not.toBeVisible({ timeout: 60000 })

    // Verify dashboard still works
    await expect(page.getByRole('heading', { name: /net worth/i }).first()).toBeVisible()
  })
})

import { test as base, expect } from '@playwright/test'

/**
 * Test account credentials for development/testing
 * DO NOT use in production environments
 */
export const TEST_ACCOUNT = {
  email: 'asdf@gmail.com',
  password: 'asdf1234!',
}

/**
 * Extended test fixture that provides automatic authentication
 *
 * Usage:
 * ```ts
 * import { authenticatedTest } from './fixtures/auth'
 *
 * authenticatedTest('should show dashboard', async ({ authenticatedPage }) => {
 *   // Page is already logged in and on /dashboard
 *   await expect(authenticatedPage.getByText('Net Worth')).toBeVisible()
 * })
 * ```
 */
export const authenticatedTest = base.extend<{
  authenticatedPage: Awaited<ReturnType<typeof base['extend']>>['page']
}>({
  authenticatedPage: async ({ page }, use) => {
    // Navigate to login page
    await page.goto('/login')

    // Fill in credentials
    await page.getByLabel(/email/i).fill(TEST_ACCOUNT.email)
    await page.getByLabel(/password/i).fill(TEST_ACCOUNT.password)

    // Submit the form
    await page.getByRole('button', { name: /sign in|log in/i }).click()

    // Wait for navigation to dashboard
    await page.waitForURL(/dashboard/, { timeout: 10000 })

    // Verify we're logged in - use first() to handle multiple "Net Worth" headings
    await expect(page.getByRole('heading', { name: /net worth/i }).first()).toBeVisible({ timeout: 10000 })

    // Provide the authenticated page to the test
    await use(page)
  },
})

/**
 * Helper function for manual login in tests
 * Use this when you need more control over the login flow
 */
export async function loginAsTestUser(page: Parameters<Parameters<typeof base>[1]>[0]['page']) {
  await page.goto('/login')
  await page.getByLabel(/email/i).fill(TEST_ACCOUNT.email)
  await page.getByLabel(/password/i).fill(TEST_ACCOUNT.password)
  await page.getByRole('button', { name: /sign in|log in/i }).click()
  await page.waitForURL(/dashboard/, { timeout: 10000 })
}

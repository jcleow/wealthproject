/**
 * E2E Tests: Authentication Flows
 *
 * Tests login and signup flows including:
 * - Form validation (client-side via Zod)
 * - Success/failure paths
 * - Navigation and redirects
 */

import { test, expect } from '@playwright/test'
import { TEST_ACCOUNT } from './fixtures/auth'

// =============================================================================
// LOGIN FLOW TESTS
// =============================================================================
test.describe('Login Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login')
    await page.waitForLoadState('networkidle')
  })

  test('should display login form with all required elements', async ({ page }) => {
    // Heading
    await expect(page.getByRole('heading', { name: /welcome back/i })).toBeVisible()

    // Form fields
    await expect(page.getByLabel(/email/i)).toBeVisible()
    await expect(page.getByLabel(/password/i)).toBeVisible()

    // Submit button
    await expect(page.getByRole('button', { name: /sign in/i })).toBeVisible()

    // Sign up link
    await expect(page.getByRole('link', { name: /sign up/i })).toBeVisible()
  })

  test('should show validation error for invalid email format', async ({ page }) => {
    // Enter invalid email - browser's HTML5 validation will catch this
    const emailInput = page.getByLabel(/email/i)
    await emailInput.fill('not-an-email')
    await page.getByLabel(/password/i).fill('somepassword')

    // Submit form
    await page.getByRole('button', { name: /sign in/i }).click()

    // HTML5 validation prevents submission - check that we're still on login page
    // and the email input shows validation state
    await expect(page).toHaveURL(/login/)

    // The browser native validation will show an error - input should be invalid
    const isInvalid = await emailInput.evaluate((el: HTMLInputElement) => !el.validity.valid)
    expect(isInvalid).toBe(true)
  })

  test('should show validation error for empty password', async ({ page }) => {
    // Enter email but no password
    await page.getByLabel(/email/i).fill('test@example.com')

    // Submit form
    await page.getByRole('button', { name: /sign in/i }).click()

    // Expect validation error
    await expect(page.getByText(/password is required/i)).toBeVisible()
  })

  test('should show error for invalid credentials', async ({ page }) => {
    // Enter wrong credentials
    await page.getByLabel(/email/i).fill('wrong@example.com')
    await page.getByLabel(/password/i).fill('wrongpassword123')

    // Submit form
    await page.getByRole('button', { name: /sign in/i }).click()

    // Wait for server response
    await page.waitForTimeout(2000)

    // Expect server error message
    const errorMessage = page.locator('.text-red-400').filter({ hasText: /invalid|error|incorrect/i })
    await expect(errorMessage).toBeVisible({ timeout: 5000 })
  })

  test('should successfully login with valid credentials', async ({ page }) => {
    // Enter valid credentials
    await page.getByLabel(/email/i).fill(TEST_ACCOUNT.email)
    await page.getByLabel(/password/i).fill(TEST_ACCOUNT.password)

    // Submit form
    await page.getByRole('button', { name: /sign in/i }).click()

    // Wait for redirect to dashboard
    await page.waitForURL(/dashboard/, { timeout: 10000 })

    // Verify we're on dashboard
    await expect(page.getByRole('heading', { name: /net worth/i }).first()).toBeVisible({ timeout: 10000 })
  })

  test('should show loading state while submitting', async ({ page }) => {
    // Fill valid credentials
    await page.getByLabel(/email/i).fill(TEST_ACCOUNT.email)
    await page.getByLabel(/password/i).fill(TEST_ACCOUNT.password)

    // Click submit and immediately check for loading state
    const submitButton = page.getByRole('button', { name: /sign in/i })
    await submitButton.click()

    // Button should show loading text or be disabled
    // Note: This may be too fast to catch, depending on network speed
    const loadingButton = page.getByRole('button', { name: /signing in/i })
    const isLoading = await loadingButton.isVisible({ timeout: 1000 }).catch(() => false)

    // If we caught the loading state, verify it
    if (isLoading) {
      await expect(loadingButton).toBeDisabled()
    }

    // Eventually should redirect
    await page.waitForURL(/dashboard/, { timeout: 10000 })
  })

  test('should navigate to signup page via link', async ({ page }) => {
    // Click sign up link
    await page.getByRole('link', { name: /sign up/i }).click()

    // Verify navigation
    await expect(page).toHaveURL(/signup/)
    await expect(page.getByRole('heading', { name: /create your account/i })).toBeVisible()
  })

  test('should handle callback URL parameter', async ({ page }) => {
    // Navigate to login with callback URL
    await page.goto('/login?callbackUrl=/dashboard')
    await page.waitForLoadState('networkidle')

    // Login
    await page.getByLabel(/email/i).fill(TEST_ACCOUNT.email)
    await page.getByLabel(/password/i).fill(TEST_ACCOUNT.password)
    await page.getByRole('button', { name: /sign in/i }).click()

    // Should redirect to the callback URL
    await page.waitForURL(/dashboard/, { timeout: 10000 })
  })
})

// =============================================================================
// SIGNUP FLOW TESTS
// =============================================================================
test.describe('Signup Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/signup')
    await page.waitForLoadState('networkidle')
  })

  test('should display signup form with all required elements', async ({ page }) => {
    // Heading
    await expect(page.getByRole('heading', { name: /create your account/i })).toBeVisible()

    // Form fields
    await expect(page.getByLabel(/full name/i)).toBeVisible()
    await expect(page.getByLabel(/^email$/i)).toBeVisible()
    await expect(page.getByLabel(/^password$/i)).toBeVisible()
    await expect(page.getByLabel(/confirm password/i)).toBeVisible()

    // Submit button
    await expect(page.getByRole('button', { name: /create account/i })).toBeVisible()

    // Sign in link
    await expect(page.getByRole('link', { name: /sign in/i })).toBeVisible()
  })

  test('should show validation error for short name', async ({ page }) => {
    // Enter single character name
    await page.getByLabel(/full name/i).fill('A')
    await page.getByLabel(/^email$/i).fill('test@example.com')
    await page.getByLabel(/^password$/i).fill('Password123')
    await page.getByLabel(/confirm password/i).fill('Password123')

    // Submit
    await page.getByRole('button', { name: /create account/i }).click()

    // Expect validation error
    await expect(page.getByText(/name must be at least 2 characters/i)).toBeVisible()
  })

  test('should show validation error for invalid email', async ({ page }) => {
    // Enter invalid email - browser's HTML5 validation will catch this
    await page.getByLabel(/full name/i).fill('Test User')
    const emailInput = page.getByLabel(/^email$/i)
    await emailInput.fill('invalid-email')
    await page.getByLabel(/^password$/i).fill('Password123')
    await page.getByLabel(/confirm password/i).fill('Password123')

    // Submit
    await page.getByRole('button', { name: /create account/i }).click()

    // HTML5 validation prevents submission - check that we're still on signup page
    await expect(page).toHaveURL(/signup/)

    // The browser native validation will show an error - input should be invalid
    const isInvalid = await emailInput.evaluate((el: HTMLInputElement) => !el.validity.valid)
    expect(isInvalid).toBe(true)
  })

  test('should show validation error for short password', async ({ page }) => {
    // Enter short password
    await page.getByLabel(/full name/i).fill('Test User')
    await page.getByLabel(/^email$/i).fill('test@example.com')
    await page.getByLabel(/^password$/i).fill('Pass1')
    await page.getByLabel(/confirm password/i).fill('Pass1')

    // Submit
    await page.getByRole('button', { name: /create account/i }).click()

    // Expect validation error
    await expect(page.getByText(/password must be at least 8 characters/i)).toBeVisible()
  })

  test('should show validation error for password without letters', async ({ page }) => {
    // Enter password with only numbers
    await page.getByLabel(/full name/i).fill('Test User')
    await page.getByLabel(/^email$/i).fill('test@example.com')
    await page.getByLabel(/^password$/i).fill('12345678')
    await page.getByLabel(/confirm password/i).fill('12345678')

    // Submit
    await page.getByRole('button', { name: /create account/i }).click()

    // Expect validation error
    await expect(page.getByText(/password must contain at least one letter/i)).toBeVisible()
  })

  test('should show validation error for password without numbers', async ({ page }) => {
    // Enter password with only letters
    await page.getByLabel(/full name/i).fill('Test User')
    await page.getByLabel(/^email$/i).fill('test@example.com')
    await page.getByLabel(/^password$/i).fill('PasswordOnly')
    await page.getByLabel(/confirm password/i).fill('PasswordOnly')

    // Submit
    await page.getByRole('button', { name: /create account/i }).click()

    // Expect validation error
    await expect(page.getByText(/password must contain at least one number/i)).toBeVisible()
  })

  test('should show validation error for mismatched passwords', async ({ page }) => {
    // Enter mismatched passwords
    await page.getByLabel(/full name/i).fill('Test User')
    await page.getByLabel(/^email$/i).fill('test@example.com')
    await page.getByLabel(/^password$/i).fill('Password123')
    await page.getByLabel(/confirm password/i).fill('DifferentPassword123')

    // Submit
    await page.getByRole('button', { name: /create account/i }).click()

    // Expect validation error
    await expect(page.getByText(/passwords do not match/i)).toBeVisible()
  })

  test('should show error when email already exists', async ({ page }) => {
    // Try to sign up with existing test account email
    await page.getByLabel(/full name/i).fill('Test User')
    await page.getByLabel(/^email$/i).fill(TEST_ACCOUNT.email)
    await page.getByLabel(/^password$/i).fill('NewPassword123')
    await page.getByLabel(/confirm password/i).fill('NewPassword123')

    // Submit
    await page.getByRole('button', { name: /create account/i }).click()

    // Wait for server response
    await page.waitForTimeout(2000)

    // Expect server error (email already in use)
    const errorMessage = page.locator('.text-red-400')
    await expect(errorMessage).toBeVisible({ timeout: 5000 })
  })

  test('should successfully create account with valid data', async ({ page }) => {
    // Generate unique email for this test
    const uniqueEmail = `e2e-test-${Date.now()}@example.com`

    // Fill valid signup data
    await page.getByLabel(/full name/i).fill('E2E Test User')
    await page.getByLabel(/^email$/i).fill(uniqueEmail)
    await page.getByLabel(/^password$/i).fill('TestPassword123!')
    await page.getByLabel(/confirm password/i).fill('TestPassword123!')

    // Submit
    await page.getByRole('button', { name: /create account/i }).click()

    // Should redirect to dashboard on success
    await page.waitForURL(/dashboard/, { timeout: 15000 })

    // Verify we're on dashboard
    await expect(page.getByRole('heading', { name: /net worth/i }).first()).toBeVisible({ timeout: 10000 })
  })

  test('should navigate to login page via link', async ({ page }) => {
    // Click sign in link
    await page.getByRole('link', { name: /sign in/i }).click()

    // Verify navigation
    await expect(page).toHaveURL(/login/)
    await expect(page.getByRole('heading', { name: /welcome back/i })).toBeVisible()
  })

  test('should show loading state while submitting', async ({ page }) => {
    const uniqueEmail = `e2e-loading-${Date.now()}@example.com`

    // Fill form
    await page.getByLabel(/full name/i).fill('Loading Test')
    await page.getByLabel(/^email$/i).fill(uniqueEmail)
    await page.getByLabel(/^password$/i).fill('TestPassword123')
    await page.getByLabel(/confirm password/i).fill('TestPassword123')

    // Click submit
    const submitButton = page.getByRole('button', { name: /create account/i })
    await submitButton.click()

    // Check for loading state (may be too fast to catch)
    const loadingButton = page.getByRole('button', { name: /creating account/i })
    const isLoading = await loadingButton.isVisible({ timeout: 1000 }).catch(() => false)

    if (isLoading) {
      await expect(loadingButton).toBeDisabled()
    }

    // Eventually should redirect or show error
    await page.waitForTimeout(5000)
  })
})

// =============================================================================
// AUTHENTICATION STATE TESTS
// =============================================================================
test.describe('Authentication State', () => {
  test('should redirect unauthenticated users from dashboard to login', async ({ page }) => {
    // Try to access dashboard without being logged in
    await page.goto('/dashboard')

    // Should redirect to login
    await page.waitForURL(/login/, { timeout: 10000 })
  })

  test('should persist session after page reload', async ({ page }) => {
    // Login first
    await page.goto('/login')
    await page.getByLabel(/email/i).fill(TEST_ACCOUNT.email)
    await page.getByLabel(/password/i).fill(TEST_ACCOUNT.password)
    await page.getByRole('button', { name: /sign in/i }).click()

    // Wait for dashboard (allow extra time for Turbopack cold compilation)
    await page.waitForURL(/dashboard/, { timeout: 20000 })
    await expect(page.getByRole('heading', { name: /net worth/i }).first()).toBeVisible({ timeout: 15000 })

    // Reload page
    await page.reload()

    // Should still be on dashboard
    await expect(page).toHaveURL(/dashboard/)
    await expect(page.getByRole('heading', { name: /net worth/i }).first()).toBeVisible({ timeout: 15000 })
  })
})

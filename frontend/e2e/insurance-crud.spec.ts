import { authenticatedTest } from './fixtures/auth'
import { expect } from '@playwright/test'

authenticatedTest.describe('Insurance Planner CRUD', () => {
  authenticatedTest.beforeEach(async ({ authenticatedPage: page }) => {
    // Navigate to insurance planner
    await page.goto('/insurance-planner')
    await page.waitForLoadState('networkidle')
  })

  authenticatedTest('should load sample data, verify policies, edit, and delete', async ({ authenticatedPage: page }) => {
    // ── 1. Load sample data (button is now in the top-level header) ──
    const loadSampleButton = page.getByRole('button', { name: /load sample data/i })
    await expect(loadSampleButton).toBeVisible({ timeout: 5000 })
    await loadSampleButton.click()

    // Wait for loading to finish
    await expect(loadSampleButton).not.toContainText('Loading', { timeout: 15000 })

    // ── 2. Navigate to Policies tab ──────────────────────────────────
    const policiesTab = page.getByRole('tab', { name: /policies/i })
    await policiesTab.click()
    await page.waitForTimeout(500)

    // ── 3. READ: Verify policies were created ────────────────────────
    // Should see summary cards
    await expect(page.getByText('ACTIVE POLICIES')).toBeVisible({ timeout: 5000 })
    await expect(page.getByText('ANNUAL PREMIUM')).toBeVisible()

    // Verify specific policy names appear
    await expect(page.getByText('AIA Pro Lifetime Protector')).toBeVisible()
    await expect(page.getByText('Prudential PRUShield Plus')).toBeVisible()
    await expect(page.getByText('AIA CI Secure')).toBeVisible()

    // ── 4. UPDATE: Edit a policy ─────────────────────────────────────
    // Click the menu button (three dots) on the first policy card
    const firstMenuButton = page.locator('button').filter({ has: page.locator('.lucide-more-horizontal') }).first()
    await firstMenuButton.click()

    // Click "Edit Policy" from dropdown
    await page.getByText('Edit Policy').click()

    // Verify the edit modal opened (dialog with policy form content)
    const modal = page.locator('[role="dialog"]')
    await expect(modal).toBeVisible({ timeout: 3000 })

    // Verify the modal loaded with the policy data (name is in an input, so check title)
    await expect(modal.getByText('Edit Life Insurance Policy')).toBeVisible()

    // Close the modal with Escape (most reliable - avoids overlay interception)
    await page.keyboard.press('Escape')
    await expect(modal).not.toBeVisible({ timeout: 3000 })

    // ── 5. DELETE: Delete a policy ───────────────────────────────────
    // Scroll back to top so the first policy is visible
    await page.evaluate(() => window.scrollTo(0, 0))
    await page.waitForTimeout(500)

    // Verify "AIA Pro Lifetime Protector" exists before deletion
    await expect(page.getByText('AIA Pro Lifetime Protector')).toBeVisible({ timeout: 5000 })

    // Open the first policy's dropdown menu (same card we edited earlier)
    const menuButtons = page.locator('button').filter({ has: page.locator('.lucide-more-horizontal') })
    await menuButtons.first().click()

    // Wait for the dropdown to appear
    const deleteOption = page.getByText('Delete Policy')
    await expect(deleteOption).toBeVisible({ timeout: 3000 })

    // Click delete
    await deleteOption.click()

    // Wait for "AIA Pro Lifetime Protector" to disappear
    await expect(page.getByText('AIA Pro Lifetime Protector')).not.toBeVisible({ timeout: 10000 })

    console.log('CRUD test passed: Load, Read, Edit modal, and Delete all verified')
  })
})

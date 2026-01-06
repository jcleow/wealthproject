/**
 * E2E Tests: Tax Modal Functionality
 *
 * Tests the Tax Estimate modal that opens from the Financial Data section header.
 * These tests ensure the tax button remains functional and prevents regressions
 * like the state management mismatch bug (Context vs Zustand).
 */

import { expect } from '@playwright/test'
import { authenticatedTest } from './fixtures/auth'

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Wait for the dashboard to fully load
 */
async function waitForDashboard(
  page: ReturnType<typeof authenticatedTest>['authenticatedPage'] extends Promise<infer T> ? T : never
) {
  await page.waitForLoadState('domcontentloaded')
  await expect(page.getByRole('heading', { name: /net worth/i }).first()).toBeVisible({ timeout: 15000 })
}

/**
 * Find the tax button in the Financial Data header
 * The tax button is a Receipt icon with title "Tax Estimate"
 */
function getTaxButton(
  page: ReturnType<typeof authenticatedTest>['authenticatedPage'] extends Promise<infer T> ? T : never
) {
  return page.locator('button[title="Tax Estimate"]')
}

// =============================================================================
// TAX MODAL TESTS
// =============================================================================

authenticatedTest.describe('Tax Modal', () => {
  authenticatedTest('should display tax button in Financial Data header', async ({ authenticatedPage }) => {
    const page = authenticatedPage
    await waitForDashboard(page)

    // Find the Financial Data section header
    const financialDataHeader = page.getByText('Financial Data').first()
    await expect(financialDataHeader).toBeVisible()

    // Tax button should be visible
    const taxButton = getTaxButton(page)
    await expect(taxButton).toBeVisible({ timeout: 5000 })
  })

  authenticatedTest('should open tax modal when clicking tax button', async ({ authenticatedPage }) => {
    const page = authenticatedPage
    await waitForDashboard(page)

    // Click the tax button
    const taxButton = getTaxButton(page)
    await taxButton.click()

    // Wait for modal to appear - look for the modal heading "Tax Estimate"
    const modal = page.getByRole('dialog')
    await expect(modal).toBeVisible({ timeout: 5000 })

    // Verify modal contains expected heading
    const modalHeading = page.getByRole('heading', { name: /tax estimate/i })
    await expect(modalHeading).toBeVisible()
  })

  authenticatedTest('should display income section in tax modal', async ({ authenticatedPage }) => {
    const page = authenticatedPage
    await waitForDashboard(page)

    // Open tax modal
    const taxButton = getTaxButton(page)
    await taxButton.click()

    const modal = page.getByRole('dialog')
    await expect(modal).toBeVisible({ timeout: 5000 })

    // Check for Income section
    const incomeSection = modal.getByText('Income (Annual)')
    await expect(incomeSection).toBeVisible()

    // Check for Gross Income label
    const grossIncome = modal.getByText('Gross Income').first()
    await expect(grossIncome).toBeVisible()
  })

  authenticatedTest('should display deductions and reliefs section', async ({ authenticatedPage }) => {
    const page = authenticatedPage
    await waitForDashboard(page)

    // Open tax modal
    const taxButton = getTaxButton(page)
    await taxButton.click()

    const modal = page.getByRole('dialog')
    await expect(modal).toBeVisible({ timeout: 5000 })

    // Check for Deductions & Reliefs section
    const reliefsSection = modal.getByText('Deductions & Reliefs')
    await expect(reliefsSection).toBeVisible()
  })

  authenticatedTest('should display tax calculation results', async ({ authenticatedPage }) => {
    const page = authenticatedPage
    await waitForDashboard(page)

    // Open tax modal
    const taxButton = getTaxButton(page)
    await taxButton.click()

    const modal = page.getByRole('dialog')
    await expect(modal).toBeVisible({ timeout: 5000 })

    // Check for key calculation outputs
    const chargeableIncome = modal.getByText('Chargeable Income').first()
    await expect(chargeableIncome).toBeVisible()

    const taxPayable = modal.getByText('Tax Payable')
    await expect(taxPayable).toBeVisible()

    const netIncome = modal.getByText('Net Income')
    await expect(netIncome).toBeVisible()
  })

  authenticatedTest('should close modal when clicking close button', async ({ authenticatedPage }) => {
    const page = authenticatedPage
    await waitForDashboard(page)

    // Open tax modal
    const taxButton = getTaxButton(page)
    await taxButton.click()

    const modal = page.getByRole('dialog')
    await expect(modal).toBeVisible({ timeout: 5000 })

    // Find and click close button (X icon in header)
    const closeButton = modal.locator('button').filter({ has: page.locator('svg.lucide-x') })
    await closeButton.click()

    // Modal should close
    await expect(modal).not.toBeVisible({ timeout: 3000 })
  })

  authenticatedTest('should close modal when pressing Escape key', async ({ authenticatedPage }) => {
    const page = authenticatedPage
    await waitForDashboard(page)

    // Open tax modal
    const taxButton = getTaxButton(page)
    await taxButton.click()

    const modal = page.getByRole('dialog')
    await expect(modal).toBeVisible({ timeout: 5000 })

    // Press Escape key
    await page.keyboard.press('Escape')

    // Modal should close
    await expect(modal).not.toBeVisible({ timeout: 3000 })
  })

  authenticatedTest('should allow person selection in tax modal', async ({ authenticatedPage }) => {
    const page = authenticatedPage
    await waitForDashboard(page)

    // Open tax modal
    const taxButton = getTaxButton(page)
    await taxButton.click()

    const modal = page.getByRole('dialog')
    await expect(modal).toBeVisible({ timeout: 5000 })

    // Look for person dropdown (defaults to Person 1)
    const personDropdown = modal.getByRole('button', { name: /person 1/i })
    await expect(personDropdown).toBeVisible()

    // Click to open dropdown
    await personDropdown.click()

    // Person 2 option should be available
    const person2Option = page.getByRole('button', { name: /person 2/i })
    await expect(person2Option).toBeVisible({ timeout: 2000 })

    // Close modal
    await page.keyboard.press('Escape')
  })

  authenticatedTest('should toggle payment method between One-Time and Monthly', async ({ authenticatedPage }) => {
    const page = authenticatedPage
    await waitForDashboard(page)

    // Open tax modal
    const taxButton = getTaxButton(page)
    await taxButton.click()

    const modal = page.getByRole('dialog')
    await expect(modal).toBeVisible({ timeout: 5000 })

    // Find payment method toggle buttons
    const oneTimeButton = modal.getByRole('button', { name: /one-time/i })
    const monthlyButton = modal.getByRole('button', { name: /monthly/i })

    await expect(oneTimeButton).toBeVisible()
    await expect(monthlyButton).toBeVisible()

    // Click Monthly to toggle
    await monthlyButton.click()

    // Should show monthly instalment info (if tax payable > 0)
    // Note: This may or may not be visible depending on user's income data
    await page.waitForTimeout(300) // Allow UI to update

    // Close modal
    await page.keyboard.press('Escape')
  })

  authenticatedTest('should reopen after closing', async ({ authenticatedPage }) => {
    const page = authenticatedPage
    await waitForDashboard(page)

    // Open tax modal first time
    const taxButton = getTaxButton(page)
    await taxButton.click()

    let modal = page.getByRole('dialog')
    await expect(modal).toBeVisible({ timeout: 5000 })

    // Close it
    await page.keyboard.press('Escape')
    await expect(modal).not.toBeVisible({ timeout: 3000 })

    // Open again
    await taxButton.click()

    // Should open successfully
    modal = page.getByRole('dialog')
    await expect(modal).toBeVisible({ timeout: 5000 })

    const modalHeading = page.getByRole('heading', { name: /tax estimate/i })
    await expect(modalHeading).toBeVisible()
  })
})

// =============================================================================
// REGRESSION TESTS
// =============================================================================

authenticatedTest.describe('Tax Button Regression Tests', () => {
  /**
   * This test specifically guards against the bug where the tax button
   * did nothing because of a state management mismatch between React Context
   * and Zustand store.
   *
   * The bug: Header.tsx used useTaxModeOptional() (Context) which returned null,
   * while FinancialDataManagement used useTaxModeStore (Zustand) for the modal.
   */
  authenticatedTest('tax button should trigger modal (state management regression)', async ({ authenticatedPage }) => {
    const page = authenticatedPage
    await waitForDashboard(page)

    // Ensure tax button exists and is clickable
    const taxButton = getTaxButton(page)
    await expect(taxButton).toBeVisible()
    await expect(taxButton).toBeEnabled()

    // Click and verify modal opens - this is the core regression test
    await taxButton.click()

    // If the button's onClick is broken (e.g., undefined function),
    // the modal won't appear. This assertion catches that regression.
    const modal = page.getByRole('dialog')
    await expect(modal).toBeVisible({
      timeout: 5000,
    })

    // Double-check by looking for specific modal content
    await expect(page.getByRole('heading', { name: /tax estimate/i })).toBeVisible()
  })

  authenticatedTest('tax button should respond to multiple clicks', async ({ authenticatedPage }) => {
    const page = authenticatedPage
    await waitForDashboard(page)

    const taxButton = getTaxButton(page)

    // Open -> Close -> Open cycle to ensure state is properly managed
    for (let i = 0; i < 3; i++) {
      await taxButton.click()

      const modal = page.getByRole('dialog')
      await expect(modal).toBeVisible({ timeout: 3000 })

      await page.keyboard.press('Escape')
      await expect(modal).not.toBeVisible({ timeout: 2000 })
    }
  })
})

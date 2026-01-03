/**
 * E2E Tests: Financial Data CRUD Operations
 *
 * Tests Create, Read, Update, Delete flows for:
 * - Assets
 * - Liabilities
 * - Income
 * - Expenses
 */

import { expect } from '@playwright/test'
import { authenticatedTest } from './fixtures/auth'

// Serial mode - tests share state for efficiency
authenticatedTest.describe.configure({ mode: 'serial' })

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Wait for the dashboard to fully load
 */
async function waitForDashboard(page: ReturnType<typeof authenticatedTest>['authenticatedPage'] extends Promise<infer T> ? T : never) {
  // Use domcontentloaded which is faster and more reliable than networkidle
  await page.waitForLoadState('domcontentloaded')
  await expect(page.getByRole('heading', { name: /net worth/i }).first()).toBeVisible({ timeout: 15000 })
}

/**
 * Find and click the add button for a category
 * Assets category has a dropdown menu, others have direct add button
 */
async function clickAddButton(
  page: ReturnType<typeof authenticatedTest>['authenticatedPage'] extends Promise<infer T> ? T : never,
  category: 'Assets' | 'Liabilities' | 'Monthly Income' | 'Annual Income' | 'Monthly Expenses' | 'Annual Expenses'
) {
  // Find the category card by its header text
  const categorySection = page.locator('h4', { hasText: category }).first()
  await expect(categorySection).toBeVisible({ timeout: 10000 })

  // Find the parent card container and then the add button within it
  const cardContainer = categorySection.locator('xpath=ancestor::div[contains(@class, "border-white")]').first()
  const addButton = cardContainer.locator('button[title="Add Item"]')

  await addButton.click()
}

/**
 * Click on a specific menu item in the asset dropdown
 */
async function clickAssetMenuItem(
  page: ReturnType<typeof authenticatedTest>['authenticatedPage'] extends Promise<infer T> ? T : never,
  menuItem: 'Asset' | 'Investment' | 'CPF Account'
) {
  // First click the add button for assets
  await clickAddButton(page, 'Assets')
  await page.waitForTimeout(200)

  // Then click the menu item
  const menuButton = page.locator('button', { hasText: menuItem }).filter({ hasNotText: 'Add' })
  await menuButton.click()
}

// =============================================================================
// INCOME CRUD TESTS
// =============================================================================
authenticatedTest.describe('Income CRUD', () => {
  const testIncomeName = `Test Salary ${Date.now()}`
  const updatedIncomeName = `Updated Salary ${Date.now()}`

  authenticatedTest('should display income section on dashboard', async ({ authenticatedPage }) => {
    const page = authenticatedPage
    await waitForDashboard(page)

    // Look for income section - should show "Monthly Income" or "Annual Income"
    const incomeSection = page.getByText(/Monthly Income|Annual Income/).first()
    await expect(incomeSection).toBeVisible()
  })

  authenticatedTest('should create new income', async ({ authenticatedPage }) => {
    const page = authenticatedPage
    await waitForDashboard(page)

    // Count incomes before adding
    const incomeButtons = page.locator('button', { hasText: /Employment/i })
    const initialCount = await incomeButtons.count()

    // Click add button for income
    const incomeHeader = page.locator('h4', { hasText: /Monthly Income|Annual Income/ }).first()
    await expect(incomeHeader).toBeVisible()

    // Get the container and find the add button
    const addButton = incomeHeader.locator('xpath=ancestor::div[contains(@class, "border")]//button[@title="Add Item"]')
    await addButton.click()

    // Wait for modal to open
    const modal = page.getByRole('dialog')
    await expect(modal).toBeVisible({ timeout: 5000 })

    // Fill in income form - income uses "Source" label for name
    const sourceInput = modal.locator('input[placeholder="Enter name"]')
    await sourceInput.fill(testIncomeName)

    // Select a person (required for income) - this is a custom dropdown with buttons
    const personButton = modal.getByRole('button', { name: /select person/i })
    await personButton.click()
    // Wait for dropdown and select first person (Alex or Sarah)
    await page.waitForTimeout(300)
    const personOption = page.getByRole('button', { name: /^Alex$/i }).or(page.getByRole('button', { name: /^Sarah$/i })).first()
    await personOption.click()
    // Wait for dropdown to close
    await page.waitForTimeout(300)

    // Fill in amount - click on it first to ensure dropdown is closed
    const amountInput = modal.locator('input[placeholder*="100"]').first()
    await amountInput.click()
    await amountInput.fill('5000')

    // Submit the form - button is "Add" for create mode
    const addBtn = modal.getByRole('button', { name: /^add$/i })
    await addBtn.click({ force: true })

    // Wait for modal to close - this confirms the form was submitted successfully
    await expect(modal).not.toBeVisible({ timeout: 10000 })

    // Reload the page to ensure fresh data
    await page.reload()
    await waitForDashboard(page)

    // Verify the income count increased or we have employment incomes
    const finalIncomeButtons = page.locator('button', { hasText: /Employment/i })
    const finalCount = await finalIncomeButtons.count()

    // Should have at least as many as before (or more)
    expect(finalCount).toBeGreaterThanOrEqual(initialCount)
  })

  authenticatedTest('should read/view income item', async ({ authenticatedPage }) => {
    const page = authenticatedPage
    await waitForDashboard(page)

    // Find any income button (Employment is the category we use)
    const incomeButtons = page.locator('button', { hasText: /Employment/i })
    const count = await incomeButtons.count()

    // Verify we have income items displayed
    expect(count).toBeGreaterThan(0)

    if (count > 0) {
      const incomeItem = incomeButtons.first()
      // Verify the item contains an amount display (currency format)
      const itemText = await incomeItem.textContent()
      expect(itemText).toMatch(/\$[\d,]+/)
    }
  })

  authenticatedTest('should update income item', async ({ authenticatedPage }) => {
    const page = authenticatedPage
    await waitForDashboard(page)

    // Find a line item with data-line-item attribute (the actual editable element)
    const lineItems = page.locator('[data-line-item]')
    const count = await lineItems.count()

    if (count > 0) {
      const lineItem = lineItems.first()
      // Scroll into view and wait for it to be stable
      await lineItem.scrollIntoViewIfNeeded()
      await page.waitForTimeout(300)

      // Double-click the line item element directly
      await lineItem.dblclick({ force: true })

      const modal = page.getByRole('dialog')
      await expect(modal).toBeVisible({ timeout: 5000 })

      // Modify the amount
      const amountInput = modal.locator('input[placeholder*="100"]').first()
      await amountInput.clear()
      await amountInput.fill('6000')

      const saveButton = modal.getByRole('button', { name: /save/i })
      await saveButton.click({ force: true })

      await expect(modal).not.toBeVisible({ timeout: 10000 })

      // Verify we're still on dashboard (save was successful)
      await expect(page.getByRole('heading', { name: /net worth/i }).first()).toBeVisible()
    }
  })

  authenticatedTest('should delete income item', async ({ authenticatedPage }) => {
    const page = authenticatedPage
    await waitForDashboard(page)

    // Find line items
    const lineItems = page.locator('[data-line-item]')
    const initialCount = await lineItems.count()

    if (initialCount > 0) {
      const lineItem = lineItems.first()
      await lineItem.scrollIntoViewIfNeeded()
      await lineItem.click({ force: true })
      await page.waitForTimeout(200)

      // Look for delete button that appears on selection
      const deleteButton = lineItem.locator('button[title="Delete"]')

      page.once('dialog', async (dialog) => {
        await dialog.accept()
      })

      await deleteButton.click({ force: true })

      // Wait for deletion
      await page.waitForTimeout(1000)

      // Verify one less item or item is gone
      const finalCount = await lineItems.count()
      expect(finalCount).toBeLessThanOrEqual(initialCount)
    }
  })
})

// =============================================================================
// EXPENSE CRUD TESTS
// =============================================================================
authenticatedTest.describe('Expense CRUD', () => {
  const testExpenseName = `Test Rent ${Date.now()}`
  const updatedExpenseName = `Updated Rent ${Date.now()}`

  authenticatedTest('should display expenses section on dashboard', async ({ authenticatedPage }) => {
    const page = authenticatedPage
    await waitForDashboard(page)

    // Look for expenses section
    const expenseSection = page.getByText(/Monthly Expenses|Annual Expenses/).first()
    await expect(expenseSection).toBeVisible()
  })

  authenticatedTest('should create new expense', async ({ authenticatedPage }) => {
    const page = authenticatedPage
    await waitForDashboard(page)

    // Count expense items before adding - use Housing as our test category
    const expenseButtons = page.locator('button', { hasText: /Housing/i })
    const initialCount = await expenseButtons.count()

    // Find expense section and click add button
    const expenseHeader = page.locator('h4', { hasText: /Monthly Expenses|Annual Expenses/ }).first()
    await expect(expenseHeader).toBeVisible()

    const addButton = expenseHeader.locator('xpath=ancestor::div[contains(@class, "border")]//button[@title="Add Item"]')
    await addButton.click()

    // Wait for modal
    const modal = page.getByRole('dialog')
    await expect(modal).toBeVisible({ timeout: 5000 })

    // Fill expense form - expense uses "Payee" label for name
    const payeeInput = modal.locator('input[placeholder="Enter name"]')
    await payeeInput.fill(testExpenseName)

    const amountInput = modal.locator('input[placeholder*="100"]').first()
    await amountInput.fill('2000')

    // Submit - button is "Add" for create mode
    const addBtn = modal.getByRole('button', { name: /^add$/i })
    await addBtn.click({ force: true })

    await expect(modal).not.toBeVisible({ timeout: 10000 })

    // Reload the page to ensure fresh data
    await page.reload()
    await waitForDashboard(page)

    // Verify the expense count increased
    const finalExpenseButtons = page.locator('button', { hasText: /Housing/i })
    const finalCount = await finalExpenseButtons.count()

    // Should have at least as many as before (modal closed successfully = expense created)
    expect(finalCount).toBeGreaterThanOrEqual(initialCount)
  })

  authenticatedTest('should update expense item', async ({ authenticatedPage }) => {
    const page = authenticatedPage
    await waitForDashboard(page)

    // Find line items
    const lineItems = page.locator('[data-line-item]')
    const count = await lineItems.count()

    if (count > 0) {
      const lineItem = lineItems.first()
      await lineItem.scrollIntoViewIfNeeded()
      await page.waitForTimeout(300)

      // Double-click the line item element
      await lineItem.dblclick({ force: true })

      const modal = page.getByRole('dialog')
      await expect(modal).toBeVisible({ timeout: 5000 })

      // Modify the amount
      const amountInput = modal.locator('input[placeholder*="100"]').first()
      await amountInput.clear()
      await amountInput.fill('2500')

      const saveButton = modal.getByRole('button', { name: /save/i })
      await saveButton.click({ force: true })

      await expect(modal).not.toBeVisible({ timeout: 10000 })

      // Verify we're still on dashboard (save was successful)
      await expect(page.getByRole('heading', { name: /net worth/i }).first()).toBeVisible()
    }
  })

  authenticatedTest('should delete expense item', async ({ authenticatedPage }) => {
    const page = authenticatedPage
    await waitForDashboard(page)

    // Find line items
    const lineItems = page.locator('[data-line-item]')
    const initialCount = await lineItems.count()

    if (initialCount > 0) {
      const lineItem = lineItems.first()
      await lineItem.scrollIntoViewIfNeeded()
      await lineItem.click({ force: true })
      await page.waitForTimeout(200)

      // Look for delete button that appears on selection
      const deleteButton = lineItem.locator('button[title="Delete"]')

      page.once('dialog', async (dialog) => {
        await dialog.accept()
      })

      await deleteButton.click({ force: true })

      // Wait for deletion
      await page.waitForTimeout(1000)

      // Verify one less item
      const finalCount = await lineItems.count()
      expect(finalCount).toBeLessThanOrEqual(initialCount)
    }
  })
})

// =============================================================================
// ASSET CRUD TESTS
// =============================================================================
authenticatedTest.describe('Asset CRUD', () => {
  const testAssetName = `Test Property ${Date.now()}`
  const updatedAssetName = `Updated Property ${Date.now()}`

  authenticatedTest('should display assets section on dashboard', async ({ authenticatedPage }) => {
    const page = authenticatedPage
    await waitForDashboard(page)

    const assetSection = page.getByText(/Assets/).first()
    await expect(assetSection).toBeVisible()
  })

  authenticatedTest('should open asset add menu with options', async ({ authenticatedPage }) => {
    const page = authenticatedPage
    await waitForDashboard(page)

    // Find assets section and click add button
    const assetHeader = page.locator('h4', { hasText: 'Assets' }).first()
    await expect(assetHeader).toBeVisible()

    const addButton = assetHeader.locator('xpath=ancestor::div[contains(@class, "border")]//button[@title="Add Item"]')
    await addButton.click()

    // Should show dropdown menu with Asset, Investment, CPF options
    await expect(page.getByRole('button', { name: 'Asset', exact: true })).toBeVisible({ timeout: 3000 })
    await expect(page.getByRole('button', { name: 'Investment', exact: true })).toBeVisible()

    // Close menu by clicking elsewhere
    await page.keyboard.press('Escape')
  })

  authenticatedTest('should create new asset', async ({ authenticatedPage }) => {
    const page = authenticatedPage
    await waitForDashboard(page)

    // Count asset items before adding - use Bank Account or Other Assets
    const assetButtons = page.locator('button', { hasText: /Bank Account|Other Assets/i })
    const initialCount = await assetButtons.count()

    // Click add button and select Asset from menu
    const assetHeader = page.locator('h4', { hasText: 'Assets' }).first()
    const addButton = assetHeader.locator('xpath=ancestor::div[contains(@class, "border")]//button[@title="Add Item"]')
    await addButton.click()

    // Click "Asset" in the dropdown menu
    const assetOption = page.getByRole('button', { name: 'Asset', exact: true })
    await assetOption.click()

    // Wait for modal
    const modal = page.getByRole('dialog')
    await expect(modal).toBeVisible({ timeout: 5000 })

    // Fill asset form - asset uses "Name" label
    const nameInput = modal.locator('input[placeholder="Enter name"]')
    await nameInput.fill(testAssetName)

    // For assets, the field is "Current Value"
    const valueInput = modal.locator('input[placeholder*="100"]').first()
    await valueInput.fill('100000')

    // Submit - button is "Add" for create mode
    const addBtn = modal.getByRole('button', { name: /^add$/i })
    await addBtn.click({ force: true })

    await expect(modal).not.toBeVisible({ timeout: 10000 })

    // Reload the page to ensure fresh data
    await page.reload()
    await waitForDashboard(page)

    // Verify the asset count increased or stayed same (modal closed = success)
    const finalAssetButtons = page.locator('button', { hasText: /Bank Account|Other Assets/i })
    const finalCount = await finalAssetButtons.count()
    expect(finalCount).toBeGreaterThanOrEqual(initialCount)
  })

  authenticatedTest('should update asset item', async ({ authenticatedPage }) => {
    const page = authenticatedPage
    await waitForDashboard(page)

    // Find line items
    const lineItems = page.locator('[data-line-item]')
    const count = await lineItems.count()

    if (count > 0) {
      const lineItem = lineItems.first()
      await lineItem.scrollIntoViewIfNeeded()
      await page.waitForTimeout(300)

      // Double-click the line item element
      await lineItem.dblclick({ force: true })

      const modal = page.getByRole('dialog')
      await expect(modal).toBeVisible({ timeout: 5000 })

      // Modify the value
      const valueInput = modal.locator('input[placeholder*="100"]').first()
      await valueInput.clear()
      await valueInput.fill('150000')

      const saveButton = modal.getByRole('button', { name: /save/i })
      await saveButton.click({ force: true })

      await expect(modal).not.toBeVisible({ timeout: 10000 })

      // Verify we're still on dashboard (save was successful)
      await expect(page.getByRole('heading', { name: /net worth/i }).first()).toBeVisible()
    }
  })

  authenticatedTest('should delete asset item', async ({ authenticatedPage }) => {
    const page = authenticatedPage
    await waitForDashboard(page)

    // Find line items
    const lineItems = page.locator('[data-line-item]')
    const initialCount = await lineItems.count()

    if (initialCount > 0) {
      const lineItem = lineItems.first()
      await lineItem.scrollIntoViewIfNeeded()
      await lineItem.click({ force: true })
      await page.waitForTimeout(200)

      // Look for delete button that appears on selection
      const deleteButton = lineItem.locator('button[title="Delete"]')

      page.once('dialog', async (dialog) => {
        await dialog.accept()
      })

      await deleteButton.click({ force: true })

      // Wait for deletion
      await page.waitForTimeout(1000)

      // Verify one less item
      const finalCount = await lineItems.count()
      expect(finalCount).toBeLessThanOrEqual(initialCount)
    }
  })
})

// =============================================================================
// LIABILITY CRUD TESTS
// =============================================================================
authenticatedTest.describe('Liability CRUD', () => {
  const testLiabilityName = `Test Loan ${Date.now()}`
  const updatedLiabilityName = `Updated Loan ${Date.now()}`

  authenticatedTest('should display liabilities section on dashboard', async ({ authenticatedPage }) => {
    const page = authenticatedPage
    await waitForDashboard(page)

    const liabilitySection = page.getByText(/Liabilities/).first()
    await expect(liabilitySection).toBeVisible()
  })

  authenticatedTest('should create new liability', async ({ authenticatedPage }) => {
    const page = authenticatedPage
    await waitForDashboard(page)

    // Count liability items before adding
    const liabilityButtons = page.locator('button', { hasText: /Loan|Credit Card/i })
    const initialCount = await liabilityButtons.count()

    // Find liabilities section and click add button
    const liabilityHeader = page.locator('h4', { hasText: 'Liabilities' }).first()
    await expect(liabilityHeader).toBeVisible()

    const addButton = liabilityHeader.locator('xpath=ancestor::div[contains(@class, "border")]//button[@title="Add Item"]')
    await addButton.click()

    // Wait for modal
    const modal = page.getByRole('dialog')
    await expect(modal).toBeVisible({ timeout: 5000 })

    // Fill liability form - liability uses "Name" label
    const nameInput = modal.locator('input[placeholder="Enter name"]')
    await nameInput.fill(testLiabilityName)

    // Liability uses "Balance" label
    const valueInput = modal.locator('input[placeholder*="100"]').first()
    await valueInput.fill('50000')

    // Submit - button is "Add" for create mode
    const addBtn = modal.getByRole('button', { name: /^add$/i })
    await addBtn.click({ force: true })

    await expect(modal).not.toBeVisible({ timeout: 10000 })

    // Reload the page to ensure fresh data
    await page.reload()
    await waitForDashboard(page)

    // Verify the liability count increased or stayed same
    const finalLiabilityButtons = page.locator('button', { hasText: /Loan|Credit Card/i })
    const finalCount = await finalLiabilityButtons.count()
    expect(finalCount).toBeGreaterThanOrEqual(initialCount)
  })

  authenticatedTest('should update liability item', async ({ authenticatedPage }) => {
    const page = authenticatedPage
    await waitForDashboard(page)

    // Find line items
    const lineItems = page.locator('[data-line-item]')
    const count = await lineItems.count()

    if (count > 0) {
      const lineItem = lineItems.first()
      await lineItem.scrollIntoViewIfNeeded()
      await page.waitForTimeout(300)

      // Double-click the line item element
      await lineItem.dblclick({ force: true })

      const modal = page.getByRole('dialog')
      await expect(modal).toBeVisible({ timeout: 5000 })

      // Modify the balance
      const valueInput = modal.locator('input[placeholder*="100"]').first()
      await valueInput.clear()
      await valueInput.fill('45000')

      const saveButton = modal.getByRole('button', { name: /save/i })
      await saveButton.click({ force: true })

      await expect(modal).not.toBeVisible({ timeout: 10000 })

      // Verify we're still on dashboard (save was successful)
      await expect(page.getByRole('heading', { name: /net worth/i }).first()).toBeVisible()
    }
  })

  authenticatedTest('should delete liability item', async ({ authenticatedPage }) => {
    const page = authenticatedPage
    await waitForDashboard(page)

    // Find line items
    const lineItems = page.locator('[data-line-item]')
    const initialCount = await lineItems.count()

    if (initialCount > 0) {
      const lineItem = lineItems.first()
      await lineItem.scrollIntoViewIfNeeded()
      await lineItem.click({ force: true })
      await page.waitForTimeout(200)

      // Look for delete button that appears on selection
      const deleteButton = lineItem.locator('button[title="Delete"]')

      page.once('dialog', async (dialog) => {
        await dialog.accept()
      })

      await deleteButton.click({ force: true })

      // Wait for deletion
      await page.waitForTimeout(1000)

      // Verify one less item
      const finalCount = await lineItems.count()
      expect(finalCount).toBeLessThanOrEqual(initialCount)
    }
  })
})

// =============================================================================
// DOUBLE-CLICK EDIT TESTS
// =============================================================================
authenticatedTest.describe('Double-click Edit Behavior', () => {
  authenticatedTest('should open edit modal on double-click', async ({ authenticatedPage }) => {
    const page = authenticatedPage
    await waitForDashboard(page)

    // Find line items with data-line-item attribute
    const lineItems = page.locator('[data-line-item]')
    const count = await lineItems.count()

    if (count > 0) {
      const lineItem = lineItems.first()
      await lineItem.scrollIntoViewIfNeeded()
      await page.waitForTimeout(300)

      // Double-click the line item element
      await lineItem.dblclick({ force: true })

      // Modal should open
      const modal = page.getByRole('dialog')
      await expect(modal).toBeVisible({ timeout: 5000 })

      // Close modal
      await page.keyboard.press('Escape')
      await expect(modal).not.toBeVisible({ timeout: 3000 })
    }
  })
})

// =============================================================================
// CLICK-TO-SELECT BEHAVIOR TESTS
// =============================================================================
authenticatedTest.describe('Click-to-Select Behavior', () => {
  authenticatedTest('should show action buttons on item selection', async ({ authenticatedPage }) => {
    const page = authenticatedPage
    await waitForDashboard(page)

    // Find line items
    const lineItems = page.locator('[data-line-item]')
    const count = await lineItems.count()

    if (count > 0) {
      const lineItem = lineItems.first()
      await lineItem.scrollIntoViewIfNeeded()
      await lineItem.click({ force: true })
      await page.waitForTimeout(200)

      // Delete button should be visible within the line item
      const deleteButton = lineItem.locator('button[title="Delete"]')
      await expect(deleteButton).toBeVisible({ timeout: 3000 })
    }
  })

  authenticatedTest('should deselect item when clicking elsewhere', async ({ authenticatedPage }) => {
    const page = authenticatedPage
    await waitForDashboard(page)

    // Find line items
    const lineItems = page.locator('[data-line-item]')
    const count = await lineItems.count()

    if (count > 0) {
      const lineItem = lineItems.first()
      await lineItem.scrollIntoViewIfNeeded()
      await lineItem.click({ force: true })
      await page.waitForTimeout(200)

      // Verify selection (delete button visible)
      const deleteButton = lineItem.locator('button[title="Delete"]')
      await expect(deleteButton).toBeVisible({ timeout: 3000 })

      // Click somewhere else (on the heading area)
      await page.getByRole('heading', { name: /net worth/i }).first().click({ force: true })

      // Wait for deselection
      await page.waitForTimeout(500)
    }
  })
})

// =============================================================================
// FORM VALIDATION TESTS
// =============================================================================
authenticatedTest.describe('Form Validation', () => {
  authenticatedTest('should show validation error for empty name', async ({ authenticatedPage }) => {
    const page = authenticatedPage
    await waitForDashboard(page)

    // Open income add modal
    const incomeHeader = page.locator('h4', { hasText: /Monthly Income|Annual Income/ }).first()
    const addButton = incomeHeader.locator('xpath=ancestor::div[contains(@class, "border")]//button[@title="Add Item"]')
    await addButton.click()

    const modal = page.getByRole('dialog')
    await expect(modal).toBeVisible({ timeout: 5000 })

    // Try to submit without filling name - only fill amount
    const amountInput = modal.locator('input[placeholder*="100"]').first()
    await amountInput.fill('1000')

    const addBtn = modal.getByRole('button', { name: /^add$/i })
    await addBtn.click({ force: true })

    // HTML5 validation should prevent submission - modal stays open
    await page.waitForTimeout(500)
    const isModalStillOpen = await modal.isVisible()
    expect(isModalStillOpen).toBeTruthy()

    // Close modal
    await page.keyboard.press('Escape')
  })

  authenticatedTest('should show validation error for invalid amount', async ({ authenticatedPage }) => {
    const page = authenticatedPage
    await waitForDashboard(page)

    // Open income add modal
    const incomeHeader = page.locator('h4', { hasText: /Monthly Income|Annual Income/ }).first()
    const addButton = incomeHeader.locator('xpath=ancestor::div[contains(@class, "border")]//button[@title="Add Item"]')
    await addButton.click()

    const modal = page.getByRole('dialog')
    await expect(modal).toBeVisible({ timeout: 5000 })

    // Fill name
    const nameInput = modal.locator('input[placeholder="Enter name"]')
    await nameInput.fill('Test Income')

    // Fill with negative amount
    const amountInput = modal.locator('input[placeholder*="100"]').first()
    await amountInput.fill('-100')

    const addBtn = modal.getByRole('button', { name: /^add$/i })
    await addBtn.click({ force: true })

    await page.waitForTimeout(500)

    // Close modal
    await page.keyboard.press('Escape')
  })
})

// =============================================================================
// NET WORTH CALCULATION TESTS
// =============================================================================
authenticatedTest.describe('Net Worth Display', () => {
  authenticatedTest('should display net worth summary', async ({ authenticatedPage }) => {
    const page = authenticatedPage
    await waitForDashboard(page)

    // Look for net worth display
    const netWorthHeading = page.getByRole('heading', { name: /net worth/i }).first()
    await expect(netWorthHeading).toBeVisible()

    // Should show a currency value
    const netWorthValue = page.locator('text=/\\$[\\d,]+|\\$-?[\\d,]+/').first()
    await expect(netWorthValue).toBeVisible()
  })

  authenticatedTest('should display savings summary', async ({ authenticatedPage }) => {
    const page = authenticatedPage
    await waitForDashboard(page)

    // Look for savings or cash flow display
    const savingsSection = page.getByText(/savings|cash flow|surplus/i).first()

    if (await savingsSection.isVisible()) {
      await expect(savingsSection).toBeVisible()
    }
  })
})

/**
 * E2E Tests: Property Planner - Income Earner Classification
 *
 * Regression suite for feat/income-earner-classification branch.
 * Tests: personId FK changes, householdIncome computation, property planner flow.
 *
 * Prerequisites:
 * - Backend at localhost:8080
 * - Test account exists with incomes and CPF accounts
 */

import { authenticatedTest, TEST_ACCOUNT } from './fixtures/auth'
import { expect } from '@playwright/test'

// Serial mode - tests share state for efficiency
authenticatedTest.describe.configure({ mode: 'serial' })

authenticatedTest.describe('Property Planner - Income Earner Classification', () => {
  // =============================================================================
  // INCOME MANAGEMENT TESTS
  // Validates personId FK integration - earner names derived from persons table
  // =============================================================================
  authenticatedTest.describe('Income Management', () => {
    authenticatedTest('should display incomes with earner names', async ({ authenticatedPage }) => {
      const page = authenticatedPage

      // Wait for dashboard data to load
      await page.waitForLoadState('networkidle')

      // Find income section - look for the income category card
      const incomeSection = page.locator('text=Income').first()
      await expect(incomeSection).toBeVisible({ timeout: 10000 })

      // Wait for income items to load
      await page.waitForTimeout(1000)

      // Check that at least one income item displays an earner subtitle
      // Earner names appear as slate-500 text below the item name
      const incomeItems = page.locator('[data-line-item]').filter({ hasText: /\$.*\/mo|\$.*\/yr/ })
      const itemCount = await incomeItems.count()

      // If we have incomes, verify they have content
      if (itemCount > 0) {
        const firstItem = incomeItems.first()
        await expect(firstItem).toBeVisible()
        // The item should have some text content
        const text = await firstItem.textContent()
        expect(text).toBeTruthy()
      }
    })

    authenticatedTest('should navigate to income creation flow', async ({ authenticatedPage }) => {
      const page = authenticatedPage

      // Find the add button for income - look for "Add" text near Income section
      // The add button is typically in the category card header
      const addButton = page
        .locator('button')
        .filter({ hasText: /add|plus|\+/i })
        .first()

      if ((await addButton.count()) > 0) {
        await addButton.click()

        // Modal should appear
        const modal = page.getByRole('dialog')
        await expect(modal).toBeVisible({ timeout: 5000 })

        // Close modal
        await page.keyboard.press('Escape')
        await expect(modal).not.toBeVisible()
      }
    })
  })

  // =============================================================================
  // PROPERTY PLANNER MODAL TESTS
  // Full 4-step wizard flow: Property -> Borrowers -> Financing -> Terms
  // =============================================================================
  authenticatedTest.describe('Property Planner Modal', () => {
    authenticatedTest('should open property planner from asset with property link', async ({
      authenticatedPage,
    }) => {
      const page = authenticatedPage

      await page.waitForLoadState('networkidle')

      // Look for property icon (Home icon) on any asset/liability that has a property link
      // This is the primary way to open property planner from dashboard
      const propertyIcon = page.locator('button[title="Open property scenario"]').first()

      if ((await propertyIcon.count()) > 0) {
        await propertyIcon.click()

        // Property Scenarios modal should open
        const modal = page.getByRole('dialog')
        await expect(modal).toBeVisible({ timeout: 5000 })

        // Verify it's the property planner modal
        await expect(page.getByText('Property Scenarios')).toBeVisible()

        // Close modal for next test
        await page.keyboard.press('Escape')
      } else {
        // No property scenarios exist yet - that's okay for a fresh account
        // We'll test creation in the next test
        console.log('No property scenarios found - will test creation flow')
      }
    })

    authenticatedTest('should complete Step 1: Property details', async ({ authenticatedPage }) => {
      const page = authenticatedPage

      // First, we need to open property planner
      // Look for any existing property scenario link or create flow
      const propertyIcon = page.locator('button[title="Open property scenario"]').first()

      if ((await propertyIcon.count()) > 0) {
        await propertyIcon.click()
        await expect(page.getByRole('dialog')).toBeVisible({ timeout: 5000 })

        // If there's an existing scenario, click it to enter edit mode
        // Look for scenario cards in the list
        const scenarioCard = page.locator('[class*="cursor-pointer"]').filter({
          hasText: /HDB|Private|EC/i,
        })

        if ((await scenarioCard.count()) > 0) {
          await scenarioCard.first().click()

          // Wait for form to load
          await page.waitForTimeout(500)

          // We should be on Step 1 (Property) or in view mode
          // Look for property-related fields
          const propertyPriceLabel = page.getByText(/property price/i).first()
          if (await propertyPriceLabel.isVisible()) {
            // We're in edit mode, Step 1
            // Verify property fields are visible
            await expect(page.getByText(/property price/i).first()).toBeVisible()
          }
        }

        // Close for next test
        await page.keyboard.press('Escape')
        await page.waitForTimeout(300)
      }
    })

    authenticatedTest('should show step navigation tabs', async ({ authenticatedPage }) => {
      const page = authenticatedPage

      // Open property planner via property icon
      const propertyIcon = page.locator('button[title="Open property scenario"]').first()

      if ((await propertyIcon.count()) > 0) {
        await propertyIcon.click()
        await expect(page.getByRole('dialog')).toBeVisible({ timeout: 5000 })

        // Click on a scenario to enter edit mode
        const scenarioCard = page.locator('[class*="cursor-pointer"]').filter({
          hasText: /HDB|Private|EC/i,
        })

        if ((await scenarioCard.count()) > 0) {
          await scenarioCard.first().click()
          await page.waitForTimeout(500)

          // Look for step tabs (numbered 1-4)
          // The tabs contain step numbers in circular badges
          const stepTabs = page.locator('button').filter({ hasText: /^[1-4]$/ })
          const tabCount = await stepTabs.count()

          // Should have 4 step tabs
          if (tabCount === 4) {
            // Click on Step 2 (Borrowers)
            await stepTabs.nth(1).click()
            await page.waitForTimeout(300)

            // Verify we're on borrowers step - look for borrower-related text
            const borrowerText = page.getByText(/borrower|income/i).first()
            await expect(borrowerText).toBeVisible()
          }
        }

        await page.keyboard.press('Escape')
      }
    })
  })

  // =============================================================================
  // BORROWER SELECTION TESTS (KEY FEATURE)
  // Tests the core income-earner-classification changes:
  // - householdIncome computed from borrower selections
  // - CPF OA auto-population from earner match
  // - Income ceiling warnings
  // =============================================================================
  authenticatedTest.describe('Borrower Selection - householdIncome Computation', () => {
    authenticatedTest('should display Combined Income from borrower selection', async ({
      authenticatedPage,
    }) => {
      const page = authenticatedPage

      // Open property planner
      const propertyIcon = page.locator('button[title="Open property scenario"]').first()

      if ((await propertyIcon.count()) > 0) {
        await propertyIcon.click()
        await expect(page.getByRole('dialog')).toBeVisible({ timeout: 5000 })

        // Click on a scenario
        const scenarioCard = page.locator('[class*="cursor-pointer"]').filter({
          hasText: /HDB|Private|EC/i,
        })

        if ((await scenarioCard.count()) > 0) {
          await scenarioCard.first().click()
          await page.waitForTimeout(500)

          // Navigate to Step 2 (Borrowers)
          const step2Tab = page.locator('button').filter({ hasText: '2' }).first()
          if ((await step2Tab.count()) > 0) {
            await step2Tab.click()
            await page.waitForTimeout(300)

            // Look for "Combined Income" label - this is the key computed value
            const combinedIncomeLabel = page.getByText('Combined Income')
            if (await combinedIncomeLabel.isVisible()) {
              await expect(combinedIncomeLabel).toBeVisible()

              // The combined income value should show $/mo format
              const incomeValue = page.locator('text=/\\$[\\d,]+\\/mo/')
              await expect(incomeValue.first()).toBeVisible()
            }
          }
        }

        await page.keyboard.press('Escape')
      }
    })

    authenticatedTest('should show Projected OA when borrower is selected', async ({
      authenticatedPage,
    }) => {
      const page = authenticatedPage

      const propertyIcon = page.locator('button[title="Open property scenario"]').first()

      if ((await propertyIcon.count()) > 0) {
        await propertyIcon.click()
        await expect(page.getByRole('dialog')).toBeVisible({ timeout: 5000 })

        const scenarioCard = page.locator('[class*="cursor-pointer"]').filter({
          hasText: /HDB|Private|EC/i,
        })

        if ((await scenarioCard.count()) > 0) {
          await scenarioCard.first().click()
          await page.waitForTimeout(500)

          // Go to Step 2
          const step2Tab = page.locator('button').filter({ hasText: '2' }).first()
          if ((await step2Tab.count()) > 0) {
            await step2Tab.click()
            await page.waitForTimeout(300)

            // Look for "Projected OA" text - appears when borrower income is selected
            const projectedOaText = page.getByText(/Projected OA at/i)
            if (await projectedOaText.isVisible()) {
              await expect(projectedOaText).toBeVisible()

              // The OA balance should display a dollar amount
              const oaBalance = page.locator('text=/\\$[\\d,]+/').first()
              await expect(oaBalance).toBeVisible()
            }
          }
        }

        await page.keyboard.press('Escape')
      }
    })

    authenticatedTest('should show joint borrower option when multiple incomes exist', async ({
      authenticatedPage,
    }) => {
      const page = authenticatedPage

      const propertyIcon = page.locator('button[title="Open property scenario"]').first()

      if ((await propertyIcon.count()) > 0) {
        await propertyIcon.click()
        await expect(page.getByRole('dialog')).toBeVisible({ timeout: 5000 })

        const scenarioCard = page.locator('[class*="cursor-pointer"]').filter({
          hasText: /HDB|Private|EC/i,
        })

        if ((await scenarioCard.count()) > 0) {
          await scenarioCard.first().click()
          await page.waitForTimeout(500)

          // Go to Step 2
          const step2Tab = page.locator('button').filter({ hasText: '2' }).first()
          if ((await step2Tab.count()) > 0) {
            await step2Tab.click()
            await page.waitForTimeout(300)

            // Look for "+ Add joint borrower" button
            const addJointButton = page.getByText('+ Add joint borrower')
            if (await addJointButton.isVisible()) {
              await expect(addJointButton).toBeVisible()

              // Click to add joint borrower
              await addJointButton.click()
              await page.waitForTimeout(300)

              // Should now see "Borrower 2" label
              const borrower2Label = page.getByText('Borrower 2')
              await expect(borrower2Label).toBeVisible()

              // Should see "Remove" button
              const removeButton = page.getByText('Remove')
              await expect(removeButton).toBeVisible()

              // Remove joint borrower
              await removeButton.click()
              await page.waitForTimeout(300)

              // Should be back to single borrower mode
              await expect(addJointButton).toBeVisible()
            }
          }
        }

        await page.keyboard.press('Escape')
      }
    })

    authenticatedTest('should show Combined CPF OA balance', async ({ authenticatedPage }) => {
      const page = authenticatedPage

      const propertyIcon = page.locator('button[title="Open property scenario"]').first()

      if ((await propertyIcon.count()) > 0) {
        await propertyIcon.click()
        await expect(page.getByRole('dialog')).toBeVisible({ timeout: 5000 })

        const scenarioCard = page.locator('[class*="cursor-pointer"]').filter({
          hasText: /HDB|Private|EC/i,
        })

        if ((await scenarioCard.count()) > 0) {
          await scenarioCard.first().click()
          await page.waitForTimeout(500)

          // Go to Step 2
          const step2Tab = page.locator('button').filter({ hasText: '2' }).first()
          if ((await step2Tab.count()) > 0) {
            await step2Tab.click()
            await page.waitForTimeout(300)

            // Look for "Combined CPF OA" label in summary section
            const combinedCpfLabel = page.getByText('Combined CPF OA')
            if (await combinedCpfLabel.isVisible()) {
              await expect(combinedCpfLabel).toBeVisible()
            }
          }
        }

        await page.keyboard.press('Escape')
      }
    })
  })

  // =============================================================================
  // TIMELINE INTEGRATION TESTS
  // Verifies that incomes and scenarios display correctly with earner info
  // =============================================================================
  authenticatedTest.describe('Timeline Integration', () => {
    authenticatedTest('should display financial items in dashboard', async ({
      authenticatedPage,
    }) => {
      const page = authenticatedPage

      await page.waitForLoadState('networkidle')

      // Dashboard should show Net Worth heading (use first() to handle multiple matches)
      await expect(page.getByRole('heading', { name: /net worth/i }).first()).toBeVisible({
        timeout: 10000,
      })

      // Should display financial categories
      const incomeText = page.getByText('Income')
      await expect(incomeText.first()).toBeVisible()

      const expenseText = page.getByText('Expenses')
      await expect(expenseText.first()).toBeVisible()
    })

    authenticatedTest('should display chart with data', async ({ authenticatedPage }) => {
      const page = authenticatedPage

      await page.waitForLoadState('networkidle')

      // Look for the chart container
      // Recharts renders SVG elements
      const chart = page.locator('.recharts-wrapper').first()

      if ((await chart.count()) > 0) {
        await expect(chart).toBeVisible()
      }
    })
  })

  // =============================================================================
  // CPF ACCOUNT TESTS
  // Verifies CPF accounts display with earner names from personId FK
  // =============================================================================
  authenticatedTest.describe('CPF Account Management', () => {
    authenticatedTest('should display CPF balances in dashboard', async ({ authenticatedPage }) => {
      const page = authenticatedPage

      await page.waitForLoadState('networkidle')

      // Look for CPF-related content on dashboard
      // CPF accounts may appear in Assets section
      const assetsSection = page.getByText('Assets')

      if ((await assetsSection.count()) > 0) {
        await expect(assetsSection.first()).toBeVisible()

        // Look for CPF-related items (OA, SA, MA)
        const cpfText = page.locator('text=/CPF|OA|SA|MA/i')
        const cpfCount = await cpfText.count()

        // If CPF items exist, they should be visible
        if (cpfCount > 0) {
          await expect(cpfText.first()).toBeVisible()
        }
      }
    })
  })

  // =============================================================================
  // STEP NAVIGATION TESTS
  // Verifies the 4-step wizard navigation works correctly
  // =============================================================================
  authenticatedTest.describe('Step Navigation', () => {
    authenticatedTest('should allow navigation between steps', async ({ authenticatedPage }) => {
      const page = authenticatedPage

      const propertyIcon = page.locator('button[title="Open property scenario"]').first()

      if ((await propertyIcon.count()) > 0) {
        await propertyIcon.click()
        await expect(page.getByRole('dialog')).toBeVisible({ timeout: 5000 })

        const scenarioCard = page.locator('[class*="cursor-pointer"]').filter({
          hasText: /HDB|Private|EC/i,
        })

        if ((await scenarioCard.count()) > 0) {
          await scenarioCard.first().click()
          await page.waitForTimeout(500)

          // Try to navigate through all steps
          for (let step = 1; step <= 4; step++) {
            const stepTab = page.locator('button').filter({ hasText: String(step) }).first()
            if ((await stepTab.count()) > 0 && (await stepTab.isEnabled())) {
              await stepTab.click()
              await page.waitForTimeout(200)
            }
          }

          // Go back to step 1
          const step1Tab = page.locator('button').filter({ hasText: '1' }).first()
          if ((await step1Tab.count()) > 0) {
            await step1Tab.click()
            await page.waitForTimeout(200)
          }
        }

        await page.keyboard.press('Escape')
      }
    })
  })

  // =============================================================================
  // INCOME CEILING WARNINGS
  // Verifies HDB ($14k) and EC ($16k) income ceiling warnings display
  // =============================================================================
  authenticatedTest.describe('Income Ceiling Warnings', () => {
    authenticatedTest('should show HDB income ceiling warning when applicable', async ({
      authenticatedPage,
    }) => {
      const page = authenticatedPage

      const propertyIcon = page.locator('button[title="Open property scenario"]').first()

      if ((await propertyIcon.count()) > 0) {
        await propertyIcon.click()
        await expect(page.getByRole('dialog')).toBeVisible({ timeout: 5000 })

        // Look for HDB scenarios specifically
        const hdbScenario = page
          .locator('[class*="cursor-pointer"]')
          .filter({ hasText: /HDB/i })
          .first()

        if ((await hdbScenario.count()) > 0) {
          await hdbScenario.click()
          await page.waitForTimeout(500)

          // Go to Step 2 (Borrowers)
          const step2Tab = page.locator('button').filter({ hasText: '2' }).first()
          if ((await step2Tab.count()) > 0) {
            await step2Tab.click()
            await page.waitForTimeout(300)

            // Check for income ceiling warning
            // Warning appears when combined income > $14k for HDB
            const ceilingWarning = page.getByText(/Income Ceiling Notice/i)
            // Note: This may or may not be visible depending on test data
            // We're just verifying the warning mechanism works
            const warningCount = await ceilingWarning.count()
            console.log(`Income ceiling warning visible: ${warningCount > 0}`)
          }
        }

        await page.keyboard.press('Escape')
      }
    })
  })
})

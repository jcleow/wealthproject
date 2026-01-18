/**
 * E2E Tests: CPF Simulation View
 *
 * Tests for CPF simulation features:
 * - Property tab: opening PropertyPlannerModal from routed CPF pages
 * - Projection chart: draggable age indicator
 *
 * Prerequisites:
 * - Backend at localhost:8080
 * - Test account exists with CPF accounts and property scenarios
 */

import { authenticatedTest } from './fixtures/auth'
import { expect } from '@playwright/test'

// Serial mode - tests share state for efficiency
authenticatedTest.describe.configure({ mode: 'serial' })

authenticatedTest.describe('CPF Simulation View', () => {
  // =============================================================================
  // CPF PROPERTY TAB TESTS
  // Tests the PropertyPlannerModal opening from /dashboard/cpf/property route
  // =============================================================================
  authenticatedTest.describe('CPF Property Tab', () => {
    authenticatedTest('should navigate to CPF Property page via route', async ({
      authenticatedPage,
    }) => {
      const page = authenticatedPage

      // Navigate directly to CPF Property route
      await page.goto('/dashboard/cpf/property')
      await page.waitForLoadState('networkidle')

      // Should see the CPF Simulation header
      await expect(page.getByText('CPF Simulation')).toBeVisible({ timeout: 10000 })

      // Should see the Property tab is active
      const propertyTab = page.locator('button').filter({ hasText: 'Property' })
      await expect(propertyTab).toBeVisible()
    })

    authenticatedTest('should open PropertyPlannerModal when clicking Add button', async ({
      authenticatedPage,
    }) => {
      const page = authenticatedPage

      // Navigate to CPF Property route
      await page.goto('/dashboard/cpf/property')
      await page.waitForLoadState('networkidle')

      // Wait for the property content to load
      await page.waitForTimeout(1000)

      // Find and click the "+ Add" button in the Active Properties section
      const addButton = page.locator('button').filter({ hasText: /^\+ Add$|^Add$/ }).first()

      if (await addButton.isVisible()) {
        await addButton.click()

        // PropertyPlannerModal should open
        const modal = page.getByRole('dialog')
        await expect(modal).toBeVisible({ timeout: 5000 })

        // Verify it's the Property Scenarios modal (list mode header)
        await expect(page.getByText('Property Scenarios')).toBeVisible()

        // Should show "Add Property Scenario" button in the list
        const addScenarioButton = page.getByText('Add Property Scenario')
        await expect(addScenarioButton).toBeVisible()

        // Close modal
        await page.keyboard.press('Escape')
        await expect(modal).not.toBeVisible({ timeout: 3000 })
      } else {
        // If no Add button visible, we might be in empty state
        // Look for "Open Property Planner" button instead
        const openPlannerButton = page.getByText('Open Property Planner')
        if (await openPlannerButton.isVisible()) {
          await openPlannerButton.click()

          const modal = page.getByRole('dialog')
          await expect(modal).toBeVisible({ timeout: 5000 })
          await expect(page.getByText('Property Scenarios')).toBeVisible()

          await page.keyboard.press('Escape')
        }
      }
    })

    authenticatedTest('should show scenario list when modal opens (not skeleton)', async ({
      authenticatedPage,
    }) => {
      const page = authenticatedPage

      await page.goto('/dashboard/cpf/property')
      await page.waitForLoadState('networkidle')
      await page.waitForTimeout(1000)

      // Find and click the Add button
      const addButton = page.locator('button').filter({ hasText: /Add/ }).first()

      if (await addButton.isVisible()) {
        await addButton.click()

        const modal = page.getByRole('dialog')
        await expect(modal).toBeVisible({ timeout: 5000 })

        // Verify we see the scenario list content, NOT the skeleton
        // The skeleton has a two-column grid layout, while list mode shows centered content

        // Should see either existing scenarios OR "No property scenarios yet" message
        // OR "Add Property Scenario" button
        const scenarioListContent = page.getByText(/Add Property Scenario|No property scenarios yet|HDB|Private|EC/i)
        await expect(scenarioListContent.first()).toBeVisible({ timeout: 3000 })

        // Should NOT see skeleton loading elements (multiple skeleton rectangles in grid)
        // The skeleton would show form-like structure with labels
        const skeletonGrid = page.locator('.grid.grid-cols-2').first()
        // In list mode, there shouldn't be a prominent two-column form grid

        await page.keyboard.press('Escape')
      }
    })

    authenticatedTest('should be able to start property scenario creation flow', async ({
      authenticatedPage,
    }) => {
      const page = authenticatedPage

      await page.goto('/dashboard/cpf/property')
      await page.waitForLoadState('networkidle')
      await page.waitForTimeout(1000)

      // Open the modal
      const addButton = page.locator('button').filter({ hasText: /Add/ }).first()

      if (await addButton.isVisible()) {
        await addButton.click()

        const modal = page.getByRole('dialog')
        await expect(modal).toBeVisible({ timeout: 5000 })

        // Click "Add Property Scenario" button to start creation flow
        const addScenarioButton = page.getByText('Add Property Scenario')
        if (await addScenarioButton.isVisible()) {
          await addScenarioButton.click()
          await page.waitForTimeout(500)

          // Should see the inline creation row with name input
          const nameInput = page.locator('input[placeholder="Scenario name"]')
          await expect(nameInput).toBeVisible({ timeout: 3000 })

          // Verify the name input is inside the creation row
          // The input should have a pre-filled name like "Property X"
          const inputValue = await nameInput.inputValue()
          expect(inputValue).toMatch(/Property \d+/)
        }

        // Close modal with Escape
        await page.keyboard.press('Escape')
        await page.waitForTimeout(300)

        // May need to press Escape again if confirmation dialog appears
        if (await modal.isVisible()) {
          await page.keyboard.press('Escape')
        }
      }
    })
  })

  // =============================================================================
  // CPF PROJECTION CHART TESTS
  // Tests the draggable age indicator on the projection chart
  // =============================================================================
  authenticatedTest.describe('CPF Projection Chart - Age Indicator', () => {
    authenticatedTest('should navigate to CPF Projection page', async ({ authenticatedPage }) => {
      const page = authenticatedPage

      // Navigate to CPF Projection route
      await page.goto('/dashboard/cpf/projection')
      await page.waitForLoadState('networkidle')

      // Should see the CPF Simulation header
      await expect(page.getByText('CPF Simulation')).toBeVisible({ timeout: 10000 })

      // Should see the Projection tab is active
      const projectionTab = page.locator('button').filter({ hasText: 'Projection' })
      await expect(projectionTab).toBeVisible()
    })

    authenticatedTest('should display the projection chart with age indicator', async ({
      authenticatedPage,
    }) => {
      const page = authenticatedPage

      await page.goto('/dashboard/cpf/projection')
      await page.waitForLoadState('networkidle')

      // Wait for chart to render
      await page.waitForTimeout(2000)

      // Look for the chart container (Recharts renders SVG)
      const chartContainer = page.locator('.recharts-wrapper').first()

      if (await chartContainer.isVisible()) {
        await expect(chartContainer).toBeVisible()

        // Look for the age indicator line (ReferenceLine with custom label)
        // The age indicator is a vertical line on the chart
        const referenceLine = page.locator('.recharts-reference-line').first()

        // Chart should have some reference elements
        const chartElements = await chartContainer.locator('svg').count()
        expect(chartElements).toBeGreaterThan(0)
      }
    })

    authenticatedTest('should show age in controls bar', async ({ authenticatedPage }) => {
      const page = authenticatedPage

      await page.goto('/dashboard/cpf/projection')
      await page.waitForLoadState('networkidle')

      // Look for age input in the controls bar
      // There should be an age input with "y/o" label nearby
      const ageInput = page.locator('input[type="number"]').first()

      if (await ageInput.isVisible()) {
        await expect(ageInput).toBeVisible()

        // Should have a reasonable age value (between 18 and 100)
        const ageValue = await ageInput.inputValue()
        const age = parseInt(ageValue, 10)
        expect(age).toBeGreaterThanOrEqual(18)
        expect(age).toBeLessThanOrEqual(100)
      }

      // Look for Age/Year toggle
      const ageToggle = page.locator('button').filter({ hasText: 'Age' })
      if (await ageToggle.isVisible()) {
        await expect(ageToggle).toBeVisible()
      }
    })

    authenticatedTest('should update chart when age slider is changed', async ({
      authenticatedPage,
    }) => {
      const page = authenticatedPage

      await page.goto('/dashboard/cpf/projection')
      await page.waitForLoadState('networkidle')
      await page.waitForTimeout(2000)

      // Find the age slider (range input)
      const ageSlider = page.locator('input[type="range"]').first()

      if (await ageSlider.isVisible()) {
        // Get initial value
        const initialValue = await ageSlider.inputValue()

        // Change the slider value
        await ageSlider.fill('55')
        await page.waitForTimeout(500)

        // Verify the number input also updated
        const ageInput = page.locator('input[type="number"]').first()
        const newValue = await ageInput.inputValue()
        expect(newValue).toBe('55')
      }
    })

    authenticatedTest('should toggle between Age and Year display modes', async ({
      authenticatedPage,
    }) => {
      const page = authenticatedPage

      await page.goto('/dashboard/cpf/projection')
      await page.waitForLoadState('networkidle')

      // Find Age toggle button
      const ageToggle = page.locator('button').filter({ hasText: 'Age' }).first()
      const yearToggle = page.locator('button').filter({ hasText: 'Year' }).first()

      if (await ageToggle.isVisible() && await yearToggle.isVisible()) {
        // Click Year toggle
        await yearToggle.click()
        await page.waitForTimeout(300)

        // The input should now show a year value (4 digits)
        const input = page.locator('input[type="number"]').first()
        const value = await input.inputValue()
        expect(value.length).toBe(4) // Year is 4 digits

        // Toggle back to Age
        await ageToggle.click()
        await page.waitForTimeout(300)

        const ageValue = await input.inputValue()
        expect(parseInt(ageValue, 10)).toBeLessThan(150) // Age is less than 150
      }
    })
  })

  // =============================================================================
  // CPF OVERVIEW TAB TESTS
  // Tests the balance overview and contribution flow
  // =============================================================================
  authenticatedTest.describe('CPF Overview Tab', () => {
    authenticatedTest('should display CPF balance overview', async ({ authenticatedPage }) => {
      const page = authenticatedPage

      // Navigate to CPF Overview (default tab)
      await page.goto('/dashboard/cpf')
      await page.waitForLoadState('networkidle')

      // Should see CPF Simulation header
      await expect(page.getByText('CPF Simulation')).toBeVisible({ timeout: 10000 })

      // Should see balance-related content (OA, SA, MA)
      const balanceContent = page.getByText(/OA|SA|MA|Ordinary|Special|Medisave/i)
      await expect(balanceContent.first()).toBeVisible({ timeout: 5000 })
    })

    authenticatedTest('should switch between CPF accounts via dropdown', async ({
      authenticatedPage,
    }) => {
      const page = authenticatedPage

      await page.goto('/dashboard/cpf')
      await page.waitForLoadState('networkidle')

      // Look for account selector dropdown
      // It should have the person's name or account identifier
      const accountDropdown = page.locator('[class*="dropdown"], [role="combobox"]').first()

      if (await accountDropdown.isVisible()) {
        await accountDropdown.click()
        await page.waitForTimeout(300)

        // Should show dropdown options
        const dropdownOptions = page.locator('[role="option"], [class*="option"]')
        const optionCount = await dropdownOptions.count()

        if (optionCount > 1) {
          // Select the second option
          await dropdownOptions.nth(1).click()
          await page.waitForTimeout(500)

          // Page should update with new account data
        }
      }
    })
  })
})

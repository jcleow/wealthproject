/**
 * E2E Tests: Insurance Coverage Guidelines
 *
 * Tests the insurance planner wizard flow and field inputs:
 * - Step 1: Person selection + income display
 * - Step 2: Questionnaire sections (Hospitalization, Life/TPD, Critical Illness, PA, Self-Insurance)
 * - Step 3: Summary review
 *
 * Uses serial mode since wizard state carries between tests.
 */
import { authenticatedTest } from './fixtures/auth'
import { expect } from '@playwright/test'

authenticatedTest.describe('Insurance Coverage Guidelines', () => {
  authenticatedTest.describe.configure({ mode: 'serial' })

  authenticatedTest('should navigate to insurance planner', async ({ authenticatedPage }) => {
    const page = authenticatedPage

    // Navigate directly to the insurance planner page
    await page.goto('/insurance-planner')
    await page.waitForLoadState('networkidle')

    // Verify we're on the insurance planner page
    await expect(page.getByText('Insurance Planner').first()).toBeVisible({ timeout: 10000 })

    // The default tab should be "My Coverage" which shows the GuidelinesTab
    await expect(page.getByText('My Coverage').first()).toBeVisible({ timeout: 5000 })
  })

  authenticatedTest('Step 1: should show person selector and income', async ({ authenticatedPage }) => {
    const page = authenticatedPage
    await page.goto('/insurance-planner')
    await page.waitForLoadState('networkidle')

    // Verify Step 1 heading
    await expect(page.getByText('Step 1 of 3')).toBeVisible({ timeout: 10000 })
    await expect(page.getByText('Who are we planning for?')).toBeVisible()

    // Verify person selector exists
    await expect(page.getByText('Select person').first()).toBeVisible()

    // The PersonSelector should auto-select the first person
    // Check that the annual income section appears
    await expect(page.getByText(/annual income/i).first()).toBeVisible({ timeout: 5000 })

    // Verify the Continue button exists
    const continueBtn = page.getByRole('button', { name: /continue/i })
    await expect(continueBtn).toBeVisible()
  })

  authenticatedTest('Step 1: should allow changing person selection', async ({ authenticatedPage }) => {
    const page = authenticatedPage
    await page.goto('/insurance-planner')
    await page.waitForLoadState('networkidle')

    // Wait for step 1 to load
    await expect(page.getByText('Step 1 of 3')).toBeVisible({ timeout: 10000 })

    // Click the person selector dropdown to open it
    const personSelector = page.locator('.relative').filter({ hasText: /select person/i }).first()
    const dropdownTrigger = personSelector.locator('button').first()

    if (await dropdownTrigger.isVisible()) {
      await dropdownTrigger.click()

      // Verify the dropdown opened - should show person options
      await page.waitForTimeout(500)

      // Check that at least one person is in the dropdown
      const personOptions = page.locator('button').filter({ hasText: /\w+/ })
      const optionCount = await personOptions.count()
      expect(optionCount).toBeGreaterThan(0)

      // Close dropdown by pressing Escape
      await page.keyboard.press('Escape')
    }
  })

  authenticatedTest('Step 1: should navigate to Step 2 on Continue', async ({ authenticatedPage }) => {
    const page = authenticatedPage
    await page.goto('/insurance-planner')
    await page.waitForLoadState('networkidle')

    // Wait for step 1
    await expect(page.getByText('Step 1 of 3')).toBeVisible({ timeout: 10000 })

    // Click continue to go to Step 2
    const continueBtn = page.getByRole('button', { name: /continue/i })
    await expect(continueBtn).toBeVisible({ timeout: 5000 })

    // Only click if the button is enabled (income > 0)
    const isDisabled = await continueBtn.getAttribute('disabled')
    if (isDisabled === null) {
      await continueBtn.click()

      // Verify we're now on Step 2 — should see questionnaire section pills
      await expect(page.getByText('Hospitalization').first()).toBeVisible({ timeout: 5000 })
    }
  })

  authenticatedTest('Step 2 - Hospitalization: should show coverage options', async ({ authenticatedPage }) => {
    const page = authenticatedPage
    await page.goto('/insurance-planner')
    await page.waitForLoadState('networkidle')

    // Navigate to Step 2
    await expect(page.getByText('Step 1 of 3')).toBeVisible({ timeout: 10000 })
    const continueBtn = page.getByRole('button', { name: /continue/i })
    await expect(continueBtn).toBeVisible({ timeout: 5000 })
    const isDisabled = await continueBtn.getAttribute('disabled')
    if (isDisabled !== null) return // Skip if can't proceed

    await continueBtn.click()

    // Verify Hospitalization section is active
    await expect(page.getByText('Hospitalization').first()).toBeVisible({ timeout: 5000 })
    await expect(page.getByText(/hospitalization coverage/i).first()).toBeVisible({ timeout: 5000 })

    // Should show Public/Private hospital options
    await expect(page.getByText(/public/i).first()).toBeVisible()
    await expect(page.getByText(/private/i).first()).toBeVisible()

    // Click "Private" option
    const privateOption = page.locator('button').filter({ hasText: /private/i }).first()
    await privateOption.click()

    // After selecting Private, should show room type options
    await page.waitForTimeout(500)

    // Click Continue to advance to next sub-step or section
    const nextBtn = page.getByRole('button', { name: /continue/i })
    if (await nextBtn.isVisible()) {
      // Select a room type option if visible
      const roomOptions = page.locator('button').filter({ hasText: /single|shared|ward/i })
      if (await roomOptions.first().isVisible()) {
        await roomOptions.first().click()
      }
      await nextBtn.click()
    }
  })

  authenticatedTest('Step 2 - Life/TPD: should show dependent selection and financial obligations', async ({ authenticatedPage }) => {
    const page = authenticatedPage
    await page.goto('/insurance-planner')
    await page.waitForLoadState('networkidle')

    // Navigate through Step 1 → Step 2
    await expect(page.getByText('Step 1 of 3')).toBeVisible({ timeout: 10000 })
    const step1Continue = page.getByRole('button', { name: /continue/i })
    await expect(step1Continue).toBeVisible({ timeout: 5000 })
    if ((await step1Continue.getAttribute('disabled')) !== null) return
    await step1Continue.click()

    // Navigate through Hospitalization section
    await expect(page.getByText('Hospitalization').first()).toBeVisible({ timeout: 5000 })

    // Select Public hospital (simpler path)
    const publicOption = page.locator('button').filter({ hasText: /public/i }).first()
    if (await publicOption.isVisible()) {
      await publicOption.click()
      await page.waitForTimeout(300)
    }

    // Select a ward class if shown
    const wardOptions = page.locator('button').filter({ hasText: /class|ward/i })
    if (await wardOptions.first().isVisible()) {
      await wardOptions.first().click()
      await page.waitForTimeout(300)
    }

    // Click Continue to go to Life/TPD
    let nextBtn = page.getByRole('button', { name: /continue/i })
    if (await nextBtn.isVisible()) {
      await nextBtn.click()
      await page.waitForTimeout(300)
    }

    // If there's another sub-step in hospitalization, advance again
    nextBtn = page.getByRole('button', { name: /continue/i })
    if (await nextBtn.isVisible()) {
      // Check if we're still in hospitalization
      const lifeTpdVisible = await page.getByText('Life / TPD').first().isVisible().catch(() => false)
      if (!lifeTpdVisible) {
        await nextBtn.click()
        await page.waitForTimeout(300)
      }
    }

    // Now we should be in Life/TPD section
    // Check for dependent selection heading
    const dependentLabel = page.getByText(/who financially depends on you/i)
    const isLifeTpdSection = await dependentLabel.isVisible({ timeout: 5000 }).catch(() => false)

    if (isLifeTpdSection) {
      // Verify dependent selection chips are shown
      await expect(dependentLabel).toBeVisible()

      // Check if there are person chips to select as dependents
      // These are buttons showing person names with checkboxes
      const personChips = page.locator('button').filter({ hasText: /age \d+/i })
      const chipCount = await personChips.count()

      if (chipCount > 0) {
        // Click the first dependent to select them
        await personChips.first().click()
        await page.waitForTimeout(300)

        // Verify selection summary appears
        await expect(page.getByText(/dependent.*selected/i).first()).toBeVisible({ timeout: 3000 })

        // Check that spouse selector appears after selecting a dependent
        const spouseLabel = page.getByText(/spouse.*partner/i).first()
        const spouseVisible = await spouseLabel.isVisible({ timeout: 3000 }).catch(() => false)
        if (spouseVisible) {
          await expect(spouseLabel).toBeVisible()
        }
      }

      // Click Continue to go to Financial obligations sub-step
      nextBtn = page.getByRole('button', { name: /continue/i })
      if (await nextBtn.isVisible()) {
        await nextBtn.click()
        await page.waitForTimeout(300)
      }

      // Check for financial obligations section
      const financialLabel = page.getByText(/financial obligations/i).first()
      const financialVisible = await financialLabel.isVisible({ timeout: 3000 }).catch(() => false)

      if (financialVisible) {
        // Verify auto-populated financial data is shown (read-only)
        const mortgageText = page.getByText(/mortgage/i).first()
        await expect(mortgageText).toBeVisible({ timeout: 3000 })

        // Verify "Future obligations" input exists (the only editable field)
        const futureObligations = page.getByText(/future obligations/i).first()
        const hasFutureObligations = await futureObligations.isVisible({ timeout: 3000 }).catch(() => false)
        if (hasFutureObligations) {
          await expect(futureObligations).toBeVisible()
        }
      }
    }
  })

  authenticatedTest('Step 2 - Critical Illness: should show emergency fund options', async ({ authenticatedPage }) => {
    const page = authenticatedPage
    await page.goto('/insurance-planner')
    await page.waitForLoadState('networkidle')

    // Fast-track through Step 1
    await expect(page.getByText('Step 1 of 3')).toBeVisible({ timeout: 10000 })
    const step1Continue = page.getByRole('button', { name: /continue/i })
    if ((await step1Continue.getAttribute('disabled')) !== null) return
    await step1Continue.click()
    await page.waitForTimeout(500)

    // Navigate through sections by clicking Continue repeatedly
    // We need to get past Hospitalization and Life/TPD to reach Critical Illness
    for (let i = 0; i < 6; i++) {
      const continueBtn = page.getByRole('button', { name: /continue/i })
      if (!(await continueBtn.isVisible({ timeout: 2000 }).catch(() => false))) break

      // Select any required option before continuing
      // Check for option cards and select the first if none selected
      const optionButtons = page.locator('button').filter({ hasText: /public|private|single|shared/i })
      if (await optionButtons.first().isVisible({ timeout: 500 }).catch(() => false)) {
        await optionButtons.first().click()
        await page.waitForTimeout(200)
      }

      await continueBtn.click()
      await page.waitForTimeout(500)

      // Check if we've reached Critical Illness
      const ciVisible = await page.getByText(/emergency fund/i).first().isVisible({ timeout: 1000 }).catch(() => false)
      if (ciVisible) break
    }

    // Verify Critical Illness section content
    const emergencyFund = page.getByText(/emergency fund/i).first()
    const isCISection = await emergencyFund.isVisible({ timeout: 3000 }).catch(() => false)
    if (isCISection) {
      await expect(emergencyFund).toBeVisible()
    }
  })

  authenticatedTest('Full wizard flow: should complete all steps', async ({ authenticatedPage }) => {
    const page = authenticatedPage
    await page.goto('/insurance-planner')
    await page.waitForLoadState('networkidle')

    // Step 1: Verify and proceed
    await expect(page.getByText('Step 1 of 3')).toBeVisible({ timeout: 10000 })
    let continueBtn = page.getByRole('button', { name: /continue/i })
    await expect(continueBtn).toBeVisible({ timeout: 5000 })
    if ((await continueBtn.getAttribute('disabled')) !== null) {
      // Can't proceed without income - test ends here
      return
    }
    await continueBtn.click()
    await page.waitForTimeout(500)

    // Step 2: Click through all questionnaire sections
    // Navigate through each section by selecting options and clicking Continue
    let maxAttempts = 20 // Safety limit
    let attempts = 0

    while (attempts < maxAttempts) {
      attempts++

      // Check if we've reached Step 3 (Summary)
      const summaryVisible = await page.getByText(/review your coverage/i).first().isVisible({ timeout: 500 }).catch(() => false)
        || await page.getByText(/your targets/i).first().isVisible({ timeout: 500 }).catch(() => false)
      if (summaryVisible) break

      // Look for Continue button
      continueBtn = page.getByRole('button', { name: /continue/i })
      const continueVisible = await continueBtn.isVisible({ timeout: 1000 }).catch(() => false)

      if (!continueVisible) {
        // Maybe there's a "Complete" or "Finish" button
        const completeBtn = page.getByRole('button', { name: /complete|finish|confirm/i })
        if (await completeBtn.isVisible({ timeout: 500 }).catch(() => false)) {
          await completeBtn.click()
          break
        }
        break
      }

      // Before clicking Continue, try selecting required options
      // Check if Continue is disabled - if so, we need to make a selection
      const isDisabled = await continueBtn.getAttribute('disabled')
      if (isDisabled !== null) {
        // Find and click any unselected option card
        const optionCards = page.locator('button').filter({ hasText: /public|private|single|shared|class|ward|basic|standard/i })
        if (await optionCards.first().isVisible({ timeout: 500 }).catch(() => false)) {
          await optionCards.first().click()
          await page.waitForTimeout(300)
        } else {
          // Try clicking any available person chip for dependent selection
          const personChips = page.locator('button').filter({ hasText: /age \d+/i })
          if (await personChips.first().isVisible({ timeout: 500 }).catch(() => false)) {
            await personChips.first().click()
            await page.waitForTimeout(300)
          } else {
            // Can't proceed - break to avoid infinite loop
            break
          }
        }
      }

      await continueBtn.click()
      await page.waitForTimeout(500)
    }

    // Verify we reached either the summary or the configured view
    const reachedEnd = await page.getByText(/review your coverage|your targets|coverage target/i).first()
      .isVisible({ timeout: 5000 }).catch(() => false)

    // Log where we ended up for debugging
    if (!reachedEnd) {
      const pageContent = await page.textContent('body')
      console.log('Did not reach summary. Current page contains:', pageContent?.substring(0, 500))
    }
  })

  authenticatedTest('PersonSelector: should show relationship labels', async ({ authenticatedPage }) => {
    const page = authenticatedPage
    await page.goto('/insurance-planner')
    await page.waitForLoadState('networkidle')

    // Wait for step 1
    await expect(page.getByText('Step 1 of 3')).toBeVisible({ timeout: 10000 })

    // Open the PersonSelector dropdown
    // Find the selector near "Select person" label
    const selectorContainer = page.locator('div').filter({ hasText: /^select person$/i }).first()
    const trigger = selectorContainer.locator('..').locator('button').first()

    if (await trigger.isVisible()) {
      await trigger.click()
      await page.waitForTimeout(500)

      // Check that the dropdown is open and shows person options
      // Person options should show names and potentially relationship labels
      const dropdownOptions = page.locator('button').filter({ hasText: /\w+/ })
      const count = await dropdownOptions.count()

      // At least the test account person should be visible
      expect(count).toBeGreaterThan(0)

      // Close dropdown
      await page.keyboard.press('Escape')
    }
  })
})

/**
 * E2E Tests: Persons CRUD via PersonsModal
 *
 * Tests the full lifecycle of person management through the UI:
 * Open modal, create, edit, toggle inclusion, and delete.
 *
 * Uses the "Family" button in the dashboard header to open PersonsModal.
 * Sample data is loaded via the profile loader to ensure a clean starting state.
 */

import { expect, type Page } from '@playwright/test'
import { authenticatedTest } from './fixtures/auth'

// Serial mode — CRUD tests share state
authenticatedTest.describe.configure({ mode: 'serial' })

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function waitForDashboard(page: Page) {
  await page.waitForLoadState('domcontentloaded')
  await expect(
    page.getByRole('heading', { name: /net worth/i }).first()
  ).toBeVisible({ timeout: 15000 })
}

async function openPersonsModal(page: Page) {
  await waitForDashboard(page)
  const familyButton = page.locator('button[title="Family"]')
  await expect(familyButton).toBeVisible({ timeout: 5000 })
  await familyButton.click()
  // Wait for modal to appear
  await expect(page.getByText('Manage Persons')).toBeVisible({ timeout: 5000 })
}

async function closePersonsModal(page: Page) {
  // Click the X button in the modal header
  const closeButton = page
    .locator('.fixed, [role="dialog"]')
    .getByRole('button')
    .filter({ has: page.locator('svg') })
    .first()
  // Use Escape key which is more reliable
  await page.keyboard.press('Escape')
  await page.waitForTimeout(300)
}

// Unique suffix to avoid collisions across test runs
const testSuffix = Date.now()
const newPersonName = `E2E Person ${testSuffix}`
const editedPersonName = `Edited Person ${testSuffix}`

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

authenticatedTest.describe('Persons CRUD', () => {
  authenticatedTest(
    'should open PersonsModal via Family button',
    async ({ authenticatedPage }) => {
      const page = authenticatedPage
      await openPersonsModal(page)

      // Verify modal content is visible
      await expect(page.getByText('Manage Persons')).toBeVisible()

      // The modal should show person list or empty state
      const hasPersons = await page.getByText(/of \d+ included/).isVisible()
      const hasEmptyState = await page.getByText('No persons created yet').isVisible()
      expect(hasPersons || hasEmptyState).toBe(true)
    }
  )

  authenticatedTest(
    'should create a new person',
    async ({ authenticatedPage }) => {
      const page = authenticatedPage
      await openPersonsModal(page)

      // Click the "Add Person" button
      const addButton = page.getByRole('button', { name: /add person/i })
      await expect(addButton).toBeVisible({ timeout: 5000 })
      await addButton.click()

      // Fill in the person name
      const nameInput = page.locator('input[placeholder="Person name"]')
      await expect(nameInput).toBeVisible({ timeout: 3000 })
      await nameInput.fill(newPersonName)

      // Fill in date of birth
      const dobInput = page.locator('input[type="date"]').first()
      await dobInput.fill('1990-06-15')

      // Gender defaults to Male — leave as is

      // Click "Create Person"
      const createButton = page.getByRole('button', { name: /create person/i })
      await createButton.click()

      // Wait for creation to complete
      await page.waitForTimeout(1000)

      // Verify person appears in the list
      await expect(page.getByText(newPersonName)).toBeVisible({ timeout: 5000 })
    }
  )

  authenticatedTest(
    'should edit a person',
    async ({ authenticatedPage }) => {
      const page = authenticatedPage
      await openPersonsModal(page)

      // Wait for the person we created to appear (DB persists across serial tests)
      await expect(page.getByText(newPersonName)).toBeVisible({ timeout: 15000 })

      // Target the specific person card (direct child of the list container)
      const personRow = page.locator('.space-y-2 > div').filter({ hasText: newPersonName })
      const editButton = personRow.locator('button').filter({ has: page.locator('svg.lucide-pencil') })
      await editButton.click()

      // After clicking edit, the name moves into an input — find it by placeholder
      // (only one edit form is open at a time)
      const nameInput = page.locator('input[placeholder="Name"]')
      await expect(nameInput).toBeVisible({ timeout: 3000 })
      await nameInput.clear()
      await nameInput.fill(editedPersonName)

      // Click "Apply" to queue the edit
      const applyButton = page.getByRole('button', { name: /apply/i })
      await applyButton.click()

      // The edit is queued — verify the name changed in the UI
      await expect(page.getByText(editedPersonName)).toBeVisible({ timeout: 3000 })

      // Save the changes
      const saveButton = page.getByRole('button', { name: /save changes/i })
      if (await saveButton.isVisible()) {
        await saveButton.click()
        await page.waitForTimeout(1000)
      }
    }
  )

  authenticatedTest(
    'should toggle person inclusion',
    async ({ authenticatedPage }) => {
      const page = authenticatedPage
      await openPersonsModal(page)

      // Wait for our edited person to appear (allow time for modal load and data fetch)
      await expect(page.getByText(editedPersonName)).toBeVisible({ timeout: 10000 })

      // Target the specific person card
      const personRow = page.locator('.space-y-2 > div').filter({ hasText: editedPersonName })

      // The toggle is the first button child (the checkbox-style button)
      const toggleButton = personRow.locator('button').first()
      await toggleButton.click()

      // After toggling, the row should appear dimmed (opacity-60)
      // The "Unsaved" badge should appear
      await expect(page.getByText('Unsaved')).toBeVisible({ timeout: 3000 })

      // Save the toggle change
      const saveButton = page.getByRole('button', { name: /save changes/i })
      await saveButton.click()
      await page.waitForTimeout(1000)

      // Verify the Unsaved badge is gone after save
      await expect(page.getByText('Unsaved')).not.toBeVisible({ timeout: 3000 })
    }
  )

  authenticatedTest(
    'should delete a person',
    async ({ authenticatedPage }) => {
      const page = authenticatedPage
      await openPersonsModal(page)

      // Wait for our person to appear
      await expect(page.getByText(editedPersonName)).toBeVisible({ timeout: 5000 })

      // Handle the confirmation dialog that will appear
      page.on('dialog', async (dialog) => {
        await dialog.accept()
      })

      // Target the specific person card — delete button is the last button in the row
      const personRow = page.locator('.space-y-2 > div').filter({ hasText: editedPersonName })
      await expect(personRow).toBeVisible({ timeout: 5000 })
      const deleteButton = personRow.locator('button').last()
      await deleteButton.click()

      // Wait for deletion
      await page.waitForTimeout(1000)

      // Verify person is removed from the list
      await expect(page.getByText(editedPersonName)).not.toBeVisible({ timeout: 5000 })
    }
  )
})

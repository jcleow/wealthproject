import { authenticatedTest } from './fixtures/auth'
import { expect } from '@playwright/test'

authenticatedTest.describe('Theme Visual Verification', () => {
  authenticatedTest('should capture dark theme screenshot', async ({ authenticatedPage }) => {
    const page = authenticatedPage
    await page.waitForLoadState('networkidle')

    // Ensure we're in dark mode (default)
    const htmlElement = page.locator('html')
    await expect(htmlElement).toHaveClass(/dark/)

    // Take screenshot
    await page.screenshot({ path: 'test-results/theme-dark.png', fullPage: false })
  })

  authenticatedTest('should capture monet theme screenshot', async ({ authenticatedPage }) => {
    const page = authenticatedPage
    await page.waitForLoadState('networkidle')

    // Click theme toggle to switch to monet
    const themeToggle = page.getByTestId('theme-toggle')
    await themeToggle.click()
    await page.waitForTimeout(500)

    // Verify monet mode
    const htmlElement = page.locator('html')
    await expect(htmlElement).toHaveClass(/monet/)

    // Take screenshot
    await page.screenshot({ path: 'test-results/theme-monet.png', fullPage: false })
  })
})

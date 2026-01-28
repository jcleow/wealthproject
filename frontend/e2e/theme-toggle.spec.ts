import { authenticatedTest } from './fixtures/auth'
import { expect } from '@playwright/test'

authenticatedTest.describe('Theme Toggle', () => {
  authenticatedTest('should toggle between dark and monet themes', async ({ authenticatedPage }) => {
    const page = authenticatedPage

    // Wait for the dashboard to fully load
    await page.waitForLoadState('networkidle')

    // Find the theme toggle button
    const themeToggle = page.getByTestId('theme-toggle')
    await expect(themeToggle).toBeVisible({ timeout: 10000 })

    // Initially should be in dark mode (moon icon visible)
    const moonIcon = themeToggle.locator('svg.lucide-moon')
    const sunIcon = themeToggle.locator('svg.lucide-sun')

    // Check initial state - should be dark mode
    await expect(moonIcon).toBeVisible()

    // Click to switch to monet (light) mode
    await themeToggle.click()

    // Wait for theme transition
    await page.waitForTimeout(300)

    // Should now show sun icon (monet mode)
    await expect(sunIcon).toBeVisible()

    // Verify the html element has the monet class
    const htmlElement = page.locator('html')
    await expect(htmlElement).toHaveClass(/monet/)

    // Body background should be light
    const bodyBg = await page.evaluate(() => {
      return window.getComputedStyle(document.body).backgroundColor
    })
    // Monet background is cream/light colored
    expect(bodyBg).not.toBe('rgb(0, 0, 0)')

    // Toggle back to dark mode
    await themeToggle.click()

    // Wait for theme transition
    await page.waitForTimeout(300)

    // Should show moon icon again
    await expect(moonIcon).toBeVisible()

    // Verify the html element has the dark class
    await expect(htmlElement).toHaveClass(/dark/)
  })

  authenticatedTest('should persist theme preference across page reload', async ({ authenticatedPage }) => {
    const page = authenticatedPage

    // Wait for the dashboard to fully load
    await page.waitForLoadState('networkidle')

    // Find and click the theme toggle to switch to monet
    const themeToggle = page.getByTestId('theme-toggle')
    await expect(themeToggle).toBeVisible({ timeout: 10000 })

    // Click to switch to monet mode
    await themeToggle.click()
    await page.waitForTimeout(300)

    // Verify monet mode is active
    const sunIcon = themeToggle.locator('svg.lucide-sun')
    await expect(sunIcon).toBeVisible()

    // Reload the page
    await page.reload()
    await page.waitForLoadState('networkidle')

    // Theme should still be monet after reload
    const htmlElement = page.locator('html')
    await expect(htmlElement).toHaveClass(/monet/, { timeout: 5000 })

    // Sun icon should still be visible
    const themeToggleAfterReload = page.getByTestId('theme-toggle')
    const sunIconAfterReload = themeToggleAfterReload.locator('svg.lucide-sun')
    await expect(sunIconAfterReload).toBeVisible()
  })
})

import { authenticatedTest } from './fixtures/auth'

authenticatedTest('full page screenshot of insurance planner', async ({ authenticatedPage: page }) => {
  authenticatedTest.setTimeout(60000)

  await page.goto('/insurance-planner')
  await page.waitForLoadState('networkidle')
  await page.waitForTimeout(1000)

  // Step 1: Person selection → Continue
  await page.getByRole('button', { name: /continue/i }).click()
  await page.waitForTimeout(1000)

  async function selectOptionAndContinue(optionText: string) {
    await page.getByText(optionText, { exact: false }).first().click()
    await page.waitForTimeout(500)
    await page.getByRole('button', { name: /continue/i }).click()
    await page.waitForTimeout(1000)
  }

  // Hospitalization: Private Hospital → Single Room
  await selectOptionAndContinue('Private Hospital')
  await selectOptionAndContinue('Single Room')

  // Life/TPD: Dependents → Financial obligations
  await page.getByRole('button', { name: /continue/i }).click()
  await page.waitForTimeout(1000)
  await page.getByRole('button', { name: /continue/i }).click()
  await page.waitForTimeout(1000)

  // Critical Illness → Personal Accident → lands on Self-Insurance/Review
  await page.getByRole('button', { name: /continue/i }).click()
  await page.waitForTimeout(1000)
  await page.getByRole('button', { name: /continue/i }).click()
  await page.waitForTimeout(1000)

  // Click "Apply Recommendations" or "Save My Guidelines"
  const applyBtn = page.getByRole('button', { name: /apply|save/i })
  await applyBtn.click()
  await page.waitForTimeout(3000)

  // Now capture the resulting view
  const scrollable = page.locator('main').first()
  await scrollable.evaluate(el => el.scrollTo(0, el.scrollHeight))
  await page.waitForTimeout(1000)

  const scrollHeight = await scrollable.evaluate(el => el.scrollHeight)
  // Set viewport to match content height exactly
  await page.setViewportSize({ width: 1280, height: scrollHeight })
  await page.waitForTimeout(1000)

  await scrollable.evaluate(el => el.scrollTo(0, 0))
  await page.waitForTimeout(500)

  await page.screenshot({
    path: 'e2e/screenshots/insurance-planner-full.png',
    fullPage: true,
  })

  console.log(`Screenshot saved (content height: ${scrollHeight}px)`)
})
